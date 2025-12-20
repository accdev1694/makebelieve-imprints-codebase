'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PrintSize, Orientation, PRINT_SIZE_LABELS, ORIENTATION_LABELS } from '@/lib/api/designs';

interface SizeSelectorProps {
  selectedSize: PrintSize;
  selectedOrientation: Orientation;
  customWidth?: number;
  customHeight?: number;
  onSizeSelect: (size: PrintSize) => void;
  onOrientationSelect: (orientation: Orientation) => void;
  onCustomDimensionsChange: (width: number, height: number) => void;
}

export function SizeSelector({
  selectedSize,
  selectedOrientation,
  customWidth,
  customHeight,
  onSizeSelect,
  onOrientationSelect,
  onCustomDimensionsChange,
}: SizeSelectorProps) {
  const sizes: PrintSize[] = ['A4', 'A5', 'A6', 'SQUARE_10x10', 'SQUARE_15x15', 'CUSTOM'];
  const orientations: Orientation[] = ['PORTRAIT', 'LANDSCAPE', 'SQUARE'];

  return (
    <div className="space-y-6">
      {/* Size Selection */}
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-4">Select Size</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {sizes.map((size) => (
            <Card
              key={size}
              className={`
                cursor-pointer transition-all duration-300 hover:scale-105
                ${
                  selectedSize === size
                    ? 'border-secondary bg-secondary/10 shadow-lg shadow-secondary/20'
                    : 'border-border bg-card/50 hover:border-secondary/50'
                }
              `}
              onClick={() => onSizeSelect(size)}
            >
              <CardContent className="p-4 text-center">
                <div className="font-semibold text-foreground text-sm">
                  {PRINT_SIZE_LABELS[size]}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Custom Dimensions */}
      {selectedSize === 'CUSTOM' && (
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-muted-foreground">Custom Dimensions (cm)</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="width" className="block text-sm font-medium text-foreground mb-2">
                Width
              </label>
              <Input
                id="width"
                type="number"
                placeholder="Width (cm)"
                value={customWidth || ''}
                onChange={(e) =>
                  onCustomDimensionsChange(parseFloat(e.target.value) || 0, customHeight || 0)
                }
                min="1"
                step="0.1"
                className="bg-card/50"
              />
            </div>
            <div>
              <label htmlFor="height" className="block text-sm font-medium text-foreground mb-2">
                Height
              </label>
              <Input
                id="height"
                type="number"
                placeholder="Height (cm)"
                value={customHeight || ''}
                onChange={(e) =>
                  onCustomDimensionsChange(customWidth || 0, parseFloat(e.target.value) || 0)
                }
                min="1"
                step="0.1"
                className="bg-card/50"
              />
            </div>
          </div>
        </div>
      )}

      {/* Orientation Selection */}
      {!selectedSize.startsWith('SQUARE') && (
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-4">Orientation</h3>
          <div className="grid grid-cols-3 gap-4">
            {orientations.filter((o) => o !== 'SQUARE').map((orientation) => (
              <Card
                key={orientation}
                className={`
                  cursor-pointer transition-all duration-300 hover:scale-105
                  ${
                    selectedOrientation === orientation
                      ? 'border-accent bg-accent/10 shadow-lg shadow-accent/20'
                      : 'border-border bg-card/50 hover:border-accent/50'
                  }
                `}
                onClick={() => onOrientationSelect(orientation)}
              >
                <CardContent className="p-4 text-center">
                  <div className="font-semibold text-foreground text-sm">
                    {ORIENTATION_LABELS[orientation]}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
