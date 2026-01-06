// Mock Stripe before any imports
const mockRefundsCreate = jest.fn();
const mockRefundsRetrieve = jest.fn();
const mockPaymentIntentsRetrieve = jest.fn();
const mockCheckoutSessionsRetrieve = jest.fn();

jest.mock('stripe', () => {
  // Define StripeError inside the mock factory
  class StripeError extends Error {
    type: string;
    constructor(message: string, type: string = 'StripeError') {
      super(message);
      this.type = type;
      this.name = 'StripeError';
    }
  }

  const MockStripe = function() {
    return {
      refunds: {
        create: mockRefundsCreate,
        retrieve: mockRefundsRetrieve,
      },
      paymentIntents: {
        retrieve: mockPaymentIntentsRetrieve,
      },
      checkout: {
        sessions: {
          retrieve: mockCheckoutSessionsRetrieve,
        },
      },
    };
  };
  MockStripe.errors = {
    StripeError: StripeError,
  };
  return MockStripe;
});

// Set env before importing service
process.env.STRIPE_SECRET_KEY = 'sk_test_mock_key';

import Stripe from 'stripe';
import {
  createRefund,
  getRefund,
  getPaymentIntent,
  getCheckoutSession,
  resolvePaymentIntentId,
} from '../stripe-service';

describe('Stripe Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createRefund', () => {
    it('should create a full refund successfully', async () => {
      const mockRefund = {
        id: 're_test_123',
        amount: 2500,
        status: 'succeeded',
      };
      mockRefundsCreate.mockResolvedValue(mockRefund);

      const result = await createRefund('pi_test_payment_intent');

      expect(result.success).toBe(true);
      expect(result.refundId).toBe('re_test_123');
      expect(result.amount).toBe(25); // Converted from pence to pounds
      expect(mockRefundsCreate).toHaveBeenCalledWith(
        {
          payment_intent: 'pi_test_payment_intent',
          reason: 'requested_by_customer',
        },
        {}
      );
    });

    it('should create a partial refund with specified amount', async () => {
      const mockRefund = {
        id: 're_test_456',
        amount: 1000,
        status: 'succeeded',
      };
      mockRefundsCreate.mockResolvedValue(mockRefund);

      const result = await createRefund('pi_test_payment_intent', 'requested_by_customer', 10);

      expect(result.success).toBe(true);
      expect(result.refundId).toBe('re_test_456');
      expect(result.amount).toBe(10);
      expect(mockRefundsCreate).toHaveBeenCalledWith(
        {
          payment_intent: 'pi_test_payment_intent',
          reason: 'requested_by_customer',
          amount: 1000, // 10 pounds in pence
        },
        {}
      );
    });

    it('should use idempotency key when provided', async () => {
      const mockRefund = {
        id: 're_test_789',
        amount: 5000,
        status: 'succeeded',
      };
      mockRefundsCreate.mockResolvedValue(mockRefund);

      await createRefund('pi_test_payment_intent', 'duplicate', undefined, 'order_123');

      expect(mockRefundsCreate).toHaveBeenCalledWith(
        {
          payment_intent: 'pi_test_payment_intent',
          reason: 'duplicate',
        },
        { idempotencyKey: 'refund_order_123' }
      );
    });

    it('should handle Stripe errors gracefully', async () => {
      // Use the mocked Stripe.errors.StripeError
      const StripeModule = Stripe as unknown as { errors: { StripeError: new (msg: string) => Error } };
      const stripeError = new StripeModule.errors.StripeError('Card has insufficient funds');
      mockRefundsCreate.mockRejectedValue(stripeError);

      const result = await createRefund('pi_test_payment_intent');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Card has insufficient funds');
    });

    it('should handle non-Stripe errors', async () => {
      mockRefundsCreate.mockRejectedValue(new Error('Network timeout'));

      const result = await createRefund('pi_test_payment_intent');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network timeout');
    });
  });

  describe('getRefund', () => {
    it('should retrieve a refund successfully', async () => {
      const mockRefund = {
        id: 're_test_123',
        amount: 2500,
        status: 'succeeded',
      };
      mockRefundsRetrieve.mockResolvedValue(mockRefund);

      const result = await getRefund('re_test_123');

      expect(result).toEqual(mockRefund);
      expect(mockRefundsRetrieve).toHaveBeenCalledWith('re_test_123');
    });

    it('should return null on error', async () => {
      mockRefundsRetrieve.mockRejectedValue(new Error('Not found'));

      const result = await getRefund('re_invalid');

      expect(result).toBeNull();
    });
  });

  describe('getPaymentIntent', () => {
    it('should retrieve a payment intent successfully', async () => {
      const mockPaymentIntent = {
        id: 'pi_test_123',
        amount: 5000,
        status: 'succeeded',
      };
      mockPaymentIntentsRetrieve.mockResolvedValue(mockPaymentIntent);

      const result = await getPaymentIntent('pi_test_123');

      expect(result).toEqual(mockPaymentIntent);
      expect(mockPaymentIntentsRetrieve).toHaveBeenCalledWith('pi_test_123');
    });

    it('should return null on error', async () => {
      mockPaymentIntentsRetrieve.mockRejectedValue(new Error('Not found'));

      const result = await getPaymentIntent('pi_invalid');

      expect(result).toBeNull();
    });
  });

  describe('getCheckoutSession', () => {
    it('should retrieve a checkout session successfully', async () => {
      const mockSession = {
        id: 'cs_test_123',
        payment_status: 'paid',
        payment_intent: 'pi_test_456',
      };
      mockCheckoutSessionsRetrieve.mockResolvedValue(mockSession);

      const result = await getCheckoutSession('cs_test_123');

      expect(result).toEqual(mockSession);
      expect(mockCheckoutSessionsRetrieve).toHaveBeenCalledWith('cs_test_123');
    });

    it('should return null on error', async () => {
      mockCheckoutSessionsRetrieve.mockRejectedValue(new Error('Not found'));

      const result = await getCheckoutSession('cs_invalid');

      expect(result).toBeNull();
    });
  });

  describe('resolvePaymentIntentId', () => {
    it('should return payment intent directly if already a pi_ ID', async () => {
      const mockPaymentIntent = {
        id: 'pi_test_123',
        status: 'succeeded',
      };
      mockPaymentIntentsRetrieve.mockResolvedValue(mockPaymentIntent);

      const result = await resolvePaymentIntentId('pi_test_123');

      expect(result.paymentIntentId).toBe('pi_test_123');
      expect(result.isPaid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should resolve checkout session to payment intent', async () => {
      const mockSession = {
        id: 'cs_test_123',
        payment_status: 'paid',
        payment_intent: 'pi_resolved_456',
      };
      mockCheckoutSessionsRetrieve.mockResolvedValue(mockSession);

      const result = await resolvePaymentIntentId('cs_test_123');

      expect(result.paymentIntentId).toBe('pi_resolved_456');
      expect(result.isPaid).toBe(true);
    });

    it('should handle checkout session with payment intent object', async () => {
      const mockSession = {
        id: 'cs_test_123',
        payment_status: 'paid',
        payment_intent: { id: 'pi_object_789' },
      };
      mockCheckoutSessionsRetrieve.mockResolvedValue(mockSession);

      const result = await resolvePaymentIntentId('cs_test_123');

      expect(result.paymentIntentId).toBe('pi_object_789');
      expect(result.isPaid).toBe(true);
    });

    it('should return error for checkout session without payment intent', async () => {
      const mockSession = {
        id: 'cs_test_123',
        payment_status: 'unpaid',
        payment_intent: null,
      };
      mockCheckoutSessionsRetrieve.mockResolvedValue(mockSession);

      const result = await resolvePaymentIntentId('cs_test_123');

      expect(result.paymentIntentId).toBeNull();
      expect(result.isPaid).toBe(false);
      expect(result.error).toContain('no payment intent');
    });

    it('should return error for unknown payment ID format', async () => {
      const result = await resolvePaymentIntentId('unknown_format_123');

      expect(result.paymentIntentId).toBeNull();
      expect(result.isPaid).toBe(false);
      expect(result.error).toContain('Unknown payment ID format');
    });

    it('should handle API errors gracefully', async () => {
      mockPaymentIntentsRetrieve.mockRejectedValue(new Error('API down'));

      const result = await resolvePaymentIntentId('pi_test_123');

      expect(result.paymentIntentId).toBeNull();
      expect(result.isPaid).toBe(false);
      expect(result.error).toBe('API down');
    });
  });
});
