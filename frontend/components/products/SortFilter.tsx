'use client';

import { Button } from '@/components/ui/button';
import { ArrowUp, ArrowDown } from 'lucide-react';

interface SortFilterProps {
  sortBy: 'name' | 'price' | 'createdAt' | 'featured';
  sortOrder: 'asc' | 'desc';
  onSortByChange: (sortBy: 'name' | 'price' | 'createdAt' | 'featured') => void;
  onSortOrderChange: (sortOrder: 'asc' | 'desc') => void;
}

export function SortFilter({ sortBy, sortOrder, onSortByChange, onSortOrderChange }: SortFilterProps) {
  const sortOptions: { value: 'name' | 'price' | 'createdAt' | 'featured'; label: string }[] = [
    { value: 'featured', label: 'Featured' },
    { value: 'name', label: 'Name' },
    { value: 'price', label: 'Price' },
    { value: 'createdAt', label: 'Newest' },
  ];

  return (
    <div className="space-y-3">
      {/* Sort By */}
      <div>
        <label className="text-xs text-muted-foreground mb-2 block">Sort By</label>
        <div className="grid grid-cols-2 gap-2">
          {sortOptions.map((option) => (
            <Button
              key={option.value}
              variant={sortBy === option.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => onSortByChange(option.value)}
              className={`${sortBy === option.value ? 'btn-gradient' : ''} text-xs`}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Sort Order */}
      <div>
        <label className="text-xs text-muted-foreground mb-2 block">Order</label>
        <div className="flex gap-2">
          <Button
            variant={sortOrder === 'asc' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onSortOrderChange('asc')}
            className="flex-1 text-xs"
          >
            <ArrowUp className="h-3 w-3 mr-1" />
            Ascending
          </Button>
          <Button
            variant={sortOrder === 'desc' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onSortOrderChange('desc')}
            className="flex-1 text-xs"
          >
            <ArrowDown className="h-3 w-3 mr-1" />
            Descending
          </Button>
        </div>
      </div>
    </div>
  );
}
