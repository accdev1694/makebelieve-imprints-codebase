import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, handleApiError } from '@/lib/server/auth';
import {
  getSavedProducts,
  saveProduct,
  removeSavedProduct,
  ProductSearchResult,
} from '@/lib/server/product-search-service';

/**
 * GET /api/admin/purchasing/saved
 * Get saved products (wishlist)
 */
export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);

    const searchParams = request.nextUrl.searchParams;
    const source = searchParams.get('source') || undefined;

    const products = await getSavedProducts(admin.userId, source);

    return NextResponse.json({
      success: true,
      data: { products },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/admin/purchasing/saved
 * Save a product to wishlist
 */
export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);

    const body = await request.json();
    const { product, notes } = body as { product: ProductSearchResult; notes?: string };

    if (!product || !product.id || !product.source) {
      return NextResponse.json(
        { error: 'Valid product data is required' },
        { status: 400 }
      );
    }

    const result = await saveProduct(product, admin.userId, notes);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to save product' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { id: result.id },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/admin/purchasing/saved
 * Remove a saved product
 */
export async function DELETE(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);

    const searchParams = request.nextUrl.searchParams;
    const productId = searchParams.get('id');

    if (!productId) {
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      );
    }

    const result = await removeSavedProduct(productId, admin.userId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to remove product' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Product removed from saved list',
    });
  } catch (error) {
    return handleApiError(error);
  }
}
