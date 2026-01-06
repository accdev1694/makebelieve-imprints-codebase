/**
 * Issue Stats Service
 *
 * Handles statistics and reporting for issues.
 */

import { prisma } from '@/lib/prisma';
import type { IssueStats, AdminIssueStats, IssueFilters } from './types';
import {
  ISSUE_INCLUDE_CUSTOMER,
  ISSUE_INCLUDE_ADMIN,
  PENDING_STATUSES,
  RESOLVED_STATUSES,
} from './issue-status-machine';

// =============================================================================
// Customer Statistics
// =============================================================================

/**
 * Get all issues for a customer with statistics
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
    pending: issues.filter((i) => PENDING_STATUSES.includes(i.status)).length,
    resolved: issues.filter((i) => RESOLVED_STATUSES.includes(i.status)).length,
    unreadMessages: totalUnread,
  };

  return { issues: issuesWithUnread, stats };
}

// =============================================================================
// Admin Statistics
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
 * Get admin dashboard statistics
 */
export async function getAdminDashboardStats(): Promise<AdminIssueStats> {
  const stats = await prisma.issue.groupBy({
    by: ['status'],
    _count: true,
  });

  const carrierFaultCount = await prisma.issue.count({
    where: { carrierFault: 'CARRIER_FAULT' },
  });

  return {
    byStatus: stats.reduce(
      (acc, s) => {
        acc[s.status] = s._count;
        return acc;
      },
      {} as Record<string, number>
    ),
    carrierFault: carrierFaultCount,
  };
}

/**
 * Get count of issues needing attention (for badges/notifications)
 */
export async function getIssuesNeedingAttention(): Promise<number> {
  return prisma.issue.count({
    where: {
      status: {
        in: ['AWAITING_REVIEW', 'APPROVED_REPRINT', 'APPROVED_REFUND'],
      },
      isConcluded: false,
    },
  });
}

/**
 * Get count of unread admin messages for a customer
 */
export async function getCustomerUnreadCount(customerId: string): Promise<number> {
  const result = await prisma.issueMessage.count({
    where: {
      sender: 'ADMIN',
      readAt: null,
      issue: {
        orderItem: {
          order: {
            customerId,
          },
        },
      },
    },
  });

  return result;
}

/**
 * Get count of unread customer messages (for admin dashboard)
 */
export async function getAdminUnreadCount(): Promise<number> {
  return prisma.issueMessage.count({
    where: {
      sender: 'CUSTOMER',
      readAt: null,
    },
  });
}
