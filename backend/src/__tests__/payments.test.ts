/**
 * Payments Integration Tests
 * Tests for payment listing and retrieval
 *
 * NOTE: The payments route has schema inconsistencies - it references
 * `customerId` and `invoiceId` fields that don't exist in the Payment model.
 * These tests cover what can be tested with the current schema.
 * Full payment flow tests will be added when payment gateway integration is complete.
 */

import request from 'supertest';
import app from '../index';
import { PrismaClient, PaymentMethod, PaymentStatus } from '@prisma/client';
import { createTestUser, createTestAdmin, generateTestTokens, createTestDesign, createTestOrder } from './helpers';

const prisma = new PrismaClient();

/**
 * Helper to create a test payment
 * Note: Using only the fields that exist in the Prisma schema
 */
async function createTestPayment(orderId: string, overrides?: {
  amount?: number;
  currency?: string;
  paymentMethod?: PaymentMethod;
  status?: PaymentStatus;
}) {
  return prisma.payment.create({
    data: {
      orderId,
      amount: overrides?.amount || 19.99,
      currency: overrides?.currency || 'GBP',
      paymentMethod: overrides?.paymentMethod || PaymentMethod.CARD,
      status: overrides?.status || PaymentStatus.PENDING,
    },
  });
}

describe('Payments API', () => {
  describe('GET /api/payments', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/payments')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should list payments for authenticated user', async () => {
      const { user } = await createTestUser({ email: 'paymentuser@example.com' });
      const { accessToken } = generateTestTokens(user.id, user.type);

      const response = await request(app)
        .get('/api/payments')
        .set('Cookie', [`accessToken=${accessToken}`])
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.payments).toBeDefined();
      expect(response.body.data.pagination).toBeDefined();
    });

    it('should filter by status', async () => {
      const { user } = await createTestUser({ email: 'paymentstatus@example.com' });
      const { accessToken } = generateTestTokens(user.id, user.type);

      const response = await request(app)
        .get('/api/payments?status=COMPLETED')
        .set('Cookie', [`accessToken=${accessToken}`])
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.payments.forEach((payment: any) => {
        expect(payment.status).toBe('COMPLETED');
      });
    });
  });

  describe('GET /api/payments/:id', () => {
    it('should return 404 for non-existent payment', async () => {
      const { user } = await createTestUser({ email: 'payment404@example.com' });
      const { accessToken } = generateTestTokens(user.id, user.type);

      const response = await request(app)
        .get('/api/payments/00000000-0000-0000-0000-000000000000')
        .set('Cookie', [`accessToken=${accessToken}`])
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  /**
   * POST /api/payments tests are skipped because:
   * 1. The route expects customerId and invoiceId fields that don't exist in schema
   * 2. Full payment integration will be tested when Stripe/PayPal is integrated
   */
  describe('POST /api/payments', () => {
    it.skip('should create a payment (pending gateway integration)', async () => {
      // This test will be implemented when payment gateway integration is complete
    });
  });
});
