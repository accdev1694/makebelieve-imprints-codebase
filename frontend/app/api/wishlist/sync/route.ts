import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, handleApiError } from '@/lib/server/auth';
import { syncWishlist } from '@/lib/server/wishlist-service';

/**
 * POST /api/wishlist/sync
 * Merge localStorage items with server wishlist
 * Used when guest logs in to sync their local wishlist
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const body = await request.json();

    const result = await syncWishlist(user.userId, body.items);

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
