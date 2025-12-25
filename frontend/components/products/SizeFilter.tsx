'use client';

import { FilterOption } from '@/lib/api/products';

interface SizeFilterProps {
  options: FilterOption[];
  selected: string[];
  onChange: (sizes: string[]) => void;
  isLoading?: boolean;
}

export function SizeFilter({
  options,
  selected,
  onChange,
  isLoading = false,
}: SizeFilterProps) {
  const handleToggle = (size: string) => {
    if (selected.includes(size)) {
      onChange(selected.filter((s) => s !== size));
    } else {
      onChange([...selected, size]);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-wrap gap-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-8 w-16 bg-muted animate-pulse rounded" />
        ))}
      </div>
    );
  }

  if (options.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No sizes available</p>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const isSelected = selected.includes(option.value);
        return (
          <button
            key={option.value}
            onClick={() => handleToggle(option.value)}
            className={`px-3 py-1.5 text-sm rounded-md border transition-all ${
              isSelected
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-background hover:border-primary/50'
            }`}
          >
            {option.value}
            <span className="ml-1 text-xs opacity-70">({option.count})</span>
          </button>
        );
      })}
    </div>
  );
}
