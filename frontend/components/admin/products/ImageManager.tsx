'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ProductImage,
  ProductVariant,
  CreateImageData,
  productsService,
} from '@/lib/api/products';
import { Plus, Trash2, Star, Image as ImageIcon, GripVertical, X } from 'lucide-react';

interface ImageManagerProps {
  productId: string;
  images: ProductImage[];
  variants: ProductVariant[];
  onImagesChange: (images: ProductImage[]) => void;
}

export function ImageManager({
  productId,
  images,
  variants,
  onImagesChange,
}: ImageManagerProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [newImageAlt, setNewImageAlt] = useState('');
  const [newImageVariantId, setNewImageVariantId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAddImage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newImageUrl.trim()) {
      setError('Image URL is required');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const data: CreateImageData = {
        imageUrl: newImageUrl.trim(),
        altText: newImageAlt.trim() || undefined,
        variantId: newImageVariantId || undefined,
        isPrimary: images.length === 0, // First image is primary
      };

      const newImage = await productsService.addImage(productId, data);
      onImagesChange([...images, newImage]);

      // Reset form
      setNewImageUrl('');
      setNewImageAlt('');
      setNewImageVariantId('');
      setShowAddForm(false);
    } catch (err: any) {
      setError(err?.message || 'Failed to add image');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteImage = async (imageId: string) => {
    if (!confirm('Are you sure you want to delete this image?')) return;

    setIsLoading(true);
    setError('');

    try {
      await productsService.deleteImage(productId, imageId);
      onImagesChange(images.filter((img) => img.id !== imageId));
    } catch (err: any) {
      setError(err?.message || 'Failed to delete image');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetPrimary = async (imageId: string) => {
    setIsLoading(true);
    setError('');

    try {
      await productsService.updateImage(productId, imageId, { isPrimary: true });

      const updatedImages = images.map((img) => ({
        ...img,
        isPrimary: img.id === imageId,
      }));

      onImagesChange(updatedImages);
    } catch (err: any) {
      setError(err?.message || 'Failed to set primary image');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Images</h3>
          <p className="text-sm text-muted-foreground">
            {images.length} image{images.length !== 1 ? 's' : ''}
          </p>
        </div>
        {!showAddForm && (
          <Button onClick={() => setShowAddForm(true)} className="btn-gradient">
            <Plus className="h-4 w-4 mr-2" />
            Add Image
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
      {showAddForm && (
        <Card className="border-primary/20">
          <CardContent className="pt-4">
            <form onSubmit={handleAddImage} className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium">Add New Image</h4>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowAddForm(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="imageUrl" className="block text-sm font-medium">
                  Image URL <span className="text-red-500">*</span>
                </label>
                <Input
                  id="imageUrl"
                  type="url"
                  value={newImageUrl}
                  onChange={(e) => setNewImageUrl(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="imageAlt" className="block text-sm font-medium">
                  Alt Text
                </label>
                <Input
                  id="imageAlt"
                  value={newImageAlt}
                  onChange={(e) => setNewImageAlt(e.target.value)}
                  placeholder="Describe the image..."
                />
              </div>

              {variants.length > 0 && (
                <div className="space-y-1.5">
                  <label htmlFor="variantId" className="block text-sm font-medium">
                    Associate with Variant (optional)
                  </label>
                  <select
                    id="variantId"
                    value={newImageVariantId}
                    onChange={(e) => setNewImageVariantId(e.target.value)}
                    className="w-full h-11 px-3 rounded-md border border-input bg-background text-sm"
                  >
                    <option value="">No specific variant</option>
                    {variants.map((variant) => (
                      <option key={variant.id} value={variant.id}>
                        {variant.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Preview */}
              {newImageUrl && (
                <div className="border rounded-md p-2">
                  <p className="text-xs text-muted-foreground mb-2">Preview:</p>
                  <img
                    src={newImageUrl}
                    alt="Preview"
                    className="max-h-32 rounded-md object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/placeholder-product.png';
                    }}
                  />
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddForm(false)}
                  disabled={isLoading}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button type="submit" className="flex-1 btn-gradient" loading={isLoading}>
                  Add Image
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Images Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {images.length === 0 && !showAddForm ? (
          <Card className="col-span-full border-dashed">
            <CardContent className="py-8 text-center text-muted-foreground">
              <ImageIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No images yet. Add your first image to get started.</p>
            </CardContent>
          </Card>
        ) : (
          images.map((image) => (
            <Card
              key={image.id}
              className={`group relative overflow-hidden ${
                image.isPrimary ? 'ring-2 ring-primary' : ''
              }`}
            >
              <div className="aspect-square relative">
                <img
                  src={image.imageUrl}
                  alt={image.altText || 'Product image'}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/placeholder-product.png';
                  }}
                />

                {/* Primary badge */}
                {image.isPrimary && (
                  <Badge className="absolute top-2 left-2 bg-primary">
                    <Star className="h-3 w-3 mr-1 fill-current" />
                    Primary
                  </Badge>
                )}

                {/* Variant badge */}
                {image.variant && (
                  <Badge variant="secondary" className="absolute bottom-2 left-2 text-xs">
                    {image.variant.name}
                  </Badge>
                )}

                {/* Actions overlay */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <GripVertical className="absolute top-2 right-2 h-4 w-4 text-white cursor-move" />

                  {!image.isPrimary && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleSetPrimary(image.id)}
                      disabled={isLoading}
                    >
                      <Star className="h-4 w-4 mr-1" />
                      Set Primary
                    </Button>
                  )}

                  <Button
                    size="icon"
                    variant="destructive"
                    onClick={() => handleDeleteImage(image.id)}
                    disabled={isLoading}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
