/**
 * Accounting Module
 *
 * Central export for all accounting-related services.
 * This module provides expense, income, VAT, and CSV import functionality.
 */

// =============================================================================
// Types
// =============================================================================

export type {
  ExpenseFilters,
  ExpenseData,
  ExpenseTotals,
  IncomeFilters,
  IncomeData,
  IncomeTotals,
  ParsedExpenseRow,
  ValidatedExpense,
  ImportResult,
  ServiceResult,
  PaginationInfo,
  CategoryOption,
} from './types';

// =============================================================================
// Expense Service
// =============================================================================

export {
  generateExpenseNumber,
  formatExpense,
  listExpenses,
  getExpense,
  createExpense,
  updateExpense,
  deleteExpense,
} from './expense-service';

// =============================================================================
// Income Service
// =============================================================================

export {
  generateIncomeNumber,
  formatIncome,
  listIncome,
  getIncome,
  createIncome,
  updateIncome,
  deleteIncome,
} from './income-service';

// =============================================================================
// VAT Service
// =============================================================================

export {
  CATEGORY_MAPPINGS,
  parseCategory,
  parseDate,
  parseAmount,
  parseBoolean,
} from './vat-service';

// =============================================================================
// CSV Import Service
// =============================================================================

export {
  parseCSV,
  mapHeaders,
  validateExpenseRows,
  importExpensesBatch,
  getImportHistory,
  getImportBatch,
  deleteImportBatch,
  getCSVTemplate,
} from './csv-import-service';
