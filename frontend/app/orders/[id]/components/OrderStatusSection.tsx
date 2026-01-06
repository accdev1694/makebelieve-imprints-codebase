'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { Order } from './types';

interface OrderStatusSectionProps {
  order: Order;
}

export function OrderStatusSection({ order }: OrderStatusSectionProps) {
  const statusSteps = [
    { key: 'placed', label: 'Order Placed', desc: 'Your order has been received', check: true },
    {
      key: 'payment',
      label: 'Payment Received',
      desc: 'Payment successfully processed',
      check: ['payment_confirmed', 'confirmed', 'printing', 'shipped', 'delivered'].includes(order.status),
    },
    {
      key: 'confirmed',
      label: 'Order Confirmed',
      desc: 'Your order has been confirmed by our team',
      check: ['confirmed', 'printing', 'shipped', 'delivered'].includes(order.status),
    },
    {
      key: 'printing',
      label: 'Printing',
      desc: 'Your design is being printed',
      check: ['printing', 'shipped', 'delivered'].includes(order.status),
    },
    {
      key: 'shipped',
      label: 'Shipped',
      desc: 'Your order is on its way',
      check: ['shipped', 'delivered'].includes(order.status),
      tracking: order.trackingNumber,
    },
    {
      key: 'delivered',
      label: 'Delivered',
      desc: 'Order successfully delivered',
      check: order.status === 'delivered',
      isLast: true,
    },
  ];

  return (
    <Card className="card-glow mb-6">
      <CardHeader>
        <CardTitle>Order Status</CardTitle>
        <CardDescription>Track your order progress</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border"></div>
            <div className="space-y-6">
              {statusSteps.map((step) => (
                <div key={step.key} className="flex gap-4 relative">
                  <div
                    className={`w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 ${
                      step.check
                        ? step.isLast
                          ? 'bg-green-500 text-white'
                          : 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {step.check ? '\u2713' : '\u25CB'}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{step.label}</p>
                    <p className="text-sm text-muted-foreground">{step.desc}</p>
                    {step.tracking && (
                      <div className="mt-2">
                        <p className="text-xs text-muted-foreground">Tracking Number:</p>
                        <p className="font-mono text-sm mb-2">{step.tracking}</p>
                        <Link href={`/track?number=${step.tracking}`}>
                          <Button size="sm" variant="outline" className="text-xs">
                            Track Shipment &rarr;
                          </Button>
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
