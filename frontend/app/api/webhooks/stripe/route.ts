import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import prisma from '@/lib/prisma';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

/**
 * POST /api/webhooks/stripe
 * Handle Stripe webhook events
 */
export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Webhook signature verification failed:', message);
    return NextResponse.json(
      { error: `Webhook Error: ${message}` },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutComplete(session);
        break;
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentSuccess(paymentIntent);
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentFailed(paymentIntent);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

/**
 * Handle successful checkout session
 */
async function handleCheckoutComplete(session: Stripe.Checkout.Session) {
  const orderId = session.metadata?.orderId;

  if (!orderId) {
    console.error('No orderId in session metadata');
    return;
  }

  // Update order status to confirmed
  await prisma.order.update({
    where: { id: orderId },
    data: { status: 'confirmed' },
  });

  // Create or update payment record
  const gatewayResponse = {
    sessionId: session.id,
    paymentIntent: typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id,
    paymentStatus: session.payment_status,
    amountTotal: session.amount_total,
    currency: session.currency,
  };

  await prisma.payment.upsert({
    where: { orderId },
    update: {
      status: 'COMPLETED',
      stripePaymentId: session.payment_intent as string,
      paidAt: new Date(),
      gatewayResponse,
    },
    create: {
      orderId,
      amount: (session.amount_total || 0) / 100,
      currency: (session.currency || 'gbp').toUpperCase(),
      paymentMethod: 'CARD',
      status: 'COMPLETED',
      stripePaymentId: session.payment_intent as string,
      paidAt: new Date(),
      gatewayResponse,
    },
  });

  console.log(`Order ${orderId} payment completed`);
}

/**
 * Handle successful payment intent
 */
async function handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent) {
  const orderId = paymentIntent.metadata?.orderId;

  if (!orderId) {
    console.log('No orderId in payment intent metadata');
    return;
  }

  // Update payment status
  await prisma.payment.updateMany({
    where: { orderId },
    data: {
      status: 'COMPLETED',
      stripePaymentId: paymentIntent.id,
      paidAt: new Date(),
    },
  });

  console.log(`Payment ${paymentIntent.id} succeeded for order ${orderId}`);
}

/**
 * Handle failed payment intent
 */
async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
  const orderId = paymentIntent.metadata?.orderId;

  if (!orderId) {
    console.log('No orderId in payment intent metadata');
    return;
  }

  // Update payment and order status
  const errorResponse = {
    error: paymentIntent.last_payment_error?.message || 'Payment failed',
    code: paymentIntent.last_payment_error?.code,
    declineCode: paymentIntent.last_payment_error?.decline_code,
  };

  await prisma.$transaction([
    prisma.payment.updateMany({
      where: { orderId },
      data: {
        status: 'FAILED',
        gatewayResponse: errorResponse,
      },
    }),
    prisma.order.update({
      where: { id: orderId },
      data: { status: 'cancelled' },
    }),
  ]);

  console.log(`Payment failed for order ${orderId}`);
}
