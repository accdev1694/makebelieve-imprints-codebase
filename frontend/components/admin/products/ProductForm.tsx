'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ProductBasicInfo } from './ProductBasicInfo';
import { VariantManager } from './VariantManager';
import { ImageManager } from './ImageManager';
import {
  Product,
  ProductVariant,
  ProductImage,
  CreateProductData,
  UpdateProductData,
} from '@/lib/api/products';
import { FileText, Package, Image, Settings, Save, ArrowLeft } from 'lucide-react';

type TabId = 'basic' | 'variants' | 'images' | 'settings';

interface ProductFormProps {
  product?: Product;
  variants?: ProductVariant[];
  images?: ProductImage[];
  onSave: (data: CreateProductData | UpdateProductData) => Promise<void>;
  onCancel: () => void;
  onVariantsChange?: (variants: ProductVariant[]) => void;
  onImagesChange?: (images: ProductImage[]) => void;
  isLoading?: boolean;
}

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'basic', label: 'Basic Info', icon: <FileText className="h-4 w-4" /> },
  { id: 'variants', label: 'Variants', icon: <Package className="h-4 w-4" /> },
  { id: 'images', label: 'Images', icon: <Image className="h-4 w-4" /> },
  { id: 'settings', label: 'Settings', icon: <Settings className="h-4 w-4" /> },
];

export function ProductForm({
  product,
  variants = [],
  images = [],
  onSave,
  onCancel,
  onVariantsChange,
  onImagesChange,
  isLoading,
}: ProductFormProps) {
  const isEditing = !!product?.id;
  const [activeTab, setActiveTab] = useState<TabId>('basic');
  const [formData, setFormData] = useState<Partial<Product>>(
    product || {
      status: 'DRAFT',
      featured: false,
      currency: 'GBP',
    }
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saveError, setSaveError] = useState('');

  const handleChange = (updates: Partial<Product>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
    // Clear errors for updated fields
    const updatedKeys = Object.keys(updates);
    if (updatedKeys.some((key) => errors[key])) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        updatedKeys.forEach((key) => delete newErrors[key]);
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name?.trim()) newErrors.name = 'Name is required';
    if (!formData.slug?.trim()) newErrors.slug = 'Slug is required';
    if (!formData.description?.trim()) newErrors.description = 'Description is required';
    if (!formData.categoryId) newErrors.categoryId = 'Category is required';
    if (!formData.legacyCategory) newErrors.legacyCategory = 'Product category is required';
    if (!formData.legacyProductType) newErrors.legacyProductType = 'Product type is required';
    if (!formData.customizationType) newErrors.customizationType = 'Customization type is required';
    if (!formData.basePrice || formData.basePrice <= 0) {
      newErrors.basePrice = 'Valid base price is required';
    }

    setErrors(newErrors);

    // Switch to basic tab if there are errors
    if (Object.keys(newErrors).length > 0) {
      setActiveTab('basic');
    }

    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setSaveError('');

    try {
      const data: CreateProductData | UpdateProductData = {
        name: formData.name!,
        slug: formData.slug!,
        description: formData.description!,
        categoryId: formData.categoryId!,
        subcategoryId: formData.subcategoryId || undefined,
        legacyCategory: formData.legacyCategory!,
        legacyProductType: formData.legacyProductType!,
        customizationType: formData.customizationType!,
        basePrice: formData.basePrice!,
        currency: formData.currency || 'GBP',
        status: formData.status || 'DRAFT',
        featured: formData.featured || false,
        seoTitle: formData.seoTitle || undefined,
        seoDescription: formData.seoDescription || undefined,
        seoKeywords: formData.seoKeywords || undefined,
      };

      await onSave(data);
    } catch (err: any) {
      setSaveError(err?.message || 'Failed to save product');
    }
  };

  // Disable tabs that require product to be saved first
  const isTabDisabled = (tabId: TabId) => {
    if (tabId === 'basic') return false;
    return !isEditing;
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button type="button" variant="ghost" onClick={onCancel}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold">
            {isEditing ? 'Edit Product' : 'Create Product'}
          </h1>
        </div>

        <Button type="submit" className="btn-gradient" loading={isLoading}>
          <Save className="h-4 w-4 mr-2" />
          Save Product
        </Button>
      </div>

      {/* Error */}
      {saveError && (
        <div className="bg-red-500/10 border border-red-500/50 rounded-md p-3 mb-6 text-sm text-red-500">
          {saveError}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-border pb-2">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => !isTabDisabled(tab.id) && setActiveTab(tab.id)}
            disabled={isTabDisabled(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-t-md text-sm font-medium transition-colors
              ${
                activeTab === tab.id
                  ? 'bg-primary/10 text-primary border-b-2 border-primary -mb-[2px]'
                  : 'text-muted-foreground hover:text-foreground'
              }
              ${isTabDisabled(tab.id) ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <Card>
        <CardContent className="pt-6">
          {activeTab === 'basic' && (
            <ProductBasicInfo
              product={formData}
              onChange={handleChange}
              errors={errors}
            />
          )}

          {activeTab === 'variants' && isEditing && (
            <VariantManager
              productId={product!.id}
              productSlug={product!.slug}
              productType={formData.legacyProductType!}
              variants={variants}
              onVariantsChange={onVariantsChange || (() => {})}
            />
          )}

          {activeTab === 'images' && isEditing && (
            <ImageManager
              productId={product!.id}
              images={images}
              variants={variants}
              onImagesChange={onImagesChange || (() => {})}
            />
          )}

          {activeTab === 'settings' && isEditing && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium mb-4">Product Settings</h3>
                <p className="text-muted-foreground">
                  Additional product settings and metadata.
                </p>
              </div>

              <div className="border rounded-md p-4 bg-muted/10">
                <h4 className="font-medium mb-2">Product ID</h4>
                <code className="text-sm text-muted-foreground">{product?.id}</code>
              </div>

              <div className="border rounded-md p-4 bg-muted/10">
                <h4 className="font-medium mb-2">Created</h4>
                <p className="text-sm text-muted-foreground">
                  {product?.createdAt
                    ? new Date(product.createdAt).toLocaleString()
                    : 'N/A'}
                </p>
              </div>

              <div className="border rounded-md p-4 bg-muted/10">
                <h4 className="font-medium mb-2">Last Updated</h4>
                <p className="text-sm text-muted-foreground">
                  {product?.updatedAt
                    ? new Date(product.updatedAt).toLocaleString()
                    : 'N/A'}
                </p>
              </div>

              <div className="border rounded-md p-4 bg-muted/10">
                <h4 className="font-medium mb-2">Statistics</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Variants:</span>{' '}
                    <span className="font-medium">{variants.length}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Images:</span>{' '}
                    <span className="font-medium">{images.length}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {!isEditing && activeTab !== 'basic' && (
            <div className="text-center py-8 text-muted-foreground">
              <p>Please save the product first to access {activeTab}.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </form>
  );
}
