'use client';

import Image from 'next/image';
import { Product, formatPrice } from '@/lib/api/products';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PrefetchLink } from '@/components/ui/PrefetchLink';

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const primaryImage = product.images?.find((img) => img.isPrimary) || product.images?.[0];
  const defaultVariant = product.variants?.find((v) => v.isDefault) || product.variants?.[0];

  const displayPrice = defaultVariant
    ? Number(product.basePrice) + Number(defaultVariant.price)
    : Number(product.basePrice);

  // Get category name from the category object or fall back to legacy
  const categoryName = product.category?.name || 'Product';

  return (
    <PrefetchLink
      href={`/product/${product.id}`}
      prefetchType="product"
      prefetchId={product.id}
    >
      <Card className="group overflow-hidden transition-all hover:shadow-lg cursor-pointer h-full flex flex-col">
        {/* Product Image */}
        <div className="relative aspect-square w-full overflow-hidden bg-gray-100">
          {primaryImage ? (
            <Image
              src={primaryImage.imageUrl}
              alt={primaryImage.altText || product.name}
              fill
              className="object-cover transition-transform group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">
              <span className="text-sm">No image</span>
            </div>
          )}

          {/* Badges */}
          <div className="absolute top-2 left-2 flex flex-col gap-1">
            {product.featured && (
              <Badge className="bg-primary text-primary-foreground">Featured</Badge>
            )}
            {product.status === 'OUT_OF_STOCK' && (
              <Badge variant="destructive">Out of Stock</Badge>
            )}
          </div>
        </div>

        {/* Product Info */}
        <CardContent className="flex-1 p-4">
          <div className="mb-2">
            <Badge variant="outline" className="text-xs">
              {categoryName}
            </Badge>
          </div>

          <h3 className="font-semibold text-lg mb-1 line-clamp-2 group-hover:text-primary transition-colors">
            {product.name}
          </h3>

          <p className="text-sm text-muted-foreground line-clamp-2">
            {product.description}
          </p>
        </CardContent>

        {/* Price */}
        <CardFooter className="p-4 pt-0">
          <div className="flex items-center justify-between w-full">
            <span className="text-2xl font-bold">
              {formatPrice(displayPrice, product.currency)}
            </span>

            {product._count && product._count.variants > 1 && (
              <span className="text-xs text-muted-foreground">
                {product._count.variants} options
              </span>
            )}
          </div>
        </CardFooter>
      </Card>
    </PrefetchLink>
  );
}

export function ProductCardSkeleton() {
  return (
    <Card className="overflow-hidden h-full flex flex-col">
      {/* Image skeleton */}
      <div className="relative aspect-square w-full bg-gray-200 animate-pulse" />

      {/* Content skeleton */}
      <CardContent className="flex-1 p-4">
        <div className="h-5 w-20 bg-gray-200 rounded animate-pulse mb-2" />
        <div className="h-6 bg-gray-200 rounded animate-pulse mb-2" />
        <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
      </CardContent>

      {/* Footer skeleton */}
      <CardFooter className="p-4 pt-0">
        <div className="h-8 w-24 bg-gray-200 rounded animate-pulse" />
      </CardFooter>
    </Card>
  );
}
