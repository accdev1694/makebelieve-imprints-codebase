import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, handleApiError } from '@/lib/server/auth';
import { updateCartItem, deleteCartItem } from '@/lib/server/cart-service';

interface RouteParams {
  params: Promise<{ itemId: string }>;
}

/**
 * PUT /api/cart/[itemId]
 * Update cart item quantity
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth(request);
    const { itemId } = await params;
    const body = await request.json();

    const result = await updateCartItem(user.userId, itemId, body.quantity);

    if (!result.success) {
      const status = result.error === 'Cart item not found' ? 404 : 400;
      return NextResponse.json({ success: false, error: result.error }, { status });
    }

    return NextResponse.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/cart/[itemId]
 * Remove item from cart
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth(request);
    const { itemId } = await params;

    const result = await deleteCartItem(user.userId, itemId);

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
