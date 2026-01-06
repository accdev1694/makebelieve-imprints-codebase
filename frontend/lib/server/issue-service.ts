/**
 * Issue Service
 *
 * Handles all business logic for the issue/resolution system.
 * Issues are created per order item and go through a state machine:
 * SUBMITTED -> AWAITING_REVIEW -> [APPROVED_REPRINT|APPROVED_REFUND|INFO_REQUESTED|REJECTED] -> [COMPLETED|CLOSED]
 */

import { prisma } from '@/lib/prisma';
import {
  IssueStatus,
  IssueResolutionType,
  CarrierFault,
  Prisma,
} from '@prisma/client';
import { createRefund, resolvePaymentIntentId } from './stripe-service';
import { createReprintExpense } from './accounting-service';

// =============================================================================
// Types
// =============================================================================

export type ReviewAction = 'APPROVE_REPRINT' | 'APPROVE_REFUND' | 'REQUEST_INFO' | 'REJECT';
export type MessageSender = 'CUSTOMER' | 'ADMIN';

export interface IssueFilters {
  status?: IssueStatus;
  carrierFault?: CarrierFault;
  limit?: number;
  offset?: number;
}

export interface IssueStats {
  total: number;
  pending: number;
  resolved: number;
  unreadMessages: number;
}

export interface AdminIssueStats {
  byStatus: Record<string, number>;
  carrierFault: number;
}

export interface ReviewResult {
  success: boolean;
  message: string;
  issue?: Prisma.IssueGetPayload<Record<string, never>>;
  error?: string;
}

export interface ProcessResult {
  success: boolean;
  message: string;
  reprintOrderId?: string;
  refundAmount?: number;
  issue?: Prisma.IssueGetPayload<Record<string, never>>;
  error?: string;
}

// Standard includes for issue queries
const ISSUE_INCLUDE_CUSTOMER = {
  orderItem: {
    include: {
      order: {
        select: {
          id: true,
          status: true,
          createdAt: true,
          trackingNumber: true,
          customerId: true,
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
    orderBy: { createdAt: 'desc' as const },
    take: 1,
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
} as const;

const ISSUE_INCLUDE_ADMIN = {
  orderItem: {
    include: {
      order: {
        select: {
          id: true,
          status: true,
          createdAt: true,
          trackingNumber: true,
          totalPrice: true,
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
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
    },
  },
  messages: {
    orderBy: { createdAt: 'desc' as const },
    take: 1,
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
          sender: 'CUSTOMER',
          readAt: null,
        },
      },
    },
  },
} as const;

// =============================================================================
// Customer Operations
// =============================================================================

/**
 * Get all issues for a customer
 */
export async function getCustomerIssues(customerId: string) {
  const issues = await prisma.issue.findMany({
    where: {
      orderItem: {
        order: {
          customerId,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    include: ISSUE_INCLUDE_CUSTOMER,
  });

  // Transform to add unread count
  const issuesWithUnread = issues.map((issue) => ({
    ...issue,
    unreadCount: issue._count.messages,
    latestMessage: issue.messages[0] || null,
    messages: undefined,
    _count: undefined,
  }));

  // Calculate total unread messages
  const totalUnread = issues.reduce((sum, issue) => sum + issue._count.messages, 0);

  // Calculate stats
  const stats: IssueStats = {
    total: issues.length,
    pending: issues.filter((i) => ['AWAITING_REVIEW', 'INFO_REQUESTED'].includes(i.status)).length,
    resolved: issues.filter((i) => ['COMPLETED', 'CLOSED'].includes(i.status)).length,
    unreadMessages: totalUnread,
  };

  return { issues: issuesWithUnread, stats };
}

/**
 * Get a single issue by ID with ownership verification
 */
export async function getCustomerIssue(issueId: string, customerId: string) {
  const issue = await prisma.issue.findUnique({
    where: { id: issueId },
    include: {
      orderItem: {
        include: {
          order: {
            select: {
              id: true,
              status: true,
              createdAt: true,
              trackingNumber: true,
              shippingAddress: true,
              customerId: true,
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
              size: true,
              color: true,
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
        orderBy: { createdAt: 'asc' },
      },
      originalIssue: {
        select: {
          id: true,
          reason: true,
          status: true,
          createdAt: true,
        },
      },
      childIssues: {
        select: {
          id: true,
          reason: true,
          status: true,
          createdAt: true,
        },
      },
    },
  });

  if (!issue) {
    return { issue: null, error: 'Issue not found' };
  }

  // Verify ownership
  if (issue.orderItem.order.customerId !== customerId) {
    return { issue: null, error: 'Access denied' };
  }

  // Mark admin messages as read
  await markMessagesAsRead(issueId, 'ADMIN');

  return { issue, error: null };
}

/**
 * Customer withdraws an issue (only allowed in early stages)
 */
export async function withdrawIssue(
  issueId: string,
  customerId: string
): Promise<{ success: boolean; error?: string }> {
  const issue = await prisma.issue.findUnique({
    where: { id: issueId },
    include: {
      orderItem: {
        include: {
          order: {
            select: { customerId: true },
          },
        },
      },
    },
  });

  if (!issue) {
    return { success: false, error: 'Issue not found' };
  }

  if (issue.orderItem.order.customerId !== customerId) {
    return { success: false, error: 'Access denied' };
  }

  const withdrawableStatuses = ['SUBMITTED', 'AWAITING_REVIEW'];
  if (!withdrawableStatuses.includes(issue.status)) {
    return {
      success: false,
      error: 'This issue can no longer be withdrawn as it is already being processed',
    };
  }

  await prisma.issue.delete({
    where: { id: issueId },
  });

  return { success: true };
}

/**
 * Customer sends a message on an issue
 */
export async function sendCustomerMessage(
  issueId: string,
  customerId: string,
  content: string,
  imageUrls?: string[]
): Promise<{ success: boolean; message?: unknown; error?: string }> {
  if (!content || content.trim().length === 0) {
    return { success: false, error: 'Message content is required' };
  }

  const issue = await prisma.issue.findUnique({
    where: { id: issueId },
    include: {
      orderItem: {
        include: {
          order: {
            select: { customerId: true },
          },
        },
      },
    },
  });

  if (!issue) {
    return { success: false, error: 'Issue not found' };
  }

  if (issue.orderItem.order.customerId !== customerId) {
    return { success: false, error: 'Access denied' };
  }

  if (issue.isConcluded) {
    return { success: false, error: 'This issue has been concluded and no longer accepts messages' };
  }

  const validatedImageUrls = Array.isArray(imageUrls)
    ? imageUrls.filter((url) => typeof url === 'string' && url.length > 0)
    : [];

  const message = await prisma.issueMessage.create({
    data: {
      issueId,
      sender: 'CUSTOMER',
      senderId: customerId,
      content: content.trim(),
      imageUrls: validatedImageUrls.length > 0 ? validatedImageUrls : undefined,
    },
  });

  // If issue was in INFO_REQUESTED, move back to AWAITING_REVIEW
  if (issue.status === 'INFO_REQUESTED') {
    await prisma.issue.update({
      where: { id: issueId },
      data: { status: 'AWAITING_REVIEW' },
    });
  }

  return { success: true, message };
}

/**
 * Customer appeals a rejected issue
 */
export async function appealIssue(
  issueId: string,
  customerId: string,
  reason: string,
  imageUrls?: string[]
): Promise<{ success: boolean; error?: string }> {
  if (!reason || reason.trim().length === 0) {
    return { success: false, error: 'Please provide a reason for your appeal' };
  }

  const issue = await prisma.issue.findUnique({
    where: { id: issueId },
    include: {
      orderItem: {
        include: {
          order: {
            select: { customerId: true },
          },
        },
      },
    },
  });

  if (!issue) {
    return { success: false, error: 'Issue not found' };
  }

  if (issue.orderItem.order.customerId !== customerId) {
    return { success: false, error: 'Access denied' };
  }

  if (issue.isConcluded) {
    return { success: false, error: 'This issue has been concluded and cannot be appealed' };
  }

  if (issue.status !== 'REJECTED') {
    return { success: false, error: 'Only rejected issues can be appealed' };
  }

  if (issue.rejectionFinal) {
    return {
      success: false,
      error: 'This issue has already been appealed and the rejection is final',
    };
  }

  const validatedImageUrls = Array.isArray(imageUrls)
    ? imageUrls.filter((url) => typeof url === 'string' && url.length > 0)
    : [];

  await prisma.$transaction([
    prisma.issueMessage.create({
      data: {
        issueId,
        sender: 'CUSTOMER',
        senderId: customerId,
        content: `**Appeal:** ${reason.trim()}`,
        imageUrls: validatedImageUrls.length > 0 ? validatedImageUrls : undefined,
      },
    }),
    prisma.issue.update({
      where: { id: issueId },
      data: {
        status: 'AWAITING_REVIEW',
        reviewedAt: null,
      },
    }),
  ]);

  return { success: true };
}

// =============================================================================
// Admin Operations
// =============================================================================

/**
 * List all issues with filtering (admin)
 */
export async function listIssuesAdmin(filters: IssueFilters = {}) {
  const { status, carrierFault, limit = 50, offset = 0 } = filters;

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (carrierFault) where.carrierFault = carrierFault;

  const [issues, total] = await Promise.all([
    prisma.issue.findMany({
      where,
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      take: limit,
      skip: offset,
      include: ISSUE_INCLUDE_ADMIN,
    }),
    prisma.issue.count({ where }),
  ]);

  // Get stats
  const stats = await prisma.issue.groupBy({
    by: ['status'],
    _count: true,
  });

  const carrierFaultCount = await prisma.issue.count({
    where: { carrierFault: 'CARRIER_FAULT' },
  });

  const issuesWithUnread = issues.map((issue) => ({
    ...issue,
    unreadCount: issue._count.messages,
    latestMessage: issue.messages[0] || null,
    messages: undefined,
    _count: undefined,
  }));

  const adminStats: AdminIssueStats = {
    byStatus: stats.reduce(
      (acc, s) => {
        acc[s.status] = s._count;
        return acc;
      },
      {} as Record<string, number>
    ),
    carrierFault: carrierFaultCount,
  };

  return { issues: issuesWithUnread, total, stats: adminStats };
}

/**
 * Get a single issue by ID (admin)
 */
export async function getIssueAdmin(issueId: string) {
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
              payment: {
                select: {
                  id: true,
                  amount: true,
                  status: true,
                  stripePaymentId: true,
                  refundedAt: true,
                },
              },
              items: {
                include: {
                  product: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                  variant: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                  issue: {
                    select: {
                      id: true,
                      status: true,
                    },
                  },
                },
              },
            },
          },
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
              basePrice: true,
            },
          },
          variant: {
            select: {
              id: true,
              name: true,
              size: true,
              color: true,
              price: true,
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
        orderBy: { createdAt: 'asc' },
      },
      originalIssue: {
        select: {
          id: true,
          reason: true,
          status: true,
          createdAt: true,
          resolvedType: true,
        },
      },
      childIssues: {
        select: {
          id: true,
          reason: true,
          status: true,
          createdAt: true,
        },
      },
    },
  });

  if (!issue) {
    return { issue: null, error: 'Issue not found' };
  }

  // Mark customer messages as read
  await markMessagesAsRead(issueId, 'CUSTOMER');

  return { issue, error: null };
}

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

  const reviewableStatuses: IssueStatus[] = ['AWAITING_REVIEW', 'INFO_REQUESTED'];
  if (!reviewableStatuses.includes(issue.status)) {
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
        error: 'Cannot process refund: refund amount is £0',
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
): Promise<{ success: boolean; issue?: unknown; error?: string }> {
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
): Promise<{ success: boolean; issue?: unknown; error?: string }> {
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

/**
 * Admin sends a message on an issue
 */
export async function sendAdminMessage(
  issueId: string,
  adminId: string,
  content: string,
  imageUrls?: string[]
): Promise<{ success: boolean; message?: unknown; error?: string }> {
  if (!content || content.trim().length === 0) {
    return { success: false, error: 'Message content is required' };
  }

  const issue = await prisma.issue.findUnique({
    where: { id: issueId },
  });

  if (!issue) {
    return { success: false, error: 'Issue not found' };
  }

  const closedStatuses = ['COMPLETED', 'CLOSED'];
  if (closedStatuses.includes(issue.status)) {
    return { success: false, error: 'This issue has been closed and no longer accepts messages' };
  }

  const validatedImageUrls = Array.isArray(imageUrls)
    ? imageUrls.filter((url) => typeof url === 'string' && url.length > 0)
    : [];

  const message = await prisma.issueMessage.create({
    data: {
      issueId,
      sender: 'ADMIN',
      senderId: adminId,
      content: content.trim(),
      imageUrls: validatedImageUrls.length > 0 ? validatedImageUrls : undefined,
    },
  });

  return { success: true, message };
}

// =============================================================================
// Shared Utilities
// =============================================================================

/**
 * Mark messages as read
 */
export async function markMessagesAsRead(
  issueId: string,
  sender: MessageSender
): Promise<number> {
  const result = await prisma.issueMessage.updateMany({
    where: {
      issueId,
      sender,
      readAt: null,
    },
    data: {
      readAt: new Date(),
    },
  });

  return result.count;
}

/**
 * Get messages for an issue
 */
export async function getIssueMessages(issueId: string) {
  return prisma.issueMessage.findMany({
    where: { issueId },
    orderBy: { createdAt: 'asc' },
  });
}

/**
 * Update message to track email sent
 */
export async function markMessageEmailSent(messageId: string): Promise<void> {
  await prisma.issueMessage.update({
    where: { id: messageId },
    data: {
      emailSent: true,
      emailSentAt: new Date(),
    },
  });
}
