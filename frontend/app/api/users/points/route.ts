import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, handleApiError } from '@/lib/server/auth';
import { getUserPoints, calculateDiscount } from '@/lib/server/points-service';

/**
 * GET /api/users/points
 * Get user's current points balance
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);

    const points = await getUserPoints(user.userId);
    const discountValue = calculateDiscount(points);

    return NextResponse.json({
      success: true,
      data: {
        points,
        discountValue,
        pointsPerPound: 100,
        message: points > 0
          ? `You have ${points} points worth £${discountValue.toFixed(2)} off your next order!`
          : 'Start earning points by leaving reviews on your delivered orders.',
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
