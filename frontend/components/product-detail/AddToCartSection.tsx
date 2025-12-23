'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Minus, Plus, ShoppingCart, Heart } from 'lucide-react';
import Link from 'next/link';

interface AddToCartSectionProps {
  productId: string;
  productName: string;
  price: number;
  isCustomizable?: boolean;
  onAddToCart?: (quantity: number) => void;
}

export function AddToCartSection({
  productId,
  productName,
  price,
  isCustomizable,
  onAddToCart,
}: AddToCartSectionProps) {
  const [quantity, setQuantity] = useState(1);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);

  // Ensure price is a number
  const numericPrice = typeof price === 'string' ? parseFloat(price) : price;

  const handleQuantityChange = (delta: number) => {
    setQuantity((prev) => Math.max(1, Math.min(99, prev + delta)));
  };

  const handleAddToCart = async () => {
    setIsAddingToCart(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 500));
    onAddToCart?.(quantity);
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
            <span className="text-lg font-semibold">${numericPrice.toFixed(2)}</span>
          </div>
          <div className="flex items-baseline justify-between border-t border-border pt-2">
            <span className="text-base font-semibold">Total:</span>
            <span className="text-2xl font-bold text-primary">${totalPrice.toFixed(2)}</span>
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
            disabled={isAddingToCart}
          >
            <ShoppingCart className="h-5 w-5" />
            {isAddingToCart ? 'Adding...' : 'Add to Cart'}
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
            <span className="font-medium">Warehouse</span>
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
