import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin, handleApiError } from '@/lib/server/auth';
import { getTaxYearForDate, EXPENSE_CATEGORY_LABELS } from '@/lib/server/tax-utils';

/**
 * Generate a unique expense number
 */
async function generateExpenseNumber(): Promise<string> {
  const date = new Date();
  const prefix = `EXP-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;

  // Find the latest expense number with this prefix
  const latestExpense = await prisma.expense.findFirst({
    where: {
      expenseNumber: {
        startsWith: prefix,
      },
    },
    orderBy: {
      expenseNumber: 'desc',
    },
    select: {
      expenseNumber: true,
    },
  });

  let nextNumber = 1;
  if (latestExpense) {
    const lastNumber = parseInt(latestExpense.expenseNumber.split('-').pop() || '0', 10);
    nextNumber = lastNumber + 1;
  }

  return `${prefix}-${String(nextNumber).padStart(4, '0')}`;
}

/**
 * GET /api/admin/accounting/expenses
 * List expenses with filtering and pagination
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    // Filters
    const category = searchParams.get('category');
    const taxYear = searchParams.get('taxYear');
    const supplierId = searchParams.get('supplierId');
    const search = searchParams.get('search');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc';

    // Build where clause
    const where: Record<string, unknown> = {};

    if (category && category !== 'all') {
      where.category = category;
    }

    if (taxYear && taxYear !== 'all') {
      where.taxYear = taxYear;
    }

    if (supplierId) {
      where.supplierId = supplierId;
    }

    if (search) {
      where.OR = [
        { description: { contains: search, mode: 'insensitive' } },
        { externalReference: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (startDate || endDate) {
      where.purchaseDate = {};
      if (startDate) {
        (where.purchaseDate as Record<string, Date>).gte = new Date(startDate);
      }
      if (endDate) {
        (where.purchaseDate as Record<string, Date>).lte = new Date(endDate);
      }
    }

    const [expenses, total] = await Promise.all([
      prisma.expense.findMany({
        where,
        include: {
          supplier: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { purchaseDate: sortOrder },
        skip,
        take: limit,
      }),
      prisma.expense.count({ where }),
    ]);

    // Calculate totals for current filter
    const totals = await prisma.expense.aggregate({
      where,
      _sum: {
        amount: true,
        vatAmount: true,
      },
      _count: true,
    });

    const reclaimableVAT = await prisma.expense.aggregate({
      where: {
        ...where,
        isVatReclaimable: true,
      },
      _sum: {
        vatAmount: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        expenses: expenses.map((expense) => ({
          ...expense,
          amount: Number(expense.amount),
          vatAmount: expense.vatAmount ? Number(expense.vatAmount) : null,
          vatRate: expense.vatRate ? Number(expense.vatRate) : null,
          categoryLabel: EXPENSE_CATEGORY_LABELS[expense.category] || expense.category,
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
        totals: {
          totalAmount: Number(totals._sum.amount || 0),
          totalVAT: Number(totals._sum.vatAmount || 0),
          reclaimableVAT: Number(reclaimableVAT._sum.vatAmount || 0),
          count: totals._count,
        },
        categories: Object.entries(EXPENSE_CATEGORY_LABELS).map(([key, label]) => ({
          value: key,
          label,
        })),
      },
    });
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

    // Calculate tax year from purchase date
    const taxYear = getTaxYearForDate(new Date(purchaseDate));

    // Generate expense number
    const expenseNumber = await generateExpenseNumber();

    const expense = await prisma.expense.create({
      data: {
        expenseNumber,
        description,
        amount,
        category,
        purchaseDate: new Date(purchaseDate),
        supplierId: supplierId || null,
        receiptUrl: receiptUrl || null,
        notes: notes || null,
        vatAmount: vatAmount || null,
        vatRate: vatRate || null,
        isVatReclaimable: isVatReclaimable || false,
        externalReference: externalReference || null,
        taxYear,
        importSource: 'MANUAL',
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
    console.error('Create expense error:', error);
    return handleApiError(error);
  }
}
