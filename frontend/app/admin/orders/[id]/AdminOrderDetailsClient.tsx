'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ordersService, Order, OrderItem, ORDER_STATUS_LABELS, OrderStatus } from '@/lib/api/orders';
import { MATERIAL_LABELS, PRINT_SIZE_LABELS } from '@/lib/api/designs';
import apiClient from '@/lib/api/client';
import Link from 'next/link';

// Resolution types
interface Resolution {
  id: string;
  orderId: string;
  type: 'REPRINT' | 'REFUND';
  reason: string;
  notes: string | null;
  imageUrls: string[] | null;
  reprintOrderId: string | null;
  refundAmount: number | null;
  stripeRefundId: string | null;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  createdAt: string;
  processedAt: string | null;
}

const RESOLUTION_REASONS = [
  { value: 'DAMAGED_IN_TRANSIT', label: 'Damaged in Transit' },
  { value: 'QUALITY_ISSUE', label: 'Quality Issue' },
  { value: 'WRONG_ITEM', label: 'Wrong Item Sent' },
  { value: 'PRINTING_ERROR', label: 'Printing Error' },
  { value: 'OTHER', label: 'Other' },
];

interface AdminOrderDetailsClientProps {
  orderId: string;
}

function AdminOrderDetailsContent({ orderId }: AdminOrderDetailsClientProps) {
  const router = useRouter();
  const { user } = useAuth();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [updating, setUpdating] = useState(false);

  // Resolution states
  const [resolutions, setResolutions] = useState<Resolution[]>([]);
  const [reprintModalOpen, setReprintModalOpen] = useState(false);
  const [refundModalOpen, setRefundModalOpen] = useState(false);
  const [selectedReason, setSelectedReason] = useState('');
  const [notes, setNotes] = useState('');
  const [processingResolution, setProcessingResolution] = useState(false);
  const [processIssueModalOpen, setProcessIssueModalOpen] = useState(false);
  const [selectedPendingIssue, setSelectedPendingIssue] = useState<Resolution | null>(null);
  const [processAction, setProcessAction] = useState<'REPRINT' | 'REFUND'>('REPRINT');

  useEffect(() => {
    if (user && user.userType !== 'PRINTER_ADMIN') {
      router.push('/dashboard');
    }
  }, [user, router]);

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
      } catch (err: any) {
        setError(err?.error || err?.message || 'Failed to load order');
      } finally {
        setLoading(false);
      }
    };

    loadOrder();
  }, [orderId]);

  // Load resolutions
  useEffect(() => {
    const loadResolutions = async () => {
      if (!orderId) return;
      try {
        const response = await apiClient.get<{ resolutions: Resolution[] }>(`/orders/${orderId}/resolutions`);
        setResolutions(response.data?.resolutions || []);
      } catch (err) {
        console.error('Failed to load resolutions:', err);
      }
    };
    loadResolutions();
  }, [orderId]);

  const handleReprint = async () => {
    if (!selectedReason) {
      setError('Please select a reason');
      return;
    }

    setProcessingResolution(true);
    setError('');

    try {
      const response = await apiClient.post<{ reprintOrderId: string }>(`/orders/${orderId}/reprint`, {
        reason: selectedReason,
        notes: notes || undefined,
      });

      setSuccess(`Reprint order created successfully. New order ID: ${response.data.reprintOrderId.slice(0, 8).toUpperCase()}`);
      setReprintModalOpen(false);
      setSelectedReason('');
      setNotes('');

      // Reload resolutions
      const resResponse = await apiClient.get<{ resolutions: Resolution[] }>(`/orders/${orderId}/resolutions`);
      setResolutions(resResponse.data?.resolutions || []);
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Failed to create reprint');
    } finally {
      setProcessingResolution(false);
    }
  };

  const handleRefund = async () => {
    if (!selectedReason) {
      setError('Please select a reason');
      return;
    }

    setProcessingResolution(true);
    setError('');

    try {
      const response = await apiClient.post<{ amount: number }>(`/orders/${orderId}/refund`, {
        reason: selectedReason,
        notes: notes || undefined,
      });

      setSuccess(`Refund issued successfully. Amount: £${response.data.amount?.toFixed(2)}`);
      setRefundModalOpen(false);
      setSelectedReason('');
      setNotes('');

      // Reload order to get updated status
      const orderData = await ordersService.get(orderId);
      setOrder(orderData);

      // Reload resolutions
      const resResponse = await apiClient.get<{ resolutions: Resolution[] }>(`/orders/${orderId}/resolutions`);
      setResolutions(resResponse.data?.resolutions || []);
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Failed to issue refund');
    } finally {
      setProcessingResolution(false);
    }
  };

  const handleUpdateStatus = async (newStatus: OrderStatus) => {
    if (!order) return;

    setUpdating(true);
    setError('');
    setSuccess('');

    try {
      await apiClient.put(`/orders/${order.id}/status`, { status: newStatus });
      setOrder({ ...order, status: newStatus });
      setSuccess(`Order status updated to ${ORDER_STATUS_LABELS[newStatus]}`);
    } catch (err: any) {
      setError(err?.error || err?.message || 'Failed to update order status');
    } finally {
      setUpdating(false);
    }
  };

  const handleProcessPendingIssue = async () => {
    if (!selectedPendingIssue) return;

    setProcessingResolution(true);
    setError('');

    try {
      const response = await apiClient.post(`/admin/resolutions/${selectedPendingIssue.id}/process`, {
        action: processAction,
        notes: notes || undefined,
      });

      if (processAction === 'REPRINT') {
        setSuccess(`Reprint order created successfully. New order ID: ${response.data.reprintOrderId.slice(0, 8).toUpperCase()}`);
      } else {
        setSuccess(`Refund processed successfully. Amount: £${response.data.amount?.toFixed(2)}`);
        // Reload order to get updated status
        const orderData = await ordersService.get(orderId);
        setOrder(orderData);
      }

      setProcessIssueModalOpen(false);
      setSelectedPendingIssue(null);
      setNotes('');

      // Reload resolutions
      const resResponse = await apiClient.get<{ resolutions: Resolution[] }>(`/orders/${orderId}/resolutions`);
      setResolutions(resResponse.data?.resolutions || []);
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Failed to process issue');
    } finally {
      setProcessingResolution(false);
    }
  };

  // Find pending customer issues
  const pendingIssues = resolutions.filter((r) => r.status === 'PENDING');

  const getStatusColor = (status: OrderStatus): string => {
    const colors: Record<OrderStatus, string> = {
      pending: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/50',
      confirmed: 'bg-blue-500/10 text-blue-500 border-blue-500/50',
      payment_confirmed: 'bg-blue-500/10 text-blue-500 border-blue-500/50',
      printing: 'bg-purple-500/10 text-purple-500 border-purple-500/50',
      shipped: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/50',
      delivered: 'bg-green-500/10 text-green-500 border-green-500/50',
      cancelled: 'bg-red-500/10 text-red-500 border-red-500/50',
      refunded: 'bg-orange-500/10 text-orange-500 border-orange-500/50',
    };
    return colors[status] || 'bg-gray-500/10 text-gray-500 border-gray-500/50';
  };

  const getResolutionStatusColor = (status: Resolution['status']): string => {
    const colors: Record<Resolution['status'], string> = {
      PENDING: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/50',
      PROCESSING: 'bg-blue-500/10 text-blue-500 border-blue-500/50',
      COMPLETED: 'bg-green-500/10 text-green-500 border-green-500/50',
      FAILED: 'bg-red-500/10 text-red-500 border-red-500/50',
    };
    return colors[status];
  };

  const getReasonLabel = (reason: string): string => {
    const found = RESOLUTION_REASONS.find((r) => r.value === reason);
    return found?.label || reason;
  };

  if (user && user.userType !== 'PRINTER_ADMIN') {
    return null;
  }

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

  if (error && !order) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => router.push('/admin/orders')}>Back to Orders</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!order) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin/orders">
              <Button variant="ghost" size="sm">
                ← Back to Orders
              </Button>
            </Link>
            <h1 className="text-2xl font-bold">
              <span className="text-neon-gradient">
                Order #{order.id.slice(0, 8).toUpperCase()}
              </span>
            </h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-5xl">
        {error && (
          <div className="bg-destructive/10 border border-destructive/50 text-destructive px-4 py-3 rounded-lg text-sm mb-6">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-500/10 border border-green-500/50 text-green-500 px-4 py-3 rounded-lg text-sm mb-6">
            {success}
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
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
                {order.design && (
                  <div className="flex gap-4 items-start">
                    <div className="w-32 h-32 bg-card/30 rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0">
                      <img
                        src={order.previewUrl || order.design.previewUrl || order.design.imageUrl}
                        alt={order.design.name}
                        className="max-w-full max-h-full object-contain"
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
                              {order.printWidth} × {order.printHeight} cm
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

                {/* Cart-based order items */}
                {order.items && order.items.length > 0 && (
                  <div className="space-y-4">
                    {order.items.map((item: OrderItem) => (
                      <div key={item.id} className="flex gap-4 items-start">
                        <div className="w-20 h-20 bg-card/30 rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0">
                          {item.product?.images?.[0]?.imageUrl ? (
                            <img
                              src={item.product.images[0].imageUrl}
                              alt={item.product?.name || 'Product'}
                              className="max-w-full max-h-full object-cover"
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
                            <span className="font-medium">£{Number(item.totalPrice).toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <Separator />

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal:</span>
                    <span>£{Number(order.totalPrice).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Shipping:</span>
                    <span className="text-green-500">FREE</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total:</span>
                    <span className="text-primary">£{Number(order.totalPrice).toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

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
          </div>

          <div className="space-y-6">
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
                      onClick={() => handleUpdateStatus('payment_confirmed')}
                      disabled={updating}
                    >
                      Confirm Payment
                    </Button>
                  )}

                  {order.status === 'payment_confirmed' && (
                    <Button
                      className="w-full"
                      onClick={() => handleUpdateStatus('printing')}
                      disabled={updating}
                    >
                      Start Printing
                    </Button>
                  )}

                  {order.status === 'printing' && (
                    <Button
                      className="w-full"
                      onClick={() => handleUpdateStatus('shipped')}
                      disabled={updating}
                    >
                      Mark as Shipped
                    </Button>
                  )}

                  {order.status === 'shipped' && (
                    <Button
                      className="w-full"
                      onClick={() => handleUpdateStatus('delivered')}
                      disabled={updating}
                    >
                      Mark as Delivered
                    </Button>
                  )}

                  {order.status !== 'cancelled' && order.status !== 'delivered' && (
                    <>
                      <Separator />
                      <Button
                        variant="destructive"
                        className="w-full"
                        onClick={() => handleUpdateStatus('cancelled')}
                        disabled={updating}
                      >
                        Cancel Order
                      </Button>
                    </>
                  )}

                  {(order.status === 'delivered' || order.status === 'cancelled') && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      This order is {order.status}. No further actions available.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="card-glow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Issue Resolution
                  {pendingIssues.length > 0 && (
                    <Badge className="bg-red-500 text-white">
                      {pendingIssues.length} Pending
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>Handle customer issues</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Pending Customer Issues */}
                {pendingIssues.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-yellow-500">Customer Reported Issues:</p>
                    {pendingIssues.map((issue) => (
                      <div
                        key={issue.id}
                        className="bg-yellow-500/10 border border-yellow-500/50 rounded-lg p-3 space-y-2"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-yellow-500">
                              {getReasonLabel(issue.reason)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Reported {new Date(issue.createdAt).toLocaleDateString('en-GB', {
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                          </div>
                          <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/50">
                            Awaiting Review
                          </Badge>
                        </div>
                        {issue.notes && (
                          <p className="text-sm text-muted-foreground italic">
                            &quot;{issue.notes}&quot;
                          </p>
                        )}
                        {/* Customer uploaded images */}
                        {issue.imageUrls && issue.imageUrls.length > 0 && (
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-muted-foreground">Customer Photos:</p>
                            <div className="flex flex-wrap gap-2">
                              {issue.imageUrls.map((url, imgIndex) => (
                                <a
                                  key={imgIndex}
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="block w-16 h-16 rounded-lg overflow-hidden border border-border hover:border-primary transition-colors"
                                >
                                  <img
                                    src={url}
                                    alt={`Issue photo ${imgIndex + 1}`}
                                    className="w-full h-full object-cover"
                                  />
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                        <div className="flex gap-2 pt-2">
                          <Button
                            size="sm"
                            className="flex-1 bg-purple-500 hover:bg-purple-600"
                            onClick={() => {
                              setSelectedPendingIssue(issue);
                              setProcessAction('REPRINT');
                              setNotes('');
                              setProcessIssueModalOpen(true);
                            }}
                          >
                            Approve Reprint
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 border-orange-500/50 text-orange-500 hover:text-orange-600"
                            onClick={() => {
                              setSelectedPendingIssue(issue);
                              setProcessAction('REFUND');
                              setNotes('');
                              setProcessIssueModalOpen(true);
                            }}
                            disabled={order.status === 'pending'}
                          >
                            Issue Refund
                          </Button>
                        </div>
                      </div>
                    ))}
                    <Separator />
                  </div>
                )}

                {/* Manual resolution options */}
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Or create a resolution manually:</p>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      setSelectedReason('');
                      setNotes('');
                      setReprintModalOpen(true);
                    }}
                    disabled={order.status === 'cancelled' || order.status === 'refunded'}
                  >
                    Create Reprint Order
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full text-orange-500 hover:text-orange-600 border-orange-500/50 hover:border-orange-600"
                    onClick={() => {
                      setSelectedReason('');
                      setNotes('');
                      setRefundModalOpen(true);
                    }}
                    disabled={order.status === 'cancelled' || order.status === 'refunded' || order.status === 'pending'}
                  >
                    Issue Refund
                  </Button>
                </div>
                {order.status === 'refunded' && (
                  <p className="text-sm text-muted-foreground text-center py-2">
                    This order has been refunded.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Resolution History */}
            {resolutions.length > 0 && (
              <Card className="card-glow">
                <CardHeader>
                  <CardTitle>Resolution History</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {resolutions.map((resolution) => (
                    <div
                      key={resolution.id}
                      className="bg-muted/30 p-3 rounded-lg space-y-2 text-sm"
                    >
                      <div className="flex justify-between items-start">
                        <Badge className={`${getResolutionStatusColor(resolution.status)} border`}>
                          {resolution.type}
                        </Badge>
                        <Badge variant="outline" className={getResolutionStatusColor(resolution.status)}>
                          {resolution.status}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground">
                        <span className="font-medium">Reason:</span> {getReasonLabel(resolution.reason)}
                      </p>
                      {resolution.notes && (
                        <p className="text-muted-foreground">
                          <span className="font-medium">Notes:</span> {resolution.notes}
                        </p>
                      )}
                      {resolution.reprintOrderId && (
                        <p className="text-muted-foreground">
                          <span className="font-medium">Reprint Order:</span>{' '}
                          <Link
                            href={`/admin/orders/${resolution.reprintOrderId}`}
                            className="text-primary hover:underline"
                          >
                            {resolution.reprintOrderId.slice(0, 8).toUpperCase()}
                          </Link>
                        </p>
                      )}
                      {resolution.refundAmount && (
                        <p className="text-muted-foreground">
                          <span className="font-medium">Refund:</span> £{Number(resolution.refundAmount).toFixed(2)}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground/70">
                        {new Date(resolution.createdAt).toLocaleString('en-GB')}
                      </p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Reprint Modal */}
        <Dialog open={reprintModalOpen} onOpenChange={setReprintModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Reprint Order</DialogTitle>
              <DialogDescription>
                Create a free replacement order for this customer. They will be notified via email.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="reprint-reason">Reason for Reprint</Label>
                <Select value={selectedReason} onValueChange={setSelectedReason}>
                  <SelectTrigger id="reprint-reason">
                    <SelectValue placeholder="Select reason..." />
                  </SelectTrigger>
                  <SelectContent>
                    {RESOLUTION_REASONS.map((reason) => (
                      <SelectItem key={reason.value} value={reason.value}>
                        {reason.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="reprint-notes">Notes (Optional)</Label>
                <Textarea
                  id="reprint-notes"
                  placeholder="Add any additional notes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setReprintModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleReprint} disabled={processingResolution || !selectedReason}>
                {processingResolution ? 'Creating...' : 'Create Reprint'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Refund Modal */}
        <Dialog open={refundModalOpen} onOpenChange={setRefundModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Issue Refund</DialogTitle>
              <DialogDescription>
                Issue a full refund to the customer. This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="bg-orange-500/10 border border-orange-500/50 text-orange-600 px-4 py-3 rounded-lg text-sm">
                <strong>Warning:</strong> Refunds are processed via Stripe and cannot be reversed.
                Consider offering a reprint first.
              </div>
              <div className="space-y-2">
                <Label htmlFor="refund-reason">Reason for Refund</Label>
                <Select value={selectedReason} onValueChange={setSelectedReason}>
                  <SelectTrigger id="refund-reason">
                    <SelectValue placeholder="Select reason..." />
                  </SelectTrigger>
                  <SelectContent>
                    {RESOLUTION_REASONS.map((reason) => (
                      <SelectItem key={reason.value} value={reason.value}>
                        {reason.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="refund-notes">Notes (Optional)</Label>
                <Textarea
                  id="refund-notes"
                  placeholder="Add any additional notes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
              <div className="bg-muted/30 p-3 rounded-lg">
                <p className="text-sm">
                  <span className="text-muted-foreground">Refund Amount:</span>{' '}
                  <span className="font-bold text-lg">£{Number(order.totalPrice).toFixed(2)}</span>
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRefundModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleRefund}
                disabled={processingResolution || !selectedReason}
              >
                {processingResolution ? 'Processing...' : 'Issue Refund'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Process Customer Issue Modal */}
        <Dialog open={processIssueModalOpen} onOpenChange={setProcessIssueModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {processAction === 'REPRINT' ? 'Approve Reprint' : 'Issue Refund'}
              </DialogTitle>
              <DialogDescription>
                Process the customer&apos;s reported issue.
              </DialogDescription>
            </DialogHeader>
            {selectedPendingIssue && (
              <div className="space-y-4 py-4">
                <div className="bg-muted/30 p-3 rounded-lg space-y-2">
                  <p className="text-sm">
                    <span className="text-muted-foreground">Issue Type:</span>{' '}
                    <span className="font-medium">{getReasonLabel(selectedPendingIssue.reason)}</span>
                  </p>
                  {selectedPendingIssue.notes && (
                    <p className="text-sm">
                      <span className="text-muted-foreground">Customer Notes:</span>{' '}
                      <span className="italic">&quot;{selectedPendingIssue.notes}&quot;</span>
                    </p>
                  )}
                </div>

                {processAction === 'REFUND' && (
                  <div className="bg-orange-500/10 border border-orange-500/50 text-orange-600 px-4 py-3 rounded-lg text-sm">
                    <strong>Warning:</strong> Refunds are processed via Stripe and cannot be reversed.
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="process-notes">Admin Notes (Optional)</Label>
                  <Textarea
                    id="process-notes"
                    placeholder="Add any notes about the resolution..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>

                {processAction === 'REFUND' && (
                  <div className="bg-muted/30 p-3 rounded-lg">
                    <p className="text-sm">
                      <span className="text-muted-foreground">Refund Amount:</span>{' '}
                      <span className="font-bold text-lg">£{Number(order.totalPrice).toFixed(2)}</span>
                    </p>
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setProcessIssueModalOpen(false)}>
                Cancel
              </Button>
              <Button
                className={processAction === 'REPRINT' ? 'bg-purple-500 hover:bg-purple-600' : ''}
                variant={processAction === 'REFUND' ? 'destructive' : 'default'}
                onClick={handleProcessPendingIssue}
                disabled={processingResolution}
              >
                {processingResolution
                  ? 'Processing...'
                  : processAction === 'REPRINT'
                  ? 'Approve Reprint'
                  : 'Issue Refund'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}

export default function AdminOrderDetailsClient({ orderId }: AdminOrderDetailsClientProps) {
  return (
    <ProtectedRoute>
      <AdminOrderDetailsContent orderId={orderId} />
    </ProtectedRoute>
  );
}
