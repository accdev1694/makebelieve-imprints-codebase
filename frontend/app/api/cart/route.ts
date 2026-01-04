import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth, handleApiError } from '@/lib/server/auth';

interface CartItemResponse {
  id: string;
  productId: string;
  productName: string;
  productSlug: string;
  productImage: string;
  variantId?: string;
  variantName?: string;
  size?: string;
  color?: string;
  material?: string;
  finish?: string;
  quantity: number;
  unitPrice: number;
  customization?: object;
  addedAt: string;
}

function transformCartItem(item: {
  id: string;
  productId: string;
  variantId: string | null;
  quantity: number;
  unitPrice: unknown;
  customization: unknown;
  addedAt: Date;
  product: {
    id: string;
    name: string;
    slug: string;
    images: { imageUrl: string }[];
  };
  variant: {
    id: string;
    name: string;
    size: string | null;
    color: string | null;
    material: string | null;
    finish: string | null;
  } | null;
}): CartItemResponse {
  return {
    id: item.id,
    productId: item.productId,
    productName: item.product.name,
    productSlug: item.product.slug,
    productImage: item.product.images[0]?.imageUrl || '/placeholder.jpg',
    variantId: item.variantId || undefined,
    variantName: item.variant?.name || undefined,
    size: item.variant?.size || undefined,
    color: item.variant?.color || undefined,
    material: item.variant?.material || undefined,
    finish: item.variant?.finish || undefined,
    quantity: item.quantity,
    unitPrice: Number(item.unitPrice),
    customization: item.customization as object | undefined,
    addedAt: item.addedAt.toISOString(),
  };
}

/**
 * GET /api/cart
 * Get user's cart with product details
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);

    const cartItems = await prisma.cartItem.findMany({
      where: { userId: user.userId },
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
      orderBy: { addedAt: 'desc' },
    });

    const items = cartItems.map(transformCartItem);

    return NextResponse.json({
      success: true,
      data: { items },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/cart
 * Add item to cart
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const body = await request.json();

    const { productId, variantId, quantity = 1, unitPrice, customization } = body;

    if (!productId) {
      return NextResponse.json(
        { success: false, error: 'productId is required' },
        { status: 400 }
      );
    }

    if (typeof unitPrice !== 'number' || unitPrice < 0) {
      return NextResponse.json(
        { success: false, error: 'Valid unitPrice is required' },
        { status: 400 }
      );
    }

    // Check if product exists
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        images: {
          select: { imageUrl: true },
          take: 1,
          orderBy: { displayOrder: 'asc' },
        },
      },
    });

    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      );
    }

    if (product.status !== 'ACTIVE') {
      return NextResponse.json(
        { success: false, error: 'Product is not available' },
        { status: 400 }
      );
    }

    // Check if variant exists (if specified)
    let variant = null;
    if (variantId) {
      variant = await prisma.productVariant.findUnique({
        where: { id: variantId },
        select: {
          id: true,
          name: true,
          size: true,
          color: true,
          material: true,
          finish: true,
        },
      });
      if (!variant) {
        return NextResponse.json(
          { success: false, error: 'Variant not found' },
          { status: 404 }
        );
      }
    }

    // Upsert - if same product+variant exists, update quantity
    const existingItem = await prisma.cartItem.findFirst({
      where: {
        userId: user.userId,
        productId,
        variantId: variantId || null,
      },
    });

    let cartItem;
    if (existingItem) {
      // Update quantity
      cartItem = await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: {
          quantity: existingItem.quantity + quantity,
          unitPrice,
          customization: customization || existingItem.customization,
        },
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
    } else {
      // Create new item
      cartItem = await prisma.cartItem.create({
        data: {
          userId: user.userId,
          productId,
          variantId: variantId || null,
          quantity,
          unitPrice,
          customization: customization || undefined,
        },
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
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          item: transformCartItem(cartItem),
        },
      },
      { status: existingItem ? 200 : 201 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}
