'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { MapPin, Plus, Pencil, Trash2, Check, Home, Building2 } from 'lucide-react';

interface Address {
  id: string;
  label: string;
  firstName: string;
  lastName: string;
  company?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  county?: string;
  postcode: string;
  country: string;
  phone?: string;
  isDefault: boolean;
  type: 'shipping' | 'billing' | 'both';
}

export default function AddressBookPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login?redirect=/account/addresses');
    }
  }, [user, authLoading, router]);

  // Load addresses (mock data for now)
  useEffect(() => {
    if (user) {
      // TODO: Fetch from API
      setAddresses([
        {
          id: '1',
          label: 'Home',
          firstName: 'John',
          lastName: 'Doe',
          addressLine1: '123 Main Street',
          addressLine2: 'Flat 4B',
          city: 'London',
          county: 'Greater London',
          postcode: 'SW1A 1AA',
          country: 'United Kingdom',
          phone: '+44 20 7946 0958',
          isDefault: true,
          type: 'both',
        },
        {
          id: '2',
          label: 'Office',
          firstName: 'John',
          lastName: 'Doe',
          company: 'Acme Corp',
          addressLine1: '456 Business Park',
          city: 'Manchester',
          county: 'Greater Manchester',
          postcode: 'M1 1AA',
          country: 'United Kingdom',
          phone: '+44 161 123 4567',
          isDefault: false,
          type: 'shipping',
        },
      ]);
      setLoading(false);
    }
  }, [user]);

  const handleSetDefault = (addressId: string) => {
    setAddresses(addresses.map(addr => ({
      ...addr,
      isDefault: addr.id === addressId,
    })));
    // TODO: Update via API
  };

  const handleDelete = (addressId: string) => {
    if (confirm('Are you sure you want to delete this address?')) {
      setAddresses(addresses.filter(addr => addr.id !== addressId));
      // TODO: Delete via API
    }
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
          <span>Address Book</span>
        </nav>

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Address Book</h1>
            <p className="text-muted-foreground">
              Manage your shipping and billing addresses
            </p>
          </div>
          <Button onClick={() => setShowForm(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Address
          </Button>
        </div>

        {/* Addresses Grid */}
        {addresses.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No addresses saved</h3>
              <p className="text-muted-foreground mb-6">
                Add your first address to make checkout faster.
              </p>
              <Button onClick={() => setShowForm(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Address
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {addresses.map((address) => (
              <Card key={address.id} className={address.isDefault ? 'ring-2 ring-primary' : ''}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      {address.label === 'Home' ? (
                        <Home className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                      )}
                      <CardTitle className="text-lg">{address.label}</CardTitle>
                    </div>
                    {address.isDefault && (
                      <span className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                        <Check className="h-3 w-3" />
                        Default
                      </span>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-sm space-y-1 mb-4">
                    <p className="font-medium">{address.firstName} {address.lastName}</p>
                    {address.company && <p className="text-muted-foreground">{address.company}</p>}
                    <p>{address.addressLine1}</p>
                    {address.addressLine2 && <p>{address.addressLine2}</p>}
                    <p>{address.city}, {address.county}</p>
                    <p>{address.postcode}</p>
                    <p>{address.country}</p>
                    {address.phone && <p className="text-muted-foreground">{address.phone}</p>}
                  </div>

                  <div className="flex items-center gap-2 pt-4 border-t">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingAddress(address)}
                      className="gap-1"
                    >
                      <Pencil className="h-3 w-3" />
                      Edit
                    </Button>
                    {!address.isDefault && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSetDefault(address.id)}
                        >
                          Set as Default
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(address.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Add/Edit Form Modal would go here */}
        {(showForm || editingAddress) && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <CardHeader>
                <CardTitle>{editingAddress ? 'Edit Address' : 'Add New Address'}</CardTitle>
              </CardHeader>
              <CardContent>
                <form className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">First Name</label>
                      <input
                        type="text"
                        className="w-full mt-1 px-3 py-2 border rounded-lg"
                        defaultValue={editingAddress?.firstName}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Last Name</label>
                      <input
                        type="text"
                        className="w-full mt-1 px-3 py-2 border rounded-lg"
                        defaultValue={editingAddress?.lastName}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Company (Optional)</label>
                    <input
                      type="text"
                      className="w-full mt-1 px-3 py-2 border rounded-lg"
                      defaultValue={editingAddress?.company}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Address Line 1</label>
                    <input
                      type="text"
                      className="w-full mt-1 px-3 py-2 border rounded-lg"
                      defaultValue={editingAddress?.addressLine1}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Address Line 2 (Optional)</label>
                    <input
                      type="text"
                      className="w-full mt-1 px-3 py-2 border rounded-lg"
                      defaultValue={editingAddress?.addressLine2}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">City</label>
                      <input
                        type="text"
                        className="w-full mt-1 px-3 py-2 border rounded-lg"
                        defaultValue={editingAddress?.city}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">County</label>
                      <input
                        type="text"
                        className="w-full mt-1 px-3 py-2 border rounded-lg"
                        defaultValue={editingAddress?.county}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Postcode</label>
                      <input
                        type="text"
                        className="w-full mt-1 px-3 py-2 border rounded-lg"
                        defaultValue={editingAddress?.postcode}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Phone</label>
                      <input
                        type="tel"
                        className="w-full mt-1 px-3 py-2 border rounded-lg"
                        defaultValue={editingAddress?.phone}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="setDefault" />
                    <label htmlFor="setDefault" className="text-sm">Set as default address</label>
                  </div>
                  <div className="flex justify-end gap-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowForm(false);
                        setEditingAddress(null);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button type="submit">
                      {editingAddress ? 'Save Changes' : 'Add Address'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </main>
  );
}
