/**
 * Issue Resolution Service
 *
 * Handles admin review and processing of issues (reprints, refunds).
 */

import { prisma } from '@/lib/prisma';
import { IssueStatus, IssueResolutionType, Prisma } from '@prisma/client';
import { createRefund, resolvePaymentIntentId } from '../stripe-service';
import { createReprintExpense } from '../accounting-service';
import type { ReviewAction, ReviewResult, ProcessResult, IssueOperationResult } from './types';
import { REVIEWABLE_STATUSES } from './issue-status-machine';

// =============================================================================
// Admin Review Operations
// =============================================================================

/**
 * Admin reviews an issue: approve, request info, or reject
 */
export async function reviewIssue(
  issueId: string,
  action: ReviewAction,
  adminId: string,
  message?: string,
  isFinalRejection?: boolean
): Promise<ReviewResult> {
  const validActions: ReviewAction[] = ['APPROVE_REPRINT', 'APPROVE_REFUND', 'REQUEST_INFO', 'REJECT'];
  if (!action || !validActions.includes(action)) {
    return { success: false, message: '', error: 'Invalid action' };
  }

  const issue = await prisma.issue.findUnique({
    where: { id: issueId },
    include: {
      orderItem: {
        include: {
          product: {
            select: { name: true },
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
    return { success: false, message: '', error: 'Issue not found' };
  }

  if (!REVIEWABLE_STATUSES.includes(issue.status)) {
    return {
      success: false,
      message: '',
      error: `This issue cannot be reviewed in its current status: ${issue.status}`,
    };
  }

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
      resolvedType = 'FULL_REFUND';
      systemMessage = message || 'Your issue has been approved for a refund. We will process this shortly.';
      break;

    case 'REQUEST_INFO':
      if (!message || message.trim().length === 0) {
        return {
          success: false,
          message: '',
          error: 'A message is required when requesting more information',
        };
      }
      newStatus = 'INFO_REQUESTED';
      systemMessage = message;
      break;

    case 'REJECT':
      if (!message || message.trim().length === 0) {
        return {
          success: false,
          message: '',
          error: 'A reason is required when rejecting an issue',
        };
      }
      newStatus = 'REJECTED';
      systemMessage = message;
      break;

    default:
      return { success: false, message: '', error: 'Invalid action' };
  }

  const shouldAutoConclude = action === 'REJECT' && isFinalRejection;

  const result = await prisma.$transaction(async (tx) => {
    const updatedIssue = await tx.issue.update({
      where: { id: issueId },
      data: {
        status: newStatus,
        resolvedType,
        reviewedAt: new Date(),
        rejectionReason: action === 'REJECT' ? message : undefined,
        rejectionFinal: action === 'REJECT' && isFinalRejection ? true : undefined,
        ...(shouldAutoConclude && {
          isConcluded: true,
          concludedAt: new Date(),
          concludedBy: adminId,
        }),
      },
    });

    const issueMessage = await tx.issueMessage.create({
      data: {
        issueId,
        sender: 'ADMIN',
        senderId: adminId,
        content: systemMessage,
      },
    });

    return { issue: updatedIssue, message: issueMessage };
  });

  const actionMessages: Record<ReviewAction, string> = {
    APPROVE_REPRINT: 'Issue approved for reprint. Ready for processing.',
    APPROVE_REFUND: 'Issue approved for refund. Ready for processing.',
    REQUEST_INFO: 'Information requested from customer.',
    REJECT: isFinalRejection ? 'Issue rejected (final).' : 'Issue rejected. Customer may appeal.',
  };

  return {
    success: true,
    message: actionMessages[action],
    issue: result.issue,
  };
}

/**
 * Process an approved issue (create reprint or issue refund)
 */
export async function processIssue(
  issueId: string,
  adminId: string,
  options: {
    refundType?: 'FULL_REFUND' | 'PARTIAL_REFUND';
    notes?: string;
  } = {}
): Promise<ProcessResult> {
  const { refundType, notes } = options;

  const issue = await prisma.issue.findUnique({
    where: { id: issueId },
    include: {
      orderItem: {
        include: {
          order: {
            include: {
              customer: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
              payment: true,
              items: {
                include: {
                  product: true,
                  variant: true,
                  design: true,
                },
              },
            },
          },
          product: true,
          variant: true,
          design: true,
        },
      },
    },
  });

  if (!issue) {
    return { success: false, message: '', error: 'Issue not found' };
  }

  if (!['APPROVED_REPRINT', 'APPROVED_REFUND'].includes(issue.status)) {
    return { success: false, message: '', error: 'Issue must be approved before processing' };
  }

  const order = issue.orderItem.order;
  const orderItem = issue.orderItem;

  // Handle REPRINT
  if (issue.status === 'APPROVED_REPRINT') {
    const result = await prisma.$transaction(async (tx) => {
      const reprintOrder = await tx.order.create({
        data: {
          customerId: order.customerId,
          designId: orderItem.designId,
          status: 'confirmed',
          printSize: order.printSize,
          material: order.material,
          orientation: order.orientation,
          printWidth: order.printWidth,
          printHeight: order.printHeight,
          previewUrl: order.previewUrl,
          subtotal: 0,
          totalPrice: 0,
          shippingAddress: order.shippingAddress as Prisma.InputJsonValue,
        },
      });

      const reprintItem = await tx.orderItem.create({
        data: {
          orderId: reprintOrder.id,
          productId: orderItem.productId,
          variantId: orderItem.variantId,
          designId: orderItem.designId,
          quantity: orderItem.quantity,
          unitPrice: 0,
          totalPrice: 0,
          customization: orderItem.customization as Prisma.InputJsonValue | undefined,
          metadata: {
            ...(typeof orderItem.metadata === 'object' && orderItem.metadata !== null
              ? (orderItem.metadata as Record<string, unknown>)
              : {}),
            isReprint: true,
            originalOrderId: order.id,
            originalItemId: orderItem.id,
            issueId: issue.id,
          },
        },
      });

      const updatedIssue = await tx.issue.update({
        where: { id: issueId },
        data: {
          status: 'COMPLETED',
          resolvedType: 'REPRINT',
          reprintOrderId: reprintOrder.id,
          reprintItemId: reprintItem.id,
          processedAt: new Date(),
          isConcluded: true,
          concludedAt: new Date(),
          concludedBy: adminId,
        },
      });

      await tx.issueMessage.create({
        data: {
          issueId,
          sender: 'ADMIN',
          senderId: adminId,
          content: notes || 'Your reprint order has been created and will be processed shortly.',
        },
      });

      return { reprintOrder, reprintItem, issue: updatedIssue };
    });

    // Create expense entry (non-blocking)
    createReprintExpense(order.id, result.reprintOrder.id, issue.reason).catch((error) => {
      console.error('Failed to create reprint expense:', error);
    });

    return {
      success: true,
      message: 'Reprint order created successfully',
      reprintOrderId: result.reprintOrder.id,
      issue: result.issue,
    };
  }

  // Handle REFUND
  if (issue.status === 'APPROVED_REFUND') {
    let payment = order.payment;
    let originalOrderTotal: number | null = null;

    if (!payment) {
      const itemMetadata = orderItem.metadata as Record<string, unknown> | null;
      if (itemMetadata?.isReprint && itemMetadata?.originalOrderId) {
        const originalOrderId = itemMetadata.originalOrderId as string;
        const originalOrder = await prisma.order.findUnique({
          where: { id: originalOrderId },
          include: { payment: true },
        });
        if (originalOrder?.payment) {
          payment = originalOrder.payment;
          originalOrderTotal = Number(originalOrder.totalPrice);
        }
      }
    }

    if (!payment || !payment.stripePaymentId) {
      return {
        success: false,
        message: '',
        error: 'No payment found for this order',
      };
    }

    if (payment.status !== 'COMPLETED') {
      return {
        success: false,
        message: '',
        error: `Payment status is "${payment.status}". Refunds can only be processed for completed payments.`,
      };
    }

    const resolved = await resolvePaymentIntentId(payment.stripePaymentId);
    if (!resolved.paymentIntentId) {
      return {
        success: false,
        message: '',
        error: `Cannot process refund: ${resolved.error}`,
      };
    }

    if (!resolved.isPaid) {
      return {
        success: false,
        message: '',
        error: 'Cannot process refund: Payment was not completed in Stripe.',
      };
    }

    if (payment.stripePaymentId.startsWith('cs_')) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          stripePaymentId: resolved.paymentIntentId,
          status: 'COMPLETED',
          paidAt: payment.paidAt || new Date(),
        },
      });
    }

    if (payment.refundedAt) {
      return { success: false, message: '', error: 'This order has already been refunded' };
    }

    const resolvedRefundType: IssueResolutionType = refundType || 'FULL_REFUND';
    let refundAmount: number;

    if (resolvedRefundType === 'PARTIAL_REFUND') {
      refundAmount = Number(orderItem.totalPrice) || Number(originalOrderTotal) || 0;
    } else {
      refundAmount = originalOrderTotal || Number(order.totalPrice);
    }

    if (refundAmount <= 0) {
      return {
        success: false,
        message: '',
        error: 'Cannot process refund: refund amount is 0',
      };
    }

    await prisma.issue.update({
      where: { id: issueId },
      data: {
        status: 'PROCESSING',
        resolvedType: resolvedRefundType,
      },
    });

    const refundResult = await createRefund(
      resolved.paymentIntentId,
      'requested_by_customer',
      refundAmount,
      `issue_${issueId}`
    );

    if ('error' in refundResult || !refundResult.success) {
      await prisma.issue.update({
        where: { id: issueId },
        data: { status: 'APPROVED_REFUND' },
      });

      await prisma.issueMessage.create({
        data: {
          issueId,
          sender: 'ADMIN',
          senderId: adminId,
          content: `Refund processing failed: ${refundResult.error || 'Unknown error'}. Please try again.`,
        },
      });

      return {
        success: false,
        message: '',
        error: refundResult.error || 'Refund processing failed',
      };
    }

    const result = await prisma.$transaction(async (tx) => {
      const updatedIssue = await tx.issue.update({
        where: { id: issueId },
        data: {
          status: 'COMPLETED',
          resolvedType: resolvedRefundType,
          refundAmount: refundResult.amount || refundAmount,
          stripeRefundId: refundResult.refundId,
          processedAt: new Date(),
          isConcluded: true,
          concludedAt: new Date(),
          concludedBy: adminId,
        },
      });

      await tx.payment.update({
        where: { id: payment.id },
        data: {
          refundedAt: new Date(),
          status: resolvedRefundType === 'FULL_REFUND' ? 'REFUNDED' : payment.status,
        },
      });

      if (resolvedRefundType === 'FULL_REFUND') {
        await tx.order.update({
          where: { id: order.id },
          data: { status: 'refunded' },
        });
      }

      await tx.issueMessage.create({
        data: {
          issueId,
          sender: 'ADMIN',
          senderId: adminId,
          content:
            notes ||
            `Your refund of £${(refundResult.amount || refundAmount).toFixed(2)} has been processed.`,
        },
      });

      return { issue: updatedIssue };
    });

    return {
      success: true,
      message: 'Refund processed successfully',
      refundAmount: refundResult.amount || refundAmount,
      issue: result.issue,
    };
  }

  return { success: false, message: '', error: 'Invalid issue status for processing' };
}

/**
 * Conclude an issue (prevents further customer actions)
 */
export async function concludeIssue(
  issueId: string,
  adminId: string,
  reason?: string
): Promise<IssueOperationResult> {
  const issue = await prisma.issue.findUnique({
    where: { id: issueId },
  });

  if (!issue) {
    return { success: false, error: 'Issue not found' };
  }

  if (issue.isConcluded) {
    return { success: false, error: 'Issue is already concluded' };
  }

  const result = await prisma.$transaction(async (tx) => {
    const updatedIssue = await tx.issue.update({
      where: { id: issueId },
      data: {
        isConcluded: true,
        concludedAt: new Date(),
        concludedBy: adminId,
        concludedReason: reason || 'Manually concluded by admin',
      },
    });

    await tx.issueMessage.create({
      data: {
        issueId,
        sender: 'ADMIN',
        senderId: adminId,
        content: reason || 'This issue has been concluded. No further action is required.',
      },
    });

    return updatedIssue;
  });

  return { success: true, issue: result };
}

/**
 * Reopen a concluded issue
 */
export async function reopenIssue(
  issueId: string,
  adminId: string
): Promise<IssueOperationResult> {
  const issue = await prisma.issue.findUnique({
    where: { id: issueId },
  });

  if (!issue) {
    return { success: false, error: 'Issue not found' };
  }

  if (!issue.isConcluded) {
    return { success: false, error: 'Issue is not concluded' };
  }

  const result = await prisma.$transaction(async (tx) => {
    const updatedIssue = await tx.issue.update({
      where: { id: issueId },
      data: {
        isConcluded: false,
        concludedAt: null,
        concludedBy: null,
        concludedReason: null,
      },
    });

    await tx.issueMessage.create({
      data: {
        issueId,
        sender: 'ADMIN',
        senderId: adminId,
        content: 'This issue has been reopened for further review.',
      },
    });

    return updatedIssue;
  });

  return { success: true, issue: result };
}
