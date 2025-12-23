'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Category,
  Subcategory,
  categoriesService,
  CreateCategoryData,
  CreateSubcategoryData,
} from '@/lib/api/categories';
import {
  Plus,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronRight,
  GripVertical,
  X,
  Check,
  FolderTree,
  Package,
} from 'lucide-react';

function CategoryManagementContent() {
  const router = useRouter();
  const { user, logout } = useAuth();

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Expanded categories state
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // Edit/Create modals
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showSubcategoryModal, setShowSubcategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingSubcategory, setEditingSubcategory] = useState<Subcategory | null>(null);
  const [parentCategoryId, setParentCategoryId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    image: '',
    displayOrder: 0,
    isActive: true,
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  // Redirect if not admin
  useEffect(() => {
    if (user && user.userType !== 'PRINTER_ADMIN') {
      router.push('/dashboard');
    }
  }, [user, router]);

  // Fetch categories
  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const data = await categoriesService.list({ includeInactive: true, includeSubcategories: true });
      setCategories(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  const toggleExpanded = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  // Auto-generate slug from name
  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  const handleNameChange = (name: string) => {
    setFormData((prev) => ({
      ...prev,
      name,
      slug: editingCategory || editingSubcategory ? prev.slug : generateSlug(name),
    }));
  };

  // Open category modal for create/edit
  const openCategoryModal = (category?: Category) => {
    if (category) {
      setEditingCategory(category);
      setFormData({
        name: category.name,
        slug: category.slug,
        description: category.description || '',
        image: category.image || '',
        displayOrder: category.displayOrder,
        isActive: category.isActive,
      });
    } else {
      setEditingCategory(null);
      setFormData({
        name: '',
        slug: '',
        description: '',
        image: '',
        displayOrder: categories.length,
        isActive: true,
      });
    }
    setFormError('');
    setShowCategoryModal(true);
  };

  // Open subcategory modal for create/edit
  const openSubcategoryModal = (categoryId: string, subcategory?: Subcategory) => {
    setParentCategoryId(categoryId);
    if (subcategory) {
      setEditingSubcategory(subcategory);
      setFormData({
        name: subcategory.name,
        slug: subcategory.slug,
        description: subcategory.description || '',
        image: subcategory.image || '',
        displayOrder: subcategory.displayOrder,
        isActive: subcategory.isActive,
      });
    } else {
      setEditingSubcategory(null);
      const category = categories.find((c) => c.id === categoryId);
      setFormData({
        name: '',
        slug: '',
        description: '',
        image: '',
        displayOrder: category?.subcategories?.length || 0,
        isActive: true,
      });
    }
    setFormError('');
    setShowSubcategoryModal(true);
  };

  // Save category
  const saveCategory = async () => {
    if (!formData.name.trim()) {
      setFormError('Name is required');
      return;
    }
    if (!formData.slug.trim()) {
      setFormError('Slug is required');
      return;
    }

    try {
      setFormLoading(true);
      setFormError('');

      const data: CreateCategoryData = {
        name: formData.name.trim(),
        slug: formData.slug.trim(),
        description: formData.description.trim() || undefined,
        image: formData.image.trim() || null,
        displayOrder: formData.displayOrder,
        isActive: formData.isActive,
      };

      if (editingCategory) {
        await categoriesService.update(editingCategory.id, data);
        setSuccessMessage('Category updated successfully');
      } else {
        await categoriesService.create(data);
        setSuccessMessage('Category created successfully');
      }

      setShowCategoryModal(false);
      fetchCategories();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      setFormError(err?.message || 'Failed to save category');
    } finally {
      setFormLoading(false);
    }
  };

  // Save subcategory
  const saveSubcategory = async () => {
    if (!formData.name.trim()) {
      setFormError('Name is required');
      return;
    }
    if (!formData.slug.trim()) {
      setFormError('Slug is required');
      return;
    }
    if (!parentCategoryId) {
      setFormError('Parent category is required');
      return;
    }

    try {
      setFormLoading(true);
      setFormError('');

      const data: CreateSubcategoryData = {
        name: formData.name.trim(),
        slug: formData.slug.trim(),
        description: formData.description.trim() || undefined,
        image: formData.image.trim() || null,
        displayOrder: formData.displayOrder,
        isActive: formData.isActive,
      };

      if (editingSubcategory) {
        await categoriesService.updateSubcategory(editingSubcategory.id, data);
        setSuccessMessage('Subcategory updated successfully');
      } else {
        await categoriesService.createSubcategory(parentCategoryId, data);
        setSuccessMessage('Subcategory created successfully');
      }

      setShowSubcategoryModal(false);
      fetchCategories();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      setFormError(err?.message || 'Failed to save subcategory');
    } finally {
      setFormLoading(false);
    }
  };

  // Delete category
  const deleteCategory = async (category: Category) => {
    if (!confirm(`Are you sure you want to delete "${category.name}"? This will also delete all subcategories.`)) {
      return;
    }

    try {
      await categoriesService.delete(category.id);
      setSuccessMessage('Category deleted successfully');
      fetchCategories();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      setError(err?.message || 'Failed to delete category');
      setTimeout(() => setError(''), 5000);
    }
  };

  // Delete subcategory
  const deleteSubcategory = async (subcategory: Subcategory) => {
    if (!confirm(`Are you sure you want to delete "${subcategory.name}"?`)) {
      return;
    }

    try {
      await categoriesService.deleteSubcategory(subcategory.id);
      setSuccessMessage('Subcategory deleted successfully');
      fetchCategories();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      setError(err?.message || 'Failed to delete subcategory');
      setTimeout(() => setError(''), 5000);
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
            <Link href="/admin">
              <Button variant="ghost" size="sm">
                ← Back
              </Button>
            </Link>
            <h1 className="text-2xl font-bold">
              <span className="text-neon-gradient">Category Management</span>
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <Button className="btn-gradient" onClick={() => openCategoryModal()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Category
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Messages */}
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

        {/* Categories List */}
        <Card className="card-glow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderTree className="h-5 w-5" />
              Categories & Subcategories
            </CardTitle>
            <CardDescription>
              Manage your product categories. Click on a category to expand and see subcategories.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="inline-block animate-spin rounded-md h-8 w-8 border-t-2 border-b-2 border-primary mb-2"></div>
                  <p className="text-sm text-muted-foreground">Loading categories...</p>
                </div>
              </div>
            ) : categories.length === 0 ? (
              <div className="text-center py-12">
                <FolderTree className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">No categories yet</p>
                <Button onClick={() => openCategoryModal()}>Create First Category</Button>
              </div>
            ) : (
              <div className="space-y-2">
                {categories.map((category) => (
                  <div key={category.id} className="border border-border rounded-lg overflow-hidden">
                    {/* Category Row */}
                    <div
                      className={`flex items-center gap-3 p-4 bg-card/30 hover:bg-card/50 transition-colors cursor-pointer ${
                        !category.isActive ? 'opacity-50' : ''
                      }`}
                      onClick={() => toggleExpanded(category.id)}
                    >
                      <button className="text-muted-foreground hover:text-foreground">
                        {expandedCategories.has(category.id) ? (
                          <ChevronDown className="h-5 w-5" />
                        ) : (
                          <ChevronRight className="h-5 w-5" />
                        )}
                      </button>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{category.name}</h3>
                          {!category.isActive && (
                            <Badge variant="secondary" className="text-xs">
                              Inactive
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          /{category.slug} • {category.subcategories?.length || 0} subcategories •{' '}
                          {category._count?.products || 0} products
                        </p>
                      </div>

                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openSubcategoryModal(category.id)}
                          title="Add Subcategory"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openCategoryModal(category)}
                          title="Edit Category"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteCategory(category)}
                          className="text-destructive hover:text-destructive"
                          title="Delete Category"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Subcategories */}
                    {expandedCategories.has(category.id) && category.subcategories && (
                      <div className="border-t border-border bg-background/50">
                        {category.subcategories.length === 0 ? (
                          <div className="p-4 pl-12 text-sm text-muted-foreground">
                            No subcategories yet.{' '}
                            <button
                              className="text-primary hover:underline"
                              onClick={() => openSubcategoryModal(category.id)}
                            >
                              Add one
                            </button>
                          </div>
                        ) : (
                          category.subcategories.map((subcategory) => (
                            <div
                              key={subcategory.id}
                              className={`flex items-center gap-3 p-3 pl-12 hover:bg-card/30 transition-colors ${
                                !subcategory.isActive ? 'opacity-50' : ''
                              }`}
                            >
                              <Package className="h-4 w-4 text-muted-foreground" />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{subcategory.name}</span>
                                  {!subcategory.isActive && (
                                    <Badge variant="secondary" className="text-xs">
                                      Inactive
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  /{subcategory.slug} • {subcategory._count?.products || 0} products
                                </p>
                              </div>
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openSubcategoryModal(category.id, subcategory)}
                                  title="Edit Subcategory"
                                >
                                  <Pencil className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => deleteSubcategory(subcategory)}
                                  className="text-destructive hover:text-destructive"
                                  title="Delete Subcategory"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>{editingCategory ? 'Edit Category' : 'Add Category'}</CardTitle>
              <CardDescription>
                {editingCategory ? 'Update the category details' : 'Create a new product category'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {formError && (
                <div className="bg-destructive/10 border border-destructive/50 text-destructive px-3 py-2 rounded text-sm">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-1">Name *</label>
                <Input
                  value={formData.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g., Home & Lifestyle"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Slug *</label>
                <Input
                  value={formData.slug}
                  onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value }))}
                  placeholder="e.g., home-lifestyle"
                />
                <p className="text-xs text-muted-foreground mt-1">Used in URLs: /products/{formData.slug || 'slug'}</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description of this category"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Image URL</label>
                <Input
                  value={formData.image}
                  onChange={(e) => setFormData((prev) => ({ ...prev, image: e.target.value }))}
                  placeholder="https://..."
                />
              </div>

              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-1">Display Order</label>
                  <Input
                    type="number"
                    value={formData.displayOrder}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, displayOrder: parseInt(e.target.value) || 0 }))
                    }
                  />
                </div>
                <div className="flex items-end pb-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData((prev) => ({ ...prev, isActive: e.target.checked }))}
                      className="rounded"
                    />
                    <span className="text-sm">Active</span>
                  </label>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button variant="outline" className="flex-1" onClick={() => setShowCategoryModal(false)}>
                  Cancel
                </Button>
                <Button className="flex-1 btn-gradient" onClick={saveCategory} disabled={formLoading}>
                  {formLoading ? 'Saving...' : editingCategory ? 'Update' : 'Create'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Subcategory Modal */}
      {showSubcategoryModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>{editingSubcategory ? 'Edit Subcategory' : 'Add Subcategory'}</CardTitle>
              <CardDescription>
                {editingSubcategory
                  ? 'Update the subcategory details'
                  : `Add a subcategory to ${categories.find((c) => c.id === parentCategoryId)?.name}`}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {formError && (
                <div className="bg-destructive/10 border border-destructive/50 text-destructive px-3 py-2 rounded text-sm">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-1">Name *</label>
                <Input
                  value={formData.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g., Mugs"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Slug *</label>
                <Input
                  value={formData.slug}
                  onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value }))}
                  placeholder="e.g., mugs"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[60px]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Image URL</label>
                <Input
                  value={formData.image}
                  onChange={(e) => setFormData((prev) => ({ ...prev, image: e.target.value }))}
                  placeholder="https://..."
                />
              </div>

              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-1">Display Order</label>
                  <Input
                    type="number"
                    value={formData.displayOrder}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, displayOrder: parseInt(e.target.value) || 0 }))
                    }
                  />
                </div>
                <div className="flex items-end pb-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData((prev) => ({ ...prev, isActive: e.target.checked }))}
                      className="rounded"
                    />
                    <span className="text-sm">Active</span>
                  </label>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button variant="outline" className="flex-1" onClick={() => setShowSubcategoryModal(false)}>
                  Cancel
                </Button>
                <Button className="flex-1 btn-gradient" onClick={saveSubcategory} disabled={formLoading}>
                  {formLoading ? 'Saving...' : editingSubcategory ? 'Update' : 'Create'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

export default function CategoryManagementPage() {
  return (
    <ProtectedRoute>
      <CategoryManagementContent />
    </ProtectedRoute>
  );
}
