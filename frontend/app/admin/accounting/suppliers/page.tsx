'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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

interface Supplier {
  id: string;
  name: string;
  contactEmail: string | null;
  contactPhone: string | null;
  address: string | null;
  website: string | null;
  notes: string | null;
  taxId: string | null;
  totalSpent: number;
  expenseCount: number;
  lastPurchase: string | null;
  createdAt: string;
}

interface SupplierFormData {
  name: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  website: string;
  notes: string;
  taxId: string;
}

const initialFormData: SupplierFormData = {
  name: '',
  contactEmail: '',
  contactPhone: '',
  address: '',
  website: '',
  notes: '',
  taxId: '',
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

function SuppliersContent() {
  const router = useRouter();
  const { user } = useAuth();

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [formData, setFormData] = useState<SupplierFormData>(initialFormData);
  const [saving, setSaving] = useState(false);

  // Delete confirmation
  const [deleteSupplier, setDeleteSupplier] = useState<Supplier | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Redirect if not admin
  useEffect(() => {
    if (user && user.userType !== 'PRINTER_ADMIN') {
      router.push('/dashboard');
    }
  }, [user, router]);

  const fetchSuppliers = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const params = searchQuery ? `?search=${encodeURIComponent(searchQuery)}` : '';
      const response = await apiClient.get<{ success: boolean; data: { suppliers: Supplier[] } }>(
        `/admin/accounting/suppliers${params}`
      );

      if (response.data?.data) {
        setSuppliers(response.data.data.suppliers);
      }
    } catch (err: unknown) {
      const error = err as { error?: string; message?: string };
      setError(error?.error || error?.message || 'Failed to load suppliers');
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  const openAddModal = () => {
    setEditingSupplier(null);
    setFormData(initialFormData);
    setShowModal(true);
  };

  const openEditModal = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setFormData({
      name: supplier.name,
      contactEmail: supplier.contactEmail || '',
      contactPhone: supplier.contactPhone || '',
      address: supplier.address || '',
      website: supplier.website || '',
      notes: supplier.notes || '',
      taxId: supplier.taxId || '',
    });
    setShowModal(true);
  };

  const handleFormChange = (field: keyof SupplierFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    try {
      setSaving(true);
      setError('');

      const payload = {
        name: formData.name,
        contactEmail: formData.contactEmail || null,
        contactPhone: formData.contactPhone || null,
        address: formData.address || null,
        website: formData.website || null,
        notes: formData.notes || null,
        taxId: formData.taxId || null,
      };

      if (editingSupplier) {
        await apiClient.put(`/admin/accounting/suppliers/${editingSupplier.id}`, payload);
        setSuccessMessage('Supplier updated successfully');
      } else {
        await apiClient.post('/admin/accounting/suppliers', payload);
        setSuccessMessage('Supplier added successfully');
      }

      setShowModal(false);
      fetchSuppliers();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: unknown) {
      const error = err as { error?: string; message?: string };
      setError(error?.error || error?.message || 'Failed to save supplier');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteSupplier) return;

    try {
      setDeleting(true);
      await apiClient.delete(`/admin/accounting/suppliers/${deleteSupplier.id}`);
      setSuccessMessage('Supplier deleted successfully');
      setDeleteSupplier(null);
      fetchSuppliers();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: unknown) {
      const error = err as { error?: string; message?: string };
      setError(error?.error || error?.message || 'Failed to delete supplier');
      setDeleteSupplier(null);
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
              <span className="text-neon-gradient">Supplier Management</span>
            </h1>
          </div>
          <Button className="btn-gradient" onClick={openAddModal}>
            + Add Supplier
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

        {/* Search */}
        <div className="mb-8">
          <Input
            placeholder="Search suppliers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-md"
          />
        </div>

        {/* Suppliers List */}
        <Card className="card-glow">
          <CardHeader>
            <CardTitle>Suppliers</CardTitle>
            <CardDescription>
              {suppliers.length} supplier{suppliers.length !== 1 ? 's' : ''}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="p-4 bg-card/30 rounded-lg">
                    <div className="h-6 w-32 bg-muted/30 rounded animate-pulse mb-2" />
                    <div className="h-4 w-24 bg-muted/30 rounded animate-pulse mb-4" />
                    <div className="h-8 w-20 bg-muted/30 rounded animate-pulse" />
                  </div>
                ))}
              </div>
            ) : suppliers.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">No suppliers found</p>
                <Button onClick={openAddModal}>Add your first supplier</Button>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {suppliers.map((supplier) => (
                  <div
                    key={supplier.id}
                    className="p-4 bg-card/30 rounded-lg hover:bg-card/50 transition-colors cursor-pointer"
                    onClick={() => openEditModal(supplier)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold truncate">{supplier.name}</h4>
                      <Badge variant="outline" className="text-xs ml-2">
                        {supplier.expenseCount} expense{supplier.expenseCount !== 1 ? 's' : ''}
                      </Badge>
                    </div>

                    {supplier.contactEmail && (
                      <p className="text-sm text-muted-foreground truncate">
                        {supplier.contactEmail}
                      </p>
                    )}

                    <div className="mt-4 pt-3 border-t border-border/50">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-muted-foreground">Total Spent</p>
                          <p className="font-semibold text-red-400">
                            {formatCurrency(supplier.totalSpent)}
                          </p>
                        </div>
                        {supplier.lastPurchase && (
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">Last Purchase</p>
                            <p className="text-sm">{formatDate(supplier.lastPurchase)}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Add/Edit Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingSupplier ? 'Edit Supplier' : 'Add Supplier'}</DialogTitle>
            <DialogDescription>
              {editingSupplier ? 'Update supplier details' : 'Enter supplier details below'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleFormChange('name', e.target.value)}
                placeholder="e.g., Amazon UK"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contactEmail">Email</Label>
                <Input
                  id="contactEmail"
                  type="email"
                  value={formData.contactEmail}
                  onChange={(e) => handleFormChange('contactEmail', e.target.value)}
                  placeholder="contact@supplier.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contactPhone">Phone</Label>
                <Input
                  id="contactPhone"
                  type="tel"
                  value={formData.contactPhone}
                  onChange={(e) => handleFormChange('contactPhone', e.target.value)}
                  placeholder="+44..."
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                type="url"
                value={formData.website}
                onChange={(e) => handleFormChange('website', e.target.value)}
                placeholder="https://..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                value={formData.address}
                onChange={(e) => handleFormChange('address', e.target.value)}
                placeholder="Full postal address"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="taxId">VAT/Tax ID</Label>
              <Input
                id="taxId"
                value={formData.taxId}
                onChange={(e) => handleFormChange('taxId', e.target.value)}
                placeholder="GB123456789"
              />
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
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            {editingSupplier && (
              <Button
                variant="destructive"
                onClick={() => setDeleteSupplier(editingSupplier)}
                className="sm:mr-auto"
                disabled={editingSupplier.expenseCount > 0}
              >
                Delete
              </Button>
            )}
            <Button variant="outline" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button
              className="btn-gradient"
              onClick={handleSubmit}
              disabled={saving || !formData.name}
            >
              {saving ? 'Saving...' : editingSupplier ? 'Update' : 'Add Supplier'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteSupplier} onOpenChange={() => setDeleteSupplier(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Supplier?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deleteSupplier?.name}&quot;? This action cannot be undone.
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

export default function SuppliersPage() {
  return (
    <ProtectedRoute>
      <SuppliersContent />
    </ProtectedRoute>
  );
}
