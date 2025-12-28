import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin, handleApiError } from '@/lib/server/auth';
import { differenceInDays } from 'date-fns';

const STALE_ISSUE_DAYS = 14;

/**
 * POST /api/admin/issues/auto-close
 * Auto-close stale INFO_REQUESTED issues that haven't had a response in 14 days
 * Can be called by a cron job or manually by admin
 */
export async function POST(request: NextRequest) {
  try {
    // This can be called by cron with a secret or by admin
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    // Allow cron access with secret
    if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
      // Authorized via cron secret
    } else {
      // Otherwise require admin auth
      await requireAdmin(request);
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - STALE_ISSUE_DAYS);

    // Find all INFO_REQUESTED issues that haven't been updated in 14 days
    const staleIssues = await prisma.issue.findMany({
      where: {
        status: 'INFO_REQUESTED',
        reviewedAt: {
          lt: cutoffDate,
        },
      },
      include: {
        orderItem: {
          include: {
            order: {
              include: {
                customer: true,
              },
            },
            product: true,
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    // Filter to only issues where the last message was from admin (customer never responded)
    const issuesToClose = staleIssues.filter((issue) => {
      // If no messages after review, it's stale
      if (issue.messages.length === 0) return true;

      const lastMessage = issue.messages[0];
      const daysSinceLastMessage = differenceInDays(new Date(), lastMessage.createdAt);

      // Only close if last message was from admin and it's been 14+ days
      return lastMessage.sender === 'ADMIN' && daysSinceLastMessage >= STALE_ISSUE_DAYS;
    });

    if (issuesToClose.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No stale issues found to close',
        closedCount: 0,
      });
    }

    // Close all stale issues
    const closedIds: string[] = [];

    for (const issue of issuesToClose) {
      await prisma.$transaction(async (tx) => {
        // Update issue status to CLOSED
        await tx.issue.update({
          where: { id: issue.id },
          data: {
            status: 'CLOSED',
            closedAt: new Date(),
          },
        });

        // Add a system message explaining the auto-closure
        await tx.issueMessage.create({
          data: {
            issueId: issue.id,
            sender: 'ADMIN',
            senderId: '00000000-0000-0000-0000-000000000000', // System user
            content: `This issue has been automatically closed due to no response within ${STALE_ISSUE_DAYS} days. If you still need assistance, please report a new issue or contact support.`,
          },
        });

        closedIds.push(issue.id);
      });

      // TODO: Send email notification to customer about auto-closure
    }

    return NextResponse.json({
      success: true,
      message: `Closed ${closedIds.length} stale issue(s)`,
      closedCount: closedIds.length,
      closedIds,
    });
  } catch (error) {
    console.error('Auto-close issues error:', error);
    return handleApiError(error);
  }
}

/**
 * GET /api/admin/issues/auto-close
 * Preview which issues would be auto-closed (dry run)
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - STALE_ISSUE_DAYS);

    const staleIssues = await prisma.issue.findMany({
      where: {
        status: 'INFO_REQUESTED',
        reviewedAt: {
          lt: cutoffDate,
        },
      },
      include: {
        orderItem: {
          include: {
            order: true,
            product: true,
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    // Filter to only issues where customer never responded
    const issuesToClose = staleIssues.filter((issue) => {
      if (issue.messages.length === 0) return true;

      const lastMessage = issue.messages[0];
      const daysSinceLastMessage = differenceInDays(new Date(), lastMessage.createdAt);

      return lastMessage.sender === 'ADMIN' && daysSinceLastMessage >= STALE_ISSUE_DAYS;
    });

    return NextResponse.json({
      staleDays: STALE_ISSUE_DAYS,
      issuesWouldClose: issuesToClose.length,
      issues: issuesToClose.map((issue) => ({
        id: issue.id,
        orderId: issue.orderItem.orderId,
        productName: issue.orderItem.product?.name || 'Unknown',
        reviewedAt: issue.reviewedAt,
        lastMessageAt: issue.messages[0]?.createdAt || null,
        daysSinceLastActivity: issue.messages[0]
          ? differenceInDays(new Date(), issue.messages[0].createdAt)
          : issue.reviewedAt
          ? differenceInDays(new Date(), issue.reviewedAt)
          : null,
      })),
    });
  } catch (error) {
    console.error('Preview auto-close error:', error);
    return handleApiError(error);
  }
}
