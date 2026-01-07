/**
 * Expense Service
 *
 * Handles all business logic for expense management.
 * Provides CRUD operations and filtering for expense entries.
 */

import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import type { ExpenseCategory } from '@prisma/client';
import { getTaxYearForDate, EXPENSE_CATEGORY_LABELS } from '../tax-utils';
import { ExpenseFilters, ExpenseData, ExpenseTotals, ServiceResult } from './types';

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Generate a unique expense number like EXP-202501-0001
 */
export async function generateExpenseNumber(): Promise<string> {
  const date = new Date();
  const prefix = `EXP-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;

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
  if (latestExpense?.expenseNumber) {
    const match = latestExpense.expenseNumber.match(/-(\d+)$/);
    if (match) {
      nextNumber = parseInt(match[1], 10) + 1;
    }
  }

  return `${prefix}-${String(nextNumber).padStart(4, '0')}`;
}

/**
 * Format expense for API response (convert Decimal to number)
 */
export function formatExpense(expense: Prisma.ExpenseGetPayload<{ include: { supplier: { select: { id: true; name: true } } } }>) {
  return {
    ...expense,
    amount: Number(expense.amount),
    vatAmount: expense.vatAmount ? Number(expense.vatAmount) : null,
    vatRate: expense.vatRate ? Number(expense.vatRate) : null,
    categoryLabel: EXPENSE_CATEGORY_LABELS[expense.category] || expense.category,
  };
}

// =============================================================================
// Expense Operations
// =============================================================================

/**
 * List expenses with filtering and pagination
 */
export async function listExpenses(filters: ExpenseFilters) {
  const {
    category,
    taxYear,
    supplierId,
    search,
    startDate,
    endDate,
    sortOrder = 'desc',
    page = 1,
    limit = 20,
  } = filters;

  const skip = (page - 1) * limit;

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

  return {
    expenses: expenses.map(formatExpense),
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
    } as ExpenseTotals,
    categories: Object.entries(EXPENSE_CATEGORY_LABELS).map(([key, label]) => ({
      value: key,
      label,
    })),
  };
}

/**
 * Get a single expense by ID
 */
export async function getExpense(id: string): Promise<ServiceResult<ReturnType<typeof formatExpense>>> {
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
    return { success: false, error: 'Expense not found' };
  }

  return { success: true, data: formatExpense(expense) };
}

/**
 * Create a new expense
 */
export async function createExpense(data: ExpenseData): Promise<ServiceResult<ReturnType<typeof formatExpense>>> {
  // Validation
  if (!data.description || !data.amount || !data.category || !data.purchaseDate) {
    return {
      success: false,
      error: 'Description, amount, category, and purchase date are required',
    };
  }

  if (data.amount <= 0) {
    return { success: false, error: 'Amount must be greater than 0' };
  }

  if (!EXPENSE_CATEGORY_LABELS[data.category]) {
    return { success: false, error: 'Invalid expense category' };
  }

  // Calculate tax year from purchase date
  const taxYear = getTaxYearForDate(new Date(data.purchaseDate));

  // Generate expense number
  const expenseNumber = await generateExpenseNumber();

  const expense = await prisma.expense.create({
    data: {
      expenseNumber,
      description: data.description,
      amount: data.amount,
      category: data.category as ExpenseCategory,
      purchaseDate: new Date(data.purchaseDate),
      supplierId: data.supplierId || null,
      receiptUrl: data.receiptUrl || null,
      notes: data.notes || null,
      vatAmount: data.vatAmount || null,
      vatRate: data.vatRate || null,
      isVatReclaimable: data.isVatReclaimable || false,
      externalReference: data.externalReference || null,
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

  return { success: true, data: formatExpense(expense) };
}

/**
 * Update an existing expense
 */
export async function updateExpense(
  id: string,
  data: ExpenseData
): Promise<ServiceResult<ReturnType<typeof formatExpense>>> {
  const existing = await prisma.expense.findUnique({
    where: { id },
  });

  if (!existing) {
    return { success: false, error: 'Expense not found' };
  }

  // Validation
  if (!data.description || !data.amount || !data.category || !data.purchaseDate) {
    return {
      success: false,
      error: 'Description, amount, category, and purchase date are required',
    };
  }

  if (data.amount <= 0) {
    return { success: false, error: 'Amount must be greater than 0' };
  }

  if (!EXPENSE_CATEGORY_LABELS[data.category]) {
    return { success: false, error: 'Invalid expense category' };
  }

  // Recalculate tax year if purchase date changed
  const taxYear = getTaxYearForDate(new Date(data.purchaseDate));

  const expense = await prisma.expense.update({
    where: { id },
    data: {
      description: data.description,
      amount: data.amount,
      category: data.category as ExpenseCategory,
      purchaseDate: new Date(data.purchaseDate),
      supplierId: data.supplierId || null,
      receiptUrl: data.receiptUrl || null,
      notes: data.notes || null,
      vatAmount: data.vatAmount ?? null,
      vatRate: data.vatRate ?? null,
      isVatReclaimable: data.isVatReclaimable ?? false,
      externalReference: data.externalReference || null,
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

  return { success: true, data: formatExpense(expense) };
}

/**
 * Delete an expense
 */
export async function deleteExpense(id: string): Promise<ServiceResult<void>> {
  const existing = await prisma.expense.findUnique({
    where: { id },
  });

  if (!existing) {
    return { success: false, error: 'Expense not found' };
  }

  await prisma.expense.delete({
    where: { id },
  });

  return { success: true };
}
