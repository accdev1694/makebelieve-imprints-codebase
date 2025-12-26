import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin, handleApiError } from '@/lib/server/auth';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/products/[id]/variants
 * List all variants for a product
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: productId } = await params;

    // Check if product exists (by ID or slug)
    const product = await prisma.product.findFirst({
      where: {
        OR: [
          { id: productId },
          { slug: productId },
        ],
      },
      select: { id: true },
    });

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    const variants = await prisma.productVariant.findMany({
      where: { productId: product.id },
      include: {
        images: {
          orderBy: { displayOrder: 'asc' },
        },
      },
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'asc' },
      ],
    });

    return NextResponse.json(variants);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/products/[id]/variants
 * Create a new variant for a product (Admin only)
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request);
    const { id: productId } = await params;
    const body = await request.json();

    // Check if product exists
    const product = await prisma.product.findFirst({
      where: {
        OR: [
          { id: productId },
          { slug: productId },
        ],
      },
      select: { id: true },
    });

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Check for duplicate SKU if provided
    if (body.sku) {
      const existingSku = await prisma.productVariant.findUnique({
        where: { sku: body.sku },
      });
      if (existingSku) {
        return NextResponse.json(
          { error: 'SKU already exists' },
          { status: 400 }
        );
      }
    }

    // If this is set as default, unset other defaults
    if (body.isDefault) {
      await prisma.productVariant.updateMany({
        where: { productId: product.id },
        data: { isDefault: false },
      });
    }

    // Create the variant
    const variant = await prisma.productVariant.create({
      data: {
        productId: product.id,
        name: body.name,
        sku: body.sku || null,
        size: body.size || null,
        material: body.material || null,
        color: body.color || null,
        finish: body.finish || null,
        dimensions: body.dimensions || null,
        price: body.price,
        stock: body.stock || 0,
        isDefault: body.isDefault || false,
        metadata: body.metadata || null,
      },
      include: {
        images: true,
      },
    });

    return NextResponse.json(variant, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
