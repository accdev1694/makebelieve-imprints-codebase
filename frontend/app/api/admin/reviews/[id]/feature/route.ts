import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, handleApiError } from '@/lib/server/auth';
import { toggleFeaturedReview, toggleApprovedReview } from '@/lib/server/review-service';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * PUT /api/admin/reviews/[id]/feature
 * Toggle featured or approved status of a review
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request);

    const { id } = await params;
    const body = await request.json();
    const { featured, approved } = body;

    let review;

    if (typeof featured === 'boolean') {
      review = await toggleFeaturedReview(id, featured);
    }

    if (typeof approved === 'boolean') {
      review = await toggleApprovedReview(id, approved);
    }

    if (!review) {
      return NextResponse.json(
        { success: false, error: 'No valid update provided' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: review,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
