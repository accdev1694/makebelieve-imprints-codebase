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
}: CategoryHeroProps) {
  return (
    <section className="relative overflow-hidden bg-slate-900">
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
        {/* Overlay gradient - adapts to theme */}
        <div className="absolute inset-0 bg-gradient-to-r dark:from-black/90 dark:via-black/85 dark:to-black/75 from-black/70 via-black/60 to-black/50" />
      </div>

      {/* Content */}
      <div className="relative container mx-auto px-4 py-20 md:py-32">
        <div className="max-w-3xl">
          <p className="text-base md:text-lg font-medium text-white/80 mb-2 uppercase tracking-wider">
            {subtitle}
          </p>
          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight text-white">
            {title}
          </h1>
          <p className="text-xl md:text-2xl text-white/90 mb-10 max-w-xl leading-relaxed">
            {description}
          </p>
          {ctaLink && (
            <Button
              asChild
              size="lg"
              className="dark:bg-white dark:text-indigo-900 dark:hover:bg-white/90 bg-primary text-primary-foreground hover:bg-primary/90 font-bold gap-2"
            >
              <Link href={ctaLink}>
                {ctaText}
                <ArrowRight className="h-5 w-5" />
              </Link>
            </Button>
          )}
        </div>
      </div>

    </section>
  );
}
