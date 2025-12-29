import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin, handleApiError } from '@/lib/server/auth';

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

    const batch = await prisma.expenseImportBatch.findUnique({
      where: { id: batchId },
    });

    if (!batch) {
      return NextResponse.json(
        { success: false, error: 'Import batch not found' },
        { status: 404 }
      );
    }

    // Get expenses imported in this batch
    const expenses = await prisma.expense.findMany({
      where: { importBatchId: batchId },
      include: {
        supplier: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({
      success: true,
      data: {
        batch: {
          ...batch,
          errors: batch.errors || [],
        },
        expenses: expenses.map(e => ({
          ...e,
          amount: Number(e.amount),
          vatAmount: e.vatAmount ? Number(e.vatAmount) : null,
          vatRate: e.vatRate ? Number(e.vatRate) : null,
        })),
      },
    });
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

    const batch = await prisma.expenseImportBatch.findUnique({
      where: { id: batchId },
    });

    if (!batch) {
      return NextResponse.json(
        { success: false, error: 'Import batch not found' },
        { status: 404 }
      );
    }

    // Delete associated expenses if requested
    if (deleteExpenses) {
      await prisma.expense.deleteMany({
        where: { importBatchId: batchId },
      });
    } else {
      // Just unlink expenses from batch
      await prisma.expense.updateMany({
        where: { importBatchId: batchId },
        data: { importBatchId: null },
      });
    }

    // Delete the batch
    await prisma.expenseImportBatch.delete({
      where: { id: batchId },
    });

    return NextResponse.json({
      success: true,
      message: deleteExpenses
        ? 'Import batch and expenses deleted successfully'
        : 'Import batch deleted, expenses preserved',
    });
  } catch (error) {
    console.error('Delete import batch error:', error);
    return handleApiError(error);
  }
}
