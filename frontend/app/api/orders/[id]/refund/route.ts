import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin, handleApiError } from '@/lib/server/auth';
import { createRefund, resolvePaymentIntentId } from '@/lib/server/stripe-service';
import { sendRefundConfirmationEmail } from '@/lib/server/email';
import { createRefundEntry, getOrderForAccounting } from '@/lib/server/accounting-service';
import {
  auditRefund,
  extractAuditContext,
  ActorType,
} from '@/lib/server/audit-service';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/orders/[id]/refund
 * Issue a refund for an order (admin only)
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const admin = await requireAdmin(request);
    const { id: orderId } = await params;

    const body = await request.json();
    const { reason, notes } = body;

    if (!reason) {
      return NextResponse.json(
        { error: 'Reason is required' },
        { status: 400 }
      );
    }

    // Validate reason is one of the allowed values
    const validReasons = [
      'DAMAGED_IN_TRANSIT',
      'QUALITY_ISSUE',
      'WRONG_ITEM',
      'PRINTING_ERROR',
      'OTHER',
    ];
    if (!validReasons.includes(reason)) {
      return NextResponse.json(
        { error: 'Invalid reason' },
        { status: 400 }
      );
    }

    // Get the order with payment info
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: true,
        payment: true,
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Check if order has a payment
    if (!order.payment) {
      return NextResponse.json(
        { error: 'Order has no payment record. This may be a free reprint order that cannot be refunded directly.' },
        { status: 400 }
      );
    }

    // Check if already refunded
    if (order.payment.refundedAt) {
      return NextResponse.json(
        { error: 'Order has already been refunded' },
        { status: 400 }
      );
    }

    if (order.status === 'refunded') {
      return NextResponse.json(
        { error: 'Order has already been refunded' },
        { status: 400 }
      );
    }

    // Get the payment intent ID
    const storedPaymentId = order.payment.stripePaymentId;
    if (!storedPaymentId) {
      return NextResponse.json(
        { error: 'Order has no Stripe payment ID. The payment may not have been processed correctly.' },
        { status: 400 }
      );
    }

    // Resolve the Payment Intent ID - handles both pi_xxx and cs_xxx formats
    // This provides a fallback when the webhook hasn't updated the payment record
    const resolved = await resolvePaymentIntentId(storedPaymentId);

    if (!resolved.paymentIntentId) {
      return NextResponse.json(
        {
          error: `Cannot process refund: ${resolved.error}`,
          suggestion: 'Check Stripe Dashboard to verify the payment status.',
        },
        { status: 400 }
      );
    }

    if (!resolved.isPaid) {
      return NextResponse.json(
        {
          error: 'Cannot process refund: Payment was not completed in Stripe.',
          suggestion: 'Verify the payment status in Stripe Dashboard.',
        },
        { status: 400 }
      );
    }

    // If we resolved from a checkout session, update the local payment record for future use
    if (storedPaymentId.startsWith('cs_')) {
      console.log(`[Refund] Updating payment record with resolved Payment Intent ID: ${resolved.paymentIntentId}`);
      await prisma.payment.update({
        where: { id: order.payment.id },
        data: {
          stripePaymentId: resolved.paymentIntentId,
          status: 'COMPLETED',
          paidAt: order.payment.paidAt || new Date(),
        },
      });
    }

    // Issue refund via Stripe FIRST
    // Use orderId as idempotency key to prevent duplicate refunds on retry
    const refundResult = await createRefund(
      resolved.paymentIntentId,
      'requested_by_customer',
      undefined, // full refund
      `refund_${orderId}` // idempotency key
    );

    if (!refundResult.success) {
      return NextResponse.json(
        { error: `Refund failed: ${refundResult.error}` },
        { status: 400 }
      );
    }

    // Stripe succeeded - now create resolution and update everything atomically
    // If this fails, the idempotency key prevents duplicate Stripe refunds on retry
    const resolution = await prisma.$transaction(async (tx) => {
      // Create resolution record as COMPLETED
      // Note: order.payment is validated to exist earlier in this function
      const newResolution = await tx.resolution.create({
        data: {
          orderId: orderId,
          type: 'REFUND',
          reason: reason,
          notes: notes || null,
          refundAmount: order.payment!.amount,
          status: 'COMPLETED',
          createdBy: admin.userId,
          stripeRefundId: refundResult.refundId,
          processedAt: new Date(),
        },
      });

      // Update payment record
      await tx.payment.update({
        where: { id: order.payment!.id },
        data: {
          refundedAt: new Date(),
          status: 'REFUNDED',
        },
      });

      // Update order status
      await tx.order.update({
        where: { id: orderId },
        data: {
          status: 'refunded',
        },
      });

      return newResolution;
    });

    // Store payment amount before null check scope ends
    const paymentAmount = Number(order.payment!.amount);

    // Send refund confirmation email to customer
    sendRefundConfirmationEmail(
      order.customer.email,
      order.customer.name,
      orderId,
      paymentAmount,
      reason
    ).catch((error) => {
      console.error('Failed to send refund confirmation email:', error);
    });

    // Auto-accounting: Create refund entry
    try {
      const orderForAccounting = await getOrderForAccounting(orderId);
      if (orderForAccounting) {
        await createRefundEntry(
          orderForAccounting,
          paymentAmount,
          `Refund - ${reason}`
        );
      }
    } catch (accountingError) {
      console.error('Failed to create refund entry:', accountingError);
    }

    // Audit: Log refund
    const auditContext = extractAuditContext(request.headers, {
      userId: admin.userId,
      email: admin.email,
      type: ActorType.ADMIN,
    });
    auditRefund(
      orderId,
      auditContext,
      {
        amount: Number(refundResult.amount || paymentAmount),
        stripeRefundId: refundResult.refundId,
        reason,
      }
    ).catch((err) => console.error('[Audit] Failed to log refund:', err));

    return NextResponse.json({
      success: true,
      message: 'Refund issued successfully',
      resolutionId: resolution.id,
      refundId: refundResult.refundId,
      amount: refundResult.amount,
    });
  } catch (error) {
    console.error('Create refund error:', error);
    return handleApiError(error);
  }
}
