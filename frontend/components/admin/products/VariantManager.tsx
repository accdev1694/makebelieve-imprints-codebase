'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { VariantForm } from './VariantForm';
import {
  ProductVariant,
  CreateVariantData,
  UpdateVariantData,
  productsService,
  formatPrice,
} from '@/lib/api/products';
import { ProductType } from '@mkbl/shared';
import { Plus, Edit2, Trash2, Star, Package } from 'lucide-react';

interface VariantManagerProps {
  productId: string;
  productSlug: string;
  productType: ProductType;
  variants: ProductVariant[];
  onVariantsChange: (variants: ProductVariant[]) => void;
}

export function VariantManager({
  productId,
  productSlug,
  productType,
  variants,
  onVariantsChange,
}: VariantManagerProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingVariant, setEditingVariant] = useState<ProductVariant | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAddVariant = async (data: CreateVariantData | UpdateVariantData) => {
    setIsLoading(true);
    setError('');

    try {
      const newVariant = await productsService.createVariant(productId, data as CreateVariantData);

      // If new variant is default, update others
      let updatedVariants = [...variants];
      if (data.isDefault) {
        updatedVariants = updatedVariants.map((v) => ({ ...v, isDefault: false }));
      }
      updatedVariants.push(newVariant);

      onVariantsChange(updatedVariants);
      setShowForm(false);
    } catch (err: any) {
      setError(err?.message || 'Failed to add variant');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateVariant = async (data: CreateVariantData | UpdateVariantData) => {
    if (!editingVariant) return;

    setIsLoading(true);
    setError('');

    try {
      const updatedVariant = await productsService.updateVariant(
        productId,
        editingVariant.id,
        data as UpdateVariantData
      );

      let updatedVariants = variants.map((v) =>
        v.id === editingVariant.id ? updatedVariant : v
      );

      // If updated variant is now default, update others
      if (data.isDefault) {
        updatedVariants = updatedVariants.map((v) =>
          v.id === editingVariant.id ? v : { ...v, isDefault: false }
        );
      }

      onVariantsChange(updatedVariants);
      setEditingVariant(null);
    } catch (err: any) {
      setError(err?.message || 'Failed to update variant');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteVariant = async (variantId: string) => {
    if (!confirm('Are you sure you want to delete this variant?')) return;

    setIsLoading(true);
    setError('');

    try {
      await productsService.deleteVariant(productId, variantId);
      onVariantsChange(variants.filter((v) => v.id !== variantId));
    } catch (err: any) {
      setError(err?.message || 'Failed to delete variant');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetDefault = async (variantId: string) => {
    setIsLoading(true);
    setError('');

    try {
      await productsService.updateVariant(productId, variantId, { isDefault: true });

      const updatedVariants = variants.map((v) => ({
        ...v,
        isDefault: v.id === variantId,
      }));

      onVariantsChange(updatedVariants);
    } catch (err: any) {
      setError(err?.message || 'Failed to set default variant');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Variants</h3>
          <p className="text-sm text-muted-foreground">
            {variants.length} variant{variants.length !== 1 ? 's' : ''}
          </p>
        </div>
        {!showForm && !editingVariant && (
          <Button onClick={() => setShowForm(true)} className="btn-gradient">
            <Plus className="h-4 w-4 mr-2" />
            Add Variant
          </Button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/50 rounded-md p-3 text-sm text-red-500">
          {error}
        </div>
      )}

      {/* Add Form */}
      {showForm && (
        <VariantForm
          productType={productType}
          productSlug={productSlug}
          onSave={handleAddVariant}
          onCancel={() => setShowForm(false)}
          isLoading={isLoading}
        />
      )}

      {/* Edit Form */}
      {editingVariant && (
        <VariantForm
          productType={productType}
          productSlug={productSlug}
          variant={editingVariant}
          onSave={handleUpdateVariant}
          onCancel={() => setEditingVariant(null)}
          isLoading={isLoading}
        />
      )}

      {/* Variants List */}
      {!showForm && !editingVariant && (
        <div className="space-y-3">
          {variants.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-8 text-center text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No variants yet. Add your first variant to get started.</p>
              </CardContent>
            </Card>
          ) : (
            variants.map((variant) => (
              <Card key={variant.id} className={variant.isDefault ? 'border-primary/50' : ''}>
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {/* Default indicator */}
                      {variant.isDefault && (
                        <Star className="h-4 w-4 text-primary fill-primary" />
                      )}

                      {/* Variant info */}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{variant.name}</span>
                          {variant.sku && (
                            <Badge variant="outline" className="text-xs">
                              {variant.sku}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                          {variant.size && <span>Size: {variant.size}</span>}
                          {variant.material && <span>Material: {variant.material}</span>}
                          {variant.color && (
                            <span className="flex items-center gap-1">
                              Color:
                              <span
                                className="w-3 h-3 rounded-full border"
                                style={{ backgroundColor: variant.color }}
                              />
                              {variant.color}
                            </span>
                          )}
                          {variant.finish && <span>Finish: {variant.finish}</span>}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      {/* Price and Stock */}
                      <div className="text-right">
                        <div className="font-medium">
                          {formatPrice(Number(variant.price))}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Stock: {variant.stock}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1">
                        {!variant.isDefault && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleSetDefault(variant.id)}
                            title="Set as default"
                            disabled={isLoading}
                          >
                            <Star className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditingVariant(variant)}
                          disabled={isLoading}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteVariant(variant.id)}
                          disabled={isLoading}
                          className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}
