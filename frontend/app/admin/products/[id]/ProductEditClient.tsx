'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { ProductForm } from '@/components/admin/products/ProductForm';
import {
  Product,
  ProductVariant,
  ProductImage,
  CreateProductData,
  UpdateProductData,
  productsService,
} from '@/lib/api/products';

interface ProductEditClientProps {
  productId: string;
}

function ProductEditContent({ productId }: ProductEditClientProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [images, setImages] = useState<ProductImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Redirect non-admin users
  useEffect(() => {
    if (user && user.userType !== 'PRINTER_ADMIN') {
      router.push('/dashboard');
    }
  }, [user, router]);

  // Fetch product data
  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        setError('');

        const [productData, variantsData, imagesData] = await Promise.all([
          productsService.get(productId),
          productsService.listVariants(productId),
          productsService.listImages(productId),
        ]);

        setProduct(productData);
        setVariants(variantsData);
        setImages(imagesData);
      } catch (err: any) {
        setError(err?.message || 'Failed to load product');
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [productId]);

  const handleSave = async (data: CreateProductData | UpdateProductData) => {
    setSaving(true);

    try {
      const updatedProduct = await productsService.update(productId, data as UpdateProductData);
      setProduct(updatedProduct);
    } catch (err) {
      setSaving(false);
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    router.push('/admin/products');
  };

  const handleVariantsChange = (newVariants: ProductVariant[]) => {
    setVariants(newVariants);
  };

  const handleImagesChange = (newImages: ProductImage[]) => {
    setImages(newImages);
  };

  if (!user || user.userType !== 'PRINTER_ADMIN') {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mb-4"></div>
          <p className="text-muted-foreground">Loading product...</p>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="bg-red-500/10 border border-red-500/50 rounded-md p-4 text-red-500">
          <h2 className="font-medium mb-2">Error loading product</h2>
          <p>{error || 'Product not found'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <ProductForm
          product={product}
          variants={variants}
          images={images}
          onSave={handleSave}
          onCancel={handleCancel}
          onVariantsChange={handleVariantsChange}
          onImagesChange={handleImagesChange}
          isLoading={saving}
        />
      </div>
    </div>
  );
}

export default function ProductEditClient({ productId }: ProductEditClientProps) {
  return (
    <ProtectedRoute requireAdmin>
      <ProductEditContent productId={productId} />
    </ProtectedRoute>
  );
}
