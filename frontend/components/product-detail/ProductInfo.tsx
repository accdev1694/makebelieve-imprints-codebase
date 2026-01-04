'use client';

import { Badge } from '@/components/ui/badge';
import { Star, Package, Truck, Shield } from 'lucide-react';
import { Product } from '@/lib/api/products';

interface ProductInfoProps {
  product: Product;
  selectedVariantPrice?: number;
}

export function ProductInfo({ product, selectedVariantPrice }: ProductInfoProps) {
  const basePrice = typeof product.basePrice === 'string' ? parseFloat(product.basePrice) : product.basePrice;
  const displayPrice = selectedVariantPrice || basePrice;

  return (
    <div className="space-y-6">
      {/* Product Name */}
      <div>
        <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">{product.name}</h1>
        <p className="text-muted-foreground">SKU: {product.id.slice(0, 8).toUpperCase()}</p>
      </div>

      {/* Reviews/Rating (Placeholder) */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className={`h-5 w-5 ${i < 4 ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/50'}`}
            />
          ))}
        </div>
        <span className="text-sm text-muted-foreground">(4.5 stars, 127 reviews)</span>
      </div>

      {/* Price */}
      <div className="flex items-baseline gap-3">
        <span className="text-4xl font-bold text-foreground">${displayPrice.toFixed(2)}</span>
        {selectedVariantPrice && selectedVariantPrice !== basePrice && (
          <span className="text-lg text-muted-foreground line-through">
            ${basePrice.toFixed(2)}
          </span>
        )}
      </div>

      {/* Status Badges */}
      <div className="flex flex-wrap gap-2">
        {product.featured && (
          <Badge className="bg-accent text-white">Featured Product</Badge>
        )}
        <Badge variant="outline" className="border-green-500 text-green-600">
          In Stock
        </Badge>
      </div>

      {/* Short Description */}
      <div className="prose prose-sm">
        <p className="text-muted-foreground leading-relaxed">{product.description}</p>
      </div>

      {/* Quick Features */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-border">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Truck className="h-5 w-5 text-primary" />
          </div>
          <div>
            <div className="font-semibold text-sm">Fast Shipping</div>
            <div className="text-xs text-muted-foreground">24-48hr delivery</div>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Shield className="h-5 w-5 text-primary" />
          </div>
          <div>
            <div className="font-semibold text-sm">Quality Guaranteed</div>
            <div className="text-xs text-muted-foreground">100% satisfaction</div>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Package className="h-5 w-5 text-primary" />
          </div>
          <div>
            <div className="font-semibold text-sm">Easy Returns</div>
            <div className="text-xs text-muted-foreground">14-day policy</div>
          </div>
        </div>
      </div>
    </div>
  );
}
