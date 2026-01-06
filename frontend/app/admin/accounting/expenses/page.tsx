'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { ReceiptScanner, ExtractedReceiptData } from '@/components/admin/accounting/ReceiptScanner';
import { AdminDataTable, createColumns } from '@/components/admin/AdminDataTable';
import { DateInputUK } from '@/components/ui/date-input-uk';
import apiClient from '@/lib/api/client';
import Link from 'next/link';
import { Camera, Trash2, ClipboardPaste, PenLine } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import { getAvailableTaxYears, TAX_YEAR_MONTHS, getMonthDateRange } from '@/lib/server/tax-utils';

interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string;
  categoryLabel: string;
  purchaseDate: string;
  supplierId: string | null;
  supplier: { id: string; name: string } | null;
  receiptUrl: string | null;
  notes: string | null;
  vatAmount: number | null;
  vatRate: number | null;
  isVatReclaimable: boolean;
  taxYear: string | null;
  importSource: string;
  externalReference: string | null;
  createdAt: string;
}

interface Category {
  value: string;
  label: string;
}

interface Supplier {
  id: string;
  name: string;
}

interface ExpenseFormData {
  description: string;
  amount: string;
  category: string;
  purchaseDate: string;
  supplierId: string;
  receiptUrl: string;
  notes: string;
  vatAmount: string;
  vatRate: string;
  isVatReclaimable: boolean;
  externalReference: string;
}

const initialFormData: ExpenseFormData = {
  description: '',
  amount: '',
  category: '',
  purchaseDate: new Date().toISOString().split('T')[0],
  supplierId: '',
  receiptUrl: '',
  notes: '',
  vatAmount: '',
  vatRate: '20',
  isVatReclaimable: false,
  externalReference: '',
};

// Define table columns for expenses
const expenseColumns = createColumns<Expense>([
  {
    key: 'purchaseDate',
    header: 'Date',
    width: 'w-[90px]',
    render: (expense) => (
      <div className="text-center">
        <p className="text-lg font-bold">{new Date(expense.purchaseDate).getDate()}</p>
        <p className="text-xs text-muted-foreground uppercase">
          {new Date(expense.purchaseDate).toLocaleDateString('en-GB', { month: 'short' })}
        </p>
        <p className="text-xs text-muted-foreground">
          {new Date(expense.purchaseDate).getFullYear()}
        </p>
      </div>
    ),
  },
  {
    key: 'description',
    header: 'Description',
    render: (expense) => (
      <div className="min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h4 className="font-semibold truncate">{expense.description}</h4>
          {expense.isVatReclaimable && (
            <Badge variant="outline" className="text-xs text-green-500 border-green-500/50 shrink-0">
              VAT Reclaimable
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <Badge variant="secondary" className="text-xs">
            {expense.categoryLabel}
          </Badge>
          {expense.supplier && (
            <span>{expense.supplier.name}</span>
          )}
          {expense.taxYear && (
            <span className="text-xs">Tax Year: {expense.taxYear}</span>
          )}
        </div>
      </div>
    ),
  },
  {
    key: 'amount',
    header: 'Amount',
    width: 'w-[120px]',
    align: 'right',
    render: (expense) => (
      <div className="text-right">
        <p className="font-bold text-red-400">{formatCurrency(expense.amount)}</p>
        {expense.vatAmount && (
          <p className="text-xs text-muted-foreground">
            VAT: {formatCurrency(expense.vatAmount)}
          </p>
        )}
      </div>
    ),
  },
]);

function ExpensesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Totals
  const [totals, setTotals] = useState({
    totalAmount: 0,
    totalVAT: 0,
    reclaimableVAT: 0,
    count: 0,
  });

  // Filters
  const [filterCategory, setFilterCategory] = useState('');
  const [filterTaxYear, setFilterTaxYear] = useState('');
  const [filterSearch, setFilterSearch] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [formData, setFormData] = useState<ExpenseFormData>(initialFormData);
  const [saving, setSaving] = useState(false);

  // Delete confirmation
  const [deleteExpense, setDeleteExpense] = useState<Expense | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Input mode for modal: scan receipt, paste text, or manual entry
  const [inputMode, setInputMode] = useState<'scan' | 'paste' | 'manual'>('manual');

  // Auto-calculate VAT
  const [autoCalculateVat, setAutoCalculateVat] = useState(true);

  const availableTaxYears = getAvailableTaxYears();

  // Redirect if not admin
  useEffect(() => {
    if (user && user.userType !== 'PRINTER_ADMIN') {
      router.push('/dashboard');
    }
  }, [user, router]);

  // Check for action=add in URL
  useEffect(() => {
    if (searchParams.get('action') === 'add') {
      setShowModal(true);
      setEditingExpense(null);
      setFormData(initialFormData);
    }
  }, [searchParams]);

  const fetchExpenses = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('limit', '7');
      params.set('sortOrder', sortOrder);
      if (filterCategory) params.set('category', filterCategory);
      if (filterTaxYear) params.set('taxYear', filterTaxYear);
      if (filterSearch) params.set('search', filterSearch);
      // Month filter only works when tax year is selected
      if (filterMonth && filterTaxYear) {
        const { startDate, endDate } = getMonthDateRange(filterTaxYear, filterMonth);
        params.set('startDate', startDate);
        params.set('endDate', endDate);
      }

      const response = await apiClient.get<{
        success: boolean;
        data: {
          expenses: Expense[];
          pagination: { page: number; limit: number; total: number; totalPages: number };
          totals: { totalAmount: number; totalVAT: number; reclaimableVAT: number; count: number };
          categories: Category[];
        };
      }>(`/admin/accounting/expenses?${params.toString()}`);

      if (response.data?.data) {
        setExpenses(response.data.data.expenses);
        setTotalPages(response.data.data.pagination.totalPages);
        setTotal(response.data.data.pagination.total);
        setTotals(response.data.data.totals);
        setCategories(response.data.data.categories);
      }
    } catch (err: unknown) {
      const error = err as { error?: string; message?: string };
      setError(error?.error || error?.message || 'Failed to load expenses');
    } finally {
      setLoading(false);
    }
  }, [page, filterCategory, filterTaxYear, filterSearch, filterMonth, sortOrder]);

  const fetchSuppliers = useCallback(async () => {
    try {
      const response = await apiClient.get<{ success: boolean; data: { suppliers: Supplier[] } }>(
        '/admin/accounting/suppliers'
      );
      if (response.data?.data) {
        setSuppliers(response.data.data.suppliers);
      }
    } catch {
      // Suppliers might not exist yet
    }
  }, []);

  useEffect(() => {
    fetchExpenses();
    fetchSuppliers();
  }, [fetchExpenses, fetchSuppliers]);

  const handleFilterChange = () => {
    setPage(1);
  };

  const openAddModal = () => {
    setEditingExpense(null);
    setFormData(initialFormData);
    setShowModal(true);
  };

  const openEditModal = (expense: Expense) => {
    setEditingExpense(expense);
    setFormData({
      description: expense.description,
      amount: expense.amount.toString(),
      category: expense.category,
      purchaseDate: new Date(expense.purchaseDate).toISOString().split('T')[0],
      supplierId: expense.supplierId || '',
      receiptUrl: expense.receiptUrl || '',
      notes: expense.notes || '',
      vatAmount: expense.vatAmount?.toString() || '',
      vatRate: expense.vatRate?.toString() || '20',
      isVatReclaimable: expense.isVatReclaimable,
      externalReference: expense.externalReference || '',
    });
    setShowModal(true);
  };

  const handleFormChange = (field: keyof ExpenseFormData, value: string | boolean) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };

      // Auto-calculate VAT when amount or vatRate changes
      if (autoCalculateVat && (field === 'amount' || field === 'vatRate')) {
        const amount = parseFloat(field === 'amount' ? String(value) : updated.amount);
        const vatRate = parseFloat(field === 'vatRate' ? String(value) : updated.vatRate) || 20;
        if (amount > 0) {
          const vatAmount = (amount * vatRate) / (100 + vatRate);
          updated.vatAmount = vatAmount.toFixed(2);
        }
      }

      return updated;
    });
  };

  const calculateVAT = () => {
    const amount = parseFloat(formData.amount);
    const vatRate = parseFloat(formData.vatRate) || 20;
    if (amount > 0) {
      const vatAmount = (amount * vatRate) / (100 + vatRate);
      setFormData((prev) => ({
        ...prev,
        vatAmount: vatAmount.toFixed(2),
      }));
    }
  };

  const handleReceiptData = (data: Partial<ExtractedReceiptData>) => {
    setFormData((prev) => ({
      ...prev,
      description: data.description || data.vendor || prev.description,
      amount: data.amount?.toString() || prev.amount,
      purchaseDate: data.date
        ? new Date(data.date).toISOString().split('T')[0]
        : prev.purchaseDate,
      vatAmount: data.vatAmount?.toString() || prev.vatAmount,
      vatRate: data.vatRate?.toString() || prev.vatRate,
    }));
    setInputMode('manual');
  };

  const handleSubmit = async () => {
    try {
      setSaving(true);
      setError('');

      const payload = {
        description: formData.description,
        amount: parseFloat(formData.amount),
        category: formData.category,
        purchaseDate: formData.purchaseDate,
        supplierId: formData.supplierId || null,
        receiptUrl: formData.receiptUrl || null,
        notes: formData.notes || null,
        vatAmount: formData.vatAmount ? parseFloat(formData.vatAmount) : null,
        vatRate: formData.vatRate ? parseFloat(formData.vatRate) : null,
        isVatReclaimable: formData.isVatReclaimable,
        externalReference: formData.externalReference || null,
      };

      if (editingExpense) {
        await apiClient.put(`/admin/accounting/expenses/${editingExpense.id}`, payload);
        setSuccessMessage('Expense updated successfully');
      } else {
        await apiClient.post('/admin/accounting/expenses', payload);
        setSuccessMessage('Expense added successfully');
      }

      setShowModal(false);
      fetchExpenses();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: unknown) {
      const error = err as { error?: string; message?: string };
      setError(error?.error || error?.message || 'Failed to save expense');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteExpense) return;

    try {
      setDeleting(true);
      await apiClient.delete(`/admin/accounting/expenses/${deleteExpense.id}`);
      setSuccessMessage('Expense deleted successfully');
      setDeleteExpense(null);
      setShowModal(false);
      fetchExpenses();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: unknown) {
      const error = err as { error?: string; message?: string };
      setError(error?.error || error?.message || 'Failed to delete expense');
    } finally {
      setDeleting(false);
    }
  };

  const handleSortChange = (_key: string, direction: 'asc' | 'desc') => {
    setSortOrder(direction);
  };

  const handleSearchChange = (query: string) => {
    setFilterSearch(query);
    handleFilterChange();
  };

  if (user && user.userType !== 'PRINTER_ADMIN') {
    return null;
  }

  // Filters toolbar content
  const filtersToolbar = (
    <>
      <div className="w-[180px]">
        <Label className="text-sm text-muted-foreground mb-2 block">Category</Label>
        <Select
          value={filterCategory || 'all'}
          onValueChange={(value: string) => {
            setFilterCategory(value === 'all' ? '' : value);
            handleFilterChange();
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.value} value={cat.value}>
                {cat.label}
              </SelectItem>
            ))}
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
            handleFilterChange();
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
            handleFilterChange();
          }}
          disabled={!filterTaxYear}
        >
          <SelectTrigger>
            <SelectValue placeholder={filterTaxYear ? "All Months" : "Select year first"} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Months</SelectItem>
            {TAX_YEAR_MONTHS.map((month) => (
              <SelectItem key={month.value} value={month.value}>
                {month.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {(filterCategory || filterTaxYear || filterSearch || filterMonth) && (
        <Button
          variant="ghost"
          onClick={() => {
            setFilterCategory('');
            setFilterTaxYear('');
            setFilterSearch('');
            setFilterMonth('');
            handleFilterChange();
          }}
        >
          Clear Filters
        </Button>
      )}
    </>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin/accounting">
              <Button variant="ghost" size="sm">
                &larr; Back to Accounting
              </Button>
            </Link>
            <h1 className="text-2xl font-bold">
              <span className="text-neon-gradient">Expense Management</span>
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/admin/accounting/expenses/import">
              <Button variant="outline" size="sm">
                Import CSV
              </Button>
            </Link>
            <Button className="btn-gradient" onClick={openAddModal}>
              + Add Expense
            </Button>
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

        {successMessage && (
          <div className="bg-green-500/10 border border-green-500/50 text-green-500 px-4 py-3 rounded-lg text-sm mb-6">
            {successMessage}
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-card/50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Expenses</p>
                  {loading ? (
                    <div className="h-8 w-24 bg-muted/30 rounded animate-pulse mt-1" />
                  ) : (
                    <p className="text-2xl font-bold text-red-500">{formatCurrency(totals.totalAmount)}</p>
                  )}
                </div>
                <Badge variant="outline">{totals.count} items</Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50">
            <CardContent className="pt-6">
              <div>
                <p className="text-sm text-muted-foreground">Total VAT</p>
                {loading ? (
                  <div className="h-8 w-20 bg-muted/30 rounded animate-pulse mt-1" />
                ) : (
                  <p className="text-2xl font-bold">{formatCurrency(totals.totalVAT)}</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50">
            <CardContent className="pt-6">
              <div>
                <p className="text-sm text-muted-foreground">Reclaimable VAT</p>
                {loading ? (
                  <div className="h-8 w-20 bg-muted/30 rounded animate-pulse mt-1" />
                ) : (
                  <p className="text-2xl font-bold text-green-500">{formatCurrency(totals.reclaimableVAT)}</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters Card */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4 items-end">
              <div className="flex-1 min-w-[200px]">
                <Label className="text-sm text-muted-foreground mb-2 block">Search</Label>
                <Input
                  placeholder="Search description..."
                  value={filterSearch}
                  onChange={(e) => handleSearchChange(e.target.value)}
                />
              </div>
              {filtersToolbar}
            </div>
          </CardContent>
        </Card>

        {/* Expenses Table */}
        <AdminDataTable<Expense>
          data={expenses}
          columns={expenseColumns}
          loading={loading}
          keyExtractor={(expense) => expense.id}
          title="Expenses"
          description={`${total} expense${total !== 1 ? 's' : ''} found`}
          pagination={{
            page,
            total,
            limit: 7,
            totalPages,
          }}
          onPageChange={setPage}
          sort={{ key: 'purchaseDate', direction: sortOrder }}
          onSort={handleSortChange}
          showSearch={false}
          showSortToggle={true}
          sortAscLabel="Oldest"
          sortDescLabel="Newest"
          onRowClick={openEditModal}
          rowActions={(expense) => (
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                setDeleteExpense(expense);
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
          emptyContent={
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">No expenses found</p>
              <Button onClick={openAddModal}>Add your first expense</Button>
            </div>
          }
          skeletonRows={7}
        />
      </main>

      {/* Add/Edit Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingExpense ? 'Edit Expense' : 'Add Expense'}</DialogTitle>
            <DialogDescription>
              {editingExpense ? 'Update expense details' : 'Enter expense details below'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Input Mode Toggle */}
            <div className="flex gap-2">
              <Button
                type="button"
                variant={inputMode === 'scan' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setInputMode('scan')}
                className="flex-1"
              >
                <Camera className="h-4 w-4 mr-2" />
                Scan Receipt
              </Button>
              <Button
                type="button"
                variant={inputMode === 'paste' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setInputMode('paste')}
                className="flex-1"
              >
                <ClipboardPaste className="h-4 w-4 mr-2" />
                Paste Text
              </Button>
              <Button
                type="button"
                variant={inputMode === 'manual' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setInputMode('manual')}
                className="flex-1"
              >
                <PenLine className="h-4 w-4 mr-2" />
                Enter Manually
              </Button>
            </div>

            {/* Scan or Paste Mode */}
            {(inputMode === 'scan' || inputMode === 'paste') && (
              <ReceiptScanner
                mode="expense"
                variant={inputMode === 'scan' ? 'image' : 'text'}
                onDataExtracted={(data) => {
                  handleReceiptData(data);
                  setInputMode('manual');
                }}
              />
            )}

            {/* Manual Entry Mode */}
            {inputMode === 'manual' && (
              <>
            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => handleFormChange('description', e.target.value)}
                placeholder="e.g., Printer paper from Staples"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount (GBP) *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.amount}
                  onChange={(e) => handleFormChange('amount', e.target.value)}
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="purchaseDate">Purchase Date *</Label>
                <DateInputUK
                  id="purchaseDate"
                  value={formData.purchaseDate}
                  onChange={(value) => handleFormChange('purchaseDate', value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select
                value={formData.category}
                onValueChange={(value: string) => handleFormChange('category', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {suppliers.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="supplier">Supplier</Label>
                <Select
                  value={formData.supplierId}
                  onValueChange={(value: string) => handleFormChange('supplierId', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select supplier (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No supplier</SelectItem>
                    {suppliers.map((supplier) => (
                      <SelectItem key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium">VAT Details</h4>
                <div className="flex items-center gap-2">
                  <Label htmlFor="autoCalculateVat" className="text-xs text-muted-foreground cursor-pointer">
                    Auto-calculate
                  </Label>
                  <input
                    type="checkbox"
                    id="autoCalculateVat"
                    checked={autoCalculateVat}
                    onChange={(e) => setAutoCalculateVat(e.target.checked)}
                    className="rounded border-border"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="vatRate">VAT Rate (%)</Label>
                  <Select
                    value={formData.vatRate}
                    onValueChange={(value: string) => handleFormChange('vatRate', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="20">20% (Standard)</SelectItem>
                      <SelectItem value="5">5% (Reduced)</SelectItem>
                      <SelectItem value="0">0% (Zero/Exempt)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="vatAmount">VAT Amount</Label>
                    {!autoCalculateVat && (
                      <Button
                        type="button"
                        variant="link"
                        size="sm"
                        className="h-auto p-0 text-xs"
                        onClick={calculateVAT}
                      >
                        Calculate
                      </Button>
                    )}
                  </div>
                  <Input
                    id="vatAmount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.vatAmount}
                    onChange={(e) => handleFormChange('vatAmount', e.target.value)}
                    placeholder="0.00"
                    disabled={autoCalculateVat}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 mt-4">
                <input
                  type="checkbox"
                  id="isVatReclaimable"
                  checked={formData.isVatReclaimable}
                  onChange={(e) => handleFormChange('isVatReclaimable', e.target.checked)}
                  className="rounded border-border"
                />
                <Label htmlFor="isVatReclaimable" className="text-sm cursor-pointer">
                  VAT is reclaimable (valid VAT receipt/invoice)
                </Label>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleFormChange('notes', e.target.value)}
                placeholder="Additional notes..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="receiptUrl">Receipt URL</Label>
              <Input
                id="receiptUrl"
                type="url"
                value={formData.receiptUrl}
                onChange={(e) => handleFormChange('receiptUrl', e.target.value)}
                placeholder="https://..."
              />
            </div>
              </>
            )}
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            {editingExpense && inputMode === 'manual' && (
              <Button
                variant="destructive"
                onClick={() => setDeleteExpense(editingExpense)}
                className="sm:mr-auto"
              >
                Delete
              </Button>
            )}
            <Button variant="outline" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            {inputMode === 'manual' && (
              <Button
                className="btn-gradient"
                onClick={handleSubmit}
                disabled={saving || !formData.description || !formData.amount || !formData.category}
              >
                {saving ? 'Saving...' : editingExpense ? 'Update' : 'Add Expense'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteExpense} onOpenChange={() => setDeleteExpense(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Expense?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deleteExpense?.description}&quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
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

export default function ExpensesPage() {
  return (
    <ProtectedRoute>
      <ExpensesContent />
    </ProtectedRoute>
  );
}
