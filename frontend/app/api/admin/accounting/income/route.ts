import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, handleApiError } from '@/lib/server/auth';
import { listIncome, createIncome } from '@/lib/server/expense-service';
import { parsePagination } from '@/lib/formatters';

/**
 * GET /api/admin/accounting/income
 * List income entries with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);

    const { searchParams } = new URL(request.url);
    const { page, limit } = parsePagination(searchParams);
    const result = await listIncome({
      page,
      limit,
      category: searchParams.get('category') || undefined,
      taxYear: searchParams.get('taxYear') || undefined,
      source: searchParams.get('source') || undefined,
      search: searchParams.get('search') || undefined,
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      sortOrder: searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc',
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('List income error:', error);
    return handleApiError(error);
  }
}

/**
 * POST /api/admin/accounting/income
 * Create a new income entry
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request);

    const body = await request.json();
    const result = await createIncome({
      description: body.description,
      amount: parseFloat(body.amount),
      category: body.category,
      source: body.source,
      customerName: body.customerName,
      incomeDate: body.incomeDate ? new Date(body.incomeDate) : undefined,
      vatAmount: body.vatAmount ? parseFloat(body.vatAmount) : undefined,
      vatRate: body.vatRate ? parseFloat(body.vatRate) : undefined,
      isVatIncluded: body.isVatIncluded,
      externalReference: body.externalReference,
      notes: body.notes,
      receiptUrl: body.receiptUrl,
    });

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: result.data });
  } catch (error) {
    console.error('Create income error:', error);
    return handleApiError(error);
  }
}
