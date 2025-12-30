import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { handleApiError } from '@/lib/server/auth';

/**
 * GET /api/templates
 * List all templates (public)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const productId = searchParams.get('productId');
    const category = searchParams.get('category');
    const isPremium = searchParams.get('isPremium');
    const search = searchParams.get('search');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const skip = (page - 1) * limit;

    const where: any = {};
    if (productId) where.productId = productId;
    if (category) where.category = { equals: category, mode: 'insensitive' };
    if (isPremium !== null && isPremium !== undefined) {
      where.isPremium = isPremium === 'true';
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Build orderBy based on sortBy parameter
    const orderBy: any = {};
    if (['name', 'price', 'createdAt', 'category'].includes(sortBy)) {
      orderBy[sortBy] = sortOrder === 'asc' ? 'asc' : 'desc';
    } else {
      orderBy.createdAt = 'desc';
    }

    const [templates, total] = await Promise.all([
      prisma.productTemplate.findMany({
        where,
        skip,
        take: limit,
        include: {
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
        orderBy,
      }),
      prisma.productTemplate.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        templates,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
