import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin, handleApiError } from '@/lib/server/auth';
import { createRefund } from '@/lib/server/stripe-service';
import { sendRefundConfirmationEmail } from '@/lib/server/email';

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
        { error: 'Order has no payment record' },
        { status: 400 }
      );
    }

    // Check if payment was completed
    if (order.payment.status !== 'COMPLETED') {
      return NextResponse.json(
        { error: 'Order payment is not completed' },
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
        { error: 'Order has no Stripe payment ID' },
        { status: 400 }
      );
    }

    // Create resolution record first as PROCESSING
    const resolution = await prisma.resolution.create({
      data: {
        orderId: orderId,
        type: 'REFUND',
        reason: reason,
        notes: notes || null,
        refundAmount: order.payment.amount,
        status: 'PROCESSING',
        createdBy: admin.userId,
      },
    });

    // Issue refund via Stripe
    const refundResult = await createRefund(paymentIntentId, 'requested_by_customer');

    if (!refundResult.success) {
      // Update resolution to failed
      await prisma.resolution.update({
        where: { id: resolution.id },
        data: {
          status: 'FAILED',
          notes: `${notes || ''}\n\nRefund failed: ${refundResult.error}`.trim(),
        },
      });

      return NextResponse.json(
        { error: `Refund failed: ${refundResult.error}` },
        { status: 400 }
      );
    }

    // Update resolution and order in transaction
    await prisma.$transaction([
      // Update resolution to completed
      prisma.resolution.update({
        where: { id: resolution.id },
        data: {
          status: 'COMPLETED',
          stripeRefundId: refundResult.refundId,
          processedAt: new Date(),
        },
      }),
      // Update payment record
      prisma.payment.update({
        where: { id: order.payment.id },
        data: {
          refundedAt: new Date(),
          status: 'REFUNDED',
        },
      }),
      // Update order status
      prisma.order.update({
        where: { id: orderId },
        data: {
          status: 'refunded',
        },
      }),
    ]);

    // Send refund confirmation email to customer
    sendRefundConfirmationEmail(
      order.customer.email,
      order.customer.name,
      orderId,
      Number(order.payment.amount),
      reason
    ).catch((error) => {
      console.error('Failed to send refund confirmation email:', error);
    });

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
