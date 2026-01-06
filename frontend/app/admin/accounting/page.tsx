'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import apiClient from '@/lib/api/client';
import Link from 'next/link';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { getAvailableTaxYears } from '@/lib/server/tax-utils';

interface DashboardData {
  taxYear: string;
  period: {
    start: string;
    end: string;
  };
  summary: {
    totalRevenue: number;
    totalRefunds: number;
    netRevenue: number;
    totalExpenses: number;
    netProfit: number;
    profitMargin: number;
    vatCollected: number;
    vatReclaimable: number;
    vatLiability: number;
    orderCount: number;
    averageOrderValue: number;
  };
  expensesByCategory: Array<{
    category: string;
    label: string;
    amount: number;
    count: number;
  }>;
  weekComparison: {
    currentWeek: number;
    previousWeek: number;
    changePercent: number;
  };
  topExpenseCategory: {
    category: string;
    label: string;
    amount: number;
  } | null;
  recentTransactions: Array<{
    id: string;
    type: 'order' | 'expense';
    amount: number;
    description: string;
    category?: string;
    date: string;
  }>;
}

function AccountingDashboardContent() {
  const router = useRouter();
  const { user } = useAuth();

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTaxYear, setSelectedTaxYear] = useState<string>('');

  const availableTaxYears = getAvailableTaxYears();

  // Redirect if not admin
  useEffect(() => {
    if (user && user.userType !== 'PRINTER_ADMIN') {
      router.push('/dashboard');
    }
  }, [user, router]);

  const fetchDashboardData = useCallback(async (taxYear?: string) => {
    try {
      setLoading(true);
      setError('');

      const params = taxYear ? `?taxYear=${taxYear}` : '';
      const response = await apiClient.get<{ success: boolean; data: DashboardData }>(
        `/admin/accounting/dashboard${params}`
      );

      if (response.data?.data) {
        setData(response.data.data);
        if (!selectedTaxYear) {
          setSelectedTaxYear(response.data.data.taxYear);
        }
      }
    } catch (err: unknown) {
      const error = err as { error?: string; message?: string };
      setError(error?.error || error?.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [selectedTaxYear]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleTaxYearChange = (year: string) => {
    setSelectedTaxYear(year);
    fetchDashboardData(year);
  };

  if (user && user.userType !== 'PRINTER_ADMIN') {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin">
              <Button variant="ghost" size="sm">
                ← Back to Admin
              </Button>
            </Link>
            <h1 className="text-2xl font-bold">
              <span className="text-neon-gradient">Accounting Dashboard</span>
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <Select value={selectedTaxYear} onValueChange={handleTaxYearChange}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Select Tax Year" />
              </SelectTrigger>
              <SelectContent>
                {availableTaxYears.map((year) => (
                  <SelectItem key={year} value={year}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Badge variant="outline" className="text-xs">
              UK Tax Year
            </Badge>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {error && (
          <div className="bg-destructive/10 border border-destructive/50 text-destructive px-4 py-3 rounded-lg text-sm mb-6">
            {error}
          </div>
        )}

        {/* Period Info */}
        {data && (
          <div className="mb-6 text-sm text-muted-foreground">
            Tax Year {data.taxYear}: {formatDate(data.period.start)} - {formatDate(data.period.end)}
          </div>
        )}

        {/* Primary Stats */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="card-glow">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Net Revenue</CardTitle>
              <CardDescription>After refunds</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  <div className="h-10 w-28 bg-primary/20 rounded animate-pulse" />
                  <div className="h-4 w-20 bg-muted/30 rounded animate-pulse" />
                </div>
              ) : (
                <>
                  <p className="text-3xl font-bold text-primary">
                    {formatCurrency(data?.summary.netRevenue || 0)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Gross: {formatCurrency(data?.summary.totalRevenue || 0)}
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="card-glow">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Total Expenses</CardTitle>
              <CardDescription>All categories</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  <div className="h-10 w-24 bg-red-500/20 rounded animate-pulse" />
                  <div className="h-4 w-16 bg-muted/30 rounded animate-pulse" />
                </div>
              ) : (
                <>
                  <p className="text-3xl font-bold text-red-500">
                    {formatCurrency(data?.summary.totalExpenses || 0)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {data?.expensesByCategory?.length || 0} categories
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="card-glow">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Net Profit</CardTitle>
              <CardDescription>Revenue - Expenses</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  <div className="h-10 w-24 bg-green-500/20 rounded animate-pulse" />
                  <div className="h-4 w-16 bg-muted/30 rounded animate-pulse" />
                </div>
              ) : (
                <>
                  <p className={`text-3xl font-bold ${(data?.summary.netProfit || 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {formatCurrency(data?.summary.netProfit || 0)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {data?.summary.profitMargin?.toFixed(1)}% margin
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="card-glow">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">VAT Liability</CardTitle>
              <CardDescription>Collected - Reclaimable</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  <div className="h-10 w-24 bg-blue-500/20 rounded animate-pulse" />
                  <div className="h-4 w-20 bg-muted/30 rounded animate-pulse" />
                </div>
              ) : (
                <>
                  <p className="text-3xl font-bold text-blue-500">
                    {formatCurrency(data?.summary.vatLiability || 0)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Reclaimable: {formatCurrency(data?.summary.vatReclaimable || 0)}
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Secondary Stats */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-card/50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Orders</p>
                  {loading ? (
                    <div className="h-7 w-12 bg-muted/30 rounded animate-pulse mt-1" />
                  ) : (
                    <p className="text-2xl font-semibold">{data?.summary.orderCount || 0}</p>
                  )}
                </div>
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-xl">📦</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avg Order Value</p>
                  {loading ? (
                    <div className="h-7 w-16 bg-muted/30 rounded animate-pulse mt-1" />
                  ) : (
                    <p className="text-2xl font-semibold">{formatCurrency(data?.summary.averageOrderValue || 0)}</p>
                  )}
                </div>
                <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
                  <span className="text-xl">💷</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">This Week</p>
                  {loading ? (
                    <div className="h-7 w-16 bg-muted/30 rounded animate-pulse mt-1" />
                  ) : (
                    <>
                      <p className="text-2xl font-semibold">{formatCurrency(data?.weekComparison.currentWeek || 0)}</p>
                      {data?.weekComparison.changePercent !== 0 && (
                        <p className={`text-xs ${(data?.weekComparison.changePercent || 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {(data?.weekComparison.changePercent || 0) >= 0 ? '↑' : '↓'} {Math.abs(data?.weekComparison.changePercent || 0).toFixed(1)}% vs last week
                        </p>
                      )}
                    </>
                  )}
                </div>
                <div className="h-12 w-12 rounded-full bg-cyan-500/10 flex items-center justify-center">
                  <span className="text-xl">📈</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Top Expense</p>
                  {loading ? (
                    <div className="h-7 w-20 bg-muted/30 rounded animate-pulse mt-1" />
                  ) : data?.topExpenseCategory ? (
                    <>
                      <p className="text-lg font-semibold truncate max-w-[140px]">{data.topExpenseCategory.label}</p>
                      <p className="text-xs text-muted-foreground">{formatCurrency(data.topExpenseCategory.amount)}</p>
                    </>
                  ) : (
                    <p className="text-lg text-muted-foreground">No expenses</p>
                  )}
                </div>
                <div className="h-12 w-12 rounded-full bg-orange-500/10 flex items-center justify-center">
                  <span className="text-xl">🏷️</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="card-glow mb-8">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Manage your accounting</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-4">
            <Link href="/admin/accounting/income">
              <Button className="btn-gradient">Manage Income</Button>
            </Link>
            <Link href="/admin/accounting/expenses">
              <Button className="btn-gradient">Manage Expenses</Button>
            </Link>
            <Link href="/admin/accounting/income?action=add">
              <Button variant="outline">+ Add Income</Button>
            </Link>
            <Link href="/admin/accounting/expenses?action=add">
              <Button variant="outline">+ Add Expense</Button>
            </Link>
            <Link href="/admin/accounting/expenses/import">
              <Button variant="outline">Import CSV</Button>
            </Link>
            <Link href="/admin/accounting/reports">
              <Button variant="outline">View Reports</Button>
            </Link>
            <Link href="/admin/accounting/suppliers">
              <Button variant="outline">Suppliers</Button>
            </Link>
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Expenses by Category */}
          <Card className="card-glow">
            <CardHeader>
              <CardTitle>Expenses by Category</CardTitle>
              <CardDescription>Breakdown for tax year {selectedTaxYear}</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-card/30 rounded-lg">
                      <div className="h-5 w-32 bg-muted/30 rounded animate-pulse" />
                      <div className="h-5 w-20 bg-muted/30 rounded animate-pulse" />
                    </div>
                  ))}
                </div>
              ) : data?.expensesByCategory && data.expensesByCategory.length > 0 ? (
                <div className="space-y-3">
                  {data.expensesByCategory.map((cat) => (
                    <div
                      key={cat.category}
                      className="flex items-center justify-between p-3 bg-card/30 rounded-lg hover:bg-card/50 transition-colors"
                    >
                      <div>
                        <p className="font-medium">{cat.label}</p>
                        <p className="text-xs text-muted-foreground">{cat.count} expense{cat.count !== 1 ? 's' : ''}</p>
                      </div>
                      <p className="font-semibold text-red-400">{formatCurrency(cat.amount)}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No expenses recorded</p>
                  <Link href="/admin/accounting/expenses?action=add">
                    <Button variant="link" className="mt-2">Add your first expense</Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Transactions */}
          <Card className="card-glow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Recent Transactions</CardTitle>
                  <CardDescription>Latest orders & expenses</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-card/30 rounded-lg">
                      <div className="space-y-1">
                        <div className="h-5 w-40 bg-muted/30 rounded animate-pulse" />
                        <div className="h-4 w-24 bg-muted/30 rounded animate-pulse" />
                      </div>
                      <div className="h-6 w-16 bg-muted/30 rounded animate-pulse" />
                    </div>
                  ))}
                </div>
              ) : data?.recentTransactions && data.recentTransactions.length > 0 ? (
                <div className="space-y-3">
                  {data.recentTransactions.map((tx) => (
                    <div
                      key={`${tx.type}-${tx.id}`}
                      className="flex items-center justify-between p-3 bg-card/30 rounded-lg hover:bg-card/50 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                          tx.type === 'order' ? 'bg-green-500/10' : 'bg-red-500/10'
                        }`}>
                          {tx.type === 'order' ? '↓' : '↑'}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium truncate max-w-[200px]">{tx.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(tx.date)}
                            {tx.category && ` • ${tx.category}`}
                          </p>
                        </div>
                      </div>
                      <p className={`font-semibold ${tx.amount >= 0 ? 'text-green-500' : 'text-red-400'}`}>
                        {tx.amount >= 0 ? '+' : ''}{formatCurrency(tx.amount)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No transactions yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

export default function AccountingDashboardPage() {
  return (
    <ProtectedRoute>
      <AccountingDashboardContent />
    </ProtectedRoute>
  );
}
