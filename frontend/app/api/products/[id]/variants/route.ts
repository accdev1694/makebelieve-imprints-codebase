import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, handleApiError } from '@/lib/server/auth';
import { listVariants, createVariant } from '@/lib/server/product-service';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/products/[id]/variants
 * List all variants for a product
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: productId } = await params;

    const result = await listVariants(productId);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 404 });
    }

    return NextResponse.json(result.data);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/products/[id]/variants
 * Create a new variant for a product (Admin only)
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request);
    const { id: productId } = await params;
    const body = await request.json();

    const result = await createVariant(productId, body);

    if (!result.success) {
      const status = result.error === 'Product not found' ? 404 : 400;
      return NextResponse.json({ error: result.error }, { status });
    }

    return NextResponse.json(result.data, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
