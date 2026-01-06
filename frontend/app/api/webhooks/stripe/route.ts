import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import prisma from '@/lib/prisma';
import {
  createIncomeFromOrder,
  createInvoiceFromOrder,
  createRefundEntry,
  getOrderForAccounting,
} from '@/lib/server/accounting-service';
import { generateAndSendInvoice } from '@/lib/server/invoice-service';
import {
  auditPaymentCompleted,
  auditRefund,
  ActorType,
} from '@/lib/server/audit-service';
import { awardPurchasePoints } from '@/lib/server/points-service';

// Lazy initialization of Stripe to avoid build-time errors
let stripe: Stripe | null = null;

function getStripe(): Stripe {
  if (!stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error('STRIPE_SECRET_KEY is not configured');
    }
    stripe = new Stripe(key);
  }
  return stripe;
}

function getWebhookSecret(): string {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error('STRIPE_WEBHOOK_SECRET is not configured');
  }
  return secret;
}

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
    event = getStripe().webhooks.constructEvent(body, signature, getWebhookSecret());
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Webhook signature verification failed:', message);
    return NextResponse.json(
      { error: `Webhook Error: ${message}` },
      { status: 400 }
    );
  }

  try {
    // Idempotency check: Track processed webhook event IDs
    // Store in database to prevent duplicate processing across serverless instances
    const existingEvent = await prisma.auditLog.findFirst({
      where: {
        action: 'WEBHOOK_PROCESSED',
        entityType: 'PAYMENT',
        metadata: {
          path: ['stripeEventId'],
          equals: event.id,
        },
      },
    });

    if (existingEvent) {
      console.log(`[Webhook] Event ${event.id} already processed, skipping`);
      return NextResponse.json({ received: true, duplicate: true });
    }

    // Record event as being processed (before handling to prevent race conditions)
    // Note: entityId uses a placeholder UUID since Stripe event IDs aren't UUIDs.
    // The actual event ID is stored in metadata for idempotency lookup.
    await prisma.auditLog.create({
      data: {
        action: 'WEBHOOK_PROCESSED',
        entityType: 'PAYMENT',
        entityId: '00000000-0000-0000-0000-000000000000',
        actorType: 'WEBHOOK',
        metadata: {
          stripeEventId: event.id,
          eventType: event.type,
          processedAt: new Date().toISOString(),
        },
      },
    });

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutComplete(session);
        break;
      }

      case 'checkout.session.expired': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutExpired(session);
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

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge;
        await handleChargeRefunded(charge);
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
    console.error('No orderId in session metadata - payment received but order cannot be updated');
    throw new Error('Missing orderId in checkout session metadata');
  }

  // CRITICAL: Verify payment was actually successful
  if (session.payment_status !== 'paid') {
    console.warn(`Checkout session ${session.id} completed but payment_status is '${session.payment_status}', not 'paid'. Skipping order confirmation.`);
    return;
  }

  // Idempotency check: Don't process if order is already confirmed or beyond
  const existingOrder = await prisma.order.findUnique({
    where: { id: orderId },
    select: { status: true },
  });

  if (!existingOrder) {
    console.error(`Order ${orderId} not found for checkout session ${session.id}`);
    throw new Error(`Order ${orderId} not found`);
  }

  // Include payment_confirmed to prevent duplicate processing of checkout.session.completed
  const alreadyProcessedStatuses = ['payment_confirmed', 'confirmed', 'printing', 'shipped', 'delivered', 'refunded', 'cancelled'];
  if (alreadyProcessedStatuses.includes(existingOrder.status)) {
    console.log(`Order ${orderId} already processed (status: ${existingOrder.status}). Skipping duplicate webhook.`);
    return;
  }

  // Update order status to payment_confirmed (awaiting admin confirmation)
  await prisma.order.update({
    where: { id: orderId },
    data: { status: 'payment_confirmed' },
  });

  // Extract payment intent ID properly (can be string or object)
  const paymentIntentId = typeof session.payment_intent === 'string'
    ? session.payment_intent
    : session.payment_intent?.id;

  if (!paymentIntentId) {
    console.error(`Checkout session ${session.id} has no payment_intent - cannot record payment`);
    throw new Error('Missing payment_intent in checkout session');
  }

  // Create or update payment record
  const gatewayResponse = {
    sessionId: session.id,
    paymentIntent: paymentIntentId,
    paymentStatus: session.payment_status,
    amountTotal: session.amount_total,
    currency: session.currency,
  };

  await prisma.payment.upsert({
    where: { orderId },
    update: {
      status: 'COMPLETED',
      stripePaymentId: paymentIntentId,
      paidAt: new Date(),
      gatewayResponse,
    },
    create: {
      orderId,
      amount: (session.amount_total || 0) / 100,
      currency: (session.currency || 'gbp').toUpperCase(),
      paymentMethod: 'CARD',
      status: 'COMPLETED',
      stripePaymentId: paymentIntentId,
      paidAt: new Date(),
      gatewayResponse,
    },
  });

  console.log(`[Webhook] Order ${orderId} payment completed - starting accounting process`);

  // Audit: Log payment completion
  auditPaymentCompleted(orderId, {
    stripePaymentId: paymentIntentId,
    amount: (session.amount_total || 0) / 100,
    currency: (session.currency || 'gbp').toUpperCase(),
  }).catch((err) => console.error('[Audit] Failed to log payment:', err));

  // Auto-accounting: Create income entry, invoice, and send invoice email
  try {
    console.log(`[Webhook] Fetching order ${orderId} for accounting...`);
    const orderForAccounting = await getOrderForAccounting(orderId);

    if (!orderForAccounting) {
      console.error(`[Webhook] Could not find order ${orderId} for accounting - skipping`);
      return;
    }

    console.log(`[Webhook] Order found: customer=${orderForAccounting.customer.email}, total=${orderForAccounting.totalPrice}`);

    // Create income entry
    try {
      console.log(`[Webhook] Creating income entry for order ${orderId}...`);
      await createIncomeFromOrder(orderForAccounting, 'PENDING');
      console.log(`[Webhook] Income entry created successfully`);
    } catch (incomeError) {
      console.error(`[Webhook] Failed to create income entry:`, incomeError);
    }

    // Create invoice and get its ID
    let invoiceId: string | null = null;
    try {
      console.log(`[Webhook] Creating invoice for order ${orderId}...`);
      invoiceId = await createInvoiceFromOrder(orderForAccounting);
      console.log(`[Webhook] Invoice created: ${invoiceId}`);
    } catch (invoiceError) {
      console.error(`[Webhook] Failed to create invoice:`, invoiceError);
    }

    // Generate PDF and send invoice email
    if (invoiceId) {
      console.log(`[Webhook] Generating and sending invoice ${invoiceId}...`);
      const invoiceResult = await generateAndSendInvoice(invoiceId);
      if (invoiceResult.success) {
        console.log(`[Webhook] Invoice sent successfully to ${orderForAccounting.customer.email}`);
      } else {
        console.error(`[Webhook] Failed to generate/send invoice: ${invoiceResult.error}`);
      }
    } else {
      console.warn(`[Webhook] No invoice ID - skipping PDF generation`);
    }
  } catch (accountingError) {
    // Log but don't fail the webhook - order processing is more critical
    console.error('[Webhook] CRITICAL: Failed to complete accounting process:', accountingError);
  }

  // Award loyalty points for purchase (10 points per £1 spent)
  try {
    const orderAmount = (session.amount_total || 0) / 100;
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { customerId: true },
    });

    if (order?.customerId) {
      const pointsAwarded = await awardPurchasePoints(order.customerId, orderId, orderAmount);
      if (pointsAwarded) {
        console.log(`[Webhook] Awarded ${pointsAwarded.amount} points for order ${orderId}`);
      }
    }
  } catch (pointsError) {
    // Non-critical - don't fail webhook for points issues
    console.error('[Webhook] Failed to award loyalty points:', pointsError);
  }
}

/**
 * Handle expired checkout session (user abandoned payment)
 * This cleans up pending orders that were never paid
 */
async function handleCheckoutExpired(session: Stripe.Checkout.Session) {
  const orderId = session.metadata?.orderId;

  if (!orderId) {
    console.log(`Expired checkout session ${session.id} has no orderId in metadata`);
    return;
  }

  // Check current order status
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { status: true },
  });

  if (!order) {
    console.log(`Order ${orderId} not found for expired session ${session.id}`);
    return;
  }

  // Only cancel if order is still pending (not already paid via different session)
  if (order.status !== 'pending') {
    console.log(`Order ${orderId} is already ${order.status}, not cancelling for expired session`);
    return;
  }

  // Mark order as cancelled due to expired payment session
  await prisma.$transaction([
    prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'cancelled',
        cancellationReason: 'PAYMENT_ISSUE',
        cancellationNotes: 'Payment session expired - customer did not complete checkout',
        cancelledAt: new Date(),
      },
    }),
    prisma.payment.updateMany({
      where: { orderId, status: 'PENDING' },
      data: {
        status: 'FAILED',
        gatewayResponse: {
          error: 'Checkout session expired',
          sessionId: session.id,
        },
      },
    }),
  ]);

  console.log(`Order ${orderId} cancelled due to expired checkout session ${session.id}`);
}

/**
 * Handle successful payment intent
 */
async function handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent) {
  const orderId = paymentIntent.metadata?.orderId;

  if (!orderId) {
    // Payment intents without orderId may come from other Stripe integrations
    // Log as warning but don't fail - checkout.session.completed is the primary handler
    console.warn(`Payment intent ${paymentIntent.id} succeeded but has no orderId in metadata`);
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
    // Payment intents without orderId may come from other Stripe integrations
    console.warn(`Payment intent ${paymentIntent.id} failed but has no orderId in metadata`);
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

/**
 * Handle refunded charge (from Stripe dashboard or API)
 */
async function handleChargeRefunded(charge: Stripe.Charge) {
  // Get the payment intent ID from the charge
  const paymentIntentId =
    typeof charge.payment_intent === 'string'
      ? charge.payment_intent
      : charge.payment_intent?.id;

  if (!paymentIntentId) {
    console.warn(`Charge ${charge.id} refunded but has no payment intent`);
    return;
  }

  // Find the payment by Stripe payment ID
  const payment = await prisma.payment.findFirst({
    where: { stripePaymentId: paymentIntentId },
    include: { order: true },
  });

  if (!payment) {
    console.log(`No payment found for payment intent ${paymentIntentId}`);
    return;
  }

  // Skip if already refunded
  if (payment.refundedAt || payment.order.status === 'refunded') {
    console.log(`Order ${payment.orderId} already marked as refunded`);
    return;
  }

  // Update payment and order
  await prisma.$transaction([
    prisma.payment.update({
      where: { id: payment.id },
      data: {
        refundedAt: new Date(),
        status: 'REFUNDED',
      },
    }),
    prisma.order.update({
      where: { id: payment.orderId },
      data: { status: 'refunded' },
    }),
  ]);

  // Check if there's a pending resolution to complete
  const pendingResolution = await prisma.resolution.findFirst({
    where: {
      orderId: payment.orderId,
      type: 'REFUND',
      status: 'PROCESSING',
    },
  });

  if (pendingResolution) {
    await prisma.resolution.update({
      where: { id: pendingResolution.id },
      data: {
        status: 'COMPLETED',
        stripeRefundId: charge.refunds?.data[0]?.id,
        processedAt: new Date(),
      },
    });
  }

  console.log(`Order ${payment.orderId} marked as refunded via webhook`);

  // Audit: Log refund via webhook
  auditRefund(
    payment.orderId,
    { actorType: ActorType.WEBHOOK },
    {
      amount: (charge.amount_refunded || charge.amount) / 100,
      stripeRefundId: charge.refunds?.data[0]?.id,
      reason: 'Stripe webhook - charge.refunded',
    }
  ).catch((err) => console.error('[Audit] Failed to log refund:', err));

  // Auto-accounting: Create refund entry
  try {
    const orderForAccounting = await getOrderForAccounting(payment.orderId);
    if (orderForAccounting) {
      const refundAmount = (charge.amount_refunded || charge.amount) / 100;
      await createRefundEntry(orderForAccounting, refundAmount, 'Stripe refund via webhook');
    }
  } catch (accountingError) {
    console.error('Failed to create refund entry:', accountingError);
  }
}
