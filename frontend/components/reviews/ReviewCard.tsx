'use client';

import { Star, Award } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ReviewCardProps {
  rating: number;
  comment: string | null;
  customerName: string;
  createdAt: string;
  featured?: boolean;
  className?: string;
}

export function ReviewCard({
  rating,
  comment,
  customerName,
  createdAt,
  featured = false,
  className,
}: ReviewCardProps) {
  const formattedDate = new Date(createdAt).toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div
      className={cn(
        'bg-card border rounded-lg p-5 relative',
        featured && 'border-primary/50 bg-primary/5',
        className
      )}
    >
      {featured && (
        <div className="absolute -top-2 -right-2">
          <div className="bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full flex items-center gap-1">
            <Award className="w-3 h-3" />
            Featured
          </div>
        </div>
      )}

      {/* Star Rating */}
      <div className="flex gap-1 mb-3">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={cn(
              'w-5 h-5',
              star <= rating
                ? 'text-yellow-400 fill-yellow-400'
                : 'text-gray-300'
            )}
          />
        ))}
      </div>

      {/* Comment */}
      {comment && (
        <p className="text-sm text-foreground mb-4 line-clamp-4">
          &ldquo;{comment}&rdquo;
        </p>
      )}

      {/* Customer info */}
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{customerName}</span>
        <span className="text-muted-foreground">{formattedDate}</span>
      </div>
    </div>
  );
}
