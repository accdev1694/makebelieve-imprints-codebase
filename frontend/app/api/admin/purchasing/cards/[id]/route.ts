import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, handleApiError } from '@/lib/server/auth';
import {
  getCardDetails,
  freezeCard,
  unfreezeCard,
  cancelCard,
  updateSpendingLimit,
  getCardTransactions,
} from '@/lib/server/stripe-issuing-service';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/purchasing/cards/[id]
 * Get card details and transactions
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request);
    const { id } = await params;

    const cardResult = await getCardDetails(id);
    if (!cardResult.success) {
      return NextResponse.json(
        { error: cardResult.error || 'Card not found' },
        { status: 404 }
      );
    }

    const transactionsResult = await getCardTransactions(id);

    return NextResponse.json({
      success: true,
      data: {
        card: cardResult.card,
        transactions: transactionsResult.transactions,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PUT /api/admin/purchasing/cards/[id]
 * Update card (freeze/unfreeze, update spending limit)
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request);
    const { id } = await params;

    const body = await request.json();
    const { action, spendingLimit } = body;

    let result;

    switch (action) {
      case 'freeze':
        result = await freezeCard(id);
        break;
      case 'unfreeze':
        result = await unfreezeCard(id);
        break;
      case 'cancel':
        result = await cancelCard(id);
        break;
      case 'updateLimit':
        if (!spendingLimit || typeof spendingLimit !== 'number') {
          return NextResponse.json(
            { error: 'Valid spending limit is required' },
            { status: 400 }
          );
        }
        result = await updateSpendingLimit(id, spendingLimit);
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: freeze, unfreeze, cancel, or updateLimit' },
          { status: 400 }
        );
    }

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Operation failed' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Card ${action} successful`,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
