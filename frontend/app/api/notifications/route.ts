import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth, handleApiError } from '@/lib/server/auth';

export interface NotificationItem {
  id: string;
  type: string;
  message: string;
  link?: string;
  action?: 'mailto';
  count?: number;
  createdAt?: string;
}

export interface NotificationsResponse {
  totalCount: number;
  items: NotificationItem[];
}

/**
 * GET /api/notifications
 * Get pending action notifications for the current user
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);

    if (user.type === 'admin') {
      return getAdminNotifications();
    } else {
      return getCustomerNotifications(user.userId);
    }
  } catch (error) {
    return handleApiError(error);
  }
}

async function getCustomerNotifications(userId: string): Promise<NextResponse> {
  const items: NotificationItem[] = [];

  // 1. Check for pending orders (awaiting payment)
  const pendingOrders = await prisma.order.findMany({
    where: {
      customerId: userId,
      status: 'pending',
    },
    select: {
      id: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });

  for (const order of pendingOrders) {
    items.push({
      id: `order-${order.id}`,
      type: 'order_pending',
      message: `Order #${order.id.slice(0, 8).toUpperCase()} awaiting payment`,
      link: `/orders/${order.id}`,
      createdAt: order.createdAt.toISOString(),
    });
  }

  // 2. Check for issues with unread admin responses
  const issuesWithUnreadMessages = await prisma.issue.findMany({
    where: {
      orderItem: {
        order: {
          customerId: userId,
        },
      },
      isConcluded: false,
      messages: {
        some: {
          sender: 'ADMIN',
          readAt: null,
        },
      },
    },
    select: {
      id: true,
      createdAt: true,
      orderItem: {
        select: {
          order: {
            select: {
              id: true,
            },
          },
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
    orderBy: { createdAt: 'desc' },
    take: 5,
  });

  for (const issue of issuesWithUnreadMessages) {
    const unreadCount = issue._count.messages;
    items.push({
      id: `issue-${issue.id}`,
      type: 'issue_response',
      message: `${unreadCount} new response${unreadCount > 1 ? 's' : ''} on your issue`,
      link: `/account/issues/${issue.id}`,
      count: unreadCount,
      createdAt: issue.createdAt.toISOString(),
    });
  }

  // 3. Check for cancellation request updates
  const cancellationUpdates = await prisma.cancellationRequest.findMany({
    where: {
      order: {
        customerId: userId,
      },
      status: { in: ['APPROVED', 'REJECTED'] },
      reviewedAt: {
        // Only show updates from last 7 days
        gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      },
    },
    select: {
      id: true,
      status: true,
      reviewedAt: true,
      order: {
        select: {
          id: true,
        },
      },
    },
    orderBy: { reviewedAt: 'desc' },
    take: 5,
  });

  for (const request of cancellationUpdates) {
    items.push({
      id: `cancel-${request.id}`,
      type: 'cancellation_update',
      message: `Cancellation request ${request.status.toLowerCase()}`,
      link: `/orders/${request.order.id}`,
      createdAt: request.reviewedAt?.toISOString(),
    });
  }

  return NextResponse.json({
    totalCount: items.length,
    items,
  } as NotificationsResponse);
}

async function getAdminNotifications(): Promise<NextResponse> {
  const items: NotificationItem[] = [];

  // 1. Count pending orders
  const pendingOrderCount = await prisma.order.count({
    where: {
      status: { in: ['pending', 'payment_confirmed'] },
    },
  });

  if (pendingOrderCount > 0) {
    items.push({
      id: 'pending-orders',
      type: 'pending_orders',
      message: `${pendingOrderCount} order${pendingOrderCount > 1 ? 's' : ''} pending`,
      link: '/admin/orders?status=pending',
      count: pendingOrderCount,
    });
  }

  // 2. Count issues awaiting review
  const issuesAwaitingReview = await prisma.issue.count({
    where: {
      status: { in: ['SUBMITTED', 'AWAITING_REVIEW'] },
      isConcluded: false,
    },
  });

  if (issuesAwaitingReview > 0) {
    items.push({
      id: 'issues-review',
      type: 'issues_review',
      message: `${issuesAwaitingReview} issue${issuesAwaitingReview > 1 ? 's' : ''} to review`,
      link: '/admin/issues',
      count: issuesAwaitingReview,
    });
  }

  // 3. Count pending cancellation requests
  const pendingCancellations = await prisma.cancellationRequest.count({
    where: {
      status: 'PENDING',
    },
  });

  if (pendingCancellations > 0) {
    items.push({
      id: 'cancellation-requests',
      type: 'cancellation_requests',
      message: `${pendingCancellations} cancellation request${pendingCancellations > 1 ? 's' : ''}`,
      link: '/admin/orders?filter=cancellation_requested',
      count: pendingCancellations,
    });
  }

  // 4. Count issues with unread customer messages
  const issuesWithUnreadCustomerMessages = await prisma.issue.count({
    where: {
      isConcluded: false,
      messages: {
        some: {
          sender: 'CUSTOMER',
          readAt: null,
        },
      },
    },
  });

  if (issuesWithUnreadCustomerMessages > 0) {
    items.push({
      id: 'unread-messages',
      type: 'unread_messages',
      message: `${issuesWithUnreadCustomerMessages} issue${issuesWithUnreadCustomerMessages > 1 ? 's' : ''} with new messages`,
      link: '/admin/issues',
      count: issuesWithUnreadCustomerMessages,
    });
  }

  const totalCount = items.reduce((sum, item) => sum + (item.count || 1), 0);

  return NextResponse.json({
    totalCount,
    items,
  } as NotificationsResponse);
}
