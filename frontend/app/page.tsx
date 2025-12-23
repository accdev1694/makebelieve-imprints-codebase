'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import {
  Product,
  ProductCategory,
  productsService,
  CATEGORY_LABELS,
} from '@/lib/api/products';

// Home page components
import { HeroSection } from '@/components/home/HeroSection';
import { TrustBadges } from '@/components/home/TrustBadges';
import { CategoryCard } from '@/components/home/CategoryCard';
import { ProductGrid } from '@/components/home/ProductGrid';
import { PromoBanner } from '@/components/home/PromoBanner';
import { HowItWorksSection } from '@/components/home/HowItWorksSection';
import { CustomerTestimonials } from '@/components/home/CustomerTestimonials';

export default function Home() {
  const { user, logout } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [bestsellers, setBestsellers] = useState<Product[]>([]);
  const [newArrivals, setNewArrivals] = useState<Product[]>([]);
  const [categoryProducts, setCategoryProducts] = useState<Record<ProductCategory, Product[]>>({
    SUBLIMATION: [],
    STATIONERY: [],
    LARGE_FORMAT: [],
    PHOTO_PRINTS: [],
    DIGITAL: [],
  });

  // Category data with images
  const categories = [
    {
      title: 'Sublimation Gifts',
      description: 'Custom mugs, tumblers, and personalized gifts',
      image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=800&q=80',
      href: '/products?category=SUBLIMATION',
      category: 'SUBLIMATION' as ProductCategory,
    },
    {
      title: 'Business Stationery',
      description: 'Business cards, letterheads, and brochures',
      image: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=800&q=80',
      href: '/products?category=STATIONERY',
      category: 'STATIONERY' as ProductCategory,
    },
    {
      title: 'Large Format Prints',
      description: 'Banners, posters, and signage',
      image: 'https://images.unsplash.com/photo-1626785774573-4b799315345d?w=800&q=80',
      href: '/products?category=LARGE_FORMAT',
      category: 'LARGE_FORMAT' as ProductCategory,
    },
    {
      title: 'Photo Prints',
      description: 'Canvas prints, framed photos, and albums',
      image: 'https://images.unsplash.com/photo-1452421822248-d4c2b47f0c81?w=800&q=80',
      href: '/products?category=PHOTO_PRINTS',
      category: 'PHOTO_PRINTS' as ProductCategory,
    },
    {
      title: 'Digital Products',
      description: 'Templates, designs, and digital downloads',
      image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80',
      href: '/products?category=DIGITAL',
      category: 'DIGITAL' as ProductCategory,
    },
  ];

  // Fetch products
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);

        // Fetch bestsellers (featured products)
        const featuredData = await productsService.list({
          featured: true,
          limit: 8,
          status: 'ACTIVE',
          sortBy: 'featured',
          sortOrder: 'desc',
        });
        setBestsellers(featuredData.products);

        // Fetch new arrivals (sorted by creation date)
        const newData = await productsService.list({
          limit: 8,
          status: 'ACTIVE',
          sortBy: 'createdAt',
          sortOrder: 'desc',
        });
        setNewArrivals(newData.products);

        // Fetch products for each category (limited to show on home page)
        const categoryData: Record<ProductCategory, Product[]> = {
          SUBLIMATION: [],
          STATIONERY: [],
          LARGE_FORMAT: [],
          PHOTO_PRINTS: [],
          DIGITAL: [],
        };

        const categoryPromises = categories.map(async (cat) => {
          const data = await productsService.list({
            category: cat.category,
            limit: 4,
            status: 'ACTIVE',
            sortBy: 'featured',
            sortOrder: 'desc',
          });
          categoryData[cat.category] = data.products;
        });

        await Promise.all(categoryPromises);
        setCategoryProducts(categoryData);
      } catch (error) {
        console.error('Failed to fetch products:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement newsletter signup
    console.log('Newsletter signup:', email);
  };

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
            {user ? (
              <>
                <Link href="/dashboard">
                  <Button variant="ghost">Dashboard</Button>
                </Link>
                <span className="text-sm text-muted-foreground hidden md:inline">
                  {user.name}
                </span>
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
      <HeroSection />

      {/* Trust Badges */}
      <TrustBadges />

      {/* Main Content Container */}
      <div className="relative">
        {/* Ambient background effects */}
        <div className="fixed inset-0 opacity-20 pointer-events-none">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/30 rounded-full blur-[120px]" />
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-secondary/30 rounded-full blur-[120px]" />
        </div>

        <div className="relative z-10 container mx-auto px-4">
          {/* Category Navigation */}
          <section className="py-16">
            <div className="text-center mb-12">
              <h2 className="text-4xl md:text-5xl font-bold mb-4">
                Browse by <span className="text-primary">Category</span>
              </h2>
              <p className="text-xl text-muted-foreground">
                Find the perfect product for your needs
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
              {categories.map((category, index) => (
                <CategoryCard
                  key={index}
                  title={category.title}
                  description={category.description}
                  image={category.image}
                  href={category.href}
                  productCount={categoryProducts[category.category]?.length}
                />
              ))}
            </div>
          </section>

          {/* Loading State */}
          {loading ? (
            <div className="text-center py-20">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
              <p className="mt-4 text-muted-foreground">Loading products...</p>
            </div>
          ) : (
            <>
              {/* Bestsellers Section */}
              {bestsellers.length > 0 && (
                <section className="py-16">
                  <ProductGrid
                    title="Our Bestsellers"
                    products={bestsellers}
                    viewAllLink="/products?featured=true"
                    maxProducts={8}
                  />
                </section>
              )}

              {/* Promo Banner 1 */}
              <PromoBanner
                title="Design Your Own Business Cards"
                description="Professional quality business cards with our easy-to-use design tool. Stand out from the crowd with custom designs."
                ctaText="Start Designing"
                ctaLink="/design/new"
                image="https://images.unsplash.com/photo-1589330273594-faddc14a63e9?w=800&q=80"
                imagePosition="right"
              />

              {/* New Arrivals Section */}
              {newArrivals.length > 0 && (
                <section className="py-16">
                  <ProductGrid
                    title="New Arrivals"
                    products={newArrivals}
                    viewAllLink="/products?sortBy=createdAt&sortOrder=desc"
                    maxProducts={8}
                  />
                </section>
              )}

              {/* How It Works */}
              <HowItWorksSection />

              {/* Featured Category: Sublimation */}
              {categoryProducts.SUBLIMATION.length > 0 && (
                <section className="py-16">
                  <ProductGrid
                    title="Popular Sublimation Gifts"
                    products={categoryProducts.SUBLIMATION}
                    viewAllLink="/products?category=SUBLIMATION"
                    maxProducts={4}
                  />
                </section>
              )}

              {/* Promo Banner 2 */}
              <PromoBanner
                title="Custom Mugs & Tumblers"
                description="Perfect for gifts, events, or promotional items. High-quality sublimation printing that lasts."
                ctaText="Browse Sublimation"
                ctaLink="/products?category=SUBLIMATION"
                image="https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=800&q=80"
                imagePosition="left"
              />

              {/* Customer Testimonials */}
              <CustomerTestimonials />

              {/* Featured Category: Stationery */}
              {categoryProducts.STATIONERY.length > 0 && (
                <section className="py-16">
                  <ProductGrid
                    title="Business Stationery"
                    products={categoryProducts.STATIONERY}
                    viewAllLink="/products?category=STATIONERY"
                    maxProducts={4}
                  />
                </section>
              )}
            </>
          )}

          {/* Newsletter Section */}
          <section className="py-20 border-t border-border/50">
            <div className="max-w-2xl mx-auto text-center">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Get <span className="text-accent">10% Off</span> Your First Order
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                Subscribe to our newsletter for exclusive deals and design tips
              </p>
              <form onSubmit={handleNewsletterSubmit} className="flex gap-4 max-w-md mx-auto">
                <Input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1"
                  required
                />
                <Button type="submit" className="btn-gradient">
                  Subscribe
                </Button>
              </form>
            </div>
          </section>

          {/* Final CTA */}
          <section className="py-20 text-center">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Ready to <span className="text-accent">Bring Your Ideas</span> to Life?
            </h2>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Join thousands of customers who trust us for professional printing
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/products">
                <Button size="lg" className="btn-gradient px-12 py-7 text-xl">
                  Browse All Products
                </Button>
              </Link>
              <Link href="/design/new">
                <Button
                  size="lg"
                  variant="outline"
                  className="px-12 py-7 text-xl border-primary/50"
                >
                  Start Designing
                </Button>
              </Link>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
