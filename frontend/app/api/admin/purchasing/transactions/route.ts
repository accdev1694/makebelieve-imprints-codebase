import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, handleApiError } from '@/lib/server/auth';
import { getAllTransactions } from '@/lib/server/stripe-issuing-service';

/**
 * GET /api/admin/purchasing/transactions
 * List all transactions across all cards
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);

    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const result = await getAllTransactions(limit);

    return NextResponse.json({
      success: true,
      data: {
        transactions: result.transactions,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
