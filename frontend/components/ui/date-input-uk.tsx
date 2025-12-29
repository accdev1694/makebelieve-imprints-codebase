'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Calendar } from 'lucide-react';

interface DateInputUKProps {
  value: string; // ISO format: YYYY-MM-DD
  onChange: (value: string) => void;
  id?: string;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
}

/**
 * UK Date Input Component
 * Displays dates in DD/MM/YYYY format while storing in ISO format (YYYY-MM-DD)
 */
export function DateInputUK({
  value,
  onChange,
  id,
  className,
  placeholder = 'DD/MM/YYYY',
  disabled = false,
}: DateInputUKProps) {
  const hiddenInputRef = React.useRef<HTMLInputElement>(null);

  // Convert ISO date (YYYY-MM-DD) to UK format (DD/MM/YYYY)
  const formatToUK = (isoDate: string): string => {
    if (!isoDate) return '';
    const parts = isoDate.split('-');
    if (parts.length !== 3) return '';
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };

  // Convert UK format (DD/MM/YYYY) to ISO (YYYY-MM-DD)
  const formatToISO = (ukDate: string): string => {
    if (!ukDate) return '';
    const parts = ukDate.split('/');
    if (parts.length !== 3) return '';
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  };

  const [displayValue, setDisplayValue] = React.useState(formatToUK(value));

  // Update display when value prop changes
  React.useEffect(() => {
    setDisplayValue(formatToUK(value));
  }, [value]);

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let input = e.target.value;

    // Remove non-numeric characters except /
    input = input.replace(/[^\d/]/g, '');

    // Auto-insert slashes
    if (input.length === 2 && !input.includes('/')) {
      input = input + '/';
    } else if (input.length === 5 && input.split('/').length === 2) {
      input = input + '/';
    }

    // Limit length
    if (input.length > 10) {
      input = input.slice(0, 10);
    }

    setDisplayValue(input);

    // If complete date, convert to ISO and call onChange
    if (input.length === 10) {
      const parts = input.split('/');
      if (parts.length === 3) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10);
        const year = parseInt(parts[2], 10);

        // Basic validation
        if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 1900 && year <= 2100) {
          const isoDate = formatToISO(input);
          onChange(isoDate);
        }
      }
    }
  };

  const handleCalendarClick = () => {
    hiddenInputRef.current?.showPicker();
  };

  const handleNativeDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isoDate = e.target.value;
    if (isoDate) {
      setDisplayValue(formatToUK(isoDate));
      onChange(isoDate);
    }
  };

  return (
    <div className="relative">
      <input
        type="text"
        id={id}
        value={displayValue}
        onChange={handleTextChange}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(
          'flex h-11 w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm pr-10',
          className
        )}
      />
      <button
        type="button"
        onClick={handleCalendarClick}
        disabled={disabled}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
        tabIndex={-1}
      >
        <Calendar className="h-5 w-5" />
      </button>
      {/* Hidden native date picker for calendar functionality */}
      <input
        ref={hiddenInputRef}
        type="date"
        value={value}
        onChange={handleNativeDateChange}
        className="absolute opacity-0 pointer-events-none w-0 h-0"
        tabIndex={-1}
      />
    </div>
  );
}
