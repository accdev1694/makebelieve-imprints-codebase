'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ordersService, Order, OrderItem, ORDER_STATUS_LABELS, OrderStatus } from '@/lib/api/orders';
import { MATERIAL_LABELS, PRINT_SIZE_LABELS } from '@/lib/api/designs';
import { storageService } from '@/lib/api/storage';
import apiClient from '@/lib/api/client';
import Link from 'next/link';
import Image from 'next/image';
import { X, Camera, AlertCircle, MessageSquare } from 'lucide-react';

// Enhanced issue reasons with NEVER_ARRIVED
const ISSUE_REASONS = [
  { value: 'DAMAGED_IN_TRANSIT', label: 'Damaged in Transit', description: 'Item arrived damaged or broken' },
  { value: 'QUALITY_ISSUE', label: 'Quality Issue', description: 'Print quality not as expected' },
  { value: 'WRONG_ITEM', label: 'Wrong Item', description: 'Received a different item than ordered' },
  { value: 'PRINTING_ERROR', label: 'Printing Error', description: 'Colors, alignment, or image printed incorrectly' },
  { value: 'NEVER_ARRIVED', label: 'Never Arrived', description: 'Item was not received' },
  { value: 'OTHER', label: 'Other', description: 'Another issue not listed above' },
];

const REASON_LABELS: Record<string, string> = {
  DAMAGED_IN_TRANSIT: 'Damaged in Transit',
  QUALITY_ISSUE: 'Quality Issue',
  WRONG_ITEM: 'Wrong Item',
  PRINTING_ERROR: 'Printing Error',
  NEVER_ARRIVED: 'Never Arrived',
  OTHER: 'Other',
};

// Enhanced status labels for new issue system
const ISSUE_STATUS_LABELS: Record<string, string> = {
  SUBMITTED: 'Submitted',
  AWAITING_REVIEW: 'Under Review',
  INFO_REQUESTED: 'Info Requested',
  APPROVED_REPRINT: 'Approved - Reprint',
  APPROVED_REFUND: 'Approved - Refund',
  PROCESSING: 'Processing',
  COMPLETED: 'Resolved',
  REJECTED: 'Rejected',
  CLOSED: 'Closed',
};

const getIssueStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    SUBMITTED: 'bg-blue-500/10 text-blue-500 border-blue-500/50',
    AWAITING_REVIEW: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/50',
    INFO_REQUESTED: 'bg-orange-500/10 text-orange-500 border-orange-500/50',
    APPROVED_REPRINT: 'bg-purple-500/10 text-purple-500 border-purple-500/50',
    APPROVED_REFUND: 'bg-purple-500/10 text-purple-500 border-purple-500/50',
    PROCESSING: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/50',
    COMPLETED: 'bg-green-500/10 text-green-500 border-green-500/50',
    REJECTED: 'bg-red-500/10 text-red-500 border-red-500/50',
    CLOSED: 'bg-gray-500/10 text-gray-500 border-gray-500/50',
  };
  return colors[status] || 'bg-gray-500/10 text-gray-500 border-gray-500/50';
};

// New per-item issue interface
interface ItemIssue {
  id: string;
  orderItemId: string;
  reason: string;
  status: string;
  carrierFault: string;
  initialNotes: string | null;
  imageUrls: string[] | null;
  resolvedType: string | null;
  reprintOrderId: string | null;
  refundAmount: number | null;
  rejectionReason: string | null;
  createdAt: string;
  processedAt: string | null;
  unreadCount?: number;
}

// Extended OrderItem with issue
interface OrderItemWithIssue extends OrderItem {
  issue?: ItemIssue | null;
}

interface OrderDetailsClientProps {
  orderId: string;
}

function OrderDetailsContent({ orderId }: OrderDetailsClientProps) {
  const router = useRouter();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Per-item issue state
  const [itemIssues, setItemIssues] = useState<Record<string, ItemIssue>>({});
  const [selectedItem, setSelectedItem] = useState<OrderItemWithIssue | null>(null);

  // Issue modal state
  const [issueModalOpen, setIssueModalOpen] = useState(false);
  const [issueReason, setIssueReason] = useState('');
  const [issueNotes, setIssueNotes] = useState('');
  const [issueImages, setIssueImages] = useState<string[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [submittingIssue, setSubmittingIssue] = useState(false);
  const [issueSuccess, setIssueSuccess] = useState(false);
  const [issueError, setIssueError] = useState('');

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
      } catch (err: unknown) {
        const e = err as { error?: string; message?: string };
        setError(e?.error || e?.message || 'Failed to load order');
      } finally {
        setLoading(false);
      }
    };

    loadOrder();
  }, [orderId]);

  // Fetch issues for all items in this order
  useEffect(() => {
    const loadIssues = async () => {
      if (!order?.items?.length) return;

      const issueMap: Record<string, ItemIssue> = {};

      // Fetch issues for each item
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
  }, [order, orderId, issueSuccess]);

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
    return colors[status];
  };

  const getStatusIcon = (status: OrderStatus): string => {
    const icons: Record<OrderStatus, string> = {
      pending: '⏳',
      confirmed: '✓',
      payment_confirmed: '✓',
      printing: '🖨️',
      shipped: '📦',
      delivered: '✅',
      cancelled: '❌',
      refunded: '↩️',
    };
    return icons[status];
  };

  const canReportIssue = order && ['shipped', 'delivered'].includes(order.status);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (issueImages.length >= 5) {
      setIssueError('Maximum 5 images allowed');
      return;
    }

    const file = files[0];

    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      setIssueError('Please upload a valid image file (JPG, PNG, WebP, or GIF)');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setIssueError('Image must be less than 10MB');
      return;
    }

    setUploadingImage(true);
    setIssueError('');

    try {
      const imageUrl = await storageService.uploadFile(file);
      setIssueImages((prev) => [...prev, imageUrl]);
    } catch (err: unknown) {
      const error = err as { message?: string };
      setIssueError(error?.message || 'Failed to upload image');
    } finally {
      setUploadingImage(false);
      e.target.value = '';
    }
  };

  const handleRemoveImage = (index: number) => {
    setIssueImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleReportIssue = async () => {
    if (!selectedItem) return;
    if (!issueReason) {
      setIssueError('Please select a reason for your issue');
      return;
    }

    setSubmittingIssue(true);
    setIssueError('');

    try {
      await apiClient.post(`/orders/${orderId}/items/${selectedItem.id}/issue`, {
        reason: issueReason,
        notes: issueNotes,
        imageUrls: issueImages,
      });
      setIssueSuccess(true);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } }; message?: string };
      setIssueError(error?.response?.data?.error || error?.message || 'Failed to submit issue report');
    } finally {
      setSubmittingIssue(false);
    }
  };

  const openIssueModal = (item: OrderItemWithIssue) => {
    setSelectedItem(item);
    setIssueReason('');
    setIssueNotes('');
    setIssueImages([]);
    setIssueError('');
    setIssueSuccess(false);
    setIssueModalOpen(true);
  };

  const getItemIssue = (itemId: string): ItemIssue | null => {
    return itemIssues[itemId] || null;
  };

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
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/orders">
              <Button variant="ghost" size="sm">
                ← Back to Orders
              </Button>
            </Link>
            <h1 className="text-2xl font-bold">
              <span className="text-neon-gradient">Order Details</span>
            </h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
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

        {/* Order Status Timeline */}
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
                  {[
                    { key: 'placed', label: 'Order Placed', desc: 'Your order has been received', check: true },
                    { key: 'payment', label: 'Payment Confirmed', desc: 'Payment successfully processed', check: ['payment_confirmed', 'printing', 'shipped', 'delivered'].includes(order.status) },
                    { key: 'printing', label: 'Printing', desc: 'Your design is being printed', check: ['printing', 'shipped', 'delivered'].includes(order.status) },
                    { key: 'shipped', label: 'Shipped', desc: 'Your order is on its way', check: ['shipped', 'delivered'].includes(order.status), tracking: order.trackingNumber },
                    { key: 'delivered', label: 'Delivered', desc: 'Order successfully delivered', check: order.status === 'delivered', isLast: true },
                  ].map((step) => (
                    <div key={step.key} className="flex gap-4 relative">
                      <div className={`w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 ${
                        step.check
                          ? step.isLast ? 'bg-green-500 text-white' : 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground'
                      }`}>{step.check ? '✓' : '○'}</div>
                      <div className="flex-1">
                        <p className="font-medium">{step.label}</p>
                        <p className="text-sm text-muted-foreground">{step.desc}</p>
                        {step.tracking && (
                          <div className="mt-2">
                            <p className="text-xs text-muted-foreground">Tracking Number:</p>
                            <p className="font-mono text-sm mb-2">{step.tracking}</p>
                            <Link href={`/track?number=${step.tracking}`}>
                              <Button size="sm" variant="outline" className="text-xs">Track Shipment →</Button>
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

        {/* Order Items with Per-Item Issue Buttons */}
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
                    {order.material && <span>{MATERIAL_LABELS[order.material] || order.material}</span>}
                    {order.printSize && <span>• {PRINT_SIZE_LABELS[order.printSize] || order.printSize}</span>}
                  </div>
                  <p className="font-medium">£{Number(order.totalPrice).toFixed(2)}</p>
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
                              <Badge className={`${getIssueStatusColor(itemIssue.status)} border text-xs`}>
                                <AlertCircle className="w-3 h-3 mr-1" />
                                {ISSUE_STATUS_LABELS[itemIssue.status] || itemIssue.status}
                              </Badge>
                            )}
                          </div>
                          <div className="flex justify-between mt-2">
                            <span className="text-sm text-muted-foreground">Qty: {item.quantity}</span>
                            <span className="font-medium">£{Number(item.totalPrice).toFixed(2)}</span>
                          </div>

                          {/* Per-Item Issue Actions */}
                          {canReportIssue && (
                            <div className="mt-3 pt-3 border-t border-border/50">
                              {hasIssue ? (
                                <div className="flex items-center justify-between">
                                  <span className="text-xs text-muted-foreground">
                                    Issue reported {new Date(itemIssue.createdAt).toLocaleDateString('en-GB')}
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
                                  onClick={() => openIssueModal(item)}
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
                  <p>{order.shippingAddress.city}, {order.shippingAddress.postcode}</p>
                  <p>{order.shippingAddress.country}</p>
                </div>
              </div>
            )}

            <Separator />

            {/* Order Total */}
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

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center flex-wrap">
          <Link href="/orders">
            <Button variant="outline" className="w-full sm:w-auto">Back to Orders</Button>
          </Link>
          {order.trackingNumber && (
            <Link href={`/track?number=${order.trackingNumber}`}>
              <Button variant="outline" className="w-full sm:w-auto">Track Shipment</Button>
            </Link>
          )}
          {Object.keys(itemIssues).length > 0 && (
            <Link href="/account/issues">
              <Button variant="outline" className="w-full sm:w-auto border-orange-500/50 text-orange-500 hover:text-orange-600">
                View All Issues
              </Button>
            </Link>
          )}
          <Link href="/products">
            <Button variant="outline" className="w-full sm:w-auto">Continue Shopping</Button>
          </Link>
          <Link href="/design/new">
            <Button className="btn-gradient w-full sm:w-auto">Create Another Design</Button>
          </Link>
        </div>

        {/* Report Issue Modal */}
        <Dialog open={issueModalOpen} onOpenChange={setIssueModalOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Report an Issue</DialogTitle>
              <DialogDescription>
                {selectedItem && (
                  <span>
                    Reporting issue for: <strong>{selectedItem.product?.name || 'Item'}</strong>
                  </span>
                )}
              </DialogDescription>
            </DialogHeader>

            {issueSuccess ? (
              <div className="py-6 text-center">
                <div className="text-4xl mb-4">✓</div>
                <h3 className="text-lg font-semibold text-green-500 mb-2">Issue Reported Successfully</h3>
                <p className="text-muted-foreground mb-4">
                  Our team will review your issue and respond within 1-2 business days.
                </p>
                <div className="flex gap-2 justify-center">
                  <Button variant="outline" onClick={() => setIssueModalOpen(false)}>Close</Button>
                  {selectedItem && itemIssues[selectedItem.id] && (
                    <Link href={`/account/issues/${itemIssues[selectedItem.id].id}`}>
                      <Button>View Issue</Button>
                    </Link>
                  )}
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="issue-reason">What&apos;s the issue?</Label>
                    <Select value={issueReason} onValueChange={setIssueReason}>
                      <SelectTrigger id="issue-reason">
                        <SelectValue placeholder="Select a reason..." />
                      </SelectTrigger>
                      <SelectContent>
                        {ISSUE_REASONS.map((reason) => (
                          <SelectItem key={reason.value} value={reason.value}>
                            <div>
                              <div className="font-medium">{reason.label}</div>
                              <div className="text-xs text-muted-foreground">{reason.description}</div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="issue-notes">Additional Details (optional)</Label>
                    <Textarea
                      id="issue-notes"
                      placeholder="Please describe the issue in detail..."
                      value={issueNotes}
                      onChange={(e) => setIssueNotes(e.target.value)}
                      rows={3}
                    />
                  </div>

                  {/* Image Upload */}
                  <div className="space-y-2">
                    <Label>Photos of the Issue (recommended)</Label>
                    <p className="text-xs text-muted-foreground">
                      Upload up to 5 photos showing the damage or issue.
                    </p>

                    {issueImages.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {issueImages.map((url, index) => (
                          <div key={index} className="relative group">
                            <div className="w-20 h-20 rounded-lg overflow-hidden border border-border">
                              <img
                                src={url}
                                alt={`Issue photo ${index + 1}`}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveImage(index)}
                              className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {issueImages.length < 5 && (
                      <div className="flex gap-2">
                        <label htmlFor="issue-image-upload" className="cursor-pointer">
                          <div className="flex items-center gap-2 px-4 py-2 border border-dashed border-border rounded-lg hover:border-primary hover:bg-primary/5 transition-colors">
                            {uploadingImage ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent" />
                                <span className="text-sm">Uploading...</span>
                              </>
                            ) : (
                              <>
                                <Camera className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm text-muted-foreground">
                                  {issueImages.length === 0 ? 'Add Photos' : 'Add More'}
                                </span>
                              </>
                            )}
                          </div>
                        </label>
                        <input
                          id="issue-image-upload"
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/gif"
                          onChange={handleImageUpload}
                          disabled={uploadingImage}
                          className="hidden"
                        />
                      </div>
                    )}
                  </div>

                  {issueError && (
                    <div className="bg-destructive/10 border border-destructive/50 text-destructive px-3 py-2 rounded-md text-sm">
                      {issueError}
                    </div>
                  )}
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setIssueModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleReportIssue}
                    disabled={submittingIssue || !issueReason}
                    className="bg-orange-500 hover:bg-orange-600"
                  >
                    {submittingIssue ? 'Submitting...' : 'Submit Report'}
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
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
