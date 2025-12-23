'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import {
  Product,
  ProductCategory,
  productsService,
  CATEGORY_LABELS,
  ProductFilters,
} from '@/lib/api/products';
import { ProductCard, ProductCardSkeleton } from '@/components/products/ProductCard';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Package } from 'lucide-react';
import { FilterSidebar } from '@/components/products/FilterSidebar';
import { MobileFilterButton } from '@/components/products/MobileFilterButton';
import { ActiveFilters } from '@/components/products/ActiveFilters';
import { useProductFilters } from '@/hooks/useProductFilters';

function ProductsPageContent() {
  // Data state
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Filter state
  const { filters, updateFilters, clearFilters, activeFilterCount } = useProductFilters();
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Auth state for header navigation
  const { user } = useAuth();

  // Constants
  const ITEMS_PER_PAGE = 12;

  // Fetch products when filters or page changes
  useEffect(() => {
    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, currentPage]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const params: any = {
        ...filters,
        page: currentPage,
        limit: ITEMS_PER_PAGE,
        status: 'ACTIVE', // Only show active products
      };

      // Remove 'all' values - backend doesn't need them
      if (params.category === 'all') delete params.category;
      if (params.productType === 'all') delete params.productType;
      if (params.customizationType === 'all') delete params.customizationType;
      if (params.featured === null) delete params.featured;
      if (!params.search) delete params.search;

      const data = await productsService.list(params);
      setProducts(data.products);
      setTotalPages(data.pagination.totalPages);
      setError('');
    } catch (err: any) {
      setError(err?.error || err?.message || 'Failed to load products');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFilter = (key: keyof ProductFilters) => {
    const defaults: Partial<ProductFilters> = {
      category: 'all',
      productType: 'all',
      customizationType: 'all',
      featured: null,
      search: '',
      sortBy: 'featured',
      sortOrder: 'desc',
    };
    updateFilters({ [key]: defaults[key] });
    setCurrentPage(1);
  };

  const handleClearAll = () => {
    clearFilters();
    setCurrentPage(1);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Ambient background effects */}
      <div className="fixed inset-0 opacity-20 pointer-events-none">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/30 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-secondary/30 rounded-full blur-[120px]" />
      </div>

      {/* Header Navigation */}
      <header className="relative z-10 border-b border-border/50 bg-card/30 backdrop-blur-sm sticky top-0">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold">
            <span className="text-neon-gradient">MakeBelieve</span>
          </Link>
          <nav className="flex items-center gap-4">
            <Link href="/products">
              <Button variant="default" className="btn-gradient">
                Products
              </Button>
            </Link>
            <Link href="/gifts">
              <Button variant="ghost">Gifts</Button>
            </Link>
            <Link href="/about">
              <Button variant="ghost">About</Button>
            </Link>
            {user ? (
              <Link href="/dashboard">
                <Button variant="ghost">Dashboard</Button>
              </Link>
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

      {/* Main Content */}
      <main className="relative z-10 container mx-auto px-4 py-8">
        {/* Hero Section */}
        <section className="text-center py-12 mb-8">
          <h1 className="text-5xl md:text-6xl font-bold mb-4">
            Browse Our <span className="text-neon-gradient">Product Catalog</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Explore our range of customizable products from sublimation gifts to premium prints
          </p>
        </section>

        {/* Mobile Filter Button */}
        <MobileFilterButton
          onClick={() => setMobileFiltersOpen(true)}
          activeCount={activeFilterCount}
        />

        {/* Main Grid Layout */}
        <div className="grid lg:grid-cols-[280px_1fr] gap-6">
          {/* Desktop Sidebar - sticky */}
          <aside className="hidden lg:block">
            <div className="sticky top-20">
              <FilterSidebar
                filters={filters}
                onFiltersChange={updateFilters}
                onClearAll={handleClearAll}
                totalResults={products.length}
              />
            </div>
          </aside>

          {/* Products Area */}
          <div>
            {/* Active Filters */}
            <ActiveFilters
              filters={filters}
              onRemoveFilter={handleRemoveFilter}
              onClearAll={handleClearAll}
            />

                {/* Error State */}
            {error && (
              <div className="bg-destructive/10 border border-destructive/50 text-destructive px-4 py-3 rounded-lg text-sm mb-6">
                {error}
              </div>
            )}

            {/* Loading State */}
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {Array.from({ length: 8 }).map((_, i) => (
                  <ProductCardSkeleton key={i} />
                ))}
              </div>
            ) : products.length === 0 ? (
              /* Empty State */
              <Card className="card-glow">
                <CardContent className="py-20 text-center">
                  <div className="mb-6 flex justify-center">
                    <div className="rounded-full bg-muted p-6">
                      <Package className="h-12 w-12 text-muted-foreground" />
                    </div>
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    No products found
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    {activeFilterCount > 0
                      ? 'Try adjusting your filters to see more products.'
                      : 'Check back soon for new products!'}
                  </p>
                  {activeFilterCount > 0 && (
                    <Button onClick={handleClearAll}>Clear All Filters</Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Product Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {products.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 pt-8">
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
              </>
            )}
          </div>
        </div>

        {/* Mobile Filter Drawer */}
        {mobileFiltersOpen && (
          <div className="lg:hidden fixed inset-0 z-50 bg-background">
            <FilterSidebar
              filters={filters}
              onFiltersChange={updateFilters}
              onClearAll={handleClearAll}
              totalResults={products.length}
              isOpen={mobileFiltersOpen}
              onClose={() => setMobileFiltersOpen(false)}
            />
          </div>
        )}
      </main>
    </div>
  );
}

export default function ProductsPage() {
  return <ProductsPageContent />;
}
