import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin, handleApiError } from '@/lib/server/auth';
import { getTaxYearForDate, EXPENSE_CATEGORY_LABELS } from '@/lib/server/tax-utils';

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

    const expense = await prisma.expense.findUnique({
      where: { id },
      include: {
        supplier: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!expense) {
      return NextResponse.json(
        { success: false, error: 'Expense not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        ...expense,
        amount: Number(expense.amount),
        vatAmount: expense.vatAmount ? Number(expense.vatAmount) : null,
        vatRate: expense.vatRate ? Number(expense.vatRate) : null,
        categoryLabel: EXPENSE_CATEGORY_LABELS[expense.category] || expense.category,
      },
    });
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

    const existing = await prisma.expense.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Expense not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const {
      description,
      amount,
      category,
      purchaseDate,
      supplierId,
      receiptUrl,
      notes,
      vatAmount,
      vatRate,
      isVatReclaimable,
      externalReference,
    } = body;

    // Validation
    if (!description || !amount || !category || !purchaseDate) {
      return NextResponse.json(
        { success: false, error: 'Description, amount, category, and purchase date are required' },
        { status: 400 }
      );
    }

    if (amount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Amount must be greater than 0' },
        { status: 400 }
      );
    }

    // Validate category
    if (!EXPENSE_CATEGORY_LABELS[category]) {
      return NextResponse.json(
        { success: false, error: 'Invalid expense category' },
        { status: 400 }
      );
    }

    // Recalculate tax year if purchase date changed
    const taxYear = getTaxYearForDate(new Date(purchaseDate));

    const expense = await prisma.expense.update({
      where: { id },
      data: {
        description,
        amount,
        category,
        purchaseDate: new Date(purchaseDate),
        supplierId: supplierId || null,
        receiptUrl: receiptUrl || null,
        notes: notes || null,
        vatAmount: vatAmount ?? null,
        vatRate: vatRate ?? null,
        isVatReclaimable: isVatReclaimable ?? false,
        externalReference: externalReference || null,
        taxYear,
      },
      include: {
        supplier: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        ...expense,
        amount: Number(expense.amount),
        vatAmount: expense.vatAmount ? Number(expense.vatAmount) : null,
        vatRate: expense.vatRate ? Number(expense.vatRate) : null,
        categoryLabel: EXPENSE_CATEGORY_LABELS[expense.category] || expense.category,
      },
    });
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

    const existing = await prisma.expense.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Expense not found' },
        { status: 404 }
      );
    }

    await prisma.expense.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Expense deleted successfully',
    });
  } catch (error) {
    console.error('Delete expense error:', error);
    return handleApiError(error);
  }
}
