'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import apiClient from '@/lib/api/client';
import Link from 'next/link';
import { Receipt, Loader2, ExternalLink, CheckCircle2, Clock, XCircle, RotateCcw } from 'lucide-react';

interface Transaction {
  id: string;
  cardLast4: string;
  merchantName: string;
  merchantCategory?: string;
  amount: number;
  currency: string;
  status: 'PENDING' | 'COMPLETED' | 'DECLINED' | 'REFUNDED';
  createdAt: string;
  expenseId?: string;
}

const STATUS_CONFIG: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  PENDING: { icon: Clock, color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/50', label: 'Pending' },
  COMPLETED: { icon: CheckCircle2, color: 'bg-green-500/10 text-green-500 border-green-500/50', label: 'Completed' },
  DECLINED: { icon: XCircle, color: 'bg-red-500/10 text-red-500 border-red-500/50', label: 'Declined' },
  REFUNDED: { icon: RotateCcw, color: 'bg-orange-500/10 text-orange-500 border-orange-500/50', label: 'Refunded' },
};

function TransactionsContent() {
  const router = useRouter();
  const { user } = useAuth();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user && user.userType !== 'PRINTER_ADMIN') {
      router.push('/dashboard');
    }
  }, [user, router]);

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get<{
        success: boolean;
        data: { transactions: Transaction[] };
      }>('/admin/purchasing/transactions');

      if (response.data.success) {
        setTransactions(response.data.data.transactions);
      }
    } catch (err) {
      setError('Failed to load transactions');
      console.error('Fetch transactions error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (user && user.userType !== 'PRINTER_ADMIN') {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin/purchasing">
              <Button variant="ghost" size="sm">
                ← Back to Purchasing
              </Button>
            </Link>
            <h1 className="text-2xl font-bold">
              <span className="text-neon-gradient">Transactions</span>
            </h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
              <p className="text-muted-foreground">Loading transactions...</p>
            </div>
          </div>
        ) : error ? (
          <Card className="card-glow">
            <CardContent className="py-20 text-center">
              <p className="text-destructive">{error}</p>
              <Button variant="outline" onClick={fetchTransactions} className="mt-4">
                Try Again
              </Button>
            </CardContent>
          </Card>
        ) : transactions.length === 0 ? (
          <Card className="card-glow">
            <CardContent className="py-20 text-center">
              <Receipt className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Transactions Yet</h3>
              <p className="text-muted-foreground mb-6">
                Transactions will appear here when you make purchases with your virtual cards
              </p>
              <Link href="/admin/purchasing/search">
                <Button className="btn-gradient">Search for Products</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <Card className="card-glow">
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">Total Transactions</p>
                  <p className="text-2xl font-bold">{transactions.length}</p>
                </CardContent>
              </Card>
              <Card className="card-glow">
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">Completed</p>
                  <p className="text-2xl font-bold text-green-500">
                    {transactions.filter((t) => t.status === 'COMPLETED').length}
                  </p>
                </CardContent>
              </Card>
              <Card className="card-glow">
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">Pending</p>
                  <p className="text-2xl font-bold text-yellow-500">
                    {transactions.filter((t) => t.status === 'PENDING').length}
                  </p>
                </CardContent>
              </Card>
              <Card className="card-glow">
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">Total Spent</p>
                  <p className="text-2xl font-bold text-primary">
                    £
                    {transactions
                      .filter((t) => t.status === 'COMPLETED')
                      .reduce((sum, t) => sum + t.amount, 0)
                      .toFixed(2)}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Transaction List */}
            <Card className="card-glow">
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  {transactions.map((transaction) => {
                    const statusConfig = STATUS_CONFIG[transaction.status];
                    const StatusIcon = statusConfig.icon;

                    return (
                      <div
                        key={transaction.id}
                        className="p-4 hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          {/* Status Icon */}
                          <div
                            className={`p-2 rounded-lg ${statusConfig.color.replace(
                              'text-',
                              'bg-'
                            )} bg-opacity-10`}
                          >
                            <StatusIcon className={`w-5 h-5 ${statusConfig.color.split(' ')[1]}`} />
                          </div>

                          {/* Details */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium truncate">{transaction.merchantName}</p>
                              <Badge variant="outline" className={statusConfig.color}>
                                {statusConfig.label}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <span>Card ****{transaction.cardLast4}</span>
                              {transaction.merchantCategory && (
                                <>
                                  <span>•</span>
                                  <span className="capitalize">
                                    {transaction.merchantCategory.replace(/_/g, ' ').toLowerCase()}
                                  </span>
                                </>
                              )}
                              <span>•</span>
                              <span>
                                {new Date(transaction.createdAt).toLocaleDateString('en-GB', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>
                          </div>

                          {/* Amount and Expense Link */}
                          <div className="text-right">
                            <p className="font-semibold text-lg">
                              {transaction.currency === 'GBP' ? '£' : transaction.currency}
                              {transaction.amount.toFixed(2)}
                            </p>
                            {transaction.expenseId && (
                              <Link
                                href={`/admin/accounting/expenses?highlight=${transaction.expenseId}`}
                                className="text-xs text-primary hover:underline flex items-center justify-end gap-1"
                              >
                                <ExternalLink className="w-3 h-3" />
                                View Expense
                              </Link>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}

export default function TransactionsPage() {
  return (
    <ProtectedRoute>
      <TransactionsContent />
    </ProtectedRoute>
  );
}
