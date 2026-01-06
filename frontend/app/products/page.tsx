'use client';

import { useState, useMemo, Suspense } from 'react';
import {
  ProductFilters,
} from '@/lib/api/products';
import { ProductCard } from '@/components/products/ProductCard';
import { ProductGridSkeleton } from '@/components/ui/Skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Package } from 'lucide-react';
import { FilterSidebar } from '@/components/products/FilterSidebar';
import { MobileFilterButton } from '@/components/products/MobileFilterButton';
import { ActiveFilters } from '@/components/products/ActiveFilters';
import { useProductFilters } from '@/hooks/useProductFilters';
import { useProducts } from '@/hooks/useProducts';
import { useProductFilterOptions } from '@/hooks/useProductFilterOptions';

function ProductsPageContent() {
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);

  // Filter state
  const { filters, updateFilters, clearFilters, activeFilterCount } = useProductFilters();
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Fetch filter options (materials, sizes, price range)
  const { filterOptions, isLoading: isLoadingFilters } = useProductFilterOptions({
    category: filters.category,
    productType: filters.productType,
  });

  // Constants
  const ITEMS_PER_PAGE = 12;

  // Build query params from filters
  const queryParams = useMemo(() => {
    const params: Record<string, unknown> = {
      page: currentPage,
      limit: ITEMS_PER_PAGE,
      status: 'ACTIVE',
    };

    // Add filters, excluding 'all' values
    if (filters.category !== 'all') params.category = filters.category;
    if (filters.productType !== 'all') params.productType = filters.productType;
    if (filters.customizationType !== 'all') params.customizationType = filters.customizationType;
    if (filters.featured !== null) params.featured = filters.featured;
    if (filters.search) params.search = filters.search;
    if (filters.sortBy) params.sortBy = filters.sortBy;
    if (filters.sortOrder) params.sortOrder = filters.sortOrder;
    // New variant-based filters
    if (filters.materials.length > 0) params.materials = filters.materials;
    if (filters.sizes.length > 0) params.sizes = filters.sizes;
    if (filters.minPrice !== null) params.minPrice = filters.minPrice;
    if (filters.maxPrice !== null) params.maxPrice = filters.maxPrice;

    return params;
  }, [filters, currentPage]);

  // Fetch products with React Query (cached!)
  const { data, isLoading, error } = useProducts(queryParams);

  const products = data?.products || [];
  const totalPages = data?.pagination?.totalPages || 1;

  const handleRemoveFilter = (key: keyof ProductFilters) => {
    const defaults: Partial<ProductFilters> = {
      category: 'all',
      productType: 'all',
      customizationType: 'all',
      featured: null,
      search: '',
      sortBy: 'featured',
      sortOrder: 'desc',
      materials: [],
      sizes: [],
      minPrice: null,
      maxPrice: null,
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

      {/* Main Content */}
      <main className="relative z-10 container mx-auto px-4 py-8">
        {/* Hero Section */}
        <section className="text-center py-12 mb-8">
          <h1 className="text-5xl md:text-6xl font-bold mb-4">
            Browse Our <span className="text-neon-gradient">Product Catalog</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Explore our range of customizable products from home & lifestyle items to premium prints
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
                materialOptions={filterOptions?.materials || []}
                sizeOptions={filterOptions?.sizes || []}
                priceRange={filterOptions?.priceRange || { min: 0, max: 100 }}
                isLoadingFilters={isLoadingFilters}
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
                {error instanceof Error ? error.message : 'Failed to load products'}
              </div>
            )}

            {/* Loading State */}
            {isLoading ? (
              <ProductGridSkeleton count={8} />
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
              materialOptions={filterOptions?.materials || []}
              sizeOptions={filterOptions?.sizes || []}
              priceRange={filterOptions?.priceRange || { min: 0, max: 100 }}
              isLoadingFilters={isLoadingFilters}
            />
          </div>
        )}
      </main>
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={<ProductsLoadingFallback />}>
      <ProductsPageContent />
    </Suspense>
  );
}

function ProductsLoadingFallback() {
  return (
    <div className="min-h-screen bg-background">
      <div className="fixed inset-0 opacity-20 pointer-events-none">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/30 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-secondary/30 rounded-full blur-[120px]" />
      </div>
      <main className="relative z-10 container mx-auto px-4 py-8">
        <section className="text-center py-12 mb-8">
          <h1 className="text-5xl md:text-6xl font-bold mb-4">
            Browse Our <span className="text-neon-gradient">Product Catalog</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Explore our range of customizable products from home & lifestyle items to premium prints
          </p>
        </section>
        <div className="grid lg:grid-cols-[280px_1fr] gap-6">
          <aside className="hidden lg:block">
            <div className="h-[600px] bg-card/50 rounded-lg animate-pulse" />
          </aside>
          <div>
            <ProductGridSkeleton count={8} />
          </div>
        </div>
      </main>
    </div>
  );
}
