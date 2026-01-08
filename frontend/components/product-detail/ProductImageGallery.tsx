'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Card } from '@/components/ui/card';
import { ZoomIn, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ProductImageGalleryProps {
  images: string[];
  productName: string;
}

export function ProductImageGallery({ images, productName }: ProductImageGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);

  const handlePrevious = () => {
    setSelectedIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setSelectedIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const currentImage = images[selectedIndex] || images[0];

  return (
    <div className="space-y-4">
      {/* Main Image */}
      <Card className="relative overflow-hidden group card-glow">
        <div className="relative aspect-square bg-muted">
          <Image
            src={currentImage}
            alt={`${productName} - Image ${selectedIndex + 1}`}
            fill
            className={`object-cover transition-transform duration-300 ${
              isZoomed ? 'scale-150 cursor-zoom-out' : 'cursor-zoom-in'
            }`}
            sizes="(max-width: 768px) 100vw, 50vw"
            priority={selectedIndex === 0}
            onClick={() => setIsZoomed(!isZoomed)}
            unoptimized={currentImage.includes('placehold.co')}
          />

          {/* Zoom Icon */}
          <div className="absolute top-4 right-4 dark:bg-black/50 bg-white/80 rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <ZoomIn className="h-5 w-5 dark:text-white text-foreground" />
          </div>

          {/* Navigation Arrows */}
          {images.length > 1 && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-2 top-1/2 -translate-y-1/2 dark:bg-black/50 dark:hover:bg-black/70 dark:text-white bg-white/80 hover:bg-white text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={handlePrevious}
                aria-label="Previous image"
              >
                <ChevronLeft className="h-6 w-6" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2 dark:bg-black/50 dark:hover:bg-black/70 dark:text-white bg-white/80 hover:bg-white text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={handleNext}
                aria-label="Next image"
              >
                <ChevronRight className="h-6 w-6" />
              </Button>
            </>
          )}

          {/* Image Counter */}
          {images.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 dark:bg-black/70 dark:text-white bg-white/90 text-foreground px-3 py-1 rounded-full text-sm">
              {selectedIndex + 1} / {images.length}
            </div>
          )}
        </div>
      </Card>

      {/* Thumbnail Grid */}
      {images.length > 1 && (
        <div className="grid grid-cols-4 gap-3">
          {images.map((image, index) => (
            <Card
              key={index}
              className={`relative aspect-square cursor-pointer overflow-hidden transition-all duration-200 ${
                selectedIndex === index
                  ? 'ring-2 ring-primary ring-offset-2 ring-offset-background'
                  : 'opacity-70 hover:opacity-100'
              }`}
              onClick={() => setSelectedIndex(index)}
            >
              <Image
                src={image}
                alt={`${productName} thumbnail ${index + 1}`}
                fill
                className="object-cover"
                sizes="150px"
                unoptimized={image.includes('placehold.co')}
              />
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
