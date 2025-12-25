'use client';

import { useState, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface PriceRangeFilterProps {
  priceRange: { min: number; max: number };
  selectedMin: number | null;
  selectedMax: number | null;
  onChange: (min: number | null, max: number | null) => void;
  isLoading?: boolean;
}

export function PriceRangeFilter({
  priceRange,
  selectedMin,
  selectedMax,
  onChange,
  isLoading = false,
}: PriceRangeFilterProps) {
  const [minInput, setMinInput] = useState<string>(
    selectedMin?.toString() ?? ''
  );
  const [maxInput, setMaxInput] = useState<string>(
    selectedMax?.toString() ?? ''
  );

  // Sync inputs with props when they change externally
  useEffect(() => {
    setMinInput(selectedMin?.toString() ?? '');
    setMaxInput(selectedMax?.toString() ?? '');
  }, [selectedMin, selectedMax]);

  const handleApply = useCallback(() => {
    const min = minInput ? parseFloat(minInput) : null;
    const max = maxInput ? parseFloat(maxInput) : null;
    onChange(min, max);
  }, [minInput, maxInput, onChange]);

  const handleClear = useCallback(() => {
    setMinInput('');
    setMaxInput('');
    onChange(null, null);
  }, [onChange]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleApply();
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="h-10 bg-muted animate-pulse rounded" />
        <div className="h-10 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  const hasRange = priceRange.max > priceRange.min;

  return (
    <div className="space-y-3">
      {hasRange && (
        <p className="text-xs text-muted-foreground">
          Range: £{priceRange.min.toFixed(2)} - £{priceRange.max.toFixed(2)}
        </p>
      )}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            £
          </span>
          <Input
            type="number"
            placeholder="Min"
            value={minInput}
            onChange={(e) => setMinInput(e.target.value)}
            onKeyDown={handleKeyDown}
            min={0}
            step={0.01}
            className="pl-7"
          />
        </div>
        <span className="text-muted-foreground">-</span>
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            £
          </span>
          <Input
            type="number"
            placeholder="Max"
            value={maxInput}
            onChange={(e) => setMaxInput(e.target.value)}
            onKeyDown={handleKeyDown}
            min={0}
            step={0.01}
            className="pl-7"
          />
        </div>
      </div>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleApply}
          className="flex-1"
        >
          Apply
        </Button>
        {(selectedMin !== null || selectedMax !== null) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="text-muted-foreground"
          >
            Clear
          </Button>
        )}
      </div>
    </div>
  );
}
