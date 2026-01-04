import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth, handleApiError } from '@/lib/server/auth';

/**
 * GET /api/wishlist
 * Get user's wishlist with product details
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);

    const wishlistItems = await prisma.wishlistItem.findMany({
      where: { userId: user.userId },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            basePrice: true,
            status: true,
            images: {
              select: { imageUrl: true },
              take: 1,
              orderBy: { displayOrder: 'asc' },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Transform to frontend format
    const items = wishlistItems.map((item) => ({
      id: item.id,
      productId: item.productId,
      createdAt: item.createdAt.toISOString(),
      product: {
        id: item.product.id,
        name: item.product.name,
        slug: item.product.slug,
        price: Number(item.product.basePrice),
        image: item.product.images[0]?.imageUrl || '/placeholder.jpg',
        status: item.product.status,
      },
    }));

    return NextResponse.json({
      success: true,
      data: { items },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/wishlist
 * Add item to wishlist
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const body = await request.json();

    const { productId } = body;

    if (!productId) {
      return NextResponse.json(
        { success: false, error: 'productId is required' },
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
        basePrice: true,
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

    // Upsert to handle duplicates gracefully
    const wishlistItem = await prisma.wishlistItem.upsert({
      where: {
        userId_productId: {
          userId: user.userId,
          productId,
        },
      },
      update: {},
      create: {
        userId: user.userId,
        productId,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          item: {
            id: wishlistItem.id,
            productId: wishlistItem.productId,
            createdAt: wishlistItem.createdAt.toISOString(),
            product: {
              id: product.id,
              name: product.name,
              slug: product.slug,
              price: Number(product.basePrice),
              image: product.images[0]?.imageUrl || '/placeholder.jpg',
              status: product.status,
            },
          },
        },
      },
      { status: 201 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}
