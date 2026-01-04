import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth, handleApiError } from '@/lib/server/auth';

/**
 * DELETE /api/cart/clear
 * Clear all items from user's cart
 * Used after successful checkout
 */
export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth(request);

    await prisma.cartItem.deleteMany({
      where: { userId: user.userId },
    });

    return NextResponse.json({
      success: true,
      data: { cleared: true },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
