'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import apiClient from '@/lib/api/client';
import Link from 'next/link';

interface Customer {
  id: string;
  email: string;
  name: string;
  type: string;
  createdAt: string;
  _count: {
    orders: number;
    designs: number;
  };
}

interface CustomersResponse {
  users: Customer[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

function AdminCustomersContent() {
  const router = useRouter();
  const { user } = useAuth();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCustomers, setTotalCustomers] = useState(0);

  // Redirect if not admin
  useEffect(() => {
    if (user && user.userType !== 'PRINTER_ADMIN') {
      router.push('/dashboard');
    }
  }, [user, router]);

  useEffect(() => {
    fetchCustomers();
  }, [currentPage]);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get<{ success: boolean; data: CustomersResponse }>(
        `/users?page=${currentPage}&limit=20`
      );
      setCustomers(response.data.data.users);
      setTotalPages(response.data.data.pagination.totalPages);
      setTotalCustomers(response.data.data.pagination.total);
    } catch (err: any) {
      setError(err?.error || err?.message || 'Failed to load customers');
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
            <Link href="/admin">
              <Button variant="ghost" size="sm">
                ← Back to Admin
              </Button>
            </Link>
            <h1 className="text-2xl font-bold">
              <span className="text-neon-gradient">Customer Management</span>
            </h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {error && (
          <div className="bg-destructive/10 border border-destructive/50 text-destructive px-4 py-3 rounded-lg text-sm mb-6">
            {error}
          </div>
        )}

        {/* Stats */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="card-glow">
            <CardHeader>
              <CardTitle className="text-lg">Total Customers</CardTitle>
              <CardDescription>All registered users</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-primary">{totalCustomers}</p>
            </CardContent>
          </Card>

          <Card className="card-glow">
            <CardHeader>
              <CardTitle className="text-lg">Active Customers</CardTitle>
              <CardDescription>With orders</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-secondary">
                {customers.filter((c) => c._count.orders > 0).length}
              </p>
            </CardContent>
          </Card>

          <Card className="card-glow">
            <CardHeader>
              <CardTitle className="text-lg">New This Month</CardTitle>
              <CardDescription>Recent sign-ups</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-accent">
                {
                  customers.filter((c) => {
                    const created = new Date(c.createdAt);
                    const now = new Date();
                    return (
                      created.getMonth() === now.getMonth() &&
                      created.getFullYear() === now.getFullYear()
                    );
                  }).length
                }
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Customer List */}
        <Card className="card-glow">
          <CardHeader>
            <CardTitle>All Customers</CardTitle>
            <CardDescription>Manage your customer base</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="inline-block animate-spin rounded-md h-8 w-8 border-t-2 border-b-2 border-primary mb-2"></div>
                  <p className="text-sm text-muted-foreground">Loading customers...</p>
                </div>
              </div>
            ) : customers.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No customers yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {customers.map((customer) => (
                  <div
                    key={customer.id}
                    className="flex items-center justify-between p-4 bg-card/30 rounded-lg hover:bg-card/50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-semibold">{customer.name}</h4>
                        {customer.type === 'PRINTER_ADMIN' && (
                          <Badge variant="destructive" className="text-xs">
                            Admin
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{customer.email}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Member since {new Date(customer.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-primary">{customer._count.orders}</p>
                        <p className="text-xs text-muted-foreground">Orders</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-secondary">
                          {customer._count.designs}
                        </p>
                        <p className="text-xs text-muted-foreground">Designs</p>
                      </div>
                      <Button variant="outline" size="sm" disabled>
                        View Profile
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-6 mt-6 border-t border-border">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground px-4">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

export default function AdminCustomersPage() {
  return (
    <ProtectedRoute>
      <AdminCustomersContent />
    </ProtectedRoute>
  );
}
