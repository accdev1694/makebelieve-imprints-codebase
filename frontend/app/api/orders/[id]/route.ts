import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth, handleApiError } from '@/lib/server/auth';
import { getCheckoutSession } from '@/lib/server/stripe-service';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/orders/[id]
 * Get order details
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth(request);
    const { id } = await params;

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        design: true,
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        items: {
          include: {
            product: {
              include: {
                images: true,
              },
            },
            variant: true,
            design: true,
          },
        },
        invoice: true,
        payment: true,
        review: true,
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Only owner or admin can view order
    if (order.customerId !== user.userId && user.type !== 'admin') {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Proactive payment sync: If payment is pending with a checkout session ID,
    // check Stripe and update if payment was actually completed (webhook may be delayed)
    if (
      order.payment &&
      order.payment.status === 'PENDING' &&
      order.payment.stripePaymentId?.startsWith('cs_')
    ) {
      try {
        const session = await getCheckoutSession(order.payment.stripePaymentId);

        if (session && session.payment_status === 'paid' && session.payment_intent) {
          const paymentIntentId = typeof session.payment_intent === 'string'
            ? session.payment_intent
            : session.payment_intent.id;

          // Update payment record with correct payment intent ID
          const updatedPayment = await prisma.payment.update({
            where: { id: order.payment.id },
            data: {
              stripePaymentId: paymentIntentId,
              status: 'COMPLETED',
              paidAt: order.payment.paidAt || new Date(),
              gatewayResponse: {
                sessionId: session.id,
                paymentIntent: paymentIntentId,
                paymentStatus: session.payment_status,
                amountTotal: session.amount_total,
                currency: session.currency,
                syncedAt: new Date().toISOString(),
              },
            },
          });

          // Update order status if still pending
          if (order.status === 'pending') {
            await prisma.order.update({
              where: { id: order.id },
              data: { status: 'payment_confirmed' },
            });
            order.status = 'payment_confirmed';
          }

          // Update the order object with synced payment
          order.payment = updatedPayment;
          console.log(`[OrderSync] Synced payment for order ${order.id}: cs_xxx → ${paymentIntentId}`);
        }
      } catch (syncError) {
        // Log but don't fail the request - sync is best-effort
        console.error(`[OrderSync] Failed to sync payment for order ${order.id}:`, syncError);
      }
    }

    return NextResponse.json({
      success: true,
      data: { order },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
