import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin, handleApiError } from '@/lib/server/auth';

/**
 * GET /api/products
 * List all products with filtering, search, and pagination
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const categoryId = searchParams.get('categoryId');
    const categorySlug = searchParams.get('categorySlug');
    const subcategoryId = searchParams.get('subcategoryId');
    const subcategorySlug = searchParams.get('subcategorySlug');
    const customizationType = searchParams.get('customizationType');
    const status = searchParams.get('status');
    const featured = searchParams.get('featured');
    const search = searchParams.get('search');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};

    // Dynamic category filtering
    if (categoryId) {
      where.categoryId = categoryId;
    } else if (categorySlug) {
      const cat = await prisma.category.findUnique({ where: { slug: categorySlug } });
      if (cat) where.categoryId = cat.id;
    }

    // Dynamic subcategory filtering
    if (subcategoryId) {
      where.subcategoryId = subcategoryId;
    } else if (subcategorySlug) {
      const subcat = await prisma.subcategory.findUnique({ where: { slug: subcategorySlug } });
      if (subcat) where.subcategoryId = subcat.id;
    }

    if (customizationType) where.customizationType = customizationType;
    if (status) where.status = status;
    if (featured === 'true') where.featured = true;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { seoKeywords: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Get total count
    const total = await prisma.product.count({ where });

    // Map sortBy to actual database fields
    const sortFieldMap: Record<string, string> = {
      name: 'name',
      price: 'basePrice',
      createdAt: 'createdAt',
      featured: 'featured',
    };
    const actualSortField = sortFieldMap[sortBy] || 'createdAt';

    // Get products with category and subcategory data
    const products = await prisma.product.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [actualSortField]: sortOrder as 'asc' | 'desc' },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        subcategory: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        images: {
          where: { isPrimary: true },
          take: 1,
        },
        variants: {
          where: { isDefault: true },
          take: 1,
        },
        _count: {
          select: {
            variants: true,
            templates: true,
          },
        },
      },
    });

    return NextResponse.json({
      products,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
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

    const product = await prisma.product.create({
      data: {
        name: body.name,
        slug: body.slug,
        description: body.description,
        legacyCategory: body.legacyCategory || 'CUSTOM_ORDER',
        legacyProductType: body.legacyProductType || 'TSHIRT',
        customizationType: body.customizationType,
        basePrice: body.basePrice,
        currency: body.currency || 'GBP',
        status: body.status || 'DRAFT',
        featured: body.featured || false,
        seoTitle: body.seoTitle,
        seoDescription: body.seoDescription,
        seoKeywords: body.seoKeywords,
        metadata: body.metadata,
        category: {
          connect: { id: body.categoryId },
        },
        subcategory: body.subcategoryId ? {
          connect: { id: body.subcategoryId },
        } : undefined,
      },
      include: {
        category: true,
        subcategory: true,
        variants: true,
        images: true,
        templates: true,
      },
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
