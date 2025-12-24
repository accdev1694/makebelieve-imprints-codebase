'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';

import { ProductCard } from '@/components/products/ProductCard';
import { ProductGridSkeleton } from '@/components/ui/Skeleton';
import { Product, productsService, CustomizationType } from '@/lib/api/products';
import { Category, Subcategory, categoriesService, getSubcategoryImage } from '@/lib/api/categories';
import { CategoryHero } from '@/components/category/CategoryHero';
import { useDebounce } from '@/hooks/useDebounce';

interface SubcategoryPageProps {
  categorySlug: string;
  subcategorySlug: string;
}

export function SubcategoryPage({ categorySlug, subcategorySlug }: SubcategoryPageProps) {
  const router = useRouter();

  // Data state
  const [category, setCategory] = useState<Category | null>(null);
  const [subcategory, setSubcategory] = useState<Subcategory | null>(null);
  const [products, setProducts] = useState<Product[]>([]);

  // Loading states
  const [dataLoading, setDataLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('featured');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const debouncedSearch = useDebounce(searchQuery, 300);

  // Sort options
  const sortOptions = [
    { value: 'featured', label: 'Featured' },
    { value: 'newest', label: 'Newest' },
    { value: 'price-low', label: 'Price: Low to High' },
    { value: 'price-high', label: 'Price: High to Low' },
    { value: 'bestselling', label: 'Best Selling' },
  ];

  // Fetch category and subcategory data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setDataLoading(true);
        setError(null);

        // Fetch category with subcategories
        const categoryData = await categoriesService.get(categorySlug);
        setCategory(categoryData);

        // Find the subcategory
        const foundSubcategory = categoryData.subcategories?.find(
          (sub) => sub.slug === subcategorySlug
        );

        if (!foundSubcategory) {
          // Try fetching subcategory directly
          try {
            const subData = await categoriesService.getSubcategory(subcategorySlug);
            setSubcategory(subData);
          } catch {
            setError('Subcategory not found');
          }
        } else {
          setSubcategory(foundSubcategory);
        }
      } catch (err) {
        console.error('Failed to fetch category data:', err);
        setError('Category not found');
      } finally {
        setDataLoading(false);
      }
    };

    fetchData();
  }, [categorySlug, subcategorySlug]);

  // Fetch products
  const fetchProducts = useCallback(async () => {
    if (!category || !subcategory) return;

    // Parse sort option
    type SortByType = 'name' | 'price' | 'createdAt' | 'featured';
    let apiSortBy: SortByType = 'featured';
    let apiSortOrder: 'asc' | 'desc' = 'desc';

    if (sortBy === 'newest') {
      apiSortBy = 'createdAt';
      apiSortOrder = 'desc';
    } else if (sortBy === 'price-low') {
      apiSortBy = 'price';
      apiSortOrder = 'asc';
    } else if (sortBy === 'price-high') {
      apiSortBy = 'price';
      apiSortOrder = 'desc';
    } else if (sortBy === 'bestselling') {
      apiSortBy = 'featured';
      apiSortOrder = 'desc';
    }

    try {
      setProductsLoading(true);
      const response = await productsService.list({
        page,
        limit: 12,
        categorySlug: category.slug,
        subcategorySlug: subcategory.slug,
        search: debouncedSearch || undefined,
        status: 'ACTIVE',
        sortBy: apiSortBy,
        sortOrder: apiSortOrder,
      });
      setProducts(response.products);
      setTotalPages(response.pagination.totalPages);
      setTotal(response.pagination.total);
    } catch (err) {
      console.error('Failed to fetch products:', err);
    } finally {
      setProductsLoading(false);
    }
  }, [category, subcategory, page, debouncedSearch, sortBy]);

  useEffect(() => {
    if (category && subcategory) {
      fetchProducts();
    }
  }, [category, subcategory, fetchProducts]);

  // Loading state
  if (dataLoading) {
    return (
      <main className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-16 text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </main>
    );
  }

  // Error state
  if (error || !category || !subcategory) {
    return (
      <main className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">Not Found</h1>
          <p className="text-muted-foreground mb-8">
            {error || "The page you're looking for doesn't exist."}
          </p>
          <div className="flex justify-center gap-4">
            <Link href={`/${categorySlug}`}>
              <Button variant="outline">Back to {category?.name || 'Category'}</Button>
            </Link>
            <Link href="/products">
              <Button>Browse All Products</Button>
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      {/* Subcategory Hero */}
      <CategoryHero
        title={subcategory.name}
        subtitle={category.name}
        description={subcategory.description || `Explore our ${subcategory.name.toLowerCase()} collection`}
        heroImage={getSubcategoryImage(subcategory)}
      />

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <div className="mb-6">
          <Link
            href={`/${categorySlug}`}
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to {category.name}
          </Link>
        </div>

        {/* Search and Sort */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <input
              type="text"
              placeholder={`Search in ${subcategory.name}...`}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className="w-full max-w-md px-4 py-2 rounded-lg border border-input bg-background"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-6">
          <p className="text-sm text-muted-foreground">
            {productsLoading ? 'Loading...' : `${total} product${total !== 1 ? 's' : ''} found`}
          </p>
        </div>

        {/* Products Grid */}
        {productsLoading ? (
          <ProductGridSkeleton count={8} />
        ) : products.length === 0 ? (
          <div className="text-center py-16">
            <h3 className="text-lg font-medium mb-2">No products found</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery
                ? 'Try adjusting your search query.'
                : `We don't have any ${subcategory.name.toLowerCase()} products yet. Check back soon!`}
            </p>
            {searchQuery && (
              <Button onClick={() => setSearchQuery('')}>Clear Search</Button>
            )}
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

        {/* Related Subcategories */}
        {category.subcategories && category.subcategories.length > 1 && (
          <div className="mt-16 pt-8 border-t">
            <h2 className="text-xl font-semibold mb-6">
              Other {category.name} Products
            </h2>
            <div className="flex flex-wrap gap-3">
              {category.subcategories
                .filter((sub) => sub.slug !== subcategory.slug)
                .map((sub) => (
                  <Link
                    key={sub.id}
                    href={`/${categorySlug}/${sub.slug}`}
                    className="px-4 py-2 rounded-lg border border-input bg-background hover:bg-accent transition-colors"
                  >
                    {sub.name}
                    {sub._count?.products !== undefined && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        ({sub._count.products})
                      </span>
                    )}
                  </Link>
                ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
