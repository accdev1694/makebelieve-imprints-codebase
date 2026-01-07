/**
 * Accounting Types
 *
 * Shared types for expense, income, and financial services.
 *
 * NOTE: We use string literal types instead of importing enums from @prisma/client
 * to avoid build-time evaluation issues on Linux CI.
 */

// String literal types matching Prisma schema enums
export type ExpenseCategoryType =
  | 'MATERIALS'
  | 'PACKAGING'
  | 'SHIPPING_SUPPLIES'
  | 'EQUIPMENT'
  | 'SOFTWARE'
  | 'UTILITIES'
  | 'MARKETING'
  | 'OTHER';

export type IncomeCategoryType =
  | 'PRODUCT_SALES'
  | 'WHOLESALE'
  | 'MARKET_SALES'
  | 'ONLINE_MARKETPLACE'
  | 'CUSTOM_ORDERS'
  | 'SHIPPING_REIMBURSEMENT'
  | 'REFUND_RECEIVED'
  | 'OTHER';

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
  category: ExpenseCategoryType;
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
  category: IncomeCategoryType;
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
  category: ExpenseCategoryType;
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
