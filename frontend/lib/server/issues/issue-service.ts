/**
 * Core Issue Service
 *
 * Handles basic CRUD operations for issues.
 * For messaging, see issue-message-service.ts
 * For resolution/processing, see issue-resolution-service.ts
 * For statistics, see issue-stats-service.ts
 */

import { prisma } from '@/lib/prisma';
import { markMessagesAsRead } from './issue-message-service';
import { WITHDRAWABLE_STATUSES } from './issue-status-machine';

// =============================================================================
// Customer Issue Operations
// =============================================================================

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

  if (!WITHDRAWABLE_STATUSES.includes(issue.status)) {
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

// =============================================================================
// Admin Issue Operations
// =============================================================================

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
