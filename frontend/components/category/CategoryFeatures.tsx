'use client';

import { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';

interface Feature {
  icon: ReactNode;
  title: string;
  description: string;
}

interface CategoryFeaturesProps {
  title?: string;
  subtitle?: string;
  features: Feature[];
}

export function CategoryFeatures({
  title = 'Why Choose Us',
  subtitle,
  features,
}: CategoryFeaturesProps) {
  return (
    <section className="py-16 bg-muted/50">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        {(title || subtitle) && (
          <div className="text-center mb-12">
            {subtitle && (
              <p className="text-sm font-medium text-primary mb-2 uppercase tracking-wider">
                {subtitle}
              </p>
            )}
            {title && (
              <h2 className="text-3xl font-bold">{title}</h2>
            )}
          </div>
        )}

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <Card
              key={index}
              className="border-0 shadow-sm hover:shadow-md transition-shadow bg-card"
            >
              <CardContent className="pt-6 text-center">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4 text-primary">
                  {feature.icon}
                </div>
                <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
