'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

interface CategoryHeroProps {
  title: string;
  subtitle: string;
  description: string;
  heroImage: string;
  ctaText?: string;
  ctaLink?: string;
  gradient?: string;
}

export function CategoryHero({
  title,
  subtitle,
  description,
  heroImage,
  ctaText = 'Browse Products',
  ctaLink,
  gradient = 'from-primary/90 to-purple-600/90',
}: CategoryHeroProps) {
  return (
    <section className="relative overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0">
        <Image
          src={heroImage}
          alt={title}
          fill
          className="object-cover"
          priority
          sizes="100vw"
        />
        <div className={`absolute inset-0 bg-gradient-to-r ${gradient}`} />
      </div>

      {/* Content */}
      <div className="relative container mx-auto px-4 py-20 md:py-32">
        <div className="max-w-2xl text-white">
          <p className="text-sm md:text-base font-medium text-white/80 mb-2 uppercase tracking-wider">
            {subtitle}
          </p>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
            {title}
          </h1>
          <p className="text-lg md:text-xl text-white/90 mb-8 max-w-xl">
            {description}
          </p>
          {ctaLink && (
            <Button
              asChild
              size="lg"
              className="bg-white text-primary hover:bg-white/90 gap-2"
            >
              <Link href={ctaLink}>
                {ctaText}
                <ArrowRight className="h-5 w-5" />
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Decorative Elements */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
}
