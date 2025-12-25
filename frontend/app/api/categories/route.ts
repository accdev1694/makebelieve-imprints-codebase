import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin, handleApiError } from '@/lib/server/auth';

/**
 * GET /api/categories
 * List all categories (public)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get('includeInactive') === 'true';
    const includeSubcategories = searchParams.get('includeSubcategories') !== 'false';

    const where = includeInactive ? {} : { isActive: true };

    const categories = await prisma.category.findMany({
      where,
      include: includeSubcategories
        ? {
            subcategories: {
              where: includeInactive ? {} : { isActive: true },
              orderBy: { displayOrder: 'asc' },
            },
            _count: {
              select: { products: true },
            },
          }
        : {
            _count: {
              select: { products: true },
            },
          },
      orderBy: { displayOrder: 'asc' },
    });

    return NextResponse.json({
      success: true,
      data: { categories },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/categories
 * Create a new category (admin only)
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request);

    const body = await request.json();
    const { name, slug, description, image, displayOrder, isActive } = body;

    // Check for duplicate slug
    const existing = await prisma.category.findUnique({ where: { slug } });
    if (existing) {
      return NextResponse.json(
        { error: 'A category with this slug already exists' },
        { status: 400 }
      );
    }

    const category = await prisma.category.create({
      data: {
        name,
        slug,
        description,
        image,
        displayOrder: displayOrder ?? 0,
        isActive: isActive ?? true,
      },
      include: {
        subcategories: true,
        _count: {
          select: { products: true },
        },
      },
    });

    return NextResponse.json(
      { success: true, data: { category } },
      { status: 201 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}
