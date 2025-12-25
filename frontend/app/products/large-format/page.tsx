'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Maximize, Eye, Shield, Zap } from 'lucide-react';
import { CategoryHero } from '@/components/category/CategoryHero';
import { CategoryFeatures } from '@/components/category/CategoryFeatures';
import { ProductCard, ProductCardSkeleton } from '@/components/products/ProductCard';
import { Product, productsService } from '@/lib/api/products';

const CATEGORY = 'LARGE_FORMAT';

const features = [
  {
    icon: <Maximize className="h-6 w-6" />,
    title: 'Any Size',
    description: 'From A2 to billboard size, we print at any scale you need.',
  },
  {
    icon: <Eye className="h-6 w-6" />,
    title: 'High Resolution',
    description: 'Crystal clear prints that look stunning from any distance.',
  },
  {
    icon: <Shield className="h-6 w-6" />,
    title: 'Durable Materials',
    description: 'Weather-resistant options for indoor and outdoor use.',
  },
  {
    icon: <Zap className="h-6 w-6" />,
    title: 'Quick Production',
    description: 'Fast turnaround for time-sensitive projects.',
  },
];

export default function LargeFormatPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
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
      } catch (error) {
        console.error('Failed to fetch products:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [page]);

  return (
    <main className="min-h-screen bg-background">
      {/* Hero Section */}
      <CategoryHero
        title="Large Format Printing"
        subtitle="Big Impact Prints"
        description="Make a statement with our large format printing services. Perfect for banners, posters, signage, and exhibition displays."
        heroImage="https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1600&q=80"
        ctaText="Start Creating"
        ctaLink="#products"
        gradient="from-orange-600/90 to-red-600/90"
      />

      {/* Features Section */}
      <CategoryFeatures
        title="Go Big With Confidence"
        subtitle="Large Format Excellence"
        features={features}
      />

      {/* Featured Products */}
      {featuredProducts.length > 0 && (
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold">Featured Large Format</h2>
                <p className="text-muted-foreground">Our most popular large format products</p>
              </div>
              <Link href="/products?category=LARGE_FORMAT&featured=true">
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
      <section id="products" className="py-16 bg-gray-50/50">
        <div className="container mx-auto px-4">
          <div className="mb-8">
            <h2 className="text-2xl font-bold">All Large Format Products</h2>
            <p className="text-muted-foreground">Browse our complete collection</p>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No products found in this category.</p>
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
                  <span className="flex items-center px-4">
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
          <h2 className="text-3xl font-bold mb-4">Ready to Think Big?</h2>
          <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
            Whether it's a trade show banner or a storefront sign, we've got you covered with high-quality large format printing.
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/design/new">
              <Button size="lg" className="btn-gradient">
                Upload Your Design
              </Button>
            </Link>
            <Link href="/custom-order">
              <Button size="lg" variant="outline">
                Request Quote
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
