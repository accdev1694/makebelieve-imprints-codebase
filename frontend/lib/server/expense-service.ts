/**
 * Expense Service
 *
 * Handles all business logic for expense and income management.
 * Provides CRUD operations, CSV import functionality, and reporting utilities.
 */

import { prisma } from '@/lib/prisma';
import { ExpenseCategory, IncomeCategory, Prisma } from '@prisma/client';
import {
  getTaxYearForDate,
  EXPENSE_CATEGORY_LABELS,
  INCOME_CATEGORY_LABELS,
} from './tax-utils';

// =============================================================================
// Types
// =============================================================================

export interface ExpenseFilters {
  category?: string;
  taxYear?: string;
  supplierId?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface IncomeFilters {
  category?: string;
  taxYear?: string;
  source?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface ExpenseData {
  description: string;
  amount: number;
  category: ExpenseCategory;
  purchaseDate: Date;
  supplierId?: string | null;
  receiptUrl?: string | null;
  notes?: string | null;
  vatAmount?: number | null;
  vatRate?: number | null;
  isVatReclaimable?: boolean;
  externalReference?: string | null;
}

export interface IncomeData {
  description: string;
  amount: number;
  category: IncomeCategory;
  incomeDate?: Date;
  source?: string | null;
  customerName?: string | null;
  vatAmount?: number | null;
  vatRate?: number | null;
  isVatIncluded?: boolean;
  externalReference?: string | null;
  notes?: string | null;
  receiptUrl?: string | null;
}

export interface ParsedExpenseRow {
  rowNumber: number;
  data: {
    description?: string;
    amount?: string;
    category?: string;
    purchaseDate?: string;
    supplier?: string;
    externalReference?: string;
    vatAmount?: string;
    vatRate?: string;
    isVatReclaimable?: string;
    notes?: string;
  };
  errors: string[];
  warnings: string[];
}

export interface ValidatedExpense {
  description: string;
  amount: number;
  category: ExpenseCategory;
  purchaseDate: Date;
  supplierName?: string;
  externalReference?: string;
  vatAmount?: number;
  vatRate?: number;
  isVatReclaimable: boolean;
  notes?: string;
}

export interface ExpenseTotals {
  totalAmount: number;
  totalVAT: number;
  reclaimableVAT: number;
  count: number;
}

export interface IncomeTotals {
  totalAmount: number;
  totalVat: number;
  count: number;
}

interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// =============================================================================
// Category Mappings for CSV Import
// =============================================================================

const CATEGORY_MAPPINGS: Record<string, ExpenseCategory> = {
  // Direct matches (from schema enum)
  MATERIALS: 'MATERIALS',
  PACKAGING: 'PACKAGING',
  SHIPPING_SUPPLIES: 'SHIPPING_SUPPLIES',
  EQUIPMENT: 'EQUIPMENT',
  SOFTWARE: 'SOFTWARE',
  UTILITIES: 'UTILITIES',
  MARKETING: 'MARKETING',
  OTHER: 'OTHER',
  // Common alternatives mapped to valid categories
  printing: 'MATERIALS',
  print: 'MATERIALS',
  materials: 'MATERIALS',
  ink: 'MATERIALS',
  paper: 'MATERIALS',
  supplies: 'MATERIALS',
  package: 'PACKAGING',
  boxes: 'PACKAGING',
  ship: 'SHIPPING_SUPPLIES',
  shipping: 'SHIPPING_SUPPLIES',
  postage: 'SHIPPING_SUPPLIES',
  delivery: 'SHIPPING_SUPPLIES',
  courier: 'SHIPPING_SUPPLIES',
  equip: 'EQUIPMENT',
  hardware: 'EQUIPMENT',
  machinery: 'EQUIPMENT',
  printer: 'EQUIPMENT',
  soft: 'SOFTWARE',
  subscription: 'SOFTWARE',
  saas: 'SOFTWARE',
  app: 'SOFTWARE',
  ads: 'MARKETING',
  advertising: 'MARKETING',
  promotion: 'MARKETING',
  electric: 'UTILITIES',
  gas: 'UTILITIES',
  water: 'UTILITIES',
  internet: 'UTILITIES',
  phone: 'UTILITIES',
  rent: 'UTILITIES',
  office: 'UTILITIES',
  misc: 'OTHER',
  miscellaneous: 'OTHER',
  bank: 'OTHER',
  fees: 'OTHER',
  insurance: 'OTHER',
  travel: 'OTHER',
  fuel: 'OTHER',
};

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
 * Format expense for API response (convert Decimal to number)
 */
function formatExpense(expense: Prisma.ExpenseGetPayload<{ include: { supplier: { select: { id: true; name: true } } } }>) {
  return {
    ...expense,
    amount: Number(expense.amount),
    vatAmount: expense.vatAmount ? Number(expense.vatAmount) : null,
    vatRate: expense.vatRate ? Number(expense.vatRate) : null,
    categoryLabel: EXPENSE_CATEGORY_LABELS[expense.category] || expense.category,
  };
}

/**
 * Format income for API response (convert Decimal to number)
 */
function formatIncome(income: Prisma.IncomeGetPayload<Record<string, never>>) {
  return {
    ...income,
    amount: Number(income.amount),
    vatAmount: income.vatAmount ? Number(income.vatAmount) : null,
    vatRate: income.vatRate ? Number(income.vatRate) : null,
    categoryLabel: INCOME_CATEGORY_LABELS[income.category] || income.category,
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
      category: data.category,
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
      category: data.category,
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

// =============================================================================
// CSV Import Operations
// =============================================================================

/**
 * Parse a CSV string into headers and rows
 */
export function parseCSV(content: string): { headers: string[]; rows: string[][] } {
  const lines = content.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }

  const parseRow = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = parseRow(lines[0]).map((h) => h.toLowerCase().replace(/\s+/g, '_'));
  const rows = lines.slice(1).map(parseRow);

  return { headers, rows };
}

/**
 * Auto-detect column mappings from header names
 */
export function mapHeaders(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};

  const headerMappings: Record<string, string[]> = {
    description: ['description', 'desc', 'name', 'item', 'expense', 'title'],
    amount: ['amount', 'total', 'price', 'cost', 'value', 'sum'],
    category: ['category', 'cat', 'type', 'expense_type', 'expense_category'],
    purchaseDate: [
      'purchase_date',
      'date',
      'purchased',
      'transaction_date',
      'expense_date',
    ],
    supplier: ['supplier', 'vendor', 'merchant', 'shop', 'store', 'from', 'company'],
    externalReference: [
      'invoice_number',
      'invoice',
      'inv',
      'reference',
      'ref',
      'receipt',
      'external_reference',
    ],
    vatAmount: ['vat_amount', 'vat', 'tax', 'tax_amount'],
    vatRate: ['vat_rate', 'tax_rate', 'rate'],
    isVatReclaimable: [
      'is_vat_reclaimable',
      'vat_reclaimable',
      'reclaimable',
      'can_reclaim',
    ],
    notes: ['notes', 'note', 'comments', 'comment', 'memo', 'details'],
  };

  for (const header of headers) {
    const normalized = header.toLowerCase().replace(/[^a-z0-9]/g, '_');

    for (const [field, alternatives] of Object.entries(headerMappings)) {
      if (
        alternatives.includes(normalized) ||
        alternatives.some((alt) => normalized.includes(alt))
      ) {
        mapping[header] = field;
        break;
      }
    }
  }

  return mapping;
}

/**
 * Parse a category string to ExpenseCategory enum
 */
export function parseCategory(value: string | undefined): ExpenseCategory | null {
  if (!value) return null;

  const normalized = value.trim().toLowerCase();

  // Try direct enum match first
  const upperValue = value.trim().toUpperCase().replace(/\s+/g, '_');
  if (Object.values(ExpenseCategory).includes(upperValue as ExpenseCategory)) {
    return upperValue as ExpenseCategory;
  }

  // Try mappings
  for (const [key, category] of Object.entries(CATEGORY_MAPPINGS)) {
    if (normalized.includes(key.toLowerCase())) {
      return category;
    }
  }

  return null;
}

/**
 * Parse a date string in various formats
 */
export function parseDate(value: string | undefined): Date | null {
  if (!value) return null;

  const trimmed = value.trim();

  // Try various date formats
  // DD/MM/YYYY (UK format)
  const ukMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (ukMatch) {
    const [, day, month, year] = ukMatch;
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    if (!isNaN(date.getTime())) return date;
  }

  // YYYY-MM-DD (ISO format)
  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const date = new Date(trimmed);
    if (!isNaN(date.getTime())) return date;
  }

  // MM/DD/YYYY (US format) - check if month makes sense
  const usMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (usMatch) {
    const [, month, day, year] = usMatch;
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    if (!isNaN(date.getTime())) return date;
  }

  // Try native parsing as fallback
  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) return parsed;

  return null;
}

/**
 * Parse an amount string, handling currency symbols
 */
export function parseAmount(value: string | undefined): number | null {
  if (!value) return null;

  // Remove currency symbols and whitespace
  const cleaned = value.trim().replace(/[£$€,\s]/g, '');
  const num = parseFloat(cleaned);

  return isNaN(num) ? null : Math.round(num * 100) / 100;
}

/**
 * Parse a boolean string
 */
export function parseBoolean(value: string | undefined): boolean {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return ['true', 'yes', '1', 'y'].includes(normalized);
}

/**
 * Validate and parse CSV rows into expense data
 */
export function validateExpenseRows(
  rows: string[][],
  headers: string[],
  columnMapping: Record<string, string>
): { parsedRows: ParsedExpenseRow[]; validatedExpenses: ValidatedExpense[] } {
  const parsedRows: ParsedExpenseRow[] = [];
  const validatedExpenses: ValidatedExpense[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNumber = i + 2; // +2 for 1-indexed and header row

    const data: ParsedExpenseRow['data'] = {};
    for (let j = 0; j < headers.length; j++) {
      const field = columnMapping[headers[j]];
      if (field && row[j]) {
        data[field as keyof ParsedExpenseRow['data']] = row[j];
      }
    }

    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate required fields
    if (!data.description) {
      errors.push('Description is required');
    }

    const amount = parseAmount(data.amount);
    if (amount === null) {
      errors.push('Valid amount is required');
    } else if (amount <= 0) {
      errors.push('Amount must be positive');
    }

    const category = parseCategory(data.category);
    if (!category) {
      if (data.category) {
        warnings.push(`Unknown category "${data.category}", defaulting to OTHER`);
      } else {
        warnings.push('No category specified, defaulting to OTHER');
      }
    }

    const purchaseDate = parseDate(data.purchaseDate);
    if (!purchaseDate) {
      errors.push('Valid purchase date is required');
    } else if (purchaseDate > new Date()) {
      warnings.push('Purchase date is in the future');
    }

    const vatAmount = parseAmount(data.vatAmount);

    if (vatAmount && amount && vatAmount > amount) {
      errors.push('VAT amount cannot exceed total amount');
    }

    parsedRows.push({ rowNumber, data, errors, warnings });

    // Only add to validated list if no errors
    if (errors.length === 0 && amount !== null && purchaseDate !== null) {
      validatedExpenses.push({
        description: data.description!,
        amount,
        category: category || 'OTHER',
        purchaseDate,
        supplierName: data.supplier?.trim(),
        externalReference: data.externalReference?.trim(),
        vatAmount: vatAmount ?? undefined,
        vatRate: parseAmount(data.vatRate) ?? undefined,
        isVatReclaimable: parseBoolean(data.isVatReclaimable),
        notes: data.notes?.trim(),
      });
    }
  }

  return { parsedRows, validatedExpenses };
}

/**
 * Import validated expenses into the database
 */
export async function importExpensesBatch(
  expenses: ValidatedExpense[],
  adminId: string,
  fileName: string,
  parsedRows: ParsedExpenseRow[]
): Promise<{
  batchId: string;
  totalRows: number;
  imported: number;
  failed: number;
  errors: Array<{ row: number; error: string }>;
}> {
  if (expenses.length === 0) {
    throw new Error('No valid expenses to import');
  }

  // Create import batch
  const batch = await prisma.expenseImportBatch.create({
    data: {
      source: 'CSV_IMPORT',
      fileName,
      recordCount: parsedRows.length,
      status: 'PROCESSING',
      importedBy: adminId,
    },
  });

  // Import expenses
  let successCount = 0;
  const importErrors: Array<{ row: number; error: string }> = [];

  for (const expense of expenses) {
    const rowNumber =
      parsedRows.findIndex(
        (r) =>
          r.data.description === expense.description &&
          parseAmount(r.data.amount) === expense.amount
      ) + 2;

    try {
      // Find or skip supplier
      let supplierId: string | undefined;
      if (expense.supplierName) {
        const supplier = await prisma.supplier.findFirst({
          where: {
            name: {
              equals: expense.supplierName,
              mode: 'insensitive',
            },
          },
          select: { id: true },
        });
        supplierId = supplier?.id;
      }

      const expenseNumber = await generateExpenseNumber();

      await prisma.expense.create({
        data: {
          expenseNumber,
          description: expense.description,
          amount: expense.amount,
          category: expense.category,
          purchaseDate: expense.purchaseDate,
          supplierId,
          externalReference: expense.externalReference,
          vatAmount: expense.vatAmount,
          vatRate: expense.vatRate,
          isVatReclaimable: expense.isVatReclaimable,
          notes: expense.notes,
          taxYear: getTaxYearForDate(expense.purchaseDate),
          importSource: 'CSV_IMPORT',
          importBatchId: batch.id,
        },
      });

      successCount++;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      importErrors.push({ row: rowNumber, error: errorMessage });
    }
  }

  // Update batch status
  await prisma.expenseImportBatch.update({
    where: { id: batch.id },
    data: {
      status: 'COMPLETED',
      successCount,
      errorCount: importErrors.length,
      errors:
        importErrors.length > 0
          ? (importErrors as unknown as Prisma.InputJsonValue)
          : Prisma.DbNull,
      completedAt: new Date(),
    },
  });

  return {
    batchId: batch.id,
    totalRows: parsedRows.length,
    imported: successCount,
    failed: importErrors.length,
    errors: importErrors,
  };
}

/**
 * Get import batch history
 */
export async function getImportHistory(limit: number = 20) {
  const batches = await prisma.expenseImportBatch.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  return {
    batches,
    categories: Object.entries(EXPENSE_CATEGORY_LABELS).map(([value, label]) => ({
      value,
      label,
    })),
  };
}

/**
 * Get import batch details with expenses
 */
export async function getImportBatch(batchId: string) {
  const batch = await prisma.expenseImportBatch.findUnique({
    where: { id: batchId },
  });

  if (!batch) {
    return { success: false as const, error: 'Import batch not found' };
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

  // Extract errors as a properly typed array
  const batchErrors = Array.isArray(batch.errors) ? batch.errors : [];

  return {
    success: true as const,
    data: {
      batch: {
        id: batch.id,
        source: batch.source,
        fileName: batch.fileName,
        recordCount: batch.recordCount,
        successCount: batch.successCount,
        errorCount: batch.errorCount,
        status: batch.status,
        importedBy: batch.importedBy,
        completedAt: batch.completedAt,
        createdAt: batch.createdAt,
        errors: batchErrors,
      },
      expenses: expenses.map(formatExpense),
    },
  };
}

/**
 * Delete an import batch and optionally its expenses
 */
export async function deleteImportBatch(
  batchId: string,
  deleteExpenses: boolean
): Promise<ServiceResult<{ message: string }>> {
  const batch = await prisma.expenseImportBatch.findUnique({
    where: { id: batchId },
  });

  if (!batch) {
    return { success: false, error: 'Import batch not found' };
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

  return {
    success: true,
    data: {
      message: deleteExpenses
        ? 'Import batch and expenses deleted successfully'
        : 'Import batch deleted, expenses preserved',
    },
  };
}

/**
 * Get CSV template content for expense imports
 */
export function getCSVTemplate(): string {
  return [
    'description,amount,category,purchase_date,supplier,invoice_number,vat_amount,vat_rate,is_vat_reclaimable,notes',
    'Printer ink cartridges,£45.99,MATERIALS,15/01/2025,Amazon,INV-12345,7.67,20,yes,Black and color cartridges',
    'Shipping boxes (50 pack),£32.00,PACKAGING,16/01/2025,Packaging Direct,PD-9876,5.33,20,yes,Medium boxes',
    'Monthly software subscription,£19.99,SOFTWARE,01/01/2025,Adobe,SUB-2025-01,3.33,20,yes,Creative Cloud',
  ].join('\n');
}
