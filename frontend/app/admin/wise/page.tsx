'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import apiClient from '@/lib/api/client';
import Link from 'next/link';
import {
  Wallet,
  RefreshCw,
  Plus,
  Settings,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ExternalLink,
  Trash2,
} from 'lucide-react';

interface WiseBalance {
  id: string;
  currency: string;
  amount: number;
  reservedAmount: number;
}

interface WiseAccount {
  id: string;
  profileId: string;
  profileType: 'PERSONAL' | 'BUSINESS';
  name: string;
  isActive: boolean;
  lastSyncAt: string | null;
  syncFrequency: number;
  autoCreateExpense: boolean;
  balances: WiseBalance[];
  _count: {
    transactions: number;
  };
}

function WiseDashboardContent() {
  const router = useRouter();
  const { user } = useAuth();

  const [accounts, setAccounts] = useState<WiseAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [error, setError] = useState('');

  // Connect modal state
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [apiToken, setApiToken] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState('');

  useEffect(() => {
    if (user && user.userType !== 'PRINTER_ADMIN') {
      router.push('/dashboard');
    }
  }, [user, router]);

  const fetchAccounts = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient.get<{
        success: boolean;
        data: { accounts: WiseAccount[] };
      }>('/admin/wise/accounts');

      if (response.data.success) {
        setAccounts(response.data.data.accounts);
      }
    } catch (err) {
      setError('Failed to load accounts');
      console.error('Fetch accounts error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const handleConnect = async () => {
    if (!apiToken.trim()) {
      setConnectError('Please enter your Wise API token');
      return;
    }

    setConnecting(true);
    setConnectError('');

    try {
      const response = await apiClient.post<{
        success: boolean;
        error?: string;
      }>('/admin/wise/accounts', { apiToken });

      if (response.data.success) {
        setShowConnectModal(false);
        setApiToken('');
        fetchAccounts();
      } else {
        setConnectError(response.data.error || 'Failed to connect');
      }
    } catch (err) {
      setConnectError('Failed to connect account');
      console.error('Connect error:', err);
    } finally {
      setConnecting(false);
    }
  };

  const handleSync = async (accountId: string) => {
    setSyncing(accountId);

    try {
      await apiClient.post(`/admin/wise/accounts/${accountId}`);
      fetchAccounts();
    } catch (err) {
      console.error('Sync error:', err);
    } finally {
      setSyncing(null);
    }
  };

  const handleToggleAutoExpense = async (accountId: string, enabled: boolean) => {
    try {
      await apiClient.put(`/admin/wise/accounts/${accountId}`, {
        autoCreateExpense: enabled,
      });
      fetchAccounts();
    } catch (err) {
      console.error('Update error:', err);
    }
  };

  const handleDisconnect = async (accountId: string) => {
    if (!confirm('Are you sure you want to disconnect this account?')) {
      return;
    }

    try {
      await apiClient.delete(`/admin/wise/accounts/${accountId}`);
      fetchAccounts();
    } catch (err) {
      console.error('Disconnect error:', err);
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency,
    }).format(amount);
  };

  const getTimeSinceSync = (lastSync: string | null) => {
    if (!lastSync) return 'Never synced';

    const diff = Date.now() - new Date(lastSync).getTime();
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
    return `${Math.floor(minutes / 1440)}d ago`;
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
              <span className="text-neon-gradient">Wise Integration</span>
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/admin/wise/transactions">
              <Button variant="outline" size="sm">
                View All Transactions
              </Button>
            </Link>
            <Button
              onClick={() => setShowConnectModal(true)}
              className="btn-gradient"
              size="sm"
            >
              <Plus className="w-4 h-4 mr-1" />
              Connect Account
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
              <p className="text-muted-foreground">Loading accounts...</p>
            </div>
          </div>
        ) : error ? (
          <Card className="card-glow">
            <CardContent className="py-20 text-center">
              <AlertCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
              <p className="text-destructive">{error}</p>
              <Button variant="outline" onClick={fetchAccounts} className="mt-4">
                Try Again
              </Button>
            </CardContent>
          </Card>
        ) : accounts.length === 0 ? (
          <Card className="card-glow">
            <CardContent className="py-20 text-center">
              <Wallet className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Wise Account Connected</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Connect your Wise account to automatically capture card purchases as expenses.
                Works with both personal and business accounts.
              </p>
              <Button
                onClick={() => setShowConnectModal(true)}
                className="btn-gradient"
              >
                <Plus className="w-4 h-4 mr-2" />
                Connect Wise Account
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Connected Accounts */}
            {accounts.map((account) => (
              <Card key={account.id} className="card-glow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Wallet className="w-5 h-5 text-primary" />
                        {account.name}
                        <Badge
                          variant="outline"
                          className={
                            account.profileType === 'BUSINESS'
                              ? 'bg-purple-500/10 text-purple-500 border-purple-500/50'
                              : 'bg-blue-500/10 text-blue-500 border-blue-500/50'
                          }
                        >
                          {account.profileType}
                        </Badge>
                        {account.isActive ? (
                          <Badge
                            variant="outline"
                            className="bg-green-500/10 text-green-500 border-green-500/50"
                          >
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Active
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="bg-gray-500/10 text-gray-500 border-gray-500/50"
                          >
                            Disconnected
                          </Badge>
                        )}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-4 mt-1">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Last sync: {getTimeSinceSync(account.lastSyncAt)}
                        </span>
                        <span>•</span>
                        <span>{account._count.transactions} transactions</span>
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSync(account.id)}
                        disabled={syncing === account.id}
                      >
                        {syncing === account.id ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-1" />
                        ) : (
                          <RefreshCw className="w-4 h-4 mr-1" />
                        )}
                        Sync Now
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDisconnect(account.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Balances */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    {account.balances.map((balance) => (
                      <div
                        key={balance.id}
                        className="bg-muted/30 rounded-lg p-4"
                      >
                        <p className="text-sm text-muted-foreground">{balance.currency}</p>
                        <p className="text-xl font-bold">
                          {formatCurrency(Number(balance.amount), balance.currency)}
                        </p>
                        {Number(balance.reservedAmount) > 0 && (
                          <p className="text-xs text-muted-foreground">
                            Reserved: {formatCurrency(Number(balance.reservedAmount), balance.currency)}
                          </p>
                        )}
                      </div>
                    ))}
                    {account.balances.length === 0 && (
                      <p className="text-muted-foreground col-span-4">
                        No balances synced yet
                      </p>
                    )}
                  </div>

                  {/* Settings */}
                  <div className="flex items-center justify-between p-4 bg-muted/20 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Settings className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Auto-create expenses</p>
                        <p className="text-sm text-muted-foreground">
                          Automatically create expense entries for card purchases
                        </p>
                      </div>
                    </div>
                    <Button
                      variant={account.autoCreateExpense ? 'default' : 'outline'}
                      size="sm"
                      onClick={() =>
                        handleToggleAutoExpense(account.id, !account.autoCreateExpense)
                      }
                      className={account.autoCreateExpense ? 'bg-green-600 hover:bg-green-700' : ''}
                    >
                      {account.autoCreateExpense ? 'Enabled' : 'Disabled'}
                    </Button>
                  </div>

                  {/* Quick Links */}
                  <div className="flex items-center gap-4 mt-4">
                    <Link href={`/admin/wise/transactions?accountId=${account.id}`}>
                      <Button variant="outline" size="sm">
                        <TrendingDown className="w-4 h-4 mr-1" />
                        View Transactions
                      </Button>
                    </Link>
                    <Link href="/admin/accounting/expenses">
                      <Button variant="outline" size="sm">
                        <TrendingUp className="w-4 h-4 mr-1" />
                        View Expenses
                      </Button>
                    </Link>
                    <a
                      href="https://wise.com/settings/api-tokens"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button variant="ghost" size="sm">
                        <ExternalLink className="w-4 h-4 mr-1" />
                        Wise API Settings
                      </Button>
                    </a>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Info Card */}
            <Card className="border-dashed">
              <CardContent className="py-6">
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <RefreshCw className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Automatic Sync</h4>
                    <p className="text-sm text-muted-foreground">
                      Transactions are synced every 5 minutes. For business accounts with webhooks
                      enabled, transactions appear instantly. Card purchases are automatically
                      converted to expense entries with VAT calculated.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>

      {/* Connect Modal */}
      {showConnectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>Connect Wise Account</CardTitle>
              <CardDescription>
                Enter your Wise API token to connect your account
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  API Token
                </label>
                <Input
                  type="password"
                  placeholder="Enter your Wise API token"
                  value={apiToken}
                  onChange={(e) => setApiToken(e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Get your API token from{' '}
                  <a
                    href="https://wise.com/settings/api-tokens"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Wise Settings → API tokens
                  </a>
                </p>
              </div>

              {connectError && (
                <div className="bg-destructive/10 border border-destructive/50 text-destructive px-4 py-2 rounded-lg text-sm">
                  {connectError}
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowConnectModal(false);
                    setApiToken('');
                    setConnectError('');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleConnect}
                  disabled={connecting}
                  className="btn-gradient"
                >
                  {connecting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Connecting...
                    </>
                  ) : (
                    'Connect'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

export default function WiseDashboardPage() {
  return (
    <ProtectedRoute>
      <WiseDashboardContent />
    </ProtectedRoute>
  );
}
