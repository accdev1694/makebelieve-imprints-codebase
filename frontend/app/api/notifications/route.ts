import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser, handleApiError } from '@/lib/server/auth';

/**
 * Generate a link to open the user's email app/webmail with a search for the confirmation email
 */
function getEmailSearchLink(email: string): string {
  const domain = email.split('@')[1]?.toLowerCase();
  const searchQuery = encodeURIComponent('MakeBelieve Imprints confirm subscription');

  // Gmail (including Google Workspace domains we can't detect)
  if (domain === 'gmail.com' || domain === 'googlemail.com') {
    return `https://mail.google.com/mail/u/0/#search/${searchQuery}`;
  }

  // Outlook / Hotmail / Live / Microsoft
  if (['outlook.com', 'hotmail.com', 'live.com', 'msn.com', 'outlook.co.uk'].includes(domain)) {
    return `https://outlook.live.com/mail/0/inbox?search=${searchQuery}`;
  }

  // Yahoo
  if (domain === 'yahoo.com' || domain === 'yahoo.co.uk' || domain?.startsWith('yahoo.')) {
    return `https://mail.yahoo.com/d/search/keyword=${searchQuery}`;
  }

  // iCloud
  if (domain === 'icloud.com' || domain === 'me.com' || domain === 'mac.com') {
    return 'https://www.icloud.com/mail/';
  }

  // ProtonMail
  if (domain === 'protonmail.com' || domain === 'proton.me' || domain === 'pm.me') {
    return 'https://mail.proton.me/u/0/all-mail';
  }

  // Default: open a generic mailto (opens default email app)
  return `mailto:${email}`;
}

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
 *
 * Note: This endpoint returns empty results instead of 401 when not authenticated.
 * This prevents 401 spam from polling requests when the session expires.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);

    // Return empty notifications if not authenticated (prevents 401 spam from polling)
    if (!user) {
      return NextResponse.json({
        totalCount: 0,
        items: [],
        authenticated: false,
      } as NotificationsResponse & { authenticated: boolean });
    }

    if (user.type === 'admin') {
      return getAdminNotifications();
    } else {
      return getCustomerNotifications(user.userId, user.email);
    }
  } catch (error) {
    return handleApiError(error);
  }
}

async function getCustomerNotifications(userId: string, userEmail: string): Promise<NextResponse> {
  const items: NotificationItem[] = [];

  // 1. Check for pending subscription confirmation
  const pendingSubscription = await prisma.subscriber.findFirst({
    where: {
      email: userEmail.toLowerCase(),
      status: 'PENDING',
    },
  });

  if (pendingSubscription) {
    // Generate email app link based on email provider
    const emailLink = getEmailSearchLink(userEmail);

    items.push({
      id: 'pending-subscription',
      type: 'pending_subscription',
      message: 'Please confirm your newsletter subscription',
      link: emailLink,
      createdAt: pendingSubscription.createdAt.toISOString(),
    });
  }

  // 2. Check for pending orders (awaiting payment)
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

  // 3. Check for issues with unread admin responses
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

  return NextResponse.json({
    totalCount: items.length,
    items,
  } as NotificationsResponse);
}

async function getAdminNotifications(): Promise<NextResponse> {
  const items: NotificationItem[] = [];

  // 1. Count orders needing attention (new orders ready for fulfillment)
  const ordersNeedingAttention = await prisma.order.count({
    where: {
      status: { in: ['pending', 'payment_confirmed', 'confirmed'] },
    },
  });

  if (ordersNeedingAttention > 0) {
    items.push({
      id: 'pending-orders',
      type: 'pending_orders',
      message: `${ordersNeedingAttention} order${ordersNeedingAttention > 1 ? 's' : ''} to process`,
      link: '/admin/orders?status=confirmed',
      count: ordersNeedingAttention,
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
