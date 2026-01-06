import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, handleApiError } from '@/lib/server/auth';
import { listExpenses, createExpense } from '@/lib/server/expense-service';

/**
 * GET /api/admin/accounting/expenses
 * List expenses with filtering and pagination
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);

    const { searchParams } = new URL(request.url);
    const result = await listExpenses({
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '20'),
      category: searchParams.get('category') || undefined,
      taxYear: searchParams.get('taxYear') || undefined,
      supplierId: searchParams.get('supplierId') || undefined,
      search: searchParams.get('search') || undefined,
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      sortOrder: searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc',
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('List expenses error:', error);
    return handleApiError(error);
  }
}

/**
 * POST /api/admin/accounting/expenses
 * Create a new expense
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request);

    const body = await request.json();
    const result = await createExpense({
      description: body.description,
      amount: body.amount,
      category: body.category,
      purchaseDate: new Date(body.purchaseDate),
      supplierId: body.supplierId,
      receiptUrl: body.receiptUrl,
      notes: body.notes,
      vatAmount: body.vatAmount,
      vatRate: body.vatRate,
      isVatReclaimable: body.isVatReclaimable,
      externalReference: body.externalReference,
    });

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: result.data });
  } catch (error) {
    console.error('Create expense error:', error);
    return handleApiError(error);
  }
}
