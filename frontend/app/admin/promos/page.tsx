'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import {
  Tag,
  Plus,
  Percent,
  PoundSterling,
  Calendar,
  Users,
  Pencil,
  Trash2,
  X,
} from 'lucide-react';

interface Promo {
  id: string;
  code: string;
  name: string;
  description: string | null;
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
  discountValue: number;
  scope: 'ALL_PRODUCTS' | 'CATEGORY' | 'SUBCATEGORY' | 'SPECIFIC_PRODUCTS';
  startsAt: string | null;
  expiresAt: string | null;
  maxUses: number | null;
  maxUsesPerUser: number;
  currentUses: number;
  minOrderAmount: number | null;
  isActive: boolean;
  createdAt: string;
  _count: { usages: number };
}

interface PromoFormData {
  code: string;
  name: string;
  description: string;
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
  discountValue: string;
  scope: 'ALL_PRODUCTS' | 'CATEGORY' | 'SUBCATEGORY' | 'SPECIFIC_PRODUCTS';
  startsAt: string;
  expiresAt: string;
  maxUses: string;
  maxUsesPerUser: string;
  minOrderAmount: string;
  isActive: boolean;
}

const initialFormData: PromoFormData = {
  code: '',
  name: '',
  description: '',
  discountType: 'PERCENTAGE',
  discountValue: '',
  scope: 'ALL_PRODUCTS',
  startsAt: '',
  expiresAt: '',
  maxUses: '',
  maxUsesPerUser: '1',
  minOrderAmount: '',
  isActive: true,
};

function AdminPromosContent() {
  const router = useRouter();
  const { user } = useAuth();

  const [promos, setPromos] = useState<Promo[]>([]);
  const [stats, setStats] = useState({ active: 0, expired: 0, totalUsages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingPromo, setEditingPromo] = useState<Promo | null>(null);
  const [formData, setFormData] = useState<PromoFormData>(initialFormData);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Redirect if not admin
  useEffect(() => {
    if (user && user.userType !== 'PRINTER_ADMIN') {
      router.push('/dashboard');
    }
  }, [user, router]);

  useEffect(() => {
    fetchPromos();
  }, [currentPage]);

  const fetchPromos = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/promos?page=${currentPage}&limit=20`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load promos');
      }

      setPromos(data.promos);
      setTotalPages(data.pagination.totalPages);
      setStats(data.stats);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load promos';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingPromo(null);
    setFormData(initialFormData);
    setFormError('');
    setShowModal(true);
  };

  const openEditModal = (promo: Promo) => {
    setEditingPromo(promo);
    setFormData({
      code: promo.code,
      name: promo.name,
      description: promo.description || '',
      discountType: promo.discountType,
      discountValue: String(promo.discountValue),
      scope: promo.scope,
      startsAt: promo.startsAt ? promo.startsAt.slice(0, 16) : '',
      expiresAt: promo.expiresAt ? promo.expiresAt.slice(0, 16) : '',
      maxUses: promo.maxUses !== null ? String(promo.maxUses) : '',
      maxUsesPerUser: String(promo.maxUsesPerUser),
      minOrderAmount: promo.minOrderAmount !== null ? String(promo.minOrderAmount) : '',
      isActive: promo.isActive,
    });
    setFormError('');
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError('');

    try {
      const payload = {
        code: formData.code,
        name: formData.name,
        description: formData.description || null,
        discountType: formData.discountType,
        discountValue: parseFloat(formData.discountValue),
        scope: formData.scope,
        startsAt: formData.startsAt || null,
        expiresAt: formData.expiresAt || null,
        maxUses: formData.maxUses ? parseInt(formData.maxUses) : null,
        maxUsesPerUser: parseInt(formData.maxUsesPerUser) || 1,
        minOrderAmount: formData.minOrderAmount ? parseFloat(formData.minOrderAmount) : null,
        isActive: formData.isActive,
      };

      const url = editingPromo ? `/api/promos/${editingPromo.id}` : '/api/promos';
      const method = editingPromo ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save promo');
      }

      setShowModal(false);
      fetchPromos();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save promo';
      setFormError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (promo: Promo) => {
    if (!confirm(`Are you sure you want to delete "${promo.name}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/promos/${promo.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete promo');
      }

      fetchPromos();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete promo';
      setError(message);
    }
  };

  const getStatusBadge = (promo: Promo) => {
    const now = new Date();
    if (!promo.isActive) {
      return <Badge className="bg-muted text-muted-foreground border-border">Inactive</Badge>;
    }
    if (promo.expiresAt && new Date(promo.expiresAt) < now) {
      return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Expired</Badge>;
    }
    if (promo.startsAt && new Date(promo.startsAt) > now) {
      return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Upcoming</Badge>;
    }
    return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Active</Badge>;
  };

  const getScopeBadge = (scope: string) => {
    const labels: Record<string, string> = {
      ALL_PRODUCTS: 'All Products',
      CATEGORY: 'Category',
      SUBCATEGORY: 'Subcategory',
      SPECIFIC_PRODUCTS: 'Specific',
    };
    return <Badge variant="outline">{labels[scope] || scope}</Badge>;
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
              <span className="text-neon-gradient">Promo Codes</span>
            </h1>
          </div>
          <Button onClick={openCreateModal} className="btn-gradient">
            <Plus className="h-4 w-4 mr-2" />
            Create Promo
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

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <Card className="card-glow">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Tag className="h-4 w-4" />
                Active Promos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-400">{stats.active}</p>
            </CardContent>
          </Card>

          <Card className="card-glow">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Expired
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-red-400">{stats.expired}</p>
            </CardContent>
          </Card>

          <Card className="card-glow">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Total Uses
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-primary">{stats.totalUsages}</p>
            </CardContent>
          </Card>
        </div>

        {/* Promo List */}
        <Card className="card-glow">
          <CardHeader>
            <CardTitle>All Promo Codes</CardTitle>
            <CardDescription>Manage your promotional discounts</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary mb-2"></div>
                  <p className="text-sm text-muted-foreground">Loading promos...</p>
                </div>
              </div>
            ) : promos.length === 0 ? (
              <div className="text-center py-12">
                <Tag className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No promo codes yet</p>
                <Button onClick={openCreateModal} className="mt-4">
                  Create Your First Promo
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {promos.map((promo) => (
                  <div
                    key={promo.id}
                    className="flex items-center justify-between p-4 bg-card/30 rounded-lg hover:bg-card/50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <code className="font-mono font-bold text-primary">{promo.code}</code>
                        {getStatusBadge(promo)}
                        {getScopeBadge(promo.scope)}
                      </div>
                      <p className="text-sm text-foreground">{promo.name}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          {promo.discountType === 'PERCENTAGE' ? (
                            <>
                              <Percent className="h-3 w-3" />
                              {promo.discountValue}% off
                            </>
                          ) : (
                            <>
                              <PoundSterling className="h-3 w-3" />
                              £{Number(promo.discountValue).toFixed(2)} off
                            </>
                          )}
                        </span>
                        <span>
                          Used: {promo.currentUses}
                          {promo.maxUses ? `/${promo.maxUses}` : ''}
                        </span>
                        {promo.expiresAt && (
                          <span>
                            Expires: {new Date(promo.expiresAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditModal(promo)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(promo)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-6 mt-6 border-t border-border">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground px-4">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-xl font-bold">
                {editingPromo ? 'Edit Promo' : 'Create Promo'}
              </h2>
              <Button variant="ghost" size="sm" onClick={() => setShowModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              {formError && (
                <div className="bg-destructive/10 border border-destructive/50 text-destructive px-4 py-2 rounded-lg text-sm">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Code *</label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) =>
                      setFormData({ ...formData, code: e.target.value.toUpperCase() })
                    }
                    placeholder="e.g., SUMMER20"
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background uppercase"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Summer Sale"
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Optional description"
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Discount Type *</label>
                  <select
                    value={formData.discountType}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        discountType: e.target.value as 'PERCENTAGE' | 'FIXED_AMOUNT',
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background"
                  >
                    <option value="PERCENTAGE">Percentage (%)</option>
                    <option value="FIXED_AMOUNT">Fixed Amount (£)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    {formData.discountType === 'PERCENTAGE' ? 'Percentage *' : 'Amount (£) *'}
                  </label>
                  <input
                    type="number"
                    value={formData.discountValue}
                    onChange={(e) =>
                      setFormData({ ...formData, discountValue: e.target.value })
                    }
                    placeholder={formData.discountType === 'PERCENTAGE' ? 'e.g., 10' : 'e.g., 5.00'}
                    min="0"
                    max={formData.discountType === 'PERCENTAGE' ? '100' : undefined}
                    step={formData.discountType === 'PERCENTAGE' ? '1' : '0.01'}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Applies To</label>
                <select
                  value={formData.scope}
                  onChange={(e) =>
                    setFormData({ ...formData, scope: e.target.value as PromoFormData['scope'] })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background"
                >
                  <option value="ALL_PRODUCTS">All Products</option>
                  <option value="CATEGORY">Specific Category</option>
                  <option value="SUBCATEGORY">Specific Subcategory</option>
                  <option value="SPECIFIC_PRODUCTS">Specific Products</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Start Date</label>
                  <input
                    type="datetime-local"
                    value={formData.startsAt}
                    onChange={(e) => setFormData({ ...formData, startsAt: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">End Date</label>
                  <input
                    type="datetime-local"
                    value={formData.expiresAt}
                    onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Max Uses</label>
                  <input
                    type="number"
                    value={formData.maxUses}
                    onChange={(e) => setFormData({ ...formData, maxUses: e.target.value })}
                    placeholder="Unlimited"
                    min="1"
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Per Customer</label>
                  <input
                    type="number"
                    value={formData.maxUsesPerUser}
                    onChange={(e) =>
                      setFormData({ ...formData, maxUsesPerUser: e.target.value })
                    }
                    placeholder="1"
                    min="1"
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Min Order (£)</label>
                  <input
                    type="number"
                    value={formData.minOrderAmount}
                    onChange={(e) =>
                      setFormData({ ...formData, minOrderAmount: e.target.value })
                    }
                    placeholder="None"
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="rounded border-border"
                />
                <label htmlFor="isActive" className="text-sm">
                  Active (can be used by customers)
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-border">
                <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="btn-gradient" loading={submitting}>
                  {editingPromo ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminPromosPage() {
  return (
    <ProtectedRoute>
      <AdminPromosContent />
    </ProtectedRoute>
  );
}
