'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Download, Zap, FileText, Infinity } from 'lucide-react';
import { CategoryHero } from '@/components/category/CategoryHero';
import { CategoryFeatures } from '@/components/category/CategoryFeatures';
import { ProductCard, ProductCardSkeleton } from '@/components/products/ProductCard';
import { Product, productsService } from '@/lib/api/products';

const CATEGORY = 'DIGITAL';

const features = [
  {
    icon: <Download className="h-6 w-6" />,
    title: 'Instant Download',
    description: 'Get your files immediately after purchase - no waiting required.',
  },
  {
    icon: <Zap className="h-6 w-6" />,
    title: 'High Quality',
    description: 'Professional-grade digital files ready for printing or sharing.',
  },
  {
    icon: <FileText className="h-6 w-6" />,
    title: 'Multiple Formats',
    description: 'Download in PDF, PNG, JPG, or other formats as needed.',
  },
  {
    icon: <Infinity className="h-6 w-6" />,
    title: 'Unlimited Use',
    description: 'Print as many times as you want for personal use.',
  },
];

export default function DigitalPage() {
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
        title="Digital Downloads"
        subtitle="Instant Access"
        description="Get instant access to printable designs, templates, and digital products. Download immediately and print at home or at your local print shop."
        heroImage="https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=1600&q=80"
        ctaText="Browse Downloads"
        ctaLink="#products"
        gradient="from-violet-600/90 to-purple-600/90"
      />

      {/* Features Section */}
      <CategoryFeatures
        title="Digital Convenience"
        subtitle="Download & Print"
        features={features}
      />

      {/* Featured Products */}
      {featuredProducts.length > 0 && (
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold">Popular Downloads</h2>
                <p className="text-muted-foreground">Our most downloaded digital products</p>
              </div>
              <Link href="/products?category=DIGITAL&featured=true">
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
            <h2 className="text-2xl font-bold">All Digital Products</h2>
            <p className="text-muted-foreground">Browse our complete digital collection</p>
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

      {/* How It Works Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                1
              </div>
              <h3 className="font-semibold mb-2">Choose Your Design</h3>
              <p className="text-muted-foreground text-sm">Browse our collection and find the perfect digital product.</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                2
              </div>
              <h3 className="font-semibold mb-2">Complete Purchase</h3>
              <p className="text-muted-foreground text-sm">Checkout securely and receive instant access to your files.</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                3
              </div>
              <h3 className="font-semibold mb-2">Download & Print</h3>
              <p className="text-muted-foreground text-sm">Download your files and print at home or at any print shop.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-primary/5">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready for Instant Access?</h2>
          <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
            Browse our digital collection and start downloading immediately. No shipping, no waiting.
          </p>
          <Link href="#products">
            <Button size="lg" className="btn-gradient">
              Browse Digital Products
            </Button>
          </Link>
        </div>
      </section>
    </main>
  );
}
