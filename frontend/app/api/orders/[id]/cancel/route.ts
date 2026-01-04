import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin, handleApiError } from '@/lib/server/auth';
import { createRefund, resolvePaymentIntentId } from '@/lib/server/stripe-service';
import { sendOrderCancelledBySellerEmail } from '@/lib/server/email';
import { CancellationReason, OrderStatus } from '@prisma/client';
import { createRefundEntry, getOrderForAccounting } from '@/lib/server/accounting-service';
import {
  auditOrderCancellation,
  extractAuditContext,
  ActorType,
} from '@/lib/server/audit-service';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Valid cancellation reasons
const VALID_CANCELLATION_REASONS: CancellationReason[] = [
  'OUT_OF_STOCK',
  'BUYER_REQUEST',
  'FRAUD_SUSPECTED',
  'PAYMENT_ISSUE',
  'PRODUCTION_ISSUE',
  'DUPLICATE_ORDER',
  'OTHER',
];

// Order statuses that can be cancelled by admin
// Note: cancellation_requested orders should use the review endpoint instead
const CANCELLABLE_STATUSES: OrderStatus[] = [
  'pending',
  'payment_confirmed',
  'confirmed',
  'printing',
];

/**
 * POST /api/orders/[id]/cancel
 * Cancel an order (admin only)
 * This endpoint handles direct cancellation by admin and processes refund if applicable
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const admin = await requireAdmin(request);
    const { id: orderId } = await params;

    const body = await request.json();
    const { reason, notes, processRefund = true } = body as {
      reason: CancellationReason;
      notes?: string;
      processRefund?: boolean;
    };

    // Validate reason
    if (!reason || !VALID_CANCELLATION_REASONS.includes(reason)) {
      return NextResponse.json(
        { error: 'Invalid cancellation reason' },
        { status: 400 }
      );
    }

    // Get the order with payment info
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: true,
        payment: true,
        cancellationRequest: true,
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Check if order can be cancelled
    if (!CANCELLABLE_STATUSES.includes(order.status)) {
      // Special message for cancellation_requested orders
      if (order.status === 'cancellation_requested') {
        return NextResponse.json(
          { error: 'This order has a pending cancellation request. Please use the review endpoint to approve or reject it.' },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: `Cannot cancel order with status: ${order.status}. Only pending, confirmed, or printing orders can be cancelled.` },
        { status: 400 }
      );
    }

    // Check if already cancelled
    if (order.status === 'cancelled' || order.status === 'refunded') {
      return NextResponse.json(
        { error: 'Order has already been cancelled or refunded' },
        { status: 400 }
      );
    }

    let refundId: string | null = null;
    let refundAmount: number | null = null;
    let resolvedPaymentIntentId: string | null = null;

    // Process refund if payment exists and processRefund is true
    if (processRefund && order.payment) {
      console.log(`[Cancel] Processing refund for order ${orderId}`);
      console.log(`[Cancel] Payment record: id=${order.payment.id}, status=${order.payment.status}, stripePaymentId=${order.payment.stripePaymentId}`);

      if (!order.payment.stripePaymentId) {
        console.error(`[Cancel] No stripePaymentId found for order ${orderId}`);
        return NextResponse.json(
          {
            error: 'Cannot process refund: No Stripe payment ID found. The payment may not have been recorded properly.',
            suggestion: 'Check Stripe Dashboard to verify the payment, then manually process the refund.'
          },
          { status: 400 }
        );
      }

      // Resolve the Payment Intent ID - handles both pi_xxx and cs_xxx formats
      // This provides a fallback when the webhook hasn't updated the payment record
      const resolved = await resolvePaymentIntentId(order.payment.stripePaymentId);

      if (!resolved.paymentIntentId) {
        console.error(`[Cancel] Failed to resolve payment intent: ${resolved.error}`);
        return NextResponse.json(
          {
            error: `Cannot process refund: ${resolved.error}`,
            suggestion: 'Check Stripe Dashboard to verify the payment status.',
          },
          { status: 400 }
        );
      }

      if (!resolved.isPaid) {
        console.error(`[Cancel] Payment was not completed according to Stripe`);
        return NextResponse.json(
          {
            error: 'Cannot process refund: Payment was not completed in Stripe.',
            suggestion: 'Verify the payment status in Stripe Dashboard. If unpaid, cancel without refund.',
          },
          { status: 400 }
        );
      }

      resolvedPaymentIntentId = resolved.paymentIntentId;

      console.log(`[Cancel] Creating refund for payment intent: ${resolvedPaymentIntentId}`);
      const refundResult = await createRefund(
        resolvedPaymentIntentId,
        reason === 'FRAUD_SUSPECTED' ? 'fraudulent' : 'requested_by_customer',
        undefined, // full refund
        `cancel_${orderId}` // idempotency key prevents duplicate refunds
      );

      if (!refundResult.success) {
        console.error(`[Cancel] Refund failed: ${refundResult.error}`);
        return NextResponse.json(
          { error: `Refund failed: ${refundResult.error}. Order not cancelled.` },
          { status: 400 }
        );
      }

      console.log(`[Cancel] Refund created successfully: ${refundResult.refundId}, amount: ${refundResult.amount}`);
      refundId = refundResult.refundId || null;
      refundAmount = refundResult.amount || null;
    } else if (processRefund) {
      // No payment record exists - cannot refund
      console.error(`[Cancel] Cannot process refund - no payment record found for order ${orderId}`);
      return NextResponse.json(
        {
          error: 'Cannot process refund: No payment record found for this order.',
          suggestion: 'If this order was never paid for, set processRefund to false to cancel without refund.',
        },
        { status: 400 }
      );
    }

    // ATOMIC TRANSACTION: Update all records together to prevent inconsistent state
    // If refund was processed above but this transaction fails, the idempotency key
    // will prevent duplicate refunds on retry
    const updatedOrder = await prisma.$transaction(async (tx) => {
      // Update payment record if refund was processed
      if (order.payment && refundAmount) {
        // If we resolved from a checkout session, update with the resolved payment intent ID
        const paymentUpdateData: {
          status: 'REFUNDED';
          refundedAt: Date;
          stripePaymentId?: string;
          paidAt?: Date;
        } = {
          status: 'REFUNDED',
          refundedAt: new Date(),
        };

        if (order.payment.stripePaymentId?.startsWith('cs_') && resolvedPaymentIntentId) {
          paymentUpdateData.stripePaymentId = resolvedPaymentIntentId;
          paymentUpdateData.paidAt = order.payment.paidAt || new Date();
        }

        await tx.payment.update({
          where: { id: order.payment.id },
          data: paymentUpdateData,
        });
        console.log(`[Cancel] Payment status updated to REFUNDED`);

        // Create Resolution record for audit trail (consistent with /refund endpoint)
        // Note: ResolutionReason is for quality/shipping issues, so we use OTHER for cancellations
        // and include the actual cancellation reason in the notes
        await tx.resolution.create({
          data: {
            orderId: orderId,
            type: 'REFUND',
            reason: 'OTHER',
            notes: `Order cancelled by admin (${reason}): ${notes || 'No additional notes'}`,
            refundAmount: refundAmount,
            status: 'COMPLETED',
            stripeRefundId: refundId,
            processedAt: new Date(),
            createdBy: admin.userId,
          },
        });
        console.log(`[Cancel] Resolution record created for audit trail`);
      }

      // Update order with cancellation info
      const cancelledOrder = await tx.order.update({
        where: { id: orderId },
        data: {
          status: 'cancelled',
          cancelledAt: new Date(),
          cancelledBy: 'ADMIN',
          cancellationReason: reason,
          cancellationNotes: notes || null,
          stripeRefundId: refundId,
          refundAmount: refundAmount ? refundAmount : null,
        },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      return cancelledOrder;
    });

    console.log(`[Cancel] Order ${orderId} cancelled successfully`);

    // Send email notification to customer
    sendOrderCancelledBySellerEmail(
      updatedOrder.customer.email,
      updatedOrder.customer.name,
      orderId,
      reason,
      notes || null,
      refundAmount
    ).catch((error) => {
      console.error('Failed to send cancellation email:', error);
    });

    // Auto-accounting: Create refund entry if refund was processed
    if (refundAmount) {
      try {
        const orderForAccounting = await getOrderForAccounting(orderId);
        if (orderForAccounting) {
          await createRefundEntry(
            orderForAccounting,
            refundAmount,
            `Cancellation - ${reason}`
          );
        }
      } catch (accountingError) {
        console.error('Failed to create refund entry:', accountingError);
      }
    }

    // Audit: Log order cancellation
    const auditContext = extractAuditContext(request.headers, {
      userId: admin.userId,
      email: admin.email,
      type: ActorType.ADMIN,
    });
    auditOrderCancellation(
      orderId,
      reason,
      auditContext,
      order.status // previous status
    ).catch((err) => console.error('[Audit] Failed to log cancellation:', err));

    return NextResponse.json({
      success: true,
      message: refundAmount
        ? `Order cancelled and £${refundAmount.toFixed(2)} refunded successfully`
        : 'Order cancelled successfully',
      data: {
        orderId,
        status: 'cancelled',
        refundId,
        refundAmount,
        cancelledAt: updatedOrder.cancelledAt,
      },
    });
  } catch (error) {
    console.error('Cancel order error:', error);
    return handleApiError(error);
  }
}
