import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin, handleApiError } from '@/lib/server/auth';
import {
  getCurrentTaxYear,
  getTaxYearDates,
  getPreviousWeekRange,
  getWeekRange,
  EXPENSE_CATEGORY_LABELS,
  INCOME_CATEGORY_LABELS,
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

    // Fetch orders, income, and expenses in parallel for better performance
    const [orders, incomeEntries, expenses] = await Promise.all([
      // Get completed orders for revenue calculation
      prisma.order.findMany({
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
      }),
      // Get manual income entries for the period
      prisma.income.findMany({
        where: {
          incomeDate: {
            gte: periodStart,
            lte: periodEnd,
          },
        },
        select: {
          id: true,
          amount: true,
          vatAmount: true,
          category: true,
          description: true,
          source: true,
          incomeDate: true,
        },
      }),
      // Get expenses for the period
      prisma.expense.findMany({
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
      }),
    ]);

    // Calculate order revenue metrics
    const orderRevenue = orders.reduce(
      (sum, order) => sum + Number(order.totalPrice || 0),
      0
    );
    const totalRefunds = orders.reduce(
      (sum, order) => sum + Number(order.refundAmount || 0),
      0
    );
    const netOrderRevenue = orderRevenue - totalRefunds;

    // Calculate manual income metrics
    const manualIncome = incomeEntries.reduce(
      (sum, income) => sum + Number(income.amount || 0),
      0
    );
    const incomeVatCollected = incomeEntries
      .filter((i) => i.vatAmount)
      .reduce((sum, i) => sum + Number(i.vatAmount || 0), 0);

    // Combined revenue
    const totalRevenue = orderRevenue + manualIncome;
    const netRevenue = netOrderRevenue + manualIncome;

    // Calculate expense metrics (expenses already fetched in parallel above)
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

    // Income by category
    const incomeByCategory = incomeEntries.reduce(
      (acc, income) => {
        const category = income.category;
        if (!acc[category]) {
          acc[category] = { amount: 0, count: 0 };
        }
        acc[category].amount += Number(income.amount || 0);
        acc[category].count += 1;
        return acc;
      },
      {} as Record<string, { amount: number; count: number }>
    );

    // Calculate VAT collected (from orders + manual income)
    const vatRate = 0.2;
    const orderVatCollected = netOrderRevenue * (vatRate / (1 + vatRate));
    const vatCollected = orderVatCollected + incomeVatCollected;

    // Net profit
    const netProfit = netRevenue - totalExpenses;
    const profitMargin = netRevenue > 0 ? (netProfit / netRevenue) * 100 : 0;

    // VAT liability (collected - reclaimable)
    const vatLiability = vatCollected - reclaimableVAT;

    // Order stats
    const orderCount = orders.length;
    const incomeCount = incomeEntries.length;
    const averageOrderValue = orderCount > 0 ? netOrderRevenue / orderCount : 0;

    // Get recent transactions in parallel (orders + income + expenses combined)
    const [recentOrders, recentIncome, recentExpenses] = await Promise.all([
      prisma.order.findMany({
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
      }),
      prisma.income.findMany({
        select: {
          id: true,
          amount: true,
          description: true,
          category: true,
          source: true,
          incomeDate: true,
        },
        orderBy: { incomeDate: 'desc' },
        take: 5,
      }),
      prisma.expense.findMany({
        select: {
          id: true,
          amount: true,
          description: true,
          category: true,
          purchaseDate: true,
        },
        orderBy: { purchaseDate: 'desc' },
        take: 5,
      }),
    ]);

    // Combine and sort transactions
    const recentTransactions = [
      ...recentOrders.map((order) => ({
        id: order.id,
        type: 'order' as const,
        amount: Number(order.totalPrice),
        description: `Order from ${(order.shippingAddress as { name?: string })?.name || 'Customer'}`,
        date: order.createdAt,
      })),
      ...recentIncome.map((income) => ({
        id: income.id,
        type: 'income' as const,
        amount: Number(income.amount),
        description: income.description,
        category: income.category,
        source: income.source,
        date: income.incomeDate,
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

    // Week-over-week comparison (orders + income)
    const currentWeek = getWeekRange(new Date());
    const previousWeek = getPreviousWeekRange();

    const currentWeekOrderRevenue = orders
      .filter(
        (o) =>
          new Date(o.createdAt) >= currentWeek.start &&
          new Date(o.createdAt) <= currentWeek.end
      )
      .reduce((sum, o) => sum + Number(o.totalPrice || 0), 0);

    const currentWeekIncome = incomeEntries
      .filter(
        (i) =>
          new Date(i.incomeDate) >= currentWeek.start &&
          new Date(i.incomeDate) <= currentWeek.end
      )
      .reduce((sum, i) => sum + Number(i.amount || 0), 0);

    const currentWeekRevenue = currentWeekOrderRevenue + currentWeekIncome;

    const previousWeekOrderRevenue = orders
      .filter(
        (o) =>
          new Date(o.createdAt) >= previousWeek.start &&
          new Date(o.createdAt) <= previousWeek.end
      )
      .reduce((sum, o) => sum + Number(o.totalPrice || 0), 0);

    const previousWeekIncome = incomeEntries
      .filter(
        (i) =>
          new Date(i.incomeDate) >= previousWeek.start &&
          new Date(i.incomeDate) <= previousWeek.end
      )
      .reduce((sum, i) => sum + Number(i.amount || 0), 0);

    const previousWeekRevenue = previousWeekOrderRevenue + previousWeekIncome;

    const weekOverWeekChange =
      previousWeekRevenue > 0
        ? ((currentWeekRevenue - previousWeekRevenue) / previousWeekRevenue) * 100
        : 0;

    // Find top expense category
    const topExpenseCategory = Object.entries(expensesByCategory).sort(
      (a, b) => b[1].amount - a[1].amount
    )[0];

    // Find top income category
    const topIncomeCategory = Object.entries(incomeByCategory).sort(
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
          // Revenue breakdown
          orderRevenue: Math.round(orderRevenue * 100) / 100,
          manualIncome: Math.round(manualIncome * 100) / 100,
          totalRevenue: Math.round(totalRevenue * 100) / 100,
          totalRefunds: Math.round(totalRefunds * 100) / 100,
          netRevenue: Math.round(netRevenue * 100) / 100,
          // Expenses
          totalExpenses: Math.round(totalExpenses * 100) / 100,
          // Profit
          netProfit: Math.round(netProfit * 100) / 100,
          profitMargin: Math.round(profitMargin * 100) / 100,
          // VAT
          vatCollected: Math.round(vatCollected * 100) / 100,
          vatReclaimable: Math.round(reclaimableVAT * 100) / 100,
          vatLiability: Math.round(vatLiability * 100) / 100,
          // Counts
          orderCount,
          incomeCount,
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
        incomeByCategory: Object.entries(incomeByCategory).map(
          ([category, data]) => ({
            category,
            label: INCOME_CATEGORY_LABELS[category] || category,
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
        topIncomeCategory: topIncomeCategory
          ? {
              category: topIncomeCategory[0],
              label:
                INCOME_CATEGORY_LABELS[topIncomeCategory[0]] ||
                topIncomeCategory[0],
              amount: Math.round(topIncomeCategory[1].amount * 100) / 100,
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
