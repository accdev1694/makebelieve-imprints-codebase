'use client';

import { ProductFilters, FilterOption } from '@/lib/api/products';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { X } from 'lucide-react';
import { SearchInput } from './SearchInput';
import { FilterSection } from './FilterSection';
import { CategoryFilter } from './CategoryFilter';
import { ProductTypeFilter } from './ProductTypeFilter';
import { CustomizationTypeFilter } from './CustomizationTypeFilter';
import { SortFilter } from './SortFilter';
import { MaterialFilter } from './MaterialFilter';
import { SizeFilter } from './SizeFilter';
import { PriceRangeFilter } from './PriceRangeFilter';

interface FilterSidebarProps {
  filters: ProductFilters;
  onFiltersChange: (filters: Partial<ProductFilters>) => void;
  onClearAll: () => void;
  totalResults?: number;
  isOpen?: boolean;
  onClose?: () => void;
  // New filter options
  materialOptions?: FilterOption[];
  sizeOptions?: FilterOption[];
  priceRange?: { min: number; max: number };
  isLoadingFilters?: boolean;
}

export function FilterSidebar({
  filters,
  onFiltersChange,
  onClearAll,
  totalResults = 0,
  onClose,
  materialOptions = [],
  sizeOptions = [],
  priceRange = { min: 0, max: 100 },
  isLoadingFilters = false,
}: FilterSidebarProps) {
  return (
    <Card className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between bg-card/50">
        <h2 className="text-lg font-semibold text-foreground">Filters</h2>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onClearAll} className="text-xs">
            Clear All
          </Button>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose} className="lg:hidden">
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Scrollable Filter Sections */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Search */}
        <FilterSection title="Search" collapsible={false}>
          <SearchInput
            value={filters.search}
            onChange={(search) => onFiltersChange({ search })}
          />
        </FilterSection>

        {/* Categories */}
        <FilterSection title="Categories" defaultOpen>
          <CategoryFilter
            selected={filters.category}
            onChange={(category) => onFiltersChange({ category })}
          />
        </FilterSection>

        {/* Product Types */}
        <FilterSection title="Product Types" defaultOpen={false}>
          <ProductTypeFilter
            selected={filters.productType}
            onChange={(productType) => onFiltersChange({ productType })}
          />
        </FilterSection>

        {/* Customization Type */}
        <FilterSection title="Customization" defaultOpen={false}>
          <CustomizationTypeFilter
            selected={filters.customizationType}
            onChange={(customizationType) => onFiltersChange({ customizationType })}
          />
        </FilterSection>

        {/* Sort Options */}
        <FilterSection title="Sort By" defaultOpen={false}>
          <SortFilter
            sortBy={filters.sortBy}
            sortOrder={filters.sortOrder}
            onSortByChange={(sortBy) => onFiltersChange({ sortBy })}
            onSortOrderChange={(sortOrder) => onFiltersChange({ sortOrder })}
          />
        </FilterSection>

        {/* Materials Filter */}
        {materialOptions.length > 0 && (
          <FilterSection title="Materials" defaultOpen={false}>
            <MaterialFilter
              options={materialOptions}
              selected={filters.materials}
              onChange={(materials) => onFiltersChange({ materials })}
              isLoading={isLoadingFilters}
            />
          </FilterSection>
        )}

        {/* Sizes Filter */}
        {sizeOptions.length > 0 && (
          <FilterSection title="Sizes" defaultOpen={false}>
            <SizeFilter
              options={sizeOptions}
              selected={filters.sizes}
              onChange={(sizes) => onFiltersChange({ sizes })}
              isLoading={isLoadingFilters}
            />
          </FilterSection>
        )}

        {/* Price Range Filter */}
        <FilterSection title="Price Range" defaultOpen={false}>
          <PriceRangeFilter
            priceRange={priceRange}
            selectedMin={filters.minPrice}
            selectedMax={filters.maxPrice}
            onChange={(minPrice, maxPrice) => onFiltersChange({ minPrice, maxPrice })}
            isLoading={isLoadingFilters}
          />
        </FilterSection>

        {/* Featured Toggle */}
        <FilterSection title="Featured" defaultOpen={false}>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={filters.featured === true}
              onChange={(e) => onFiltersChange({ featured: e.target.checked ? true : null })}
              className="cursor-pointer"
            />
            <span className="text-sm">Show featured products only</span>
          </label>
        </FilterSection>
      </div>

      {/* Mobile Apply Button */}
      {onClose && (
        <div className="lg:hidden p-4 border-t bg-card/50">
          <Button onClick={onClose} className="w-full btn-gradient">
            View Results ({totalResults})
          </Button>
        </div>
      )}
    </Card>
  );
}
