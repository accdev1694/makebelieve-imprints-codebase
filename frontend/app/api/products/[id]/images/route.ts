import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, handleApiError } from '@/lib/server/auth';
import { listImages, createImage, reorderImages } from '@/lib/server/product-service';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/products/[id]/images
 * List all images for a product
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: productId } = await params;

    const result = await listImages(productId);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 404 });
    }

    return NextResponse.json(result.data);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/products/[id]/images
 * Add an image to a product (Admin only)
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request);
    const { id: productId } = await params;
    const body = await request.json();

    const result = await createImage(productId, body);

    if (!result.success) {
      const status = result.error === 'Product not found' ? 404 : 400;
      return NextResponse.json({ error: result.error }, { status });
    }

    return NextResponse.json(result.data, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PATCH /api/products/[id]/images
 * Reorder images (Admin only)
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request);
    const { id: productId } = await params;
    const body = await request.json();

    const result = await reorderImages(productId, body.imageIds);

    if (!result.success) {
      const status = result.error === 'Product not found' ? 404 : 400;
      return NextResponse.json({ error: result.error }, { status });
    }

    return NextResponse.json(result.data);
  } catch (error) {
    return handleApiError(error);
  }
}
