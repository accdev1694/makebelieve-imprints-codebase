'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SlidersHorizontal } from 'lucide-react';

interface MobileFilterButtonProps {
  onClick: () => void;
  activeCount: number;
}

export function MobileFilterButton({ onClick, activeCount }: MobileFilterButtonProps) {
  return (
    <Button
      onClick={onClick}
      variant="outline"
      className="lg:hidden w-full mb-6 relative justify-center"
    >
      <SlidersHorizontal className="mr-2 h-4 w-4" />
      Filters
      {activeCount > 0 && (
        <Badge className="ml-2 bg-primary text-primary-foreground px-2 py-0.5">
          {activeCount}
        </Badge>
      )}
    </Button>
  );
}
