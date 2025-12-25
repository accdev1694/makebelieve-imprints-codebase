'use client';

import { FilterOption } from '@/lib/api/products';

interface MaterialFilterProps {
  options: FilterOption[];
  selected: string[];
  onChange: (materials: string[]) => void;
  isLoading?: boolean;
}

export function MaterialFilter({
  options,
  selected,
  onChange,
  isLoading = false,
}: MaterialFilterProps) {
  const handleToggle = (material: string) => {
    if (selected.includes(material)) {
      onChange(selected.filter((m) => m !== material));
    } else {
      onChange([...selected, material]);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-8 bg-muted animate-pulse rounded" />
        ))}
      </div>
    );
  }

  if (options.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No materials available</p>
    );
  }

  return (
    <div className="space-y-2 max-h-48 overflow-y-auto">
      {options.map((option) => (
        <label
          key={option.value}
          className="flex items-center gap-2 cursor-pointer group"
        >
          <input
            type="checkbox"
            checked={selected.includes(option.value)}
            onChange={() => handleToggle(option.value)}
            className="h-4 w-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
          />
          <span className="text-sm flex-1 group-hover:text-primary transition-colors">
            {option.value}
          </span>
          <span className="text-xs text-muted-foreground">({option.count})</span>
        </label>
      ))}
    </div>
  );
}
