'use client';

import { Product } from '@/lib/api/products';
import { ProductCard } from '@/components/products/ProductCard';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface ProductGridProps {
  title: string;
  products: Product[];
  viewAllLink?: string;
  maxProducts?: number;
}

export function ProductGrid({ title, products, viewAllLink, maxProducts = 8 }: ProductGridProps) {
  const displayProducts = products.slice(0, maxProducts);

  if (displayProducts.length === 0) {
    return null;
  }

  return (
    <section className="space-y-6">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground">{title}</h2>
          <p className="text-muted-foreground mt-2">
            {displayProducts.length} product{displayProducts.length !== 1 ? 's' : ''} available
          </p>
        </div>
        {viewAllLink && (
          <Link href={viewAllLink}>
            <Button variant="ghost" className="gap-2 group">
              View All
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </Link>
        )}
      </div>

      {/* Product Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {displayProducts.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      {/* Mobile View All Button */}
      {viewAllLink && (
        <div className="flex justify-center sm:hidden mt-8">
          <Link href={viewAllLink}>
            <Button className="btn-gradient gap-2">
              View All {title}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      )}
    </section>
  );
}
