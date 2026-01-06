import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, handleApiError } from '@/lib/server/auth';
import { clearCart } from '@/lib/server/cart-service';

/**
 * DELETE /api/cart/clear
 * Clear all items from user's cart
 * Used after successful checkout
 */
export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth(request);

    const result = await clearCart(user.userId);

    return NextResponse.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
