import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin, handleApiError } from '@/lib/server/auth';
import { DiscountType, PromoScope } from '@prisma/client';

// GET /api/promos - List all promos (admin only)
export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status'); // active, expired, upcoming
    const search = searchParams.get('search');

    const where: Record<string, unknown> = {};

    // Filter by status
    const now = new Date();
    if (status === 'active') {
      where.isActive = true;
      where.OR = [
        { expiresAt: null },
        { expiresAt: { gt: now } },
      ];
      where.AND = [
        {
          OR: [
            { startsAt: null },
            { startsAt: { lte: now } },
          ],
        },
      ];
    } else if (status === 'expired') {
      where.expiresAt = { lt: now };
    } else if (status === 'upcoming') {
      where.startsAt = { gt: now };
    } else if (status === 'inactive') {
      where.isActive = false;
    }

    // Search by code or name
    if (search) {
      where.OR = [
        { code: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [promos, total] = await Promise.all([
      prisma.promo.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          _count: {
            select: { usages: true },
          },
        },
      }),
      prisma.promo.count({ where }),
    ]);

    // Get stats
    const [activeCount, expiredCount, totalUsages] = await Promise.all([
      prisma.promo.count({
        where: {
          isActive: true,
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: now } },
          ],
        },
      }),
      prisma.promo.count({
        where: { expiresAt: { lt: now } },
      }),
      prisma.promoUsage.count(),
    ]);

    return NextResponse.json({
      promos,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      stats: {
        active: activeCount,
        expired: expiredCount,
        totalUsages,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/promos - Create a new promo (admin only)
export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request);

    const body = await request.json();
    const {
      code,
      name,
      description,
      discountType,
      discountValue,
      scope = 'ALL_PRODUCTS',
      categoryId,
      subcategoryId,
      productIds,
      startsAt,
      expiresAt,
      maxUses,
      maxUsesPerUser = 1,
      minOrderAmount,
      isActive = true,
    } = body;

    // Validate required fields
    if (!code || !name || !discountType || discountValue === undefined) {
      return NextResponse.json(
        { error: 'Code, name, discount type, and discount value are required' },
        { status: 400 }
      );
    }

    // Validate discount type
    if (!['PERCENTAGE', 'FIXED_AMOUNT'].includes(discountType)) {
      return NextResponse.json(
        { error: 'Invalid discount type. Must be PERCENTAGE or FIXED_AMOUNT' },
        { status: 400 }
      );
    }

    // Validate percentage range
    if (discountType === 'PERCENTAGE' && (discountValue < 0 || discountValue > 100)) {
      return NextResponse.json(
        { error: 'Percentage discount must be between 0 and 100' },
        { status: 400 }
      );
    }

    // Check if code already exists
    const existing = await prisma.promo.findUnique({
      where: { code: code.toUpperCase() },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'A promo with this code already exists' },
        { status: 400 }
      );
    }

    // Validate scope requirements
    if (scope === 'CATEGORY' && !categoryId) {
      return NextResponse.json(
        { error: 'Category ID is required for category-scoped promos' },
        { status: 400 }
      );
    }

    if (scope === 'SUBCATEGORY' && !subcategoryId) {
      return NextResponse.json(
        { error: 'Subcategory ID is required for subcategory-scoped promos' },
        { status: 400 }
      );
    }

    if (scope === 'SPECIFIC_PRODUCTS' && (!productIds || productIds.length === 0)) {
      return NextResponse.json(
        { error: 'Product IDs are required for product-specific promos' },
        { status: 400 }
      );
    }

    const promo = await prisma.promo.create({
      data: {
        code: code.toUpperCase(),
        name,
        description,
        discountType: discountType as DiscountType,
        discountValue,
        scope: scope as PromoScope,
        categoryId,
        subcategoryId,
        productIds: productIds || [],
        startsAt: startsAt ? new Date(startsAt) : null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        maxUses,
        maxUsesPerUser,
        minOrderAmount,
        isActive,
      },
    });

    return NextResponse.json({ promo }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
