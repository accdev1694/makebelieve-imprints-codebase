'use client';

import { useCart } from '@/contexts/CartContext';
import { formatPrice } from '@/lib/api/products';
import { Separator } from '@/components/ui/separator';

interface CartSummaryProps {
  showDetails?: boolean;
}

export function CartSummary({ showDetails = true }: CartSummaryProps) {
  const { subtotal, tax, total, itemCount } = useCart();

  return (
    <div className="space-y-3">
      {showDetails && (
        <>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal ({itemCount} items)</span>
            <span className="font-medium">{formatPrice(subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">VAT (20%)</span>
            <span className="font-medium">{formatPrice(tax)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Shipping</span>
            <span className="text-muted-foreground">Calculated at checkout</span>
          </div>
          <Separator />
        </>
      )}
      <div className="flex justify-between">
        <span className="font-semibold">Total</span>
        <span className="font-bold text-lg">{formatPrice(total)}</span>
      </div>
      {showDetails && (
        <p className="text-xs text-muted-foreground text-center">
          Includes {formatPrice(tax)} VAT
        </p>
      )}
    </div>
  );
}
