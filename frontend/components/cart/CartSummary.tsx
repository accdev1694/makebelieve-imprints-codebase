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
            <span className="text-gray-600">Subtotal ({itemCount} items)</span>
            <span className="font-medium">{formatPrice(subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">VAT (20%)</span>
            <span className="font-medium">{formatPrice(tax)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Shipping</span>
            <span className="text-gray-500">Calculated at checkout</span>
          </div>
          <Separator />
        </>
      )}
      <div className="flex justify-between">
        <span className="font-semibold">Total</span>
        <span className="font-bold text-lg">{formatPrice(total)}</span>
      </div>
      {showDetails && (
        <p className="text-xs text-gray-500 text-center">
          Includes {formatPrice(tax)} VAT
        </p>
      )}
    </div>
  );
}
