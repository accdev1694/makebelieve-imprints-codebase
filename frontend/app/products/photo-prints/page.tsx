'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Camera, Image, Frame, Star } from 'lucide-react';
import { CategoryHero } from '@/components/category/CategoryHero';
import { CategoryFeatures } from '@/components/category/CategoryFeatures';
import { ProductCard, ProductCardSkeleton } from '@/components/products/ProductCard';
import { Product, productsService } from '@/lib/api/products';
import { CartIcon } from '@/components/cart/CartIcon';

const CATEGORY = 'PHOTO_PRINTS';

const features = [
  {
    icon: <Camera className="h-6 w-6" />,
    title: 'Photo Quality',
    description: 'Professional-grade printing that captures every detail of your images.',
  },
  {
    icon: <Image className="h-6 w-6" />,
    title: 'Premium Materials',
    description: 'Choose from canvas, acrylic, aluminum, and fine art paper.',
  },
  {
    icon: <Frame className="h-6 w-6" />,
    title: 'Gallery Ready',
    description: 'Museum-quality prints ready to hang and display.',
  },
  {
    icon: <Star className="h-6 w-6" />,
    title: 'Archival Quality',
    description: 'Prints that last a lifetime with fade-resistant inks.',
  },
];

export default function PhotoPrintsPage() {
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
        title="Premium Photo Prints"
        subtitle="Gallery Quality"
        description="Transform your photographs into stunning wall art. From canvas prints to acrylic displays, we offer premium options to showcase your memories."
        heroImage="https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=1600&q=80"
        ctaText="Start Creating"
        ctaLink="#products"
        gradient="from-teal-600/90 to-cyan-600/90"
      />

      {/* Features Section */}
      <CategoryFeatures
        title="Premium Photo Quality"
        subtitle="For Your Precious Memories"
        features={features}
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
      <section id="products" className="py-16 bg-gray-50/50">
        <div className="container mx-auto px-4">
          <div className="mb-8">
            <h2 className="text-2xl font-bold">All Photo Print Products</h2>
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
