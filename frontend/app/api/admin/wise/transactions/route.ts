import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/server/auth';
import { getWiseTransactions } from '@/lib/server/wise-service';

/**
 * GET /api/admin/wise/transactions
 * List Wise transactions with filtering
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);

    const searchParams = request.nextUrl.searchParams;
    const accountId = searchParams.get('accountId') || undefined;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const type = searchParams.get('type') || undefined;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const { transactions, total } = await getWiseTransactions({
      accountId,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      type,
      limit,
      offset,
    });

    return NextResponse.json({
      success: true,
      data: {
        transactions,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + transactions.length < total,
        },
      },
    });
  } catch (error) {
    console.error('Get Wise transactions error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transactions' },
      { status: 500 }
    );
  }
}
