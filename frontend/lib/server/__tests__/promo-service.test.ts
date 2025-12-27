import { mockDeep, mockReset, DeepMockProxy } from 'jest-mock-extended';
import { PrismaClient, Promo, DiscountType, PromoScope } from '@prisma/client';

// Must be declared before jest.mock due to hoisting
const prismaMock = mockDeep<PrismaClient>() as DeepMockProxy<PrismaClient>;

// Mock prisma - use getter to avoid hoisting issues
jest.mock('@/lib/prisma', () => ({
  get prisma() {
    return prismaMock;
  },
}));

import {
  validatePromoCode,
  recordPromoUsage,
  ensureWelcome10Promo,
  PromoValidationResult,
  CartItem,
} from '../promo-service';

describe('Promo Service', () => {
  beforeEach(() => {
    mockReset(prismaMock);
    jest.clearAllMocks();
  });

  // Helper to create a mock promo
  const createMockPromo = (overrides: Partial<Promo> = {}): Promo => ({
    id: 'promo-123',
    code: 'TESTCODE',
    name: 'Test Promo',
    description: 'A test promo',
    discountType: 'PERCENTAGE' as DiscountType,
    discountValue: 10 as unknown as import('@prisma/client/runtime/library').Decimal,
    scope: 'ALL_PRODUCTS' as PromoScope,
    categoryId: null,
    subcategoryId: null,
    productIds: [],
    minOrderAmount: null,
    maxUses: null,
    maxUsesPerUser: 1,
    currentUses: 0,
    startsAt: null,
    expiresAt: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  describe('validatePromoCode', () => {
    describe('Basic validation', () => {
      it('should return invalid for non-existent promo code', async () => {
        prismaMock.promo.findUnique.mockResolvedValue(null);

        const result = await validatePromoCode('INVALID', { cartTotal: 100 });

        expect(result.valid).toBe(false);
        expect(result.error).toBe('Invalid promo code');
      });

      it('should return valid for a valid promo code', async () => {
        const promo = createMockPromo();
        prismaMock.promo.findUnique.mockResolvedValue(promo);

        const result = await validatePromoCode('TESTCODE', { cartTotal: 100 });

        expect(result.valid).toBe(true);
        expect(result.discountAmount).toBe(10); // 10% of 100
        expect(result.promo).toEqual(promo);
      });

      it('should handle case-insensitive promo codes', async () => {
        const promo = createMockPromo({ code: 'WELCOME10' });
        prismaMock.promo.findUnique.mockResolvedValue(promo);

        const result = await validatePromoCode('welcome10', { cartTotal: 100 });

        expect(result.valid).toBe(true);
        expect(prismaMock.promo.findUnique).toHaveBeenCalledWith({
          where: { code: 'WELCOME10' },
        });
      });
    });

    describe('Active status checks', () => {
      it('should return invalid for inactive promo', async () => {
        const promo = createMockPromo({ isActive: false });
        prismaMock.promo.findUnique.mockResolvedValue(promo);

        const result = await validatePromoCode('TESTCODE', { cartTotal: 100 });

        expect(result.valid).toBe(false);
        expect(result.error).toBe('This promo code is no longer active');
      });
    });

    describe('Date range checks', () => {
      it('should return invalid for promo that has not started yet', async () => {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 7); // 7 days from now

        const promo = createMockPromo({ startsAt: futureDate });
        prismaMock.promo.findUnique.mockResolvedValue(promo);

        const result = await validatePromoCode('TESTCODE', { cartTotal: 100 });

        expect(result.valid).toBe(false);
        expect(result.error).toBe('This promo code is not yet active');
      });

      it('should return invalid for expired promo', async () => {
        const pastDate = new Date();
        pastDate.setDate(pastDate.getDate() - 7); // 7 days ago

        const promo = createMockPromo({ expiresAt: pastDate });
        prismaMock.promo.findUnique.mockResolvedValue(promo);

        const result = await validatePromoCode('TESTCODE', { cartTotal: 100 });

        expect(result.valid).toBe(false);
        expect(result.error).toBe('This promo code has expired');
      });

      it('should return valid for promo within date range', async () => {
        const pastDate = new Date();
        pastDate.setDate(pastDate.getDate() - 7); // started 7 days ago
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 7); // expires in 7 days

        const promo = createMockPromo({
          startsAt: pastDate,
          expiresAt: futureDate,
        });
        prismaMock.promo.findUnique.mockResolvedValue(promo);

        const result = await validatePromoCode('TESTCODE', { cartTotal: 100 });

        expect(result.valid).toBe(true);
      });
    });

    describe('Usage limit checks', () => {
      it('should return invalid when total usage limit reached', async () => {
        const promo = createMockPromo({
          maxUses: 100,
          currentUses: 100,
        });
        prismaMock.promo.findUnique.mockResolvedValue(promo);

        const result = await validatePromoCode('TESTCODE', { cartTotal: 100 });

        expect(result.valid).toBe(false);
        expect(result.error).toBe('This promo code has reached its usage limit');
      });

      it('should return valid when usage is under limit', async () => {
        const promo = createMockPromo({
          maxUses: 100,
          currentUses: 50,
        });
        prismaMock.promo.findUnique.mockResolvedValue(promo);

        const result = await validatePromoCode('TESTCODE', { cartTotal: 100 });

        expect(result.valid).toBe(true);
      });
    });

    describe('Per-user usage limit checks', () => {
      it('should return invalid when user has already used the promo', async () => {
        const promo = createMockPromo({ maxUsesPerUser: 1 });
        prismaMock.promo.findUnique.mockResolvedValue(promo);
        prismaMock.promoUsage.count.mockResolvedValue(1); // User has used it once

        const result = await validatePromoCode('TESTCODE', {
          userId: 'user-123',
          cartTotal: 100,
        });

        expect(result.valid).toBe(false);
        expect(result.error).toBe('You have already used this promo code');
      });

      it('should check usage by email when userId not provided', async () => {
        const promo = createMockPromo({ maxUsesPerUser: 1 });
        prismaMock.promo.findUnique.mockResolvedValue(promo);
        prismaMock.promoUsage.count.mockResolvedValue(1);

        const result = await validatePromoCode('TESTCODE', {
          email: 'test@example.com',
          cartTotal: 100,
        });

        expect(result.valid).toBe(false);
        expect(result.error).toBe('You have already used this promo code');
        expect(prismaMock.promoUsage.count).toHaveBeenCalledWith({
          where: {
            promoId: 'promo-123',
            OR: [{ email: 'test@example.com' }],
          },
        });
      });

      it('should allow multiple uses when maxUsesPerUser is higher', async () => {
        const promo = createMockPromo({ maxUsesPerUser: 3 });
        prismaMock.promo.findUnique.mockResolvedValue(promo);
        prismaMock.promoUsage.count.mockResolvedValue(2); // User has used 2 of 3

        const result = await validatePromoCode('TESTCODE', {
          userId: 'user-123',
          cartTotal: 100,
        });

        expect(result.valid).toBe(true);
      });

      it('should skip per-user check when no userId or email provided', async () => {
        const promo = createMockPromo({ maxUsesPerUser: 1 });
        prismaMock.promo.findUnique.mockResolvedValue(promo);

        const result = await validatePromoCode('TESTCODE', { cartTotal: 100 });

        expect(result.valid).toBe(true);
        expect(prismaMock.promoUsage.count).not.toHaveBeenCalled();
      });
    });

    describe('Minimum order amount checks', () => {
      it('should return invalid when cart total is below minimum', async () => {
        const promo = createMockPromo({
          minOrderAmount: 50 as unknown as import('@prisma/client/runtime/library').Decimal,
        });
        prismaMock.promo.findUnique.mockResolvedValue(promo);

        const result = await validatePromoCode('TESTCODE', { cartTotal: 30 });

        expect(result.valid).toBe(false);
        expect(result.error).toBe('Minimum order amount of £50.00 required');
      });

      it('should return valid when cart total meets minimum', async () => {
        const promo = createMockPromo({
          minOrderAmount: 50 as unknown as import('@prisma/client/runtime/library').Decimal,
        });
        prismaMock.promo.findUnique.mockResolvedValue(promo);

        const result = await validatePromoCode('TESTCODE', { cartTotal: 75 });

        expect(result.valid).toBe(true);
      });
    });

    describe('Discount calculation - Percentage', () => {
      it('should calculate percentage discount correctly', async () => {
        const promo = createMockPromo({
          discountType: 'PERCENTAGE' as DiscountType,
          discountValue: 15 as unknown as import('@prisma/client/runtime/library').Decimal,
        });
        prismaMock.promo.findUnique.mockResolvedValue(promo);

        const result = await validatePromoCode('TESTCODE', { cartTotal: 100 });

        expect(result.valid).toBe(true);
        expect(result.discountAmount).toBe(15); // 15% of 100
        expect(result.discountPercentage).toBe(15);
      });

      it('should round discount to 2 decimal places', async () => {
        const promo = createMockPromo({
          discountType: 'PERCENTAGE' as DiscountType,
          discountValue: 15 as unknown as import('@prisma/client/runtime/library').Decimal,
        });
        prismaMock.promo.findUnique.mockResolvedValue(promo);

        const result = await validatePromoCode('TESTCODE', { cartTotal: 33.33 });

        expect(result.valid).toBe(true);
        expect(result.discountAmount).toBe(5); // 15% of 33.33 = 4.9995, rounded to 5
      });
    });

    describe('Discount calculation - Fixed amount', () => {
      it('should calculate fixed discount correctly', async () => {
        const promo = createMockPromo({
          discountType: 'FIXED' as DiscountType,
          discountValue: 25 as unknown as import('@prisma/client/runtime/library').Decimal,
        });
        prismaMock.promo.findUnique.mockResolvedValue(promo);

        const result = await validatePromoCode('TESTCODE', { cartTotal: 100 });

        expect(result.valid).toBe(true);
        expect(result.discountAmount).toBe(25);
        expect(result.discountPercentage).toBeUndefined();
      });

      it('should not exceed cart total for fixed discount', async () => {
        const promo = createMockPromo({
          discountType: 'FIXED' as DiscountType,
          discountValue: 50 as unknown as import('@prisma/client/runtime/library').Decimal,
        });
        prismaMock.promo.findUnique.mockResolvedValue(promo);

        const result = await validatePromoCode('TESTCODE', { cartTotal: 30 });

        expect(result.valid).toBe(true);
        expect(result.discountAmount).toBe(30); // Capped at cart total
      });
    });

    describe('Scope-based discounts', () => {
      const cartItems: CartItem[] = [
        { productId: 'prod-1', categoryId: 'cat-1', subcategoryId: 'sub-1', price: 50, quantity: 1 },
        { productId: 'prod-2', categoryId: 'cat-2', subcategoryId: 'sub-2', price: 30, quantity: 2 },
        { productId: 'prod-3', categoryId: 'cat-1', subcategoryId: 'sub-3', price: 20, quantity: 1 },
      ];

      it('should apply discount to all products', async () => {
        const promo = createMockPromo({
          scope: 'ALL_PRODUCTS' as PromoScope,
          discountValue: 10 as unknown as import('@prisma/client/runtime/library').Decimal,
        });
        prismaMock.promo.findUnique.mockResolvedValue(promo);

        // Cart total: 50 + (30*2) + 20 = 130
        const result = await validatePromoCode('TESTCODE', {
          cartItems,
          cartTotal: 130,
        });

        expect(result.valid).toBe(true);
        expect(result.discountAmount).toBe(13); // 10% of 130
      });

      it('should apply discount only to specific category', async () => {
        const promo = createMockPromo({
          scope: 'CATEGORY' as PromoScope,
          categoryId: 'cat-1',
          discountValue: 20 as unknown as import('@prisma/client/runtime/library').Decimal,
        });
        prismaMock.promo.findUnique.mockResolvedValue(promo);

        const result = await validatePromoCode('TESTCODE', {
          cartItems,
          cartTotal: 130,
        });

        expect(result.valid).toBe(true);
        // Category cat-1 items: prod-1 (50) + prod-3 (20) = 70
        expect(result.discountAmount).toBe(14); // 20% of 70
      });

      it('should apply discount only to specific subcategory', async () => {
        const promo = createMockPromo({
          scope: 'SUBCATEGORY' as PromoScope,
          subcategoryId: 'sub-2',
          discountValue: 10 as unknown as import('@prisma/client/runtime/library').Decimal,
        });
        prismaMock.promo.findUnique.mockResolvedValue(promo);

        const result = await validatePromoCode('TESTCODE', {
          cartItems,
          cartTotal: 130,
        });

        expect(result.valid).toBe(true);
        // Subcategory sub-2 items: prod-2 (30*2) = 60
        expect(result.discountAmount).toBe(6); // 10% of 60
      });

      it('should apply discount only to specific products', async () => {
        const promo = createMockPromo({
          scope: 'SPECIFIC_PRODUCTS' as PromoScope,
          productIds: ['prod-1', 'prod-3'],
          discountValue: 10 as unknown as import('@prisma/client/runtime/library').Decimal,
        });
        prismaMock.promo.findUnique.mockResolvedValue(promo);

        const result = await validatePromoCode('TESTCODE', {
          cartItems,
          cartTotal: 130,
        });

        expect(result.valid).toBe(true);
        // Specific products: prod-1 (50) + prod-3 (20) = 70
        expect(result.discountAmount).toBe(7); // 10% of 70
      });

      it('should return invalid when no eligible items in cart', async () => {
        const promo = createMockPromo({
          scope: 'CATEGORY' as PromoScope,
          categoryId: 'cat-nonexistent',
          discountValue: 10 as unknown as import('@prisma/client/runtime/library').Decimal,
        });
        prismaMock.promo.findUnique.mockResolvedValue(promo);

        const result = await validatePromoCode('TESTCODE', {
          cartItems,
          cartTotal: 130,
        });

        expect(result.valid).toBe(false);
        expect(result.error).toBe('No eligible items in cart for this promo');
      });
    });
  });

  describe('recordPromoUsage', () => {
    it('should record usage and increment counter', async () => {
      const promo = createMockPromo();
      prismaMock.promo.findUnique.mockResolvedValue(promo);
      prismaMock.$transaction.mockResolvedValue([{}, {}]);

      const result = await recordPromoUsage('TESTCODE', {
        userId: 'user-123',
        email: 'test@example.com',
        orderId: 'order-456',
        discountAmount: 15.50,
      });

      expect(result).toBe(true);
      expect(prismaMock.$transaction).toHaveBeenCalled();
    });

    it('should return false for non-existent promo', async () => {
      prismaMock.promo.findUnique.mockResolvedValue(null);

      const result = await recordPromoUsage('INVALID', {
        discountAmount: 10,
      });

      expect(result).toBe(false);
      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });

    it('should return false and handle errors gracefully', async () => {
      const promo = createMockPromo();
      prismaMock.promo.findUnique.mockResolvedValue(promo);
      prismaMock.$transaction.mockRejectedValue(new Error('Database error'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await recordPromoUsage('TESTCODE', {
        discountAmount: 10,
      });

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should lowercase email when recording usage', async () => {
      const promo = createMockPromo();
      prismaMock.promo.findUnique.mockResolvedValue(promo);
      prismaMock.$transaction.mockResolvedValue([{}, {}]);

      await recordPromoUsage('TESTCODE', {
        email: 'TEST@EXAMPLE.COM',
        discountAmount: 10,
      });

      // The transaction should have been called with lowercase email
      expect(prismaMock.$transaction).toHaveBeenCalled();
    });
  });

  describe('ensureWelcome10Promo', () => {
    it('should return existing WELCOME10 promo if it exists', async () => {
      const existingPromo = createMockPromo({
        code: 'WELCOME10',
        name: 'Welcome Discount',
        discountValue: 10 as unknown as import('@prisma/client/runtime/library').Decimal,
      });
      prismaMock.promo.findUnique.mockResolvedValue(existingPromo);

      const result = await ensureWelcome10Promo();

      expect(result).toEqual(existingPromo);
      expect(prismaMock.promo.create).not.toHaveBeenCalled();
    });

    it('should create WELCOME10 promo if it does not exist', async () => {
      const newPromo = createMockPromo({
        code: 'WELCOME10',
        name: 'Welcome Discount',
        discountValue: 10 as unknown as import('@prisma/client/runtime/library').Decimal,
        maxUsesPerUser: 1,
      });
      prismaMock.promo.findUnique.mockResolvedValue(null);
      prismaMock.promo.create.mockResolvedValue(newPromo);

      const result = await ensureWelcome10Promo();

      expect(result).toEqual(newPromo);
      expect(prismaMock.promo.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          code: 'WELCOME10',
          name: 'Welcome Discount',
          discountType: 'PERCENTAGE',
          discountValue: 10,
          scope: 'ALL_PRODUCTS',
          maxUsesPerUser: 1,
          isActive: true,
        }),
      });
    });

    it('should create WELCOME10 with correct properties for one-time use', async () => {
      const newPromo = createMockPromo({
        code: 'WELCOME10',
        maxUsesPerUser: 1,
      });
      prismaMock.promo.findUnique.mockResolvedValue(null);
      prismaMock.promo.create.mockResolvedValue(newPromo);

      await ensureWelcome10Promo();

      expect(prismaMock.promo.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          maxUsesPerUser: 1, // Ensures one-time use per customer
        }),
      });
    });
  });
});
