'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
import { ReceiptScanner, ExtractedReceiptData } from '@/components/admin/accounting/ReceiptScanner';
import { DateInputUK } from '@/components/ui/date-input-uk';
import apiClient from '@/lib/api/client';
import Link from 'next/link';
import { Camera, ArrowUp, ArrowDown, Trash2 } from 'lucide-react';

interface Category {
  value: string;
  label: string;
}

interface Income {
  id: string;
  incomeNumber: string;
  description: string;
  amount: number;
  category: string;
  categoryLabel: string;
  source: string | null;
  customerName: string | null;
  incomeDate: string;
  vatAmount: number | null;
  vatRate: number | null;
  isVatIncluded: boolean;
  externalReference: string | null;
  notes: string | null;
  taxYear: string | null;
  createdAt: string;
}

interface IncomeFormData {
  description: string;
  amount: string;
  category: string;
  source: string;
  customerName: string;
  incomeDate: string;
  vatAmount: string;
  vatRate: string;
  isVatIncluded: boolean;
  externalReference: string;
  notes: string;
}

const defaultFormData: IncomeFormData = {
  description: '',
  amount: '',
  category: 'PRODUCT_SALES',
  source: '',
  customerName: '',
  incomeDate: new Date().toISOString().split('T')[0],
  vatAmount: '',
  vatRate: '20',
  isVatIncluded: true,
  externalReference: '',
  notes: '',
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
    month: 'short',
    year: 'numeric',
  });
}

// Simple month list for filtering within a tax year (ordered by UK tax year: Apr-Mar)
const MONTHS = [
  { value: '4', label: 'April' },
  { value: '5', label: 'May' },
  { value: '6', label: 'June' },
  { value: '7', label: 'July' },
  { value: '8', label: 'August' },
  { value: '9', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
  { value: '1', label: 'January' },
  { value: '2', label: 'February' },
  { value: '3', label: 'March' },
];

// Calculate date range for a month within a UK tax year
function getMonthDateRange(taxYear: string, month: string): { startDate: string; endDate: string } {
  const [startYear] = taxYear.split('-').map(Number);
  const monthNum = parseInt(month);

  // UK tax year: April-December are in startYear, January-March are in startYear+1
  const year = monthNum >= 4 ? startYear : startYear + 1;

  const startDate = new Date(year, monthNum - 1, 1);
  const endDate = new Date(year, monthNum, 0); // Last day of month

  return {
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0],
  };
}

function getAvailableTaxYears(): string[] {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const day = now.getDate();

  let currentStartYear = year;
  if (month < 3 || (month === 3 && day < 6)) {
    currentStartYear = year - 1;
  }

  const years: string[] = [];
  for (let y = 2020; y <= currentStartYear; y++) {
    years.push(`${y}-${y + 1}`);
  }
  return years.reverse();
}

function IncomeManagementContent() {
  const router = useRouter();
  const { user } = useAuth();

  const [income, setIncome] = useState<Income[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [filterTaxYear, setFilterTaxYear] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const availableTaxYears = getAvailableTaxYears();

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totals, setTotals] = useState({ totalAmount: 0, totalVat: 0, count: 0 });

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedIncome, setSelectedIncome] = useState<Income | null>(null);
  const [formData, setFormData] = useState<IncomeFormData>(defaultFormData);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Receipt scanner
  const [showScanner, setShowScanner] = useState(false);

  // Auto-calculate VAT
  const [autoCalculateVat, setAutoCalculateVat] = useState(true);

  // Redirect if not admin
  useEffect(() => {
    if (user && user.userType !== 'PRINTER_ADMIN') {
      router.push('/dashboard');
    }
  }, [user, router]);

  // Fetch income entries
  const fetchIncome = async () => {
    try {
      setLoading(true);
      setError('');

      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('limit', '7');
      params.set('sortOrder', sortOrder);
      if (searchQuery) params.set('search', searchQuery);
      if (categoryFilter) params.set('category', categoryFilter);
      if (sourceFilter) params.set('source', sourceFilter);
      if (filterTaxYear) params.set('taxYear', filterTaxYear);
      // Month filter only works when tax year is selected
      if (filterMonth && filterTaxYear) {
        const { startDate, endDate } = getMonthDateRange(filterTaxYear, filterMonth);
        params.set('startDate', startDate);
        params.set('endDate', endDate);
      }

      const response = await apiClient.get<{
        success: boolean;
        data: {
          income: Income[];
          pagination: { page: number; limit: number; total: number; totalPages: number };
          totals: { totalAmount: number; totalVat: number; count: number };
          categories: Category[];
        };
      }>(`/admin/accounting/income?${params.toString()}`);

      if (response.data?.data) {
        setIncome(response.data.data.income);
        setTotalPages(response.data.data.pagination.totalPages);
        setTotals(response.data.data.totals);
        setCategories(response.data.data.categories);
      }
    } catch (err: unknown) {
      const error = err as { error?: string; message?: string };
      setError(error?.error || error?.message || 'Failed to load income');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncome();
  }, [page, searchQuery, categoryFilter, sourceFilter, filterTaxYear, filterMonth, sortOrder]);

  const handleAddIncome = async () => {
    setFormError('');
    setSubmitting(true);

    try {
      const response = await apiClient.post<{ success: boolean; error?: string }>(
        '/admin/accounting/income',
        {
          ...formData,
          amount: parseFloat(formData.amount),
          vatAmount: formData.vatAmount ? parseFloat(formData.vatAmount) : null,
          vatRate: formData.vatRate ? parseFloat(formData.vatRate) : null,
        }
      );

      if (response.data?.success) {
        setIsAddModalOpen(false);
        setFormData(defaultFormData);
        fetchIncome();
      } else {
        setFormError(response.data?.error || 'Failed to add income');
      }
    } catch (err: unknown) {
      const error = err as { error?: string; message?: string };
      setFormError(error?.error || error?.message || 'Failed to add income');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditIncome = async () => {
    if (!selectedIncome) return;

    setFormError('');
    setSubmitting(true);

    try {
      const response = await apiClient.put<{ success: boolean; error?: string }>(
        `/admin/accounting/income/${selectedIncome.id}`,
        {
          ...formData,
          amount: parseFloat(formData.amount),
          vatAmount: formData.vatAmount ? parseFloat(formData.vatAmount) : null,
          vatRate: formData.vatRate ? parseFloat(formData.vatRate) : null,
        }
      );

      if (response.data?.success) {
        setIsEditModalOpen(false);
        setSelectedIncome(null);
        setFormData(defaultFormData);
        fetchIncome();
      } else {
        setFormError(response.data?.error || 'Failed to update income');
      }
    } catch (err: unknown) {
      const error = err as { error?: string; message?: string };
      setFormError(error?.error || error?.message || 'Failed to update income');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteIncome = async () => {
    if (!selectedIncome) return;

    try {
      await apiClient.delete(`/admin/accounting/income/${selectedIncome.id}`);
      setIsDeleteDialogOpen(false);
      setSelectedIncome(null);
      fetchIncome();
    } catch (err: unknown) {
      const error = err as { error?: string; message?: string };
      setError(error?.error || error?.message || 'Failed to delete income');
    }
  };

  const openEditModal = (inc: Income) => {
    setSelectedIncome(inc);
    setFormData({
      description: inc.description,
      amount: inc.amount.toString(),
      category: inc.category,
      source: inc.source || '',
      customerName: inc.customerName || '',
      incomeDate: inc.incomeDate.split('T')[0],
      vatAmount: inc.vatAmount?.toString() || '',
      vatRate: inc.vatRate?.toString() || '20',
      isVatIncluded: inc.isVatIncluded,
      externalReference: inc.externalReference || '',
      notes: inc.notes || '',
    });
    setFormError('');
    setIsEditModalOpen(true);
  };

  const openDeleteDialog = (inc: Income) => {
    setSelectedIncome(inc);
    setIsDeleteDialogOpen(true);
  };

  const handleReceiptData = (data: Partial<ExtractedReceiptData>) => {
    setFormData((prev) => ({
      ...prev,
      description: data.description || data.vendor || prev.description,
      amount: data.amount?.toString() || prev.amount,
      incomeDate: data.date
        ? new Date(data.date).toISOString().split('T')[0]
        : prev.incomeDate,
      vatAmount: data.vatAmount?.toString() || prev.vatAmount,
      vatRate: data.vatRate?.toString() || prev.vatRate,
      source: data.vendor || prev.source,
    }));
    setShowScanner(false);
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
            <div>
              <h1 className="text-2xl font-bold">
                <span className="text-neon-gradient">Income Management</span>
              </h1>
              <p className="text-sm text-muted-foreground">
                Track income from all channels
              </p>
            </div>
          </div>
          <Button onClick={() => {
            setFormData(defaultFormData);
            setFormError('');
            setIsAddModalOpen(true);
          }}>
            + Add Income
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {error && (
          <div className="mb-6 bg-destructive/10 border border-destructive/50 text-destructive px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="card-glow">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Total Income</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-500">
                {formatCurrency(totals.totalAmount)}
              </p>
            </CardContent>
          </Card>

          <Card className="card-glow">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">VAT Collected</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-blue-500">
                {formatCurrency(totals.totalVat)}
              </p>
            </CardContent>
          </Card>

          <Card className="card-glow">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Entry Count</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-primary">
                {totals.count}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4 items-end">
              <div className="flex-1 min-w-[200px]">
                <Label className="text-sm text-muted-foreground mb-2 block">Search</Label>
                <Input
                  placeholder="Search income..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPage(1);
                  }}
                />
              </div>
              <div className="w-[180px]">
                <Label className="text-sm text-muted-foreground mb-2 block">Category</Label>
                <Select
                  value={categoryFilter || 'all'}
                  onValueChange={(value: string) => {
                    setCategoryFilter(value === 'all' ? '' : value);
                    setPage(1);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.length > 0 ? categories.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    )) : (
                      <SelectItem value="loading" disabled>Loading...</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-[160px]">
                <Label className="text-sm text-muted-foreground mb-2 block">Tax Year</Label>
                <Select
                  value={filterTaxYear || 'all'}
                  onValueChange={(value: string) => {
                    setFilterTaxYear(value === 'all' ? '' : value);
                    setFilterMonth(''); // Clear month when tax year changes
                    setPage(1);
                  }}
                >
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
              <div className="w-[140px]">
                <Label className="text-sm text-muted-foreground mb-2 block">Month</Label>
                <Select
                  value={filterMonth || 'all'}
                  onValueChange={(value: string) => {
                    setFilterMonth(value === 'all' ? '' : value);
                    setPage(1);
                  }}
                  disabled={!filterTaxYear}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={filterTaxYear ? "All Months" : "Select year first"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Months</SelectItem>
                    {MONTHS.map((month) => (
                      <SelectItem key={month.value} value={month.value}>
                        {month.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-[140px]">
                <Label className="text-sm text-muted-foreground mb-2 block">Source</Label>
                <Input
                  placeholder="Filter by source..."
                  value={sourceFilter}
                  onChange={(e) => {
                    setSourceFilter(e.target.value);
                    setPage(1);
                  }}
                />
              </div>
              <div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
                  className="h-10"
                >
                  {sortOrder === 'desc' ? (
                    <><ArrowDown className="h-4 w-4 mr-1" /> Newest</>
                  ) : (
                    <><ArrowUp className="h-4 w-4 mr-1" /> Oldest</>
                  )}
                </Button>
              </div>
              {(searchQuery || categoryFilter || sourceFilter || filterTaxYear || filterMonth) && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setSearchQuery('');
                    setCategoryFilter('');
                    setSourceFilter('');
                    setFilterTaxYear('');
                    setFilterMonth('');
                    setPage(1);
                  }}
                >
                  Clear Filters
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Income Table */}
        <Card className="card-glow">
          <CardHeader>
            <CardTitle>Income Entries</CardTitle>
            <CardDescription>All recorded income from various channels</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-md h-8 w-8 border-t-2 border-b-2 border-primary mb-2" />
                <p className="text-sm text-muted-foreground">Loading income...</p>
              </div>
            ) : income.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No income entries found. Add your first income entry to get started.
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-2">Date</th>
                        <th className="text-left py-3 px-2">Description</th>
                        <th className="text-left py-3 px-2">Category</th>
                        <th className="text-left py-3 px-2">Source</th>
                        <th className="text-right py-3 px-2">Amount</th>
                        <th className="text-right py-3 px-2">VAT</th>
                        <th className="text-right py-3 px-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {income.map((inc) => (
                        <tr key={inc.id} className="border-b hover:bg-card/50">
                          <td className="py-3 px-2">
                            <span className="text-sm">{formatDate(inc.incomeDate)}</span>
                          </td>
                          <td className="py-3 px-2">
                            <div>
                              <p className="font-medium">{inc.description}</p>
                              {inc.customerName && (
                                <p className="text-xs text-muted-foreground">{inc.customerName}</p>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-2">
                            <Badge variant="outline">{inc.categoryLabel}</Badge>
                          </td>
                          <td className="py-3 px-2">
                            <span className="text-sm text-muted-foreground">
                              {inc.source || '-'}
                            </span>
                          </td>
                          <td className="py-3 px-2 text-right">
                            <span className="font-mono font-semibold text-green-500">
                              {formatCurrency(inc.amount)}
                            </span>
                          </td>
                          <td className="py-3 px-2 text-right">
                            <span className="font-mono text-sm">
                              {inc.vatAmount ? formatCurrency(inc.vatAmount) : '-'}
                            </span>
                          </td>
                          <td className="py-3 px-2 text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditModal(inc)}
                              >
                                Edit
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                                onClick={() => openDeleteDialog(inc)}
                              >
                                Delete
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex justify-center gap-2 mt-6">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      Previous
                    </Button>
                    <span className="px-4 py-2 text-sm">
                      Page {page} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Add/Edit Modal */}
      <Dialog open={isAddModalOpen || isEditModalOpen} onOpenChange={(open: boolean) => {
        if (!open) {
          setIsAddModalOpen(false);
          setIsEditModalOpen(false);
          setSelectedIncome(null);
          setFormData(defaultFormData);
          setFormError('');
        }
      }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditModalOpen ? 'Edit Income' : 'Add Income'}</DialogTitle>
            <DialogDescription>
              {isEditModalOpen ? 'Update income entry details' : 'Record a new income entry'}
            </DialogDescription>
          </DialogHeader>

          {formError && (
            <div className="bg-destructive/10 border border-destructive/50 text-destructive px-3 py-2 rounded text-sm">
              {formError}
            </div>
          )}

          <div className="space-y-4">
            {/* Scan Receipt Button */}
            <div className="flex justify-center">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowScanner(true)}
                className="w-full"
              >
                <Camera className="h-4 w-4 mr-2" />
                Scan Receipt to Auto-Fill
              </Button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  or enter manually
                </span>
              </div>
            </div>

            <div>
              <Label htmlFor="description">Description *</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="e.g., Market stall sales - Christmas fair"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="amount">Amount (GBP) *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => {
                    const newAmount = e.target.value;
                    if (autoCalculateVat) {
                      const amount = parseFloat(newAmount);
                      const vatRate = parseFloat(formData.vatRate) || 20;
                      const vatAmount = amount > 0 ? (amount * vatRate) / (100 + vatRate) : 0;
                      setFormData({ ...formData, amount: newAmount, vatAmount: vatAmount.toFixed(2) });
                    } else {
                      setFormData({ ...formData, amount: newAmount });
                    }
                  }}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label htmlFor="category">Category *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value: string) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.length > 0 ? categories.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    )) : (
                      <SelectItem value="PRODUCT_SALES">Product Sales</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="source">Source</Label>
                <Input
                  id="source"
                  value={formData.source}
                  onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                  placeholder="e.g., Etsy, Market, Wholesale"
                />
              </div>
              <div>
                <Label htmlFor="incomeDate">Date *</Label>
                <DateInputUK
                  id="incomeDate"
                  value={formData.incomeDate}
                  onChange={(value) => setFormData({ ...formData, incomeDate: value })}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="customerName">Customer Name</Label>
              <Input
                id="customerName"
                value={formData.customerName}
                onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                placeholder="Optional"
              />
            </div>

            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-sm">VAT Details</h4>
                <div className="flex items-center gap-2">
                  <Label htmlFor="autoCalculateVatIncome" className="text-xs text-muted-foreground cursor-pointer">
                    Auto-calculate
                  </Label>
                  <input
                    type="checkbox"
                    id="autoCalculateVatIncome"
                    checked={autoCalculateVat}
                    onChange={(e) => setAutoCalculateVat(e.target.checked)}
                    className="rounded border-border"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="vatRate">VAT Rate (%)</Label>
                  <Input
                    id="vatRate"
                    type="number"
                    step="0.1"
                    value={formData.vatRate}
                    onChange={(e) => {
                      const newRate = e.target.value;
                      if (autoCalculateVat && formData.amount) {
                        const amount = parseFloat(formData.amount);
                        const vatRate = parseFloat(newRate) || 20;
                        const vatAmount = amount > 0 ? (amount * vatRate) / (100 + vatRate) : 0;
                        setFormData({ ...formData, vatRate: newRate, vatAmount: vatAmount.toFixed(2) });
                      } else {
                        setFormData({ ...formData, vatRate: newRate });
                      }
                    }}
                    placeholder="20"
                  />
                </div>
                <div>
                  <Label htmlFor="vatAmount">VAT Amount</Label>
                  <Input
                    id="vatAmount"
                    type="number"
                    step="0.01"
                    value={formData.vatAmount}
                    onChange={(e) => setFormData({ ...formData, vatAmount: e.target.value })}
                    placeholder="0.00"
                    disabled={autoCalculateVat}
                  />
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="externalReference">Reference / Invoice #</Label>
              <Input
                id="externalReference"
                value={formData.externalReference}
                onChange={(e) => setFormData({ ...formData, externalReference: e.target.value })}
                placeholder="Optional"
              />
            </div>

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes..."
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsAddModalOpen(false);
                setIsEditModalOpen(false);
                setSelectedIncome(null);
                setFormData(defaultFormData);
                setFormError('');
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={isEditModalOpen ? handleEditIncome : handleAddIncome}
              disabled={submitting || !formData.description || !formData.amount || !formData.category}
            >
              {submitting ? 'Saving...' : isEditModalOpen ? 'Update' : 'Add Income'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Income Entry</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{selectedIncome?.description}&quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteIncome}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Receipt Scanner Dialog */}
      <Dialog open={showScanner} onOpenChange={setShowScanner}>
        <DialogContent className="max-w-md p-0 overflow-hidden">
          <ReceiptScanner
            mode="income"
            onDataExtracted={handleReceiptData}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function IncomeManagementPage() {
  return (
    <ProtectedRoute>
      <IncomeManagementContent />
    </ProtectedRoute>
  );
}
