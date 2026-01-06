import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, handleApiError } from '@/lib/server/auth';
import { getSubcategory, updateSubcategory, deleteSubcategory } from '@/lib/server/category-service';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/categories/subcategories/[id]
 * Get a single subcategory by ID or slug
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const result = await getSubcategory(id);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 404 });
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
 * PUT /api/categories/subcategories/[id]
 * Update a subcategory (admin only)
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request);

    const { id } = await params;
    const body = await request.json();

    const result = await updateSubcategory(id, body);

    if (!result.success) {
      const status = result.error === 'Subcategory not found' ? 404 : 400;
      return NextResponse.json({ error: result.error }, { status });
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
 * DELETE /api/categories/subcategories/[id]
 * Delete a subcategory (admin only)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request);

    const { id } = await params;

    const result = await deleteSubcategory(id);

    if (!result.success) {
      const status = result.error === 'Subcategory not found' ? 404 : 400;
      return NextResponse.json({ error: result.error }, { status });
    }

    return NextResponse.json({
      success: true,
      message: 'Subcategory deleted successfully',
    });
  } catch (error) {
    return handleApiError(error);
  }
}
