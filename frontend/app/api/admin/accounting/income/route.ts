import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin, handleApiError } from '@/lib/server/auth';
import { getTaxYearForDate, INCOME_CATEGORY_LABELS } from '@/lib/server/tax-utils';
import { IncomeCategory } from '@prisma/client';

/**
 * Generate unique income number like INC-202501-0001
 */
async function generateIncomeNumber(): Promise<string> {
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
 * GET /api/admin/accounting/income
 * List income entries with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);

    const { searchParams } = new URL(request.url);
    const categoryParam = searchParams.get('category');
    const category = categoryParam && categoryParam !== 'all' ? categoryParam as IncomeCategory : null;
    const source = searchParams.get('source');
    const taxYear = searchParams.get('taxYear');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const search = searchParams.get('search');
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    const where: Record<string, unknown> = {};

    if (category) {
      where.category = category;
    }

    if (source) {
      where.source = {
        contains: source,
        mode: 'insensitive',
      };
    }

    if (taxYear && taxYear !== 'all') {
      where.taxYear = taxYear;
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

    return NextResponse.json({
      success: true,
      data: {
        income: income.map((i) => ({
          ...i,
          amount: Number(i.amount),
          vatAmount: i.vatAmount ? Number(i.vatAmount) : null,
          vatRate: i.vatRate ? Number(i.vatRate) : null,
          categoryLabel: INCOME_CATEGORY_LABELS[i.category] || i.category,
        })),
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
        },
        categories: Object.entries(INCOME_CATEGORY_LABELS).map(([value, label]) => ({
          value,
          label,
        })),
      },
    });
  } catch (error) {
    console.error('List income error:', error);
    return handleApiError(error);
  }
}

/**
 * POST /api/admin/accounting/income
 * Create a new income entry
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request);

    const body = await request.json();
    const {
      description,
      amount,
      category,
      source,
      customerName,
      incomeDate,
      vatAmount,
      vatRate,
      isVatIncluded,
      externalReference,
      notes,
      receiptUrl,
    } = body;

    // Validation
    if (!description || typeof description !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Description is required' },
        { status: 400 }
      );
    }

    if (!amount || isNaN(parseFloat(amount))) {
      return NextResponse.json(
        { success: false, error: 'Valid amount is required' },
        { status: 400 }
      );
    }

    if (!category || !Object.keys(INCOME_CATEGORY_LABELS).includes(category)) {
      return NextResponse.json(
        { success: false, error: 'Valid category is required' },
        { status: 400 }
      );
    }

    const incomeNumber = await generateIncomeNumber();
    const parsedIncomeDate = incomeDate ? new Date(incomeDate) : new Date();

    const income = await prisma.income.create({
      data: {
        incomeNumber,
        description: description.trim(),
        amount: parseFloat(amount),
        category: category as IncomeCategory,
        source: source?.trim() || null,
        customerName: customerName?.trim() || null,
        incomeDate: parsedIncomeDate,
        vatAmount: vatAmount ? parseFloat(vatAmount) : null,
        vatRate: vatRate ? parseFloat(vatRate) : null,
        isVatIncluded: isVatIncluded ?? true,
        externalReference: externalReference?.trim() || null,
        notes: notes?.trim() || null,
        receiptUrl: receiptUrl?.trim() || null,
        taxYear: getTaxYearForDate(parsedIncomeDate),
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        ...income,
        amount: Number(income.amount),
        vatAmount: income.vatAmount ? Number(income.vatAmount) : null,
        vatRate: income.vatRate ? Number(income.vatRate) : null,
      },
    });
  } catch (error) {
    console.error('Create income error:', error);
    return handleApiError(error);
  }
}
