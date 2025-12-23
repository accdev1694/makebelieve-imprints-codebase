'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Search, Palette, Rocket } from 'lucide-react';

export function HowItWorksSection() {
  const steps = [
    {
      icon: Search,
      title: 'Choose Your Product',
      description: 'Browse our catalog of customizable products - from business cards to gifts',
      step: '01',
    },
    {
      icon: Palette,
      title: 'Customize Your Design',
      description: 'Use our easy design tools or upload your own artwork',
      step: '02',
    },
    {
      icon: Rocket,
      title: 'Receive & Enjoy',
      description: 'Fast production and shipping - your order delivered in 24-48 hours',
      step: '03',
    },
  ];

  return (
    <section className="py-20 bg-gradient-to-b from-background to-card/30">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            How It <span className="text-primary">Works</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Get your custom prints in three simple steps
          </p>
        </div>

        {/* Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <Card
                key={index}
                className="relative card-glow hover:-translate-y-2 transition-all duration-300"
              >
                <CardContent className="p-8 text-center">
                  {/* Step Number */}
                  <div className="absolute top-4 right-4 text-6xl font-bold text-primary/10">
                    {step.step}
                  </div>

                  {/* Icon */}
                  <div className="relative mb-6 inline-block">
                    <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                      <Icon className="h-10 w-10 text-primary" />
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="text-xl font-bold mb-3 text-foreground">{step.title}</h3>

                  {/* Description */}
                  <p className="text-muted-foreground">{step.description}</p>
                </CardContent>

                {/* Connector Line (hidden on last item and mobile) */}
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-1/2 -right-4 w-8 h-0.5 bg-primary/30 z-20" />
                )}
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
