'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Star, ChevronRight, Gift } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getPendingReviews } from '@/lib/api/reviews';

export function PendingReviewsBanner() {
  const [pendingCount, setPendingCount] = useState(0);
  const [totalPoints, setTotalPoints] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchPending() {
      try {
        const data = await getPendingReviews();
        setPendingCount(data.orders.length);
        setTotalPoints(data.totalPotentialPoints);
      } catch (error) {
        console.error('Failed to fetch pending reviews:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchPending();
  }, []);

  if (isLoading || pendingCount === 0) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-primary/10 to-green-500/10 border border-primary/20 rounded-lg p-4 mb-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-primary/20 rounded-lg">
            <Star className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold">
              You have {pendingCount} order{pendingCount > 1 ? 's' : ''} to review!
            </h3>
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <Gift className="w-4 h-4 text-green-600" />
              Earn up to <span className="font-bold text-green-600">{totalPoints} points</span>
            </p>
          </div>
        </div>
        <Button asChild variant="default" size="sm">
          <Link href="/orders?filter=delivered" className="flex items-center gap-1">
            Leave Reviews
            <ChevronRight className="w-4 h-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
