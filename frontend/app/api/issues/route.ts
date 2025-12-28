import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, handleApiError } from '@/lib/server/auth';

/**
 * GET /api/issues
 * Get all issues for the current customer (new per-item issue system)
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);

    // Get all issues for order items belonging to this customer
    const issues = await prisma.issue.findMany({
      where: {
        orderItem: {
          order: {
            customerId: user.userId,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        orderItem: {
          include: {
            order: {
              select: {
                id: true,
                status: true,
                createdAt: true,
                trackingNumber: true,
              },
            },
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
            variant: {
              select: {
                id: true,
                name: true,
              },
            },
            design: {
              select: {
                id: true,
                title: true,
                previewUrl: true,
                fileUrl: true,
              },
            },
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1, // Just get the latest message for preview
          select: {
            id: true,
            sender: true,
            content: true,
            createdAt: true,
            readAt: true,
          },
        },
        _count: {
          select: {
            messages: {
              where: {
                sender: 'ADMIN',
                readAt: null,
              },
            },
          },
        },
      },
    });

    // Transform to add unread count
    const issuesWithUnread = issues.map(issue => ({
      ...issue,
      unreadCount: issue._count.messages,
      latestMessage: issue.messages[0] || null,
      messages: undefined, // Remove messages array from response
      _count: undefined,
    }));

    // Calculate total unread messages across all issues
    const totalUnread = issues.reduce((sum, issue) => sum + issue._count.messages, 0);

    // Calculate stats
    const stats = {
      total: issues.length,
      pending: issues.filter(i => ['AWAITING_REVIEW', 'INFO_REQUESTED'].includes(i.status)).length,
      resolved: issues.filter(i => ['COMPLETED', 'CLOSED'].includes(i.status)).length,
      unreadMessages: totalUnread,
    };

    return NextResponse.json({ issues: issuesWithUnread, stats });
  } catch (error) {
    console.error('Get user issues error:', error);
    return handleApiError(error);
  }
}
