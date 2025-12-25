import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import prisma from '@/lib/prisma';
import { requireAuth, handleApiError } from '@/lib/server/auth';

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

/**
 * POST /api/checkout
 * Create a Stripe checkout session for an order
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const body = await request.json();
    const { orderId } = body;

    if (!orderId) {
      return NextResponse.json(
        { error: 'orderId is required' },
        { status: 400 }
      );
    }

    // Fetch the order with items
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: true,
            variant: true,
          },
        },
        customer: true,
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    if (order.customerId !== user.userId && user.type !== 'admin') {
      return NextResponse.json(
        { error: 'Not authorized' },
        { status: 403 }
      );
    }

    // Build line items for Stripe
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];

    if (order.items.length > 0) {
      // Multi-item order
      for (const item of order.items) {
        const productName = item.product?.name || 'Custom Product';
        const variantName = item.variant?.name ? ` - ${item.variant.name}` : '';

        lineItems.push({
          price_data: {
            currency: 'gbp',
            product_data: {
              name: `${productName}${variantName}`,
              description: item.customization
                ? `Customization: ${JSON.stringify(item.customization)}`
                : undefined,
            },
            unit_amount: Math.round(Number(item.unitPrice) * 100),
          },
          quantity: item.quantity,
        });
      }
    } else {
      // Legacy single-item order
      lineItems.push({
        price_data: {
          currency: 'gbp',
          product_data: {
            name: 'Custom Print Order',
            description: order.printSize
              ? `${order.printSize} - ${order.material || 'Standard'}`
              : undefined,
          },
          unit_amount: Math.round(Number(order.totalPrice) * 100),
        },
        quantity: 1,
      });
    }

    // Get the base URL for redirects
    const origin = request.headers.get('origin') || 'https://www.makebelieveimprints.co.uk';

    // Create Stripe checkout session
    const session = await getStripe().checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${origin}/orders/${orderId}?payment=success`,
      cancel_url: `${origin}/orders/${orderId}?payment=cancelled`,
      customer_email: order.customer.email,
      metadata: {
        orderId: order.id,
        customerId: user.userId,
      },
      shipping_address_collection: {
        allowed_countries: ['GB'],
      },
    });

    // Create pending payment record
    await prisma.payment.upsert({
      where: { orderId: order.id },
      update: {
        stripePaymentId: session.id,
        status: 'PENDING',
      },
      create: {
        orderId: order.id,
        amount: Number(order.totalPrice),
        currency: 'GBP',
        paymentMethod: 'CARD',
        status: 'PENDING',
        stripePaymentId: session.id,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        sessionId: session.id,
        url: session.url,
      },
    });
  } catch (error) {
    console.error('Checkout error:', error);
    return handleApiError(error);
  }
}
