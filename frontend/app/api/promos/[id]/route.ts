import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin, handleApiError } from '@/lib/server/auth';
import { DiscountType, PromoScope } from '@prisma/client';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/promos/[id] - Get promo details (admin only)
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request);
    const { id } = await params;

    const promo = await prisma.promo.findUnique({
      where: { id },
      include: {
        usages: {
          take: 10,
          orderBy: { usedAt: 'desc' },
          select: {
            id: true,
            userId: true,
            email: true,
            orderId: true,
            discountAmount: true,
            usedAt: true,
          },
        },
        _count: {
          select: { usages: true },
        },
      },
    });

    if (!promo) {
      return NextResponse.json(
        { error: 'Promo not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ promo });
  } catch (error) {
    return handleApiError(error);
  }
}

// PUT /api/promos/[id] - Update promo (admin only)
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request);
    const { id } = await params;

    const body = await request.json();
    const {
      code,
      name,
      description,
      discountType,
      discountValue,
      scope,
      categoryId,
      subcategoryId,
      productIds,
      startsAt,
      expiresAt,
      maxUses,
      maxUsesPerUser,
      minOrderAmount,
      isActive,
    } = body;

    // Check if promo exists
    const existing = await prisma.promo.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Promo not found' },
        { status: 404 }
      );
    }

    // If changing code, check it doesn't already exist
    if (code && code.toUpperCase() !== existing.code) {
      const codeExists = await prisma.promo.findUnique({
        where: { code: code.toUpperCase() },
      });
      if (codeExists) {
        return NextResponse.json(
          { error: 'A promo with this code already exists' },
          { status: 400 }
        );
      }
    }

    // Validate percentage range if updating
    if (discountType === 'PERCENTAGE' && discountValue !== undefined) {
      if (discountValue < 0 || discountValue > 100) {
        return NextResponse.json(
          { error: 'Percentage discount must be between 0 and 100' },
          { status: 400 }
        );
      }
    }

    const updateData: Record<string, unknown> = {};

    if (code !== undefined) updateData.code = code.toUpperCase();
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (discountType !== undefined) updateData.discountType = discountType as DiscountType;
    if (discountValue !== undefined) updateData.discountValue = discountValue;
    if (scope !== undefined) updateData.scope = scope as PromoScope;
    if (categoryId !== undefined) updateData.categoryId = categoryId;
    if (subcategoryId !== undefined) updateData.subcategoryId = subcategoryId;
    if (productIds !== undefined) updateData.productIds = productIds;
    if (startsAt !== undefined) updateData.startsAt = startsAt ? new Date(startsAt) : null;
    if (expiresAt !== undefined) updateData.expiresAt = expiresAt ? new Date(expiresAt) : null;
    if (maxUses !== undefined) updateData.maxUses = maxUses;
    if (maxUsesPerUser !== undefined) updateData.maxUsesPerUser = maxUsesPerUser;
    if (minOrderAmount !== undefined) updateData.minOrderAmount = minOrderAmount;
    if (isActive !== undefined) updateData.isActive = isActive;

    const promo = await prisma.promo.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ promo });
  } catch (error) {
    return handleApiError(error);
  }
}

// DELETE /api/promos/[id] - Delete promo (admin only)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request);
    const { id } = await params;

    const existing = await prisma.promo.findUnique({
      where: { id },
      include: {
        _count: { select: { usages: true } },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Promo not found' },
        { status: 404 }
      );
    }

    // Warn if promo has been used
    if (existing._count.usages > 0) {
      // Soft delete by deactivating instead
      await prisma.promo.update({
        where: { id },
        data: { isActive: false },
      });

      return NextResponse.json({
        message: 'Promo has been deactivated (has usage history)',
        deactivated: true,
      });
    }

    // Hard delete if never used
    await prisma.promo.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Promo deleted successfully' });
  } catch (error) {
    return handleApiError(error);
  }
}
