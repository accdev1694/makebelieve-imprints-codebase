import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, handleApiError } from '@/lib/server/auth';
import { removeWishlistItem } from '@/lib/server/wishlist-service';

/**
 * DELETE /api/wishlist/[productId]
 * Remove item from wishlist by product ID
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { productId } = await params;

    const result = await removeWishlistItem(user.userId, productId);

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Removed from wishlist',
    });
  } catch (error) {
    return handleApiError(error);
  }
}
