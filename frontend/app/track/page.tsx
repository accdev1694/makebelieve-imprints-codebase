'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  shippingService,
  TrackingResponse,
  TRACKING_STATUS_LABELS,
  getTrackingStatusColor,
} from '@/lib/api/shipping';
import Link from 'next/link';

function TrackingPageContent() {
  const searchParams = useSearchParams();

  const [trackingNumber, setTrackingNumber] = useState(searchParams.get('number') || '');
  const [tracking, setTracking] = useState<TrackingResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setTracking(null);

    if (!trackingNumber.trim()) {
      setError('Please enter a tracking number');
      return;
    }

    setLoading(true);

    try {
      const result = await shippingService.getTrackingStatus(trackingNumber.trim());
      setTracking(result);
    } catch (err: unknown) {
      const error = err as { error?: string; message?: string };
      setError(error?.error || error?.message || 'Failed to retrieve tracking information');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="sm">
                ← Home
              </Button>
            </Link>
            <h1 className="text-2xl font-bold">
              <span className="text-neon-gradient">Track Your Order</span>
            </h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-3xl">
        {/* Search Form */}
        <Card className="card-glow mb-8">
          <CardHeader>
            <CardTitle>Enter Tracking Number</CardTitle>
            <CardDescription>
              Track your shipment with the tracking number provided in your order confirmation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleTrack} className="space-y-4">
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="e.g., RM123456789GB"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  className="flex-1 bg-card/50"
                />
                <Button type="submit" className="btn-gradient" loading={loading}>
                  Track
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Error Message */}
        {error && (
          <div className="bg-destructive/10 border border-destructive/50 text-destructive px-4 py-3 rounded-lg text-sm mb-6">
            {error}
          </div>
        )}

        {/* Tracking Results */}
        {tracking && (
          <Card className="card-glow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Tracking Details</CardTitle>
                  <CardDescription className="font-mono text-xs mt-1">
                    {tracking.trackingNumber}
                  </CardDescription>
                </div>
                <Badge
                  className={`${getTrackingStatusColor(tracking.status)} border px-4 py-2 text-base`}
                >
                  {TRACKING_STATUS_LABELS[tracking.status] || tracking.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Current Status */}
              <div className="bg-muted/30 p-4 rounded-lg">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground mb-1">Current Status</p>
                    <p className="font-semibold text-base">
                      {TRACKING_STATUS_LABELS[tracking.status] || tracking.status}
                    </p>
                  </div>
                  {tracking.currentLocation && (
                    <div>
                      <p className="text-muted-foreground mb-1">Current Location</p>
                      <p className="font-semibold text-base">{tracking.currentLocation}</p>
                    </div>
                  )}
                  {tracking.estimatedDelivery && (
                    <div>
                      <p className="text-muted-foreground mb-1">Estimated Delivery</p>
                      <p className="font-semibold text-base">
                        {new Date(tracking.estimatedDelivery).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                  )}
                  {tracking.lastUpdated && (
                    <div>
                      <p className="text-muted-foreground mb-1">Last Updated</p>
                      <p className="font-semibold text-base">
                        {new Date(tracking.lastUpdated).toLocaleString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Tracking Events Timeline */}
              {tracking.events && tracking.events.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h3 className="font-semibold mb-4">Tracking History</h3>
                    <div className="space-y-4">
                      {tracking.events.map((event, index) => (
                        <div key={index} className="flex gap-4">
                          <div className="flex flex-col items-center">
                            <div className="w-3 h-3 rounded-md bg-primary"></div>
                            {index < tracking.events!.length - 1 && (
                              <div className="w-0.5 h-full bg-border mt-1"></div>
                            )}
                          </div>
                          <div className="flex-1 pb-4">
                            <p className="font-medium">{event.description}</p>
                            <p className="text-sm text-muted-foreground">
                              {event.location} •{' '}
                              {new Date(event.timestamp).toLocaleString('en-GB', {
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Help Text */}
              <Separator />
              <div className="text-sm text-muted-foreground">
                <p className="mb-2">
                  <strong>Need help?</strong>
                </p>
                <p>
                  If you have any questions about your delivery, please contact our support team or
                  check your order details in your account.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Info Card (shown when no tracking info) */}
        {!tracking && !loading && (
          <Card className="card-glow">
            <CardContent className="py-12 text-center">
              <div className="mb-6">
                <svg
                  className="mx-auto w-16 h-16 text-muted-foreground"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">Track Your Shipment</h3>
              <p className="text-muted-foreground mb-6">
                Enter your tracking number above to see real-time updates about your delivery.
              </p>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>✓ Real-time tracking updates</p>
                <p>✓ Delivery estimates</p>
                <p>✓ Complete tracking history</p>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}

export default function TrackingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center">Loading...</div>}>
      <TrackingPageContent />
    </Suspense>
  );
}
