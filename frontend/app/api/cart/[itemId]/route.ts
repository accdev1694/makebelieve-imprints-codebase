import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth, handleApiError } from '@/lib/server/auth';

/**
 * PUT /api/cart/[itemId]
 * Update cart item quantity
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { itemId } = await params;
    const body = await request.json();

    const { quantity } = body;

    if (typeof quantity !== 'number' || quantity < 0) {
      return NextResponse.json(
        { success: false, error: 'Valid quantity is required' },
        { status: 400 }
      );
    }

    // Find the cart item (must belong to user)
    const existingItem = await prisma.cartItem.findFirst({
      where: {
        id: itemId,
        userId: user.userId,
      },
    });

    if (!existingItem) {
      return NextResponse.json(
        { success: false, error: 'Cart item not found' },
        { status: 404 }
      );
    }

    // If quantity is 0, delete the item
    if (quantity === 0) {
      await prisma.cartItem.delete({
        where: { id: itemId },
      });

      return NextResponse.json({
        success: true,
        data: { deleted: true },
      });
    }

    // Update quantity
    const updatedItem = await prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            images: {
              select: { imageUrl: true },
              take: 1,
              orderBy: { displayOrder: 'asc' },
            },
          },
        },
        variant: {
          select: {
            id: true,
            name: true,
            size: true,
            color: true,
            material: true,
            finish: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        item: {
          id: updatedItem.id,
          productId: updatedItem.productId,
          productName: updatedItem.product.name,
          productSlug: updatedItem.product.slug,
          productImage: updatedItem.product.images[0]?.imageUrl || '/placeholder.jpg',
          variantId: updatedItem.variantId || undefined,
          variantName: updatedItem.variant?.name || undefined,
          size: updatedItem.variant?.size || undefined,
          color: updatedItem.variant?.color || undefined,
          material: updatedItem.variant?.material || undefined,
          finish: updatedItem.variant?.finish || undefined,
          quantity: updatedItem.quantity,
          unitPrice: Number(updatedItem.unitPrice),
          customization: updatedItem.customization as object | undefined,
          addedAt: updatedItem.addedAt.toISOString(),
        },
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/cart/[itemId]
 * Remove item from cart
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { itemId } = await params;

    // Find and delete the cart item (must belong to user)
    const existingItem = await prisma.cartItem.findFirst({
      where: {
        id: itemId,
        userId: user.userId,
      },
    });

    if (!existingItem) {
      return NextResponse.json(
        { success: false, error: 'Cart item not found' },
        { status: 404 }
      );
    }

    await prisma.cartItem.delete({
      where: { id: itemId },
    });

    return NextResponse.json({
      success: true,
      data: { deleted: true },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
