'use client';

import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ProductTemplate, templatesService } from '@/lib/api/templates';
import { Star, Eye } from 'lucide-react';

interface TemplateCardProps {
  template: ProductTemplate;
  onSelect?: (template: ProductTemplate) => void;
  onPreview?: (template: ProductTemplate) => void;
}

export function TemplateCard({ template, onSelect, onPreview }: TemplateCardProps) {
  return (
    <Card className="group overflow-hidden hover:shadow-lg transition-all duration-300 border-2 border-transparent hover:border-primary/20">
      <div className="relative aspect-square bg-gray-100 overflow-hidden">
        <Image
          src={template.thumbnailUrl || '/placeholder-template.png'}
          alt={template.name}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
        />

        {/* Overlay on Hover */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-3">
          {onPreview && (
            <Button
              variant="outline"
              size="sm"
              className="bg-white/10 border-white text-white hover:bg-white hover:text-black"
              onClick={(e) => {
                e.stopPropagation();
                onPreview(template);
              }}
            >
              <Eye className="h-4 w-4 mr-1" />
              Preview
            </Button>
          )}
          {onSelect && (
            <Button
              size="sm"
              className="btn-gradient"
              onClick={(e) => {
                e.stopPropagation();
                onSelect(template);
              }}
            >
              Use Template
            </Button>
          )}
        </div>

        {/* Badges */}
        <div className="absolute top-2 left-2 flex gap-2">
          {template.isPremium && (
            <Badge className="bg-gradient-to-r from-amber-500 to-yellow-500 text-white border-0">
              <Star className="h-3 w-3 mr-1 fill-current" />
              Premium
            </Badge>
          )}
        </div>

        {template.category && (
          <Badge variant="secondary" className="absolute top-2 right-2">
            {templatesService.getCategoryLabel(template.category)}
          </Badge>
        )}
      </div>

      <CardContent className="p-4">
        <h3 className="font-semibold text-sm line-clamp-1 mb-1">{template.name}</h3>
        {template.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{template.description}</p>
        )}

        {template.product && (
          <p className="text-xs text-primary mt-2">For: {template.product.name}</p>
        )}

        {template.isPremium && template.price && (
          <p className="text-sm font-semibold text-amber-600 mt-2">
            £{Number(template.price).toFixed(2)}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export function TemplateCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <div className="aspect-square bg-gray-200 animate-pulse" />
      <CardContent className="p-4">
        <div className="h-4 bg-gray-200 rounded animate-pulse mb-2" />
        <div className="h-3 bg-gray-200 rounded animate-pulse w-3/4" />
      </CardContent>
    </Card>
  );
}
