'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import apiClient from '@/lib/api/client';
import Link from 'next/link';
import {
  Search,
  CreditCard,
  Receipt,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  ShoppingCart,
} from 'lucide-react';

interface IssuingStatus {
  enabled: boolean;
  cardCount: number;
  totalSpendingLimit: number;
  totalSpent: number;
  pendingTransactions: number;
}

interface SourceStatus {
  source: string;
  configured: boolean;
  envVars: string[];
}

function PurchasingDashboardContent() {
  const router = useRouter();
  const { user } = useAuth();
  const [issuingStatus, setIssuingStatus] = useState<IssuingStatus | null>(null);
  const [searchSources, setSearchSources] = useState<SourceStatus[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && user.userType !== 'PRINTER_ADMIN') {
      router.push('/dashboard');
    }
  }, [user, router]);

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      setLoading(true);

      // Fetch card status and search sources in parallel
      const [cardsRes, searchRes] = await Promise.all([
        apiClient.get<{ success: boolean; data: { enabled: boolean; summary?: IssuingStatus } }>(
          '/admin/purchasing/cards'
        ),
        apiClient.get<{ success: boolean; data: { sources: SourceStatus[] } }>(
          '/admin/purchasing/search'
        ),
      ]);

      if (cardsRes.data.success && cardsRes.data.data.summary) {
        setIssuingStatus(cardsRes.data.data.summary);
      } else {
        setIssuingStatus({
          enabled: false,
          cardCount: 0,
          totalSpendingLimit: 0,
          totalSpent: 0,
          pendingTransactions: 0,
        });
      }

      if (searchRes.data.success) {
        setSearchSources(searchRes.data.data.sources);
      }
    } catch (error) {
      console.error('Failed to fetch status:', error);
    } finally {
      setLoading(false);
    }
  };

  if (user && user.userType !== 'PRINTER_ADMIN') {
    return null;
  }

  const configuredSources = searchSources.filter(s => s.configured).length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin">
              <Button variant="ghost" size="sm">
                ← Back to Admin
              </Button>
            </Link>
            <h1 className="text-2xl font-bold">
              <span className="text-neon-gradient">Supplier Purchasing</span>
            </h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-md h-12 w-12 border-t-2 border-b-2 border-primary mb-4"></div>
              <p className="text-muted-foreground">Loading...</p>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card
                className="card-glow cursor-pointer hover:-translate-y-1 transition-all duration-300"
                onClick={() => router.push('/admin/purchasing/search')}
              >
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary/10 rounded-lg">
                      <Search className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold">Product Search</h3>
                      <p className="text-sm text-muted-foreground">
                        Search supplies across marketplaces
                      </p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>

              <Card
                className="card-glow cursor-pointer hover:-translate-y-1 transition-all duration-300"
                onClick={() => router.push('/admin/purchasing/cards')}
              >
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-cyan-500/10 rounded-lg">
                      <CreditCard className="w-6 h-6 text-cyan-500" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold">Virtual Cards</h3>
                      <p className="text-sm text-muted-foreground">
                        Manage purchasing cards
                      </p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>

              <Card
                className="card-glow cursor-pointer hover:-translate-y-1 transition-all duration-300"
                onClick={() => router.push('/admin/purchasing/transactions')}
              >
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-green-500/10 rounded-lg">
                      <Receipt className="w-6 h-6 text-green-500" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold">Transactions</h3>
                      <p className="text-sm text-muted-foreground">
                        View purchase history
                      </p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Stripe Issuing Status */}
            <Card className="card-glow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Stripe Issuing Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                {issuingStatus?.enabled ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div>
                      <p className="text-sm text-muted-foreground">Active Cards</p>
                      <p className="text-2xl font-bold">{issuingStatus.cardCount}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Limit</p>
                      <p className="text-2xl font-bold">
                        £{issuingStatus.totalSpendingLimit.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Spent</p>
                      <p className="text-2xl font-bold text-primary">
                        £{issuingStatus.totalSpent.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Pending</p>
                      <p className="text-2xl font-bold">
                        {issuingStatus.pendingTransactions}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-4 p-4 bg-amber-500/10 rounded-lg border border-amber-500/30">
                    <AlertCircle className="w-6 h-6 text-amber-500 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-amber-500">
                        Stripe Issuing Not Enabled
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Virtual cards require Stripe Issuing approval. This typically takes
                        1-2 weeks after applying. Once approved, set STRIPE_ISSUING_ENABLED=true
                        in your environment.
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Search Sources Status */}
            <Card className="card-glow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5" />
                  Product Search Sources
                  <Badge variant="outline" className="ml-2">
                    {configuredSources}/{searchSources.length} configured
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {searchSources.map((source) => (
                    <div
                      key={source.source}
                      className={`p-4 rounded-lg border ${
                        source.configured
                          ? 'bg-green-500/10 border-green-500/30'
                          : 'bg-muted/30 border-border'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {source.configured ? (
                          <CheckCircle2 className="w-5 h-5 text-green-500" />
                        ) : (
                          <AlertCircle className="w-5 h-5 text-muted-foreground" />
                        )}
                        <div>
                          <p className="font-medium capitalize">{source.source}</p>
                          {!source.configured && (
                            <p className="text-xs text-muted-foreground">
                              Required: {source.envVars.join(', ')}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {configuredSources === 0 && (
                  <div className="mt-4 p-4 bg-muted/30 rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      No search sources configured. Add API keys to your environment to
                      enable product search. You can still use the product search page
                      to test the interface.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* How It Works */}
            <Card className="card-glow">
              <CardHeader>
                <CardTitle>How Supplier Purchasing Works</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="text-center">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                      <span className="text-xl font-bold text-primary">1</span>
                    </div>
                    <h4 className="font-medium mb-1">Search Products</h4>
                    <p className="text-sm text-muted-foreground">
                      Search Amazon, eBay, AliExpress, and Google Shopping for supplies
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="w-12 h-12 bg-cyan-500/10 rounded-full flex items-center justify-center mx-auto mb-3">
                      <span className="text-xl font-bold text-cyan-500">2</span>
                    </div>
                    <h4 className="font-medium mb-1">Use Virtual Card</h4>
                    <p className="text-sm text-muted-foreground">
                      Pay with your Stripe Issuing virtual card at checkout
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-3">
                      <span className="text-xl font-bold text-green-500">3</span>
                    </div>
                    <h4 className="font-medium mb-1">Auto-Capture</h4>
                    <p className="text-sm text-muted-foreground">
                      Transactions are automatically captured via Stripe webhooks
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="w-12 h-12 bg-purple-500/10 rounded-full flex items-center justify-center mx-auto mb-3">
                      <span className="text-xl font-bold text-purple-500">4</span>
                    </div>
                    <h4 className="font-medium mb-1">Expense Created</h4>
                    <p className="text-sm text-muted-foreground">
                      Expenses are automatically added to your accounting board
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}

export default function PurchasingDashboardPage() {
  return (
    <ProtectedRoute>
      <PurchasingDashboardContent />
    </ProtectedRoute>
  );
}
