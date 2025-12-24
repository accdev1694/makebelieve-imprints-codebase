'use client';

import { Truck, Shield, Zap, Award } from 'lucide-react';

export function TrustBadges() {
  const badges = [
    {
      icon: Truck,
      title: 'Fast Shipping',
      description: '24-48hr turnaround on most orders',
    },
    {
      icon: Shield,
      title: 'Quality Guaranteed',
      description: '100% satisfaction or money back',
    },
    {
      icon: Zap,
      title: 'Easy Customization',
      description: 'Design tools built for everyone',
    },
    {
      icon: Award,
      title: 'Premium Materials',
      description: 'Professional-grade prints every time',
    },
  ];

  return (
    <section className="py-8 border-y border-border/50 bg-card/30">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {badges.map((badge, index) => {
            const Icon = badge.icon;
            return (
              <div key={index} className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">{badge.title}</h3>
                  <p className="text-sm text-muted-foreground">{badge.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
