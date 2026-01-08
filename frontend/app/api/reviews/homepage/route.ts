import { NextRequest, NextResponse } from 'next/server';
import { getHomepageReviews } from '@/lib/server/review-service';

/**
 * GET /api/reviews/homepage
 * Get reviews for homepage display (public)
 * Returns a mix of featured and recent 4-5 star reviews
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '6', 10);

    const reviews = await getHomepageReviews(limit);

    // Format for homepage display - show first name + last initial
    const formattedReviews = reviews.map(review => ({
      id: review.id,
      rating: review.rating,
      comment: review.comment,
      featured: review.featured,
      createdAt: review.createdAt,
      customerName: formatCustomerName(review.reviewer?.name || 'Customer'),
    }));

    return NextResponse.json(
      {
        success: true,
        data: formattedReviews,
      },
      {
        headers: {
          'Cache-Control': 'public, max-age=300, stale-while-revalidate=60',
        },
      }
    );
  } catch (error) {
    console.error('Get homepage reviews error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch reviews' },
      { status: 500 }
    );
  }
}

/**
 * Format name as "First L." for privacy
 */
function formatCustomerName(fullName: string): string {
  const parts = fullName.trim().split(' ');
  if (parts.length === 1) {
    return parts[0];
  }
  const firstName = parts[0];
  const lastInitial = parts[parts.length - 1][0];
  return `${firstName} ${lastInitial}.`;
}
