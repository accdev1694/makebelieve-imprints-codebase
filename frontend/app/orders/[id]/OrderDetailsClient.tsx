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
import { X, Upload, Camera } from 'lucide-react';

const ISSUE_REASONS = [
  { value: 'DAMAGED_IN_TRANSIT', label: 'Damaged in Transit', description: 'Item arrived damaged or broken' },
  { value: 'QUALITY_ISSUE', label: 'Quality Issue', description: 'Print quality not as expected' },
  { value: 'WRONG_ITEM', label: 'Wrong Item', description: 'Received a different item than ordered' },
  { value: 'PRINTING_ERROR', label: 'Printing Error', description: 'Colors, alignment, or image printed incorrectly' },
  { value: 'OTHER', label: 'Other', description: 'Another issue not listed above' },
];

const REASON_LABELS: Record<string, string> = {
  DAMAGED_IN_TRANSIT: 'Damaged in Transit',
  QUALITY_ISSUE: 'Quality Issue',
  WRONG_ITEM: 'Wrong Item',
  PRINTING_ERROR: 'Printing Error',
  OTHER: 'Other',
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Under Review',
  PROCESSING: 'Processing',
  COMPLETED: 'Resolved',
  FAILED: 'Failed',
};

interface Issue {
  id: string;
  type: 'REPRINT' | 'REFUND';
  reason: string;
  notes: string | null;
  imageUrls: string[] | null;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  createdAt: string;
  processedAt: string | null;
  reprintOrderId: string | null;
  refundAmount: number | null;
}

interface OrderDetailsClientProps {
  orderId: string;
}

function OrderDetailsContent({ orderId }: OrderDetailsClientProps) {
  const router = useRouter();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Issue reporting state
  const [issueModalOpen, setIssueModalOpen] = useState(false);
  const [viewIssueModalOpen, setViewIssueModalOpen] = useState(false);
  const [existingIssues, setExistingIssues] = useState<Issue[]>([]);
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

  // Fetch existing issues for this order
  useEffect(() => {
    const loadIssues = async () => {
      if (!orderId) return;
      try {
        const response = await apiClient.get<{ issues: Issue[] }>(`/orders/${orderId}/issues`);
        setExistingIssues(response.data?.issues || []);
      } catch {
        // Silently fail - issues are supplementary
      }
    };
    loadIssues();
  }, [orderId, issueSuccess]); // Reload when a new issue is submitted

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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Limit to 5 images total
    if (issueImages.length >= 5) {
      setIssueError('Maximum 5 images allowed');
      return;
    }

    const file = files[0];

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      setIssueError('Please upload a valid image file (JPG, PNG, WebP, or GIF)');
      return;
    }

    // Validate file size (max 10MB)
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
      // Reset input
      e.target.value = '';
    }
  };

  const handleRemoveImage = (index: number) => {
    setIssueImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleReportIssue = async () => {
    if (!issueReason) {
      setIssueError('Please select a reason for your issue');
      return;
    }

    setSubmittingIssue(true);
    setIssueError('');

    try {
      await apiClient.post(`/orders/${orderId}/report-issue`, {
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

  const canReportIssue = order && ['shipped', 'delivered'].includes(order.status);
  const hasExistingIssue = existingIssues.length > 0;
  const latestIssue = hasExistingIssue ? existingIssues[0] : null;

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
                  <div className="flex gap-4 relative">
                    <div className={`w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 ${
                      ['pending', 'payment_confirmed', 'printing', 'shipped', 'delivered'].includes(order.status)
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    }`}>✓</div>
                    <div className="flex-1">
                      <p className="font-medium">Order Placed</p>
                      <p className="text-sm text-muted-foreground">Your order has been received</p>
                    </div>
                  </div>

                  <div className="flex gap-4 relative">
                    <div className={`w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 ${
                      ['payment_confirmed', 'printing', 'shipped', 'delivered'].includes(order.status)
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    }`}>{['payment_confirmed', 'printing', 'shipped', 'delivered'].includes(order.status) ? '✓' : '○'}</div>
                    <div className="flex-1">
                      <p className="font-medium">Payment Confirmed</p>
                      <p className="text-sm text-muted-foreground">Payment successfully processed</p>
                    </div>
                  </div>

                  <div className="flex gap-4 relative">
                    <div className={`w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 ${
                      ['printing', 'shipped', 'delivered'].includes(order.status)
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    }`}>{['printing', 'shipped', 'delivered'].includes(order.status) ? '✓' : '○'}</div>
                    <div className="flex-1">
                      <p className="font-medium">Printing</p>
                      <p className="text-sm text-muted-foreground">Your design is being printed</p>
                    </div>
                  </div>

                  <div className="flex gap-4 relative">
                    <div className={`w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 ${
                      ['shipped', 'delivered'].includes(order.status)
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    }`}>{['shipped', 'delivered'].includes(order.status) ? '✓' : '○'}</div>
                    <div className="flex-1">
                      <p className="font-medium">Shipped</p>
                      <p className="text-sm text-muted-foreground">Your order is on its way</p>
                      {order.trackingNumber && (
                        <div className="mt-2">
                          <p className="text-xs text-muted-foreground">Tracking Number:</p>
                          <p className="font-mono text-sm mb-2">{order.trackingNumber}</p>
                          <Link href={`/track?number=${order.trackingNumber}`}>
                            <Button size="sm" variant="outline" className="text-xs">Track Shipment →</Button>
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-4 relative">
                    <div className={`w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 ${
                      order.status === 'delivered' ? 'bg-green-500 text-white' : 'bg-muted text-muted-foreground'
                    }`}>{order.status === 'delivered' ? '✓' : '○'}</div>
                    <div className="flex-1">
                      <p className="font-medium">Delivered</p>
                      <p className="text-sm text-muted-foreground">Order successfully delivered</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-glow mb-6">
          <CardHeader>
            <CardTitle>Order Items</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {order.design && (
              <div className="flex gap-4 items-start">
                <div className="w-32 h-32 bg-card/30 rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0 relative">
                  <Image
                    src={order.previewUrl || order.design.previewUrl || order.design.imageUrl}
                    alt={order.design.name}
                    fill
                    sizes="128px"
                    className="object-contain"
                    unoptimized
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
                        <p className="font-medium">{order.printWidth} × {order.printHeight} cm</p>
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

        <div className="flex flex-col sm:flex-row gap-4 justify-center flex-wrap">
          <Link href="/orders">
            <Button variant="outline" className="w-full sm:w-auto">Back to Orders</Button>
          </Link>
          {order.trackingNumber && (
            <Link href={`/track?number=${order.trackingNumber}`}>
              <Button variant="outline" className="w-full sm:w-auto">Track Shipment</Button>
            </Link>
          )}
          {canReportIssue && !hasExistingIssue && (
            <Button
              variant="outline"
              className="w-full sm:w-auto border-orange-500/50 text-orange-500 hover:text-orange-600"
              onClick={() => {
                setIssueReason('');
                setIssueNotes('');
                setIssueImages([]);
                setIssueError('');
                setIssueSuccess(false);
                setIssueModalOpen(true);
              }}
            >
              Report an Issue
            </Button>
          )}
          {hasExistingIssue && (
            <Button
              variant="outline"
              className="w-full sm:w-auto border-orange-500/50 text-orange-500 hover:text-orange-600"
              onClick={() => setViewIssueModalOpen(true)}
            >
              View Issue
            </Button>
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
                Let us know what went wrong with your order. We&apos;ll review your report and get back to you.
              </DialogDescription>
            </DialogHeader>

            {issueSuccess ? (
              <div className="py-6 text-center">
                <div className="text-4xl mb-4">✓</div>
                <h3 className="text-lg font-semibold text-green-500 mb-2">Issue Reported Successfully</h3>
                <p className="text-muted-foreground mb-4">
                  Our team will review your issue and contact you shortly. You&apos;ll receive an email when we have an update.
                </p>
                <Button onClick={() => setIssueModalOpen(false)}>Close</Button>
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
                      placeholder="Please describe the issue in detail. Include any relevant information that might help us resolve it faster."
                      value={issueNotes}
                      onChange={(e) => setIssueNotes(e.target.value)}
                      rows={3}
                    />
                  </div>

                  {/* Image Upload Section */}
                  <div className="space-y-2">
                    <Label>Photos of the Issue (recommended)</Label>
                    <p className="text-xs text-muted-foreground">
                      Upload up to 5 photos showing the damage or issue. This helps us process your request faster.
                    </p>

                    {/* Image Previews */}
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

                    {/* Upload Button */}
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

        {/* View Issue Modal */}
        <Dialog open={viewIssueModalOpen} onOpenChange={setViewIssueModalOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Issue Details</DialogTitle>
              <DialogDescription>
                Your reported issue for this order
              </DialogDescription>
            </DialogHeader>

            {latestIssue && (
              <div className="space-y-4 py-4">
                {/* Status Badge */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status:</span>
                  <Badge
                    className={
                      latestIssue.status === 'COMPLETED'
                        ? 'bg-green-500/10 text-green-500 border-green-500/50'
                        : latestIssue.status === 'FAILED'
                        ? 'bg-red-500/10 text-red-500 border-red-500/50'
                        : 'bg-yellow-500/10 text-yellow-500 border-yellow-500/50'
                    }
                  >
                    {STATUS_LABELS[latestIssue.status] || latestIssue.status}
                  </Badge>
                </div>

                {/* Issue Details */}
                <div className="space-y-3 bg-muted/30 p-4 rounded-lg">
                  <div>
                    <p className="text-xs text-muted-foreground">Issue Type</p>
                    <p className="font-medium">{REASON_LABELS[latestIssue.reason] || latestIssue.reason}</p>
                  </div>

                  {latestIssue.notes && (
                    <div>
                      <p className="text-xs text-muted-foreground">Your Description</p>
                      <p className="text-sm">{latestIssue.notes}</p>
                    </div>
                  )}

                  <div>
                    <p className="text-xs text-muted-foreground">Reported On</p>
                    <p className="text-sm">
                      {new Date(latestIssue.createdAt).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>

                  {/* Uploaded Photos */}
                  {latestIssue.imageUrls && latestIssue.imageUrls.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">Your Photos</p>
                      <div className="flex flex-wrap gap-2">
                        {latestIssue.imageUrls.map((url, index) => (
                          <a
                            key={index}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block w-16 h-16 rounded-lg overflow-hidden border border-border hover:border-primary transition-colors"
                          >
                            <img
                              src={url}
                              alt={`Issue photo ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Resolution Info */}
                {latestIssue.status === 'COMPLETED' && (
                  <div className="bg-green-500/10 border border-green-500/50 p-4 rounded-lg">
                    <p className="font-medium text-green-600 mb-2">Issue Resolved</p>
                    {latestIssue.type === 'REPRINT' && latestIssue.reprintOrderId && (
                      <p className="text-sm text-muted-foreground">
                        A replacement order has been created and will be shipped to you shortly.
                      </p>
                    )}
                    {latestIssue.type === 'REFUND' && latestIssue.refundAmount && (
                      <p className="text-sm text-muted-foreground">
                        A refund of £{Number(latestIssue.refundAmount).toFixed(2)} has been processed to your original payment method.
                      </p>
                    )}
                  </div>
                )}

                {latestIssue.status === 'PENDING' && (
                  <div className="bg-yellow-500/10 border border-yellow-500/50 p-4 rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      Our team is reviewing your issue. We&apos;ll contact you via email with an update soon.
                    </p>
                  </div>
                )}
              </div>
            )}

            <DialogFooter>
              <Button onClick={() => setViewIssueModalOpen(false)}>Close</Button>
            </DialogFooter>
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
