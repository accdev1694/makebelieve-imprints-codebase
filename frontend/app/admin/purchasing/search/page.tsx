'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import apiClient from '@/lib/api/client';
import Link from 'next/link';
import {
  Search,
  ExternalLink,
  Bookmark,
  Star,
  Loader2,
  AlertCircle,
} from 'lucide-react';

interface ProductResult {
  id: string;
  source: 'amazon' | 'ebay' | 'aliexpress' | 'google';
  title: string;
  price: number;
  currency: string;
  imageUrl?: string;
  productUrl: string;
  sellerName?: string;
  sellerRating?: number;
  condition?: string;
}

interface SourceResult {
  source: string;
  count: number;
  error?: string;
}

const SOURCE_COLORS: Record<string, string> = {
  amazon: 'bg-orange-500/10 text-orange-500 border-orange-500/50',
  ebay: 'bg-blue-500/10 text-blue-500 border-blue-500/50',
  aliexpress: 'bg-red-500/10 text-red-500 border-red-500/50',
  google: 'bg-green-500/10 text-green-500 border-green-500/50',
};

function ProductSearchContent() {
  const router = useRouter();
  const { user } = useAuth();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ProductResult[]>([]);
  const [sourceResults, setSourceResults] = useState<SourceResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');

  // Filters
  const [selectedSources, setSelectedSources] = useState<string[]>([
    'amazon',
    'ebay',
    'aliexpress',
    'google',
  ]);
  const [sortBy, setSortBy] = useState<string>('relevance');
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');

  // Saved products
  const [savingProductId, setSavingProductId] = useState<string | null>(null);

  useEffect(() => {
    if (user && user.userType !== 'PRINTER_ADMIN') {
      router.push('/dashboard');
    }
  }, [user, router]);

  const handleSearch = async () => {
    if (!query.trim()) return;

    setSearching(true);
    setError('');
    setResults([]);

    try {
      const response = await apiClient.post<{
        success: boolean;
        data: {
          results: ProductResult[];
          sources: SourceResult[];
          totalResults: number;
        };
      }>('/admin/purchasing/search', {
        query: query.trim(),
        sources: selectedSources,
        sortBy,
        minPrice: minPrice ? parseFloat(minPrice) : undefined,
        maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
        limit: 40,
      });

      if (response.data.success) {
        setResults(response.data.data.results);
        setSourceResults(response.data.data.sources);
      }
    } catch (err) {
      setError('Search failed. Please try again.');
      console.error('Search error:', err);
    } finally {
      setSearching(false);
    }
  };

  const handleSaveProduct = async (product: ProductResult) => {
    setSavingProductId(product.id);

    try {
      await apiClient.post('/admin/purchasing/saved', {
        product,
      });
    } catch (err) {
      console.error('Save error:', err);
    } finally {
      setSavingProductId(null);
    }
  };

  const toggleSource = (source: string) => {
    setSelectedSources((prev) =>
      prev.includes(source)
        ? prev.filter((s) => s !== source)
        : [...prev, source]
    );
  };

  if (user && user.userType !== 'PRINTER_ADMIN') {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin/purchasing">
              <Button variant="ghost" size="sm">
                ← Back to Purchasing
              </Button>
            </Link>
            <h1 className="text-2xl font-bold">
              <span className="text-neon-gradient">Product Search</span>
            </h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          {/* Search Box */}
          <Card className="card-glow">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <Input
                    placeholder="Search for supplies, equipment, materials..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    className="h-12 text-lg"
                  />
                </div>
                <Button
                  onClick={handleSearch}
                  disabled={searching || !query.trim()}
                  className="h-12 px-8 btn-gradient"
                >
                  {searching ? (
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  ) : (
                    <Search className="w-5 h-5 mr-2" />
                  )}
                  Search
                </Button>
              </div>

              {/* Filters */}
              <div className="mt-4 flex flex-wrap gap-4 items-center">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Sources:</span>
                  {['amazon', 'ebay', 'aliexpress', 'google'].map((source) => (
                    <Button
                      key={source}
                      size="sm"
                      variant={selectedSources.includes(source) ? 'default' : 'outline'}
                      onClick={() => toggleSource(source)}
                      className={`capitalize ${
                        selectedSources.includes(source) ? SOURCE_COLORS[source] : ''
                      }`}
                    >
                      {source}
                    </Button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Sort:</span>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="relevance">Relevance</SelectItem>
                      <SelectItem value="price_asc">Price: Low to High</SelectItem>
                      <SelectItem value="price_desc">Price: High to Low</SelectItem>
                      <SelectItem value="rating">Seller Rating</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Price:</span>
                  <Input
                    type="number"
                    placeholder="Min"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                    className="w-20"
                  />
                  <span className="text-muted-foreground">-</span>
                  <Input
                    type="number"
                    placeholder="Max"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    className="w-20"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Error */}
          {error && (
            <div className="bg-destructive/10 border border-destructive/50 text-destructive px-4 py-3 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              {error}
            </div>
          )}

          {/* Source Results Summary */}
          {sourceResults.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {sourceResults.map((sr) => (
                <Badge
                  key={sr.source}
                  variant="outline"
                  className={sr.error ? 'bg-red-500/10 text-red-500' : SOURCE_COLORS[sr.source]}
                >
                  {sr.source}: {sr.error ? sr.error : `${sr.count} results`}
                </Badge>
              ))}
            </div>
          )}

          {/* Results */}
          {searching ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
                <p className="text-muted-foreground">Searching marketplaces...</p>
              </div>
            </div>
          ) : results.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {results.map((product) => (
                <Card key={`${product.source}-${product.id}`} className="card-glow">
                  <CardContent className="p-4">
                    {/* Product Image */}
                    {product.imageUrl && (
                      <div className="aspect-square bg-muted/30 rounded-lg overflow-hidden mb-3">
                        <img
                          src={product.imageUrl}
                          alt={product.title}
                          className="w-full h-full object-contain"
                        />
                      </div>
                    )}

                    {/* Source Badge */}
                    <Badge
                      variant="outline"
                      className={`${SOURCE_COLORS[product.source]} mb-2`}
                    >
                      {product.source}
                    </Badge>

                    {/* Title */}
                    <h3 className="font-medium text-sm line-clamp-2 mb-2">
                      {product.title}
                    </h3>

                    {/* Price */}
                    <p className="text-lg font-bold text-primary mb-2">
                      {product.currency === 'GBP' ? '£' : product.currency}
                      {product.price.toFixed(2)}
                    </p>

                    {/* Seller Info */}
                    {product.sellerName && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                        <span>{product.sellerName}</span>
                        {product.sellerRating && (
                          <span className="flex items-center gap-0.5">
                            <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                            {(product.sellerRating * 100).toFixed(0)}%
                          </span>
                        )}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => window.open(product.productUrl, '_blank')}
                      >
                        <ExternalLink className="w-4 h-4 mr-1" />
                        View
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleSaveProduct(product)}
                        disabled={savingProductId === product.id}
                      >
                        {savingProductId === product.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Bookmark className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : sourceResults.length > 0 ? (
            <Card className="card-glow">
              <CardContent className="py-20 text-center">
                <Search className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No Results Found</h3>
                <p className="text-muted-foreground">
                  Try different keywords or adjust your filters
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card className="card-glow">
              <CardContent className="py-20 text-center">
                <Search className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">Search for Products</h3>
                <p className="text-muted-foreground">
                  Enter a search term to find supplies across Amazon, eBay, AliExpress, and
                  Google Shopping
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}

export default function ProductSearchPage() {
  return (
    <ProtectedRoute>
      <ProductSearchContent />
    </ProtectedRoute>
  );
}
