'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Droplets, Palette, Sparkles, Clock } from 'lucide-react';
import { CategoryHero } from '@/components/category/CategoryHero';
import { CategoryFeatures } from '@/components/category/CategoryFeatures';
import { ProductCard, ProductCardSkeleton } from '@/components/products/ProductCard';
import { FilterSidebar } from '@/components/products/FilterSidebar';
import { Product, productsService } from '@/lib/api/products';
import { CartIcon } from '@/components/cart/CartIcon';

const CATEGORY = 'SUBLIMATION';

const features = [
  {
    icon: <Droplets className="h-6 w-6" />,
    title: 'Vibrant Colors',
    description: 'Our sublimation process ensures colors stay bright and vivid for years to come.',
  },
  {
    icon: <Palette className="h-6 w-6" />,
    title: 'Full Coverage',
    description: 'Print edge-to-edge with no limitations on design complexity.',
  },
  {
    icon: <Sparkles className="h-6 w-6" />,
    title: 'Premium Quality',
    description: 'High-resolution printing that captures every detail of your design.',
  },
  {
    icon: <Clock className="h-6 w-6" />,
    title: 'Long Lasting',
    description: 'Designs won\'t crack, peel, or fade - even after hundreds of washes.',
  },
];

export default function SublimationPage() {
  const { user, logout } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        // Fetch featured products
        const featured = await productsService.list({
          category: CATEGORY,
          featured: true,
          limit: 4,
          status: 'ACTIVE',
        });
        setFeaturedProducts(featured.products);

        // Fetch all products
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
            <Link href="/gifts">
              <Button variant="ghost">Gifts</Button>
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

      {/* Hero Section */}
      <CategoryHero
        title="Sublimation Products"
        subtitle="Premium Custom Printing"
        description="Transform your ideas into stunning, vibrant products with our professional sublimation printing. From mugs to t-shirts, we bring your designs to life."
        heroImage="https://images.unsplash.com/photo-1562157873-818bc0726f68?w=1600&q=80"
        ctaText="Start Creating"
        ctaLink="#products"
        gradient="from-pink-600/90 to-purple-600/90"
      />

      {/* Features Section */}
      <CategoryFeatures
        title="Why Sublimation?"
        subtitle="The Perfect Printing Method"
        features={features}
      />

      {/* Featured Products */}
      {featuredProducts.length > 0 && (
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold">Featured Products</h2>
                <p className="text-muted-foreground">Our most popular sublimation items</p>
              </div>
              <Link href="/products?category=SUBLIMATION&featured=true">
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
            <h2 className="text-2xl font-bold">All Sublimation Products</h2>
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
          <h2 className="text-3xl font-bold mb-4">Ready to Create Something Amazing?</h2>
          <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
            Upload your design or choose from our templates to get started with your custom sublimation product.
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
