import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, handleApiError } from '@/lib/server/auth';
import { getPointsHistory, getUserPoints } from '@/lib/server/points-service';

/**
 * GET /api/users/points/history
 * Get user's points transaction history
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    const [transactions, currentBalance] = await Promise.all([
      getPointsHistory(user.userId, limit),
      getUserPoints(user.userId),
    ]);

    // Format transactions for display
    const formattedTransactions = transactions.map(tx => ({
      id: tx.id,
      amount: tx.amount,
      type: tx.type,
      description: getTransactionDescription(tx.type, tx.amount),
      createdAt: tx.createdAt,
    }));

    return NextResponse.json({
      success: true,
      data: {
        transactions: formattedTransactions,
        currentBalance,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

function getTransactionDescription(type: string, amount: number): string {
  switch (type) {
    case 'REVIEW_REWARD':
      return 'Earned for leaving a review';
    case 'CHECKOUT_REDEMPTION':
      return `Redeemed for £${Math.abs(amount / 100).toFixed(2)} discount`;
    case 'ADMIN_ADJUSTMENT':
      return amount > 0 ? 'Points credited by admin' : 'Points deducted by admin';
    case 'PURCHASE_REWARD':
      return 'Earned from purchase';
    default:
      return amount > 0 ? 'Points earned' : 'Points spent';
  }
}
