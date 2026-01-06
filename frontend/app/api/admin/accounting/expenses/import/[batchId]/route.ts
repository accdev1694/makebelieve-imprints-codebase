import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, handleApiError } from '@/lib/server/auth';
import { getImportBatch, deleteImportBatch } from '@/lib/server/expense-service';

interface RouteParams {
  params: Promise<{ batchId: string }>;
}

/**
 * GET /api/admin/accounting/expenses/import/[batchId]
 * Get import batch details with imported expenses
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request);
    const { batchId } = await params;

    const result = await getImportBatch(batchId);

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: result.data });
  } catch (error) {
    console.error('Get import batch error:', error);
    return handleApiError(error);
  }
}

/**
 * DELETE /api/admin/accounting/expenses/import/[batchId]
 * Delete import batch and optionally all imported expenses
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request);
    const { batchId } = await params;

    const { searchParams } = new URL(request.url);
    const deleteExpenses = searchParams.get('deleteExpenses') === 'true';

    const result = await deleteImportBatch(batchId, deleteExpenses);

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: result.data?.message });
  } catch (error) {
    console.error('Delete import batch error:', error);
    return handleApiError(error);
  }
}
