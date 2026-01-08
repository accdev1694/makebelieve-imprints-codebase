import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin, handleApiError } from '@/lib/server/auth';

/**
 * GET /api/admin/recovery-campaigns/stats
 * Get dashboard statistics for recovery campaigns
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get aggregate stats
    const [
      totalSent,
      totalConverted,
      totalPending,
      revenueData,
      byType,
    ] = await Promise.all([
      // Total sent in period
      prisma.recoveryCampaign.count({
        where: {
          status: 'SENT',
          emailSentAt: { gte: startDate },
        },
      }),
      // Total converted in period
      prisma.recoveryCampaign.count({
        where: {
          status: 'CONVERTED',
          convertedAt: { gte: startDate },
        },
      }),
      // Currently pending
      prisma.recoveryCampaign.count({
        where: {
          status: { in: ['PENDING', 'SENT'] },
        },
      }),
      // Revenue recovered in period
      prisma.recoveryCampaign.aggregate({
        where: {
          status: 'CONVERTED',
          convertedAt: { gte: startDate },
        },
        _sum: {
          recoveredRevenue: true,
        },
      }),
      // Breakdown by type
      prisma.recoveryCampaign.groupBy({
        by: ['type'],
        where: {
          emailSentAt: { gte: startDate },
        },
        _count: true,
      }),
    ]);

    // Calculate conversion rate
    const conversionRate = totalSent > 0 ? (totalConverted / totalSent) * 100 : 0;

    // Get recent activity (last 7 days by status)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const recentActivity = await prisma.recoveryCampaign.groupBy({
      by: ['status'],
      where: {
        createdAt: { gte: weekAgo },
      },
      _count: true,
    });

    return NextResponse.json({
      success: true,
      data: {
        period: `Last ${days} days`,
        summary: {
          totalSent,
          totalConverted,
          totalPending,
          conversionRate: Math.round(conversionRate * 100) / 100,
          revenueRecovered: revenueData._sum.recoveredRevenue ? Number(revenueData._sum.recoveredRevenue) : 0,
        },
        byType: byType.reduce((acc, item) => {
          acc[item.type] = item._count;
          return acc;
        }, {} as Record<string, number>),
        recentActivity: recentActivity.reduce((acc, item) => {
          acc[item.status] = item._count;
          return acc;
        }, {} as Record<string, number>),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
