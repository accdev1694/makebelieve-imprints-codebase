import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { handleApiError } from '@/lib/server/auth';

/**
 * GET /api/products/filters
 * Get available filter options (materials, sizes, price range)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const productType = searchParams.get('productType');

    // Build where clause for variants query
    const productWhere: Record<string, unknown> = {
      status: 'ACTIVE',
    };

    if (category) {
      productWhere.legacyCategory = category;
    }
    if (productType) {
      productWhere.legacyProductType = productType;
    }

    // Use database aggregation instead of loading all records into memory
    // Get product IDs that match the filter first
    const matchingProducts = await prisma.product.findMany({
      where: productWhere,
      select: { id: true },
    });
    const productIds = matchingProducts.map(p => p.id);

    // Use groupBy for efficient aggregation of materials
    const materialGroups = await prisma.productVariant.groupBy({
      by: ['material'],
      where: {
        productId: { in: productIds },
        material: { not: null },
      },
      _count: { material: true },
    });

    // Use groupBy for efficient aggregation of sizes
    const sizeGroups = await prisma.productVariant.groupBy({
      by: ['size'],
      where: {
        productId: { in: productIds },
        size: { not: null },
      },
      _count: { size: true },
    });

    // Use aggregate for price range - more efficient than loading all records
    const priceAgg = await prisma.product.aggregate({
      where: productWhere,
      _min: { basePrice: true },
      _max: { basePrice: true },
    });

    const minPrice = priceAgg._min.basePrice ? Number(priceAgg._min.basePrice) : 0;
    const maxPrice = priceAgg._max.basePrice ? Number(priceAgg._max.basePrice) : 100;

    return NextResponse.json({
      materials: materialGroups
        .filter(g => g.material !== null)
        .map(g => ({
          value: g.material as string,
          count: g._count.material,
        })),
      sizes: sizeGroups
        .filter(g => g.size !== null)
        .map(g => ({
          value: g.size as string,
          count: g._count.size,
        })),
      priceRange: {
        min: minPrice,
        max: maxPrice,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
