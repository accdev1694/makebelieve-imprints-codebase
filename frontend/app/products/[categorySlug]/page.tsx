'use client';

import { useState, useEffect, useCallback, use } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';

import { ProductCard, ProductCardSkeleton } from '@/components/products/ProductCard';
import { Product, productsService, CustomizationType } from '@/lib/api/products';
import { Category, Subcategory, categoriesService, getCategoryImage } from '@/lib/api/categories';
import { CartIcon } from '@/components/cart/CartIcon';
import { CategoryHero } from '@/components/category/CategoryHero';
import { CategoryFeatures } from '@/components/category/CategoryFeatures';
import { useDebounce } from '@/hooks/useDebounce';

interface PageProps {
  params: Promise<{ categorySlug: string }>;
}

export default function CategoryPage({ params }: PageProps) {
  const { categorySlug } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, logout } = useAuth();

  // Category data
  const [category, setCategory] = useState<Category | null>(null);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [categoryLoading, setCategoryLoading] = useState(true);
  const [categoryError, setCategoryError] = useState<string | null>(null);

  // Filter state
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(
    searchParams.get('subcategory') || null
  );
  const [customizationType, setCustomizationType] = useState<string | null>(
    searchParams.get('customization') || null
  );
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const debouncedSearch = useDebounce(searchQuery, 300);

  // Product data
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Fetch category data
  useEffect(() => {
    const fetchCategory = async () => {
      try {
        setCategoryLoading(true);
        setCategoryError(null);
        const categoryData = await categoriesService.get(categorySlug);
        setCategory(categoryData);
        setSubcategories(categoryData.subcategories || []);
      } catch (error) {
        console.error('Failed to fetch category:', error);
        setCategoryError('Category not found');
      } finally {
        setCategoryLoading(false);
      }
    };

    fetchCategory();
  }, [categorySlug]);

  // Fetch products
  const fetchProducts = useCallback(async () => {
    if (!category) return;

    try {
      setLoading(true);
      const response = await productsService.list({
        page,
        limit: 12,
        categorySlug: category.slug,
        subcategorySlug: selectedSubcategory || undefined,
        customizationType: customizationType as CustomizationType | undefined,
        search: debouncedSearch || undefined,
        status: 'ACTIVE',
        sortBy: 'featured',
        sortOrder: 'desc',
      });
      setProducts(response.products);
      setTotalPages(response.pagination.totalPages);
      setTotal(response.pagination.total);
    } catch (error) {
      console.error('Failed to fetch products:', error);
    } finally {
      setLoading(false);
    }
  }, [category, page, selectedSubcategory, customizationType, debouncedSearch]);

  useEffect(() => {
    if (category) {
      fetchProducts();
    }
  }, [category, fetchProducts]);

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedSubcategory) params.set('subcategory', selectedSubcategory);
    if (customizationType) params.set('customization', customizationType);
    if (searchQuery) params.set('search', searchQuery);

    const queryString = params.toString();
    router.push(
      queryString ? `/products/${categorySlug}?${queryString}` : `/products/${categorySlug}`,
      { scroll: false }
    );
  }, [selectedSubcategory, customizationType, searchQuery, categorySlug, router]);

  // Clear all filters
  const handleClearFilters = () => {
    setSelectedSubcategory(null);
    setCustomizationType(null);
    setSearchQuery('');
    setPage(1);
  };

  // Count active filters
  const activeFilterCount =
    (selectedSubcategory ? 1 : 0) + (customizationType ? 1 : 0) + (searchQuery ? 1 : 0);

  // Loading state for category
  if (categoryLoading) {
    return (
      <main className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-16 text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          <p className="mt-4 text-muted-foreground">Loading category...</p>
        </div>
      </main>
    );
  }

  // Error state
  if (categoryError || !category) {
    return (
      <main className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">Category Not Found</h1>
          <p className="text-muted-foreground mb-8">
            The category you're looking for doesn't exist.
          </p>
          <Link href="/products">
            <Button>Browse All Products</Button>
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      {/* Header Navigation */}
      <header className="relative z-50 border-b border-border/50 bg-card/30 backdrop-blur-sm sticky top-0">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold">
            <span className="text-neon-gradient">MakeBelieve</span>
          </Link>
          <nav className="flex items-center gap-4">
            <Link href="/products">
              <Button variant="ghost">Products</Button>
            </Link>
            <Link href="/templates">
              <Button variant="ghost">Templates</Button>
            </Link>
            <Link href="/about">
              <Button variant="ghost">About</Button>
            </Link>
            <CartIcon />
            {user ? (
              <>
                <Link href="/dashboard">
                  <Button variant="ghost">Dashboard</Button>
                </Link>
                <Button variant="outline" onClick={logout}>
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Link href="/auth/login">
                  <Button variant="ghost">Login</Button>
                </Link>
                <Link href="/auth/register">
                  <Button className="btn-gradient">Sign Up</Button>
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Category Hero */}
      <CategoryHero
        title={category.name}
        description={category.description || `Explore our ${category.name.toLowerCase()} collection`}
        image={getCategoryImage(category)}
        productCount={total}
      />

      {/* Subcategory Features */}
      {subcategories.length > 0 && (
        <CategoryFeatures
          features={subcategories.map((sub) => ({
            title: sub.name,
            description: sub.description || '',
            icon: sub.slug,
          }))}
        />
      )}

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Subcategory Filter */}
        {subcategories.length > 0 && (
          <div className="mb-8">
            <h3 className="text-sm font-medium text-muted-foreground mb-3">Filter by Type</h3>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={selectedSubcategory === null ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setSelectedSubcategory(null);
                  setPage(1);
                }}
              >
                All
              </Button>
              {subcategories.map((sub) => (
                <Button
                  key={sub.id}
                  variant={selectedSubcategory === sub.slug ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setSelectedSubcategory(sub.slug);
                    setPage(1);
                  }}
                >
                  {sub.name}
                  {sub._count?.products !== undefined && (
                    <span className="ml-1 text-xs opacity-70">({sub._count.products})</span>
                  )}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Search */}
        <div className="mb-6">
          <input
            type="text"
            placeholder={`Search in ${category.name}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full max-w-md px-4 py-2 rounded-lg border border-input bg-background"
          />
        </div>

        {/* Active Filters */}
        {activeFilterCount > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-6">
            <span className="text-sm text-muted-foreground">Active filters:</span>
            {selectedSubcategory && (
              <Badge variant="secondary" className="gap-1">
                {subcategories.find((s) => s.slug === selectedSubcategory)?.name}
                <button onClick={() => setSelectedSubcategory(null)}>
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {customizationType && (
              <Badge variant="secondary" className="gap-1">
                {customizationType}
                <button onClick={() => setCustomizationType(null)}>
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {searchQuery && (
              <Badge variant="secondary" className="gap-1">
                &quot;{searchQuery}&quot;
                <button onClick={() => setSearchQuery('')}>
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            <Button variant="ghost" size="sm" onClick={handleClearFilters}>
              Clear all
            </Button>
          </div>
        )}

        {/* Results Header */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-muted-foreground">
            {loading ? 'Loading...' : `${total} product${total !== 1 ? 's' : ''} found`}
          </p>
        </div>

        {/* Products Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-16">
            <h3 className="text-lg font-medium mb-2">No products found</h3>
            <p className="text-muted-foreground mb-4">
              Try adjusting your filters or search query.
            </p>
            <Button onClick={handleClearFilters}>Clear Filters</Button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-8">
                <Button
                  variant="outline"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <span className="flex items-center px-4 text-sm text-muted-foreground">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
