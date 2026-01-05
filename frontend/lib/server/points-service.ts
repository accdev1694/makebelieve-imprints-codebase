import prisma from '@/lib/prisma';

const POINTS_PER_POUND = 100; // 100 points = £1 discount
const POINTS_PER_POUND_SPENT = 10; // Earn 10 points per £1 spent
const REVIEW_REWARD_POINTS = 50;
const MIN_POINTS_TO_REDEEM = 500; // Minimum 500 points (£5) to redeem

export type PointsTransactionType =
  | 'REVIEW_REWARD'
  | 'CHECKOUT_REDEMPTION'
  | 'ADMIN_ADJUSTMENT'
  | 'PURCHASE_REWARD';

export interface PointsTransaction {
  id: string;
  userId: string;
  amount: number;
  type: string;
  referenceId: string | null;
  createdAt: Date;
}

/**
 * Award points to a user
 */
export async function awardPoints(
  userId: string,
  amount: number,
  type: PointsTransactionType,
  referenceId?: string
): Promise<PointsTransaction> {
  // Create transaction and update user balance atomically
  const [transaction] = await prisma.$transaction([
    prisma.pointsTransaction.create({
      data: {
        userId,
        amount,
        type,
        referenceId: referenceId || null,
      },
    }),
    prisma.user.update({
      where: { id: userId },
      data: {
        loyaltyPoints: {
          increment: amount,
        },
      },
    }),
  ]);

  return transaction;
}

/**
 * Redeem points at checkout
 * Returns the discount amount in pounds
 */
export async function redeemPoints(
  userId: string,
  pointsToRedeem: number,
  orderId: string
): Promise<{ discountAmount: number; pointsRedeemed: number }> {
  // Get user's current balance
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { loyaltyPoints: true },
  });

  if (!user) {
    throw new Error('User not found');
  }

  if (user.loyaltyPoints < pointsToRedeem) {
    throw new Error('Insufficient points balance');
  }

  // Calculate discount
  const discountAmount = calculateDiscount(pointsToRedeem);

  // Create negative transaction and update balance
  await prisma.$transaction([
    prisma.pointsTransaction.create({
      data: {
        userId,
        amount: -pointsToRedeem, // Negative for spending
        type: 'CHECKOUT_REDEMPTION',
        referenceId: orderId,
      },
    }),
    prisma.user.update({
      where: { id: userId },
      data: {
        loyaltyPoints: {
          decrement: pointsToRedeem,
        },
      },
    }),
  ]);

  return {
    discountAmount,
    pointsRedeemed: pointsToRedeem,
  };
}

/**
 * Get user's current points balance
 */
export async function getUserPoints(userId: string): Promise<number> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { loyaltyPoints: true },
  });

  return user?.loyaltyPoints ?? 0;
}

/**
 * Get user's points transaction history
 */
export async function getPointsHistory(
  userId: string,
  limit: number = 20
): Promise<PointsTransaction[]> {
  return prisma.pointsTransaction.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

/**
 * Calculate discount amount from points
 * 100 points = £1
 */
export function calculateDiscount(points: number): number {
  return points / POINTS_PER_POUND;
}

/**
 * Calculate points needed for a specific discount
 */
export function calculatePointsNeeded(discountAmount: number): number {
  return Math.ceil(discountAmount * POINTS_PER_POUND);
}

/**
 * Get review reward points constant
 */
export function getReviewRewardPoints(): number {
  return REVIEW_REWARD_POINTS;
}

/**
 * Award points for a review
 */
export async function awardReviewPoints(
  userId: string,
  reviewId: string
): Promise<PointsTransaction> {
  return awardPoints(userId, REVIEW_REWARD_POINTS, 'REVIEW_REWARD', reviewId);
}

/**
 * Award points for a purchase (10 points per £1 spent)
 */
export async function awardPurchasePoints(
  userId: string,
  orderId: string,
  orderTotal: number
): Promise<PointsTransaction | null> {
  const pointsToAward = Math.floor(orderTotal * POINTS_PER_POUND_SPENT);
  if (pointsToAward <= 0) return null;
  return awardPoints(userId, pointsToAward, 'PURCHASE_REWARD', orderId);
}

/**
 * Check if user has enough points to redeem
 */
export function canRedeemPoints(balance: number): boolean {
  return balance >= MIN_POINTS_TO_REDEEM;
}

/**
 * Get minimum points required to redeem
 */
export function getMinPointsToRedeem(): number {
  return MIN_POINTS_TO_REDEEM;
}

/**
 * Get points earned per pound spent
 */
export function getPointsPerPoundSpent(): number {
  return POINTS_PER_POUND_SPENT;
}
