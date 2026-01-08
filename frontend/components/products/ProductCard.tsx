'use client';

import { memo } from 'react';
import Image from 'next/image';
import { Product, formatPrice } from '@/lib/api/products';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PrefetchLink } from '@/components/ui/PrefetchLink';
import { Heart, ShoppingCart } from 'lucide-react';
import { useWishlist } from '@/contexts/WishlistContext';
import { useCart } from '@/contexts/CartContext';

interface ProductCardProps {
  product: Product;
}

// Custom comparator for React.memo - only re-render if product data actually changed
function arePropsEqual(prevProps: ProductCardProps, nextProps: ProductCardProps): boolean {
  const prev = prevProps.product;
  const next = nextProps.product;

  // Compare primitive fields that affect rendering
  return (
    prev.id === next.id &&
    prev.name === next.name &&
    prev.description === next.description &&
    prev.basePrice === next.basePrice &&
    prev.status === next.status &&
    prev.featured === next.featured &&
    prev.currency === next.currency &&
    prev.category?.name === next.category?.name &&
    prev.images?.[0]?.imageUrl === next.images?.[0]?.imageUrl &&
    prev.variants?.[0]?.price === next.variants?.[0]?.price &&
    prev._count?.variants === next._count?.variants
  );
}

export const ProductCard = memo(function ProductCard({ product }: ProductCardProps) {
  const primaryImage = product.images?.find((img) => img.isPrimary) || product.images?.[0];
  const defaultVariant = product.variants?.find((v) => v.isDefault) || product.variants?.[0];

  const displayPrice = defaultVariant
    ? Number(product.basePrice) + Number(defaultVariant.price)
    : Number(product.basePrice);

  // Get category name from the category object or fall back to legacy
  const categoryName = product.category?.name || 'Product';

  // Wishlist and cart hooks
  const { isInWishlist, toggleItem } = useWishlist();
  const { addItem, openCart } = useCart();

  const isFavorited = isInWishlist(product.id);

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleItem({
      productId: product.id,
      productName: product.name,
      productSlug: product.slug,
      productImage: primaryImage?.imageUrl || '',
      price: displayPrice,
    });
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem({
      productId: product.id,
      productName: product.name,
      productSlug: product.slug,
      productImage: primaryImage?.imageUrl || '',
      variantId: defaultVariant?.id,
      variantName: defaultVariant?.name,
      quantity: 1,
      unitPrice: displayPrice,
    });
    openCart();
  };

  return (
    <PrefetchLink
      href={`/product/${product.id}`}
      prefetchType="product"
      prefetchId={product.id}
    >
      <Card className="group overflow-hidden transition-all hover:shadow-lg cursor-pointer h-full flex flex-col">
        {/* Product Image */}
        <div className="relative aspect-square w-full overflow-hidden bg-muted">
          {primaryImage ? (
            <Image
              src={primaryImage.imageUrl}
              alt={primaryImage.altText || product.name}
              fill
              className="object-cover transition-transform group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              unoptimized={primaryImage.imageUrl.includes('placehold.co')}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
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

          {/* Quick Action Buttons - always visible on mobile, hover on desktop */}
          <div className="absolute top-2 right-2 flex flex-col gap-2 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
            <Button
              size="icon"
              variant="secondary"
              className="h-9 w-9 rounded-full shadow-md bg-background/90 backdrop-blur-sm hover:bg-background"
              onClick={handleFavoriteClick}
              aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
            >
              <Heart
                className={`h-4 w-4 ${isFavorited ? 'fill-red-500 text-red-500' : ''}`}
              />
            </Button>
            <Button
              size="icon"
              variant="secondary"
              className="h-9 w-9 rounded-full shadow-md bg-background/90 backdrop-blur-sm hover:bg-background"
              onClick={handleAddToCart}
              disabled={product.status === 'OUT_OF_STOCK'}
              aria-label="Add to cart"
            >
              <ShoppingCart className="h-4 w-4" />
            </Button>
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
}, arePropsEqual);

export function ProductCardSkeleton() {
  return (
    <Card className="overflow-hidden h-full flex flex-col">
      {/* Image skeleton */}
      <div className="relative aspect-square w-full bg-muted animate-pulse" />

      {/* Content skeleton */}
      <CardContent className="flex-1 p-4">
        <div className="h-5 w-20 bg-muted rounded animate-pulse mb-2" />
        <div className="h-6 bg-muted rounded animate-pulse mb-2" />
        <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
      </CardContent>

      {/* Footer skeleton */}
      <CardFooter className="p-4 pt-0">
        <div className="h-8 w-24 bg-muted rounded animate-pulse" />
      </CardFooter>
    </Card>
  );
}
