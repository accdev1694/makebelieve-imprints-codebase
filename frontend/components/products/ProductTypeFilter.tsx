'use client';

import { useState } from 'react';
import { ProductType, PRODUCT_TYPE_LABELS } from '@/lib/api/products';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

interface ProductTypeFilterProps {
  selected: ProductType | 'all';
  onChange: (type: ProductType | 'all') => void;
}

export function ProductTypeFilter({ selected, onChange }: ProductTypeFilterProps) {
  const [search, setSearch] = useState('');

  const productTypes: ProductType[] = [
    'TSHIRT',
    'MUG',
    'WATER_BOTTLE',
    'MOUSEMAT',
    'KEYCHAIN',
    'CUSHION_PILLOW',
    'BUSINESS_CARD',
    'LEAFLET',
    'GREETING_CARD',
    'POSTCARD',
    'BANNER',
    'POSTER',
    'CANVAS_PRINT',
    'ALUMINUM_PRINT',
    'PHOTO_PAPER_PRINT',
    'ACRYLIC_LED_PRINT',
    'DIGITAL_PDF',
  ];

  const filteredTypes = productTypes.filter((type) =>
    PRODUCT_TYPE_LABELS[type].toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-3">
      {/* Search within product types */}
      <div className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search types..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8 pl-7 text-sm"
        />
      </div>

      {/* All option */}
      <label className="flex items-center gap-2 cursor-pointer hover:text-primary transition-colors">
        <input
          type="radio"
          name="productType"
          checked={selected === 'all'}
          onChange={() => onChange('all')}
          className="cursor-pointer"
        />
        <span className="text-sm">All Types</span>
      </label>

      {/* Product type options */}
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {filteredTypes.map((type) => (
          <label
            key={type}
            className="flex items-center gap-2 cursor-pointer hover:text-primary transition-colors"
          >
            <input
              type="radio"
              name="productType"
              checked={selected === type}
              onChange={() => onChange(type)}
              className="cursor-pointer"
            />
            <span className="text-sm">{PRODUCT_TYPE_LABELS[type]}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
