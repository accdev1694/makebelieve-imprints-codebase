'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CartIcon } from '@/components/cart/CartIcon';
import { apiClient } from '@/lib/api/client';
import { formatPrice } from '@/lib/api/products';
import {
  Download,
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Package,
} from 'lucide-react';

interface DigitalDownload {
  orderId: string;
  orderItemId: string;
  orderDate: string;
  orderStatus: string;
  quantity: number;
  product: {
    id: string;
    name: string;
    slug: string;
    category: string;
    images: Array<{ imageUrl: string }>;
  };
}

interface DownloadLink {
  downloadUrl: string;
  expiresAt: string;
  productName: string;
  fileName: string;
}

function DownloadsContent() {
  const router = useRouter();
  const { user, logout } = useAuth();

  const [downloads, setDownloads] = useState<DigitalDownload[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloadingItemId, setDownloadingItemId] = useState<string | null>(null);

  useEffect(() => {
    fetchDownloads();
  }, []);

  const fetchDownloads = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/orders/user/downloads');
      setDownloads(response.data.data.downloads);
    } catch {
      setError('Failed to load downloads. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (orderId: string, orderItemId: string) => {
    try {
      setDownloadingItemId(orderItemId);
      const response = await apiClient.get(`/orders/${orderId}/download/${orderItemId}`);
      const linkData: DownloadLink = response.data.data;

      // Open download in new tab
      window.open(linkData.downloadUrl, '_blank');
    } catch {
      alert('Failed to generate download link. Please try again.');
    } finally {
      setDownloadingItemId(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DELIVERED':
        return 'bg-green-100 text-green-700';
      case 'SHIPPED':
      case 'CONFIRMED':
        return 'bg-blue-100 text-blue-700';
      case 'PRINTING':
        return 'bg-yellow-100 text-yellow-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <main className="min-h-screen bg-background">
      {/* Header Navigation */}
      <header className="relative z-50 border-b border-border/50 bg-card/30 backdrop-blur-sm sticky top-0">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold">
            <span className="text-neon-gradient">MakeBelieve</span>
          </Link>
          <nav className="flex items-center gap-4">
            <Link href="/products">
              <Button variant="ghost">Products</Button>
            </Link>
            <Link href="/templates">
              <Button variant="ghost">Templates</Button>
            </Link>
            <CartIcon />
            <Link href="/dashboard">
              <Button variant="ghost">Dashboard</Button>
            </Link>
            <Button variant="outline" onClick={logout}>
              Logout
            </Button>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-violet-500/10 via-purple-500/10 to-pink-500/10 py-12">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Download className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">My Downloads</h1>
              <p className="text-muted-foreground">Access your purchased digital products</p>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {loading ? (
          <div className="text-center py-16">
            <div className="animate-spin rounded-md h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading your downloads...</p>
          </div>
        ) : error ? (
          <Card className="max-w-md mx-auto">
            <CardContent className="pt-6 text-center">
              <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">{error}</p>
              <Button onClick={fetchDownloads}>Try Again</Button>
            </CardContent>
          </Card>
        ) : downloads.length === 0 ? (
          <Card className="max-w-md mx-auto">
            <CardContent className="pt-12 pb-8 text-center">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <FileText className="h-10 w-10 text-gray-400" />
              </div>
              <h2 className="text-xl font-semibold mb-2">No Downloads Yet</h2>
              <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                You haven't purchased any digital products yet. Browse our collection to find something you'll love!
              </p>
              <Button asChild className="btn-gradient">
                <Link href="/products/digital">Browse Digital Products</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Downloads Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Your Digital Library
                </CardTitle>
                <CardDescription>
                  {downloads.length} digital {downloads.length === 1 ? 'product' : 'products'} available for download
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Downloads List */}
            <div className="grid gap-4">
              {downloads.map((download) => (
                <Card key={download.orderItemId} className="overflow-hidden">
                  <div className="flex flex-col sm:flex-row">
                    {/* Product Image */}
                    <div className="relative w-full sm:w-40 h-40 flex-shrink-0 bg-gray-100">
                      <Image
                        src={download.product.images[0]?.imageUrl || '/placeholder-product.png'}
                        alt={download.product.name}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 100vw, 160px"
                      />
                    </div>

                    {/* Product Info */}
                    <CardContent className="flex-1 p-4 sm:p-6">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold">{download.product.name}</h3>
                            <Badge className={getStatusColor(download.orderStatus)}>
                              {download.orderStatus === 'DELIVERED' && <CheckCircle className="h-3 w-3 mr-1" />}
                              {download.orderStatus === 'PRINTING' && <Clock className="h-3 w-3 mr-1" />}
                              {download.orderStatus}
                            </Badge>
                          </div>

                          <p className="text-sm text-muted-foreground mb-3">
                            Purchased on {new Date(download.orderDate).toLocaleDateString('en-GB', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                            })}
                          </p>

                          <div className="flex items-center gap-4 text-sm">
                            <Link
                              href={`/orders/${download.orderId}`}
                              className="text-primary hover:underline flex items-center gap-1"
                            >
                              View Order
                              <ExternalLink className="h-3 w-3" />
                            </Link>
                            <Link
                              href={`/product/${download.product.slug || download.product.id}`}
                              className="text-muted-foreground hover:text-foreground"
                            >
                              View Product
                            </Link>
                          </div>
                        </div>

                        {/* Download Button */}
                        <Button
                          className="btn-gradient gap-2"
                          onClick={() => handleDownload(download.orderId, download.orderItemId)}
                          disabled={downloadingItemId === download.orderItemId}
                        >
                          <Download className="h-4 w-4" />
                          {downloadingItemId === download.orderItemId ? 'Generating...' : 'Download'}
                        </Button>
                      </div>
                    </CardContent>
                  </div>
                </Card>
              ))}
            </div>

            {/* Help Section */}
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="pt-6">
                <h3 className="font-semibold mb-2">Need Help?</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Download links expire after 24 hours for security. If you have any issues downloading your files, please contact our support team.
                </p>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/about">Contact Support</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </main>
  );
}

export default function DownloadsPage() {
  return (
    <ProtectedRoute>
      <DownloadsContent />
    </ProtectedRoute>
  );
}
