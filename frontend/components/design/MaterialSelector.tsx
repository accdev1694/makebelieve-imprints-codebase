'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Material, MATERIAL_LABELS } from '@/lib/api/designs';

interface MaterialSelectorProps {
  selected: Material;
  onSelect: (material: Material) => void;
}

const MATERIAL_DESCRIPTIONS: Record<Material, string> = {
  MATTE: 'Smooth, non-reflective surface',
  GLOSSY: 'Vibrant colors with a shiny finish',
  CANVAS: 'Premium textured canvas print',
  FINE_ART: 'Museum-quality fine art print',
};

const MATERIAL_ICONS: Record<Material, string> = {
  MATTE: '📋',
  GLOSSY: '📄',
  CANVAS: '🖼️',
  FINE_ART: '🎨',
};

export function MaterialSelector({ selected, onSelect }: MaterialSelectorProps) {
  const materials: Material[] = ['MATTE', 'GLOSSY', 'CANVAS', 'FINE_ART'];

  return (
    <div>
      <h3 className="text-lg font-semibold text-foreground mb-4">Select Material</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {materials.map((material) => (
          <Card
            key={material}
            className={`
              cursor-pointer transition-all duration-300 hover:scale-105
              ${
                selected === material
                  ? 'border-primary bg-primary/10 shadow-lg shadow-primary/20'
                  : 'border-border bg-card/50 hover:border-primary/50'
              }
            `}
            onClick={() => onSelect(material)}
          >
            <CardContent className="p-4 text-center space-y-2">
              <div className="text-3xl">{MATERIAL_ICONS[material]}</div>
              <div className="font-semibold text-foreground">
                {MATERIAL_LABELS[material]}
              </div>
              <div className="text-xs text-muted-foreground">
                {MATERIAL_DESCRIPTIONS[material]}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
