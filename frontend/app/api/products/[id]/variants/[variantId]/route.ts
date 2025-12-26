import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin, handleApiError } from '@/lib/server/auth';

interface RouteParams {
  params: Promise<{ id: string; variantId: string }>;
}

/**
 * GET /api/products/[id]/variants/[variantId]
 * Get a single variant
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: productId, variantId } = await params;

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

    const variant = await prisma.productVariant.findFirst({
      where: {
        id: variantId,
        productId: product.id,
      },
      include: {
        images: {
          orderBy: { displayOrder: 'asc' },
        },
      },
    });

    if (!variant) {
      return NextResponse.json(
        { error: 'Variant not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(variant);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PUT /api/products/[id]/variants/[variantId]
 * Update a variant (Admin only)
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request);
    const { id: productId, variantId } = await params;
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

    // Check if variant exists
    const existingVariant = await prisma.productVariant.findFirst({
      where: {
        id: variantId,
        productId: product.id,
      },
    });

    if (!existingVariant) {
      return NextResponse.json(
        { error: 'Variant not found' },
        { status: 404 }
      );
    }

    // Check for duplicate SKU if changed
    if (body.sku && body.sku !== existingVariant.sku) {
      const existingSku = await prisma.productVariant.findFirst({
        where: {
          sku: body.sku,
          NOT: { id: variantId },
        },
      });
      if (existingSku) {
        return NextResponse.json(
          { error: 'SKU already exists' },
          { status: 400 }
        );
      }
    }

    // If this is set as default, unset other defaults
    if (body.isDefault && !existingVariant.isDefault) {
      await prisma.productVariant.updateMany({
        where: {
          productId: product.id,
          NOT: { id: variantId },
        },
        data: { isDefault: false },
      });
    }

    // Update the variant
    const variant = await prisma.productVariant.update({
      where: { id: variantId },
      data: {
        name: body.name !== undefined ? body.name : existingVariant.name,
        sku: body.sku !== undefined ? (body.sku || null) : existingVariant.sku,
        size: body.size !== undefined ? (body.size || null) : existingVariant.size,
        material: body.material !== undefined ? (body.material || null) : existingVariant.material,
        color: body.color !== undefined ? (body.color || null) : existingVariant.color,
        finish: body.finish !== undefined ? (body.finish || null) : existingVariant.finish,
        dimensions: body.dimensions !== undefined ? body.dimensions : existingVariant.dimensions,
        price: body.price !== undefined ? body.price : existingVariant.price,
        stock: body.stock !== undefined ? body.stock : existingVariant.stock,
        isDefault: body.isDefault !== undefined ? body.isDefault : existingVariant.isDefault,
        metadata: body.metadata !== undefined ? body.metadata : existingVariant.metadata,
      },
      include: {
        images: true,
      },
    });

    return NextResponse.json(variant);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/products/[id]/variants/[variantId]
 * Delete a variant (Admin only)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request);
    const { id: productId, variantId } = await params;

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

    // Check if variant exists
    const variant = await prisma.productVariant.findFirst({
      where: {
        id: variantId,
        productId: product.id,
      },
    });

    if (!variant) {
      return NextResponse.json(
        { error: 'Variant not found' },
        { status: 404 }
      );
    }

    // Check if variant is used in any orders
    const orderItemCount = await prisma.orderItem.count({
      where: { variantId },
    });

    if (orderItemCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete variant. It is used in ${orderItemCount} order(s).` },
        { status: 400 }
      );
    }

    // Delete variant (images will cascade delete)
    await prisma.productVariant.delete({
      where: { id: variantId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
