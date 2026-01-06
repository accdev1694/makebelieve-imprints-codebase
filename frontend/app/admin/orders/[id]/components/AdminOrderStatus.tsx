'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Order,
  OrderStatus,
  ORDER_STATUS_LABELS,
  CANCELLATION_REASON_LABELS,
} from '@/lib/api/orders';
import { getStatusColor } from './types';

interface AdminOrderStatusProps {
  order: Order;
  updating: boolean;
  processingCancellation: boolean;
  onUpdateStatus: (status: OrderStatus) => void;
  onOpenCancelModal: () => void;
  onOpenReviewModal: (action: 'APPROVE' | 'REJECT') => void;
}

export function AdminOrderStatus({
  order,
  updating,
  processingCancellation,
  onUpdateStatus,
  onOpenCancelModal,
  onOpenReviewModal,
}: AdminOrderStatusProps) {
  return (
    <Card className="card-glow">
      <CardHeader>
        <CardTitle>Order Status</CardTitle>
        <CardDescription>Update order progress</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center">
          <Badge className={`${getStatusColor(order.status)} border px-4 py-2 text-base`}>
            {ORDER_STATUS_LABELS[order.status]}
          </Badge>
        </div>

        <Separator />

        <div className="space-y-2">
          <p className="text-sm font-medium mb-3">Update Status:</p>

          {(order.status === 'pending' || order.status === 'confirmed') && (
            <Button
              className="w-full"
              onClick={() => onUpdateStatus('payment_confirmed')}
              disabled={updating}
            >
              Confirm Payment
            </Button>
          )}

          {order.status === 'payment_confirmed' && (
            <Button
              className="w-full"
              onClick={() => onUpdateStatus('printing')}
              disabled={updating}
            >
              Start Printing
            </Button>
          )}

          {order.status === 'printing' && (
            <Button
              className="w-full"
              onClick={() => onUpdateStatus('shipped')}
              disabled={updating}
            >
              Mark as Shipped
            </Button>
          )}

          {order.status === 'shipped' && (
            <Button
              className="w-full"
              onClick={() => onUpdateStatus('delivered')}
              disabled={updating}
            >
              Mark as Delivered
            </Button>
          )}

          {/* Cancellation Request Pending - Admin Review */}
          {order.status === 'cancellation_requested' && (
            <div className="space-y-3">
              <Separator />
              <div className="bg-amber-500/10 border border-amber-500/50 rounded-lg p-3">
                <p className="text-sm font-medium text-amber-500 mb-2">
                  Customer Requested Cancellation
                </p>
                {order.cancellationRequest && (
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>
                      <span className="font-medium">Reason:</span>{' '}
                      {CANCELLATION_REASON_LABELS[order.cancellationRequest.reason]}
                    </p>
                    {order.cancellationRequest.notes && (
                      <p>
                        <span className="font-medium">Notes:</span>{' '}
                        {order.cancellationRequest.notes}
                      </p>
                    )}
                    <p>
                      <span className="font-medium">Requested:</span>{' '}
                      {new Date(order.cancellationRequest.createdAt).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  onClick={() => onOpenReviewModal('APPROVE')}
                  disabled={processingCancellation}
                >
                  Approve
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => onOpenReviewModal('REJECT')}
                  disabled={processingCancellation}
                >
                  Reject
                </Button>
              </div>
            </div>
          )}

          {order.status !== 'cancelled' &&
            order.status !== 'refunded' &&
            order.status !== 'delivered' &&
            order.status !== 'shipped' &&
            order.status !== 'cancellation_requested' && (
              <>
                <Separator />
                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={onOpenCancelModal}
                  disabled={updating}
                >
                  Cancel Order
                </Button>
              </>
            )}

          {(order.status === 'delivered' || order.status === 'cancelled' || order.status === 'refunded') && (
            <p className="text-sm text-muted-foreground text-center py-4">
              This order is {order.status}. No further actions available.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
