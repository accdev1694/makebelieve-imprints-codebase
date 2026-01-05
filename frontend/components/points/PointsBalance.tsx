'use client';

import { useState, useEffect } from 'react';
import { Coins } from 'lucide-react';
import { getUserPoints } from '@/lib/api/points';
import { cn } from '@/lib/utils';

interface PointsBalanceProps {
  className?: string;
  showValue?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function PointsBalance({ className, showValue = true, size = 'md' }: PointsBalanceProps) {
  const [points, setPoints] = useState<number | null>(null);
  const [discountValue, setDiscountValue] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchPoints() {
      try {
        const data = await getUserPoints();
        setPoints(data.points);
        setDiscountValue(data.discountValue);
      } catch {
        // Silently fail - points display is not critical
      } finally {
        setIsLoading(false);
      }
    }

    fetchPoints();
  }, []);

  if (isLoading || points === null) {
    return null;
  }

  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  return (
    <div
      className={cn(
        'flex items-center gap-1.5 text-muted-foreground',
        sizeClasses[size],
        className
      )}
      title={`You have ${points} loyalty points worth £${discountValue.toFixed(2)} off your next order. 100 points = £1 discount.`}
    >
      <Coins className={cn(iconSizes[size], 'text-yellow-500')} />
      <span className="font-medium">{points.toLocaleString()} pts</span>
      {showValue && points > 0 && (
        <span className="text-green-600">
          ({'\u00A3'}{discountValue.toFixed(2)})
        </span>
      )}
    </div>
  );
}
