import Image from 'next/image';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShoppingBag, Plus, ChevronRight } from 'lucide-react';
import { formatPrice, Product } from '@/lib/api/products';
import { AddToCartPayload } from '@/lib/cart';

interface SuggestedProductsSectionProps {
  products: Product[];
  onAddProduct: (payload: AddToCartPayload) => void;
}

export function SuggestedProductsSection({
  products,
  onAddProduct,
}: SuggestedProductsSectionProps) {
  const handleAddProduct = (product: Product) => {
    const defaultVariant = product.variants?.find(v => v.isDefault) || product.variants?.[0];
    const primaryImage = product.images?.find(img => img.isPrimary) || product.images?.[0];

    onAddProduct({
      productId: product.id,
      variantId: defaultVariant?.id,
      productName: product.name,
      productSlug: product.slug,
      productImage: primaryImage?.imageUrl || '/placeholder-product.svg',
      unitPrice: defaultVariant?.price || product.basePrice,
      quantity: 1,
      size: defaultVariant?.size,
      color: defaultVariant?.color,
      material: defaultVariant?.material,
    });
  };

  if (products.length === 0) {
    return null;
  }

  return (
    <div className="mt-12">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold">You might also like</h2>
          <p className="text-sm text-muted-foreground">Add more items before you checkout</p>
        </div>
        <Link href="/products">
          <Button variant="ghost" size="sm">
            View All <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </Link>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {products.map((product) => {
          const primaryImage = product.images?.find(img => img.isPrimary) || product.images?.[0];
          const defaultVariant = product.variants?.find(v => v.isDefault) || product.variants?.[0];
          const price = defaultVariant?.price || product.basePrice;

          return (
            <Card key={product.id} className="group overflow-hidden hover:shadow-lg transition-shadow">
              <div className="relative aspect-square bg-muted">
                {primaryImage?.imageUrl ? (
                  <Image
                    src={primaryImage.imageUrl}
                    alt={product.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform"
                    sizes="(max-width: 768px) 50vw, 25vw"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    <ShoppingBag className="h-8 w-8" />
                  </div>
                )}
                <Button
                  type="button"
                  size="sm"
                  className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => handleAddProduct(product)}
                >
                  <Plus className="h-4 w-4 mr-1" /> Add
                </Button>
              </div>
              <CardContent className="p-3">
                <h3 className="font-medium text-sm line-clamp-1">{product.name}</h3>
                <p className="text-primary font-semibold text-sm mt-1">{formatPrice(price)}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
