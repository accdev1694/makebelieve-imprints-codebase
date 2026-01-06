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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import apiClient from '@/lib/api/client';
import Link from 'next/link';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { getAvailableTaxYears } from '@/lib/server/tax-utils';

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
  createdAt: string;
}

const REPORT_TYPE_LABELS: Record<string, string> = {
  SUMMARY: 'Summary',
  PROFIT_LOSS: 'Profit & Loss',
  VAT_RETURN: 'VAT Return',
  TAX_YEAR_END: 'Tax Year End',
};

const REPORT_TYPE_COLORS: Record<string, string> = {
  SUMMARY: 'bg-blue-500/10 text-blue-500 border-blue-500/50',
  PROFIT_LOSS: 'bg-green-500/10 text-green-500 border-green-500/50',
  VAT_RETURN: 'bg-purple-500/10 text-purple-500 border-purple-500/50',
  TAX_YEAR_END: 'bg-orange-500/10 text-orange-500 border-orange-500/50',
};

function ReportsContent() {
  const router = useRouter();
  const { user } = useAuth();

  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Filters
  const [filterType, setFilterType] = useState('');
  const [filterTaxYear, setFilterTaxYear] = useState('');

  // Generate modal
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [generateType, setGenerateType] = useState('PROFIT_LOSS');
  const [generateTaxYear, setGenerateTaxYear] = useState('');
  const [generating, setGenerating] = useState(false);

  // Delete confirmation
  const [deleteReport, setDeleteReport] = useState<Report | null>(null);
  const [deleting, setDeleting] = useState(false);

  const availableTaxYears = getAvailableTaxYears();

  // Redirect if not admin
  useEffect(() => {
    if (user && user.userType !== 'PRINTER_ADMIN') {
      router.push('/dashboard');
    }
  }, [user, router]);

  // Set default tax year
  useEffect(() => {
    if (!generateTaxYear && availableTaxYears.length > 0) {
      setGenerateTaxYear(availableTaxYears[0]);
    }
  }, [availableTaxYears, generateTaxYear]);

  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const params = new URLSearchParams();
      if (filterType && filterType !== 'all') params.set('type', filterType);
      if (filterTaxYear && filterTaxYear !== 'all') params.set('taxYear', filterTaxYear);

      const response = await apiClient.get<{ success: boolean; data: { reports: Report[] } }>(
        `/admin/accounting/reports?${params.toString()}`
      );

      if (response.data?.data) {
        setReports(response.data.data.reports);
      }
    } catch (err: unknown) {
      const error = err as { error?: string; message?: string };
      setError(error?.error || error?.message || 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  }, [filterType, filterTaxYear]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleGenerateReport = async () => {
    try {
      setGenerating(true);
      setError('');

      await apiClient.post('/admin/accounting/reports', {
        reportType: generateType,
        taxYear: generateTaxYear,
      });

      setSuccessMessage('Report generated successfully');
      setShowGenerateModal(false);
      fetchReports();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: unknown) {
      const error = err as { error?: string; message?: string };
      setError(error?.error || error?.message || 'Failed to generate report');
    } finally {
      setGenerating(false);
    }
  };

  const handleDeleteReport = async () => {
    if (!deleteReport) return;

    try {
      setDeleting(true);
      await apiClient.delete(`/admin/accounting/reports/${deleteReport.id}`);
      setSuccessMessage('Report deleted successfully');
      setDeleteReport(null);
      fetchReports();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: unknown) {
      const error = err as { error?: string; message?: string };
      setError(error?.error || error?.message || 'Failed to delete report');
      setDeleteReport(null);
    } finally {
      setDeleting(false);
    }
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
            <Link href="/admin/accounting">
              <Button variant="ghost" size="sm">
                ← Back to Accounting
              </Button>
            </Link>
            <h1 className="text-2xl font-bold">
              <span className="text-neon-gradient">Financial Reports</span>
            </h1>
          </div>
          <Button className="btn-gradient" onClick={() => setShowGenerateModal(true)}>
            + Generate Report
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {error && (
          <div className="bg-destructive/10 border border-destructive/50 text-destructive px-4 py-3 rounded-lg text-sm mb-6">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="bg-green-500/10 border border-green-500/50 text-green-500 px-4 py-3 rounded-lg text-sm mb-6">
            {successMessage}
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-8">
          <div className="w-[180px]">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger>
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="PROFIT_LOSS">Profit & Loss</SelectItem>
                <SelectItem value="VAT_RETURN">VAT Return</SelectItem>
                <SelectItem value="TAX_YEAR_END">Tax Year End</SelectItem>
                <SelectItem value="SUMMARY">Summary</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="w-[160px]">
            <Select value={filterTaxYear} onValueChange={setFilterTaxYear}>
              <SelectTrigger>
                <SelectValue placeholder="All Years" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Years</SelectItem>
                {availableTaxYears.map((year) => (
                  <SelectItem key={year} value={year}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {(filterType || filterTaxYear) && (
            <Button
              variant="ghost"
              onClick={() => {
                setFilterType('');
                setFilterTaxYear('');
              }}
            >
              Clear Filters
            </Button>
          )}
        </div>

        {/* Reports List */}
        <Card className="card-glow">
          <CardHeader>
            <CardTitle>Generated Reports</CardTitle>
            <CardDescription>
              {reports.length} report{reports.length !== 1 ? 's' : ''}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="p-4 bg-card/30 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="space-y-2">
                        <div className="h-5 w-48 bg-muted/30 rounded animate-pulse" />
                        <div className="h-4 w-32 bg-muted/30 rounded animate-pulse" />
                      </div>
                      <div className="h-6 w-20 bg-muted/30 rounded animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            ) : reports.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">No reports generated yet</p>
                <Button onClick={() => setShowGenerateModal(true)}>
                  Generate your first report
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {reports.map((report) => (
                  <div
                    key={report.id}
                    className="p-4 bg-card/30 rounded-lg hover:bg-card/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold">{report.name}</h4>
                          <Badge
                            className={`${REPORT_TYPE_COLORS[report.reportType]} border text-xs`}
                          >
                            {REPORT_TYPE_LABELS[report.reportType]}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(report.periodStart)} - {formatDate(report.periodEnd)}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-sm">
                          <span>Revenue: {formatCurrency(report.totalRevenue)}</span>
                          <span>Expenses: {formatCurrency(report.totalExpenses)}</span>
                          <span className={report.netProfit >= 0 ? 'text-green-500' : 'text-red-500'}>
                            Profit: {formatCurrency(report.netProfit)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/admin/accounting/reports/${report.id}`)}
                        >
                          View
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeleteReport(report)}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Generated {formatDate(report.createdAt)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Generate Modal */}
      <Dialog open={showGenerateModal} onOpenChange={setShowGenerateModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate Report</DialogTitle>
            <DialogDescription>
              Choose report type and tax year to generate a new financial report.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Report Type</label>
              <Select value={generateType} onValueChange={setGenerateType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PROFIT_LOSS">Profit & Loss</SelectItem>
                  <SelectItem value="VAT_RETURN">VAT Return</SelectItem>
                  <SelectItem value="TAX_YEAR_END">Tax Year End</SelectItem>
                  <SelectItem value="SUMMARY">Summary</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Tax Year</label>
              <Select value={generateTaxYear} onValueChange={setGenerateTaxYear}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableTaxYears.map((year) => (
                    <SelectItem key={year} value={year}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGenerateModal(false)}>
              Cancel
            </Button>
            <Button
              className="btn-gradient"
              onClick={handleGenerateReport}
              disabled={generating || !generateType || !generateTaxYear}
            >
              {generating ? 'Generating...' : 'Generate Report'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteReport} onOpenChange={() => setDeleteReport(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Report?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deleteReport?.name}&quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteReport}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleting}
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function ReportsPage() {
  return (
    <ProtectedRoute>
      <ReportsContent />
    </ProtectedRoute>
  );
}
