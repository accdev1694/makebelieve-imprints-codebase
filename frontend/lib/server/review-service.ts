import prisma from '@/lib/prisma';
import { awardReviewPoints } from './points-service';

export interface ReviewInput {
  orderId: string;
  rating: number;
  comment?: string;
}

export interface Review {
  id: string;
  orderId: string;
  reviewerId: string;
  rating: number;
  comment: string | null;
  featured: boolean;
  approved: boolean;
  createdAt: Date;
  reviewer?: {
    name: string;
  };
}

/**
 * Create a new review for an order
 * - Validates order belongs to user and is delivered
 * - Auto-approves 4+ star reviews for homepage display
 * - Awards loyalty points
 */
export async function createReview(
  userId: string,
  input: ReviewInput
): Promise<Review> {
  const { orderId, rating, comment } = input;

  // Validate rating
  if (rating < 1 || rating > 5) {
    throw new Error('Rating must be between 1 and 5');
  }

  // Check order exists, belongs to user, and is delivered
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      customerId: true,
      status: true,
      review: { select: { id: true } },
    },
  });

  if (!order) {
    throw new Error('Order not found');
  }

  if (order.customerId !== userId) {
    throw new Error('Order does not belong to this user');
  }

  if (order.status !== 'delivered') {
    throw new Error('Order must be delivered before leaving a review');
  }

  if (order.review) {
    throw new Error('This order has already been reviewed');
  }

  // Auto-approve 4+ star reviews for homepage
  const approved = rating >= 4;

  // Create review
  const review = await prisma.review.create({
    data: {
      orderId,
      reviewerId: userId,
      rating,
      comment: comment || null,
      approved,
      featured: false,
    },
  });

  // Award points
  await awardReviewPoints(userId, review.id);

  return review;
}

/**
 * Get approved reviews for homepage display
 * Mixes featured reviews with recent high-rated reviews
 */
export async function getHomepageReviews(limit: number = 6): Promise<Review[]> {
  // First get featured reviews
  const featured = await prisma.review.findMany({
    where: {
      approved: true,
      featured: true,
    },
    include: {
      reviewer: {
        select: { name: true },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: Math.ceil(limit / 2), // Half featured
  });

  // Get remaining slots from recent approved reviews
  const remainingSlots = limit - featured.length;
  const featuredIds = featured.map(r => r.id);

  const recent = await prisma.review.findMany({
    where: {
      approved: true,
      featured: false,
      id: { notIn: featuredIds },
    },
    include: {
      reviewer: {
        select: { name: true },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: remainingSlots,
  });

  // Combine and shuffle for variety
  const combined = [...featured, ...recent];
  return combined.sort(() => Math.random() - 0.5);
}

/**
 * Get all approved reviews (for a reviews page)
 */
export async function getApprovedReviews(
  limit: number = 20,
  offset: number = 0
): Promise<{ reviews: Review[]; total: number }> {
  const [reviews, total] = await Promise.all([
    prisma.review.findMany({
      where: { approved: true },
      include: {
        reviewer: {
          select: { name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.review.count({ where: { approved: true } }),
  ]);

  return { reviews, total };
}

/**
 * Get all reviews for admin with filtering
 */
export async function getAdminReviews(params: {
  limit?: number;
  offset?: number;
  featured?: boolean;
  approved?: boolean;
  minRating?: number;
  maxRating?: number;
}): Promise<{ reviews: Review[]; total: number }> {
  const { limit = 20, offset = 0, featured, approved, minRating, maxRating } = params;

  const where: Record<string, unknown> = {};
  if (featured !== undefined) where.featured = featured;
  if (approved !== undefined) where.approved = approved;
  if (minRating !== undefined || maxRating !== undefined) {
    where.rating = {};
    if (minRating !== undefined) (where.rating as Record<string, number>).gte = minRating;
    if (maxRating !== undefined) (where.rating as Record<string, number>).lte = maxRating;
  }

  const [reviews, total] = await Promise.all([
    prisma.review.findMany({
      where,
      include: {
        reviewer: {
          select: { name: true, email: true },
        },
        order: {
          select: { id: true, createdAt: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.review.count({ where }),
  ]);

  return { reviews: reviews as unknown as Review[], total };
}

/**
 * Toggle featured status of a review
 */
export async function toggleFeaturedReview(
  reviewId: string,
  featured: boolean
): Promise<Review> {
  return prisma.review.update({
    where: { id: reviewId },
    data: { featured },
  });
}

/**
 * Toggle approved status of a review
 */
export async function toggleApprovedReview(
  reviewId: string,
  approved: boolean
): Promise<Review> {
  return prisma.review.update({
    where: { id: reviewId },
    data: { approved },
  });
}

/**
 * Get orders awaiting review for a user
 * Returns delivered orders that haven't been reviewed yet
 */
export async function getPendingReviewOrders(userId: string): Promise<{
  id: string;
  createdAt: Date;
  totalPrice: number;
  items: { productName: string; quantity: number }[];
}[]> {
  const orders = await prisma.order.findMany({
    where: {
      customerId: userId,
      status: 'delivered',
      review: null, // No review yet
    },
    select: {
      id: true,
      createdAt: true,
      totalPrice: true,
      items: {
        select: {
          quantity: true,
          product: {
            select: { name: true },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return orders.map(order => ({
    id: order.id,
    createdAt: order.createdAt,
    totalPrice: Number(order.totalPrice),
    items: order.items.map(item => ({
      productName: item.product?.name || 'Custom Design',
      quantity: item.quantity,
    })),
  }));
}

/**
 * Get a single review by ID
 */
export async function getReviewById(reviewId: string): Promise<Review | null> {
  return prisma.review.findUnique({
    where: { id: reviewId },
    include: {
      reviewer: {
        select: { name: true },
      },
    },
  });
}

/**
 * Get review for a specific order
 */
export async function getReviewByOrderId(orderId: string): Promise<Review | null> {
  return prisma.review.findUnique({
    where: { orderId },
    include: {
      reviewer: {
        select: { name: true },
      },
    },
  });
}
