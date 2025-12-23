'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import {
  Product,
  ProductCategory,
  productsService,
  CATEGORY_LABELS,
} from '@/lib/api/products';
import { ProductCard, ProductCardSkeleton } from '@/components/products/ProductCard';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Package } from 'lucide-react';

function ProductsPageContent() {
  // Data state
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Filter state
  const [categoryFilter, setCategoryFilter] = useState<ProductCategory | 'all'>('all');

  // Auth state for header navigation
  const { user } = useAuth();

  // Constants
  const ITEMS_PER_PAGE = 12;

  // Fetch products when filters or page changes
  useEffect(() => {
    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryFilter, currentPage]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const params: any = {
        page: currentPage,
        limit: ITEMS_PER_PAGE,
        status: 'ACTIVE', // Only show active products
        sortBy: 'featured', // Featured products first
        sortOrder: 'desc',
      };

      // Add category filter if not 'all'
      if (categoryFilter !== 'all') {
        params.category = categoryFilter;
      }

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

  const handleCategoryChange = (category: ProductCategory | 'all') => {
    setCategoryFilter(category);
    setCurrentPage(1); // Reset to page 1 when changing filters
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

        {/* Category Filter Tabs */}
        <div className="mb-8 flex gap-2 flex-wrap justify-center">
          <Button
            variant={categoryFilter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleCategoryChange('all')}
            className={categoryFilter === 'all' ? 'btn-gradient' : ''}
          >
            All Products
          </Button>
          <Button
            variant={categoryFilter === 'SUBLIMATION' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleCategoryChange('SUBLIMATION')}
            className={categoryFilter === 'SUBLIMATION' ? 'btn-gradient' : ''}
          >
            {CATEGORY_LABELS.SUBLIMATION}
          </Button>
          <Button
            variant={categoryFilter === 'STATIONERY' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleCategoryChange('STATIONERY')}
            className={categoryFilter === 'STATIONERY' ? 'btn-gradient' : ''}
          >
            {CATEGORY_LABELS.STATIONERY}
          </Button>
          <Button
            variant={categoryFilter === 'LARGE_FORMAT' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleCategoryChange('LARGE_FORMAT')}
            className={categoryFilter === 'LARGE_FORMAT' ? 'btn-gradient' : ''}
          >
            {CATEGORY_LABELS.LARGE_FORMAT}
          </Button>
          <Button
            variant={categoryFilter === 'PHOTO_PRINTS' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleCategoryChange('PHOTO_PRINTS')}
            className={categoryFilter === 'PHOTO_PRINTS' ? 'btn-gradient' : ''}
          >
            {CATEGORY_LABELS.PHOTO_PRINTS}
          </Button>
          <Button
            variant={categoryFilter === 'DIGITAL' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleCategoryChange('DIGITAL')}
            className={categoryFilter === 'DIGITAL' ? 'btn-gradient' : ''}
          >
            {CATEGORY_LABELS.DIGITAL}
          </Button>
        </div>

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
                {categoryFilter === 'all'
                  ? 'No products available'
                  : `No ${CATEGORY_LABELS[categoryFilter]} products found`}
              </h3>
              <p className="text-muted-foreground mb-6">
                {categoryFilter === 'all'
                  ? 'Check back soon for new products!'
                  : 'Try selecting a different category to see other products.'}
              </p>
              {categoryFilter !== 'all' && (
                <Button onClick={() => handleCategoryChange('all')}>
                  View All Products
                </Button>
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
      </main>
    </div>
  );
}

export default function ProductsPage() {
  return <ProductsPageContent />;
}
