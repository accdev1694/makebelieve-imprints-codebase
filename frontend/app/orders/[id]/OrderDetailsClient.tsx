'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ordersService, Order, ORDER_STATUS_LABELS } from '@/lib/api/orders';
import apiClient from '@/lib/api/client';
import Link from 'next/link';
import { useCart } from '@/contexts/CartContext';
import { createLogger } from '@/lib/logger';

// Import extracted components
import {
  ItemIssue,
  OrderItemWithIssue,
  getStatusColor,
  getStatusIcon,
} from './components';
import { OrderStatusSection } from './components/OrderStatusSection';
import { OrderItemsSection } from './components/OrderItemsSection';
import { IssueReportModal } from './components/IssueReportModal';
import { ReviewSection } from './components/ReviewSection';
import { CancellationStatusCard } from './components/CancellationSection';
import { PaymentStatusBanners } from './components/PaymentStatusBanners';
import { OrderActions } from './components/OrderActions';

const logger = createLogger('OrderDetailsClient');

interface OrderDetailsClientProps {
  orderId: string;
}

function OrderDetailsContent({ orderId }: OrderDetailsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { removeItem, items } = useCart();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Payment status from URL parameter
  const paymentStatus = searchParams.get('payment');
  const [paymentProcessed, setPaymentProcessed] = useState(false);
  const [retryingPayment, setRetryingPayment] = useState(false);

  // Per-item issue state
  const [itemIssues, setItemIssues] = useState<Record<string, ItemIssue>>({});
  const [selectedItem, setSelectedItem] = useState<OrderItemWithIssue | null>(null);
  const [issueModalOpen, setIssueModalOpen] = useState(false);
  const [issueSubmittedFlag, setIssueSubmittedFlag] = useState(false);

  // Review state
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [hasReview, setHasReview] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  // Load order data
  useEffect(() => {
    const loadOrder = async () => {
      if (!orderId) {
        setError('No order ID provided');
        setLoading(false);
        return;
      }

      try {
        const orderData = await ordersService.get(orderId);
        setOrder(orderData);

        // Check if order has a review (for delivered orders)
        if (orderData.status === 'delivered') {
          try {
            const reviewResponse = await apiClient.get(`/reviews?orderId=${orderId}`);
            setHasReview(reviewResponse.data?.data?.reviews?.length > 0);
          } catch {
            // No review exists
          }
        }

        // Check URL param for auto-opening review form
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('review') === 'true' && orderData.status === 'delivered') {
          setShowReviewForm(true);
        }
      } catch (err: unknown) {
        const e = err as { error?: string; message?: string };
        setError(e?.error || e?.message || 'Failed to load order');
      } finally {
        setLoading(false);
      }
    };

    loadOrder();
  }, [orderId]);

  // Handle payment success: Clear only ordered items from cart when payment is confirmed
  useEffect(() => {
    if (paymentStatus === 'success' && order && !paymentProcessed) {
      const paidStatuses = ['payment_confirmed', 'confirmed', 'printing', 'shipped', 'delivered'];
      if (paidStatuses.includes(order.status)) {
        const pendingOrderId = sessionStorage.getItem('pendingOrderId');
        if (pendingOrderId === orderId) {
          const orderedItemIdsJson = sessionStorage.getItem('orderedItemIds');
          const orderedProductKeysJson = sessionStorage.getItem('orderedProductKeys');

          if (orderedItemIdsJson) {
            try {
              const orderedItemIds = JSON.parse(orderedItemIdsJson) as string[];
              orderedItemIds.forEach((itemId) => removeItem(itemId));
            } catch {
              logger.error('Failed to parse orderedItemIds, trying product keys fallback');
              if (orderedProductKeysJson) {
                try {
                  const productKeys = JSON.parse(orderedProductKeysJson) as string[];
                  productKeys.forEach((key) => {
                    const [productId, variantId] = key.split(':');
                    const matchingItem = items.find(
                      (item) =>
                        item.productId === productId &&
                        (item.variantId || 'no-variant') === variantId
                    );
                    if (matchingItem) {
                      removeItem(matchingItem.id);
                    }
                  });
                } catch {
                  logger.error('Failed to parse orderedProductKeys');
                }
              }
            }
          }
          sessionStorage.removeItem('pendingOrderId');
          sessionStorage.removeItem('orderedItemIds');
          sessionStorage.removeItem('orderedProductKeys');
        }
        setPaymentProcessed(true);
      }
    }
  }, [paymentStatus, order, orderId, paymentProcessed, removeItem, items]);

  // Retry payment for pending orders
  const handleRetryPayment = useCallback(async () => {
    if (!order || order.status !== 'pending') return;

    setRetryingPayment(true);
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: order.id }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create checkout session');
      }

      if (result.data?.url) {
        window.location.href = result.data.url;
      }
    } catch (err) {
      logger.error('Failed to retry payment', { error: err instanceof Error ? err.message : String(err) });
      setError('Failed to retry payment. Please try again.');
    } finally {
      setRetryingPayment(false);
    }
  }, [order]);

  // Fetch issues for all items in this order
  useEffect(() => {
    const loadIssues = async () => {
      if (!order?.items?.length) return;

      const issueMap: Record<string, ItemIssue> = {};

      for (const item of order.items) {
        try {
          const response = await apiClient.get<{ issue: ItemIssue }>(
            `/orders/${orderId}/items/${item.id}/issue`
          );
          if (response.data?.issue) {
            issueMap[item.id] = response.data.issue;
          }
        } catch {
          // Item has no issue, that's fine
        }
      }

      setItemIssues(issueMap);
    };

    loadIssues();
  }, [order, orderId, issueSubmittedFlag]);

  const canReportIssue = order && ['shipped', 'delivered'].includes(order.status);

  const openIssueModal = (item: OrderItemWithIssue) => {
    setSelectedItem(item);
    setIssueModalOpen(true);
  };

  const handleIssueSubmitted = () => {
    // Trigger re-fetch of issues
    setIssueSubmittedFlag((prev) => !prev);
  };

  const handleOrderUpdated = (updatedOrder: Order) => {
    setOrder(updatedOrder);
  };

  const handleReviewSubmitted = () => {
    setReviewSubmitted(true);
    setShowReviewForm(false);
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-md h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading order details...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !order) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">{error || 'Order not found'}</p>
            <Button onClick={() => router.push('/orders')}>Back to Orders</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/orders">
              <Button variant="ghost" size="sm">
                &larr; Back to Orders
              </Button>
            </Link>
            <h1 className="text-2xl font-bold">
              <span className="text-neon-gradient">Order Details</span>
            </h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Order Header */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">Order #{order.id.slice(0, 8).toUpperCase()}</h2>
            <p className="text-sm text-muted-foreground">
              Placed on{' '}
              {new Date(order.createdAt).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
          <Badge className={`${getStatusColor(order.status)} border px-4 py-2 text-base`}>
            {getStatusIcon(order.status)} {ORDER_STATUS_LABELS[order.status]}
          </Badge>
        </div>

        {/* Payment Status Banners */}
        <PaymentStatusBanners
          order={order}
          paymentStatus={paymentStatus}
          paymentProcessed={paymentProcessed}
          retryingPayment={retryingPayment}
          onRetryPayment={handleRetryPayment}
        />

        {/* Order Status Timeline */}
        <OrderStatusSection order={order} />

        {/* Review Section - Show for delivered orders */}
        {order.status === 'delivered' && (
          <ReviewSection
            orderId={orderId}
            hasReview={hasReview}
            reviewSubmitted={reviewSubmitted}
            showReviewForm={showReviewForm}
            onShowReviewForm={setShowReviewForm}
            onReviewSubmitted={handleReviewSubmitted}
          />
        )}

        {/* Order Items */}
        <OrderItemsSection
          order={order}
          itemIssues={itemIssues}
          canReportIssue={!!canReportIssue}
          onOpenIssueModal={openIssueModal}
        />

        {/* Cancellation Status Cards */}
        <CancellationStatusCard order={order} />

        {/* Action Buttons */}
        <OrderActions
          order={order}
          itemIssues={itemIssues}
          onOrderUpdated={handleOrderUpdated}
        />

        {/* Issue Report Modal */}
        <IssueReportModal
          open={issueModalOpen}
          onOpenChange={setIssueModalOpen}
          orderId={orderId}
          selectedItem={selectedItem}
          itemIssues={itemIssues}
          onIssueSubmitted={handleIssueSubmitted}
        />
      </main>
    </div>
  );
}

export default function OrderDetailsClient({ orderId }: OrderDetailsClientProps) {
  return (
    <ProtectedRoute>
      <OrderDetailsContent orderId={orderId} />
    </ProtectedRoute>
  );
}
