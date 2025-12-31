import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin, handleApiError } from '@/lib/server/auth';
import { createRefund } from '@/lib/server/stripe-service';
import { sendOrderCancelledBySellerEmail } from '@/lib/server/email';
import { CancellationReason, OrderStatus } from '@prisma/client';
import { createRefundEntry, getOrderForAccounting } from '@/lib/server/accounting-service';

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
const CANCELLABLE_STATUSES: OrderStatus[] = [
  'pending',
  'payment_confirmed',
  'confirmed',
  'printing',
  'cancellation_requested',
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

    // Process refund if payment exists and processRefund is true
    if (processRefund && order.payment && order.payment.status === 'COMPLETED' && order.payment.stripePaymentId) {
      // Validate stripePaymentId is a Payment Intent (not a Checkout Session)
      if (!order.payment.stripePaymentId.startsWith('pi_')) {
        return NextResponse.json(
          {
            error: `Cannot process refund: Invalid payment ID format. Expected Payment Intent (pi_xxx), found "${order.payment.stripePaymentId.substring(0, 15)}...". The Stripe webhook may not have updated the payment record.`,
            suggestion: 'Check Stripe Dashboard > Developers > Webhooks for failed deliveries.'
          },
          { status: 400 }
        );
      }

      const refundResult = await createRefund(
        order.payment.stripePaymentId,
        reason === 'FRAUD_SUSPECTED' ? 'fraudulent' : 'requested_by_customer'
      );

      if (!refundResult.success) {
        return NextResponse.json(
          { error: `Refund failed: ${refundResult.error}. Order not cancelled.` },
          { status: 400 }
        );
      }

      refundId = refundResult.refundId || null;
      refundAmount = refundResult.amount || null;

      // Update payment status
      await prisma.payment.update({
        where: { id: order.payment.id },
        data: {
          status: 'REFUNDED',
          refundedAt: new Date(),
        },
      });
    }

    // Update order with cancellation info
    const updatedOrder = await prisma.order.update({
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

    // If there was a pending cancellation request, mark it as approved
    if (order.cancellationRequest && order.cancellationRequest.status === 'PENDING') {
      await prisma.cancellationRequest.update({
        where: { id: order.cancellationRequest.id },
        data: {
          status: 'APPROVED',
          reviewedAt: new Date(),
          reviewedBy: admin.userId,
          reviewNotes: notes || 'Approved by admin during order cancellation',
        },
      });
    }

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
