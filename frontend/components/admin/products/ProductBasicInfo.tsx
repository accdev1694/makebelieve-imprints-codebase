'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { StatusSelect } from './StatusSelect';
import {
  Product,
  ProductCategory,
  ProductType,
  CustomizationType,
  ProductStatus,
  CATEGORY_LABELS,
  PRODUCT_TYPE_LABELS,
  CUSTOMIZATION_TYPE_LABELS,
} from '@/lib/api/products';
import { Category, Subcategory, categoriesService } from '@/lib/api/categories';

interface ProductBasicInfoProps {
  product: Partial<Product>;
  onChange: (updates: Partial<Product>) => void;
  errors?: Record<string, string>;
}

export function ProductBasicInfo({ product, onChange, errors = {} }: ProductBasicInfoProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const cats = await categoriesService.list({ includeSubcategories: true });
        setCategories(cats);
      } catch {
        // Silently fail
      } finally {
        setLoadingCategories(false);
      }
    };
    fetchCategories();
  }, []);

  // Update subcategories when category changes
  useEffect(() => {
    if (product.categoryId) {
      const cat = categories.find((c) => c.id === product.categoryId);
      setSubcategories(cat?.subcategories || []);
    } else {
      setSubcategories([]);
    }
  }, [product.categoryId, categories]);

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const handleNameChange = (name: string) => {
    onChange({
      name,
      slug: product.slug || generateSlug(name),
    });
  };

  const inputClass = (field: string) =>
    `w-full ${errors[field] ? 'border-red-500' : ''}`;

  return (
    <div className="space-y-6">
      {/* Basic Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label htmlFor="name" className="block text-sm font-medium">
            Product Name <span className="text-red-500">*</span>
          </label>
          <Input
            id="name"
            value={product.name || ''}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="Enter product name"
            className={inputClass('name')}
          />
          {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="slug" className="block text-sm font-medium">
            Slug <span className="text-red-500">*</span>
          </label>
          <Input
            id="slug"
            value={product.slug || ''}
            onChange={(e) => onChange({ slug: e.target.value })}
            placeholder="product-url-slug"
            className={inputClass('slug')}
          />
          {errors.slug && <p className="text-sm text-red-500">{errors.slug}</p>}
        </div>
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <label htmlFor="description" className="block text-sm font-medium">
          Description <span className="text-red-500">*</span>
        </label>
        <textarea
          id="description"
          value={product.description || ''}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder="Describe your product..."
          rows={4}
          className={`w-full px-3 py-2 rounded-md border bg-background text-sm resize-none
            focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2
            ${errors.description ? 'border-red-500' : 'border-input'}`}
        />
        {errors.description && <p className="text-sm text-red-500">{errors.description}</p>}
      </div>

      {/* Category & Subcategory */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label htmlFor="categoryId" className="block text-sm font-medium">
            Category <span className="text-red-500">*</span>
          </label>
          <select
            id="categoryId"
            value={product.categoryId || ''}
            onChange={(e) =>
              onChange({ categoryId: e.target.value, subcategoryId: undefined })
            }
            disabled={loadingCategories}
            className={`w-full h-11 px-3 rounded-md border bg-background text-sm
              focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2
              ${errors.categoryId ? 'border-red-500' : 'border-input'}`}
          >
            <option value="">Select category...</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
          {errors.categoryId && <p className="text-sm text-red-500">{errors.categoryId}</p>}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="subcategoryId" className="block text-sm font-medium">
            Subcategory
          </label>
          <select
            id="subcategoryId"
            value={product.subcategoryId || ''}
            onChange={(e) => onChange({ subcategoryId: e.target.value || undefined })}
            disabled={!product.categoryId || subcategories.length === 0}
            className="w-full h-11 px-3 rounded-md border border-input bg-background text-sm
              focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            <option value="">No subcategory</option>
            {subcategories.map((sub) => (
              <option key={sub.id} value={sub.id}>
                {sub.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Legacy Category & Product Type */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label htmlFor="legacyCategory" className="block text-sm font-medium">
            Product Category <span className="text-red-500">*</span>
          </label>
          <select
            id="legacyCategory"
            value={product.legacyCategory || ''}
            onChange={(e) =>
              onChange({ legacyCategory: e.target.value as ProductCategory })
            }
            className={`w-full h-11 px-3 rounded-md border bg-background text-sm
              focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2
              ${errors.legacyCategory ? 'border-red-500' : 'border-input'}`}
          >
            <option value="">Select category type...</option>
            {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          {errors.legacyCategory && (
            <p className="text-sm text-red-500">{errors.legacyCategory}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="legacyProductType" className="block text-sm font-medium">
            Product Type <span className="text-red-500">*</span>
          </label>
          <select
            id="legacyProductType"
            value={product.legacyProductType || ''}
            onChange={(e) =>
              onChange({ legacyProductType: e.target.value as ProductType })
            }
            className={`w-full h-11 px-3 rounded-md border bg-background text-sm
              focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2
              ${errors.legacyProductType ? 'border-red-500' : 'border-input'}`}
          >
            <option value="">Select product type...</option>
            {Object.entries(PRODUCT_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          {errors.legacyProductType && (
            <p className="text-sm text-red-500">{errors.legacyProductType}</p>
          )}
        </div>
      </div>

      {/* Customization Type & Base Price */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label htmlFor="customizationType" className="block text-sm font-medium">
            Customization Type <span className="text-red-500">*</span>
          </label>
          <select
            id="customizationType"
            value={product.customizationType || ''}
            onChange={(e) =>
              onChange({ customizationType: e.target.value as CustomizationType })
            }
            className={`w-full h-11 px-3 rounded-md border bg-background text-sm
              focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2
              ${errors.customizationType ? 'border-red-500' : 'border-input'}`}
          >
            <option value="">Select customization type...</option>
            {Object.entries(CUSTOMIZATION_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          {errors.customizationType && (
            <p className="text-sm text-red-500">{errors.customizationType}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="basePrice" className="block text-sm font-medium">
            Base Price (£) <span className="text-red-500">*</span>
          </label>
          <Input
            id="basePrice"
            type="number"
            step="0.01"
            min="0"
            value={product.basePrice || ''}
            onChange={(e) => onChange({ basePrice: parseFloat(e.target.value) || 0 })}
            placeholder="0.00"
            className={inputClass('basePrice')}
          />
          {errors.basePrice && <p className="text-sm text-red-500">{errors.basePrice}</p>}
        </div>
      </div>

      {/* Status & Featured */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label htmlFor="status" className="block text-sm font-medium">
            Status
          </label>
          <StatusSelect
            value={product.status || 'DRAFT'}
            onChange={(status) => onChange({ status })}
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-medium">Featured</label>
          <div className="flex items-center gap-2 h-11">
            <input
              type="checkbox"
              id="featured"
              checked={product.featured || false}
              onChange={(e) => onChange({ featured: e.target.checked })}
              className="h-4 w-4 rounded border-input"
            />
            <label htmlFor="featured" className="text-sm">
              Display as featured product
            </label>
          </div>
        </div>
      </div>

      {/* SEO Fields */}
      <div className="border-t pt-6 mt-6">
        <h4 className="text-sm font-medium mb-4">SEO Settings</h4>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="seoTitle" className="block text-sm font-medium">
              SEO Title
            </label>
            <Input
              id="seoTitle"
              value={product.seoTitle || ''}
              onChange={(e) => onChange({ seoTitle: e.target.value })}
              placeholder="SEO optimized title..."
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="seoDescription" className="block text-sm font-medium">
              SEO Description
            </label>
            <textarea
              id="seoDescription"
              value={product.seoDescription || ''}
              onChange={(e) => onChange({ seoDescription: e.target.value })}
              placeholder="Meta description for search engines..."
              rows={2}
              className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm resize-none
                focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="seoKeywords" className="block text-sm font-medium">
              SEO Keywords
            </label>
            <Input
              id="seoKeywords"
              value={product.seoKeywords || ''}
              onChange={(e) => onChange({ seoKeywords: e.target.value })}
              placeholder="keyword1, keyword2, keyword3..."
            />
          </div>
        </div>
      </div>
    </div>
  );
}
