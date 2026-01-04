'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import Image from 'next/image';

export function HeroSection() {
  return (
    <section className="relative min-h-[600px] md:min-h-[700px] flex items-center overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/images/hero.png"
          alt="MakeBelieve Imprints - Professional printing services"
          fill
          className="object-cover"
          priority
          sizes="100vw"
        />
        {/* Overlay for text readability - adapts to theme */}
        <div className="absolute inset-0 bg-gradient-to-r dark:from-black/80 dark:via-black/65 dark:to-black/50 from-black/60 via-black/45 to-black/30" />
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 py-20">
        <div className="max-w-3xl">
          {/* Badge */}
          <Badge variant="outline" className="border-primary/50 text-primary mb-6 text-sm px-4 py-2">
            Custom Printing Made Simple
          </Badge>

          {/* Headline */}
          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
            <span className="text-neon-gradient">MakeBelieve Imprints</span>
          </h1>

          {/* Subheadline */}
          <p className="text-xl md:text-2xl text-white/90 mb-10 leading-relaxed">
            From business cards to custom gifts - bring your ideas to life with professional
            quality printing and fast delivery.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Link href="/products" className="w-full sm:w-auto">
              <Button size="lg" className="btn-gradient px-8 py-6 text-lg w-full">
                Browse Products
              </Button>
            </Link>
            <Link href="/templates" className="w-full sm:w-auto">
              <Button
                size="lg"
                variant="outline"
                className="px-8 py-6 text-lg border-2 border-white/30 bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 hover:border-white/50 w-full"
              >
                Browse Templates
              </Button>
            </Link>
            <Link href="/design/new" className="w-full sm:w-auto">
              <Button
                size="lg"
                variant="outline"
                className="px-8 py-6 text-lg border-2 border-primary/50 bg-primary/10 backdrop-blur-sm text-white hover:bg-primary/20 hover:border-primary/70 w-full"
              >
                Start Custom Design
              </Button>
            </Link>
          </div>

          {/* Quick Stats/Trust Signals */}
          <div className="flex flex-wrap gap-8 mt-12 pt-8 border-t border-white/20">
            <div>
              <div className="text-3xl font-bold text-white">50,000+</div>
              <div className="text-white/70 text-sm">Happy Customers</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-white">24-48hr</div>
              <div className="text-white/70 text-sm">Fast Turnaround</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-white">100%</div>
              <div className="text-white/70 text-sm">Quality Guaranteed</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
