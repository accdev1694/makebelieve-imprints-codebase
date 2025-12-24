'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CartItem as CartItemType, useCart } from '@/contexts/CartContext';
import { formatPrice } from '@/lib/api/products';

interface CartItemProps {
  item: CartItemType;
  compact?: boolean;
}

export function CartItem({ item, compact = false }: CartItemProps) {
  const { removeItem, updateQuantity } = useCart();

  const handleIncrement = () => {
    updateQuantity(item.id, item.quantity + 1);
  };

  const handleDecrement = () => {
    if (item.quantity > 1) {
      updateQuantity(item.id, item.quantity - 1);
    }
  };

  const handleRemove = () => {
    removeItem(item.id);
  };

  const itemTotal = item.unitPrice * item.quantity;

  // Build variant description
  const variantParts: string[] = [];
  if (item.size) variantParts.push(item.size);
  if (item.color) variantParts.push(item.color);
  if (item.material) variantParts.push(item.material);
  if (item.finish) variantParts.push(item.finish);
  const variantDescription = variantParts.join(' / ');

  if (compact) {
    return (
      <div className="flex gap-3 py-3 border-b border-gray-100 last:border-0">
        {/* Product Image */}
        <div className="relative w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
          <Image
            src={item.productImage || '/placeholder-product.png'}
            alt={item.productName}
            fill
            className="object-cover"
            sizes="64px"
          />
        </div>

        {/* Product Details */}
        <div className="flex-1 min-w-0">
          <Link
            href={`/product/${item.productSlug || item.productId}`}
            className="font-medium text-sm text-gray-900 hover:text-primary line-clamp-1"
          >
            {item.productName}
          </Link>
          {variantDescription && (
            <p className="text-xs text-gray-500 mt-0.5">{variantDescription}</p>
          )}
          {item.customization && (
            <p className="text-xs text-primary mt-0.5">
              {item.customization.type === 'TEMPLATE_BASED' && 'Template: '}
              {item.customization.type === 'UPLOAD_OWN' && 'Custom Design'}
              {item.customization.templateName}
            </p>
          )}

          {/* Quantity and Price */}
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-6 w-6"
                onClick={handleDecrement}
                disabled={item.quantity <= 1}
              >
                <Minus className="h-3 w-3" />
              </Button>
              <span className="w-8 text-center text-sm">{item.quantity}</span>
              <Button
                variant="outline"
                size="icon"
                className="h-6 w-6"
                onClick={handleIncrement}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm">{formatPrice(itemTotal)}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-gray-400 hover:text-red-500"
                onClick={handleRemove}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Full-size cart item (for cart page)
  return (
    <div className="flex gap-4 py-4 border-b border-gray-200 last:border-0">
      {/* Product Image */}
      <div className="relative w-24 h-24 sm:w-32 sm:h-32 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
        <Image
          src={item.productImage || '/placeholder-product.png'}
          alt={item.productName}
          fill
          className="object-cover"
          sizes="(max-width: 640px) 96px, 128px"
        />
      </div>

      {/* Product Details */}
      <div className="flex-1 min-w-0">
        <div className="flex justify-between">
          <div>
            <Link
              href={`/product/${item.productSlug || item.productId}`}
              className="font-medium text-gray-900 hover:text-primary line-clamp-2"
            >
              {item.productName}
            </Link>
            {variantDescription && (
              <p className="text-sm text-gray-500 mt-1">{variantDescription}</p>
            )}
            {item.customization && (
              <p className="text-sm text-primary mt-1">
                {item.customization.type === 'TEMPLATE_BASED' && `Template: ${item.customization.templateName}`}
                {item.customization.type === 'UPLOAD_OWN' && 'Custom Design'}
                {item.customization.type === 'FULLY_CUSTOM' && 'Fully Custom'}
              </p>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-gray-400 hover:text-red-500 flex-shrink-0"
            onClick={handleRemove}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        {/* Price and Quantity */}
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={handleDecrement}
              disabled={item.quantity <= 1}
            >
              <Minus className="h-4 w-4" />
            </Button>
            <span className="w-12 text-center font-medium">{item.quantity}</span>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={handleIncrement}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="text-right">
            <p className="text-lg font-semibold">{formatPrice(itemTotal)}</p>
            {item.quantity > 1 && (
              <p className="text-sm text-gray-500">{formatPrice(item.unitPrice)} each</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
