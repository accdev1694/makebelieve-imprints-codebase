'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { designsService, Design, MATERIAL_LABELS, PRINT_SIZE_LABELS, ORIENTATION_LABELS } from '@/lib/api/designs';
import Link from 'next/link';
import Image from 'next/image';

interface DesignDetailsClientProps {
  designId: string;
}

function DesignDetailsContent({ designId }: DesignDetailsClientProps) {
  const router = useRouter();

  const [design, setDesign] = useState<Design | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadDesign = async () => {
      if (!designId) {
        setError('No design ID provided');
        setLoading(false);
        return;
      }

      try {
        const designData = await designsService.get(designId);
        setDesign(designData);
      } catch (err: any) {
        setError(err?.error || err?.message || 'Failed to load design');
      } finally {
        setLoading(false);
      }
    };

    loadDesign();
  }, [designId]);

  const handleDelete = async () => {
    if (!design || !confirm('Are you sure you want to delete this design?')) {
      return;
    }

    try {
      await designsService.delete(design.id);
      router.push('/design/my-designs');
    } catch (err: any) {
      alert(err?.error || err?.message || 'Failed to delete design');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-md h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading design...</p>
        </div>
      </div>
    );
  }

  if (error || !design) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">{error || 'Design not found'}</p>
            <Button onClick={() => router.push('/design/my-designs')}>Back to My Designs</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/design/my-designs">
              <Button variant="ghost" size="sm">
                ← Back to My Designs
              </Button>
            </Link>
            <h1 className="text-2xl font-bold">
              <span className="text-neon-gradient">Design Details</span>
            </h1>
          </div>
          <div className="flex gap-2">
            <Link href={`/checkout?designId=${design.id}`}>
              <Button className="btn-gradient">Order Print</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="grid lg:grid-cols-2 gap-8">
          <div>
            <Card className="card-glow">
              <CardContent className="p-0">
                <div className="aspect-square bg-card/30 rounded-lg overflow-hidden relative">
                  <Image
                    src={design.imageUrl}
                    alt={design.name}
                    fill
                    sizes="(max-width: 1024px) 100vw, 50vw"
                    className="object-contain"
                    unoptimized
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="card-glow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-2xl mb-2">{design.name}</CardTitle>
                    {design.description && (
                      <CardDescription className="text-base">{design.description}</CardDescription>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  Created on{' '}
                  {new Date(design.createdAt).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </div>
              </CardContent>
            </Card>

            <Card className="card-glow">
              <CardHeader>
                <CardTitle>Print Specifications</CardTitle>
                <CardDescription>Default settings for this design</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Material</p>
                    <Badge variant="outline" className="text-sm">
                      {MATERIAL_LABELS[design.material]}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Size</p>
                    <Badge variant="outline" className="text-sm">
                      {PRINT_SIZE_LABELS[design.printSize]}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Orientation</p>
                    <Badge variant="outline" className="text-sm capitalize">
                      {ORIENTATION_LABELS[design.orientation]}
                    </Badge>
                  </div>
                  {design.customWidth && design.customHeight && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Dimensions</p>
                      <Badge variant="outline" className="text-sm">
                        {design.customWidth} × {design.customHeight} cm
                      </Badge>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="card-glow">
              <CardHeader>
                <CardTitle>Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Link href={`/checkout?designId=${design.id}`} className="block">
                  <Button className="w-full btn-gradient">
                    Order Print
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => router.push('/design/my-designs')}
                >
                  Back to My Designs
                </Button>
                <Separator />
                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={handleDelete}
                >
                  Delete Design
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function DesignDetailsClient({ designId }: DesignDetailsClientProps) {
  return (
    <ProtectedRoute>
      <DesignDetailsContent designId={designId} />
    </ProtectedRoute>
  );
}
