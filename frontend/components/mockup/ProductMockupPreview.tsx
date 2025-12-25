'use client';

import { useState, useMemo } from 'react';
import { MockupCanvas } from './MockupCanvas';
import {
  getMockupTemplates,
  getDefaultMockupTemplate,
  MockupTemplate,
  MOCKUP_PLACEHOLDER_COLORS,
} from '@/lib/mockup-templates';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Layers, RotateCcw, Download, ChevronLeft, ChevronRight } from 'lucide-react';

// Product types that support mockup preview
const PRODUCT_TYPES = [
  { value: 'MUG', label: 'Mug' },
  { value: 'TSHIRT', label: 'T-Shirt' },
  { value: 'CUSHION_PILLOW', label: 'Cushion' },
  { value: 'MOUSEMAT', label: 'Mousemat' },
  { value: 'CANVAS_PRINT', label: 'Canvas' },
  { value: 'POSTER', label: 'Poster' },
  { value: 'KEYCHAIN', label: 'Keychain' },
  { value: 'WATER_BOTTLE', label: 'Bottle' },
  { value: 'BUSINESS_CARD', label: 'Business Card' },
  { value: 'GREETING_CARD', label: 'Greeting Card' },
] as const;

interface ProductMockupPreviewProps {
  /** User's design image URL or data URL */
  designUrl: string;
  /** Initial product type */
  initialProductType?: string;
  /** Whether to show product type selector */
  showProductSelector?: boolean;
  /** Canvas size */
  size?: number;
  /** Optional class name */
  className?: string;
  /** Callback when mockup is generated */
  onMockupGenerated?: (dataUrl: string, productType: string) => void;
}

/**
 * Product Mockup Preview Component
 * Shows a real-time preview of a design on various product types
 */
export function ProductMockupPreview({
  designUrl,
  initialProductType = 'MUG',
  showProductSelector = true,
  size = 400,
  className = '',
  onMockupGenerated,
}: ProductMockupPreviewProps) {
  const [selectedProductType, setSelectedProductType] = useState(initialProductType);
  const [currentTemplateIndex, setCurrentTemplateIndex] = useState(0);
  const [mockupDataUrl, setMockupDataUrl] = useState<string | null>(null);

  // Get templates for selected product type
  const templates = useMemo(
    () => getMockupTemplates(selectedProductType),
    [selectedProductType]
  );

  const currentTemplate = templates[currentTemplateIndex] || getDefaultMockupTemplate(selectedProductType);
  const backgroundColor = MOCKUP_PLACEHOLDER_COLORS[selectedProductType] || '#FFFFFF';

  const handleProductChange = (productType: string) => {
    setSelectedProductType(productType);
    setCurrentTemplateIndex(0);
  };

  const handleNextTemplate = () => {
    setCurrentTemplateIndex((prev) => (prev + 1) % templates.length);
  };

  const handlePrevTemplate = () => {
    setCurrentTemplateIndex((prev) => (prev - 1 + templates.length) % templates.length);
  };

  const handleRender = (dataUrl: string) => {
    setMockupDataUrl(dataUrl);
    if (onMockupGenerated) {
      onMockupGenerated(dataUrl, selectedProductType);
    }
  };

  const handleDownload = () => {
    if (!mockupDataUrl) return;

    const link = document.createElement('a');
    link.download = `mockup-${selectedProductType.toLowerCase()}-${Date.now()}.png`;
    link.href = mockupDataUrl;
    link.click();
  };

  const handleReset = () => {
    setCurrentTemplateIndex(0);
  };

  return (
    <Card className={`card-glow ${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Layers className="h-5 w-5 text-primary" />
          Product Mockup Preview
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Product Type Selector */}
        {showProductSelector && (
          <div className="flex flex-wrap gap-2">
            {PRODUCT_TYPES.map((type) => (
              <Button
                key={type.value}
                variant={selectedProductType === type.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleProductChange(type.value)}
                className={selectedProductType === type.value ? 'btn-gradient' : ''}
              >
                {type.label}
              </Button>
            ))}
          </div>
        )}

        {/* Mockup Canvas */}
        <div className="relative">
          <MockupCanvas
            designUrl={designUrl}
            template={currentTemplate}
            productType={selectedProductType}
            backgroundColor={backgroundColor}
            width={size}
            height={size}
            onRender={handleRender}
          />

          {/* Template Navigation (if multiple templates) */}
          {templates.length > 1 && (
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-background/80 backdrop-blur-sm rounded-full px-3 py-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={handlePrevTemplate}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-xs text-muted-foreground">
                {currentTemplateIndex + 1} / {templates.length}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={handleNextTemplate}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Template Info */}
        <div className="text-center">
          <p className="text-sm font-medium">{currentTemplate.name}</p>
          <p className="text-xs text-muted-foreground">
            {PRODUCT_TYPES.find((t) => t.value === selectedProductType)?.label || selectedProductType}
          </p>
        </div>

        {/* Actions */}
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            className="gap-1"
          >
            <RotateCcw className="h-4 w-4" />
            Reset
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
            disabled={!mockupDataUrl}
            className="gap-1"
          >
            <Download className="h-4 w-4" />
            Download
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
