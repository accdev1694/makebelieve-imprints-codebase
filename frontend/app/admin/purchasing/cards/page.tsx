'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import apiClient from '@/lib/api/client';
import Link from 'next/link';
import { createLogger } from '@/lib/logger';
import {
  CreditCard,
  Plus,
  Snowflake,
  Play,
  Trash2,
  AlertCircle,
  Loader2,
} from 'lucide-react';

interface VirtualCard {
  id: string;
  stripeCardId: string;
  name: string;
  last4: string;
  expiryMonth: number;
  expiryYear: number;
  spendingLimit: number;
  status: 'ACTIVE' | 'FROZEN' | 'CANCELLED';
  createdAt: string;
  transactionCount: number;
  totalSpent: number;
}

const logger = createLogger('virtual-cards');

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-green-500/10 text-green-500 border-green-500/50',
  FROZEN: 'bg-blue-500/10 text-blue-500 border-blue-500/50',
  CANCELLED: 'bg-red-500/10 text-red-500 border-red-500/50',
};

function VirtualCardsContent() {
  const router = useRouter();
  const { user } = useAuth();

  const [cards, setCards] = useState<VirtualCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [issuingEnabled, setIssuingEnabled] = useState(false);

  // Create card form
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newCardName, setNewCardName] = useState('');
  const [newCardLimit, setNewCardLimit] = useState('500');

  // Action loading
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (user && user.userType !== 'PRINTER_ADMIN') {
      router.push('/dashboard');
    }
  }, [user, router]);

  useEffect(() => {
    fetchCards();
  }, []);

  const fetchCards = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get<{
        success: boolean;
        data: { enabled: boolean; cards: VirtualCard[]; message?: string };
      }>('/admin/purchasing/cards');

      if (response.data.success) {
        setIssuingEnabled(response.data.data.enabled);
        setCards(response.data.data.cards || []);
      }
    } catch (err) {
      setError('Failed to load cards');
      logger.error('Fetch cards error', { error: err });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCard = async () => {
    if (!newCardName.trim() || !newCardLimit) return;

    setCreating(true);
    setError('');

    try {
      const response = await apiClient.post<{ success: boolean; error?: string }>(
        '/admin/purchasing/cards',
        {
          name: newCardName.trim(),
          spendingLimit: parseFloat(newCardLimit),
        }
      );

      if (response.data.success) {
        setShowCreateDialog(false);
        setNewCardName('');
        setNewCardLimit('500');
        fetchCards();
      } else {
        setError(response.data.error || 'Failed to create card');
      }
    } catch (err) {
      setError('Failed to create card');
      logger.error('Create card error', { error: err });
    } finally {
      setCreating(false);
    }
  };

  const handleCardAction = async (cardId: string, action: string) => {
    setActionLoading(cardId);
    setError('');

    try {
      await apiClient.put(`/admin/purchasing/cards/${cardId}`, { action });
      fetchCards();
    } catch (err) {
      setError(`Failed to ${action} card`);
      logger.error('Card action error', { action, cardId, error: err });
    } finally {
      setActionLoading(null);
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
              <span className="text-neon-gradient">Virtual Cards</span>
            </h1>
          </div>

          {issuingEnabled && (
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button className="btn-gradient">
                  <Plus className="w-4 h-4 mr-2" />
                  New Card
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Virtual Card</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div>
                    <Label htmlFor="cardName">Card Name</Label>
                    <Input
                      id="cardName"
                      placeholder="e.g., Supplies Card"
                      value={newCardName}
                      onChange={(e) => setNewCardName(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="spendingLimit">Spending Limit (£)</Label>
                    <Input
                      id="spendingLimit"
                      type="number"
                      placeholder="500"
                      value={newCardLimit}
                      onChange={(e) => setNewCardLimit(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Maximum amount per transaction
                    </p>
                  </div>
                  <Button
                    onClick={handleCreateCard}
                    disabled={creating || !newCardName.trim()}
                    className="w-full btn-gradient"
                  >
                    {creating ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <CreditCard className="w-4 h-4 mr-2" />
                    )}
                    Create Card
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {error && (
          <div className="bg-destructive/10 border border-destructive/50 text-destructive px-4 py-3 rounded-lg flex items-center gap-2 mb-6">
            <AlertCircle className="w-5 h-5" />
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
              <p className="text-muted-foreground">Loading cards...</p>
            </div>
          </div>
        ) : !issuingEnabled ? (
          <Card className="card-glow">
            <CardContent className="py-20 text-center">
              <AlertCircle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Stripe Issuing Not Enabled</h3>
              <p className="text-muted-foreground max-w-md mx-auto mb-6">
                Virtual cards require Stripe Issuing approval. This typically takes 1-2 weeks
                after applying through the Stripe Dashboard.
              </p>
              <Button
                variant="outline"
                onClick={() =>
                  window.open('https://dashboard.stripe.com/issuing', '_blank')
                }
              >
                Apply for Stripe Issuing
              </Button>
            </CardContent>
          </Card>
        ) : cards.length === 0 ? (
          <Card className="card-glow">
            <CardContent className="py-20 text-center">
              <CreditCard className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Virtual Cards</h3>
              <p className="text-muted-foreground mb-6">
                Create your first virtual card to start making purchases
              </p>
              <Button onClick={() => setShowCreateDialog(true)} className="btn-gradient">
                <Plus className="w-4 h-4 mr-2" />
                Create Card
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {cards.map((card) => (
              <Card key={card.id} className="card-glow">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{card.name}</CardTitle>
                    <Badge variant="outline" className={STATUS_COLORS[card.status]}>
                      {card.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Card Visual */}
                  <div className="bg-gradient-to-br from-primary/20 to-primary/5 rounded-lg p-4 mb-4">
                    <div className="flex justify-between items-start mb-6">
                      <CreditCard className="w-8 h-8 text-primary" />
                      <span className="text-xs text-muted-foreground">Virtual Card</span>
                    </div>
                    <p className="font-mono text-lg tracking-wider mb-2">
                      •••• •••• •••• {card.last4}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Exp: {card.expiryMonth.toString().padStart(2, '0')}/{card.expiryYear}
                    </p>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Spending Limit</p>
                      <p className="font-semibold">£{card.spendingLimit.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Total Spent</p>
                      <p className="font-semibold text-primary">
                        £{card.totalSpent.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Transactions</p>
                      <p className="font-semibold">{card.transactionCount}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Created</p>
                      <p className="font-semibold text-sm">
                        {new Date(card.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  {card.status !== 'CANCELLED' && (
                    <div className="flex gap-2">
                      {card.status === 'ACTIVE' ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCardAction(card.id, 'freeze')}
                          disabled={actionLoading === card.id}
                          className="flex-1"
                        >
                          {actionLoading === card.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <Snowflake className="w-4 h-4 mr-1" />
                              Freeze
                            </>
                          )}
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCardAction(card.id, 'unfreeze')}
                          disabled={actionLoading === card.id}
                          className="flex-1"
                        >
                          {actionLoading === card.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <Play className="w-4 h-4 mr-1" />
                              Unfreeze
                            </>
                          )}
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleCardAction(card.id, 'cancel')}
                        disabled={actionLoading === card.id}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default function VirtualCardsPage() {
  return (
    <ProtectedRoute>
      <VirtualCardsContent />
    </ProtectedRoute>
  );
}
