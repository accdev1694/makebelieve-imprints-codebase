'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { designsService, Design, MATERIAL_LABELS, PRINT_SIZE_LABELS } from '@/lib/api/designs';
import Link from 'next/link';
import Image from 'next/image';

function MyDesignsContent() {
  const router = useRouter();
  const [designs, setDesigns] = useState<Design[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDesigns();
  }, []);

  const fetchDesigns = async () => {
    try {
      setLoading(true);
      const data = await designsService.list();
      setDesigns(data);
    } catch (err: unknown) {
      const error = err as { error?: string; message?: string };
      setError(error?.error || error?.message || 'Failed to load designs');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this design?')) {
      return;
    }

    try {
      await designsService.delete(id);
      setDesigns(designs.filter((d) => d.id !== id));
    } catch (err: unknown) {
      const error = err as { error?: string; message?: string };
      alert(error?.error || error?.message || 'Failed to delete design');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm">
                ← Back
              </Button>
            </Link>
            <h1 className="text-xl sm:text-2xl font-bold">
              <span className="text-neon-gradient">My Designs</span>
            </h1>
          </div>
          <Link href="/design/new" className="w-full sm:w-auto">
            <Button className="btn-gradient w-full sm:w-auto">Create New Design</Button>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {error && (
          <div className="bg-destructive/10 border border-destructive/50 text-destructive px-4 py-3 rounded-lg text-sm mb-6">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-md h-12 w-12 border-t-2 border-b-2 border-primary mb-4"></div>
              <p className="text-muted-foreground">Loading your designs...</p>
            </div>
          </div>
        ) : designs.length === 0 ? (
          <Card className="card-glow">
            <CardContent className="py-20 text-center">
              <div className="mb-6">
                <svg
                  className="mx-auto w-16 h-16 text-muted-foreground"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">No designs yet</h3>
              <p className="text-muted-foreground mb-6">
                Create your first design and start bringing your ideas to life!
              </p>
              <Link href="/design/new">
                <Button className="btn-gradient">Create Your First Design</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {designs.map((design) => (
              <Card
                key={design.id}
                className="card-glow hover:-translate-y-2 transition-all duration-300 cursor-pointer group"
              >
                <CardHeader className="p-0">
                  <div className="aspect-square bg-card/30 rounded-t-xl overflow-hidden relative">
                    <Image
                      src={design.imageUrl}
                      alt={design.name}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      className="object-cover group-hover:scale-110 transition-transform duration-300"
                      unoptimized
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => router.push(`/design/${design.id}`)}
                      >
                        View
                      </Button>
                      <Button
                        className="btn-gradient"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/checkout?designId=${design.id}`);
                        }}
                      >
                        Order
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(design.id);
                        }}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                  <div>
                    <h3 className="font-semibold text-foreground truncate">{design.name}</h3>
                    {design.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {design.description}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="text-xs">
                      {MATERIAL_LABELS[design.material]}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {PRINT_SIZE_LABELS[design.printSize]}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {design.orientation}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/50">
                    <span>Created {new Date(design.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default function MyDesignsPage() {
  return (
    <ProtectedRoute>
      <MyDesignsContent />
    </ProtectedRoute>
  );
}
