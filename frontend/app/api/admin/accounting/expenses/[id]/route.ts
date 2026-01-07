import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, handleApiError } from '@/lib/server/auth';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/accounting/expenses/[id]
 * Get a single expense by ID
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request);
    const { id } = await params;

    const { getExpense } = await import('@/lib/server/expense-service');
    const result = await getExpense(id);

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: result.data });
  } catch (error) {
    console.error('Get expense error:', error);
    return handleApiError(error);
  }
}

/**
 * PUT /api/admin/accounting/expenses/[id]
 * Update an expense
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request);
    const { id } = await params;

    const { updateExpense } = await import('@/lib/server/expense-service');
    const body = await request.json();
    const result = await updateExpense(id, {
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
      const status = result.error === 'Expense not found' ? 404 : 400;
      return NextResponse.json({ success: false, error: result.error }, { status });
    }

    return NextResponse.json({ success: true, data: result.data });
  } catch (error) {
    console.error('Update expense error:', error);
    return handleApiError(error);
  }
}

/**
 * DELETE /api/admin/accounting/expenses/[id]
 * Delete an expense
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request);
    const { id } = await params;

    const { deleteExpense } = await import('@/lib/server/expense-service');
    const result = await deleteExpense(id);

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Expense deleted successfully' });
  } catch (error) {
    console.error('Delete expense error:', error);
    return handleApiError(error);
  }
}
