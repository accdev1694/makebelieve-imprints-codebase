'use client';

import { CustomizationType, CUSTOMIZATION_TYPE_LABELS } from '@/lib/api/products';
import { Card, CardContent } from '@/components/ui/card';
import { Check } from 'lucide-react';

interface CustomizationTypeFilterProps {
  selected: CustomizationType | 'all';
  onChange: (type: CustomizationType | 'all') => void;
}

export function CustomizationTypeFilter({ selected, onChange }: CustomizationTypeFilterProps) {
  const types: (CustomizationType | 'all')[] = [
    'all',
    'TEMPLATE_BASED',
    'UPLOAD_OWN',
    'FULLY_CUSTOM',
    'DIGITAL_DOWNLOAD',
  ];

  return (
    <div className="space-y-2">
      {types.map((type) => (
        <Card
          key={type}
          className={`cursor-pointer transition-all duration-200 ${
            selected === type
              ? 'border-primary bg-primary/10 shadow-sm'
              : 'border-border hover:border-primary/50'
          }`}
          onClick={() => onChange(type)}
        >
          <CardContent className="p-3 flex items-center justify-between">
            <span className="text-sm font-medium">
              {type === 'all' ? 'All Types' : CUSTOMIZATION_TYPE_LABELS[type]}
            </span>
            {selected === type && <Check className="h-4 w-4 text-primary" />}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
