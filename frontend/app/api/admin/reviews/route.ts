import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, handleApiError } from '@/lib/server/auth';
import { getAdminReviews } from '@/lib/server/review-service';

/**
 * GET /api/admin/reviews
 * Get all reviews for admin with filtering
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const offset = (page - 1) * limit;

    // Filters
    const featured = searchParams.get('featured');
    const approved = searchParams.get('approved');
    const minRating = searchParams.get('minRating');
    const maxRating = searchParams.get('maxRating');

    const { reviews, total } = await getAdminReviews({
      limit,
      offset,
      featured: featured === 'true' ? true : featured === 'false' ? false : undefined,
      approved: approved === 'true' ? true : approved === 'false' ? false : undefined,
      minRating: minRating ? parseInt(minRating, 10) : undefined,
      maxRating: maxRating ? parseInt(maxRating, 10) : undefined,
    });

    return NextResponse.json({
      success: true,
      data: {
        reviews,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
