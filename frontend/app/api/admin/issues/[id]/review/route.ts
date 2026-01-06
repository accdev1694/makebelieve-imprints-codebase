import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin, handleApiError } from '@/lib/server/auth';
import { reviewIssue, ReviewAction, markMessageEmailSent } from '@/lib/server/issue-service';
import {
  sendIssueApprovedEmail,
  sendIssueInfoRequestedEmail,
  sendIssueRejectedEmail,
} from '@/lib/server/email';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/admin/issues/[id]/review
 * Admin reviews an issue: approve (reprint/refund), request info, or reject
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const admin = await requireAdmin(request);
    const { id: issueId } = await params;

    const body = await request.json();
    const { action, message, isFinalRejection } = body as {
      action: ReviewAction;
      message?: string;
      isFinalRejection?: boolean;
    };

    const result = await reviewIssue(issueId, action, admin.userId, message, isFinalRejection);

    if (!result.success) {
      const status = result.error === 'Issue not found' ? 404 : 400;
      return NextResponse.json({ error: result.error }, { status });
    }

    // Send email notification to customer based on action
    // Need to fetch issue with customer info for email
    const issue = await prisma.issue.findUnique({
      where: { id: issueId },
      include: {
        orderItem: {
          include: {
            product: { select: { name: true } },
            order: {
              include: {
                customer: { select: { name: true, email: true } },
              },
            },
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (issue) {
      const customer = issue.orderItem.order.customer;
      const productName = issue.orderItem.product?.name || 'your item';
      const latestMessage = issue.messages[0];
      const systemMessage = latestMessage?.content || message || '';

      try {
        let emailSent = false;

        if (action === 'APPROVE_REPRINT' || action === 'APPROVE_REFUND') {
          const resolutionType = action === 'APPROVE_REPRINT' ? 'REPRINT' : 'REFUND';
          emailSent = await sendIssueApprovedEmail(
            customer.email,
            customer.name,
            issueId,
            productName,
            resolutionType,
            systemMessage
          );
        } else if (action === 'REQUEST_INFO') {
          emailSent = await sendIssueInfoRequestedEmail(
            customer.email,
            customer.name,
            issueId,
            productName,
            systemMessage
          );
        } else if (action === 'REJECT') {
          emailSent = await sendIssueRejectedEmail(
            customer.email,
            customer.name,
            issueId,
            productName,
            systemMessage,
            !isFinalRejection
          );
        }

        if (emailSent && latestMessage) {
          await markMessageEmailSent(latestMessage.id);
        }
      } catch (emailErr) {
        console.error('Failed to send review notification email:', emailErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      issue: result.issue,
    });
  } catch (error) {
    console.error('Review issue error:', error);
    return handleApiError(error);
  }
}
