import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getPreviousWeekRange, formatGBP } from '@/lib/server/tax-utils';
import { sendEmail } from '@/lib/server/email';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@makebelieveimprints.co.uk';
const APP_NAME = 'MakeBelieve Imprints';

interface WeeklyReportData {
  weekStart: string;
  weekEnd: string;
  revenue: {
    total: number;
    orderCount: number;
    averageOrderValue: number;
  };
  expenses: {
    total: number;
    count: number;
  };
  profit: {
    net: number;
    margin: number;
  };
  vat: {
    collected: number;
    reclaimable: number;
    liability: number;
  };
  weekOverWeek: {
    revenueChange: number;
    orderCountChange: number;
    profitChange: number;
  };
}

/**
 * POST /api/cron/weekly-financial-report
 * Send weekly financial summary email to admin
 * Should be triggered every Monday at 9am via Vercel Cron
 */
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret - REQUIRED in production
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    // In production, CRON_SECRET must be set
    if (!cronSecret && process.env.NODE_ENV === 'production') {
      console.error('CRON_SECRET environment variable is not set');
      return NextResponse.json(
        { success: false, error: 'Server misconfiguration' },
        { status: 500 }
      );
    }

    // Validate authorization if secret is configured
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get previous week range (Mon-Sun)
    const { start: weekStart, end: weekEnd } = getPreviousWeekRange();

    // Check if report already sent for this week
    const existingReport = await prisma.weeklyEmailReport.findUnique({
      where: {
        weekStartDate_weekEndDate: {
          weekStartDate: weekStart,
          weekEndDate: weekEnd,
        },
      },
    });

    if (existingReport) {
      return NextResponse.json({
        success: true,
        message: 'Weekly report already sent for this period',
        reportId: existingReport.id,
      });
    }

    // Get orders for the week
    const orders = await prisma.order.findMany({
      where: {
        createdAt: {
          gte: weekStart,
          lte: weekEnd,
        },
        status: {
          in: ['payment_confirmed', 'printing', 'shipped', 'delivered'],
        },
      },
      select: {
        id: true,
        totalPrice: true,
        refundAmount: true,
      },
    });

    // Get expenses for the week
    const expenses = await prisma.expense.findMany({
      where: {
        purchaseDate: {
          gte: weekStart,
          lte: weekEnd,
        },
      },
      select: {
        id: true,
        amount: true,
        vatAmount: true,
        isVatReclaimable: true,
      },
    });

    // Calculate metrics
    const totalRevenue = orders.reduce((sum, o) => sum + Number(o.totalPrice || 0), 0);
    const totalRefunds = orders.reduce((sum, o) => sum + Number(o.refundAmount || 0), 0);
    const netRevenue = totalRevenue - totalRefunds;
    const orderCount = orders.length;
    const averageOrderValue = orderCount > 0 ? netRevenue / orderCount : 0;

    const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const reclaimableVAT = expenses
      .filter((e) => e.isVatReclaimable && e.vatAmount)
      .reduce((sum, e) => sum + Number(e.vatAmount || 0), 0);

    const netProfit = netRevenue - totalExpenses;
    const profitMargin = netRevenue > 0 ? (netProfit / netRevenue) * 100 : 0;

    const vatRate = 0.2;
    const vatCollected = netRevenue * (vatRate / (1 + vatRate));
    const vatLiability = vatCollected - reclaimableVAT;

    // Get previous week's data for comparison
    const twoWeeksAgo = new Date(weekStart);
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 7);
    const twoWeeksAgoEnd = new Date(weekEnd);
    twoWeeksAgoEnd.setDate(twoWeeksAgoEnd.getDate() - 7);

    const prevWeekOrders = await prisma.order.findMany({
      where: {
        createdAt: {
          gte: twoWeeksAgo,
          lte: twoWeeksAgoEnd,
        },
        status: {
          in: ['payment_confirmed', 'printing', 'shipped', 'delivered'],
        },
      },
      select: {
        totalPrice: true,
        refundAmount: true,
      },
    });

    const prevWeekRevenue = prevWeekOrders.reduce(
      (sum, o) => sum + Number(o.totalPrice || 0) - Number(o.refundAmount || 0),
      0
    );
    const prevWeekExpenses = await prisma.expense.aggregate({
      where: {
        purchaseDate: {
          gte: twoWeeksAgo,
          lte: twoWeeksAgoEnd,
        },
      },
      _sum: { amount: true },
    });
    const prevWeekProfit = prevWeekRevenue - Number(prevWeekExpenses._sum.amount || 0);

    // Calculate week-over-week changes
    const revenueChange = prevWeekRevenue > 0 ? ((netRevenue - prevWeekRevenue) / prevWeekRevenue) * 100 : 0;
    const orderCountChange = prevWeekOrders.length > 0 ? ((orderCount - prevWeekOrders.length) / prevWeekOrders.length) * 100 : 0;
    const profitChange = prevWeekProfit !== 0 ? ((netProfit - prevWeekProfit) / Math.abs(prevWeekProfit)) * 100 : 0;

    // Build report data
    const reportData: WeeklyReportData = {
      weekStart: weekStart.toISOString(),
      weekEnd: weekEnd.toISOString(),
      revenue: {
        total: Math.round(netRevenue * 100) / 100,
        orderCount,
        averageOrderValue: Math.round(averageOrderValue * 100) / 100,
      },
      expenses: {
        total: Math.round(totalExpenses * 100) / 100,
        count: expenses.length,
      },
      profit: {
        net: Math.round(netProfit * 100) / 100,
        margin: Math.round(profitMargin * 100) / 100,
      },
      vat: {
        collected: Math.round(vatCollected * 100) / 100,
        reclaimable: Math.round(reclaimableVAT * 100) / 100,
        liability: Math.round(vatLiability * 100) / 100,
      },
      weekOverWeek: {
        revenueChange: Math.round(revenueChange * 100) / 100,
        orderCountChange: Math.round(orderCountChange * 100) / 100,
        profitChange: Math.round(profitChange * 100) / 100,
      },
    };

    // Format dates for email
    const formatDateShort = (date: Date) =>
      date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    const weekRangeStr = `${formatDateShort(weekStart)} - ${formatDateShort(weekEnd)}`;

    // Build email HTML
    const emailHtml = buildWeeklyReportEmail(reportData, weekRangeStr);

    // Send email
    const emailSent = await sendEmail({
      to: ADMIN_EMAIL,
      subject: `Weekly Financial Summary: ${weekRangeStr}`,
      html: emailHtml,
      text: `Weekly Financial Summary for ${weekRangeStr}\n\nRevenue: ${formatGBP(netRevenue)}\nExpenses: ${formatGBP(totalExpenses)}\nProfit: ${formatGBP(netProfit)}\nOrders: ${orderCount}`,
    });

    if (!emailSent) {
      console.error('Failed to send weekly report email');
      return NextResponse.json(
        { success: false, error: 'Failed to send email' },
        { status: 500 }
      );
    }

    // Store the report
    const report = await prisma.weeklyEmailReport.create({
      data: {
        weekStartDate: weekStart,
        weekEndDate: weekEnd,
        emailSentTo: ADMIN_EMAIL,
        emailSentAt: new Date(),
        reportData: reportData as unknown as Prisma.InputJsonValue,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Weekly financial report sent successfully',
      reportId: report.id,
      data: reportData,
    });
  } catch (error) {
    console.error('Weekly financial report error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate weekly report' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/cron/weekly-financial-report
 * Preview what the next weekly report would contain (for testing)
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret or admin auth
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    // In production, CRON_SECRET must be set
    if (!cronSecret && process.env.NODE_ENV === 'production') {
      console.error('CRON_SECRET environment variable is not set');
      return NextResponse.json(
        { success: false, error: 'Server misconfiguration' },
        { status: 500 }
      );
    }

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { start: weekStart, end: weekEnd } = getPreviousWeekRange();

    // Get quick stats
    const [orders, expenses] = await Promise.all([
      prisma.order.count({
        where: {
          createdAt: {
            gte: weekStart,
            lte: weekEnd,
          },
          status: {
            in: ['payment_confirmed', 'printing', 'shipped', 'delivered'],
          },
        },
      }),
      prisma.expense.count({
        where: {
          purchaseDate: {
            gte: weekStart,
            lte: weekEnd,
          },
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      preview: {
        weekStart: weekStart.toISOString(),
        weekEnd: weekEnd.toISOString(),
        orderCount: orders,
        expenseCount: expenses,
        wouldSendTo: ADMIN_EMAIL,
      },
    });
  } catch (error) {
    console.error('Weekly report preview error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate preview' },
      { status: 500 }
    );
  }
}

function buildWeeklyReportEmail(data: WeeklyReportData, weekRange: string): string {
  const changeIndicator = (value: number) => {
    if (value > 0) return `<span style="color: #22c55e;">↑ ${value.toFixed(1)}%</span>`;
    if (value < 0) return `<span style="color: #ef4444;">↓ ${Math.abs(value).toFixed(1)}%</span>`;
    return '<span style="color: #6b7280;">—</span>';
  };

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Weekly Financial Summary</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
      <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">${APP_NAME}</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Weekly Financial Summary</p>
        <p style="color: rgba(255,255,255,0.8); margin: 5px 0 0 0; font-size: 14px;">${weekRange}</p>
      </div>

      <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
        <!-- Key Metrics -->
        <div style="display: flex; flex-wrap: wrap; gap: 15px; margin-bottom: 30px;">
          <div style="flex: 1; min-width: 120px; background: #f0fdf4; padding: 15px; border-radius: 8px; text-align: center;">
            <p style="margin: 0; color: #166534; font-size: 12px; text-transform: uppercase;">Revenue</p>
            <p style="margin: 5px 0 0 0; font-size: 24px; font-weight: bold; color: #15803d;">${formatGBP(data.revenue.total)}</p>
            <p style="margin: 5px 0 0 0; font-size: 12px;">${changeIndicator(data.weekOverWeek.revenueChange)} vs last week</p>
          </div>

          <div style="flex: 1; min-width: 120px; background: #fef2f2; padding: 15px; border-radius: 8px; text-align: center;">
            <p style="margin: 0; color: #991b1b; font-size: 12px; text-transform: uppercase;">Expenses</p>
            <p style="margin: 5px 0 0 0; font-size: 24px; font-weight: bold; color: #dc2626;">${formatGBP(data.expenses.total)}</p>
            <p style="margin: 5px 0 0 0; font-size: 12px;">${data.expenses.count} expense(s)</p>
          </div>

          <div style="flex: 1; min-width: 120px; background: ${data.profit.net >= 0 ? '#f0fdf4' : '#fef2f2'}; padding: 15px; border-radius: 8px; text-align: center;">
            <p style="margin: 0; color: #374151; font-size: 12px; text-transform: uppercase;">Profit</p>
            <p style="margin: 5px 0 0 0; font-size: 24px; font-weight: bold; color: ${data.profit.net >= 0 ? '#15803d' : '#dc2626'};">${formatGBP(data.profit.net)}</p>
            <p style="margin: 5px 0 0 0; font-size: 12px;">${changeIndicator(data.weekOverWeek.profitChange)} vs last week</p>
          </div>
        </div>

        <!-- Order Stats -->
        <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h3 style="margin: 0 0 15px 0; font-size: 16px; color: #1f2937;">Order Statistics</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">Total Orders</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: bold;">${data.revenue.orderCount}</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; text-align: right; font-size: 12px;">${changeIndicator(data.weekOverWeek.orderCountChange)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0;">Average Order Value</td>
              <td style="padding: 8px 0; text-align: right; font-weight: bold;">${formatGBP(data.revenue.averageOrderValue)}</td>
              <td style="padding: 8px 0;"></td>
            </tr>
          </table>
        </div>

        <!-- VAT Summary -->
        <div style="background: #eff6ff; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h3 style="margin: 0 0 15px 0; font-size: 16px; color: #1e40af;">VAT Summary</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #bfdbfe;">VAT Collected</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #bfdbfe; text-align: right;">${formatGBP(data.vat.collected)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #bfdbfe;">VAT Reclaimable</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #bfdbfe; text-align: right; color: #22c55e;">-${formatGBP(data.vat.reclaimable)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Net VAT Liability</td>
              <td style="padding: 8px 0; text-align: right; font-weight: bold;">${formatGBP(data.vat.liability)}</td>
            </tr>
          </table>
        </div>

        <!-- Footer -->
        <div style="text-align: center; padding-top: 20px; border-top: 1px solid #e5e7eb;">
          <p style="margin: 0; font-size: 12px; color: #6b7280;">
            This is an automated weekly summary from your ${APP_NAME} accounting dashboard.
          </p>
          <p style="margin: 10px 0 0 0;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://makebelieveimprints.co.uk'}/admin/accounting" style="color: #6366f1; text-decoration: none;">View Full Dashboard →</a>
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}
