import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin, handleApiError } from '@/lib/server/auth';
import { IssueStatus, IssueResolutionType } from '@prisma/client';
import {
  sendIssueApprovedEmail,
  sendIssueInfoRequestedEmail,
  sendIssueRejectedEmail,
} from '@/lib/server/email';

interface RouteParams {
  params: Promise<{ id: string }>;
}

type ReviewAction = 'APPROVE_REPRINT' | 'APPROVE_REFUND' | 'REQUEST_INFO' | 'REJECT';

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

    console.log('Review issue request:', { issueId, action, message, isFinalRejection });

    // Validate action
    const validActions: ReviewAction[] = ['APPROVE_REPRINT', 'APPROVE_REFUND', 'REQUEST_INFO', 'REJECT'];
    if (!action || !validActions.includes(action)) {
      console.log('Invalid action:', action, 'valid actions:', validActions);
      return NextResponse.json(
        { error: 'Invalid action. Must be APPROVE_REPRINT, APPROVE_REFUND, REQUEST_INFO, or REJECT' },
        { status: 400 }
      );
    }

    // Get the issue
    const issue = await prisma.issue.findUnique({
      where: { id: issueId },
      include: {
        orderItem: {
          include: {
            product: {
              select: {
                name: true,
              },
            },
            order: {
              include: {
                customer: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!issue) {
      return NextResponse.json(
        { error: 'Issue not found' },
        { status: 404 }
      );
    }

    // Check if issue can be reviewed
    const reviewableStatuses: IssueStatus[] = ['AWAITING_REVIEW', 'INFO_REQUESTED'];
    if (!reviewableStatuses.includes(issue.status)) {
      console.log('Issue status not reviewable:', issue.status, 'valid statuses:', reviewableStatuses);
      return NextResponse.json(
        { error: `This issue cannot be reviewed in its current status: ${issue.status}` },
        { status: 400 }
      );
    }

    // Process based on action
    let newStatus: IssueStatus;
    let resolvedType: IssueResolutionType | null = null;
    let systemMessage: string;

    switch (action) {
      case 'APPROVE_REPRINT':
        newStatus = 'APPROVED_REPRINT';
        resolvedType = 'REPRINT';
        systemMessage = message || 'Your issue has been approved for a free reprint. We will process this shortly.';
        break;

      case 'APPROVE_REFUND':
        newStatus = 'APPROVED_REFUND';
        resolvedType = 'FULL_REFUND'; // Default to full, can be changed during processing
        systemMessage = message || 'Your issue has been approved for a refund. We will process this shortly.';
        break;

      case 'REQUEST_INFO':
        if (!message || message.trim().length === 0) {
          return NextResponse.json(
            { error: 'A message is required when requesting more information' },
            { status: 400 }
          );
        }
        newStatus = 'INFO_REQUESTED';
        systemMessage = message;
        break;

      case 'REJECT':
        if (!message || message.trim().length === 0) {
          return NextResponse.json(
            { error: 'A reason is required when rejecting an issue' },
            { status: 400 }
          );
        }
        newStatus = 'REJECTED';
        systemMessage = message;
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

    // Update issue and create message in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update issue
      const updatedIssue = await tx.issue.update({
        where: { id: issueId },
        data: {
          status: newStatus,
          resolvedType: resolvedType,
          reviewedAt: new Date(),
          rejectionReason: action === 'REJECT' ? message : undefined,
          rejectionFinal: action === 'REJECT' && isFinalRejection ? true : undefined,
        },
      });

      // Create admin message
      const issueMessage = await tx.issueMessage.create({
        data: {
          issueId: issueId,
          sender: 'ADMIN',
          senderId: admin.userId,
          content: systemMessage,
        },
      });

      return { issue: updatedIssue, message: issueMessage };
    });

    // Send email notification to customer based on action
    const customer = issue.orderItem.order.customer;
    try {
      let emailSent = false;

      const productName = issue.orderItem.product?.name || 'your item';

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
          !isFinalRejection // canAppeal
        );
      }

      if (emailSent) {
        // Update the message to track email was sent
        await prisma.issueMessage.update({
          where: { id: result.message.id },
          data: {
            emailSent: true,
            emailSentAt: new Date(),
          },
        });
      }
    } catch (emailErr) {
      // Log but don't fail the request if email fails
      console.error('Failed to send review notification email:', emailErr);
    }

    const actionMessages: Record<ReviewAction, string> = {
      APPROVE_REPRINT: 'Issue approved for reprint. Ready for processing.',
      APPROVE_REFUND: 'Issue approved for refund. Ready for processing.',
      REQUEST_INFO: 'Information requested from customer.',
      REJECT: isFinalRejection ? 'Issue rejected (final).' : 'Issue rejected. Customer may appeal.',
    };

    return NextResponse.json({
      success: true,
      message: actionMessages[action],
      issue: result.issue,
    });
  } catch (error) {
    console.error('Review issue error:', error);
    return handleApiError(error);
  }
}
