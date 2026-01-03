import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin, handleApiError } from '@/lib/server/auth';
import { createRefund } from '@/lib/server/stripe-service';
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

    // Check if payment was completed
    if (order.payment.status !== 'COMPLETED') {
      return NextResponse.json(
        {
          error: `Payment status is "${order.payment.status}". Refunds can only be processed for completed payments. The Stripe webhook may not have updated the payment status - please check webhook logs in Stripe Dashboard.`,
          details: {
            paymentStatus: order.payment.status,
            stripePaymentId: order.payment.stripePaymentId,
            suggestion: 'Check Stripe Dashboard > Developers > Webhooks to verify the checkout.session.completed event was received and processed successfully.'
          }
        },
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
    const paymentIntentId = order.payment.stripePaymentId;
    if (!paymentIntentId) {
      return NextResponse.json(
        { error: 'Order has no Stripe payment ID. The payment may not have been processed correctly.' },
        { status: 400 }
      );
    }

    // Validate that stripePaymentId is a Payment Intent (starts with 'pi_'), not a Checkout Session (starts with 'cs_')
    if (!paymentIntentId.startsWith('pi_')) {
      return NextResponse.json(
        {
          error: `Invalid Stripe Payment ID format. Expected a Payment Intent ID (pi_xxx), but found "${paymentIntentId.substring(0, 15)}...". This usually means the Stripe webhook did not update the payment record after checkout completed.`,
          details: {
            currentPaymentId: paymentIntentId,
            suggestion: 'Check Stripe Dashboard > Developers > Webhooks for failed webhook deliveries. You may need to manually update the payment record with the correct Payment Intent ID from Stripe.'
          }
        },
        { status: 400 }
      );
    }

    // Issue refund via Stripe FIRST
    // Use orderId as idempotency key to prevent duplicate refunds on retry
    const refundResult = await createRefund(
      paymentIntentId,
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
