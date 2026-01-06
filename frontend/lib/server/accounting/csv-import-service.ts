/**
 * CSV Import Service
 *
 * Handles CSV parsing, validation, and import of expenses.
 */

import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { getTaxYearForDate, EXPENSE_CATEGORY_LABELS } from '../tax-utils';
import { ParsedExpenseRow, ValidatedExpense, ImportResult } from './types';
import { parseCategory, parseDate, parseAmount, parseBoolean } from './vat-service';
import { generateExpenseNumber, formatExpense } from './expense-service';

// =============================================================================
// CSV Parsing Functions
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

// =============================================================================
// Validation Functions
// =============================================================================

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

// =============================================================================
// Import Functions
// =============================================================================

/**
 * Import validated expenses into the database
 */
export async function importExpensesBatch(
  expenses: ValidatedExpense[],
  adminId: string,
  fileName: string,
  parsedRows: ParsedExpenseRow[]
): Promise<ImportResult> {
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
): Promise<{ success: boolean; data?: { message: string }; error?: string }> {
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
