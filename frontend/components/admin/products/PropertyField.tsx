'use client';

import { Input } from '@/components/ui/input';
import { VariantPropertyConfig } from '@/lib/config/product-properties';

interface PropertyFieldProps {
  config: VariantPropertyConfig;
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

export function PropertyField({ config, value, onChange, error }: PropertyFieldProps) {
  const { key, label, type, required, options, placeholder } = config;

  const baseInputClass = `w-full h-11 px-3 rounded-md border bg-background text-sm
    focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2
    ${error ? 'border-red-500' : 'border-input'}`;

  return (
    <div className="space-y-1.5">
      <label htmlFor={key} className="block text-sm font-medium">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>

      {type === 'select' && options ? (
        <select
          id={key}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className={baseInputClass}
        >
          <option value="">Select {label.toLowerCase()}...</option>
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      ) : type === 'color' ? (
        <div className="flex gap-2">
          <input
            type="color"
            id={`${key}-picker`}
            value={value || '#000000'}
            onChange={(e) => onChange(e.target.value)}
            className="w-11 h-11 p-1 rounded-md border border-input bg-background cursor-pointer"
          />
          <Input
            id={key}
            type="text"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder || 'e.g., Red, Blue, #FF5733'}
            className={error ? 'border-red-500' : ''}
          />
        </div>
      ) : type === 'number' ? (
        <Input
          id={key}
          type="number"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={error ? 'border-red-500' : ''}
        />
      ) : (
        <Input
          id={key}
          type="text"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={error ? 'border-red-500' : ''}
        />
      )}

      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}
