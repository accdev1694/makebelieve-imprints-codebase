'use client';

import { useState } from 'react';
import { Template, templates, getCategories, getCategoryName } from '@/lib/templates';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles } from 'lucide-react';

interface TemplateSelectorProps {
  onSelect: (template: Template) => void;
  selectedTemplate?: Template | null;
}

export function TemplateSelector({ onSelect, selectedTemplate }: TemplateSelectorProps) {
  const [selectedCategory, setSelectedCategory] = useState<Template['category'] | 'all'>('all');
  const categories = getCategories();

  const filteredTemplates =
    selectedCategory === 'all'
      ? templates
      : templates.filter((t) => t.category === selectedCategory);

  return (
    <div className="space-y-6">
      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={selectedCategory === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectedCategory('all')}
          className={selectedCategory === 'all' ? 'btn-gradient' : ''}
        >
          All Templates
        </Button>
        {categories.map((category) => (
          <Button
            key={category}
            variant={selectedCategory === category ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory(category)}
            className={selectedCategory === category ? 'btn-gradient' : ''}
          >
            {getCategoryName(category)}
          </Button>
        ))}
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTemplates.map((template) => (
          <Card
            key={template.id}
            className={`cursor-pointer transition-all hover:shadow-lg ${
              selectedTemplate?.id === template.id
                ? 'ring-2 ring-primary shadow-glow-primary'
                : 'hover:shadow-glow-primary/30'
            }`}
            onClick={() => onSelect(template)}
          >
            <CardContent className="p-4">
              {/* Template Preview */}
              <div className="aspect-[3/4] bg-muted rounded-lg overflow-hidden mb-3 relative">
                {/* Placeholder for template image */}
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 via-secondary/5 to-accent/10">
                  <Sparkles className="w-12 h-12 text-muted-foreground/30" />
                </div>
                {selectedTemplate?.id === template.id && (
                  <div className="absolute top-2 right-2">
                    <Badge className="bg-primary text-primary-foreground">Selected</Badge>
                  </div>
                )}
              </div>

              {/* Template Info */}
              <div>
                <h3 className="font-semibold text-sm mb-1">{template.name}</h3>
                <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                  {template.description}
                </p>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {template.recommendedSize}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {template.recommendedMaterial.replace('_', ' ')}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredTemplates.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p>No templates found in this category</p>
        </div>
      )}
    </div>
  );
}
