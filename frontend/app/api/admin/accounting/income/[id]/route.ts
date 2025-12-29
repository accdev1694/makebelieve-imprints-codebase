import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin, handleApiError } from '@/lib/server/auth';
import { getTaxYearForDate, INCOME_CATEGORY_LABELS } from '@/lib/server/tax-utils';
import { IncomeCategory } from '@prisma/client';

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

    const income = await prisma.income.findUnique({
      where: { id },
    });

    if (!income) {
      return NextResponse.json(
        { success: false, error: 'Income entry not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        ...income,
        amount: Number(income.amount),
        vatAmount: income.vatAmount ? Number(income.vatAmount) : null,
        vatRate: income.vatRate ? Number(income.vatRate) : null,
        categoryLabel: INCOME_CATEGORY_LABELS[income.category] || income.category,
      },
    });
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

    const existing = await prisma.income.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Income entry not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const {
      description,
      amount,
      category,
      source,
      customerName,
      incomeDate,
      vatAmount,
      vatRate,
      isVatIncluded,
      externalReference,
      notes,
      receiptUrl,
    } = body;

    // Build update data
    const updateData: Record<string, unknown> = {};

    if (description !== undefined) {
      if (!description || typeof description !== 'string') {
        return NextResponse.json(
          { success: false, error: 'Description cannot be empty' },
          { status: 400 }
        );
      }
      updateData.description = description.trim();
    }

    if (amount !== undefined) {
      if (isNaN(parseFloat(amount))) {
        return NextResponse.json(
          { success: false, error: 'Valid amount is required' },
          { status: 400 }
        );
      }
      updateData.amount = parseFloat(amount);
    }

    if (category !== undefined) {
      if (!Object.keys(INCOME_CATEGORY_LABELS).includes(category)) {
        return NextResponse.json(
          { success: false, error: 'Valid category is required' },
          { status: 400 }
        );
      }
      updateData.category = category as IncomeCategory;
    }

    if (source !== undefined) {
      updateData.source = source?.trim() || null;
    }

    if (customerName !== undefined) {
      updateData.customerName = customerName?.trim() || null;
    }

    if (incomeDate !== undefined) {
      const parsedDate = new Date(incomeDate);
      updateData.incomeDate = parsedDate;
      updateData.taxYear = getTaxYearForDate(parsedDate);
    }

    if (vatAmount !== undefined) {
      updateData.vatAmount = vatAmount ? parseFloat(vatAmount) : null;
    }

    if (vatRate !== undefined) {
      updateData.vatRate = vatRate ? parseFloat(vatRate) : null;
    }

    if (isVatIncluded !== undefined) {
      updateData.isVatIncluded = isVatIncluded;
    }

    if (externalReference !== undefined) {
      updateData.externalReference = externalReference?.trim() || null;
    }

    if (notes !== undefined) {
      updateData.notes = notes?.trim() || null;
    }

    if (receiptUrl !== undefined) {
      updateData.receiptUrl = receiptUrl?.trim() || null;
    }

    const income = await prisma.income.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      data: {
        ...income,
        amount: Number(income.amount),
        vatAmount: income.vatAmount ? Number(income.vatAmount) : null,
        vatRate: income.vatRate ? Number(income.vatRate) : null,
        categoryLabel: INCOME_CATEGORY_LABELS[income.category] || income.category,
      },
    });
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

    const existing = await prisma.income.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Income entry not found' },
        { status: 404 }
      );
    }

    await prisma.income.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Income entry deleted successfully',
    });
  } catch (error) {
    console.error('Delete income error:', error);
    return handleApiError(error);
  }
}
