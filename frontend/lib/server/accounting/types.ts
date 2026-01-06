/**
 * Accounting Types
 *
 * Shared types for expense, income, and financial services.
 */

import { ExpenseCategory, IncomeCategory } from '@prisma/client';

// =============================================================================
// Expense Types
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

export interface ExpenseTotals {
  totalAmount: number;
  totalVAT: number;
  reclaimableVAT: number;
  count: number;
}

// =============================================================================
// Income Types
// =============================================================================

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

export interface IncomeTotals {
  totalAmount: number;
  totalVat: number;
  count: number;
}

// =============================================================================
// CSV Import Types
// =============================================================================

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

export interface ImportResult {
  batchId: string;
  totalRows: number;
  imported: number;
  failed: number;
  errors: Array<{ row: number; error: string }>;
}

// =============================================================================
// Common Types
// =============================================================================

export interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface CategoryOption {
  value: string;
  label: string;
}
