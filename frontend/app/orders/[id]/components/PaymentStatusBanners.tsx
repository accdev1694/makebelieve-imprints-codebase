'use client';

import Link from 'next/link';
import { CheckCircle, XCircle, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { Order } from './types';

interface PaymentStatusBannersProps {
  order: Order;
  paymentStatus: string | null;
  paymentProcessed: boolean;
  retryingPayment: boolean;
  onRetryPayment: () => void;
}

export function PaymentStatusBanners({
  order,
  paymentStatus,
  paymentProcessed,
  retryingPayment,
  onRetryPayment,
}: PaymentStatusBannersProps) {
  // Payment Success Banner
  if (paymentStatus === 'success' && paymentProcessed) {
    return (
      <Card className="mb-6 border-green-500/50 bg-green-500/5">
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-green-500/10">
              <CheckCircle className="h-6 w-6 text-green-500" />
            </div>
            <div>
              <h3 className="font-semibold text-green-600">Payment Successful!</h3>
              <p className="text-sm text-muted-foreground">
                Thank you for your order. We&apos;ll start processing it right away.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Payment Cancelled/Failed Banner
  if (paymentStatus === 'cancelled' && order.status === 'pending') {
    return (
      <Card className="mb-6 border-amber-500/50 bg-amber-500/5">
        <CardContent className="py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-amber-500/10">
                <XCircle className="h-6 w-6 text-amber-500" />
              </div>
              <div>
                <h3 className="font-semibold text-amber-600">Payment Not Completed</h3>
                <p className="text-sm text-muted-foreground">
                  Your order is saved but payment was not completed. You can retry payment or
                  continue shopping.
                </p>
              </div>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <Button
                onClick={onRetryPayment}
                disabled={retryingPayment}
                className="bg-amber-500 hover:bg-amber-600"
              >
                {retryingPayment ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4 mr-2" />
                    Retry Payment
                  </>
                )}
              </Button>
              <Link href="/cart">
                <Button variant="outline">Back to Cart</Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Pending Payment Banner (for orders without payment param)
  if (!paymentStatus && order.status === 'pending') {
    return (
      <Card className="mb-6 border-blue-500/50 bg-blue-500/5">
        <CardContent className="py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-blue-500/10">
                <CreditCard className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <h3 className="font-semibold text-blue-600">Payment Required</h3>
                <p className="text-sm text-muted-foreground">
                  This order is awaiting payment. Complete the payment to confirm your order.
                </p>
              </div>
            </div>
            <Button onClick={onRetryPayment} disabled={retryingPayment} className="flex-shrink-0">
              {retryingPayment ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                  Processing...
                </>
              ) : (
                <>
                  <CreditCard className="h-4 w-4 mr-2" />
                  Complete Payment
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
}
