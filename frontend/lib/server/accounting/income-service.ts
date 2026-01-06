/**
 * Income Service
 *
 * Handles all business logic for income management.
 * Provides CRUD operations and filtering for income entries.
 */

import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { getTaxYearForDate, INCOME_CATEGORY_LABELS } from '../tax-utils';
import { IncomeFilters, IncomeData, IncomeTotals, ServiceResult } from './types';

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Generate a unique income number like INC-202501-0001
 */
export async function generateIncomeNumber(): Promise<string> {
  const date = new Date();
  const prefix = `INC-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;

  const latestIncome = await prisma.income.findFirst({
    where: {
      incomeNumber: {
        startsWith: prefix,
      },
    },
    orderBy: {
      incomeNumber: 'desc',
    },
    select: {
      incomeNumber: true,
    },
  });

  let nextNumber = 1;
  if (latestIncome?.incomeNumber) {
    const match = latestIncome.incomeNumber.match(/-(\d+)$/);
    if (match) {
      nextNumber = parseInt(match[1], 10) + 1;
    }
  }

  return `${prefix}-${String(nextNumber).padStart(4, '0')}`;
}

/**
 * Format income for API response (convert Decimal to number)
 */
export function formatIncome(income: Prisma.IncomeGetPayload<Record<string, never>>) {
  return {
    ...income,
    amount: Number(income.amount),
    vatAmount: income.vatAmount ? Number(income.vatAmount) : null,
    vatRate: income.vatRate ? Number(income.vatRate) : null,
    categoryLabel: INCOME_CATEGORY_LABELS[income.category] || income.category,
  };
}

// =============================================================================
// Income Operations
// =============================================================================

/**
 * List income entries with filtering and pagination
 */
export async function listIncome(filters: IncomeFilters) {
  const {
    category,
    taxYear,
    source,
    search,
    startDate,
    endDate,
    sortOrder = 'desc',
    page = 1,
    limit = 20,
  } = filters;

  const where: Record<string, unknown> = {};

  if (category && category !== 'all') {
    where.category = category;
  }

  if (taxYear && taxYear !== 'all') {
    where.taxYear = taxYear;
  }

  if (source) {
    where.source = {
      contains: source,
      mode: 'insensitive',
    };
  }

  if (startDate || endDate) {
    where.incomeDate = {};
    if (startDate) {
      (where.incomeDate as Record<string, Date>).gte = new Date(startDate);
    }
    if (endDate) {
      (where.incomeDate as Record<string, Date>).lte = new Date(endDate);
    }
  }

  if (search) {
    where.OR = [
      { description: { contains: search, mode: 'insensitive' } },
      { source: { contains: search, mode: 'insensitive' } },
      { customerName: { contains: search, mode: 'insensitive' } },
      { incomeNumber: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [income, total] = await Promise.all([
    prisma.income.findMany({
      where,
      orderBy: { incomeDate: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.income.count({ where }),
  ]);

  // Calculate totals for the filtered results
  const totals = await prisma.income.aggregate({
    where,
    _sum: {
      amount: true,
      vatAmount: true,
    },
    _count: true,
  });

  return {
    income: income.map(formatIncome),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
    totals: {
      totalAmount: Number(totals._sum.amount || 0),
      totalVat: Number(totals._sum.vatAmount || 0),
      count: totals._count,
    } as IncomeTotals,
    categories: Object.entries(INCOME_CATEGORY_LABELS).map(([value, label]) => ({
      value,
      label,
    })),
  };
}

/**
 * Get a single income entry by ID
 */
export async function getIncome(id: string): Promise<ServiceResult<ReturnType<typeof formatIncome>>> {
  const income = await prisma.income.findUnique({
    where: { id },
  });

  if (!income) {
    return { success: false, error: 'Income entry not found' };
  }

  return { success: true, data: formatIncome(income) };
}

/**
 * Create a new income entry
 */
export async function createIncome(data: IncomeData): Promise<ServiceResult<ReturnType<typeof formatIncome>>> {
  // Validation
  if (!data.description || typeof data.description !== 'string') {
    return { success: false, error: 'Description is required' };
  }

  if (!data.amount || isNaN(data.amount)) {
    return { success: false, error: 'Valid amount is required' };
  }

  if (!data.category || !Object.keys(INCOME_CATEGORY_LABELS).includes(data.category)) {
    return { success: false, error: 'Valid category is required' };
  }

  const incomeNumber = await generateIncomeNumber();
  const incomeDate = data.incomeDate ? new Date(data.incomeDate) : new Date();

  const income = await prisma.income.create({
    data: {
      incomeNumber,
      description: data.description.trim(),
      amount: data.amount,
      category: data.category,
      source: data.source?.trim() || null,
      customerName: data.customerName?.trim() || null,
      incomeDate,
      vatAmount: data.vatAmount || null,
      vatRate: data.vatRate || null,
      isVatIncluded: data.isVatIncluded ?? true,
      externalReference: data.externalReference?.trim() || null,
      notes: data.notes?.trim() || null,
      receiptUrl: data.receiptUrl?.trim() || null,
      taxYear: getTaxYearForDate(incomeDate),
    },
  });

  return { success: true, data: formatIncome(income) };
}

/**
 * Update an existing income entry
 */
export async function updateIncome(
  id: string,
  data: Partial<IncomeData>
): Promise<ServiceResult<ReturnType<typeof formatIncome>>> {
  const existing = await prisma.income.findUnique({
    where: { id },
  });

  if (!existing) {
    return { success: false, error: 'Income entry not found' };
  }

  // Build update data
  const updateData: Record<string, unknown> = {};

  if (data.description !== undefined) {
    if (!data.description || typeof data.description !== 'string') {
      return { success: false, error: 'Description cannot be empty' };
    }
    updateData.description = data.description.trim();
  }

  if (data.amount !== undefined) {
    if (isNaN(data.amount)) {
      return { success: false, error: 'Valid amount is required' };
    }
    updateData.amount = data.amount;
  }

  if (data.category !== undefined) {
    if (!Object.keys(INCOME_CATEGORY_LABELS).includes(data.category)) {
      return { success: false, error: 'Valid category is required' };
    }
    updateData.category = data.category;
  }

  if (data.source !== undefined) {
    updateData.source = data.source?.trim() || null;
  }

  if (data.customerName !== undefined) {
    updateData.customerName = data.customerName?.trim() || null;
  }

  if (data.incomeDate !== undefined) {
    const parsedDate = new Date(data.incomeDate);
    updateData.incomeDate = parsedDate;
    updateData.taxYear = getTaxYearForDate(parsedDate);
  }

  if (data.vatAmount !== undefined) {
    updateData.vatAmount = data.vatAmount || null;
  }

  if (data.vatRate !== undefined) {
    updateData.vatRate = data.vatRate || null;
  }

  if (data.isVatIncluded !== undefined) {
    updateData.isVatIncluded = data.isVatIncluded;
  }

  if (data.externalReference !== undefined) {
    updateData.externalReference = data.externalReference?.trim() || null;
  }

  if (data.notes !== undefined) {
    updateData.notes = data.notes?.trim() || null;
  }

  if (data.receiptUrl !== undefined) {
    updateData.receiptUrl = data.receiptUrl?.trim() || null;
  }

  const income = await prisma.income.update({
    where: { id },
    data: updateData,
  });

  return { success: true, data: formatIncome(income) };
}

/**
 * Delete an income entry
 */
export async function deleteIncome(id: string): Promise<ServiceResult<void>> {
  const existing = await prisma.income.findUnique({
    where: { id },
  });

  if (!existing) {
    return { success: false, error: 'Income entry not found' };
  }

  await prisma.income.delete({
    where: { id },
  });

  return { success: true };
}
