'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { RefreshCw, Share2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCart, AddToCartPayload } from '@/contexts/CartContext';
import { CancellationSection } from './CancellationSection';
import type { Order, ItemIssue } from './types';

interface OrderActionsProps {
  order: Order;
  itemIssues: Record<string, ItemIssue>;
  onOrderUpdated: (order: Order) => void;
}

export function OrderActions({ order, itemIssues, onOrderUpdated }: OrderActionsProps) {
  const { addItem, openCart } = useCart();
  const [copied, setCopied] = useState(false);

  const handleReorder = useCallback(() => {
    if (!order?.items?.length) return;

    for (const item of order.items) {
      if (!item.product) continue;

      const payload: AddToCartPayload = {
        productId: item.product.id,
        productName: item.product.name,
        productSlug: item.product.slug || item.product.id,
        productImage: item.product.images?.[0]?.imageUrl || '',
        variantId: item.variant?.id,
        variantName: item.variant?.name,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        customization: item.customization as AddToCartPayload['customization'],
      };

      addItem(payload);
    }

    openCart();
  }, [order, addItem, openCart]);

  const handleCopyShareLink = useCallback(async () => {
    if (!order?.shareToken) return;

    const shareUrl = `${window.location.origin}/track/order/${order.shareToken}`;

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for browsers that don't support clipboard API
      const textArea = document.createElement('textarea');
      textArea.value = shareUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [order?.shareToken]);

  const canRequestCancellation =
    ['pending', 'payment_confirmed', 'confirmed'].includes(order.status) &&
    !order.cancellationRequest;

  return (
    <div className="flex flex-col sm:flex-row gap-4 justify-center flex-wrap">
      <Link href="/orders">
        <Button variant="outline" className="w-full sm:w-auto">
          Back to Orders
        </Button>
      </Link>

      {order.items && order.items.length > 0 && (
        <Button
          variant="outline"
          className="w-full sm:w-auto border-primary/50 text-primary hover:text-primary"
          onClick={handleReorder}
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Reorder
        </Button>
      )}

      {order.trackingNumber && (
        <Link href={`/track?number=${order.trackingNumber}`}>
          <Button variant="outline" className="w-full sm:w-auto">
            Track Shipment
          </Button>
        </Link>
      )}

      {order.shareToken && (
        <Button
          variant="outline"
          className="w-full sm:w-auto border-cyan-500/50 text-cyan-500 hover:text-cyan-600"
          onClick={handleCopyShareLink}
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 mr-2" />
              Link Copied!
            </>
          ) : (
            <>
              <Share2 className="w-4 h-4 mr-2" />
              Share Order
            </>
          )}
        </Button>
      )}

      {Object.keys(itemIssues).length > 0 && (
        <Link href="/account/issues">
          <Button
            variant="outline"
            className="w-full sm:w-auto border-orange-500/50 text-orange-500 hover:text-orange-600"
          >
            View All Issues
          </Button>
        </Link>
      )}

      {canRequestCancellation && (
        <CancellationSection order={order} onOrderUpdated={onOrderUpdated} />
      )}

      <Link href="/products">
        <Button variant="outline" className="w-full sm:w-auto">
          Continue Shopping
        </Button>
      </Link>

      <Link href="/design/new">
        <Button className="btn-gradient w-full sm:w-auto">Create Another Design</Button>
      </Link>
    </div>
  );
}
