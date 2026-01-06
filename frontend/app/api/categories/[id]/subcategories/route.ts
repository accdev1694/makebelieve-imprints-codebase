import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, handleApiError } from '@/lib/server/auth';
import { listSubcategories, createSubcategory } from '@/lib/server/category-service';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/categories/[id]/subcategories
 * List subcategories for a category
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: categoryId } = await params;
    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get('includeInactive') === 'true';

    const result = await listSubcategories(categoryId, { includeInactive });

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
 * POST /api/categories/[id]/subcategories
 * Create a subcategory (admin only)
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request);

    const { id: categoryId } = await params;
    const body = await request.json();

    const result = await createSubcategory(categoryId, body);

    if (!result.success) {
      const status = result.error === 'Category not found' ? 404 : 400;
      return NextResponse.json({ error: result.error }, { status });
    }

    return NextResponse.json(
      { success: true, data: result.data },
      { status: 201 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}
