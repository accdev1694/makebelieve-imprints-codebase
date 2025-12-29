'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import apiClient from '@/lib/api/client';
import Link from 'next/link';

interface CategoryExpense {
  category: string;
  label: string;
  amount: number;
  count: number;
}

interface ReportData {
  revenue?: {
    gross: number;
    refunds: number;
    net: number;
  };
  expenses?: {
    total: number;
    byCategory: CategoryExpense[];
  };
  profit?: {
    net: number;
    margin: number;
  };
  overview?: {
    revenue: number;
    expenses: number;
    profit: number;
    vatLiability: number;
  };
  vatCollected?: number;
  vatReclaimable?: number;
  vatLiability?: number;
  netSales?: number;
  totalExpenses?: number;
  boxes?: Record<string, number>;
  orderCount?: number;
  expenseCount?: number;
}

interface Report {
  id: string;
  name: string;
  reportType: 'SUMMARY' | 'PROFIT_LOSS' | 'VAT_RETURN' | 'TAX_YEAR_END';
  taxYear: string | null;
  periodStart: string;
  periodEnd: string;
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  vatReclaimable: number | null;
  reportData: ReportData;
  expensesByCategory: Record<string, { amount: number; count: number; label: string }>;
  createdAt: string;
}

const REPORT_TYPE_LABELS: Record<string, string> = {
  SUMMARY: 'Summary Report',
  PROFIT_LOSS: 'Profit & Loss Statement',
  VAT_RETURN: 'VAT Return',
  TAX_YEAR_END: 'Tax Year End Report',
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
  }).format(amount);
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

interface PageProps {
  params: Promise<{ id: string }>;
}

function ReportDetailContent({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useAuth();

  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Redirect if not admin
  useEffect(() => {
    if (user && user.userType !== 'PRINTER_ADMIN') {
      router.push('/dashboard');
    }
  }, [user, router]);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        setLoading(true);
        setError('');

        const response = await apiClient.get<{ success: boolean; data: Report }>(
          `/admin/accounting/reports/${id}`
        );

        if (response.data?.data) {
          setReport(response.data.data);
        }
      } catch (err: unknown) {
        const error = err as { error?: string; message?: string };
        setError(error?.error || error?.message || 'Failed to load report');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchReport();
    }
  }, [id]);

  if (user && user.userType !== 'PRINTER_ADMIN') {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-md h-8 w-8 border-t-2 border-b-2 border-primary mb-2" />
          <p className="text-sm text-muted-foreground">Loading report...</p>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
          <div className="container mx-auto px-4 py-4">
            <Link href="/admin/accounting/reports">
              <Button variant="ghost" size="sm">
                ← Back to Reports
              </Button>
            </Link>
          </div>
        </header>
        <main className="container mx-auto px-4 py-8">
          <div className="bg-destructive/10 border border-destructive/50 text-destructive px-4 py-3 rounded-lg">
            {error || 'Report not found'}
          </div>
        </main>
      </div>
    );
  }

  const reportData = report.reportData as ReportData;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin/accounting/reports">
              <Button variant="ghost" size="sm">
                ← Back to Reports
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">
                <span className="text-neon-gradient">{REPORT_TYPE_LABELS[report.reportType]}</span>
              </h1>
              <p className="text-sm text-muted-foreground">
                Tax Year {report.taxYear} | {formatDate(report.periodStart)} - {formatDate(report.periodEnd)}
              </p>
            </div>
          </div>
          <Badge variant="outline">Generated {formatDate(report.createdAt)}</Badge>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Summary Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="card-glow">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Net Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-primary">
                {formatCurrency(report.totalRevenue)}
              </p>
            </CardContent>
          </Card>

          <Card className="card-glow">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Total Expenses</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-red-500">
                {formatCurrency(report.totalExpenses)}
              </p>
            </CardContent>
          </Card>

          <Card className="card-glow">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Net Profit</CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-3xl font-bold ${report.netProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {formatCurrency(report.netProfit)}
              </p>
              {reportData.profit?.margin && (
                <p className="text-sm text-muted-foreground">
                  {reportData.profit.margin.toFixed(1)}% margin
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Report Type Specific Content */}
        {(report.reportType === 'PROFIT_LOSS' || report.reportType === 'TAX_YEAR_END') && reportData.expenses && (
          <div className="grid lg:grid-cols-2 gap-8 mb-8">
            {/* Revenue Breakdown */}
            <Card className="card-glow">
              <CardHeader>
                <CardTitle>Revenue Breakdown</CardTitle>
                <CardDescription>Income details for the period</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b">
                  <span>Gross Revenue</span>
                  <span className="font-semibold">{formatCurrency(reportData.revenue?.gross || 0)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span>Refunds</span>
                  <span className="font-semibold text-red-400">-{formatCurrency(reportData.revenue?.refunds || 0)}</span>
                </div>
                <div className="flex justify-between items-center py-2 font-bold">
                  <span>Net Revenue</span>
                  <span className="text-primary">{formatCurrency(reportData.revenue?.net || 0)}</span>
                </div>
                {reportData.orderCount !== undefined && (
                  <p className="text-sm text-muted-foreground pt-2">
                    Total Orders: {reportData.orderCount}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Expenses by Category */}
            <Card className="card-glow">
              <CardHeader>
                <CardTitle>Expenses by Category</CardTitle>
                <CardDescription>Expense breakdown for the period</CardDescription>
              </CardHeader>
              <CardContent>
                {reportData.expenses.byCategory && reportData.expenses.byCategory.length > 0 ? (
                  <div className="space-y-3">
                    {reportData.expenses.byCategory.map((cat) => (
                      <div key={cat.category} className="flex justify-between items-center py-2 border-b last:border-0">
                        <div>
                          <span>{cat.label}</span>
                          <p className="text-xs text-muted-foreground">{cat.count} expense{cat.count !== 1 ? 's' : ''}</p>
                        </div>
                        <span className="font-semibold text-red-400">{formatCurrency(cat.amount)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between items-center py-2 font-bold border-t mt-2">
                      <span>Total Expenses</span>
                      <span className="text-red-500">{formatCurrency(reportData.expenses.total)}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-4">No expenses recorded</p>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* VAT Return Specific Content */}
        {report.reportType === 'VAT_RETURN' && reportData.boxes && (
          <Card className="card-glow mb-8">
            <CardHeader>
              <CardTitle>VAT Return Summary</CardTitle>
              <CardDescription>HMRC VAT Return format</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-semibold mb-2">VAT Due</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between py-2 border-b">
                      <span>Box 1 - VAT due on sales</span>
                      <span className="font-mono">{formatCurrency(reportData.boxes.box1)}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b">
                      <span>Box 2 - VAT due on acquisitions</span>
                      <span className="font-mono">{formatCurrency(reportData.boxes.box2)}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b font-semibold">
                      <span>Box 3 - Total VAT due</span>
                      <span className="font-mono">{formatCurrency(reportData.boxes.box3)}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b">
                      <span>Box 4 - VAT reclaimed</span>
                      <span className="font-mono text-green-500">{formatCurrency(reportData.boxes.box4)}</span>
                    </div>
                    <div className="flex justify-between py-2 font-bold text-lg">
                      <span>Box 5 - Net VAT to pay</span>
                      <span className={`font-mono ${reportData.boxes.box5 >= 0 ? 'text-red-500' : 'text-green-500'}`}>
                        {formatCurrency(reportData.boxes.box5)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-semibold mb-2">Totals (excl. VAT)</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between py-2 border-b">
                      <span>Box 6 - Total sales</span>
                      <span className="font-mono">{formatCurrency(reportData.boxes.box6)}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b">
                      <span>Box 7 - Total purchases</span>
                      <span className="font-mono">{formatCurrency(reportData.boxes.box7)}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b">
                      <span>Box 8 - Supplies to EC</span>
                      <span className="font-mono">{formatCurrency(reportData.boxes.box8)}</span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span>Box 9 - Acquisitions from EC</span>
                      <span className="font-mono">{formatCurrency(reportData.boxes.box9)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {report.vatReclaimable && (
                <div className="mt-6 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                  <p className="text-sm">
                    <span className="font-semibold">Reclaimable VAT:</span>{' '}
                    {formatCurrency(report.vatReclaimable)}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Summary Report Content */}
        {report.reportType === 'SUMMARY' && reportData.overview && (
          <Card className="card-glow mb-8">
            <CardHeader>
              <CardTitle>Financial Overview</CardTitle>
              <CardDescription>Summary for tax year {report.taxYear}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="text-center p-4 bg-card/30 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Revenue</p>
                  <p className="text-2xl font-bold text-primary">{formatCurrency(reportData.overview.revenue)}</p>
                </div>
                <div className="text-center p-4 bg-card/30 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Expenses</p>
                  <p className="text-2xl font-bold text-red-500">{formatCurrency(reportData.overview.expenses)}</p>
                </div>
                <div className="text-center p-4 bg-card/30 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Profit</p>
                  <p className={`text-2xl font-bold ${reportData.overview.profit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {formatCurrency(reportData.overview.profit)}
                  </p>
                </div>
                <div className="text-center p-4 bg-card/30 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">VAT Liability</p>
                  <p className="text-2xl font-bold text-blue-500">{formatCurrency(reportData.overview.vatLiability)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}

export default function ReportDetailPage(props: PageProps) {
  return (
    <ProtectedRoute>
      <ReportDetailContent {...props} />
    </ProtectedRoute>
  );
}
