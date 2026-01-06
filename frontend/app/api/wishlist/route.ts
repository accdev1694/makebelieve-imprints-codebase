import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, handleApiError } from '@/lib/server/auth';
import { getWishlistItems, addWishlistItem } from '@/lib/server/wishlist-service';

/**
 * GET /api/wishlist
 * Get user's wishlist with product details
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);

    const result = await getWishlistItems(user.userId);

    return NextResponse.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/wishlist
 * Add item to wishlist
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const body = await request.json();

    const result = await addWishlistItem(user.userId, body.productId);

    if (!result.success) {
      const status = result.error === 'Product not found' ? 404 : 400;
      return NextResponse.json({ success: false, error: result.error }, { status });
    }

    return NextResponse.json(
      {
        success: true,
        data: result.data,
      },
      { status: 201 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}
