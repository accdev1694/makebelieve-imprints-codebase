'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Printer, Heart, Sparkles, Shield, Clock, Star } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 px-4">
        <div className="fixed inset-0 opacity-20">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-accent/30 rounded-md blur-[120px]" />
          <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-primary/20 rounded-md blur-[150px]" />
        </div>

        <div className="container mx-auto max-w-6xl relative z-10">
          <div className="text-center mb-16">
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              About <span className="text-neon-gradient neon-glow">MakeBelieve Imprints</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Your single-printer custom print service, crafting personalized memories with care and
              creativity
            </p>
          </div>

          {/* Main Content Grid */}
          <div className="grid md:grid-2 lg:grid-cols-3 gap-6 mb-16">
            <Card className="card-glow">
              <CardContent className="pt-6">
                <div className="mb-4 text-primary">
                  <Heart className="w-12 h-12" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Made with Love</h3>
                <p className="text-muted-foreground">
                  Every print is personally crafted with attention to detail and genuine care for
                  your special moments.
                </p>
              </CardContent>
            </Card>

            <Card className="card-glow">
              <CardContent className="pt-6">
                <div className="mb-4 text-primary">
                  <Sparkles className="w-12 h-12" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Custom Designs</h3>
                <p className="text-muted-foreground">
                  Choose from beautiful templates or upload your own designs to create something
                  truly unique.
                </p>
              </CardContent>
            </Card>

            <Card className="card-glow">
              <CardContent className="pt-6">
                <div className="mb-4 text-primary">
                  <Shield className="w-12 h-12" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Quality Guaranteed</h3>
                <p className="text-muted-foreground">
                  Premium materials and professional printing ensure your memories last a lifetime.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* The Printer Section */}
          <Card className="card-glow mb-16">
            <CardContent className="p-8 md:p-12">
              <div className="flex flex-col md:flex-row items-center gap-8">
                <div className="flex-shrink-0">
                  <div className="w-32 h-32 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-md flex items-center justify-center">
                    <Printer className="w-16 h-16 text-primary" />
                  </div>
                </div>
                <div className="flex-1">
                  <h2 className="text-3xl font-bold mb-4">Meet Your Printer</h2>
                  <p className="text-muted-foreground mb-4">
                    I'm a solo printer passionate about bringing your memories to life. Each order
                    receives my personal attention, from design customization to packaging. I
                    believe every print tells a story, and I'm honored to be part of yours.
                  </p>
                  <p className="text-muted-foreground">
                    With years of experience and a commitment to quality, I ensure every piece is
                    something you'll treasure. Whether it's a gift for a loved one or a keepsake for
                    yourself, I treat each project with the care it deserves.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Features Grid */}
          <div className="grid md:grid-cols-2 gap-6 mb-16">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 mt-1">
                <Clock className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold mb-2">Fast Turnaround</h3>
                <p className="text-sm text-muted-foreground">
                  Most orders are printed and shipped within 2-3 business days, so you don't have to
                  wait long for your special piece.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 mt-1">
                <Star className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold mb-2">Customer Focused</h3>
                <p className="text-sm text-muted-foreground">
                  Your satisfaction is my priority. I'm here to help with design choices, answer
                  questions, and ensure you love the final product.
                </p>
              </div>
            </div>
          </div>

          {/* CTA Section */}
          <div className="text-center bg-gradient-to-r from-primary/10 via-secondary/10 to-primary/10 rounded-2xl p-8 md:p-12">
            <h2 className="text-3xl font-bold mb-4">Ready to Create Something Special?</h2>
            <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
              Start designing your custom print today. Upload your photos, choose a template, and
              let's create something beautiful together.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/design/new">
                <Button size="lg" className="btn-gradient">
                  Start Designing
                </Button>
              </Link>
              <Link href="/">
                <Button size="lg" variant="outline">
                  View Gallery
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
