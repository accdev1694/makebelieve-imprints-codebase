'use client';

import Image from 'next/image';
import Link from 'next/link';
import { AlertCircle, Lock, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { MATERIAL_LABELS, PRINT_SIZE_LABELS } from '@/lib/api/designs';
import type { Order, OrderItem, ItemIssue, OrderItemWithIssue } from './types';
import { getIssueStatusColor, ISSUE_STATUS_LABELS } from './types';

interface OrderItemsSectionProps {
  order: Order;
  itemIssues: Record<string, ItemIssue>;
  canReportIssue: boolean;
  onOpenIssueModal: (item: OrderItemWithIssue) => void;
}

export function OrderItemsSection({
  order,
  itemIssues,
  canReportIssue,
  onOpenIssueModal,
}: OrderItemsSectionProps) {
  const getItemIssue = (itemId: string): ItemIssue | null => {
    return itemIssues[itemId] || null;
  };

  return (
    <Card className="card-glow mb-6">
      <CardHeader>
        <CardTitle>Order Items</CardTitle>
        {canReportIssue && (
          <CardDescription>
            Having an issue? Click &quot;Report Issue&quot; on any item below.
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Legacy design-based order */}
        {order.design && !order.items?.length && (
          <div className="flex gap-4 items-start p-4 bg-card/30 rounded-lg">
            <div className="w-24 h-24 bg-card/30 rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0 relative">
              <Image
                src={order.previewUrl || order.design.previewUrl || order.design.imageUrl}
                alt={order.design.name}
                fill
                sizes="96px"
                className="object-contain"
                unoptimized
              />
            </div>
            <div className="flex-1 space-y-2">
              <h3 className="font-semibold">{order.design.name}</h3>
              <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                {order.material && (
                  <span>{MATERIAL_LABELS[order.material] || order.material}</span>
                )}
                {order.printSize && (
                  <span>&bull; {PRINT_SIZE_LABELS[order.printSize] || order.printSize}</span>
                )}
              </div>
              <p className="font-medium">&pound;{Number(order.totalPrice).toFixed(2)}</p>
            </div>
          </div>
        )}

        {/* Cart-based order items */}
        {order.items && order.items.length > 0 && (
          <div className="space-y-4">
            {order.items.map((item: OrderItem) => {
              const itemIssue = getItemIssue(item.id);
              const hasIssue = !!itemIssue;

              return (
                <div key={item.id} className="p-4 bg-card/30 rounded-lg">
                  <div className="flex gap-4 items-start">
                    <div className="w-20 h-20 bg-card/30 rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0 relative">
                      {item.product?.images?.[0]?.imageUrl ? (
                        <Image
                          src={item.product.images[0].imageUrl}
                          alt={item.product?.name || 'Product'}
                          fill
                          sizes="80px"
                          className="object-cover"
                          unoptimized
                        />
                      ) : (
                        <div className="text-muted-foreground text-xs">No image</div>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-medium">{item.product?.name || 'Product'}</h4>
                          {item.variant?.name && (
                            <p className="text-sm text-muted-foreground">{item.variant.name}</p>
                          )}
                        </div>
                        {/* Issue Status Badge */}
                        {hasIssue && (
                          <div className="flex items-center gap-1">
                            <Badge
                              className={`${getIssueStatusColor(itemIssue.status)} border text-xs`}
                            >
                              <AlertCircle className="w-3 h-3 mr-1" />
                              {ISSUE_STATUS_LABELS[itemIssue.status] || itemIssue.status}
                            </Badge>
                            {itemIssue.isConcluded && (
                              <Badge className="bg-muted text-muted-foreground border-border border text-xs">
                                <Lock className="w-3 h-3" />
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex justify-between mt-2">
                        <span className="text-sm text-muted-foreground">Qty: {item.quantity}</span>
                        <span className="font-medium">
                          &pound;{Number(item.totalPrice).toFixed(2)}
                        </span>
                      </div>

                      {/* Per-Item Issue Actions */}
                      {canReportIssue && (
                        <div className="mt-3 pt-3 border-t border-border/50">
                          {hasIssue ? (
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-muted-foreground">
                                Issue reported{' '}
                                {new Date(itemIssue.createdAt).toLocaleDateString('en-GB', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric',
                                })}
                              </span>
                              <Link href={`/account/issues/${itemIssue.id}`}>
                                <Button size="sm" variant="outline" className="text-xs">
                                  <MessageSquare className="w-3 h-3 mr-1" />
                                  View Issue
                                  {itemIssue.unreadCount && itemIssue.unreadCount > 0 && (
                                    <span className="ml-1 bg-red-500 text-white text-xs rounded-full px-1.5">
                                      {itemIssue.unreadCount}
                                    </span>
                                  )}
                                </Button>
                              </Link>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs border-orange-500/50 text-orange-500 hover:text-orange-600"
                              onClick={() => onOpenIssueModal(item)}
                            >
                              <AlertCircle className="w-3 h-3 mr-1" />
                              Report Issue
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <Separator />

        {/* Shipping Address */}
        {order.shippingAddress && (
          <div>
            <h4 className="font-semibold mb-3">Shipping Address</h4>
            <div className="text-sm text-muted-foreground space-y-1 bg-muted/30 p-4 rounded-lg">
              <p className="font-medium text-foreground">{order.shippingAddress.name}</p>
              <p>{order.shippingAddress.addressLine1}</p>
              {order.shippingAddress.addressLine2 && <p>{order.shippingAddress.addressLine2}</p>}
              <p>
                {order.shippingAddress.city}, {order.shippingAddress.postcode}
              </p>
              <p>{order.shippingAddress.country}</p>
            </div>
          </div>
        )}

        <Separator />

        {/* Order Total */}
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
