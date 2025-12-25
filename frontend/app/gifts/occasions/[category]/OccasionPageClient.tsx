'use client';

import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { ArrowLeft, Heart, Sparkles } from 'lucide-react';
import { getTemplatesByCategory, getCategoryName, Template } from '@/lib/templates';
import { useState } from 'react';

// Category metadata for emotional messaging
const categoryMetadata: Record<
  string,
  {
    tagline: string;
    description: string;
    emotionalMessage: string;
  }
> = {
  birthday: {
    tagline: 'Celebrate Another Year of Wonderful Memories',
    description:
      'Make their birthday extra special with a personalized print that captures the joy and excitement of their big day.',
    emotionalMessage:
      'Every birthday deserves to be celebrated in a way that makes them feel truly special. Our birthday templates help you create a gift that shows just how much they mean to you.',
  },
  wedding: {
    tagline: 'Celebrate a Love Story Like No Other',
    description:
      'Commemorate the beginning of forever with elegant designs that capture the romance and beauty of their wedding day.',
    emotionalMessage:
      "A wedding is more than just a ceremony—it's the celebration of two hearts becoming one. Create a timeless keepsake that honors their love story.",
  },
  anniversary: {
    tagline: 'Honor Years of Love and Devotion',
    description:
      'Celebrate milestones and memories with heartfelt designs that reflect the depth of their commitment.',
    emotionalMessage:
      'Anniversaries are a testament to enduring love. Show them how much their journey together means with a thoughtful, personalized print.',
  },
  graduation: {
    tagline: 'Commemorate a Milestone Achievement',
    description:
      'Honor their hard work and dedication with a design that celebrates their success and bright future.',
    emotionalMessage:
      'Graduation marks the end of one chapter and the exciting beginning of another. Celebrate their achievement with a gift that recognizes their perseverance.',
  },
  baby: {
    tagline: 'Welcome the Newest Addition',
    description:
      'Celebrate new life and childhood wonder with adorable designs perfect for nurseries and baby announcements.',
    emotionalMessage:
      "The arrival of a baby is pure magic. Capture those precious early moments with a sweet, personalized print they'll treasure forever.",
  },
  holiday: {
    tagline: 'Spread Seasonal Joy and Cheer',
    description: 'Make holidays extra festive with beautiful seasonal designs for any celebration.',
    emotionalMessage:
      'Holidays bring us together and create cherished traditions. Share the warmth of the season with a festive personalized print.',
  },
  general: {
    tagline: "Celebrate Life's Everyday Moments",
    description:
      'From thank you cards to photo collages, honor the simple moments that make life beautiful.',
    emotionalMessage:
      "Sometimes the most meaningful gifts come from life's quieter moments. Show appreciation and love with a thoughtful, personalized design.",
  },
};

export default function OccasionPageClient() {
  const params = useParams();
  const router = useRouter();
  const category = params.category as string;

  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);

  // Get templates for this category
  const occasionTemplates = getTemplatesByCategory(category as Parameters<typeof getTemplatesByCategory>[0]);
  const categoryName = getCategoryName(category as Parameters<typeof getCategoryName>[0]);
  const metadata = categoryMetadata[category] || categoryMetadata.general;

  // If invalid category, redirect to gifts page
  if (occasionTemplates.length === 0) {
    router.push('/gifts');
    return null;
  }

  const handleTemplateClick = (template: Template) => {
    setSelectedTemplate(template);
  };

  const handleUseTemplate = () => {
    if (selectedTemplate) {
      // Navigate to design editor with template pre-selected
      router.push(`/design/new?template=${selectedTemplate.id}`);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Ambient background effects */}
      <div className="fixed inset-0 opacity-20">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-accent/30 rounded-md blur-[120px]" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-primary/20 rounded-md blur-[150px]" />
      </div>

      {/* Header Navigation */}
      <header className="relative z-10 border-b border-border/50 bg-card/30 backdrop-blur-sm sticky top-0">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold">
            <span className="text-neon-gradient">MakeBelieve</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/gifts">
              <Button variant="ghost">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Occasions
              </Button>
            </Link>
            <Link href="/design/new">
              <Button className="btn-gradient">Start Designing</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 container mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <Badge
            variant="outline"
            className="border-primary/50 text-primary px-4 py-2 text-sm mb-6"
          >
            <Heart className="w-4 h-4 inline mr-2" />
            {categoryName}
          </Badge>

          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            <span className="text-neon-gradient neon-glow">{metadata.tagline}</span>
          </h1>

          <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
            {metadata.description}
          </p>

          <Card className="card-glow max-w-3xl mx-auto">
            <CardContent className="pt-6">
              <p className="text-muted-foreground leading-relaxed flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-accent flex-shrink-0 mt-1" />
                <span>{metadata.emotionalMessage}</span>
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Templates Grid */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold mb-8 text-center">
            Choose Your <span className="text-primary">Template</span>
          </h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {occasionTemplates.map((template) => (
              <Card
                key={template.id}
                className={`card-glow cursor-pointer transition-all duration-300 hover:-translate-y-2 ${
                  selectedTemplate?.id === template.id
                    ? 'ring-2 ring-primary border-primary'
                    : 'hover:border-primary/50'
                }`}
                onClick={() => handleTemplateClick(template)}
              >
                <CardHeader>
                  {/* Template Preview Image */}
                  <div className="aspect-[3/4] w-full bg-card/30 rounded-lg overflow-hidden mb-4 flex items-center justify-center border border-border">
                    <div className="text-muted-foreground text-sm">
                      Template Preview
                      <br />
                      {template.name}
                    </div>
                  </div>

                  <CardTitle className="text-xl">{template.name}</CardTitle>
                  <CardDescription>{template.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Recommended Size:</span>
                    <Badge variant="outline">{template.recommendedSize}</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Material:</span>
                    <Badge variant="outline" className="text-xs">
                      {template.recommendedMaterial.replace('_', ' ')}
                    </Badge>
                  </div>
                  <Button
                    className={`w-full ${
                      selectedTemplate?.id === template.id ? 'btn-gradient' : ''
                    }`}
                    variant={selectedTemplate?.id === template.id ? 'default' : 'outline'}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTemplateClick(template);
                    }}
                  >
                    {selectedTemplate?.id === template.id ? 'Selected' : 'Select Template'}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Selected Template Action */}
        {selectedTemplate && (
          <div className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-sm border-t border-border p-6 z-20">
            <div className="container mx-auto flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Selected Template:</p>
                <p className="font-semibold text-lg">{selectedTemplate.name}</p>
              </div>
              <div className="flex gap-4">
                <Button variant="outline" onClick={() => setSelectedTemplate(null)}>
                  Cancel
                </Button>
                <Button className="btn-gradient px-8" onClick={handleUseTemplate}>
                  Customize This Template
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Alternative: Upload Your Own */}
        <div className="bg-gradient-to-r from-primary/10 via-secondary/10 to-accent/10 rounded-2xl p-8 md:p-12 text-center">
          <h3 className="text-3xl font-bold mb-4">Have Your Own Design?</h3>
          <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
            You can also upload your own photos or designs instead of using a template. Make it
            completely unique to you!
          </p>
          <Link href="/design/new?mode=upload">
            <Button size="lg" variant="outline" className="border-primary/50 hover:border-primary">
              Upload Your Own Design
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
}
