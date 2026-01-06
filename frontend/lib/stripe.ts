import { loadStripe } from '@stripe/stripe-js';
import type { Stripe } from '@stripe/stripe-js';
import { createLogger } from '@/lib/logger';

const logger = createLogger('stripe');

let stripePromise: Promise<Stripe | null>;

/**
 * Get the Stripe instance for client-side usage
 */
export function getStripe() {
  if (!stripePromise) {
    const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    if (!key) {
      logger.error('Missing NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY');
      return Promise.resolve(null);
    }
    stripePromise = loadStripe(key);
  }
  return stripePromise;
}

/**
 * Redirect to Stripe Checkout
 * Uses the Checkout Session URL provided by the API
 */
export function redirectToCheckout(url: string) {
  window.location.href = url;
}
