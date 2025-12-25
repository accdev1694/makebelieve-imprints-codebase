'use client';

import { ProductCategory, CATEGORY_LABELS } from '@/lib/api/products';
import { Card, CardContent } from '@/components/ui/card';
import { Check } from 'lucide-react';

interface CategoryFilterProps {
  selected: ProductCategory | 'all';
  onChange: (category: ProductCategory | 'all') => void;
}

export function CategoryFilter({ selected, onChange }: CategoryFilterProps) {
  const categories: (ProductCategory | 'all')[] = [
    'all',
    'HOME_LIFESTYLE',
    'STATIONERY',
    'LARGE_FORMAT',
    'PHOTO_PRINTS',
    'DIGITAL',
    'CUSTOM_ORDER',
  ];

  return (
    <div className="space-y-2">
      {categories.map((category) => (
        <Card
          key={category}
          className={`cursor-pointer transition-all duration-200 ${
            selected === category
              ? 'border-primary bg-primary/10 shadow-sm'
              : 'border-border hover:border-primary/50'
          }`}
          onClick={() => onChange(category)}
        >
          <CardContent className="p-3 flex items-center justify-between">
            <span className="text-sm font-medium">
              {category === 'all' ? 'All Categories' : CATEGORY_LABELS[category]}
            </span>
            {selected === category && <Check className="h-4 w-4 text-primary" />}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
