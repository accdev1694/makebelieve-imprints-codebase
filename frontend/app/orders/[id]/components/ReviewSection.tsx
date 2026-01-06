'use client';

import { Star, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ReviewForm } from '@/components/reviews';

interface ReviewSectionProps {
  orderId: string;
  hasReview: boolean;
  reviewSubmitted: boolean;
  showReviewForm: boolean;
  onShowReviewForm: (show: boolean) => void;
  onReviewSubmitted: () => void;
}

export function ReviewSection({
  orderId,
  hasReview,
  reviewSubmitted,
  showReviewForm,
  onShowReviewForm,
  onReviewSubmitted,
}: ReviewSectionProps) {
  // Show review form card for delivered orders that haven't been reviewed
  if (!hasReview && !reviewSubmitted) {
    return (
      <Card className="card-glow mb-6 border-green-500/30 bg-green-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-500" />
            Leave a Review
          </CardTitle>
          <CardDescription>Share your experience and earn 50 loyalty points!</CardDescription>
        </CardHeader>
        <CardContent>
          {showReviewForm ? (
            <ReviewForm
              orderId={orderId}
              onSuccess={onReviewSubmitted}
              onCancel={() => onShowReviewForm(false)}
            />
          ) : (
            <Button
              onClick={() => onShowReviewForm(true)}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              <Star className="w-4 h-4 mr-2" />
              Write a Review & Earn 50 Points
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  // Show success message after review is submitted
  if (reviewSubmitted) {
    return (
      <Card className="card-glow mb-6 border-green-500/50 bg-green-500/5">
        <CardContent className="py-6 text-center">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <CheckCircle className="w-6 h-6 text-green-600" />
          </div>
          <h3 className="font-semibold text-green-600 mb-1">Thank you for your review!</h3>
          <p className="text-sm text-muted-foreground">
            50 points have been added to your account.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Show "already reviewed" message
  if (hasReview) {
    return (
      <Card className="card-glow mb-6">
        <CardContent className="py-6 text-center">
          <div className="flex gap-1 justify-center mb-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star key={star} className="w-5 h-5 text-yellow-400 fill-yellow-400" />
            ))}
          </div>
          <p className="text-sm text-muted-foreground">
            You&apos;ve already reviewed this order. Thank you!
          </p>
        </CardContent>
      </Card>
    );
  }

  return null;
}
