/**
 * Issue Status Machine
 *
 * Defines status transitions and query includes for the issue system.
 * Issues go through a state machine:
 * SUBMITTED -> AWAITING_REVIEW -> [APPROVED_REPRINT|APPROVED_REFUND|INFO_REQUESTED|REJECTED] -> [COMPLETED|CLOSED]
 */

import { IssueStatus } from '@prisma/client';

// =============================================================================
// Status Constants
// =============================================================================

/** Statuses that allow customer withdrawal */
export const WITHDRAWABLE_STATUSES: IssueStatus[] = ['SUBMITTED', 'AWAITING_REVIEW'];

/** Statuses that allow admin review */
export const REVIEWABLE_STATUSES: IssueStatus[] = ['AWAITING_REVIEW', 'INFO_REQUESTED'];

/** Statuses that indicate pending/in-progress issues */
export const PENDING_STATUSES: IssueStatus[] = ['AWAITING_REVIEW', 'INFO_REQUESTED'];

/** Statuses that indicate resolved issues */
export const RESOLVED_STATUSES: IssueStatus[] = ['COMPLETED', 'CLOSED'];

/** Statuses that block admin messaging */
export const CLOSED_STATUSES: IssueStatus[] = ['COMPLETED', 'CLOSED'];

/** Statuses that allow processing (reprint/refund) */
export const PROCESSABLE_STATUSES: IssueStatus[] = ['APPROVED_REPRINT', 'APPROVED_REFUND'];

// =============================================================================
// Query Includes
// =============================================================================

/**
 * Standard includes for customer issue queries
 * Includes order item details, product, variant, design, and message summary
 */
export const ISSUE_INCLUDE_CUSTOMER = {
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

/**
 * Standard includes for admin issue queries
 * Includes customer details and unread customer message count
 */
export const ISSUE_INCLUDE_ADMIN = {
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
// Status Helpers
// =============================================================================

/**
 * Check if an issue can be withdrawn by the customer
 */
export function canWithdraw(status: IssueStatus): boolean {
  return WITHDRAWABLE_STATUSES.includes(status);
}

/**
 * Check if an issue can be reviewed by admin
 */
export function canReview(status: IssueStatus): boolean {
  return REVIEWABLE_STATUSES.includes(status);
}

/**
 * Check if an issue is pending/in-progress
 */
export function isPending(status: IssueStatus): boolean {
  return PENDING_STATUSES.includes(status);
}

/**
 * Check if an issue is resolved
 */
export function isResolved(status: IssueStatus): boolean {
  return RESOLVED_STATUSES.includes(status);
}

/**
 * Check if an issue can be processed (reprint/refund)
 */
export function canProcess(status: IssueStatus): boolean {
  return PROCESSABLE_STATUSES.includes(status);
}

/**
 * Check if an issue is closed (no more admin messages)
 */
export function isClosed(status: IssueStatus): boolean {
  return CLOSED_STATUSES.includes(status);
}
