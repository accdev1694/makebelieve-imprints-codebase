'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Minus, Plus, ShoppingCart, Heart } from 'lucide-react';
import Link from 'next/link';
import { useCart, AddToCartPayload } from '@/contexts/CartContext';
import { formatPrice } from '@/lib/api/products';
import type { SelectedVariant } from '@/lib/types';

interface AddToCartSectionProps {
  productId: string;
  productName: string;
  productSlug: string;
  productImage: string;
  price: number;
  isCustomizable?: boolean;
  selectedVariant?: SelectedVariant;
  customization?: AddToCartPayload['customization'];
}

export function AddToCartSection({
  productId,
  productName,
  productSlug,
  productImage,
  price,
  isCustomizable,
  selectedVariant,
  customization,
}: AddToCartSectionProps) {
  const [quantity, setQuantity] = useState(1);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const { addItem, openCart } = useCart();

  // Ensure price is a number
  const numericPrice = typeof price === 'string' ? parseFloat(price) : price;

  const handleQuantityChange = (delta: number) => {
    setQuantity((prev) => Math.max(1, Math.min(99, prev + delta)));
  };

  const handleAddToCart = () => {
    setIsAddingToCart(true);

    // Add item to cart using context
    addItem({
      productId,
      productName,
      productSlug,
      productImage,
      variantId: selectedVariant?.id,
      variantName: selectedVariant?.name,
      size: selectedVariant?.size,
      color: selectedVariant?.color,
      material: selectedVariant?.material,
      finish: selectedVariant?.finish,
      quantity,
      unitPrice: numericPrice,
      customization,
    });

    // Open the cart drawer
    openCart();

    // Reset quantity after adding
    setQuantity(1);
    setIsAddingToCart(false);
  };

  const totalPrice = numericPrice * quantity;

  return (
    <Card className="p-6 card-glow sticky top-24">
      <div className="space-y-6">
        {/* Price Summary */}
        <div className="space-y-2">
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-muted-foreground">Unit Price:</span>
            <span className="text-lg font-semibold">{formatPrice(numericPrice)}</span>
          </div>
          <div className="flex items-baseline justify-between border-t border-border pt-2">
            <span className="text-base font-semibold">Total:</span>
            <span className="text-2xl font-bold text-primary">{formatPrice(totalPrice)}</span>
          </div>
        </div>

        {/* Quantity Selector */}
        <div>
          <label className="text-sm font-semibold mb-3 block">Quantity</label>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              onClick={() => handleQuantityChange(-1)}
              disabled={quantity <= 1}
              aria-label="Decrease quantity"
            >
              <Minus className="h-4 w-4" />
            </Button>
            <div className="flex-1 text-center">
              <input
                type="number"
                min="1"
                max="99"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, Math.min(99, parseInt(e.target.value) || 1)))}
                className="w-full text-center text-lg font-semibold bg-transparent border-none focus:outline-none"
              />
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => handleQuantityChange(1)}
              disabled={quantity >= 99}
              aria-label="Increase quantity"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Add to Cart Buttons */}
        <div className="space-y-3">
          <Button
            size="lg"
            className="w-full btn-gradient gap-2"
            onClick={handleAddToCart}
            loading={isAddingToCart}
          >
            <ShoppingCart className="h-5 w-5" />
            Add to Cart
          </Button>

          {isCustomizable && (
            <Link href={`/design/new?product=${productId}`}>
              <Button size="lg" variant="outline" className="w-full border-primary/50">
                Customize This Product
              </Button>
            </Link>
          )}

          <Button
            size="lg"
            variant="outline"
            className="w-full gap-2"
            onClick={() => setIsFavorited(!isFavorited)}
          >
            <Heart className={`h-5 w-5 ${isFavorited ? 'fill-red-500 text-red-500' : ''}`} />
            {isFavorited ? 'Saved to Favorites' : 'Add to Favorites'}
          </Button>
        </div>

        {/* Stock Info */}
        <div className="text-sm text-muted-foreground space-y-1 pt-4 border-t border-border">
          <div className="flex items-center justify-between">
            <span>Availability:</span>
            <span className="text-green-600 font-medium">In Stock</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Ships from:</span>
            <span className="font-medium">UK Warehouse</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Estimated delivery:</span>
            <span className="font-medium">2-3 business days</span>
          </div>
        </div>
      </div>
    </Card>
  );
}
