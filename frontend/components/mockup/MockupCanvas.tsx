'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { MockupTemplate, PrintArea } from '@/lib/mockup-templates';

interface MockupCanvasProps {
  /** User's design image URL or data URL */
  designUrl: string;
  /** Template configuration */
  template?: MockupTemplate;
  /** Custom print area (overrides template) */
  printArea?: PrintArea;
  /** Background color when no template image */
  backgroundColor?: string;
  /** Canvas width */
  width?: number;
  /** Canvas height */
  height?: number;
  /** Optional class name */
  className?: string;
  /** Callback when mockup is rendered */
  onRender?: (dataUrl: string) => void;
}

/**
 * Canvas-based mockup renderer
 * Overlays a user's design onto a product template
 */
export function MockupCanvas({
  designUrl,
  template,
  printArea: customPrintArea,
  backgroundColor = '#FFFFFF',
  width = 500,
  height = 500,
  className = '',
  onRender,
}: MockupCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const printArea = customPrintArea || template?.printArea || {
    x: 10,
    y: 10,
    width: 80,
    height: 80,
  };

  const renderMockup = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsLoading(true);
    setError(null);

    try {
      // Clear canvas
      ctx.clearRect(0, 0, width, height);

      // Load images
      const loadImage = (src: string): Promise<HTMLImageElement> => {
        return new Promise((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => resolve(img);
          img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
          img.src = src;
        });
      };

      // Try to load template image, fall back to solid color
      let hasTemplateImage = false;
      if (template?.templateUrl) {
        try {
          const templateImg = await loadImage(template.templateUrl);
          ctx.drawImage(templateImg, 0, 0, width, height);
          hasTemplateImage = true;
        } catch {
          // Template image failed to load, use background color
          console.warn('Template image not found, using placeholder');
        }
      }

      // If no template image, draw background
      if (!hasTemplateImage) {
        // Draw background
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, width, height);

        // Draw a subtle product outline for context
        ctx.strokeStyle = '#E0E0E0';
        ctx.lineWidth = 2;
        ctx.strokeRect(10, 10, width - 20, height - 20);
      }

      // Calculate print area in pixels
      const printX = (printArea.x / 100) * width;
      const printY = (printArea.y / 100) * height;
      const printWidth = (printArea.width / 100) * width;
      const printHeight = (printArea.height / 100) * height;

      // Save context for clipping
      ctx.save();

      // Apply clipping based on shape
      if (template?.clipShape === 'circle') {
        const centerX = printX + printWidth / 2;
        const centerY = printY + printHeight / 2;
        const radius = Math.min(printWidth, printHeight) / 2;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.clip();
      } else if (template?.clipShape === 'rounded' && template.clipRadius) {
        const radius = template.clipRadius * (width / 100);
        ctx.beginPath();
        ctx.roundRect(printX, printY, printWidth, printHeight, radius);
        ctx.clip();
      }

      // Load and draw design image
      try {
        const designImg = await loadImage(designUrl);

        // Calculate aspect-ratio-preserving dimensions
        const imgAspect = designImg.width / designImg.height;
        const areaAspect = printWidth / printHeight;

        let drawWidth = printWidth;
        let drawHeight = printHeight;
        let drawX = printX;
        let drawY = printY;

        if (imgAspect > areaAspect) {
          // Image is wider - fit to width
          drawHeight = printWidth / imgAspect;
          drawY = printY + (printHeight - drawHeight) / 2;
        } else {
          // Image is taller - fit to height
          drawWidth = printHeight * imgAspect;
          drawX = printX + (printWidth - drawWidth) / 2;
        }

        // Apply rotation if specified
        if (printArea.rotation) {
          const centerX = printX + printWidth / 2;
          const centerY = printY + printHeight / 2;
          ctx.translate(centerX, centerY);
          ctx.rotate((printArea.rotation * Math.PI) / 180);
          ctx.translate(-centerX, -centerY);
        }

        // Draw the design
        ctx.drawImage(designImg, drawX, drawY, drawWidth, drawHeight);
      } catch {
        // Design image failed to load
        setError('Failed to load design image');
        ctx.restore();
        return;
      }

      // Restore context
      ctx.restore();

      // Add subtle shadow/depth effect for print area (only if we have a template)
      if (hasTemplateImage) {
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.lineWidth = 1;
        if (template?.clipShape === 'circle') {
          const centerX = printX + printWidth / 2;
          const centerY = printY + printHeight / 2;
          const radius = Math.min(printWidth, printHeight) / 2;
          ctx.beginPath();
          ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
          ctx.stroke();
        } else {
          ctx.strokeRect(printX, printY, printWidth, printHeight);
        }
      }

      // Callback with rendered data URL
      if (onRender) {
        onRender(canvas.toDataURL('image/png'));
      }

      setIsLoading(false);
    } catch (err) {
      console.error('Mockup render error:', err);
      setError('Failed to generate mockup');
      setIsLoading(false);
    }
  }, [designUrl, template, printArea, backgroundColor, width, height, onRender]);

  useEffect(() => {
    renderMockup();
  }, [renderMockup]);

  return (
    <div className={`relative ${className}`}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="w-full h-auto rounded-lg"
        style={{ maxWidth: width }}
      />
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50 rounded-lg">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-destructive/10 rounded-lg">
          <p className="text-destructive text-sm">{error}</p>
        </div>
      )}
    </div>
  );
}
