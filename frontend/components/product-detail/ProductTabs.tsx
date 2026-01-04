'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Star } from 'lucide-react';

interface ProductTabsProps {
  description: string;
  specifications?: Record<string, string>;
}

export function ProductTabs({ description, specifications }: ProductTabsProps) {
  const [activeTab, setActiveTab] = useState<'description' | 'specifications' | 'reviews'>(
    'description'
  );

  const tabs = [
    { id: 'description' as const, label: 'Description' },
    { id: 'specifications' as const, label: 'Specifications' },
    { id: 'reviews' as const, label: 'Reviews (127)' },
  ];

  // Mock reviews data
  const mockReviews = [
    {
      id: 1,
      author: 'John D.',
      rating: 5,
      date: '2 weeks ago',
      comment: 'Excellent quality! The print came out perfect and shipping was super fast.',
      verified: true,
    },
    {
      id: 2,
      author: 'Sarah M.',
      rating: 4,
      date: '1 month ago',
      comment: 'Great product overall. Colors are vibrant. Would order again!',
      verified: true,
    },
    {
      id: 3,
      author: 'Mike R.',
      rating: 5,
      date: '2 months ago',
      comment: 'Exactly what I needed for my business. Professional quality.',
      verified: true,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Tab Headers */}
      <div className="border-b border-border">
        <div className="flex gap-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-4 px-2 font-semibold transition-colors relative ${
                activeTab === tab.id
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="py-6">
        {activeTab === 'description' && (
          <div className="prose prose-sm max-w-none">
            <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
              {description}
            </p>

            <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">
              Perfect For:
            </h3>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>Personal gifts and celebrations</li>
              <li>Business promotions and branding</li>
              <li>Event merchandise and giveaways</li>
              <li>Custom artwork display</li>
            </ul>

            <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">
              What&apos;s Included:
            </h3>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>High-quality printed product</li>
              <li>Professional packaging</li>
              <li>Quality inspection guarantee</li>
              <li>Care instructions</li>
            </ul>
          </div>
        )}

        {activeTab === 'specifications' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {specifications ? (
              Object.entries(specifications).map(([key, value]) => (
                <div key={key} className="flex justify-between py-3 border-b border-border">
                  <span className="font-semibold text-foreground">{key}:</span>
                  <span className="text-muted-foreground">{value}</span>
                </div>
              ))
            ) : (
              <>
                <div className="flex justify-between py-3 border-b border-border">
                  <span className="font-semibold text-foreground">Material:</span>
                  <span className="text-muted-foreground">Premium Quality</span>
                </div>
                <div className="flex justify-between py-3 border-b border-border">
                  <span className="font-semibold text-foreground">Print Method:</span>
                  <span className="text-muted-foreground">High-Quality Print</span>
                </div>
                <div className="flex justify-between py-3 border-b border-border">
                  <span className="font-semibold text-foreground">Durability:</span>
                  <span className="text-muted-foreground">Long-lasting</span>
                </div>
                <div className="flex justify-between py-3 border-b border-border">
                  <span className="font-semibold text-foreground">Care Instructions:</span>
                  <span className="text-muted-foreground">Hand wash recommended</span>
                </div>
                <div className="flex justify-between py-3 border-b border-border">
                  <span className="font-semibold text-foreground">Production Time:</span>
                  <span className="text-muted-foreground">1-2 business days</span>
                </div>
                <div className="flex justify-between py-3 border-b border-border">
                  <span className="font-semibold text-foreground">Shipping:</span>
                  <span className="text-muted-foreground">2-3 business days</span>
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'reviews' && (
          <div className="space-y-8">
            {/* Rating Summary */}
            <Card className="p-6 card-glow">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="text-center md:text-left">
                  <div className="text-5xl font-bold text-foreground mb-2">4.5</div>
                  <div className="flex items-center gap-2 justify-center md:justify-start mb-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`h-5 w-5 ${
                          i < 4 ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/50'
                        }`}
                      />
                    ))}
                  </div>
                  <div className="text-sm text-muted-foreground">Based on 127 reviews</div>
                </div>
                <div className="space-y-2">
                  {[5, 4, 3, 2, 1].map((stars) => (
                    <div key={stars} className="flex items-center gap-3">
                      <span className="text-sm w-8">{stars}★</span>
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary"
                          style={{ width: `${stars === 5 ? 70 : stars === 4 ? 20 : 5}%` }}
                        />
                      </div>
                      <span className="text-sm text-muted-foreground w-12">
                        {stars === 5 ? 89 : stars === 4 ? 25 : stars === 3 ? 8 : 3}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            {/* Individual Reviews */}
            <div className="space-y-6">
              {mockReviews.map((review) => (
                <Card key={review.id} className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="font-semibold text-foreground">{review.author}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex gap-1">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`h-4 w-4 ${
                                i < review.rating
                                  ? 'fill-yellow-400 text-yellow-400'
                                  : 'text-muted-foreground/50'
                              }`}
                            />
                          ))}
                        </div>
                        {review.verified && (
                          <span className="text-xs text-green-600">Verified Purchase</span>
                        )}
                      </div>
                    </div>
                    <span className="text-sm text-muted-foreground">{review.date}</span>
                  </div>
                  <p className="text-muted-foreground">{review.comment}</p>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
