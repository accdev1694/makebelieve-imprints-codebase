import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, handleApiError } from '@/lib/server/auth';
import {
  isIssuingEnabled,
  listVirtualCards,
  createVirtualCard,
  createCardholder,
  getIssuingStatus,
} from '@/lib/server/stripe-issuing-service';

/**
 * GET /api/admin/purchasing/cards
 * List all virtual cards
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);

    const enabled = await isIssuingEnabled();
    if (!enabled) {
      return NextResponse.json({
        success: true,
        data: {
          enabled: false,
          message: 'Stripe Issuing is not enabled for this account. Please contact support to enable it.',
          cards: [],
        },
      });
    }

    const { cards } = await listVirtualCards();
    const status = await getIssuingStatus();

    return NextResponse.json({
      success: true,
      data: {
        enabled: true,
        cards,
        summary: status,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/admin/purchasing/cards
 * Create a new virtual card
 */
export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);

    const enabled = await isIssuingEnabled();
    if (!enabled) {
      return NextResponse.json(
        { error: 'Stripe Issuing is not enabled for this account' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { name, spendingLimit, cardholderId } = body;

    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { error: 'Card name is required' },
        { status: 400 }
      );
    }

    if (!spendingLimit || typeof spendingLimit !== 'number' || spendingLimit <= 0) {
      return NextResponse.json(
        { error: 'Valid spending limit is required' },
        { status: 400 }
      );
    }

    // If no cardholder provided, create one for the admin
    let holderId = cardholderId;
    if (!holderId) {
      // Get admin user details
      const { prisma } = await import('@/lib/prisma');
      const adminUser = await prisma.user.findUnique({
        where: { id: admin.userId },
        select: { id: true, email: true, name: true },
      });

      if (!adminUser) {
        return NextResponse.json(
          { error: 'Admin user not found' },
          { status: 404 }
        );
      }

      const cardholderResult = await createCardholder(adminUser);
      if (!cardholderResult.success) {
        return NextResponse.json(
          { error: cardholderResult.error || 'Failed to create cardholder' },
          { status: 400 }
        );
      }
      holderId = cardholderResult.cardholderId;
    }

    const result = await createVirtualCard(
      holderId!,
      admin.userId,
      name,
      spendingLimit
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to create virtual card' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.card,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
