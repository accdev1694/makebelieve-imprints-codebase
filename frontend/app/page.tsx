'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { Product, productsService } from '@/lib/api/products';
import { Category, categoriesService, getCategoryImage } from '@/lib/api/categories';

// Home page components
import { HeroSection } from '@/components/home/HeroSection';
import { TrustBadges } from '@/components/home/TrustBadges';
import { CategoryCard } from '@/components/home/CategoryCard';
import { ProductGrid } from '@/components/home/ProductGrid';
import { HowItWorksSection } from '@/components/home/HowItWorksSection';
import { CustomerTestimonials } from '@/components/home/CustomerTestimonials';

export default function Home() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [bestsellers, setBestsellers] = useState<Product[]>([]);
  const [newArrivals, setNewArrivals] = useState<Product[]>([]);
  const [categoryProducts, setCategoryProducts] = useState<Record<string, Product[]>>({});

  // Fallback categories in case API fails
  const fallbackCategories: Category[] = [
    {
      id: '1',
      name: 'Home & Lifestyle',
      slug: 'home-lifestyle',
      description: 'Custom mugs, keychains, t-shirts, and personalized lifestyle products',
      image: '/images/home-lifestyle.png',
      displayOrder: 1,
      isActive: true,
      createdAt: '',
      updatedAt: '',
    },
    {
      id: '2',
      name: 'Business Stationery',
      slug: 'stationery',
      description: 'Business cards, letterheads, and professional print materials',
      image: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=800&q=80',
      displayOrder: 2,
      isActive: true,
      createdAt: '',
      updatedAt: '',
    },
    {
      id: '3',
      name: 'Large Format Prints',
      slug: 'large-format',
      description: 'Banners, posters, and signage for maximum impact',
      image: 'https://images.unsplash.com/photo-1626785774573-4b799315345d?w=800&q=80',
      displayOrder: 3,
      isActive: true,
      createdAt: '',
      updatedAt: '',
    },
    {
      id: '4',
      name: 'Photo Prints',
      slug: 'photo-prints',
      description: 'Canvas prints, framed photos, and photo albums',
      image: 'https://images.unsplash.com/photo-1452421822248-d4c2b47f0c81?w=800&q=80',
      displayOrder: 4,
      isActive: true,
      createdAt: '',
      updatedAt: '',
    },
    {
      id: '5',
      name: 'Digital Products',
      slug: 'digital',
      description: 'Templates, designs, and digital downloads',
      image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80',
      displayOrder: 5,
      isActive: true,
      createdAt: '',
      updatedAt: '',
    },
  ];

  // Fetch categories and products
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch categories from API
        try {
          const categoriesData = await categoriesService.list({ includeSubcategories: true });
          setCategories(categoriesData.length > 0 ? categoriesData : fallbackCategories);
        } catch {
          setCategories(fallbackCategories);
        }

        // Fetch bestsellers (featured products)
        try {
          const featuredData = await productsService.list({
            featured: true,
            limit: 8,
            status: 'ACTIVE',
            sortBy: 'featured',
            sortOrder: 'desc',
          });
          setBestsellers(featuredData.products);
        } catch {
          // Silently fail - section will just be empty
        }

        // Fetch new arrivals (sorted by creation date)
        try {
          const newData = await productsService.list({
            limit: 8,
            status: 'ACTIVE',
            sortBy: 'createdAt',
            sortOrder: 'desc',
          });
          setNewArrivals(newData.products);
        } catch {
          // Silently fail - section will just be empty
        }

      } catch {
        // Ensure fallback categories are set even on complete failure
        if (categories.length === 0) {
          setCategories(fallbackCategories);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement newsletter signup
    console.log('Newsletter signup:', email);
  };

  return (
    <div className="min-h-screen bg-background">
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
              {categories.map((category) => (
                <CategoryCard
                  key={category.id}
                  title={category.name}
                  description={category.description || ''}
                  image={getCategoryImage(category)}
                  href={`/products/${category.slug}`}
                  productCount={category._count?.products || categoryProducts[category.slug]?.length}
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

              {/* Featured Category: Home & Lifestyle */}
              {categoryProducts['home-lifestyle']?.length > 0 && (
                <section className="py-16">
                  <ProductGrid
                    title="Popular Home & Lifestyle Products"
                    products={categoryProducts['home-lifestyle']}
                    viewAllLink="/products/home-lifestyle"
                    maxProducts={4}
                  />
                </section>
              )}

              {/* Customer Testimonials */}
              <CustomerTestimonials />

              {/* Featured Category: Stationery */}
              {categoryProducts['stationery']?.length > 0 && (
                <section className="py-16">
                  <ProductGrid
                    title="Business Stationery"
                    products={categoryProducts['stationery']}
                    viewAllLink="/products/stationery"
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
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link href="/products" className="w-full sm:w-auto">
                <Button size="lg" className="btn-gradient px-12 py-7 text-xl w-full">
                  Browse All Products
                </Button>
              </Link>
              <Link href="/design/new" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  variant="outline"
                  className="px-12 py-7 text-xl border-primary/50 w-full"
                >
                  Start Designing
                </Button>
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
