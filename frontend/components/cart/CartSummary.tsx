'use client';

import { useCart } from '@/contexts/CartContext';
import { formatPrice } from '@/lib/api/products';
import { Separator } from '@/components/ui/separator';

interface CartSummaryProps {
  showDetails?: boolean;
  useSelectedItems?: boolean;
}

export function CartSummary({ showDetails = true, useSelectedItems = true }: CartSummaryProps) {
  const {
    subtotal,
    tax,
    total,
    itemCount,
    selectedSubtotal,
    selectedTax,
    selectedTotal,
    selectedCount,
  } = useCart();

  // Use selected items totals when useSelectedItems is true, otherwise use full cart
  const displaySubtotal = useSelectedItems ? selectedSubtotal : subtotal;
  const displayTax = useSelectedItems ? selectedTax : tax;
  const displayTotal = useSelectedItems ? selectedTotal : total;
  const displayCount = useSelectedItems ? selectedCount : itemCount;

  return (
    <div className="space-y-3">
      {showDetails && (
        <>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              Subtotal ({displayCount} {displayCount === 1 ? 'item' : 'items'})
            </span>
            <span className="font-medium">{formatPrice(displaySubtotal)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">VAT (20%)</span>
            <span className="font-medium">{formatPrice(displayTax)}</span>
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
        <span className="font-bold text-lg">{formatPrice(displayTotal)}</span>
      </div>
      {showDetails && (
        <p className="text-xs text-muted-foreground text-center">
          Includes {formatPrice(displayTax)} VAT
        </p>
      )}
    </div>
  );
}
