import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin, handleApiError } from '@/lib/server/auth';

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

    const isUUID = categoryId.length === 36 && categoryId.includes('-');

    // Find category by ID or slug
    const category = await prisma.category.findFirst({
      where: isUUID ? { id: categoryId } : { slug: categoryId },
    });

    if (!category) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      );
    }

    const subcategories = await prisma.subcategory.findMany({
      where: {
        categoryId: category.id,
        ...(includeInactive ? {} : { isActive: true }),
      },
      include: {
        _count: {
          select: { products: true },
        },
      },
      orderBy: { displayOrder: 'asc' },
    });

    return NextResponse.json({
      success: true,
      data: { subcategories },
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
    const { name, slug, description, image, displayOrder, isActive } = body;

    // Check category exists
    const category = await prisma.category.findUnique({ where: { id: categoryId } });
    if (!category) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      );
    }

    // Check for duplicate slug
    const existing = await prisma.subcategory.findUnique({ where: { slug } });
    if (existing) {
      return NextResponse.json(
        { error: 'A subcategory with this slug already exists' },
        { status: 400 }
      );
    }

    const subcategory = await prisma.subcategory.create({
      data: {
        categoryId,
        name,
        slug,
        description,
        image,
        displayOrder: displayOrder ?? 0,
        isActive: isActive ?? true,
      },
      include: {
        category: true,
        _count: {
          select: { products: true },
        },
      },
    });

    return NextResponse.json(
      { success: true, data: { subcategory } },
      { status: 201 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}
