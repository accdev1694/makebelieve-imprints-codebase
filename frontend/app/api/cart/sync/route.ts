import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, handleApiError } from '@/lib/server/auth';
import { syncCart } from '@/lib/server/cart-service';

/**
 * POST /api/cart/sync
 * Merge localStorage cart with server cart
 * Used when guest logs in to sync their local cart
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const body = await request.json();

    const result = await syncCart(user.userId, body.items);

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
