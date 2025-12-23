'use client';

import {
  ProductFilters,
  CATEGORY_LABELS,
  PRODUCT_TYPE_LABELS,
  CUSTOMIZATION_TYPE_LABELS,
} from '@/lib/api/products';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface ActiveFiltersProps {
  filters: ProductFilters;
  onRemoveFilter: (key: keyof ProductFilters) => void;
  onClearAll: () => void;
}

export function ActiveFilters({ filters, onRemoveFilter, onClearAll }: ActiveFiltersProps) {
  const activeFilters: { key: keyof ProductFilters; label: string }[] = [];

  if (filters.category !== 'all') {
    activeFilters.push({
      key: 'category',
      label: `Category: ${CATEGORY_LABELS[filters.category]}`,
    });
  }

  if (filters.productType !== 'all') {
    activeFilters.push({
      key: 'productType',
      label: `Type: ${PRODUCT_TYPE_LABELS[filters.productType]}`,
    });
  }

  if (filters.customizationType !== 'all') {
    activeFilters.push({
      key: 'customizationType',
      label: `Customization: ${CUSTOMIZATION_TYPE_LABELS[filters.customizationType]}`,
    });
  }

  if (filters.featured) {
    activeFilters.push({
      key: 'featured',
      label: 'Featured Only',
    });
  }

  if (filters.search) {
    activeFilters.push({
      key: 'search',
      label: `Search: "${filters.search}"`,
    });
  }

  if (filters.sortBy !== 'featured' || filters.sortOrder !== 'desc') {
    activeFilters.push({
      key: 'sortBy',
      label: `Sort: ${filters.sortBy} (${filters.sortOrder})`,
    });
  }

  if (activeFilters.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2 mb-6 p-4 bg-card/50 rounded-lg border">
      <span className="text-sm text-muted-foreground font-medium">Active Filters:</span>
      {activeFilters.map((filter) => (
        <Badge
          key={filter.key}
          variant="secondary"
          className="pl-3 pr-1 py-1 gap-1 cursor-pointer hover:bg-secondary/80 transition-colors"
        >
          <span className="text-xs">{filter.label}</span>
          <button
            onClick={() => onRemoveFilter(filter.key)}
            className="ml-1 hover:bg-background rounded-full p-0.5 transition-colors"
            aria-label={`Remove ${filter.label} filter`}
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}
      <Button
        variant="ghost"
        size="sm"
        onClick={onClearAll}
        className="h-7 text-xs hover:text-destructive"
      >
        Clear All
      </Button>
    </div>
  );
}
