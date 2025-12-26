import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin, handleApiError } from '@/lib/server/auth';

interface RouteParams {
  params: Promise<{ id: string; imageId: string }>;
}

/**
 * GET /api/products/[id]/images/[imageId]
 * Get a single image
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: productId, imageId } = await params;

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

    const image = await prisma.productImage.findFirst({
      where: {
        id: imageId,
        productId: product.id,
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

    if (!image) {
      return NextResponse.json(
        { error: 'Image not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(image);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PUT /api/products/[id]/images/[imageId]
 * Update an image (Admin only)
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request);
    const { id: productId, imageId } = await params;
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

    // Check if image exists
    const existingImage = await prisma.productImage.findFirst({
      where: {
        id: imageId,
        productId: product.id,
      },
    });

    if (!existingImage) {
      return NextResponse.json(
        { error: 'Image not found' },
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
    if (body.isPrimary && !existingImage.isPrimary) {
      await prisma.productImage.updateMany({
        where: {
          productId: product.id,
          NOT: { id: imageId },
        },
        data: { isPrimary: false },
      });
    }

    // Update the image
    const image = await prisma.productImage.update({
      where: { id: imageId },
      data: {
        variantId: body.variantId !== undefined ? (body.variantId || null) : existingImage.variantId,
        imageUrl: body.imageUrl !== undefined ? body.imageUrl : existingImage.imageUrl,
        altText: body.altText !== undefined ? (body.altText || null) : existingImage.altText,
        displayOrder: body.displayOrder !== undefined ? body.displayOrder : existingImage.displayOrder,
        isPrimary: body.isPrimary !== undefined ? body.isPrimary : existingImage.isPrimary,
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

    return NextResponse.json(image);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/products/[id]/images/[imageId]
 * Delete an image (Admin only)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request);
    const { id: productId, imageId } = await params;

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

    // Check if image exists
    const image = await prisma.productImage.findFirst({
      where: {
        id: imageId,
        productId: product.id,
      },
    });

    if (!image) {
      return NextResponse.json(
        { error: 'Image not found' },
        { status: 404 }
      );
    }

    // Delete the image
    await prisma.productImage.delete({
      where: { id: imageId },
    });

    // If this was the primary image, set the next image as primary
    if (image.isPrimary) {
      const nextImage = await prisma.productImage.findFirst({
        where: { productId: product.id },
        orderBy: { displayOrder: 'asc' },
      });
      if (nextImage) {
        await prisma.productImage.update({
          where: { id: nextImage.id },
          data: { isPrimary: true },
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
