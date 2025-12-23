'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ProductTemplate, templatesService } from '@/lib/api/templates';
import { Star, ExternalLink, Palette } from 'lucide-react';

interface TemplatePreviewModalProps {
  template: ProductTemplate | null;
  isOpen: boolean;
  onClose: () => void;
  onSelect?: (template: ProductTemplate) => void;
}

export function TemplatePreviewModal({
  template,
  isOpen,
  onClose,
  onSelect,
}: TemplatePreviewModalProps) {
  if (!template) return null;

  const handleSelect = () => {
    onSelect?.(template);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {template.name}
            {template.isPremium && (
              <Badge className="bg-gradient-to-r from-amber-500 to-yellow-500 text-white border-0">
                <Star className="h-3 w-3 mr-1 fill-current" />
                Premium
              </Badge>
            )}
          </DialogTitle>
          {template.description && (
            <DialogDescription>{template.description}</DialogDescription>
          )}
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-6 mt-4">
          {/* Template Preview Image */}
          <div className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden">
            <Image
              src={template.thumbnailUrl || '/placeholder-template.png'}
              alt={template.name}
              fill
              className="object-contain"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          </div>

          {/* Template Details */}
          <div className="space-y-4">
            {/* Category */}
            {template.category && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Category</label>
                <p className="font-medium">{templatesService.getCategoryLabel(template.category)}</p>
              </div>
            )}

            {/* Associated Product */}
            {template.product && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Perfect for</label>
                <Link
                  href={`/products/${template.product.slug || template.product.id}`}
                  className="flex items-center gap-1 text-primary hover:underline"
                >
                  {template.product.name}
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
            )}

            {/* Tags */}
            {template.tags && template.tags.length > 0 && (
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">Tags</label>
                <div className="flex flex-wrap gap-2">
                  {template.tags.map((tag, index) => (
                    <Badge key={index} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Price for Premium */}
            {template.isPremium && template.price && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Price</label>
                <p className="text-2xl font-bold text-amber-600">£{Number(template.price).toFixed(2)}</p>
              </div>
            )}

            <Separator />

            {/* Actions */}
            <div className="space-y-3">
              <Button className="w-full btn-gradient gap-2" onClick={handleSelect}>
                <Palette className="h-4 w-4" />
                Use This Template
              </Button>

              {template.product && (
                <Button variant="outline" className="w-full" asChild>
                  <Link href={`/products/${template.product.slug || template.product.id}`}>
                    View Product Details
                  </Link>
                </Button>
              )}
            </div>

            {template.isPremium && (
              <p className="text-xs text-muted-foreground text-center">
                Premium templates include additional customization options and higher resolution files.
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
