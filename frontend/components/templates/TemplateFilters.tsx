'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TEMPLATE_CATEGORY_LABELS } from '@/lib/api/templates';
import { Search, X, Filter, Star } from 'lucide-react';

interface TemplateFiltersProps {
  selectedCategory: string | null;
  onCategoryChange: (category: string | null) => void;
  isPremiumFilter: boolean | null;
  onPremiumChange: (isPremium: boolean | null) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onClearAll: () => void;
}

export function TemplateFilters({
  selectedCategory,
  onCategoryChange,
  isPremiumFilter,
  onPremiumChange,
  searchQuery,
  onSearchChange,
  onClearAll,
}: TemplateFiltersProps) {
  const categories = Object.entries(TEMPLATE_CATEGORY_LABELS);
  const hasActiveFilters = selectedCategory || isPremiumFilter !== null || searchQuery;

  return (
    <Card className="sticky top-24 z-40">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={onClearAll} className="text-muted-foreground">
              Clear All
              <X className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Search */}
        <div>
          <label className="text-sm font-medium mb-2 block">Search</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                onClick={() => onSearchChange('')}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Categories */}
        <div>
          <label className="text-sm font-medium mb-3 block">Category</label>
          <div className="space-y-2">
            <Button
              variant={selectedCategory === null ? 'default' : 'ghost'}
              size="sm"
              className="w-full justify-start"
              onClick={() => onCategoryChange(null)}
            >
              All Categories
            </Button>
            {categories.map(([key, label]) => (
              <Button
                key={key}
                variant={selectedCategory === key ? 'default' : 'ghost'}
                size="sm"
                className="w-full justify-start"
                onClick={() => onCategoryChange(key)}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>

        {/* Premium Filter */}
        <div>
          <label className="text-sm font-medium mb-3 block">Type</label>
          <div className="space-y-2">
            <Button
              variant={isPremiumFilter === null ? 'default' : 'ghost'}
              size="sm"
              className="w-full justify-start"
              onClick={() => onPremiumChange(null)}
            >
              All Templates
            </Button>
            <Button
              variant={isPremiumFilter === false ? 'default' : 'ghost'}
              size="sm"
              className="w-full justify-start"
              onClick={() => onPremiumChange(false)}
            >
              Free Templates
            </Button>
            <Button
              variant={isPremiumFilter === true ? 'default' : 'ghost'}
              size="sm"
              className="w-full justify-start gap-2"
              onClick={() => onPremiumChange(true)}
            >
              <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
              Premium Templates
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
