'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import {
  Gift,
  Heart,
  Cake,
  Baby,
  GraduationCap,
  Sparkles,
  PartyPopper,
  Calendar,
} from 'lucide-react';
import { templates, getTemplatesByCategory, getCategoryName } from '@/lib/templates';

// Occasion configuration with emotional messaging
const occasions = [
  {
    category: 'birthday' as const,
    icon: Cake,
    color: 'from-pink-500/20 to-purple-500/20',
    borderColor: 'border-pink-500/50',
    textColor: 'text-pink-400',
    title: 'Birthday Celebrations',
    description:
      "Make their special day unforgettable with a personalized birthday print they'll treasure forever",
    emotion: 'Joy & Celebration',
  },
  {
    category: 'wedding' as const,
    icon: Heart,
    color: 'from-rose-500/20 to-red-500/20',
    borderColor: 'border-rose-500/50',
    textColor: 'text-rose-400',
    title: 'Weddings',
    description: 'Celebrate love with elegant designs that capture the magic of their special day',
    emotion: 'Love & Romance',
  },
  {
    category: 'anniversary' as const,
    icon: Sparkles,
    color: 'from-amber-500/20 to-yellow-500/20',
    borderColor: 'border-amber-500/50',
    textColor: 'text-amber-400',
    title: 'Anniversaries',
    description: 'Honor years of love and commitment with a heartfelt anniversary print',
    emotion: 'Devotion & Memory',
  },
  {
    category: 'baby' as const,
    icon: Baby,
    color: 'from-blue-500/20 to-cyan-500/20',
    borderColor: 'border-blue-500/50',
    textColor: 'text-blue-400',
    title: 'Baby & Kids',
    description: 'Welcome new life and celebrate childhood moments with adorable custom prints',
    emotion: 'Wonder & Joy',
  },
  {
    category: 'graduation' as const,
    icon: GraduationCap,
    color: 'from-indigo-500/20 to-purple-500/20',
    borderColor: 'border-indigo-500/50',
    textColor: 'text-indigo-400',
    title: 'Graduation',
    description: 'Commemorate their achievement and the beginning of an exciting new chapter',
    emotion: 'Pride & Success',
  },
  {
    category: 'holiday' as const,
    icon: PartyPopper,
    color: 'from-green-500/20 to-emerald-500/20',
    borderColor: 'border-green-500/50',
    textColor: 'text-green-400',
    title: 'Holidays',
    description: 'Spread festive cheer with seasonal designs for any holiday celebration',
    emotion: 'Warmth & Tradition',
  },
  {
    category: 'general' as const,
    icon: Calendar,
    color: 'from-violet-500/20 to-fuchsia-500/20',
    borderColor: 'border-violet-500/50',
    textColor: 'text-violet-400',
    title: 'Everyday Moments',
    description:
      "From thank you cards to photo collages, celebrate life's everyday special moments",
    emotion: 'Gratitude & Connection',
  },
];

export default function GiftsPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Ambient background effects */}
      <div className="fixed inset-0 opacity-20">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-accent/30 rounded-md blur-[120px]" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-primary/20 rounded-md blur-[150px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-secondary/20 rounded-md blur-[100px]" />
      </div>

      {/* Header Navigation */}
      <header className="relative z-10 border-b border-border/50 bg-card/30 backdrop-blur-sm sticky top-0">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold">
            <span className="text-neon-gradient">MakeBelieve</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/about">
              <Button variant="ghost">About</Button>
            </Link>
            <Link href="/design/new">
              <Button className="btn-gradient">Start Designing</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 container mx-auto px-4 py-16 md:py-24">
        <div className="text-center mb-16">
          <div className="inline-block mb-6">
            <Badge variant="outline" className="border-primary/50 text-primary px-4 py-2 text-sm">
              <Gift className="w-4 h-4 inline mr-2" />
              Perfect Gifts for Every Occasion
            </Badge>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold mb-6">
            Give a Gift That
            <br />
            <span className="text-neon-gradient neon-glow">Speaks from the Heart</span>
          </h1>

          <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed mb-8">
            Create personalized prints that capture emotions, celebrate moments, and create lasting
            memories for the people you love
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link href="/design/new">
              <Button size="lg" className="btn-gradient px-8 py-6 text-lg">
                Create Your Gift
              </Button>
            </Link>
            <Link href="/about">
              <Button
                size="lg"
                variant="outline"
                className="px-8 py-6 text-lg border-primary/50 hover:border-primary"
              >
                Learn More
              </Button>
            </Link>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-8 mb-20 max-w-3xl mx-auto">
          <div className="text-center">
            <div className="text-4xl font-bold text-neon-gradient mb-2">{templates.length}+</div>
            <div className="text-sm text-muted-foreground">Beautiful Templates</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-accent mb-2">7</div>
            <div className="text-sm text-muted-foreground">Occasions Covered</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-secondary mb-2">2-3</div>
            <div className="text-sm text-muted-foreground">Days to Delivery</div>
          </div>
        </div>

        {/* Occasions Grid */}
        <div className="mb-20">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">
              Choose Your <span className="text-primary">Occasion</span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Select the occasion you're celebrating, and we'll help you create the perfect
              personalized gift
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {occasions.map((occasion) => {
              const Icon = occasion.icon;
              const templateCount = getTemplatesByCategory(occasion.category).length;

              return (
                <Card
                  key={occasion.category}
                  className="card-glow hover:-translate-y-2 transition-all duration-300 cursor-pointer group border-2 hover:border-primary/50"
                >
                  <CardHeader>
                    <div
                      className={`w-16 h-16 rounded-md bg-gradient-to-br ${occasion.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}
                    >
                      <Icon className={`w-8 h-8 ${occasion.textColor}`} />
                    </div>
                    <CardTitle className="text-2xl">{occasion.title}</CardTitle>
                    <Badge variant="outline" className={`${occasion.borderColor} w-fit`}>
                      {occasion.emotion}
                    </Badge>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <CardDescription className="text-base leading-relaxed">
                      {occasion.description}
                    </CardDescription>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        {templateCount} {templateCount === 1 ? 'template' : 'templates'}
                      </span>
                      <Link href={`/gifts/occasions/${occasion.category}`}>
                        <Button variant="ghost" className={occasion.textColor}>
                          Browse Templates →
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* How It Works Section */}
        <div className="bg-gradient-to-r from-primary/10 via-secondary/10 to-accent/10 rounded-2xl p-8 md:p-12 mb-20">
          <h2 className="text-4xl font-bold text-center mb-12">
            Create Your Perfect Gift in <span className="text-primary">3 Simple Steps</span>
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 rounded-md bg-primary/20 flex items-center justify-center mx-auto mb-4 text-2xl font-bold text-primary">
                1
              </div>
              <h3 className="text-xl font-semibold mb-2">Choose Your Occasion</h3>
              <p className="text-muted-foreground">
                Select from birthdays, weddings, anniversaries, and more
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 rounded-md bg-secondary/20 flex items-center justify-center mx-auto mb-4 text-2xl font-bold text-secondary">
                2
              </div>
              <h3 className="text-xl font-semibold mb-2">Customize Your Design</h3>
              <p className="text-muted-foreground">
                Pick a template or upload your own image, then personalize it
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 rounded-md bg-accent/20 flex items-center justify-center mx-auto mb-4 text-2xl font-bold text-accent">
                3
              </div>
              <h3 className="text-xl font-semibold mb-2">Receive & Gift</h3>
              <p className="text-muted-foreground">
                Get your beautiful print delivered in 2-3 days, ready to gift
              </p>
            </div>
          </div>
        </div>

        {/* Final CTA */}
        <div className="text-center space-y-6">
          <h2 className="text-4xl md:text-5xl font-bold">
            Ready to Create <span className="text-accent">Something Special</span>?
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Start designing your personalized gift today and make someone's day unforgettable
          </p>
          <Link href="/design/new">
            <Button size="lg" className="btn-gradient px-12 py-7 text-xl">
              Start Creating Now
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
