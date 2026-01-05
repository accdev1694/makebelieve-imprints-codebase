'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Star, Award, Eye, EyeOff, ExternalLink } from 'lucide-react';
import apiClient from '@/lib/api/client';
import Link from 'next/link';

interface AdminReview {
  id: string;
  orderId: string;
  rating: number;
  comment: string | null;
  featured: boolean;
  approved: boolean;
  createdAt: string;
  reviewer?: {
    name: string;
    email: string;
  };
  order?: {
    id: string;
    createdAt: string;
  };
}

interface ReviewsResponse {
  reviews: AdminReview[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

function AdminReviewsContent() {
  const router = useRouter();
  const { user } = useAuth();

  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalReviews, setTotalReviews] = useState(0);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Filters
  const [ratingFilter, setRatingFilter] = useState<string>('all');
  const [featuredFilter, setFeaturedFilter] = useState<string>('all');
  const [approvedFilter, setApprovedFilter] = useState<string>('all');

  // Redirect if not admin
  useEffect(() => {
    if (user && user.userType !== 'PRINTER_ADMIN') {
      router.push('/dashboard');
    }
  }, [user, router]);

  useEffect(() => {
    fetchReviews();
  }, [currentPage, ratingFilter, featuredFilter, approvedFilter]);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      setError('');

      const params = new URLSearchParams();
      params.set('page', currentPage.toString());
      params.set('limit', '20');

      if (ratingFilter !== 'all') {
        params.set('minRating', ratingFilter);
        params.set('maxRating', ratingFilter);
      }
      if (featuredFilter !== 'all') {
        params.set('featured', featuredFilter);
      }
      if (approvedFilter !== 'all') {
        params.set('approved', approvedFilter);
      }

      const response = await apiClient.get<{ success: boolean; data: ReviewsResponse }>(
        `/admin/reviews?${params.toString()}`
      );
      setReviews(response.data.data.reviews);
      setTotalPages(response.data.data.pagination.totalPages);
      setTotalReviews(response.data.data.pagination.total);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load reviews';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const toggleFeatured = async (reviewId: string, currentFeatured: boolean) => {
    try {
      setUpdatingId(reviewId);
      await apiClient.put(`/admin/reviews/${reviewId}/feature`, {
        featured: !currentFeatured,
      });
      // Update local state
      setReviews(reviews.map(r =>
        r.id === reviewId ? { ...r, featured: !currentFeatured } : r
      ));
    } catch (err) {
      console.error('Failed to toggle featured:', err);
      setError('Failed to update review');
    } finally {
      setUpdatingId(null);
    }
  };

  const toggleApproved = async (reviewId: string, currentApproved: boolean) => {
    try {
      setUpdatingId(reviewId);
      await apiClient.put(`/admin/reviews/${reviewId}/feature`, {
        approved: !currentApproved,
      });
      // Update local state
      setReviews(reviews.map(r =>
        r.id === reviewId ? { ...r, approved: !currentApproved } : r
      ));
    } catch (err) {
      console.error('Failed to toggle approved:', err);
      setError('Failed to update review');
    } finally {
      setUpdatingId(null);
    }
  };

  const clearFilters = () => {
    setRatingFilter('all');
    setFeaturedFilter('all');
    setApprovedFilter('all');
    setCurrentPage(1);
  };

  const hasActiveFilters = ratingFilter !== 'all' || featuredFilter !== 'all' || approvedFilter !== 'all';

  // Calculate stats from current page (for display purposes)
  const featuredCount = reviews.filter(r => r.featured).length;
  const approvedCount = reviews.filter(r => r.approved).length;
  const avgRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : '0';

  if (user && user.userType !== 'PRINTER_ADMIN') {
    return null;
  }

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={`h-4 w-4 ${
              i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin">
              <Button variant="ghost" size="sm">
                ← Back to Admin
              </Button>
            </Link>
            <h1 className="text-2xl font-bold">
              <span className="text-neon-gradient">Review Management</span>
            </h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {error && (
          <div className="bg-destructive/10 border border-destructive/50 text-destructive px-4 py-3 rounded-lg text-sm mb-6">
            {error}
          </div>
        )}

        {/* Stats */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card className="card-glow">
            <CardHeader>
              <CardTitle className="text-lg">Total Reviews</CardTitle>
              <CardDescription>All submitted reviews</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-primary">{totalReviews}</p>
            </CardContent>
          </Card>

          <Card className="card-glow">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Award className="w-5 h-5 text-yellow-500" />
                Featured
              </CardTitle>
              <CardDescription>Highlighted on homepage</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-yellow-500">{featuredCount}</p>
            </CardContent>
          </Card>

          <Card className="card-glow">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Eye className="w-5 h-5 text-green-500" />
                Approved
              </CardTitle>
              <CardDescription>Visible on site</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-green-500">{approvedCount}</p>
            </CardContent>
          </Card>

          <Card className="card-glow">
            <CardHeader>
              <CardTitle className="text-lg">Average Rating</CardTitle>
              <CardDescription>Current page</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <p className="text-4xl font-bold text-accent">{avgRating}</p>
                <Star className="w-6 h-6 fill-yellow-400 text-yellow-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="card-glow mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm text-muted-foreground">Rating:</label>
                <Select value={ratingFilter} onValueChange={(v: string) => { setRatingFilter(v); setCurrentPage(1); }}>
                  <SelectTrigger className="w-[130px]">
                    <SelectValue placeholder="All ratings" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All ratings</SelectItem>
                    <SelectItem value="5">5 stars</SelectItem>
                    <SelectItem value="4">4 stars</SelectItem>
                    <SelectItem value="3">3 stars</SelectItem>
                    <SelectItem value="2">2 stars</SelectItem>
                    <SelectItem value="1">1 star</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-sm text-muted-foreground">Featured:</label>
                <Select value={featuredFilter} onValueChange={(v: string) => { setFeaturedFilter(v); setCurrentPage(1); }}>
                  <SelectTrigger className="w-[130px]">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="true">Featured only</SelectItem>
                    <SelectItem value="false">Not featured</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-sm text-muted-foreground">Status:</label>
                <Select value={approvedFilter} onValueChange={(v: string) => { setApprovedFilter(v); setCurrentPage(1); }}>
                  <SelectTrigger className="w-[130px]">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="true">Approved</SelectItem>
                    <SelectItem value="false">Hidden</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {hasActiveFilters && (
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  Clear filters
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Reviews List */}
        <Card className="card-glow">
          <CardHeader>
            <CardTitle>All Reviews</CardTitle>
            <CardDescription>Manage customer reviews and feedback</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="inline-block animate-spin rounded-md h-8 w-8 border-t-2 border-b-2 border-primary mb-2"></div>
                  <p className="text-sm text-muted-foreground">Loading reviews...</p>
                </div>
              </div>
            ) : reviews.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">
                  {hasActiveFilters ? 'No reviews match your filters' : 'No reviews yet'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {reviews.map((review) => (
                  <div
                    key={review.id}
                    className="p-4 bg-card/30 rounded-lg hover:bg-card/50 transition-colors border border-border/50"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        {/* Header with badges */}
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          {renderStars(review.rating)}
                          {review.featured && (
                            <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
                              <Award className="w-3 h-3 mr-1" />
                              Featured
                            </Badge>
                          )}
                          {review.approved ? (
                            <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                              <Eye className="w-3 h-3 mr-1" />
                              Approved
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="bg-gray-500/10 text-gray-500">
                              <EyeOff className="w-3 h-3 mr-1" />
                              Hidden
                            </Badge>
                          )}
                        </div>

                        {/* Comment */}
                        {review.comment ? (
                          <p className="text-foreground mb-3 italic">&ldquo;{review.comment}&rdquo;</p>
                        ) : (
                          <p className="text-muted-foreground mb-3 text-sm">No comment provided</p>
                        )}

                        {/* Customer info */}
                        <div className="text-sm text-muted-foreground space-y-1">
                          <p>
                            <span className="font-medium text-foreground">{review.reviewer?.name || 'Anonymous'}</span>
                            {review.reviewer?.email && (
                              <span className="ml-2">({review.reviewer.email})</span>
                            )}
                          </p>
                          <p>
                            {new Date(review.createdAt).toLocaleDateString('en-GB', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col gap-2 shrink-0">
                        <Button
                          variant={review.featured ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => toggleFeatured(review.id, review.featured)}
                          disabled={updatingId === review.id}
                          className={review.featured ? 'bg-yellow-500 hover:bg-yellow-600' : ''}
                        >
                          <Award className="w-4 h-4 mr-1" />
                          {review.featured ? 'Unfeature' : 'Feature'}
                        </Button>

                        <Button
                          variant={review.approved ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => toggleApproved(review.id, review.approved)}
                          disabled={updatingId === review.id}
                          className={review.approved ? 'bg-green-500 hover:bg-green-600' : ''}
                        >
                          {review.approved ? (
                            <>
                              <EyeOff className="w-4 h-4 mr-1" />
                              Hide
                            </>
                          ) : (
                            <>
                              <Eye className="w-4 h-4 mr-1" />
                              Approve
                            </>
                          )}
                        </Button>

                        <Link href={`/admin/orders/${review.orderId}`}>
                          <Button variant="ghost" size="sm" className="w-full">
                            <ExternalLink className="w-4 h-4 mr-1" />
                            View Order
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-6 mt-6 border-t border-border">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground px-4">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

export default function AdminReviewsPage() {
  return (
    <ProtectedRoute>
      <AdminReviewsContent />
    </ProtectedRoute>
  );
}
