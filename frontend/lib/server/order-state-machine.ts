/**
 * Order State Machine
 * Centralizes order status transition logic to ensure consistent state management
 */

import { OrderStatus } from '@prisma/client';
import prisma from '@/lib/prisma';

/**
 * Valid state transitions for orders
 * Key: current status
 * Value: array of valid next statuses
 */
export const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  // Initial state - payment not yet confirmed
  pending: ['payment_confirmed', 'cancelled'],

  // Payment received - waiting for admin confirmation
  payment_confirmed: ['confirmed', 'cancellation_requested', 'cancelled', 'refunded'],

  // Order confirmed - ready for production
  confirmed: ['printing', 'cancellation_requested', 'cancelled', 'refunded'],

  // In production - can only move forward or be cancelled with difficulty
  printing: ['shipped', 'cancelled', 'refunded'],

  // Shipped - waiting for delivery
  shipped: ['delivered', 'refunded'],

  // Delivered - can only be refunded for issues
  delivered: ['refunded'],

  // Customer requested cancellation - waiting for admin review
  cancellation_requested: ['cancelled', 'confirmed', 'payment_confirmed', 'pending', 'refunded'],

  // Terminal states - no further transitions
  cancelled: [],
  refunded: [],
};

/**
 * Human-readable status labels
 */
export const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Pending Payment',
  payment_confirmed: 'Payment Confirmed',
  confirmed: 'Confirmed',
  printing: 'Printing',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancellation_requested: 'Cancellation Requested',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
};

/**
 * Statuses that are considered "active" (need attention)
 */
export const ACTIVE_STATUSES: OrderStatus[] = [
  'pending',
  'payment_confirmed',
  'confirmed',
  'printing',
  'shipped',
  'cancellation_requested',
];

/**
 * Statuses that are considered "terminal" (order is complete)
 */
export const TERMINAL_STATUSES: OrderStatus[] = ['delivered', 'cancelled', 'refunded'];

/**
 * Statuses that allow cancellation
 */
export const CANCELLABLE_STATUSES: OrderStatus[] = [
  'pending',
  'payment_confirmed',
  'confirmed',
];

/**
 * Statuses that allow refund
 */
export const REFUNDABLE_STATUSES: OrderStatus[] = [
  'payment_confirmed',
  'confirmed',
  'printing',
  'shipped',
  'delivered',
];

/**
 * Check if a status transition is valid
 */
export function isValidTransition(
  currentStatus: OrderStatus,
  newStatus: OrderStatus
): boolean {
  if (currentStatus === newStatus) {
    return true; // No-op is always valid
  }
  return VALID_TRANSITIONS[currentStatus].includes(newStatus);
}

/**
 * Get all valid next statuses for a given current status
 */
export function getValidNextStatuses(currentStatus: OrderStatus): OrderStatus[] {
  return VALID_TRANSITIONS[currentStatus];
}

/**
 * Validate and describe why a transition is invalid
 */
export function validateTransition(
  currentStatus: OrderStatus,
  newStatus: OrderStatus
): { valid: boolean; error?: string } {
  if (currentStatus === newStatus) {
    return { valid: true };
  }

  if (TERMINAL_STATUSES.includes(currentStatus)) {
    return {
      valid: false,
      error: `Order is in terminal state '${STATUS_LABELS[currentStatus]}' and cannot be modified`,
    };
  }

  if (!VALID_TRANSITIONS[currentStatus].includes(newStatus)) {
    const validOptions = VALID_TRANSITIONS[currentStatus]
      .map((s) => STATUS_LABELS[s])
      .join(', ');
    return {
      valid: false,
      error: `Cannot transition from '${STATUS_LABELS[currentStatus]}' to '${STATUS_LABELS[newStatus]}'. Valid transitions: ${validOptions || 'none'}`,
    };
  }

  return { valid: true };
}

export interface TransitionResult {
  success: boolean;
  previousStatus?: OrderStatus;
  newStatus?: OrderStatus;
  error?: string;
}

/**
 * Safely transition an order to a new status
 * Returns success/failure with previous status for rollback if needed
 */
export async function transitionOrderStatus(
  orderId: string,
  newStatus: OrderStatus,
  options?: {
    /** Skip validation (use with caution, e.g., for admin overrides) */
    force?: boolean;
    /** Additional order updates to make atomically */
    additionalUpdates?: Record<string, unknown>;
  }
): Promise<TransitionResult> {
  try {
    // Get current order status
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { status: true },
    });

    if (!order) {
      return { success: false, error: 'Order not found' };
    }

    const currentStatus = order.status;

    // Validate transition unless forced
    if (!options?.force) {
      const validation = validateTransition(currentStatus, newStatus);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }
    }

    // Skip update if no change
    if (currentStatus === newStatus && !options?.additionalUpdates) {
      return {
        success: true,
        previousStatus: currentStatus,
        newStatus: currentStatus,
      };
    }

    // Update order status
    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: newStatus,
        ...options?.additionalUpdates,
      },
    });

    console.log(`[Order State] ${orderId}: ${currentStatus} -> ${newStatus}`);

    return {
      success: true,
      previousStatus: currentStatus,
      newStatus,
    };
  } catch (error) {
    console.error('[Order State] Transition failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Check if order can be cancelled (customer-initiated)
 */
export function canCustomerRequestCancellation(status: OrderStatus): boolean {
  return CANCELLABLE_STATUSES.includes(status);
}

/**
 * Check if order can be refunded
 */
export function canBeRefunded(status: OrderStatus): boolean {
  return REFUNDABLE_STATUSES.includes(status);
}

/**
 * Check if order is in a terminal state
 */
export function isTerminalStatus(status: OrderStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}

/**
 * Check if order is active (needs attention)
 */
export function isActiveStatus(status: OrderStatus): boolean {
  return ACTIVE_STATUSES.includes(status);
}
