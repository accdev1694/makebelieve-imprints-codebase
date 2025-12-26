'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

import { ProductCard } from '@/components/products/ProductCard';
import { ProductGridSkeleton } from '@/components/ui/Skeleton';
import { Product, productsService } from '@/lib/api/products';
import { Category, Subcategory, categoriesService, getCategoryImage, getSubcategoryImage } from '@/lib/api/categories';
import { CategoryHero } from '@/components/category/CategoryHero';

interface CategoryLandingPageProps {
  categorySlug: string;
  categoryName: string;
  categoryDescription?: string;
}

export function CategoryLandingPage({
  categorySlug,
  categoryName,
  categoryDescription,
}: CategoryLandingPageProps) {
  const [category, setCategory] = useState<Category | null>(null);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch category data
  useEffect(() => {
    const fetchCategory = async () => {
      try {
        setLoading(true);
        setError(null);
        const categoryData = await categoriesService.get(categorySlug);
        setCategory(categoryData);
        setSubcategories(categoryData.subcategories || []);
      } catch {
        setError('Category not found');
      } finally {
        setLoading(false);
      }
    };

    fetchCategory();
  }, [categorySlug]);

  // Fetch featured products
  useEffect(() => {
    const fetchProducts = async () => {
      if (!category) return;

      try {
        setProductsLoading(true);
        const response = await productsService.list({
          page: 1,
          limit: 8,
          categorySlug: category.slug,
          status: 'ACTIVE',
          sortBy: 'featured',
          sortOrder: 'desc',
        });
        setFeaturedProducts(response.products);
      } catch {
        // Silently fail - featured products section will just be empty
      } finally {
        setProductsLoading(false);
      }
    };

    if (category) {
      fetchProducts();
    }
  }, [category]);

  // Loading state
  if (loading) {
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
  if (error || !category) {
    return (
      <main className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">Category Not Found</h1>
          <p className="text-muted-foreground mb-8">
            The category you&apos;re looking for doesn&apos;t exist.
          </p>
          <Link href="/products">
            <Button>Browse All Products</Button>
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      {/* Category Hero */}
      <CategoryHero
        title={category.name}
        subtitle="Explore Our Collection"
        description={category.description || categoryDescription || `Discover our ${category.name.toLowerCase()} products`}
        heroImage={getCategoryImage(category)}
        ctaText="View All Products"
        ctaLink={`/products/${categorySlug}`}
      />

      {/* Subcategory Grid */}
      {subcategories.length > 0 && (
        <section className="container mx-auto px-4 py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Shop by Type</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Browse our {category.name.toLowerCase()} collection by category
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {subcategories.map((subcategory) => (
              <Link
                key={subcategory.id}
                href={`/${categorySlug}/${subcategory.slug}`}
                className="group relative overflow-hidden rounded-xl bg-card border shadow-sm hover:shadow-lg transition-all duration-300"
              >
                {/* Image */}
                <div className="aspect-square relative overflow-hidden">
                  <Image
                    src={getSubcategoryImage(subcategory)}
                    alt={subcategory.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                </div>

                {/* Content */}
                <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                  <h3 className="text-lg font-semibold mb-1">{subcategory.name}</h3>
                  {subcategory._count?.products !== undefined && (
                    <p className="text-sm text-white/80">
                      {subcategory._count.products} product{subcategory._count.products !== 1 ? 's' : ''}
                    </p>
                  )}
                  <div className="flex items-center mt-2 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                    Shop Now <ArrowRight className="h-4 w-4 ml-1" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Featured Products */}
      <section className="container mx-auto px-4 py-16 bg-muted/30">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold mb-2">Featured Products</h2>
            <p className="text-muted-foreground">
              Our most popular {category.name.toLowerCase()} items
            </p>
          </div>
          <Link href={`/products/${categorySlug}`}>
            <Button variant="outline" className="gap-2">
              View All <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>

        {productsLoading ? (
          <ProductGridSkeleton count={4} />
        ) : featuredProducts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No products available yet. Check back soon!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {featuredProducts.slice(0, 8).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="bg-primary rounded-2xl p-8 md:p-12 text-center text-white">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            Need Something Custom?
          </h2>
          <p className="text-white/90 mb-6 max-w-xl mx-auto">
            Can&apos;t find exactly what you&apos;re looking for? We offer custom printing services
            tailored to your specific needs.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/custom-order">
              <Button size="lg" variant="secondary" className="w-full sm:w-auto">
                Request Custom Order
              </Button>
            </Link>
            <Link href="/contact">
              <Button
                size="lg"
                variant="outline"
                className="w-full sm:w-auto border-white text-white hover:bg-white/10"
              >
                Contact Us
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
