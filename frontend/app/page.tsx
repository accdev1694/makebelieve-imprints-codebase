'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

export default function Home() {
  const [email, setEmail] = useState('');

  return (
    <main className="min-h-screen bg-background relative overflow-hidden">
      {/* Ambient background effects */}
      <div className="fixed inset-0 opacity-30">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-accent/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[150px]" />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-20">
        {/* Hero Section */}
        <div className="text-center mb-20 space-y-8">
          <div className="inline-block">
            <Badge variant="outline" className="border-primary/50 text-primary mb-4">
              🚀 Next-Generation Print Platform
            </Badge>
          </div>

          <h1 className="text-6xl md:text-8xl font-bold tracking-tight">
            <span className="text-neon-gradient neon-glow">
              MakeBelieve
            </span>
            <br />
            <span className="text-foreground/90">Imprints</span>
          </h1>

          <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Transform your imagination into{' '}
            <span className="text-primary font-semibold">reality</span> with
            cutting-edge custom printing technology
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mt-8">
            <Button size="lg" className="btn-gradient px-8 py-6 text-lg">
              Start Creating
            </Button>
            <Button size="lg" variant="outline" className="px-8 py-6 text-lg border-primary/50 hover:border-primary">
              Explore Designs
            </Button>
          </div>

          {/* Quick signup */}
          <div className="max-w-md mx-auto mt-12">
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-card border-border focus:border-primary transition-colors"
              />
              <Button variant="secondary" className="shrink-0">
                Join Waitlist
              </Button>
            </div>
          </div>
        </div>

        <Separator className="my-16 bg-border" />

        {/* Component Showcase */}
        <div className="space-y-16">
          <div className="text-center">
            <h2 className="text-4xl font-bold mb-4">
              <span className="text-primary">Powered by</span> Innovation
            </h2>
            <p className="text-muted-foreground text-lg">
              Explore our component library showcase
            </p>
          </div>

          {/* Buttons */}
          <Card className="card-glow">
            <CardHeader>
              <CardTitle className="text-2xl text-primary">Interactive Components</CardTitle>
              <CardDescription>Buttons with multiple variants and states</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-wrap gap-4">
                <Button>Default</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="destructive">Destructive</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="ghost">Ghost</Button>
              </div>
              <div className="flex flex-wrap gap-4">
                <Button size="sm">Small</Button>
                <Button size="default">Default</Button>
                <Button size="lg">Large</Button>
              </div>
              <div>
                <Button className="btn-gradient">Gradient CTA</Button>
              </div>
            </CardContent>
          </Card>

          {/* Cards Grid */}
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="card-glow hover:-translate-y-2 transition-all duration-300">
              <CardHeader>
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <CardTitle>Lightning Fast</CardTitle>
                <CardDescription>
                  Instant design previews with real-time rendering
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="card-glow hover:-translate-y-2 transition-all duration-300">
              <CardHeader>
                <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                  </svg>
                </div>
                <CardTitle>Fully Customizable</CardTitle>
                <CardDescription>
                  Complete control over every aspect of your design
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="card-glow hover:-translate-y-2 transition-all duration-300">
              <CardHeader>
                <div className="w-12 h-12 rounded-full bg-secondary/20 flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <CardTitle>Premium Quality</CardTitle>
                <CardDescription>
                  Professional-grade prints delivered every time
                </CardDescription>
              </CardHeader>
            </Card>
          </div>

          {/* Badges */}
          <Card className="card-glow">
            <CardHeader>
              <CardTitle className="text-2xl text-secondary">Status Indicators</CardTitle>
              <CardDescription>Colorful badges for various states</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                <Badge>Default</Badge>
                <Badge variant="secondary">Secondary</Badge>
                <Badge variant="destructive">Error</Badge>
                <Badge variant="outline">Outline</Badge>
                <Badge className="bg-accent text-white">Accent</Badge>
                <Badge className="bg-green-500/20 text-green-400 border-green-500/50">Success</Badge>
                <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/50">Warning</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Input Fields */}
          <Card className="card-glow">
            <CardHeader>
              <CardTitle className="text-2xl text-primary">Form Elements</CardTitle>
              <CardDescription>Beautiful, accessible input components</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 max-w-md">
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">Email</label>
                <Input type="email" placeholder="you@example.com" />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">Password</label>
                <Input type="password" placeholder="••••••••" />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">With Error State</label>
                <Input type="text" placeholder="Invalid input" className="border-destructive focus:ring-destructive" />
                <p className="text-sm text-destructive mt-1">This field is required</p>
              </div>
            </CardContent>
          </Card>

          {/* Stats Section */}
          <div className="grid md:grid-cols-3 gap-8 mt-16">
            <div className="text-center">
              <div className="text-5xl font-bold text-neon-gradient mb-2">$11M+</div>
              <div className="text-muted-foreground">Revenue Generated</div>
            </div>
            <div className="text-center">
              <div className="text-5xl font-bold text-accent mb-2">50K+</div>
              <div className="text-muted-foreground">Happy Customers</div>
            </div>
            <div className="text-center">
              <div className="text-5xl font-bold text-secondary mb-2">99.9%</div>
              <div className="text-muted-foreground">Uptime</div>
            </div>
          </div>
        </div>

        {/* Footer CTA */}
        <div className="mt-32 text-center space-y-6">
          <h2 className="text-4xl md:text-5xl font-bold">
            Ready to <span className="text-accent">monetize</span> your creativity?
          </h2>
          <p className="text-xl text-muted-foreground">
            Join thousands of creators transforming their ideas into reality
          </p>
          <Button size="lg" className="btn-gradient px-12 py-7 text-xl">
            Get Started Now
          </Button>
        </div>
      </div>
    </main>
  );
}
