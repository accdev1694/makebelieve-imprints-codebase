'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import apiClient from '@/lib/api/client';
import Link from 'next/link';
import {
  CreditCard,
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  Loader2,
  ExternalLink,
  Receipt,
  Filter,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface WiseTransaction {
  id: string;
  wiseTransactionId: string;
  type: string;
  status: string;
  direction: 'INCOMING' | 'OUTGOING';
  amount: number;
  currency: string;
  amountInGBP: number | null;
  merchantName: string | null;
  merchantCategory: string | null;
  description: string | null;
  cardLast4: string | null;
  transactionDate: string;
  expense: {
    id: string;
    expenseNumber: string;
    category: string;
  } | null;
  account: {
    id: string;
    name: string;
    profileType: string;
  };
}

interface WiseAccount {
  id: string;
  name: string;
  profileType: string;
}

const TYPE_LABELS: Record<string, string> = {
  CARD_PAYMENT: 'Card Payment',
  CARD_REFUND: 'Card Refund',
  TRANSFER_OUT: 'Transfer Out',
  TRANSFER_IN: 'Transfer In',
  CONVERSION: 'Currency Conversion',
  DIRECT_DEBIT: 'Direct Debit',
  ATM_WITHDRAWAL: 'ATM Withdrawal',
  FEE: 'Fee',
  OTHER: 'Other',
};

const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  PENDING: { color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/50', label: 'Pending' },
  COMPLETED: { color: 'bg-green-500/10 text-green-500 border-green-500/50', label: 'Completed' },
  CANCELLED: { color: 'bg-gray-500/10 text-gray-500 border-gray-500/50', label: 'Cancelled' },
  FAILED: { color: 'bg-red-500/10 text-red-500 border-red-500/50', label: 'Failed' },
  REFUNDED: { color: 'bg-orange-500/10 text-orange-500 border-orange-500/50', label: 'Refunded' },
};

function WiseTransactionsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const [transactions, setTransactions] = useState<WiseTransaction[]>([]);
  const [accounts, setAccounts] = useState<WiseAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters and pagination
  const [selectedAccount, setSelectedAccount] = useState<string>(
    searchParams.get('accountId') || 'all'
  );
  const [selectedType, setSelectedType] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const limit = 25;

  useEffect(() => {
    if (user && user.userType !== 'PRINTER_ADMIN') {
      router.push('/dashboard');
    }
  }, [user, router]);

  // Fetch accounts for filter
  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const response = await apiClient.get<{
          success: boolean;
          data: { accounts: WiseAccount[] };
        }>('/admin/wise/accounts');

        if (response.data.success) {
          setAccounts(response.data.data.accounts);
        }
      } catch (err) {
        console.error('Fetch accounts error:', err);
      }
    };

    fetchAccounts();
  }, []);

  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();

      if (selectedAccount !== 'all') {
        params.set('accountId', selectedAccount);
      }
      if (selectedType !== 'all') {
        params.set('type', selectedType);
      }
      params.set('limit', String(limit));
      params.set('offset', String((page - 1) * limit));

      const response = await apiClient.get<{
        success: boolean;
        data: {
          transactions: WiseTransaction[];
          pagination: {
            total: number;
            hasMore: boolean;
          };
        };
      }>(`/admin/wise/transactions?${params}`);

      if (response.data.success) {
        setTransactions(response.data.data.transactions);
        setTotal(response.data.data.pagination.total);
        setHasMore(response.data.data.pagination.hasMore);
      }
    } catch (err) {
      setError('Failed to load transactions');
      console.error('Fetch transactions error:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedAccount, selectedType, page]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency,
    }).format(amount);
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
            <Link href="/admin/wise">
              <Button variant="ghost" size="sm">
                ← Back to Wise
              </Button>
            </Link>
            <h1 className="text-2xl font-bold">
              <span className="text-neon-gradient">Wise Transactions</span>
            </h1>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchTransactions}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Filters */}
        <Card className="card-glow mb-6">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Filters:</span>
              </div>

              <Select value={selectedAccount} onValueChange={(v) => { setSelectedAccount(v); setPage(1); }}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Accounts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Accounts</SelectItem>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedType} onValueChange={(v) => { setSelectedType(v); setPage(1); }}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="CARD_PAYMENT">Card Payments</SelectItem>
                  <SelectItem value="TRANSFER_OUT">Transfers Out</SelectItem>
                  <SelectItem value="TRANSFER_IN">Transfers In</SelectItem>
                  <SelectItem value="DIRECT_DEBIT">Direct Debits</SelectItem>
                  <SelectItem value="CONVERSION">Conversions</SelectItem>
                </SelectContent>
              </Select>

              <div className="ml-auto text-sm text-muted-foreground">
                {total} transaction{total !== 1 ? 's' : ''}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Transactions List */}
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
              <CreditCard className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Transactions Found</h3>
              <p className="text-muted-foreground">
                {selectedAccount !== 'all' || selectedType !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Transactions will appear here after syncing your Wise account'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card className="card-glow">
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  {transactions.map((tx) => {
                    const statusConfig = STATUS_CONFIG[tx.status] || STATUS_CONFIG.COMPLETED;
                    const isOutgoing = tx.direction === 'OUTGOING';

                    return (
                      <div
                        key={tx.id}
                        className="p-4 hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          {/* Direction Icon */}
                          <div
                            className={`p-2 rounded-lg ${
                              isOutgoing
                                ? 'bg-red-500/10'
                                : 'bg-green-500/10'
                            }`}
                          >
                            {isOutgoing ? (
                              <ArrowUpRight className="w-5 h-5 text-red-500" />
                            ) : (
                              <ArrowDownLeft className="w-5 h-5 text-green-500" />
                            )}
                          </div>

                          {/* Details */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium truncate">
                                {tx.merchantName || tx.description || 'Unknown'}
                              </p>
                              <Badge variant="outline" className={statusConfig.color}>
                                {statusConfig.label}
                              </Badge>
                              <Badge variant="outline" className="bg-muted/50">
                                {TYPE_LABELS[tx.type] || tx.type}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                              <span>{tx.account.name}</span>
                              {tx.cardLast4 && (
                                <>
                                  <span>•</span>
                                  <span>Card ****{tx.cardLast4}</span>
                                </>
                              )}
                              {tx.merchantCategory && (
                                <>
                                  <span>•</span>
                                  <span className="capitalize">
                                    {tx.merchantCategory.replace(/_/g, ' ').toLowerCase()}
                                  </span>
                                </>
                              )}
                              <span>•</span>
                              <span>
                                {new Date(tx.transactionDate).toLocaleDateString('en-GB', {
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
                            <p
                              className={`font-semibold text-lg ${
                                isOutgoing ? 'text-red-500' : 'text-green-500'
                              }`}
                            >
                              {isOutgoing ? '-' : '+'}
                              {formatCurrency(Number(tx.amount), tx.currency)}
                            </p>
                            {tx.amountInGBP && tx.currency !== 'GBP' && (
                              <p className="text-xs text-muted-foreground">
                                ≈ {formatCurrency(Number(tx.amountInGBP), 'GBP')}
                              </p>
                            )}
                            {tx.expense ? (
                              <Link
                                href={`/admin/accounting/expenses?highlight=${tx.expense.id}`}
                                className="text-xs text-primary hover:underline flex items-center justify-end gap-1 mt-1"
                              >
                                <Receipt className="w-3 h-3" />
                                {tx.expense.expenseNumber}
                              </Link>
                            ) : isOutgoing && tx.status === 'COMPLETED' ? (
                              <span className="text-xs text-muted-foreground mt-1 block">
                                No expense linked
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-6">
              <p className="text-sm text-muted-foreground">
                Showing {(page - 1) * limit + 1} - {Math.min(page * limit, total)} of {total}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={!hasMore}
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default function WiseTransactionsPage() {
  return (
    <ProtectedRoute>
      <WiseTransactionsContent />
    </ProtectedRoute>
  );
}
