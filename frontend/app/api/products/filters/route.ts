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

    // Get all variants for active products matching filters
    const variants = await prisma.productVariant.findMany({
      where: {
        product: productWhere,
      },
      select: {
        material: true,
        size: true,
        price: true,
      },
    });

    // Get base prices from products
    const products = await prisma.product.findMany({
      where: productWhere,
      select: {
        basePrice: true,
      },
    });

    // Aggregate materials
    const materialCounts = new Map<string, number>();
    variants.forEach((v) => {
      if (v.material) {
        materialCounts.set(v.material, (materialCounts.get(v.material) || 0) + 1);
      }
    });

    // Aggregate sizes
    const sizeCounts = new Map<string, number>();
    variants.forEach((v) => {
      if (v.size) {
        sizeCounts.set(v.size, (sizeCounts.get(v.size) || 0) + 1);
      }
    });

    // Calculate price range from base prices
    const prices = products.map((p) => Number(p.basePrice));
    const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
    const maxPrice = prices.length > 0 ? Math.max(...prices) : 100;

    return NextResponse.json({
      materials: Array.from(materialCounts.entries()).map(([value, count]) => ({
        value,
        count,
      })),
      sizes: Array.from(sizeCounts.entries()).map(([value, count]) => ({
        value,
        count,
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
