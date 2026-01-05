import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, handleApiError } from '@/lib/server/auth';
import { getPendingReviewOrders } from '@/lib/server/review-service';
import { getReviewRewardPoints } from '@/lib/server/points-service';

/**
 * GET /api/reviews/pending
 * Get orders awaiting review for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);

    const pendingOrders = await getPendingReviewOrders(user.userId);
    const pointsPerReview = getReviewRewardPoints();

    return NextResponse.json({
      success: true,
      data: {
        orders: pendingOrders,
        pointsPerReview,
        totalPotentialPoints: pendingOrders.length * pointsPerReview,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
