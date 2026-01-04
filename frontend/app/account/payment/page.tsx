'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { CreditCard, Plus, Trash2, Check, Shield } from 'lucide-react';

interface PaymentMethod {
  id: string;
  type: 'card' | 'paypal';
  last4?: string;
  brand?: string;
  expiryMonth?: number;
  expiryYear?: number;
  email?: string;
  isDefault: boolean;
}

export default function PaymentMethodsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login?redirect=/account/payment');
    }
  }, [user, authLoading, router]);

  // Load payment methods (mock data for now)
  useEffect(() => {
    if (user) {
      // TODO: Fetch from API (Stripe/payment provider)
      setPaymentMethods([
        {
          id: '1',
          type: 'card',
          last4: '4242',
          brand: 'Visa',
          expiryMonth: 12,
          expiryYear: 2026,
          isDefault: true,
        },
        {
          id: '2',
          type: 'card',
          last4: '5555',
          brand: 'Mastercard',
          expiryMonth: 6,
          expiryYear: 2025,
          isDefault: false,
        },
        {
          id: '3',
          type: 'paypal',
          email: 'john.doe@example.com',
          isDefault: false,
        },
      ]);
      setLoading(false);
    }
  }, [user]);

  const handleSetDefault = (methodId: string) => {
    setPaymentMethods(paymentMethods.map(method => ({
      ...method,
      isDefault: method.id === methodId,
    })));
    // TODO: Update via API
  };

  const handleDelete = (methodId: string) => {
    const method = paymentMethods.find(m => m.id === methodId);
    if (method?.isDefault) {
      alert('Cannot delete default payment method. Please set another method as default first.');
      return;
    }
    if (confirm('Are you sure you want to remove this payment method?')) {
      setPaymentMethods(paymentMethods.filter(m => m.id !== methodId));
      // TODO: Delete via API
    }
  };

  const getCardIcon = (brand?: string) => {
    // In a real app, you'd use actual card brand icons
    return <CreditCard className="h-8 w-8" />;
  };

  if (authLoading || loading) {
    return (
      <main className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-16 text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
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
          <span>Payment Methods</span>
        </nav>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Payment Methods</h1>
            <p className="text-muted-foreground">
              Manage your saved payment methods for faster checkout
            </p>
          </div>
          <Button className="gap-2 w-full sm:w-auto">
            <Plus className="h-4 w-4" />
            Add Payment Method
          </Button>
        </div>

        {/* Security Notice */}
        <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-8 flex items-start gap-3">
          <Shield className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-green-800 dark:text-green-200">
              Your payment information is secure
            </p>
            <p className="text-sm text-green-700 dark:text-green-300">
              We use industry-standard encryption to protect your payment details. Card numbers are never stored on our servers.
            </p>
          </div>
        </div>

        {/* Payment Methods List */}
        {paymentMethods.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No payment methods saved</h3>
              <p className="text-muted-foreground mb-6">
                Add a payment method for faster checkout.
              </p>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Add Payment Method
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {paymentMethods.map((method) => (
              <Card key={method.id} className={method.isDefault ? 'ring-2 ring-primary' : ''}>
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-8 bg-muted rounded flex items-center justify-center">
                        {method.type === 'card' ? (
                          getCardIcon(method.brand)
                        ) : (
                          <span className="text-xs font-bold text-blue-600">PayPal</span>
                        )}
                      </div>
                      <div>
                        {method.type === 'card' ? (
                          <>
                            <p className="font-medium">
                              {method.brand} ending in {method.last4}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Expires {method.expiryMonth?.toString().padStart(2, '0')}/{method.expiryYear}
                            </p>
                          </>
                        ) : (
                          <>
                            <p className="font-medium">PayPal</p>
                            <p className="text-sm text-muted-foreground">{method.email}</p>
                          </>
                        )}
                      </div>
                      {method.isDefault && (
                        <span className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                          <Check className="h-3 w-3" />
                          Default
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {!method.isDefault && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSetDefault(method.id)}
                        >
                          Set as Default
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(method.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Add Payment Method Options */}
        <div className="mt-8">
          <h2 className="text-lg font-semibold mb-4">Add a new payment method</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <button className="p-4 border rounded-lg hover:border-primary hover:bg-accent transition-colors text-left">
              <CreditCard className="h-6 w-6 mb-2" />
              <p className="font-medium">Credit or Debit Card</p>
              <p className="text-sm text-muted-foreground">Visa, Mastercard, Amex</p>
            </button>
            <button className="p-4 border rounded-lg hover:border-primary hover:bg-accent transition-colors text-left">
              <div className="h-6 w-6 mb-2 text-blue-600 font-bold text-sm">PP</div>
              <p className="font-medium">PayPal</p>
              <p className="text-sm text-muted-foreground">Link your PayPal account</p>
            </button>
            <button className="p-4 border rounded-lg hover:border-primary hover:bg-accent transition-colors text-left">
              <div className="h-6 w-6 mb-2 text-black font-bold text-sm">G</div>
              <p className="font-medium">Google Pay</p>
              <p className="text-sm text-muted-foreground">Fast checkout with Google</p>
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
