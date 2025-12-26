import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin, handleApiError } from '@/lib/server/auth';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/products/[id]/images
 * List all images for a product
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

    const images = await prisma.productImage.findMany({
      where: { productId: product.id },
      include: {
        variant: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [
        { isPrimary: 'desc' },
        { displayOrder: 'asc' },
        { createdAt: 'asc' },
      ],
    });

    return NextResponse.json(images);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/products/[id]/images
 * Add an image to a product (Admin only)
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

    // Validate variant if provided
    if (body.variantId) {
      const variant = await prisma.productVariant.findFirst({
        where: {
          id: body.variantId,
          productId: product.id,
        },
      });
      if (!variant) {
        return NextResponse.json(
          { error: 'Variant not found' },
          { status: 400 }
        );
      }
    }

    // If this is set as primary, unset other primary images
    if (body.isPrimary) {
      await prisma.productImage.updateMany({
        where: { productId: product.id },
        data: { isPrimary: false },
      });
    }

    // Get next display order
    const maxOrder = await prisma.productImage.aggregate({
      where: { productId: product.id },
      _max: { displayOrder: true },
    });
    const nextOrder = (maxOrder._max.displayOrder ?? -1) + 1;

    // Create the image
    const image = await prisma.productImage.create({
      data: {
        productId: product.id,
        variantId: body.variantId || null,
        imageUrl: body.imageUrl,
        altText: body.altText || null,
        displayOrder: body.displayOrder ?? nextOrder,
        isPrimary: body.isPrimary || false,
      },
      include: {
        variant: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json(image, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PATCH /api/products/[id]/images
 * Reorder images (Admin only)
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
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

    // Expect body.imageIds as an ordered array of image IDs
    if (!Array.isArray(body.imageIds)) {
      return NextResponse.json(
        { error: 'imageIds must be an array' },
        { status: 400 }
      );
    }

    // Update display order for each image
    const updates = body.imageIds.map((imageId: string, index: number) =>
      prisma.productImage.updateMany({
        where: {
          id: imageId,
          productId: product.id,
        },
        data: { displayOrder: index },
      })
    );

    await prisma.$transaction(updates);

    // Return updated images
    const images = await prisma.productImage.findMany({
      where: { productId: product.id },
      orderBy: { displayOrder: 'asc' },
    });

    return NextResponse.json(images);
  } catch (error) {
    return handleApiError(error);
  }
}
