'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { ProductList } from '@/components/admin/products/ProductList';
import { productsService, ProductsListResponse } from '@/lib/api/products';
import { Category, categoriesService } from '@/lib/api/categories';

function AdminProductsContent() {
  const { user } = useAuth();
  const router = useRouter();
  const [productsData, setProductsData] = useState<ProductsListResponse | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Redirect non-admin users
  useEffect(() => {
    if (user && user.userType !== 'PRINTER_ADMIN') {
      router.push('/dashboard');
    }
  }, [user, router]);

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError('');

        const [products, cats] = await Promise.all([
          productsService.list({ limit: 12 }),
          categoriesService.list({ includeSubcategories: false }),
        ]);

        setProductsData(products);
        setCategories(cats);
      } catch (err: unknown) {
        const error = err as { message?: string };
        setError(error?.message || 'Failed to load products');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (!user || user.userType !== 'PRINTER_ADMIN') {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mb-4"></div>
          <p className="text-muted-foreground">Loading products...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="bg-red-500/10 border border-red-500/50 rounded-md p-4 text-red-500">
          <h2 className="font-medium mb-2">Error loading products</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {productsData && (
          <ProductList initialData={productsData} categories={categories} />
        )}
      </div>
    </div>
  );
}

export default function AdminProductsPage() {
  return (
    <ProtectedRoute requireAdmin>
      <AdminProductsContent />
    </ProtectedRoute>
  );
}
