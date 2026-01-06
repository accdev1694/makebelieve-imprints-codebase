'use client';

import Image from 'next/image';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Order, OrderItem } from '@/lib/api/orders';
import { MATERIAL_LABELS, PRINT_SIZE_LABELS } from '@/lib/api/designs';

interface AdminOrderItemsProps {
  order: Order;
}

export function AdminOrderItems({ order }: AdminOrderItemsProps) {
  return (
    <Card className="card-glow">
      <CardHeader>
        <CardTitle>Order Details</CardTitle>
        <CardDescription>
          Placed on{' '}
          {new Date(order.createdAt).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Design-based order (single design with print options) */}
        {order.design && (
          <div className="flex gap-4 items-start">
            <div className="w-32 h-32 bg-card/30 rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0 relative">
              <Image
                src={order.previewUrl || order.design.previewUrl || order.design.imageUrl}
                alt={order.design.name}
                fill
                className="object-contain"
              />
            </div>
            <div className="flex-1 space-y-2">
              <h3 className="font-semibold text-lg">{order.design.name}</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {order.material && (
                  <div>
                    <p className="text-muted-foreground">Material:</p>
                    <p className="font-medium">{MATERIAL_LABELS[order.material] || order.material}</p>
                  </div>
                )}
                {order.printSize && (
                  <div>
                    <p className="text-muted-foreground">Size:</p>
                    <p className="font-medium">{PRINT_SIZE_LABELS[order.printSize] || order.printSize}</p>
                  </div>
                )}
                {order.printWidth && order.printHeight && (
                  <div>
                    <p className="text-muted-foreground">Dimensions:</p>
                    <p className="font-medium">
                      {order.printWidth} &times; {order.printHeight} cm
                    </p>
                  </div>
                )}
                {order.orientation && (
                  <div>
                    <p className="text-muted-foreground">Orientation:</p>
                    <p className="font-medium capitalize">{order.orientation}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Cart-based order items (multiple products) */}
        {order.items && order.items.length > 0 && (
          <div className="space-y-4">
            {order.items.map((item: OrderItem) => (
              <div key={item.id} className="flex gap-4 items-start">
                <div className="w-20 h-20 bg-card/30 rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0 relative">
                  {item.product?.images?.[0]?.imageUrl ? (
                    <Image
                      src={item.product.images[0].imageUrl}
                      alt={item.product?.name || 'Product'}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="text-muted-foreground text-xs">No image</div>
                  )}
                </div>
                <div className="flex-1">
                  <h4 className="font-medium">{item.product?.name || 'Product'}</h4>
                  {item.variant?.name && (
                    <p className="text-sm text-muted-foreground">{item.variant.name}</p>
                  )}
                  <div className="flex justify-between mt-1">
                    <span className="text-sm text-muted-foreground">Qty: {item.quantity}</span>
                    <span className="font-medium">&pound;{Number(item.totalPrice).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <Separator />

        {/* Order totals */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal:</span>
            <span>&pound;{Number(order.totalPrice).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Shipping:</span>
            <span className="text-green-500">FREE</span>
          </div>
          <Separator />
          <div className="flex justify-between text-lg font-bold">
            <span>Total:</span>
            <span className="text-primary">&pound;{Number(order.totalPrice).toFixed(2)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
