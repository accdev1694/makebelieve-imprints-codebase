import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin, handleApiError } from '@/lib/server/auth';
import { getTaxYearForDate, EXPENSE_CATEGORY_LABELS } from '@/lib/server/tax-utils';
import { ExpenseCategory, Prisma } from '@prisma/client';

interface ParsedExpenseRow {
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

interface ValidatedExpense {
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

const CATEGORY_MAPPINGS: Record<string, ExpenseCategory> = {
  // Direct matches (from schema enum)
  'MATERIALS': 'MATERIALS',
  'PACKAGING': 'PACKAGING',
  'SHIPPING_SUPPLIES': 'SHIPPING_SUPPLIES',
  'EQUIPMENT': 'EQUIPMENT',
  'SOFTWARE': 'SOFTWARE',
  'UTILITIES': 'UTILITIES',
  'MARKETING': 'MARKETING',
  'OTHER': 'OTHER',
  // Common alternatives mapped to valid categories
  'printing': 'MATERIALS',
  'print': 'MATERIALS',
  'materials': 'MATERIALS',
  'ink': 'MATERIALS',
  'paper': 'MATERIALS',
  'supplies': 'MATERIALS',
  'package': 'PACKAGING',
  'boxes': 'PACKAGING',
  'ship': 'SHIPPING_SUPPLIES',
  'shipping': 'SHIPPING_SUPPLIES',
  'postage': 'SHIPPING_SUPPLIES',
  'delivery': 'SHIPPING_SUPPLIES',
  'courier': 'SHIPPING_SUPPLIES',
  'equip': 'EQUIPMENT',
  'hardware': 'EQUIPMENT',
  'machinery': 'EQUIPMENT',
  'printer': 'EQUIPMENT',
  'soft': 'SOFTWARE',
  'subscription': 'SOFTWARE',
  'saas': 'SOFTWARE',
  'app': 'SOFTWARE',
  'ads': 'MARKETING',
  'advertising': 'MARKETING',
  'promotion': 'MARKETING',
  'electric': 'UTILITIES',
  'gas': 'UTILITIES',
  'water': 'UTILITIES',
  'internet': 'UTILITIES',
  'phone': 'UTILITIES',
  'rent': 'UTILITIES',
  'office': 'UTILITIES',
  'misc': 'OTHER',
  'miscellaneous': 'OTHER',
  'bank': 'OTHER',
  'fees': 'OTHER',
  'insurance': 'OTHER',
  'travel': 'OTHER',
  'fuel': 'OTHER',
};

function parseCategory(value: string | undefined): ExpenseCategory | null {
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

function parseDate(value: string | undefined): Date | null {
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

  // MM/DD/YYYY (US format)
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

function parseAmount(value: string | undefined): number | null {
  if (!value) return null;

  // Remove currency symbols and whitespace
  const cleaned = value.trim().replace(/[£$€,\s]/g, '');
  const num = parseFloat(cleaned);

  return isNaN(num) ? null : Math.round(num * 100) / 100;
}

function parseBoolean(value: string | undefined): boolean {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return ['true', 'yes', '1', 'y'].includes(normalized);
}

function parseCSV(content: string): { headers: string[]; rows: string[][] } {
  const lines = content.split(/\r?\n/).filter(line => line.trim());
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

  const headers = parseRow(lines[0]).map(h => h.toLowerCase().replace(/\s+/g, '_'));
  const rows = lines.slice(1).map(parseRow);

  return { headers, rows };
}

function mapHeaders(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};

  const headerMappings: Record<string, string[]> = {
    description: ['description', 'desc', 'name', 'item', 'expense', 'title'],
    amount: ['amount', 'total', 'price', 'cost', 'value', 'sum'],
    category: ['category', 'cat', 'type', 'expense_type', 'expense_category'],
    purchaseDate: ['purchase_date', 'date', 'purchased', 'transaction_date', 'expense_date'],
    supplier: ['supplier', 'vendor', 'merchant', 'shop', 'store', 'from', 'company'],
    externalReference: ['invoice_number', 'invoice', 'inv', 'reference', 'ref', 'receipt', 'external_reference'],
    vatAmount: ['vat_amount', 'vat', 'tax', 'tax_amount'],
    vatRate: ['vat_rate', 'tax_rate', 'rate'],
    isVatReclaimable: ['is_vat_reclaimable', 'vat_reclaimable', 'reclaimable', 'can_reclaim'],
    notes: ['notes', 'note', 'comments', 'comment', 'memo', 'details'],
  };

  for (const header of headers) {
    const normalized = header.toLowerCase().replace(/[^a-z0-9]/g, '_');

    for (const [field, alternatives] of Object.entries(headerMappings)) {
      if (alternatives.includes(normalized) || alternatives.some(alt => normalized.includes(alt))) {
        mapping[header] = field;
        break;
      }
    }
  }

  return mapping;
}

async function generateExpenseNumber(): Promise<string> {
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
 * POST /api/admin/accounting/expenses/import
 * Parse CSV and validate data, optionally commit to database
 */
export async function POST(request: NextRequest) {
  try {
    const adminUser = await requireAdmin(request);

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const action = formData.get('action') as string || 'preview';
    const columnMappingJson = formData.get('columnMapping') as string | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'CSV file is required' },
        { status: 400 }
      );
    }

    if (!file.name.endsWith('.csv')) {
      return NextResponse.json(
        { success: false, error: 'File must be a CSV' },
        { status: 400 }
      );
    }

    const content = await file.text();
    const { headers, rows } = parseCSV(content);

    if (headers.length === 0) {
      return NextResponse.json(
        { success: false, error: 'CSV file is empty or invalid' },
        { status: 400 }
      );
    }

    // Auto-detect or use provided column mapping
    let columnMapping: Record<string, string>;
    if (columnMappingJson) {
      columnMapping = JSON.parse(columnMappingJson);
    } else {
      columnMapping = mapHeaders(headers);
    }

    // Parse and validate rows
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
      const vatRate = parseAmount(data.vatRate);

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
          vatRate: vatRate ?? undefined,
          isVatReclaimable: parseBoolean(data.isVatReclaimable),
          notes: data.notes?.trim(),
        });
      }
    }

    // Preview mode - return parsed data for review
    if (action === 'preview') {
      return NextResponse.json({
        success: true,
        data: {
          headers,
          columnMapping,
          totalRows: rows.length,
          validRows: validatedExpenses.length,
          errorRows: parsedRows.filter(r => r.errors.length > 0).length,
          warningRows: parsedRows.filter(r => r.warnings.length > 0 && r.errors.length === 0).length,
          rows: parsedRows,
          categories: Object.entries(EXPENSE_CATEGORY_LABELS).map(([value, label]) => ({ value, label })),
        },
      });
    }

    // Import mode - commit to database
    if (action === 'import') {
      if (validatedExpenses.length === 0) {
        return NextResponse.json(
          { success: false, error: 'No valid expenses to import' },
          { status: 400 }
        );
      }

      // Create import batch
      const batch = await prisma.expenseImportBatch.create({
        data: {
          source: 'CSV_IMPORT',
          fileName: file.name,
          recordCount: rows.length,
          status: 'PROCESSING',
          importedBy: adminUser.userId,
        },
      });

      // Import expenses
      let successCount = 0;
      const importErrors: Array<{ row: number; error: string }> = [];

      for (let i = 0; i < validatedExpenses.length; i++) {
        const expense = validatedExpenses[i];
        const rowNumber = parsedRows.findIndex(r =>
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
          status: importErrors.length === 0 ? 'COMPLETED' : 'COMPLETED',
          successCount,
          errorCount: importErrors.length,
          errors: importErrors.length > 0 ? importErrors as unknown as Prisma.InputJsonValue : Prisma.DbNull,
          completedAt: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        data: {
          batchId: batch.id,
          totalRows: rows.length,
          imported: successCount,
          failed: importErrors.length,
          errors: importErrors,
        },
      });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action. Use "preview" or "import"' },
      { status: 400 }
    );

  } catch (error) {
    console.error('CSV import error:', error);
    return handleApiError(error);
  }
}

/**
 * GET /api/admin/accounting/expenses/import
 * Get CSV template and import history
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    // Download CSV template
    if (action === 'template') {
      const template = [
        'description,amount,category,purchase_date,supplier,invoice_number,vat_amount,vat_rate,is_vat_reclaimable,notes',
        'Printer ink cartridges,£45.99,MATERIALS,15/01/2025,Amazon,INV-12345,7.67,20,yes,Black and color cartridges',
        'Shipping boxes (50 pack),£32.00,PACKAGING,16/01/2025,Packaging Direct,PD-9876,5.33,20,yes,Medium boxes',
        'Monthly software subscription,£19.99,SOFTWARE,01/01/2025,Adobe,SUB-2025-01,3.33,20,yes,Creative Cloud',
      ].join('\n');

      return new NextResponse(template, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="expense_import_template.csv"',
        },
      });
    }

    // Get import history
    const batches = await prisma.expenseImportBatch.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return NextResponse.json({
      success: true,
      data: {
        batches,
        categories: Object.entries(EXPENSE_CATEGORY_LABELS).map(([value, label]) => ({ value, label })),
      },
    });

  } catch (error) {
    console.error('Get import data error:', error);
    return handleApiError(error);
  }
}
