'use client';

import { Product } from '@/lib/api/products';
import { ProductCard } from '@/components/products/ProductCard';

interface RelatedProductsProps {
  products: Product[];
  title?: string;
}

export function RelatedProducts({ products, title = 'You May Also Like' }: RelatedProductsProps) {
  if (products.length === 0) {
    return null;
  }

  return (
    <section className="py-16 border-t border-border">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl md:text-4xl font-bold mb-8 text-center">{title}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {products.slice(0, 4).map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}
