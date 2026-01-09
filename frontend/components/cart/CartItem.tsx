'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Minus, Plus, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { CartItem as CartItemType, useCart } from '@/contexts/CartContext';
import { formatPrice } from '@/lib/api/products';

interface CartItemProps {
  item: CartItemType;
  compact?: boolean;
  showCheckbox?: boolean;
  isSelected?: boolean;
  onSelectionChange?: (itemId: string, selected: boolean) => void;
}

export function CartItem({
  item,
  compact = false,
  showCheckbox = false,
  isSelected = false,
  onSelectionChange,
}: CartItemProps) {
  const { removeItem, updateQuantity, operatingItemIds } = useCart();
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const isOperating = operatingItemIds.has(item.id);

  const handleIncrement = () => {
    updateQuantity(item.id, item.quantity + 1);
  };

  const handleDecrement = () => {
    if (item.quantity === 1) {
      setShowRemoveDialog(true);
    } else {
      updateQuantity(item.id, item.quantity - 1);
    }
  };

  const handleRemove = () => {
    removeItem(item.id);
  };

  const handleConfirmRemove = () => {
    removeItem(item.id);
    setShowRemoveDialog(false);
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
      <>
        <div className="flex gap-3 py-3 border-b border-border last:border-0">
          {/* Selection Checkbox */}
          {showCheckbox && (
            <div className="flex items-center">
              <Checkbox
                checked={isSelected}
                onCheckedChange={(checked: boolean | 'indeterminate') =>
                  onSelectionChange?.(item.id, checked === true)
                }
                className="h-5 w-5"
              />
            </div>
          )}

          {/* Product Image */}
          <div className="relative w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-muted">
            <Image
              src={item.productImage || '/placeholder-product.svg'}
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
              className="font-medium text-sm text-foreground hover:text-primary line-clamp-1"
            >
              {item.productName}
            </Link>
            {variantDescription && (
              <p className="text-xs text-muted-foreground mt-0.5">{variantDescription}</p>
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
                  disabled={isOperating}
                >
                  {isOperating ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Minus className="h-3 w-3" />
                  )}
                </Button>
                <span className="w-8 text-center text-sm">{item.quantity}</span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-6 w-6"
                  onClick={handleIncrement}
                  disabled={isOperating}
                >
                  {isOperating ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Plus className="h-3 w-3" />
                  )}
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{formatPrice(itemTotal)}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground hover:text-destructive"
                  onClick={handleRemove}
                  disabled={isOperating}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Remove Confirmation Dialog */}
        <AlertDialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove from cart?</AlertDialogTitle>
              <AlertDialogDescription>
                This will remove &ldquo;{item.productName}&rdquo; from your cart.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmRemove}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Remove
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }

  // Full-size cart item (for cart page)
  return (
    <>
      <div className="flex flex-col gap-3 py-4 border-b border-border last:border-0">
        {/* Row 1: Checkbox + Image + Product Info */}
        <div className="flex items-start justify-between">
          {/* Selection Checkbox */}
          {showCheckbox && (
            <div className="flex items-start pt-1">
              <Checkbox
                checked={isSelected}
                onCheckedChange={(checked: boolean | 'indeterminate') =>
                  onSelectionChange?.(item.id, checked === true)
                }
                className="h-5 w-5"
              />
            </div>
          )}

          {/* Product Image */}
          <div className="relative w-20 h-20 sm:w-28 sm:h-28 xl:w-32 xl:h-32 2xl:w-36 2xl:h-36 flex-shrink-0 rounded-lg overflow-hidden bg-muted">
            <Image
              src={item.productImage || '/placeholder-product.svg'}
              alt={item.productName}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 80px, (max-width: 1280px) 112px, (max-width: 1536px) 128px, 144px"
            />
          </div>

          {/* Product Name + Delete */}
          <div className="min-w-0 flex flex-col gap-1 max-w-[50%]">
            <Link
              href={`/product/${item.productSlug || item.productId}`}
              className="font-medium text-foreground hover:text-primary line-clamp-2 text-base sm:text-lg"
            >
              {item.productName}
            </Link>
            {variantDescription && (
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">{variantDescription}</p>
            )}
            {item.customization && (
              <p className="text-xs sm:text-sm text-primary mt-0.5">
                {item.customization.type === 'TEMPLATE_BASED' && `Template: ${item.customization.templateName}`}
                {item.customization.type === 'UPLOAD_OWN' && 'Custom Design'}
                {item.customization.type === 'FULLY_CUSTOM' && 'Fully Custom'}
              </p>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-fit px-2 text-muted-foreground hover:text-destructive self-start"
              onClick={handleRemove}
              disabled={isOperating}
            >
              <Trash2 className="h-3 w-3 mr-1" />
              <span className="text-xs">Remove</span>
            </Button>
          </div>
        </div>

        {/* Row 2: Quantity + Price */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={handleDecrement}
              disabled={isOperating}
            >
              {isOperating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Minus className="h-4 w-4" />
              )}
            </Button>
            <span className="w-10 text-center font-medium">{item.quantity}</span>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={handleIncrement}
              disabled={isOperating}
            >
              {isOperating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
            </Button>
          </div>
          <div className="text-right">
            <p className="text-lg font-semibold">{formatPrice(itemTotal)}</p>
            {item.quantity > 1 && (
              <p className="text-sm text-muted-foreground">{formatPrice(item.unitPrice)} each</p>
            )}
          </div>
        </div>
      </div>

      {/* Remove Confirmation Dialog */}
      <AlertDialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove from cart?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove &ldquo;{item.productName}&rdquo; from your cart.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmRemove}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
