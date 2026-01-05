'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { getUserPoints, getPointsHistory, PointsBalance, PointsHistory } from '@/lib/api/points';
import { Coins, Gift, Star, ShoppingCart, Info, ArrowUp, ArrowDown, Loader2 } from 'lucide-react';

export default function PointsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [balance, setBalance] = useState<PointsBalance | null>(null);
  const [history, setHistory] = useState<PointsHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login?redirect=/account/points');
    }
  }, [user, authLoading, router]);

  // Load points data
  useEffect(() => {
    if (!user) return;

    const loadData = async () => {
      try {
        const [balanceData, historyData] = await Promise.all([
          getUserPoints(),
          getPointsHistory(50),
        ]);
        setBalance(balanceData);
        setHistory(historyData);
      } catch (err) {
        setError('Failed to load points data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user]);

  const getTypeIcon = (type: string, amount: number) => {
    if (amount < 0) return <ShoppingCart className="h-4 w-4 text-red-500" />;
    if (type === 'REVIEW_REWARD') return <Star className="h-4 w-4 text-yellow-500" />;
    if (type === 'PURCHASE_REWARD') return <Gift className="h-4 w-4 text-green-500" />;
    return <Coins className="h-4 w-4 text-blue-500" />;
  };

  if (authLoading || loading) {
    return (
      <main className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-16 text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
          <p className="mt-4 text-muted-foreground">Loading your points...</p>
        </div>
      </main>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <nav className="text-sm text-muted-foreground mb-6">
          <Link href="/dashboard" className="hover:text-foreground">Dashboard</Link>
          <span className="mx-2">/</span>
          <span>Loyalty Points</span>
        </nav>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Coins className="h-6 w-6 text-yellow-500" />
              Loyalty Points
            </h1>
            <p className="text-muted-foreground">Earn and redeem points on your orders</p>
          </div>
          <Button asChild>
            <Link href="/products">Start Shopping</Link>
          </Button>
        </div>

        {error && (
          <div className="bg-destructive/10 border border-destructive/50 text-destructive px-4 py-3 rounded-lg text-sm mb-6">
            {error}
          </div>
        )}

        {/* Points Balance Card */}
        <Card className="mb-8 bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border-yellow-500/30">
          <CardContent className="py-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Your Balance</p>
                <p className="text-5xl font-bold text-yellow-600">{balance?.points || 0}</p>
                <p className="text-lg text-muted-foreground mt-1">
                  Worth £{(balance?.discountValue || 0).toFixed(2)} off your next order
                </p>
                {balance && balance.points < 500 && balance.points > 0 && (
                  <p className="text-sm text-yellow-600 mt-2">
                    Earn {500 - balance.points} more points to start redeeming!
                  </p>
                )}
              </div>
              <Coins className="h-16 w-16 text-yellow-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        {/* How It Works */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              How Loyalty Points Work
            </CardTitle>
          </CardHeader>
          <CardContent className="grid md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <Gift className="h-8 w-8 mx-auto mb-2 text-green-500" />
              <p className="font-medium">Earn 10 points</p>
              <p className="text-sm text-muted-foreground">For every £1 spent</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <Star className="h-8 w-8 mx-auto mb-2 text-yellow-500" />
              <p className="font-medium">Earn 50 points</p>
              <p className="text-sm text-muted-foreground">For each review you leave</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <Coins className="h-8 w-8 mx-auto mb-2 text-primary" />
              <p className="font-medium">Redeem 100 points</p>
              <p className="text-sm text-muted-foreground">For £1 off (min. 500 points)</p>
            </div>
          </CardContent>
        </Card>

        {/* Transaction History */}
        <Card>
          <CardHeader>
            <CardTitle>Points History</CardTitle>
            <CardDescription>Your earning and spending activity</CardDescription>
          </CardHeader>
          <CardContent>
            {!history || history.transactions.length === 0 ? (
              <div className="text-center py-8">
                <Coins className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No transactions yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Start earning points by making purchases or leaving reviews!
                </p>
                <Button asChild className="mt-4">
                  <Link href="/products">Browse Products</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {history.transactions.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${tx.amount > 0 ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                        {getTypeIcon(tx.type, tx.amount)}
                      </div>
                      <div>
                        <p className="font-medium">{tx.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(tx.createdAt).toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {tx.amount > 0 ? (
                        <ArrowUp className="h-4 w-4 text-green-500" />
                      ) : (
                        <ArrowDown className="h-4 w-4 text-red-500" />
                      )}
                      <Badge
                        variant={tx.amount > 0 ? 'default' : 'destructive'}
                        className="font-mono"
                      >
                        {tx.amount > 0 ? '+' : ''}{tx.amount}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
