import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth, handleApiError } from '@/lib/server/auth';

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

    // Try to delete the wishlist item
    const deleted = await prisma.wishlistItem.deleteMany({
      where: {
        userId: user.userId,
        productId,
      },
    });

    if (deleted.count === 0) {
      return NextResponse.json(
        { success: false, error: 'Item not in wishlist' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Removed from wishlist',
    });
  } catch (error) {
    return handleApiError(error);
  }
}
