import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, handleApiError } from '@/lib/server/auth';
import { getIncome, updateIncome, deleteIncome } from '@/lib/server/expense-service';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/accounting/income/[id]
 * Get a single income entry by ID
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request);
    const { id } = await params;

    const result = await getIncome(id);

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: result.data });
  } catch (error) {
    console.error('Get income error:', error);
    return handleApiError(error);
  }
}

/**
 * PUT /api/admin/accounting/income/[id]
 * Update an income entry
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request);
    const { id } = await params;

    const body = await request.json();
    const result = await updateIncome(id, {
      description: body.description,
      amount: body.amount !== undefined ? parseFloat(body.amount) : undefined,
      category: body.category,
      source: body.source,
      customerName: body.customerName,
      incomeDate: body.incomeDate ? new Date(body.incomeDate) : undefined,
      vatAmount: body.vatAmount !== undefined ? parseFloat(body.vatAmount) : undefined,
      vatRate: body.vatRate !== undefined ? parseFloat(body.vatRate) : undefined,
      isVatIncluded: body.isVatIncluded,
      externalReference: body.externalReference,
      notes: body.notes,
      receiptUrl: body.receiptUrl,
    });

    if (!result.success) {
      const status = result.error === 'Income entry not found' ? 404 : 400;
      return NextResponse.json({ success: false, error: result.error }, { status });
    }

    return NextResponse.json({ success: true, data: result.data });
  } catch (error) {
    console.error('Update income error:', error);
    return handleApiError(error);
  }
}

/**
 * DELETE /api/admin/accounting/income/[id]
 * Delete an income entry
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request);
    const { id } = await params;

    const result = await deleteIncome(id);

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Income entry deleted successfully' });
  } catch (error) {
    console.error('Delete income error:', error);
    return handleApiError(error);
  }
}
