import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/server/auth';
import { validatePromoCode, CartItem } from '@/lib/server/promo-service';

// POST /api/promos/validate - Validate a promo code
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, email, cartItems, cartTotal } = body;

    if (!code) {
      return NextResponse.json(
        { error: 'Promo code is required' },
        { status: 400 }
      );
    }

    // Get authenticated user if available
    const authUser = await getAuthUser(request);

    // Transform cart items to the format expected by the service
    const items: CartItem[] = (cartItems || []).map((item: {
      productId?: string;
      id?: string;
      categoryId?: string;
      subcategoryId?: string;
      price?: number;
      unitPrice?: number;
      quantity?: number;
    }) => ({
      productId: item.productId || item.id,
      categoryId: item.categoryId,
      subcategoryId: item.subcategoryId,
      price: item.price || item.unitPrice || 0,
      quantity: item.quantity || 1,
    }));

    const result = await validatePromoCode(code, {
      userId: authUser?.userId,
      email: email || authUser?.email,
      cartItems: items,
      cartTotal: cartTotal || 0,
    });

    if (!result.valid) {
      return NextResponse.json(
        { valid: false, error: result.error },
        { status: 400 }
      );
    }

    // Return promo details (without sensitive info)
    return NextResponse.json({
      valid: true,
      code: result.promo?.code,
      name: result.promo?.name,
      discountType: result.promo?.discountType,
      discountValue: Number(result.promo?.discountValue),
      discountAmount: result.discountAmount,
      discountPercentage: result.discountPercentage,
    });
  } catch (error) {
    console.error('Error validating promo:', error);
    return NextResponse.json(
      { valid: false, error: 'Failed to validate promo code' },
      { status: 500 }
    );
  }
}
