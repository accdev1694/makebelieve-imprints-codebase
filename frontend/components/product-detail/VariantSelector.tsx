'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check } from 'lucide-react';
import type { VariantOption } from '@/lib/types';

interface VariantSelectorProps {
  label: string;
  options: VariantOption[];
  selected: string | null;
  onSelect: (id: string) => void;
  type?: 'text' | 'color';
}

export function VariantSelector({
  label,
  options,
  selected,
  onSelect,
  type = 'text',
}: VariantSelectorProps) {
  if (options.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold text-foreground">{label}</label>
        {selected && (
          <span className="text-sm text-muted-foreground">
            {options.find((opt) => opt.id === selected)?.name}
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const isSelected = selected === option.id;
          const isAvailable = option.available;

          if (type === 'color') {
            return (
              <button
                key={option.id}
                onClick={() => isAvailable && onSelect(option.id)}
                disabled={!isAvailable}
                className={`relative w-10 h-10 rounded-full border-2 transition-all ${
                  isSelected
                    ? 'border-primary ring-2 ring-primary ring-offset-2 ring-offset-background'
                    : 'border-border hover:border-primary/50'
                } ${!isAvailable ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
                style={{ backgroundColor: option.name.toLowerCase() }}
                title={option.name}
                aria-label={`Select ${option.name}`}
              >
                {isSelected && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Check className="h-5 w-5 text-white drop-shadow-lg" strokeWidth={3} />
                  </div>
                )}
                {!isAvailable && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-px h-12 bg-destructive rotate-45" />
                  </div>
                )}
              </button>
            );
          }

          return (
            <Card
              key={option.id}
              className={`px-4 py-2 cursor-pointer transition-all border ${
                isSelected
                  ? 'border-primary bg-primary/10 shadow-sm'
                  : 'border-border hover:border-primary/50'
              } ${!isAvailable ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={() => isAvailable && onSelect(option.id)}
            >
              <div className="flex items-center gap-2">
                <span className={`text-sm font-medium ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                  {option.name}
                </span>
                {!isAvailable && (
                  <Badge variant="destructive" className="text-xs">
                    Out of Stock
                  </Badge>
                )}
                {isSelected && <Check className="h-4 w-4 text-primary" />}
              </div>
              {option.price && (
                <span className="text-xs text-muted-foreground">
                  +${option.price.toFixed(2)}
                </span>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
