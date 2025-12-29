import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin, handleApiError } from '@/lib/server/auth';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/accounting/reports/[id]
 * Get a single report by ID
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request);
    const { id } = await params;

    const report = await prisma.financialReport.findUnique({
      where: { id },
    });

    if (!report) {
      return NextResponse.json(
        { success: false, error: 'Report not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
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
      },
    });
  } catch (error) {
    console.error('Get report error:', error);
    return handleApiError(error);
  }
}

/**
 * DELETE /api/admin/accounting/reports/[id]
 * Delete a report
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request);
    const { id } = await params;

    const existing = await prisma.financialReport.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Report not found' },
        { status: 404 }
      );
    }

    await prisma.financialReport.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Report deleted successfully',
    });
  } catch (error) {
    console.error('Delete report error:', error);
    return handleApiError(error);
  }
}
