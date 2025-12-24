import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin, handleApiError } from '@/lib/server/auth';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/categories/subcategories/[id]
 * Get a single subcategory by ID or slug
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const isUUID = id.length === 36 && id.includes('-');

    const subcategory = await prisma.subcategory.findFirst({
      where: isUUID ? { id } : { slug: id },
      include: {
        category: true,
        _count: {
          select: { products: true },
        },
      },
    });

    if (!subcategory) {
      return NextResponse.json(
        { error: 'Subcategory not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { subcategory },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PUT /api/categories/subcategories/[id]
 * Update a subcategory (admin only)
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request);

    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.subcategory.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: 'Subcategory not found' },
        { status: 404 }
      );
    }

    // Check for duplicate slug if changing
    if (body.slug && body.slug !== existing.slug) {
      const duplicateSlug = await prisma.subcategory.findUnique({
        where: { slug: body.slug },
      });
      if (duplicateSlug) {
        return NextResponse.json(
          { error: 'A subcategory with this slug already exists' },
          { status: 400 }
        );
      }
    }

    const subcategory = await prisma.subcategory.update({
      where: { id },
      data: body,
      include: {
        category: true,
        _count: {
          select: { products: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: { subcategory },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/categories/subcategories/[id]
 * Delete a subcategory (admin only)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request);

    const { id } = await params;

    const existing = await prisma.subcategory.findUnique({
      where: { id },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Subcategory not found' },
        { status: 404 }
      );
    }

    if (existing._count.products > 0) {
      return NextResponse.json(
        { error: `Cannot delete subcategory with ${existing._count.products} products. Move or delete products first.` },
        { status: 400 }
      );
    }

    await prisma.subcategory.delete({ where: { id } });

    return NextResponse.json({
      success: true,
      message: 'Subcategory deleted successfully',
    });
  } catch (error) {
    return handleApiError(error);
  }
}
