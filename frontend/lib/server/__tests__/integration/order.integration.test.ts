/**
 * Order Service Integration Tests
 *
 * These tests run against a real database to verify:
 * - Order creation with proper relations
 * - Order status transitions work correctly
 * - Cancellation request flow
 * - Data integrity across related tables
 *
 * Run with: npm test -- --testPathPattern=integration
 */

import { OrderStatus, UserType } from '@prisma/client';
import {
  getTestPrisma,
  disconnectTestPrisma,
  createTestUser,
  createTestCategory,
  createTestProduct,
  cleanupTestUser,
  cleanupTestCategory,
  cleanupTestProduct,
  resetTestCounters,
  TestUser,
} from '../../testing/db-test-utils';
import {
  transitionOrderStatus,
  isValidTransition,
  validateTransition,
  canCustomerRequestCancellation,
  canBeRefunded,
  isTerminalStatus,
} from '../../order-state-machine';

// Skip unless explicitly enabled with RUN_INTEGRATION_TESTS=true
// This prevents accidentally running against production databases
const describeIntegration =
  process.env.RUN_INTEGRATION_TESTS === 'true' ? describe : describe.skip;

describeIntegration('Order Service Integration', () => {
  const prisma = getTestPrisma();
  const createdUserIds: string[] = [];
  const createdCategoryIds: string[] = [];
  const createdProductIds: string[] = [];
  const createdOrderIds: string[] = [];

  let testUser: TestUser;
  let testCategory: { id: string; name: string; slug: string };
  let testProduct: { id: string; name: string; slug: string; basePrice: number };

  beforeAll(async () => {
    await prisma.$connect();

    // Create test user
    testUser = await createTestUser(prisma, {
      email: `order-test-${Date.now()}@example.com`,
    });
    createdUserIds.push(testUser.id);

    // Create test category and product
    testCategory = await createTestCategory(prisma, {
      name: 'Order Test Category',
      slug: `order-test-category-${Date.now()}`,
    });
    createdCategoryIds.push(testCategory.id);

    testProduct = await createTestProduct(prisma, testCategory.id, {
      name: 'Order Test Product',
      slug: `order-test-product-${Date.now()}`,
      basePrice: 29.99,
    });
    createdProductIds.push(testProduct.id);
  });

  afterAll(async () => {
    // Cleanup in reverse order of dependencies
    for (const orderId of createdOrderIds) {
      await prisma.order.delete({ where: { id: orderId } }).catch(() => {});
    }
    for (const productId of createdProductIds) {
      await cleanupTestProduct(prisma, productId);
    }
    for (const categoryId of createdCategoryIds) {
      await cleanupTestCategory(prisma, categoryId);
    }
    for (const userId of createdUserIds) {
      await cleanupTestUser(prisma, userId);
    }
    await disconnectTestPrisma();
  });

  beforeEach(() => {
    resetTestCounters();
  });

  async function createTestOrder(
    userId: string,
    status: OrderStatus = 'pending'
  ): Promise<string> {
    const order = await prisma.order.create({
      data: {
        customerId: userId,
        status,
        totalPrice: 29.99,
        shippingAddress: {
          name: 'Test Customer',
          line1: '123 Test St',
          city: 'London',
          postcode: 'SW1A 1AA',
          country: 'GB',
        },
      },
    });
    createdOrderIds.push(order.id);
    return order.id;
  }

  describe('Order Creation', () => {
    it('should create an order in pending status', async () => {
      const orderId = await createTestOrder(testUser.id);

      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { customer: true },
      });

      expect(order).not.toBeNull();
      expect(order?.status).toBe('pending');
      expect(order?.customerId).toBe(testUser.id);
      expect(order?.customer.email).toBe(testUser.email);
    });

    it('should create order with items', async () => {
      const order = await prisma.order.create({
        data: {
          customerId: testUser.id,
          status: 'pending',
          totalPrice: 59.98,
          shippingAddress: {
            name: 'Test Customer',
            line1: '123 Test St',
            city: 'London',
            postcode: 'SW1A 1AA',
            country: 'GB',
          },
          items: {
            create: [
              {
                productId: testProduct.id,
                quantity: 2,
                unitPrice: 29.99,
                totalPrice: 59.98,
              },
            ],
          },
        },
        include: { items: true },
      });
      createdOrderIds.push(order.id);

      expect(order.items.length).toBe(1);
      expect(order.items[0].quantity).toBe(2);
      expect(Number(order.items[0].unitPrice)).toBe(29.99);
    });

    it('should enforce foreign key on customer', async () => {
      await expect(
        prisma.order.create({
          data: {
            customerId: '00000000-0000-0000-0000-000000000000', // Non-existent user
            status: 'pending',
            totalPrice: 29.99,
            shippingAddress: {},
          },
        })
      ).rejects.toThrow();
    });
  });

  describe('Order Status Transitions', () => {
    it('should transition from pending to payment_confirmed', async () => {
      const orderId = await createTestOrder(testUser.id, 'pending');

      const result = await transitionOrderStatus(orderId, 'payment_confirmed');

      expect(result.success).toBe(true);
      expect(result.previousStatus).toBe('pending');
      expect(result.newStatus).toBe('payment_confirmed');

      // Verify in DB
      const order = await prisma.order.findUnique({ where: { id: orderId } });
      expect(order?.status).toBe('payment_confirmed');
    });

    it('should transition through happy path: pending -> payment_confirmed -> confirmed -> printing -> shipped -> delivered', async () => {
      const orderId = await createTestOrder(testUser.id, 'pending');

      const transitions: OrderStatus[] = [
        'payment_confirmed',
        'confirmed',
        'printing',
        'shipped',
        'delivered',
      ];

      for (const newStatus of transitions) {
        const result = await transitionOrderStatus(orderId, newStatus);
        expect(result.success).toBe(true);
        expect(result.newStatus).toBe(newStatus);
      }

      // Verify final state
      const order = await prisma.order.findUnique({ where: { id: orderId } });
      expect(order?.status).toBe('delivered');
    });

    it('should reject invalid transition', async () => {
      const orderId = await createTestOrder(testUser.id, 'pending');

      // Can't go directly from pending to shipped
      const result = await transitionOrderStatus(orderId, 'shipped');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Cannot transition');
    });

    it('should reject transition from terminal status', async () => {
      const orderId = await createTestOrder(testUser.id, 'cancelled');

      const result = await transitionOrderStatus(orderId, 'pending');

      expect(result.success).toBe(false);
      expect(result.error).toContain('terminal state');
    });

    it('should allow force transition', async () => {
      const orderId = await createTestOrder(testUser.id, 'pending');

      // Force an invalid transition
      const result = await transitionOrderStatus(orderId, 'shipped', { force: true });

      expect(result.success).toBe(true);
      expect(result.newStatus).toBe('shipped');
    });

    it('should handle concurrent status updates safely', async () => {
      const orderId = await createTestOrder(testUser.id, 'pending');

      // Simulate concurrent transitions
      const promises = [
        transitionOrderStatus(orderId, 'payment_confirmed'),
        transitionOrderStatus(orderId, 'cancelled'),
      ];

      const results = await Promise.all(promises);

      // At least one should succeed
      const successes = results.filter((r) => r.success);
      expect(successes.length).toBeGreaterThanOrEqual(1);

      // Final state should be consistent
      const order = await prisma.order.findUnique({ where: { id: orderId } });
      expect(['payment_confirmed', 'cancelled']).toContain(order?.status);
    });
  });

  describe('Order Cancellation', () => {
    it('should allow cancellation from pending status', async () => {
      const orderId = await createTestOrder(testUser.id, 'pending');

      expect(canCustomerRequestCancellation('pending')).toBe(true);

      const result = await transitionOrderStatus(orderId, 'cancelled');
      expect(result.success).toBe(true);

      const order = await prisma.order.findUnique({ where: { id: orderId } });
      expect(order?.status).toBe('cancelled');
    });

    it('should create cancellation request for confirmed orders', async () => {
      const orderId = await createTestOrder(testUser.id, 'confirmed');

      // Create cancellation request
      await prisma.cancellationRequest.create({
        data: {
          orderId,
          reason: 'changed_mind',
          notes: 'No longer need this item',
          previousStatus: 'confirmed',
        },
      });

      // Transition to cancellation_requested
      const result = await transitionOrderStatus(orderId, 'cancellation_requested');
      expect(result.success).toBe(true);

      // Verify request exists
      const request = await prisma.cancellationRequest.findUnique({
        where: { orderId },
      });
      expect(request).not.toBeNull();
      expect(request?.reason).toBe('changed_mind');
    });

    it('should restore previous status when cancellation is rejected', async () => {
      const orderId = await createTestOrder(testUser.id, 'confirmed');

      // Create request and transition
      await prisma.cancellationRequest.create({
        data: {
          orderId,
          reason: 'changed_mind',
          previousStatus: 'confirmed',
        },
      });

      await transitionOrderStatus(orderId, 'cancellation_requested');

      // Reject cancellation - restore to confirmed
      const result = await transitionOrderStatus(orderId, 'confirmed');
      expect(result.success).toBe(true);

      const order = await prisma.order.findUnique({ where: { id: orderId } });
      expect(order?.status).toBe('confirmed');
    });
  });

  describe('Order Refunds', () => {
    it('should allow refund for payment_confirmed orders', async () => {
      const orderId = await createTestOrder(testUser.id, 'payment_confirmed');

      expect(canBeRefunded('payment_confirmed')).toBe(true);

      const result = await transitionOrderStatus(orderId, 'refunded');
      expect(result.success).toBe(true);

      const order = await prisma.order.findUnique({ where: { id: orderId } });
      expect(order?.status).toBe('refunded');
      expect(isTerminalStatus(order?.status as OrderStatus)).toBe(true);
    });

    it('should allow refund for delivered orders', async () => {
      const orderId = await createTestOrder(testUser.id, 'delivered');

      expect(canBeRefunded('delivered')).toBe(true);

      const result = await transitionOrderStatus(orderId, 'refunded');
      expect(result.success).toBe(true);
    });

    it('should not allow refund for pending orders', async () => {
      expect(canBeRefunded('pending')).toBe(false);
    });
  });

  describe('Data Integrity', () => {
    it('should cascade delete order items when order is deleted', async () => {
      // Create order with items
      const order = await prisma.order.create({
        data: {
          customerId: testUser.id,
          status: 'pending',
          totalPrice: 29.99,
          shippingAddress: {},
          items: {
            create: [
              {
                productId: testProduct.id,
                quantity: 1,
                unitPrice: 29.99,
                totalPrice: 29.99,
              },
            ],
          },
        },
        include: { items: true },
      });

      const itemId = order.items[0].id;

      // Delete order
      await prisma.order.delete({ where: { id: order.id } });

      // Items should be deleted
      const item = await prisma.orderItem.findUnique({ where: { id: itemId } });
      expect(item).toBeNull();
    });

    it('should not allow order creation with invalid product reference', async () => {
      const order = await prisma.order.create({
        data: {
          customerId: testUser.id,
          status: 'pending',
          totalPrice: 29.99,
          shippingAddress: {},
        },
      });
      createdOrderIds.push(order.id);

      await expect(
        prisma.orderItem.create({
          data: {
            orderId: order.id,
            productId: '00000000-0000-0000-0000-000000000000', // Non-existent
            quantity: 1,
            unitPrice: 29.99,
            totalPrice: 29.99,
          },
        })
      ).rejects.toThrow();
    });

    it('should maintain order history with timestamps', async () => {
      const orderId = await createTestOrder(testUser.id, 'pending');

      const beforeUpdate = await prisma.order.findUnique({ where: { id: orderId } });
      const originalUpdatedAt = beforeUpdate?.updatedAt;

      // Wait a bit to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Update status
      await transitionOrderStatus(orderId, 'payment_confirmed');

      const afterUpdate = await prisma.order.findUnique({ where: { id: orderId } });

      expect(afterUpdate?.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt!.getTime());
    });
  });
});
