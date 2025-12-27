import { prisma } from '@/lib/prisma';
import { Promo, DiscountType, PromoScope } from '@prisma/client';

export interface PromoValidationResult {
  valid: boolean;
  error?: string;
  promo?: Promo;
  discountAmount?: number;
  discountPercentage?: number;
}

export interface CartItem {
  productId: string;
  categoryId?: string;
  subcategoryId?: string;
  price: number;
  quantity: number;
}

/**
 * Validate a promo code for a given user/email and cart
 */
export async function validatePromoCode(
  code: string,
  options: {
    userId?: string;
    email?: string;
    cartItems?: CartItem[];
    cartTotal?: number;
  }
): Promise<PromoValidationResult> {
  const { userId, email, cartItems = [], cartTotal = 0 } = options;

  // Find the promo
  const promo = await prisma.promo.findUnique({
    where: { code: code.toUpperCase() },
  });

  if (!promo) {
    return { valid: false, error: 'Invalid promo code' };
  }

  // Check if promo is active
  if (!promo.isActive) {
    return { valid: false, error: 'This promo code is no longer active' };
  }

  // Check if promo has started
  if (promo.startsAt && new Date() < promo.startsAt) {
    return { valid: false, error: 'This promo code is not yet active' };
  }

  // Check if promo has expired
  if (promo.expiresAt && new Date() > promo.expiresAt) {
    return { valid: false, error: 'This promo code has expired' };
  }

  // Check total usage limit
  if (promo.maxUses !== null && promo.currentUses >= promo.maxUses) {
    return { valid: false, error: 'This promo code has reached its usage limit' };
  }

  // Check per-user usage limit
  if (promo.maxUsesPerUser > 0 && (userId || email)) {
    const userUsageCount = await prisma.promoUsage.count({
      where: {
        promoId: promo.id,
        OR: [
          ...(userId ? [{ userId }] : []),
          ...(email ? [{ email: email.toLowerCase() }] : []),
        ],
      },
    });

    if (userUsageCount >= promo.maxUsesPerUser) {
      return { valid: false, error: 'You have already used this promo code' };
    }
  }

  // Check minimum order amount
  if (promo.minOrderAmount && cartTotal < Number(promo.minOrderAmount)) {
    return {
      valid: false,
      error: `Minimum order amount of £${Number(promo.minOrderAmount).toFixed(2)} required`,
    };
  }

  // Calculate discount based on scope
  const discountResult = calculateDiscount(promo, cartItems, cartTotal);

  if (discountResult.discountAmount === 0) {
    return { valid: false, error: 'No eligible items in cart for this promo' };
  }

  return {
    valid: true,
    promo,
    discountAmount: discountResult.discountAmount,
    discountPercentage: promo.discountType === 'PERCENTAGE' ? Number(promo.discountValue) : undefined,
  };
}

/**
 * Calculate the discount amount based on promo scope
 */
function calculateDiscount(
  promo: Promo,
  cartItems: CartItem[],
  cartTotal: number
): { discountAmount: number; eligibleTotal: number } {
  let eligibleTotal = 0;

  switch (promo.scope) {
    case 'ALL_PRODUCTS':
      eligibleTotal = cartTotal;
      break;

    case 'CATEGORY':
      if (promo.categoryId) {
        eligibleTotal = cartItems
          .filter((item) => item.categoryId === promo.categoryId)
          .reduce((sum, item) => sum + item.price * item.quantity, 0);
      }
      break;

    case 'SUBCATEGORY':
      if (promo.subcategoryId) {
        eligibleTotal = cartItems
          .filter((item) => item.subcategoryId === promo.subcategoryId)
          .reduce((sum, item) => sum + item.price * item.quantity, 0);
      }
      break;

    case 'SPECIFIC_PRODUCTS':
      if (promo.productIds && promo.productIds.length > 0) {
        eligibleTotal = cartItems
          .filter((item) => promo.productIds.includes(item.productId))
          .reduce((sum, item) => sum + item.price * item.quantity, 0);
      }
      break;
  }

  // Calculate discount amount
  let discountAmount = 0;
  if (promo.discountType === 'PERCENTAGE') {
    discountAmount = eligibleTotal * (Number(promo.discountValue) / 100);
  } else {
    // Fixed amount - but don't exceed eligible total
    discountAmount = Math.min(Number(promo.discountValue), eligibleTotal);
  }

  // Round to 2 decimal places
  discountAmount = Math.round(discountAmount * 100) / 100;

  return { discountAmount, eligibleTotal };
}

/**
 * Record promo usage when an order is placed
 */
export async function recordPromoUsage(
  promoCode: string,
  options: {
    userId?: string;
    email?: string;
    orderId?: string;
    discountAmount: number;
  }
): Promise<boolean> {
  const { userId, email, orderId, discountAmount } = options;

  try {
    const promo = await prisma.promo.findUnique({
      where: { code: promoCode.toUpperCase() },
    });

    if (!promo) {
      return false;
    }

    // Create usage record and increment counter in a transaction
    await prisma.$transaction([
      prisma.promoUsage.create({
        data: {
          promoId: promo.id,
          userId,
          email: email?.toLowerCase(),
          orderId,
          discountAmount,
        },
      }),
      prisma.promo.update({
        where: { id: promo.id },
        data: { currentUses: { increment: 1 } },
      }),
    ]);

    return true;
  } catch (error) {
    console.error('Error recording promo usage:', error);
    return false;
  }
}

/**
 * Create the WELCOME10 promo if it doesn't exist
 */
export async function ensureWelcome10Promo(): Promise<Promo> {
  const existing = await prisma.promo.findUnique({
    where: { code: 'WELCOME10' },
  });

  if (existing) {
    return existing;
  }

  return prisma.promo.create({
    data: {
      code: 'WELCOME10',
      name: 'Welcome Discount',
      description: '10% off your first order for newsletter subscribers',
      discountType: 'PERCENTAGE',
      discountValue: 10,
      scope: 'ALL_PRODUCTS',
      maxUsesPerUser: 1, // Can only be used once per customer
      isActive: true,
    },
  });
}
