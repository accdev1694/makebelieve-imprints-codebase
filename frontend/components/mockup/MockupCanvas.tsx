'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { MockupTemplate, PrintArea } from '@/lib/mockup-templates';
import { getShapeRenderer, PRODUCT_COLORS, PrintAreaResult } from '@/lib/product-shapes';

interface MockupCanvasProps {
  /** User's design image URL or data URL */
  designUrl: string;
  /** Template configuration */
  template?: MockupTemplate;
  /** Product type for programmatic rendering */
  productType?: string;
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
  productType,
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

  // Determine product type from template or prop
  const effectiveProductType = productType || template?.productType || 'GENERIC';

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

      // Load image helper
      const loadImage = (src: string): Promise<HTMLImageElement> => {
        return new Promise((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => resolve(img);
          img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
          img.src = src;
        });
      };

      // Variables to track print area
      let printX: number;
      let printY: number;
      let printWidth: number;
      let printHeight: number;
      let clipPath: Path2D | undefined;

      // Try programmatic shape renderer first
      const shapeRenderer = getShapeRenderer(effectiveProductType);

      if (shapeRenderer) {
        // Use programmatic product shape
        const colors = PRODUCT_COLORS[effectiveProductType] || { primary: '#FFFFFF', secondary: '#F0F0F0' };

        // Draw background
        ctx.fillStyle = '#F5F5F5';
        ctx.fillRect(0, 0, width, height);

        // Draw the product shape and get print area
        const result: PrintAreaResult = shapeRenderer({
          ctx,
          width,
          height,
          primaryColor: colors.primary,
          secondaryColor: colors.secondary,
        });

        printX = result.x;
        printY = result.y;
        printWidth = result.width;
        printHeight = result.height;
        clipPath = result.clipPath;
      } else if (customPrintArea) {
        // Use custom print area with simple background
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, width, height);
        ctx.strokeStyle = '#E0E0E0';
        ctx.lineWidth = 2;
        ctx.strokeRect(10, 10, width - 20, height - 20);

        printX = (customPrintArea.x / 100) * width;
        printY = (customPrintArea.y / 100) * height;
        printWidth = (customPrintArea.width / 100) * width;
        printHeight = (customPrintArea.height / 100) * height;
      } else if (template?.printArea) {
        // Use template print area with background
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, width, height);

        printX = (template.printArea.x / 100) * width;
        printY = (template.printArea.y / 100) * height;
        printWidth = (template.printArea.width / 100) * width;
        printHeight = (template.printArea.height / 100) * height;
      } else {
        // Fallback to centered print area
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, width, height);

        printX = width * 0.1;
        printY = height * 0.1;
        printWidth = width * 0.8;
        printHeight = height * 0.8;
      }

      // Save context for clipping
      ctx.save();

      // Apply clipping
      if (clipPath) {
        ctx.clip(clipPath);
      } else if (template?.clipShape === 'circle') {
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
        const rotation = customPrintArea?.rotation || template?.printArea?.rotation;
        if (rotation) {
          const centerX = printX + printWidth / 2;
          const centerY = printY + printHeight / 2;
          ctx.translate(centerX, centerY);
          ctx.rotate((rotation * Math.PI) / 180);
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
  }, [designUrl, template, effectiveProductType, customPrintArea, backgroundColor, width, height, onRender]);

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
