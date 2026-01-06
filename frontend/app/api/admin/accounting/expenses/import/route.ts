import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, handleApiError } from '@/lib/server/auth';
import {
  parseCSV,
  mapHeaders,
  validateExpenseRows,
  importExpensesBatch,
  getImportHistory,
  getCSVTemplate,
} from '@/lib/server/expense-service';
import { EXPENSE_CATEGORY_LABELS } from '@/lib/server/tax-utils';

/**
 * POST /api/admin/accounting/expenses/import
 * Parse CSV and validate data, optionally commit to database
 */
export async function POST(request: NextRequest) {
  try {
    const adminUser = await requireAdmin(request);

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const action = (formData.get('action') as string) || 'preview';
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
    const columnMapping = columnMappingJson
      ? JSON.parse(columnMappingJson)
      : mapHeaders(headers);

    // Parse and validate rows
    const { parsedRows, validatedExpenses } = validateExpenseRows(
      rows,
      headers,
      columnMapping
    );

    // Preview mode - return parsed data for review
    if (action === 'preview') {
      return NextResponse.json({
        success: true,
        data: {
          headers,
          columnMapping,
          totalRows: rows.length,
          validRows: validatedExpenses.length,
          errorRows: parsedRows.filter((r) => r.errors.length > 0).length,
          warningRows: parsedRows.filter(
            (r) => r.warnings.length > 0 && r.errors.length === 0
          ).length,
          rows: parsedRows,
          categories: Object.entries(EXPENSE_CATEGORY_LABELS).map(
            ([value, label]) => ({ value, label })
          ),
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

      const result = await importExpensesBatch(
        validatedExpenses,
        adminUser.userId,
        file.name,
        parsedRows
      );

      return NextResponse.json({
        success: true,
        data: result,
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
      const template = getCSVTemplate();

      return new NextResponse(template, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="expense_import_template.csv"',
        },
      });
    }

    // Get import history
    const data = await getImportHistory();

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Get import data error:', error);
    return handleApiError(error);
  }
}
