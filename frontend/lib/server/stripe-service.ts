/**
 * Stripe Service for Server-side Operations
 *
 * Handles refunds and other server-side Stripe operations
 * Protected by circuit breaker to prevent cascade failures
 */

import Stripe from 'stripe';
import { getCircuitBreaker, CircuitBreakerError } from './circuit-breaker';
import { logger } from './logger';

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

// Circuit breaker for Stripe API calls
const stripeCircuitBreaker = getCircuitBreaker('stripe');

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
 * @param amount - Optional amount in pounds (full refund if not specified)
 * @param idempotencyKey - Optional key to prevent duplicate refunds (recommended: use orderId or resolutionId)
 */
export async function createRefund(
  paymentIntentId: string,
  reason: 'duplicate' | 'fraudulent' | 'requested_by_customer' = 'requested_by_customer',
  amount?: number,
  idempotencyKey?: string
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

    // Use idempotency key to prevent duplicate refunds on retry
    const requestOptions: Stripe.RequestOptions = {};
    if (idempotencyKey) {
      requestOptions.idempotencyKey = `refund_${idempotencyKey}`;
    }

    // Execute with circuit breaker protection
    const refund = await stripeCircuitBreaker.execute(() =>
      stripeClient.refunds.create(refundParams, requestOptions)
    );

    return {
      success: true,
      refundId: refund.id,
      amount: refund.amount / 100, // Convert back to pounds
    };
  } catch (error) {
    // Check if circuit breaker is open
    if (error instanceof CircuitBreakerError) {
      logger.error('Stripe circuit breaker is open', { error: error.message });
      return {
        success: false,
        error: 'Payment service temporarily unavailable. Please try again later.',
      };
    }

    logger.error('Stripe refund error', { error });

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
    return await stripeCircuitBreaker.execute(() =>
      stripeClient.refunds.retrieve(refundId)
    );
  } catch (error) {
    if (error instanceof CircuitBreakerError) {
      logger.error('Stripe circuit breaker is open', { error: error.message });
    } else {
      logger.error('Error retrieving refund', { refundId, error });
    }
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
    return await stripeCircuitBreaker.execute(() =>
      stripeClient.paymentIntents.retrieve(paymentIntentId)
    );
  } catch (error) {
    if (error instanceof CircuitBreakerError) {
      logger.error('Stripe circuit breaker is open', { error: error.message });
    } else {
      logger.error('Error retrieving payment intent', { paymentIntentId, error });
    }
    return null;
  }
}

/**
 * Get a Checkout Session by ID
 */
export async function getCheckoutSession(
  sessionId: string
): Promise<Stripe.Checkout.Session | null> {
  try {
    const stripeClient = getStripe();
    return await stripeCircuitBreaker.execute(() =>
      stripeClient.checkout.sessions.retrieve(sessionId)
    );
  } catch (error) {
    if (error instanceof CircuitBreakerError) {
      logger.error('Stripe circuit breaker is open', { error: error.message });
    } else {
      logger.error('Error retrieving checkout session', { sessionId, error });
    }
    return null;
  }
}

/**
 * Resolve a Stripe payment ID to a Payment Intent ID
 * If given a Checkout Session ID (cs_xxx), retrieves the associated Payment Intent ID
 * If already a Payment Intent ID (pi_xxx), returns it as-is
 * Also returns whether the payment was successful
 */
export async function resolvePaymentIntentId(
  stripePaymentId: string
): Promise<{ paymentIntentId: string | null; isPaid: boolean; error?: string }> {
  try {
    const stripeClient = getStripe();

    // Already a Payment Intent ID
    if (stripePaymentId.startsWith('pi_')) {
      const paymentIntent = await stripeCircuitBreaker.execute(() =>
        stripeClient.paymentIntents.retrieve(stripePaymentId)
      );
      return {
        paymentIntentId: stripePaymentId,
        isPaid: paymentIntent.status === 'succeeded',
      };
    }

    // Checkout Session ID - need to look up the Payment Intent
    if (stripePaymentId.startsWith('cs_')) {
      const session = await stripeCircuitBreaker.execute(() =>
        stripeClient.checkout.sessions.retrieve(stripePaymentId)
      );

      if (!session.payment_intent) {
        return {
          paymentIntentId: null,
          isPaid: false,
          error: 'Checkout session has no payment intent - payment may not have been completed',
        };
      }

      const paymentIntentId = typeof session.payment_intent === 'string'
        ? session.payment_intent
        : session.payment_intent.id;

      return {
        paymentIntentId,
        isPaid: session.payment_status === 'paid',
      };
    }

    return {
      paymentIntentId: null,
      isPaid: false,
      error: `Unknown payment ID format: ${stripePaymentId.substring(0, 10)}...`,
    };
  } catch (error) {
    if (error instanceof CircuitBreakerError) {
      logger.error('Stripe circuit breaker is open', { error: error.message });
      return {
        paymentIntentId: null,
        isPaid: false,
        error: 'Payment service temporarily unavailable. Please try again later.',
      };
    }

    logger.error('Error resolving payment intent ID', { stripePaymentId, error });
    return {
      paymentIntentId: null,
      isPaid: false,
      error: error instanceof Error ? error.message : 'Failed to resolve payment ID',
    };
  }
}
