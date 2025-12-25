'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { PenTool, Layers, BadgeCheck, Truck } from 'lucide-react';
import { CategoryHero } from '@/components/category/CategoryHero';
import { CategoryFeatures } from '@/components/category/CategoryFeatures';
import { ProductCard, ProductCardSkeleton } from '@/components/products/ProductCard';
import { Product, productsService } from '@/lib/api/products';

const CATEGORY = 'STATIONERY';

const features = [
  {
    icon: <PenTool className="h-6 w-6" />,
    title: 'Premium Paper',
    description: 'High-quality paper stocks that feel luxurious and professional.',
  },
  {
    icon: <Layers className="h-6 w-6" />,
    title: 'Custom Finishes',
    description: 'Choose from matte, gloss, silk, or textured finishes.',
  },
  {
    icon: <BadgeCheck className="h-6 w-6" />,
    title: 'Professional Quality',
    description: 'Sharp, crisp printing that makes your brand stand out.',
  },
  {
    icon: <Truck className="h-6 w-6" />,
    title: 'Fast Turnaround',
    description: 'Quick production times without compromising on quality.',
  },
];

export default function StationeryPage() {
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
        title="Business Stationery"
        subtitle="Professional Printing"
        description="Make a lasting impression with custom business cards, letterheads, leaflets, and more. Quality stationery that represents your brand professionally."
        heroImage="https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=1600&q=80"
        ctaText="Start Creating"
        ctaLink="#products"
        gradient="from-blue-600/90 to-indigo-600/90"
      />

      {/* Features Section */}
      <CategoryFeatures
        title="Professional Print Quality"
        subtitle="Business Essentials"
        features={features}
      />

      {/* Featured Products */}
      {featuredProducts.length > 0 && (
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold">Featured Stationery</h2>
                <p className="text-muted-foreground">Our most popular business products</p>
              </div>
              <Link href="/products?category=STATIONERY&featured=true">
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
            <h2 className="text-2xl font-bold">All Stationery Products</h2>
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
          <h2 className="text-3xl font-bold mb-4">Need Custom Business Materials?</h2>
          <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
            From business cards to full branding packages, we can help you create professional materials that impress.
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/design/new">
              <Button size="lg" className="btn-gradient">
                Upload Your Design
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
