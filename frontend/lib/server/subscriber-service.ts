/**
 * Subscriber Service
 * Handles all newsletter subscriber business logic
 */

import prisma from '@/lib/prisma';
import { SubscriberSource } from '@prisma/client';
import { sendSubscriptionConfirmEmail, sendWelcomeEmail } from '@/lib/server/email';
import { ensureWelcome10Promo } from '@/lib/server/promo-service';
import { validateEmail } from '@/lib/server/validation';
import crypto from 'crypto';

// ============================================
// Types
// ============================================

export type SubscriberStatus = 'PENDING' | 'ACTIVE' | 'UNSUBSCRIBED';
export { SubscriberSource };

export interface SubscriberResponse {
  id: string;
  email: string;
  name?: string | null;
  status: string;
  source?: string | null;
  subscribedAt?: Date | null;
  unsubscribedAt?: Date | null;
  createdAt: Date;
}

export interface SubscriberListParams {
  page?: number;
  limit?: number;
  status?: SubscriberStatus;
  search?: string;
}

export interface ServiceResult<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// ============================================
// Public Subscriber Operations
// ============================================

/**
 * Subscribe to newsletter (public endpoint)
 */
export async function subscribe(
  email: string,
  name?: string,
  source: SubscriberSource = 'FOOTER'
): Promise<ServiceResult<null>> {
  if (!email) {
    return { success: false, error: 'Email is required' };
  }

  // Validate email format
  const emailValidation = validateEmail(email);
  if (!emailValidation.valid) {
    return { success: false, error: emailValidation.errors[0] || 'Invalid email format' };
  }

  const normalizedEmail = email.toLowerCase();

  // Check if subscriber already exists
  const existingSubscriber = await prisma.subscriber.findUnique({
    where: { email: normalizedEmail },
  });

  if (existingSubscriber) {
    if (existingSubscriber.status === 'ACTIVE') {
      return { success: true, message: 'You are already subscribed!' };
    }

    if (existingSubscriber.status === 'PENDING') {
      // Resend confirmation email
      const confirmToken = crypto.randomBytes(32).toString('hex');
      await prisma.subscriber.update({
        where: { id: existingSubscriber.id },
        data: {
          confirmToken,
          updatedAt: new Date(),
        },
      });

      await sendSubscriptionConfirmEmail(normalizedEmail, confirmToken);

      return { success: true, message: 'Confirmation email resent. Please check your inbox.' };
    }

    if (existingSubscriber.status === 'UNSUBSCRIBED') {
      // Re-subscribe - generate new confirm token
      const confirmToken = crypto.randomBytes(32).toString('hex');
      await prisma.subscriber.update({
        where: { id: existingSubscriber.id },
        data: {
          status: 'PENDING',
          confirmToken,
          unsubscribedAt: null,
          updatedAt: new Date(),
        },
      });

      await sendSubscriptionConfirmEmail(normalizedEmail, confirmToken);

      return { success: true, message: 'Please check your email to confirm your subscription.' };
    }
  }

  // Create new subscriber with pending status
  const confirmToken = crypto.randomBytes(32).toString('hex');
  await prisma.subscriber.create({
    data: {
      email: normalizedEmail,
      name: name || null,
      status: 'PENDING',
      source,
      confirmToken,
    },
  });

  // Send confirmation email
  const emailSent = await sendSubscriptionConfirmEmail(normalizedEmail, confirmToken);

  if (!emailSent) {
    console.error('Failed to send confirmation email to:', normalizedEmail);
    // Still return success - we don't want to expose email sending issues
  }

  return { success: true, message: 'Please check your email to confirm your subscription.' };
}

/**
 * Confirm subscription via token
 */
export async function confirmSubscription(
  token: string
): Promise<ServiceResult<{ redirectPath: string }>> {
  if (!token) {
    return {
      success: false,
      error: 'missing_token',
      data: { redirectPath: '/subscribe/confirm?error=missing_token' },
    };
  }

  // Find subscriber by confirm token
  const subscriber = await prisma.subscriber.findFirst({
    where: { confirmToken: token },
  });

  if (!subscriber) {
    return {
      success: false,
      error: 'invalid_token',
      data: { redirectPath: '/subscribe/confirm?error=invalid_token' },
    };
  }

  if (subscriber.status === 'ACTIVE') {
    return {
      success: true,
      data: { redirectPath: '/subscribe/confirm?status=already_confirmed' },
    };
  }

  // Update subscriber to active
  await prisma.subscriber.update({
    where: { id: subscriber.id },
    data: {
      status: 'ACTIVE',
      confirmToken: null,
      subscribedAt: new Date(),
      updatedAt: new Date(),
    },
  });

  // Try to ensure WELCOME10 promo exists and send welcome email
  // These are non-critical - don't fail confirmation if they error
  try {
    await ensureWelcome10Promo();
    await sendWelcomeEmail(subscriber.email);
  } catch (emailError) {
    console.error('Error sending welcome email (subscription still confirmed):', emailError);
  }

  return {
    success: true,
    data: { redirectPath: '/subscribe/confirm?status=success' },
  };
}

/**
 * Check subscription status by email
 */
export async function getSubscriptionStatus(
  email: string
): Promise<ServiceResult<{ subscribed: boolean; status: string | null; subscribedAt: Date | null }>> {
  if (!email) {
    return { success: false, error: 'Email is required' };
  }

  const subscriber = await prisma.subscriber.findUnique({
    where: { email: email.toLowerCase() },
    select: {
      status: true,
      subscribedAt: true,
    },
  });

  if (!subscriber) {
    return {
      success: true,
      data: {
        subscribed: false,
        status: null,
        subscribedAt: null,
      },
    };
  }

  return {
    success: true,
    data: {
      subscribed: subscriber.status === 'ACTIVE',
      status: subscriber.status,
      subscribedAt: subscriber.subscribedAt,
    },
  };
}

/**
 * Unsubscribe from newsletter
 */
export async function unsubscribe(email: string): Promise<ServiceResult<null>> {
  if (!email) {
    return { success: false, error: 'Email is required' };
  }

  const subscriber = await prisma.subscriber.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (!subscriber) {
    // Don't reveal if email exists or not for privacy
    return { success: true, message: 'If you were subscribed, you have been unsubscribed.' };
  }

  if (subscriber.status === 'UNSUBSCRIBED') {
    return { success: true, message: 'You are already unsubscribed.' };
  }

  // Update subscriber to unsubscribed
  await prisma.subscriber.update({
    where: { id: subscriber.id },
    data: {
      status: 'UNSUBSCRIBED',
      unsubscribedAt: new Date(),
      confirmToken: null,
      updatedAt: new Date(),
    },
  });

  return { success: true, message: 'You have been successfully unsubscribed.' };
}

// ============================================
// Admin Subscriber Operations
// ============================================

/**
 * List subscribers with pagination and filtering (admin only)
 */
export async function listSubscribers(params: SubscriberListParams): Promise<
  ServiceResult<{
    subscribers: SubscriberResponse[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
    stats: { active: number; pending: number; unsubscribed: number; total: number };
  }>
> {
  const page = Math.max(1, params.page || 1);
  const limit = Math.min(100, Math.max(1, params.limit || 50));
  const { status, search } = params;

  const where: Record<string, unknown> = {};

  if (status && ['PENDING', 'ACTIVE', 'UNSUBSCRIBED'].includes(status)) {
    where.status = status;
  }

  if (search) {
    where.OR = [
      { email: { contains: search, mode: 'insensitive' } },
      { name: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [subscribers, total, activeCount, pendingCount, unsubscribedCount] = await Promise.all([
    prisma.subscriber.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        email: true,
        name: true,
        status: true,
        source: true,
        subscribedAt: true,
        unsubscribedAt: true,
        createdAt: true,
      },
    }),
    prisma.subscriber.count({ where }),
    prisma.subscriber.count({ where: { status: 'ACTIVE' } }),
    prisma.subscriber.count({ where: { status: 'PENDING' } }),
    prisma.subscriber.count({ where: { status: 'UNSUBSCRIBED' } }),
  ]);

  return {
    success: true,
    data: {
      subscribers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      stats: {
        active: activeCount,
        pending: pendingCount,
        unsubscribed: unsubscribedCount,
        total: activeCount + pendingCount + unsubscribedCount,
      },
    },
  };
}

/**
 * Update subscriber status (admin only)
 */
export async function updateSubscriberStatus(
  id: string,
  status: SubscriberStatus
): Promise<ServiceResult<{ id: string; email: string; status: string }>> {
  if (!status || !['ACTIVE', 'PENDING', 'UNSUBSCRIBED'].includes(status)) {
    return { success: false, error: 'Invalid status. Must be ACTIVE, PENDING, or UNSUBSCRIBED' };
  }

  const subscriber = await prisma.subscriber.findUnique({
    where: { id },
  });

  if (!subscriber) {
    return { success: false, error: 'Subscriber not found' };
  }

  const updateData: Record<string, unknown> = {
    status,
    updatedAt: new Date(),
  };

  // Set appropriate timestamps based on status change
  if (status === 'ACTIVE' && subscriber.status !== 'ACTIVE') {
    updateData.subscribedAt = new Date();
    updateData.confirmToken = null;
  } else if (status === 'UNSUBSCRIBED') {
    updateData.unsubscribedAt = new Date();
    updateData.confirmToken = null;
  }

  const updated = await prisma.subscriber.update({
    where: { id },
    data: updateData,
  });

  return {
    success: true,
    message: `Subscriber status updated to ${status}`,
    data: {
      id: updated.id,
      email: updated.email,
      status: updated.status,
    },
  };
}

/**
 * Delete subscriber (admin only)
 */
export async function deleteSubscriber(id: string): Promise<ServiceResult<null>> {
  const subscriber = await prisma.subscriber.findUnique({
    where: { id },
  });

  if (!subscriber) {
    return { success: false, error: 'Subscriber not found' };
  }

  await prisma.subscriber.delete({
    where: { id },
  });

  return { success: true, message: 'Subscriber deleted' };
}
