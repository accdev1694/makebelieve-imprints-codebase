import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, handleApiError } from '@/lib/server/auth';
import { listProducts, createProduct, ProductListParams } from '@/lib/server/product-service';

/**
 * GET /api/products
 * List all products with filtering, search, and pagination
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const params: ProductListParams = {
      page: parseInt(searchParams.get('page') || '1', 10),
      limit: parseInt(searchParams.get('limit') || '12', 10),
      categoryId: searchParams.get('categoryId') || undefined,
      categorySlug: searchParams.get('categorySlug') || undefined,
      category: searchParams.get('category') || undefined,
      subcategoryId: searchParams.get('subcategoryId') || undefined,
      subcategorySlug: searchParams.get('subcategorySlug') || undefined,
      customizationType: searchParams.get('customizationType') || undefined,
      status: searchParams.get('status') || undefined,
      featured: searchParams.get('featured') === 'true',
      search: searchParams.get('search') || undefined,
      sortBy: searchParams.get('sortBy') || 'createdAt',
      sortOrder: (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc',
    };

    const result = await listProducts(params);

    return NextResponse.json(result.data, {
      headers: {
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=60',
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/products
 * Create a new product (Admin only)
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request);

    const body = await request.json();

    const result = await createProduct(body);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result.data, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
