import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, handleApiError } from '@/lib/server/auth';
import { createReview, getApprovedReviews } from '@/lib/server/review-service';
import { getReviewRewardPoints } from '@/lib/server/points-service';

/**
 * POST /api/reviews
 * Create a new review for an order
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);

    const body = await request.json();
    const { orderId, rating, comment } = body;

    if (!orderId || !rating) {
      return NextResponse.json(
        { success: false, error: 'Order ID and rating are required' },
        { status: 400 }
      );
    }

    const review = await createReview(user.userId, {
      orderId,
      rating: Number(rating),
      comment,
    });

    const pointsEarned = getReviewRewardPoints();

    return NextResponse.json({
      success: true,
      data: {
        review,
        pointsEarned,
        message: `Thank you for your review! You earned ${pointsEarned} points.`,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * GET /api/reviews
 * Get approved reviews (public)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const { reviews, total } = await getApprovedReviews(limit, offset);

    return NextResponse.json({
      success: true,
      data: {
        reviews,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + reviews.length < total,
        },
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
