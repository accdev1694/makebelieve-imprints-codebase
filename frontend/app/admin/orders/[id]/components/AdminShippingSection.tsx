'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Order } from '@/lib/api/orders';

interface AdminShippingSectionProps {
  order: Order;
}

export function AdminShippingSection({ order }: AdminShippingSectionProps) {
  return (
    <Card className="card-glow">
      <CardHeader>
        <CardTitle>Shipping Information</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="bg-muted/30 p-4 rounded-lg space-y-1 text-sm">
          <p className="font-medium text-foreground text-base">
            {order.shippingAddress.name}
          </p>
          <p className="text-muted-foreground">{order.shippingAddress.addressLine1}</p>
          {order.shippingAddress.addressLine2 && (
            <p className="text-muted-foreground">{order.shippingAddress.addressLine2}</p>
          )}
          <p className="text-muted-foreground">
            {order.shippingAddress.city}, {order.shippingAddress.postcode}
          </p>
          <p className="text-muted-foreground">{order.shippingAddress.country}</p>
        </div>

        {order.trackingNumber && (
          <div className="mt-4">
            <p className="text-sm text-muted-foreground mb-2">Tracking Number:</p>
            <p className="font-mono text-sm bg-muted/30 p-3 rounded-lg">
              {order.trackingNumber}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
