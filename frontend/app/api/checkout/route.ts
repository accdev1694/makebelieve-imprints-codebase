import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/server/auth';
import { validateRequired, validateUUID } from '@/lib/server/validation';

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
 * Custom error response for checkout that provides helpful messages
 */
function checkoutError(message: string, status: number = 500, details?: string) {
  console.error(`Checkout error: ${message}`, details ? `Details: ${details}` : '');
  return NextResponse.json(
    { error: message },
    { status }
  );
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

    // Validate required fields
    const requiredValidation = validateRequired({ orderId }, ['orderId']);
    if (!requiredValidation.valid) {
      return NextResponse.json(
        { error: requiredValidation.errors[0] },
        { status: 400 }
      );
    }

    // Validate orderId is a valid UUID
    const uuidValidation = validateUUID(orderId);
    if (!uuidValidation.valid) {
      return NextResponse.json(
        { error: 'Invalid order ID format' },
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
      return checkoutError('Not authorized to checkout this order', 403);
    }

    // Validate customer email exists
    if (!order.customer?.email) {
      return checkoutError(
        'Unable to process checkout: customer email is missing. Please update your account details.',
        400,
        `Order ${orderId} has no customer email`
      );
    }

    // Validate order has a positive total
    const orderTotal = Number(order.totalPrice);
    if (!orderTotal || orderTotal <= 0) {
      return checkoutError(
        'Unable to process checkout: order total is invalid. Please contact support.',
        400,
        `Order ${orderId} has invalid total: ${order.totalPrice}`
      );
    }

    // Build line items for Stripe
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];

    if (order.items.length > 0) {
      // Multi-item order
      // Calculate VAT multiplier: order.totalPrice includes VAT, item prices don't
      const itemsSubtotal = order.items.reduce(
        (sum, item) => sum + Number(item.totalPrice),
        0
      );
      const vatMultiplier = itemsSubtotal > 0
        ? Number(order.totalPrice) / itemsSubtotal
        : 1;

      for (const item of order.items) {
        const productName = item.product?.name || 'Custom Product';
        const variantName = item.variant?.name ? ` - ${item.variant.name}` : '';

        // Apply VAT multiplier to get VAT-inclusive price
        const unitPriceWithVat = Number(item.unitPrice) * vatMultiplier;

        lineItems.push({
          price_data: {
            currency: 'gbp',
            product_data: {
              name: `${productName}${variantName}`,
              description: item.customization
                ? `Customization: ${JSON.stringify(item.customization)}`
                : undefined,
            },
            // Use VAT-inclusive unit price
            unit_amount: Math.round(unitPriceWithVat * 100),
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

    // Validate all line items have positive amounts
    for (const item of lineItems) {
      const amount = item.price_data?.unit_amount;
      if (!amount || amount <= 0) {
        return checkoutError(
          'Unable to process checkout: one or more items have an invalid price. Please contact support.',
          400,
          `Line item "${item.price_data?.product_data?.name}" has invalid unit_amount: ${amount}`
        );
      }
    }

    // Validate we have at least one line item
    if (lineItems.length === 0) {
      return checkoutError(
        'Unable to process checkout: no items to purchase.',
        400,
        `Order ${orderId} has no valid line items`
      );
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
        allowed_countries: [
          'GB', // United Kingdom
          'IE', // Ireland
          'FR', // France
          'DE', // Germany
          'ES', // Spain
          'IT', // Italy
          'NL', // Netherlands
          'BE', // Belgium
          'AT', // Austria
          'PT', // Portugal
          'SE', // Sweden
          'DK', // Denmark
          'FI', // Finland
          'NO', // Norway
          'CH', // Switzerland
          'PL', // Poland
          'CZ', // Czech Republic
          'GR', // Greece
          'HU', // Hungary
          'RO', // Romania
          'AU', // Australia
          'NZ', // New Zealand
          'CA', // Canada
          'US', // United States
          'JP', // Japan
          'SG', // Singapore
          'HK', // Hong Kong
          'AE', // United Arab Emirates
        ],
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

    // Handle Stripe-specific errors with helpful messages
    if (error instanceof Stripe.errors.StripeError) {
      const stripeError = error as Stripe.errors.StripeError;
      console.error('Stripe error details:', {
        type: stripeError.type,
        code: stripeError.code,
        message: stripeError.message,
      });

      // Map common Stripe errors to user-friendly messages
      switch (stripeError.type) {
        case 'StripeCardError':
          return checkoutError('There was an issue with the payment. Please try again.', 400);
        case 'StripeInvalidRequestError':
          return checkoutError(
            'Unable to process payment. Please try again or contact support.',
            400,
            stripeError.message
          );
        case 'StripeAPIError':
          return checkoutError(
            'Payment service is temporarily unavailable. Please try again in a few moments.',
            503
          );
        case 'StripeConnectionError':
          return checkoutError(
            'Unable to connect to payment service. Please check your connection and try again.',
            503
          );
        case 'StripeAuthenticationError':
          return checkoutError(
            'Payment service configuration error. Please contact support.',
            500,
            'Stripe authentication failed - check API keys'
          );
        default:
          return checkoutError(
            'An error occurred while processing payment. Please try again.',
            500,
            stripeError.message
          );
      }
    }

    // Handle other errors
    if (error instanceof Error) {
      return checkoutError(
        'An unexpected error occurred. Please try again or contact support.',
        500,
        error.message
      );
    }

    return checkoutError('An unexpected error occurred. Please try again.', 500);
  }
}
