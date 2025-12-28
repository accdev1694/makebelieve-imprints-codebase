'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import apiClient from '@/lib/api/client';
import Link from 'next/link';

function AccountSettingsContent() {
  const router = useRouter();
  const { user, refetch } = useAuth();

  const [name, setName] = useState(user?.name || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (user?.name) {
      setName(user.name);
    }
  }, [user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!name.trim()) {
      setError('Name cannot be empty');
      return;
    }

    if (name === user?.name) {
      setError('No changes to save');
      return;
    }

    setLoading(true);

    try {
      await apiClient.put('/users/me', { name: name.trim() });
      setSuccess('Profile updated successfully!');

      // Refresh user data in context
      await refetch();
    } catch (err: any) {
      setError(err?.error || err?.message || 'Failed to update profile');
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
            <Link href="/dashboard">
              <Button variant="ghost" size="sm">
                ← Back to Dashboard
              </Button>
            </Link>
            <h1 className="text-2xl font-bold">
              <span className="text-neon-gradient">Account Settings</span>
            </h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-3xl">
        {error && (
          <div className="bg-destructive/10 border border-destructive/50 text-destructive px-4 py-3 rounded-lg text-sm mb-6">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-500/10 border border-green-500/50 text-green-500 px-4 py-3 rounded-lg text-sm mb-6">
            {success}
          </div>
        )}

        {/* Profile Information */}
        <Card className="card-glow mb-6">
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
            <CardDescription>Update your account details</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-foreground mb-2">
                  Full Name
                </label>
                <Input
                  id="name"
                  type="text"
                  placeholder="John Smith"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-card/50"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
                  Email Address
                </label>
                <Input
                  id="email"
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="bg-muted/50 cursor-not-allowed"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Email cannot be changed for security reasons
                </p>
              </div>

              <Separator />

              <Button
                type="submit"
                className="btn-gradient"
                loading={loading}
                disabled={name === user?.name}
              >
                Save Changes
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Account Information */}
        <Card className="card-glow mb-6">
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
            <CardDescription>Your account details and status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Account Type</p>
                  <Badge
                    variant={user?.userType === 'PRINTER_ADMIN' ? 'destructive' : 'default'}
                    className="px-3 py-1"
                  >
                    {user?.userType === 'PRINTER_ADMIN' ? 'Admin' : 'Customer'}
                  </Badge>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground mb-1">Member Since</p>
                  <p className="font-medium">
                    {user?.createdAt
                      ? new Date(user.createdAt).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })
                      : 'N/A'}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground mb-1">User ID</p>
                  <p className="font-mono text-xs break-all">{user?.id}</p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground mb-1">Account Status</p>
                  <Badge
                    variant="default"
                    className="bg-green-500/10 text-green-500 border-green-500/50"
                  >
                    Active
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card className="card-glow mb-6">
          <CardHeader>
            <CardTitle>Security</CardTitle>
            <CardDescription>Manage your password and security settings</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Password</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  Your password is securely encrypted. For security reasons, we cannot display your
                  current password.
                </p>
                <Button variant="outline" disabled>
                  Change Password (Coming Soon)
                </Button>
              </div>

              <Separator />

              <div>
                <h4 className="font-medium mb-2">Account Security</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-md bg-green-500"></div>
                    <span className="text-muted-foreground">Password is encrypted with bcrypt</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-md bg-green-500"></div>
                    <span className="text-muted-foreground">Secure JWT authentication enabled</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-md bg-green-500"></div>
                    <span className="text-muted-foreground">Sessions expire after 7 days</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Preferences */}
        <Card className="card-glow">
          <CardHeader>
            <CardTitle>Preferences</CardTitle>
            <CardDescription>Customize your experience</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Email Notifications</p>
                  <p className="text-sm text-muted-foreground">Receive updates about your orders</p>
                </div>
                <Badge variant="outline">Coming Soon</Badge>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Marketing Emails</p>
                  <p className="text-sm text-muted-foreground">
                    Receive promotional offers and updates
                  </p>
                </div>
                <Badge variant="outline">Coming Soon</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

export default function AccountSettingsPage() {
  return (
    <ProtectedRoute>
      <AccountSettingsContent />
    </ProtectedRoute>
  );
}
