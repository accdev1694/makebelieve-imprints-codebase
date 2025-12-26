'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Palette, LayoutGrid, X } from 'lucide-react';
import { TemplateCard, TemplateCardSkeleton } from '@/components/templates/TemplateCard';
import { TemplateFilters } from '@/components/templates/TemplateFilters';
import { TemplatePreviewModal } from '@/components/templates/TemplatePreviewModal';
import { ProductTemplate, templatesService, TEMPLATE_CATEGORY_LABELS } from '@/lib/api/templates';
import { CartIcon } from '@/components/cart/CartIcon';
import { useDebounce } from '@/hooks/useDebounce';

function TemplatesPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, logout } = useAuth();

  // Filter state
  const [selectedCategory, setSelectedCategory] = useState<string | null>(
    searchParams.get('category') || null
  );
  const [isPremiumFilter, setIsPremiumFilter] = useState<boolean | null>(() => {
    const param = searchParams.get('isPremium');
    if (param === 'true') return true;
    if (param === 'false') return false;
    return null;
  });
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const debouncedSearch = useDebounce(searchQuery, 300);

  // Data state
  const [templates, setTemplates] = useState<ProductTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Modal state
  const [previewTemplate, setPreviewTemplate] = useState<ProductTemplate | null>(null);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Fetch templates
  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await templatesService.list({
        page,
        limit: 12,
        category: selectedCategory || undefined,
        isPremium: isPremiumFilter ?? undefined,
        search: debouncedSearch || undefined,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });
      setTemplates(response.templates);
      setTotalPages(response.pagination.totalPages);
      setTotal(response.pagination.total);
    } catch {
      setError('Failed to load templates. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [page, selectedCategory, isPremiumFilter, debouncedSearch]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedCategory) params.set('category', selectedCategory);
    if (isPremiumFilter !== null) params.set('isPremium', String(isPremiumFilter));
    if (searchQuery) params.set('search', searchQuery);

    const queryString = params.toString();
    router.push(queryString ? `/templates?${queryString}` : '/templates', { scroll: false });
  }, [selectedCategory, isPremiumFilter, searchQuery, router]);

  // Clear all filters
  const handleClearAll = () => {
    setSelectedCategory(null);
    setIsPremiumFilter(null);
    setSearchQuery('');
    setPage(1);
  };

  // Handle template selection
  const handleSelectTemplate = (template: ProductTemplate) => {
    // Redirect to design page with template pre-selected
    router.push(`/design/new?template=${template.id}&mode=template`);
  };

  // Count active filters
  const activeFilterCount =
    (selectedCategory ? 1 : 0) + (isPremiumFilter !== null ? 1 : 0) + (searchQuery ? 1 : 0);

  return (
    <main className="min-h-screen bg-background">
      {/* Header Navigation */}
      <header className="relative z-50 border-b border-border/50 bg-card/30 backdrop-blur-sm sticky top-0">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold">
            <span className="text-neon-gradient">MakeBelieve</span>
          </Link>
          <nav className="flex items-center gap-4">
            <Link href="/products">
              <Button variant="ghost">Products</Button>
            </Link>
            <Link href="/templates">
              <Button variant="ghost" className="bg-accent">Templates</Button>
            </Link>
            <Link href="/about">
              <Button variant="ghost">About</Button>
            </Link>
            <CartIcon />
            {user ? (
              <>
                <Link href="/dashboard">
                  <Button variant="ghost">Dashboard</Button>
                </Link>
                <Button variant="outline" onClick={logout}>
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Link href="/auth/login">
                  <Button variant="ghost">Login</Button>
                </Link>
                <Link href="/auth/register">
                  <Button className="btn-gradient">Sign Up</Button>
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary/10 via-purple-500/10 to-pink-500/10 py-16">
        <div className="container mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Palette className="h-4 w-4" />
            Design Templates
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Beautiful Templates for Every Occasion
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            Choose from our curated collection of professionally designed templates. Customize colors, add your text, and create something unique.
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/design/new">
              <Button size="lg" className="btn-gradient">
                Upload Your Own Design
              </Button>
            </Link>
            <Link href="/products">
              <Button size="lg" variant="outline">
                Browse Products
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Mobile Filter Toggle */}
        <div className="lg:hidden mb-4">
          <Button
            variant="outline"
            className="w-full justify-between"
            onClick={() => setShowMobileFilters(!showMobileFilters)}
          >
            <span className="flex items-center gap-2">
              <LayoutGrid className="h-4 w-4" />
              Filters
              {activeFilterCount > 0 && (
                <Badge variant="secondary">{activeFilterCount}</Badge>
              )}
            </span>
            {showMobileFilters ? <X className="h-4 w-4" /> : null}
          </Button>
        </div>

        <div className="flex gap-8">
          {/* Sidebar Filters - Desktop */}
          <aside className={`w-72 flex-shrink-0 ${showMobileFilters ? 'block' : 'hidden lg:block'}`}>
            <TemplateFilters
              selectedCategory={selectedCategory}
              onCategoryChange={(cat) => {
                setSelectedCategory(cat);
                setPage(1);
              }}
              isPremiumFilter={isPremiumFilter}
              onPremiumChange={(premium) => {
                setIsPremiumFilter(premium);
                setPage(1);
              }}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onClearAll={handleClearAll}
            />
          </aside>

          {/* Templates Grid */}
          <div className="flex-1">
            {/* Results Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold">
                  {selectedCategory
                    ? TEMPLATE_CATEGORY_LABELS[selectedCategory] || selectedCategory
                    : 'All Templates'}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {loading ? 'Loading...' : `${total} template${total !== 1 ? 's' : ''} found`}
                </p>
              </div>
            </div>

            {/* Active Filters */}
            {activeFilterCount > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {selectedCategory && (
                  <Badge variant="secondary" className="gap-1">
                    {TEMPLATE_CATEGORY_LABELS[selectedCategory]}
                    <button onClick={() => setSelectedCategory(null)}>
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                {isPremiumFilter === true && (
                  <Badge variant="secondary" className="gap-1">
                    Premium Only
                    <button onClick={() => setIsPremiumFilter(null)}>
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                {isPremiumFilter === false && (
                  <Badge variant="secondary" className="gap-1">
                    Free Only
                    <button onClick={() => setIsPremiumFilter(null)}>
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                {searchQuery && (
                  <Badge variant="secondary" className="gap-1">
                    &quot;{searchQuery}&quot;
                    <button onClick={() => setSearchQuery('')}>
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
              </div>
            )}

            {/* Grid */}
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <TemplateCardSkeleton key={i} />
                ))}
              </div>
            ) : error ? (
              <div className="text-center py-16">
                <Palette className="h-12 w-12 mx-auto text-destructive mb-4" />
                <h3 className="text-lg font-medium mb-2">Something went wrong</h3>
                <p className="text-muted-foreground mb-4">{error}</p>
                <Button onClick={fetchTemplates}>Try Again</Button>
              </div>
            ) : templates.length === 0 ? (
              <div className="text-center py-16">
                <Palette className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No templates found</h3>
                <p className="text-muted-foreground mb-4">
                  Try adjusting your filters or search query.
                </p>
                <Button onClick={handleClearAll}>Clear Filters</Button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {templates.map((template) => (
                    <TemplateCard
                      key={template.id}
                      template={template}
                      onPreview={setPreviewTemplate}
                      onSelect={handleSelectTemplate}
                    />
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex justify-center gap-2 mt-8">
                    <Button
                      variant="outline"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      Previous
                    </Button>
                    <span className="flex items-center px-4 text-sm text-muted-foreground">
                      Page {page} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Template Preview Modal */}
      <TemplatePreviewModal
        template={previewTemplate}
        isOpen={!!previewTemplate}
        onClose={() => setPreviewTemplate(null)}
        onSelect={handleSelectTemplate}
      />
    </main>
  );
}

function TemplatesPageFallback() {
  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <TemplateCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </main>
  );
}

export default function TemplatesPage() {
  return (
    <Suspense fallback={<TemplatesPageFallback />}>
      <TemplatesPageContent />
    </Suspense>
  );
}
