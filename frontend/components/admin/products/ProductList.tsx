'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from './StatusSelect';
import {
  Product,
  ProductStatus,
  ProductsListResponse,
  productsService,
  formatPrice,
} from '@/lib/api/products';
import { Category, categoriesService } from '@/lib/api/categories';
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  Star,
  ChevronLeft,
  ChevronRight,
  Package,
  Image as ImageIcon,
} from 'lucide-react';

interface ProductListProps {
  initialData: ProductsListResponse;
  categories: Category[];
}

export function ProductList({ initialData, categories }: ProductListProps) {
  const [products, setProducts] = useState<Product[]>(initialData.products);
  const [pagination, setPagination] = useState(initialData.pagination);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProductStatus | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchProducts = async (page: number = 1) => {
    setIsLoading(true);
    setError('');

    try {
      const response = await productsService.list({
        page,
        limit: 12,
        search: search || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        categorySlug: categoryFilter !== 'all' ? categoryFilter : undefined,
      });

      setProducts(response.products);
      setPagination(response.pagination);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch products');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchProducts(1);
  };

  const handleDelete = async (productId: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;

    setIsLoading(true);
    setError('');

    try {
      await productsService.delete(productId);
      setProducts(products.filter((p) => p.id !== productId));
    } catch (err: any) {
      setError(err?.message || 'Failed to delete product');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleFeatured = async (product: Product) => {
    setIsLoading(true);
    setError('');

    try {
      await productsService.update(product.id, { featured: !product.featured });
      setProducts(
        products.map((p) =>
          p.id === product.id ? { ...p, featured: !p.featured } : p
        )
      );
    } catch (err: any) {
      setError(err?.message || 'Failed to update product');
    } finally {
      setIsLoading(false);
    }
  };

  const getProductImage = (product: Product): string => {
    const primaryImage = product.images?.find((img) => img.isPrimary);
    return primaryImage?.imageUrl || product.images?.[0]?.imageUrl || '/placeholder-product.png';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Products</h1>
          <p className="text-muted-foreground">
            Manage your product catalog
          </p>
        </div>
        <Link href="/admin/products/new">
          <Button className="btn-gradient">
            <Plus className="h-4 w-4 mr-2" />
            Add Product
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="py-4">
          <form onSubmit={handleSearch} className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search products..."
                  className="pl-10"
                />
              </div>
            </div>

            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as ProductStatus | 'all');
                fetchProducts(1);
              }}
              className="h-11 px-3 rounded-md border border-input bg-background text-sm min-w-[150px]"
            >
              <option value="all">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="DRAFT">Draft</option>
              <option value="ARCHIVED">Archived</option>
              <option value="OUT_OF_STOCK">Out of Stock</option>
            </select>

            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                fetchProducts(1);
              }}
              className="h-11 px-3 rounded-md border border-input bg-background text-sm min-w-[150px]"
            >
              <option value="all">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.slug}>
                  {cat.name}
                </option>
              ))}
            </select>

            <Button type="submit" loading={isLoading}>
              Search
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/50 rounded-md p-3 text-sm text-red-500">
          {error}
        </div>
      )}

      {/* Products Grid */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
          <p className="mt-2 text-muted-foreground">Loading products...</p>
        </div>
      ) : products.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No products found. Create your first product to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((product) => (
            <Card key={product.id} className="overflow-hidden group">
              {/* Image */}
              <div className="aspect-video relative bg-muted">
                <img
                  src={getProductImage(product)}
                  alt={product.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/placeholder-product.png';
                  }}
                />

                {/* Featured badge */}
                {product.featured && (
                  <Badge className="absolute top-2 left-2 bg-primary">
                    <Star className="h-3 w-3 mr-1 fill-current" />
                    Featured
                  </Badge>
                )}

                {/* Hover actions */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <Link href={`/admin/products/${product.id}`}>
                    <Button size="sm" variant="secondary">
                      <Edit2 className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                  </Link>
                  <Button
                    size="icon"
                    variant="destructive"
                    onClick={() => handleDelete(product.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Content */}
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-medium line-clamp-1">{product.name}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-1">
                      {product.category?.name || 'No category'}
                    </p>
                  </div>
                  <StatusBadge status={product.status} />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Package className="h-3 w-3" />
                      {product._count?.variants || 0}
                    </span>
                    <span className="flex items-center gap-1">
                      <ImageIcon className="h-3 w-3" />
                      {product.images?.length || 0}
                    </span>
                  </div>
                  <span className="font-medium">
                    {formatPrice(Number(product.basePrice))}
                  </span>
                </div>

                <div className="mt-3 pt-3 border-t flex items-center justify-between">
                  <button
                    onClick={() => handleToggleFeatured(product)}
                    className={`flex items-center gap-1 text-sm ${
                      product.featured
                        ? 'text-primary'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Star
                      className={`h-4 w-4 ${product.featured ? 'fill-current' : ''}`}
                    />
                    {product.featured ? 'Featured' : 'Set Featured'}
                  </button>

                  <Link
                    href={`/admin/products/${product.id}`}
                    className="text-sm text-primary hover:underline"
                  >
                    Edit →
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
            {pagination.total} products
          </p>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchProducts(pagination.page - 1)}
              disabled={pagination.page <= 1 || isLoading}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <span className="text-sm">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchProducts(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages || isLoading}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
