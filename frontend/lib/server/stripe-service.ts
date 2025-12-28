/**
 * Stripe Service for Server-side Operations
 *
 * Handles refunds and other server-side Stripe operations
 */

import Stripe from 'stripe';

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

export interface RefundResult {
  success: boolean;
  refundId?: string;
  amount?: number;
  error?: string;
}

/**
 * Create a refund for a payment intent
 *
 * @param paymentIntentId - The Stripe payment intent ID
 * @param reason - The reason for the refund
 * @param amount - Optional amount in pence (full refund if not specified)
 */
export async function createRefund(
  paymentIntentId: string,
  reason: 'duplicate' | 'fraudulent' | 'requested_by_customer' = 'requested_by_customer',
  amount?: number
): Promise<RefundResult> {
  try {
    const stripeClient = getStripe();

    const refundParams: Stripe.RefundCreateParams = {
      payment_intent: paymentIntentId,
      reason,
    };

    // If amount specified, do partial refund (amount in pence)
    if (amount !== undefined) {
      refundParams.amount = Math.round(amount * 100);
    }

    const refund = await stripeClient.refunds.create(refundParams);

    return {
      success: true,
      refundId: refund.id,
      amount: refund.amount / 100, // Convert back to pounds
    };
  } catch (error) {
    console.error('Stripe refund error:', error);

    if (error instanceof Stripe.errors.StripeError) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error creating refund',
    };
  }
}

/**
 * Get a refund by ID
 */
export async function getRefund(refundId: string): Promise<Stripe.Refund | null> {
  try {
    const stripeClient = getStripe();
    return await stripeClient.refunds.retrieve(refundId);
  } catch (error) {
    console.error('Error retrieving refund:', error);
    return null;
  }
}

/**
 * Get the payment intent for an order
 */
export async function getPaymentIntent(
  paymentIntentId: string
): Promise<Stripe.PaymentIntent | null> {
  try {
    const stripeClient = getStripe();
    return await stripeClient.paymentIntents.retrieve(paymentIntentId);
  } catch (error) {
    console.error('Error retrieving payment intent:', error);
    return null;
  }
}
