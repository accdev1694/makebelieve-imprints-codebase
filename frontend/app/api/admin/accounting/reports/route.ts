import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireAdmin, handleApiError } from '@/lib/server/auth';
import {
  getTaxYearDates,
  getCurrentTaxYear,
  getVATQuartersForTaxYear,
  EXPENSE_CATEGORY_LABELS,
} from '@/lib/server/tax-utils';
import { FinancialReportType } from '@prisma/client';

/**
 * GET /api/admin/accounting/reports
 * List all generated reports
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);

    const { searchParams } = new URL(request.url);
    const reportType = searchParams.get('type') as FinancialReportType | null;
    const taxYear = searchParams.get('taxYear');

    const where: Record<string, unknown> = {};
    if (reportType) where.reportType = reportType;
    if (taxYear) where.taxYear = taxYear;

    const reports = await prisma.financialReport.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      data: {
        reports: reports.map((report) => ({
          ...report,
          // Map to frontend-friendly names
          periodStart: report.startDate,
          periodEnd: report.endDate,
          totalRevenue: Number(report.totalRevenue),
          totalExpenses: Number(report.totalExpenses),
          netProfit: Number(report.netProfit),
          vatCollected: Number(report.vatCollected),
          vatReclaimable: report.vatReclaimable ? Number(report.vatReclaimable) : null,
          grossProfit: report.grossProfit ? Number(report.grossProfit) : null,
          costOfGoodsSold: report.costOfGoodsSold ? Number(report.costOfGoodsSold) : null,
          // Generate name based on report type
          name: `${report.reportType === 'PROFIT_LOSS' ? 'P&L' : report.reportType === 'VAT_RETURN' ? 'VAT' : report.reportType} Report - ${report.taxYear}`,
        })),
      },
    });
  } catch (error) {
    console.error('List reports error:', error);
    return handleApiError(error);
  }
}

/**
 * POST /api/admin/accounting/reports
 * Generate a new report
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request);

    const body = await request.json();
    const { reportType, taxYear: requestedTaxYear, quarter } = body;

    if (!reportType || !['SUMMARY', 'PROFIT_LOSS', 'VAT_RETURN', 'TAX_YEAR_END'].includes(reportType)) {
      return NextResponse.json(
        { success: false, error: 'Valid report type is required' },
        { status: 400 }
      );
    }

    const taxYear = requestedTaxYear || getCurrentTaxYear();
    const { start: periodStart, end: periodEnd } = getTaxYearDates(taxYear);

    // Get orders for revenue calculation
    const orders = await prisma.order.findMany({
      where: {
        createdAt: {
          gte: periodStart,
          lte: periodEnd,
        },
        status: {
          in: ['payment_confirmed', 'printing', 'shipped', 'delivered'],
        },
      },
      select: {
        id: true,
        totalPrice: true,
        subtotal: true,
        discountAmount: true,
        refundAmount: true,
      },
    });

    // Get expenses for the period
    const expenses = await prisma.expense.findMany({
      where: {
        purchaseDate: {
          gte: periodStart,
          lte: periodEnd,
        },
      },
      select: {
        id: true,
        amount: true,
        vatAmount: true,
        isVatReclaimable: true,
        category: true,
      },
    });

    // Calculate revenue metrics
    const totalRevenue = orders.reduce(
      (sum, order) => sum + Number(order.totalPrice || 0),
      0
    );
    const totalRefunds = orders.reduce(
      (sum, order) => sum + Number(order.refundAmount || 0),
      0
    );
    const netRevenue = totalRevenue - totalRefunds;

    // Calculate expense metrics
    const totalExpenses = expenses.reduce(
      (sum, expense) => sum + Number(expense.amount || 0),
      0
    );
    const reclaimableVAT = expenses
      .filter((e) => e.isVatReclaimable && e.vatAmount)
      .reduce((sum, e) => sum + Number(e.vatAmount || 0), 0);

    // Expenses by category
    const expensesByCategory = expenses.reduce(
      (acc, expense) => {
        const category = expense.category;
        if (!acc[category]) {
          acc[category] = { amount: 0, count: 0, label: EXPENSE_CATEGORY_LABELS[category] || category };
        }
        acc[category].amount += Number(expense.amount || 0);
        acc[category].count += 1;
        return acc;
      },
      {} as Record<string, { amount: number; count: number; label: string }>
    );

    // Net profit
    const netProfit = netRevenue - totalExpenses;

    // VAT calculations
    const vatRate = 0.2;
    const vatCollected = netRevenue * (vatRate / (1 + vatRate));
    const vatLiability = vatCollected - reclaimableVAT;

    // Build report data based on type
    let reportData: Record<string, unknown> = {};

    if (reportType === 'PROFIT_LOSS' || reportType === 'TAX_YEAR_END') {
      reportData = {
        revenue: {
          gross: Math.round(totalRevenue * 100) / 100,
          refunds: Math.round(totalRefunds * 100) / 100,
          net: Math.round(netRevenue * 100) / 100,
        },
        expenses: {
          total: Math.round(totalExpenses * 100) / 100,
          byCategory: Object.entries(expensesByCategory).map(([category, data]) => ({
            category,
            label: data.label,
            amount: Math.round(data.amount * 100) / 100,
            count: data.count,
          })),
        },
        profit: {
          net: Math.round(netProfit * 100) / 100,
          margin: netRevenue > 0 ? Math.round((netProfit / netRevenue) * 10000) / 100 : 0,
        },
        orderCount: orders.length,
        expenseCount: expenses.length,
      };
    }

    if (reportType === 'VAT_RETURN') {
      const vatQuarters = getVATQuartersForTaxYear(taxYear);
      const quarterData = quarter ? vatQuarters.find(q => q.quarter === quarter) : null;

      reportData = {
        vatCollected: Math.round(vatCollected * 100) / 100,
        vatReclaimable: Math.round(reclaimableVAT * 100) / 100,
        vatLiability: Math.round(vatLiability * 100) / 100,
        netSales: Math.round(netRevenue * 100) / 100,
        totalExpenses: Math.round(totalExpenses * 100) / 100,
        quarter: quarterData ? {
          number: quarterData.quarter,
          label: quarterData.label,
          start: quarterData.start.toISOString(),
          end: quarterData.end.toISOString(),
        } : null,
        // HMRC VAT Return boxes approximation
        boxes: {
          box1: Math.round(vatCollected * 100) / 100, // VAT due on sales
          box2: 0, // VAT due on acquisitions
          box3: Math.round(vatCollected * 100) / 100, // Total VAT due
          box4: Math.round(reclaimableVAT * 100) / 100, // VAT reclaimed
          box5: Math.round(vatLiability * 100) / 100, // Net VAT to pay/reclaim
          box6: Math.round(netRevenue * 100) / 100, // Total sales excl VAT
          box7: Math.round(totalExpenses * 100) / 100, // Total purchases excl VAT
          box8: 0, // Total supplies to EC
          box9: 0, // Total acquisitions from EC
        },
      };
    }

    if (reportType === 'SUMMARY') {
      reportData = {
        overview: {
          revenue: Math.round(netRevenue * 100) / 100,
          expenses: Math.round(totalExpenses * 100) / 100,
          profit: Math.round(netProfit * 100) / 100,
          vatLiability: Math.round(vatLiability * 100) / 100,
        },
        orderCount: orders.length,
        expenseCount: expenses.length,
      };
    }

    // Create the report
    const report = await prisma.financialReport.create({
      data: {
        period: 'YEARLY',
        reportType,
        taxYear,
        startDate: periodStart,
        endDate: periodEnd,
        totalRevenue: netRevenue,
        totalExpenses,
        netProfit,
        vatCollected,
        orderCount: orders.length,
        vatReclaimable: reclaimableVAT,
        expensesByCategory: expensesByCategory as Prisma.InputJsonValue,
        reportData: reportData as Prisma.InputJsonValue,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        ...report,
        totalRevenue: Number(report.totalRevenue),
        totalExpenses: Number(report.totalExpenses),
        netProfit: Number(report.netProfit),
        vatReclaimable: report.vatReclaimable ? Number(report.vatReclaimable) : null,
      },
    });
  } catch (error) {
    console.error('Generate report error:', error);
    return handleApiError(error);
  }
}
