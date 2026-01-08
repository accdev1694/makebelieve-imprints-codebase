import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/server/auth';
import { prisma } from '@/lib/prisma';
import { disconnectWiseAccount, syncWiseTransactions } from '@/lib/server/wise-service';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/wise/accounts/[id]
 * Get account details with balances and recent transactions
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    await requireAdmin(request);

    const { id } = await context.params;

    const account = await prisma.wiseAccount.findUnique({
      where: { id },
      include: {
        balances: true,
        transactions: {
          take: 20,
          orderBy: { transactionDate: 'desc' },
          include: {
            expense: {
              select: {
                id: true,
                expenseNumber: true,
                category: true,
              },
            },
          },
        },
        _count: {
          select: { transactions: true },
        },
      },
    });

    if (!account) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      );
    }

    // Hide API token from response
    const { apiToken: _, ...safeAccount } = account;

    return NextResponse.json({
      success: true,
      data: { account: safeAccount },
    });
  } catch (error) {
    console.error('Get Wise account error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch account' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/wise/accounts/[id]
 * Update account settings
 */
export async function PUT(
  request: NextRequest,
  context: RouteContext
) {
  try {
    await requireAdmin(request);

    const { id } = await context.params;

    const body = await request.json();
    const { syncFrequency, autoCreateExpense, isActive } = body;

    const account = await prisma.wiseAccount.update({
      where: { id },
      data: {
        ...(syncFrequency !== undefined && { syncFrequency }),
        ...(autoCreateExpense !== undefined && { autoCreateExpense }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    // Hide API token from response
    const { apiToken: _, ...safeAccount } = account;

    return NextResponse.json({
      success: true,
      data: { account: safeAccount },
    });
  } catch (error) {
    console.error('Update Wise account error:', error);
    return NextResponse.json(
      { error: 'Failed to update account' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/wise/accounts/[id]
 * Disconnect Wise account
 */
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    await requireAdmin(request);

    const { id } = await context.params;

    const result = await disconnectWiseAccount(id);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Account disconnected',
    });
  } catch (error) {
    console.error('Disconnect Wise account error:', error);
    return NextResponse.json(
      { error: 'Failed to disconnect account' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/wise/accounts/[id]
 * Trigger manual sync for account
 */
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    await requireAdmin(request);

    const { id } = await context.params;

    const body = await request.json().catch(() => ({}));
    const { startDate, endDate } = body;

    const result = await syncWiseTransactions(id, {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });

    return NextResponse.json({
      success: result.success,
      data: {
        synced: result.synced,
        skipped: result.skipped,
        errors: result.errors,
      },
    });
  } catch (error) {
    console.error('Sync Wise account error:', error);
    return NextResponse.json(
      { error: 'Failed to sync account' },
      { status: 500 }
    );
  }
}
