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
          src="https://images.unsplash.com/photo-1542744094-3a31f272c490?w=1920&q=80"
          alt="Custom printing hero"
          fill
          className="object-cover"
          priority
          sizes="100vw"
        />
        {/* Dark overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-black/40" />
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 py-20">
        <div className="max-w-3xl">
          {/* Badge */}
          <Badge variant="outline" className="border-primary/50 text-primary mb-6 text-sm px-4 py-2">
            ✨ Professional Custom Printing
          </Badge>

          {/* Headline */}
          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
            <span className="text-white">Custom Printing</span>
            <br />
            <span className="text-neon-gradient">Made Simple</span>
          </h1>

          {/* Subheadline */}
          <p className="text-xl md:text-2xl text-gray-200 mb-10 leading-relaxed">
            From business cards to custom gifts - bring your ideas to life with professional
            quality printing and fast delivery.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Link href="/products">
              <Button size="lg" className="btn-gradient px-8 py-6 text-lg w-full sm:w-auto">
                Browse Products
              </Button>
            </Link>
            <Link href="/design/new">
              <Button
                size="lg"
                variant="outline"
                className="px-8 py-6 text-lg border-2 border-white/30 bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 hover:border-white/50 w-full sm:w-auto"
              >
                Start Custom Design
              </Button>
            </Link>
          </div>

          {/* Quick Stats/Trust Signals */}
          <div className="flex flex-wrap gap-8 mt-12 pt-8 border-t border-white/20">
            <div>
              <div className="text-3xl font-bold text-white">50,000+</div>
              <div className="text-gray-300 text-sm">Happy Customers</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-white">24-48hr</div>
              <div className="text-gray-300 text-sm">Fast Turnaround</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-white">100%</div>
              <div className="text-gray-300 text-sm">Quality Guaranteed</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
