import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, handleApiError } from '@/lib/server/auth';
import { getImage, updateImage, deleteImage } from '@/lib/server/product-service';

interface RouteParams {
  params: Promise<{ id: string; imageId: string }>;
}

/**
 * GET /api/products/[id]/images/[imageId]
 * Get a single image
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: productId, imageId } = await params;

    const result = await getImage(productId, imageId);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 404 });
    }

    return NextResponse.json(result.data);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PUT /api/products/[id]/images/[imageId]
 * Update an image (Admin only)
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request);
    const { id: productId, imageId } = await params;
    const body = await request.json();

    const result = await updateImage(productId, imageId, body);

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
 * DELETE /api/products/[id]/images/[imageId]
 * Delete an image (Admin only)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request);
    const { id: productId, imageId } = await params;

    const result = await deleteImage(productId, imageId);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
