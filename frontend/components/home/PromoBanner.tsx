'use client';

import { Button } from '@/components/ui/button';
import Link from 'next/link';
import Image from 'next/image';

interface PromoBannerProps {
  title: string;
  description: string;
  ctaText: string;
  ctaLink: string;
  image: string;
  imagePosition?: 'left' | 'right';
}

export function PromoBanner({
  title,
  description,
  ctaText,
  ctaLink,
  image,
  imagePosition = 'right',
}: PromoBannerProps) {
  return (
    <section className="py-16">
      <div className="container mx-auto px-4">
        <div
          className={`relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/10 via-accent/5 to-secondary/10 border border-primary/20 ${
            imagePosition === 'left' ? 'flex-row-reverse' : ''
          }`}
        >
          <div className="grid md:grid-cols-2 gap-8 items-center">
            {/* Content */}
            <div className={`p-8 md:p-12 ${imagePosition === 'left' ? 'md:text-right' : ''}`}>
              <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">{title}</h2>
              <p className="text-lg text-muted-foreground mb-8">{description}</p>
              <Link href={ctaLink}>
                <Button size="lg" className="btn-gradient px-8 py-6 text-lg">
                  {ctaText}
                </Button>
              </Link>
            </div>

            {/* Image */}
            <div className="relative h-64 md:h-96">
              <Image
                src={image}
                alt={title}
                fill
                priority
                className="object-cover rounded-r-3xl"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
