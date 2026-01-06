/**
 * Issue Message Service
 *
 * Handles all messaging operations for the issue system.
 */

import { prisma } from '@/lib/prisma';
import type { MessageSender, MessageOperationResult } from './types';

// =============================================================================
// Message Operations
// =============================================================================

/**
 * Mark messages as read by sender type
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
 * Get all messages for an issue
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

/**
 * Customer sends a message on an issue
 */
export async function sendCustomerMessage(
  issueId: string,
  customerId: string,
  content: string,
  imageUrls?: string[]
): Promise<MessageOperationResult> {
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
 * Admin sends a message on an issue
 */
export async function sendAdminMessage(
  issueId: string,
  adminId: string,
  content: string,
  imageUrls?: string[]
): Promise<MessageOperationResult> {
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
