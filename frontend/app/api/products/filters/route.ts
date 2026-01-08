import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/server/auth';
import { getProductFilters } from '@/lib/server/product-service';

/**
 * GET /api/products/filters
 * Get available filter options (materials, sizes, price range)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || undefined;
    const productType = searchParams.get('productType') || undefined;

    const result = await getProductFilters(category, productType);

    return NextResponse.json(result.data, {
      headers: {
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=60',
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
