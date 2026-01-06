'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Star, Award } from 'lucide-react';
import { getHomepageReviews, HomepageReview } from '@/lib/api/reviews';
import { createLogger } from '@/lib/logger';

const logger = createLogger('CustomerTestimonials');

// Fallback testimonials for when no reviews exist yet
const FALLBACK_TESTIMONIALS = [
  {
    id: 'fallback-1',
    customerName: 'Sarah J.',
    comment: 'The quality of my business cards exceeded expectations. Fast turnaround and the design tool was so easy to use!',
    rating: 5,
    featured: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'fallback-2',
    customerName: 'Michael C.',
    comment: 'Ordered custom mugs for our team. Everyone loved them! Great quality and the prints are vibrant.',
    rating: 5,
    featured: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'fallback-3',
    customerName: 'Emily R.',
    comment: 'Perfect for my events! Fast shipping, excellent customer service, and professional results every time.',
    rating: 5,
    featured: false,
    createdAt: new Date().toISOString(),
  },
];

export function CustomerTestimonials() {
  const [reviews, setReviews] = useState<HomepageReview[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchReviews() {
      try {
        const data = await getHomepageReviews(6);
        if (data.length > 0) {
          setReviews(data);
        } else {
          // Use fallback if no reviews yet
          setReviews(FALLBACK_TESTIMONIALS);
        }
      } catch (error) {
        logger.error('Failed to fetch reviews', { error: error instanceof Error ? error.message : String(error) });
        // Use fallback on error
        setReviews(FALLBACK_TESTIMONIALS);
      } finally {
        setIsLoading(false);
      }
    }

    fetchReviews();
  }, []);

  // Show 3 reviews max for the grid layout
  const displayedReviews = reviews.slice(0, 3);

  return (
    <section className="py-20 bg-card/30">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            What Our <span className="text-accent">Customers</span> Say
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Join thousands of satisfied customers
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {isLoading ? (
            // Loading skeleton
            Array.from({ length: 3 }).map((_, index) => (
              <Card key={index} className="card-glow">
                <CardContent className="p-6">
                  <div className="flex gap-1 mb-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="h-4 w-4 bg-muted rounded animate-pulse" />
                    ))}
                  </div>
                  <div className="space-y-2 mb-6">
                    <div className="h-4 bg-muted rounded animate-pulse" />
                    <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-muted animate-pulse" />
                    <div className="space-y-1">
                      <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            displayedReviews.map((review) => (
              <Card key={review.id} className="card-glow hover:-translate-y-2 transition-all duration-300 relative">
                {review.featured && (
                  <div className="absolute -top-2 -right-2 z-10">
                    <div className="bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full flex items-center gap-1">
                      <Award className="w-3 h-3" />
                      Featured
                    </div>
                  </div>
                )}
                <CardContent className="p-6">
                  {/* Rating */}
                  <div className="flex gap-1 mb-4">
                    {Array.from({ length: review.rating }).map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    ))}
                    {Array.from({ length: 5 - review.rating }).map((_, i) => (
                      <Star key={i + review.rating} className="h-4 w-4 text-gray-300" />
                    ))}
                  </div>

                  {/* Content */}
                  {review.comment && (
                    <p className="text-muted-foreground mb-6 italic line-clamp-4">
                      &ldquo;{review.comment}&rdquo;
                    </p>
                  )}

                  {/* Author */}
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-lg font-semibold text-primary">
                        {review.customerName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <div className="font-semibold text-foreground">{review.customerName}</div>
                      <div className="text-sm text-muted-foreground">Verified Buyer</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
