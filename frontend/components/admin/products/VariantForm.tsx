'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PropertyField } from './PropertyField';
import { ProductVariant, CreateVariantData, UpdateVariantData } from '@/lib/api/products';
import { ProductType } from '@mkbl/shared';
import {
  getPropertiesForProductType,
  generateVariantName,
  generateVariantSku,
  VariantPropertyConfig,
} from '@/lib/config/product-properties';
import { X } from 'lucide-react';

interface VariantFormProps {
  productType: ProductType;
  productSlug: string;
  variant?: ProductVariant;
  onSave: (data: CreateVariantData | UpdateVariantData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export function VariantForm({
  productType,
  productSlug,
  variant,
  onSave,
  onCancel,
  isLoading,
}: VariantFormProps) {
  const properties = getPropertiesForProductType(productType);
  const isEditing = !!variant;

  // Form state
  const [name, setName] = useState(variant?.name || '');
  const [sku, setSku] = useState(variant?.sku || '');
  const [price, setPrice] = useState(variant?.price?.toString() || '');
  const [stock, setStock] = useState(variant?.stock?.toString() || '0');
  const [isDefault, setIsDefault] = useState(variant?.isDefault || false);
  const [propertyValues, setPropertyValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Initialize property values from variant
  useEffect(() => {
    if (variant) {
      const values: Record<string, string> = {};
      properties.forEach((prop) => {
        const value = variant[prop.key as keyof ProductVariant];
        if (value !== undefined && value !== null) {
          values[prop.key] = String(value);
        }
      });
      setPropertyValues(values);
    }
  }, [variant, properties]);

  // Auto-generate name from properties
  useEffect(() => {
    if (!isEditing || name === variant?.name) {
      const generatedName = generateVariantName(productType, propertyValues);
      setName(generatedName);
    }
  }, [propertyValues, productType, isEditing, variant?.name, name]);

  const handlePropertyChange = (key: string, value: string) => {
    setPropertyValues((prev) => ({ ...prev, [key]: value }));
    // Clear error when value changes
    if (errors[key]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[key];
        return newErrors;
      });
    }
  };

  const handleAutoGenerateSku = () => {
    const generated = generateVariantSku(productSlug, propertyValues);
    setSku(generated);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validate required properties
    properties.forEach((prop) => {
      if (prop.required && !propertyValues[prop.key]?.trim()) {
        newErrors[prop.key] = `${prop.label} is required`;
      }
    });

    // Validate price
    if (!price || parseFloat(price) < 0) {
      newErrors.price = 'Valid price is required';
    }

    // Validate stock
    if (stock && parseInt(stock) < 0) {
      newErrors.stock = 'Stock cannot be negative';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    const data: CreateVariantData | UpdateVariantData = {
      name: name.trim(),
      sku: sku.trim() || undefined,
      price: parseFloat(price),
      stock: parseInt(stock) || 0,
      isDefault,
      size: propertyValues.size || undefined,
      material: propertyValues.material || undefined,
      color: propertyValues.color || undefined,
      finish: propertyValues.finish || undefined,
    };

    await onSave(data);
  };

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">
            {isEditing ? 'Edit Variant' : 'Add New Variant'}
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={onCancel}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Dynamic Properties */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {properties.map((prop: VariantPropertyConfig) => (
              <PropertyField
                key={prop.key}
                config={prop}
                value={propertyValues[prop.key] || ''}
                onChange={(value) => handlePropertyChange(prop.key, value)}
                error={errors[prop.key]}
              />
            ))}
          </div>

          {/* Name (auto-generated) */}
          <div className="space-y-1.5">
            <label htmlFor="name" className="block text-sm font-medium">
              Variant Name
            </label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Auto-generated from properties"
            />
            <p className="text-xs text-muted-foreground">
              Auto-generated from selected properties. You can customize it.
            </p>
          </div>

          {/* SKU */}
          <div className="space-y-1.5">
            <label htmlFor="sku" className="block text-sm font-medium">
              SKU
            </label>
            <div className="flex gap-2">
              <Input
                id="sku"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="Stock Keeping Unit"
                className="flex-1"
              />
              <Button type="button" variant="outline" onClick={handleAutoGenerateSku}>
                Generate
              </Button>
            </div>
          </div>

          {/* Price and Stock */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="price" className="block text-sm font-medium">
                Price (£) <span className="text-red-500">*</span>
              </label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                className={errors.price ? 'border-red-500' : ''}
              />
              {errors.price && <p className="text-sm text-red-500">{errors.price}</p>}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="stock" className="block text-sm font-medium">
                Stock
              </label>
              <Input
                id="stock"
                type="number"
                min="0"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                placeholder="0"
                className={errors.stock ? 'border-red-500' : ''}
              />
              {errors.stock && <p className="text-sm text-red-500">{errors.stock}</p>}
            </div>
          </div>

          {/* Default Variant */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isDefault"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="h-4 w-4 rounded border-input"
            />
            <label htmlFor="isDefault" className="text-sm font-medium">
              Set as default variant
            </label>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isLoading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 btn-gradient"
              disabled={isLoading}
            >
              {isLoading ? 'Saving...' : isEditing ? 'Update Variant' : 'Add Variant'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
