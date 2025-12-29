import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin, handleApiError } from '@/lib/server/auth';
import {
  getCurrentTaxYear,
  getTaxYearDates,
  getPreviousWeekRange,
  getWeekRange,
  EXPENSE_CATEGORY_LABELS,
} from '@/lib/server/tax-utils';

/**
 * GET /api/admin/accounting/dashboard
 * Get accounting dashboard overview data
 * Query params: taxYear (optional, defaults to current)
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);

    const { searchParams } = new URL(request.url);
    const taxYear = searchParams.get('taxYear') || getCurrentTaxYear();
    const { start: periodStart, end: periodEnd } = getTaxYearDates(taxYear);

    // Get completed orders for revenue calculation
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
        status: true,
        createdAt: true,
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
        description: true,
        purchaseDate: true,
      },
    });

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
          acc[category] = { amount: 0, count: 0 };
        }
        acc[category].amount += Number(expense.amount || 0);
        acc[category].count += 1;
        return acc;
      },
      {} as Record<string, { amount: number; count: number }>
    );

    // Calculate VAT collected (approximate - 20% of net sales)
    // In a real system, this would come from invoices
    const vatRate = 0.2;
    const vatCollected = netRevenue * (vatRate / (1 + vatRate));

    // Net profit
    const netProfit = netRevenue - totalExpenses;
    const profitMargin = netRevenue > 0 ? (netProfit / netRevenue) * 100 : 0;

    // VAT liability (collected - reclaimable)
    const vatLiability = vatCollected - reclaimableVAT;

    // Order stats
    const orderCount = orders.length;
    const averageOrderValue = orderCount > 0 ? netRevenue / orderCount : 0;

    // Get recent transactions (last 10 orders + expenses combined)
    const recentOrders = await prisma.order.findMany({
      where: {
        status: {
          in: ['payment_confirmed', 'printing', 'shipped', 'delivered'],
        },
      },
      select: {
        id: true,
        totalPrice: true,
        createdAt: true,
        shippingAddress: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    const recentExpenses = await prisma.expense.findMany({
      select: {
        id: true,
        amount: true,
        description: true,
        category: true,
        purchaseDate: true,
      },
      orderBy: { purchaseDate: 'desc' },
      take: 5,
    });

    // Combine and sort transactions
    const recentTransactions = [
      ...recentOrders.map((order) => ({
        id: order.id,
        type: 'order' as const,
        amount: Number(order.totalPrice),
        description: `Order from ${(order.shippingAddress as { name?: string })?.name || 'Customer'}`,
        date: order.createdAt,
      })),
      ...recentExpenses.map((expense) => ({
        id: expense.id,
        type: 'expense' as const,
        amount: -Number(expense.amount),
        description: expense.description,
        category: expense.category,
        date: expense.purchaseDate,
      })),
    ]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10);

    // Week-over-week comparison
    const currentWeek = getWeekRange(new Date());
    const previousWeek = getPreviousWeekRange();

    const currentWeekRevenue = orders
      .filter(
        (o) =>
          new Date(o.createdAt) >= currentWeek.start &&
          new Date(o.createdAt) <= currentWeek.end
      )
      .reduce((sum, o) => sum + Number(o.totalPrice || 0), 0);

    const previousWeekRevenue = orders
      .filter(
        (o) =>
          new Date(o.createdAt) >= previousWeek.start &&
          new Date(o.createdAt) <= previousWeek.end
      )
      .reduce((sum, o) => sum + Number(o.totalPrice || 0), 0);

    const weekOverWeekChange =
      previousWeekRevenue > 0
        ? ((currentWeekRevenue - previousWeekRevenue) / previousWeekRevenue) * 100
        : 0;

    // Find top expense category
    const topExpenseCategory = Object.entries(expensesByCategory).sort(
      (a, b) => b[1].amount - a[1].amount
    )[0];

    return NextResponse.json({
      success: true,
      data: {
        taxYear,
        period: {
          start: periodStart.toISOString(),
          end: periodEnd.toISOString(),
        },
        summary: {
          totalRevenue: Math.round(totalRevenue * 100) / 100,
          totalRefunds: Math.round(totalRefunds * 100) / 100,
          netRevenue: Math.round(netRevenue * 100) / 100,
          totalExpenses: Math.round(totalExpenses * 100) / 100,
          netProfit: Math.round(netProfit * 100) / 100,
          profitMargin: Math.round(profitMargin * 100) / 100,
          vatCollected: Math.round(vatCollected * 100) / 100,
          vatReclaimable: Math.round(reclaimableVAT * 100) / 100,
          vatLiability: Math.round(vatLiability * 100) / 100,
          orderCount,
          averageOrderValue: Math.round(averageOrderValue * 100) / 100,
        },
        expensesByCategory: Object.entries(expensesByCategory).map(
          ([category, data]) => ({
            category,
            label: EXPENSE_CATEGORY_LABELS[category] || category,
            amount: Math.round(data.amount * 100) / 100,
            count: data.count,
          })
        ),
        weekComparison: {
          currentWeek: Math.round(currentWeekRevenue * 100) / 100,
          previousWeek: Math.round(previousWeekRevenue * 100) / 100,
          changePercent: Math.round(weekOverWeekChange * 100) / 100,
        },
        topExpenseCategory: topExpenseCategory
          ? {
              category: topExpenseCategory[0],
              label:
                EXPENSE_CATEGORY_LABELS[topExpenseCategory[0]] ||
                topExpenseCategory[0],
              amount: Math.round(topExpenseCategory[1].amount * 100) / 100,
            }
          : null,
        recentTransactions,
      },
    });
  } catch (error) {
    console.error('Accounting dashboard error:', error);
    return handleApiError(error);
  }
}
