'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { CategoryHero } from '@/components/category/CategoryHero';
import { ProductCard, ProductCardSkeleton } from '@/components/products/ProductCard';
import { Product, productsService } from '@/lib/api/products';

const CATEGORY = 'PHOTO_PRINTS';

export default function PhotoPrintsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [retryCount, setRetryCount] = useState(0);

  const retry = () => setRetryCount((c) => c + 1);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        setError(null);
        const featured = await productsService.list({
          category: CATEGORY,
          featured: true,
          limit: 4,
          status: 'ACTIVE',
        });
        setFeaturedProducts(featured.products);

        const all = await productsService.list({
          category: CATEGORY,
          page,
          limit: 12,
          status: 'ACTIVE',
        });
        setProducts(all.products);
        setTotalPages(all.pagination.totalPages);
      } catch {
        setError('Failed to load products. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [page, retryCount]);

  return (
    <main className="min-h-screen bg-background">
      {/* Hero Section */}
      <CategoryHero
        title="Premium Photo Prints"
        subtitle="Gallery Quality"
        description="Transform your photographs into stunning wall art. From canvas prints to acrylic displays, we offer premium options to showcase your memories."
        heroImage="https://images.unsplash.com/photo-1452421822248-d4c2b47f0c81?w=1600&q=80"
        ctaText="Start Creating"
        ctaLink="#products"
        gradient="from-black/90 via-black/85 to-black/75"
      />

      {/* Featured Products */}
      {featuredProducts.length > 0 && (
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold">Featured Photo Products</h2>
                <p className="text-muted-foreground">Our most popular photo print options</p>
              </div>
              <Link href="/products?category=PHOTO_PRINTS&featured=true">
                <Button variant="outline">View All Featured</Button>
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {featuredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* All Products */}
      <section id="products" className="py-16 bg-gray-900">
        <div className="container mx-auto px-4">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white">All Photo Print Products</h2>
            <p className="text-gray-400">Browse our complete collection</p>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-destructive mb-4">{error}</p>
              <Button onClick={retry} variant="outline">
                Try Again
              </Button>
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400">No products found in this category.</p>
              <Link href="/products">
                <Button className="mt-4">Browse All Products</Button>
              </Link>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>

              {totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-8">
                  <Button
                    variant="outline"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    Previous
                  </Button>
                  <span className="flex items-center px-4 text-gray-400">
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
      </section>

      {/* CTA Section */}
      <section className="py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Turn Your Photos Into Art</h2>
          <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
            Whether it's a cherished family photo or a stunning landscape, we'll transform it into a beautiful print.
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/design/new">
              <Button size="lg" className="btn-gradient">
                Upload Your Photo
              </Button>
            </Link>
            <Link href="/templates">
              <Button size="lg" variant="outline">
                Browse Templates
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
