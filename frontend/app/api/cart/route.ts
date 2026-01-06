import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, handleApiError } from '@/lib/server/auth';
import { getCartItems, addCartItem } from '@/lib/server/cart-service';
import { validateRequired, validatePositiveInt } from '@/lib/server/validation';

/**
 * GET /api/cart
 * Get user's cart with product details
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);

    const result = await getCartItems(user.userId);

    return NextResponse.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/cart
 * Add item to cart
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const body = await request.json();

    // Validate required fields
    const requiredValidation = validateRequired(
      { productId: body.productId },
      ['productId']
    );
    if (!requiredValidation.valid) {
      return NextResponse.json(
        { success: false, error: requiredValidation.errors[0] },
        { status: 400 }
      );
    }

    // Validate quantity if provided
    if (body.quantity !== undefined) {
      const quantityValidation = validatePositiveInt(body.quantity, 'Quantity');
      if (!quantityValidation.valid) {
        return NextResponse.json(
          { success: false, error: quantityValidation.errors[0] },
          { status: 400 }
        );
      }
    }

    const result = await addCartItem(user.userId, {
      productId: body.productId,
      variantId: body.variantId,
      quantity: body.quantity,
      unitPrice: body.unitPrice,
      customization: body.customization,
    });

    if (!result.success) {
      const status = result.error === 'Product not found' || result.error === 'Variant not found' ? 404 : 400;
      return NextResponse.json({ success: false, error: result.error }, { status });
    }

    return NextResponse.json(
      {
        success: true,
        data: { item: result.data?.item },
      },
      { status: result.data?.isNew ? 201 : 200 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}
