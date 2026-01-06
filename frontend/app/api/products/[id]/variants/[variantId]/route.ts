import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, handleApiError } from '@/lib/server/auth';
import { getVariant, updateVariant, deleteVariant } from '@/lib/server/product-service';

interface RouteParams {
  params: Promise<{ id: string; variantId: string }>;
}

/**
 * GET /api/products/[id]/variants/[variantId]
 * Get a single variant
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: productId, variantId } = await params;

    const result = await getVariant(productId, variantId);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 404 });
    }

    return NextResponse.json(result.data);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PUT /api/products/[id]/variants/[variantId]
 * Update a variant (Admin only)
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request);
    const { id: productId, variantId } = await params;
    const body = await request.json();

    const result = await updateVariant(productId, variantId, body);

    if (!result.success) {
      const status = result.error?.includes('not found') ? 404 : 400;
      return NextResponse.json({ error: result.error }, { status });
    }

    return NextResponse.json(result.data);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/products/[id]/variants/[variantId]
 * Delete a variant (Admin only)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request);
    const { id: productId, variantId } = await params;

    const result = await deleteVariant(productId, variantId);

    if (!result.success) {
      const status = result.error?.includes('not found') ? 404 : 400;
      return NextResponse.json({ error: result.error }, { status });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
