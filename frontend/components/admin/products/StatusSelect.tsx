'use client';

import { ProductStatus } from '@/lib/api/products';

interface StatusSelectProps {
  value: ProductStatus;
  onChange: (status: ProductStatus) => void;
  disabled?: boolean;
}

const STATUS_OPTIONS: { value: ProductStatus; label: string; color: string }[] = [
  { value: 'DRAFT', label: 'Draft', color: 'bg-gray-500' },
  { value: 'ACTIVE', label: 'Active', color: 'bg-green-500' },
  { value: 'ARCHIVED', label: 'Archived', color: 'bg-yellow-500' },
  { value: 'OUT_OF_STOCK', label: 'Out of Stock', color: 'bg-red-500' },
];

export function StatusSelect({ value, onChange, disabled }: StatusSelectProps) {
  const currentStatus = STATUS_OPTIONS.find((s) => s.value === value);

  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as ProductStatus)}
        disabled={disabled}
        className="w-full h-11 px-3 rounded-md border border-input bg-background text-sm
                   focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2
                   disabled:cursor-not-allowed disabled:opacity-50"
      >
        {STATUS_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {currentStatus && (
        <div
          className={`absolute right-10 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full ${currentStatus.color}`}
        />
      )}
    </div>
  );
}

export function StatusBadge({ status }: { status: ProductStatus }) {
  const statusConfig = STATUS_OPTIONS.find((s) => s.value === status);

  if (!statusConfig) return null;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium
                  ${status === 'ACTIVE' ? 'bg-green-500/20 text-green-400' : ''}
                  ${status === 'DRAFT' ? 'bg-gray-500/20 text-gray-400' : ''}
                  ${status === 'ARCHIVED' ? 'bg-yellow-500/20 text-yellow-400' : ''}
                  ${status === 'OUT_OF_STOCK' ? 'bg-red-500/20 text-red-400' : ''}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.color}`} />
      {statusConfig.label}
    </span>
  );
}
