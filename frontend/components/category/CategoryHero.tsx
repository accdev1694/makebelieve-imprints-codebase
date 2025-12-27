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
  gradient = 'from-black/90 via-black/85 to-black/75',
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
        <div className="max-w-3xl text-white">
          <p className="text-base md:text-lg font-medium text-white/80 mb-2 uppercase tracking-wider">
            {subtitle}
          </p>
          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
            {title}
          </h1>
          <p className="text-xl md:text-2xl text-white/90 mb-10 max-w-xl leading-relaxed">
            {description}
          </p>
          {ctaLink && (
            <Button
              asChild
              size="lg"
              className="bg-white text-indigo-900 font-bold hover:bg-white/90 gap-2"
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
