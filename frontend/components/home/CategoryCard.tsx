'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Card } from '@/components/ui/card';
import { ArrowRight } from 'lucide-react';

interface CategoryCardProps {
  title: string;
  description: string;
  image: string;
  href: string;
  productCount?: number;
}

export function CategoryCard({ title, description, image, href, productCount }: CategoryCardProps) {
  return (
    <Link href={href}>
      <Card className="group relative overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 card-glow h-full">
        {/* Image */}
        <div className="relative h-48 overflow-hidden">
          <Image
            src={image}
            alt={title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-110"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
          {/* Overlay gradient - theme aware */}
          <div className="absolute inset-0 bg-gradient-to-t dark:from-black/60 dark:via-black/20 from-black/40 via-black/10 to-transparent" />
        </div>

        {/* Content */}
        <div className="p-6">
          <h3 className="text-xl font-bold mb-2 text-foreground group-hover:text-primary transition-colors">
            {title}
          </h3>
          <p className="text-sm text-muted-foreground mb-4">{description}</p>

          <div className="flex items-center justify-between">
            {productCount && (
              <span className="text-xs text-muted-foreground">{productCount} products</span>
            )}
            <div className="flex items-center gap-2 text-primary text-sm font-medium group-hover:gap-3 transition-all">
              Shop Now
              <ArrowRight className="h-4 w-4" />
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}
