'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { ProductForm } from '@/components/admin/products/ProductForm';
import { productsService, CreateProductData, UpdateProductData } from '@/lib/api/products';

function NewProductContent() {
  const { user } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  // Redirect non-admin users
  useEffect(() => {
    if (user && user.userType !== 'PRINTER_ADMIN') {
      router.push('/dashboard');
    }
  }, [user, router]);

  const handleSave = async (data: CreateProductData | UpdateProductData) => {
    setIsLoading(true);

    try {
      const product = await productsService.create(data as CreateProductData);
      // Redirect to edit page to manage variants and images
      router.push(`/admin/products/${product.id}`);
    } catch (err) {
      setIsLoading(false);
      throw err;
    }
  };

  const handleCancel = () => {
    router.push('/admin/products');
  };

  if (!user || user.userType !== 'PRINTER_ADMIN') {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <ProductForm
          onSave={handleSave}
          onCancel={handleCancel}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}

export default function NewProductPage() {
  return (
    <ProtectedRoute requireAdmin>
      <NewProductContent />
    </ProtectedRoute>
  );
}
