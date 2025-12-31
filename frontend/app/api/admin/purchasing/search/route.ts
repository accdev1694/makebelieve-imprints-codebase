import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, handleApiError } from '@/lib/server/auth';
import {
  searchProducts,
  getConfiguredSourcesStatus,
  SearchOptions,
} from '@/lib/server/product-search-service';

/**
 * POST /api/admin/purchasing/search
 * Search for products across configured marketplaces
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request);

    const body = await request.json();
    const { query, sources, minPrice, maxPrice, sortBy, limit } = body;

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return NextResponse.json(
        { error: 'Search query is required' },
        { status: 400 }
      );
    }

    const options: SearchOptions = {
      sources,
      minPrice,
      maxPrice,
      sortBy,
      limit: limit || 20,
    };

    const results = await searchProducts(query.trim(), options);

    return NextResponse.json({
      success: true,
      data: results,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * GET /api/admin/purchasing/search
 * Get status of configured search sources
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);

    const sources = getConfiguredSourcesStatus();

    return NextResponse.json({
      success: true,
      data: { sources },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
