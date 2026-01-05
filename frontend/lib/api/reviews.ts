import apiClient from './client';

export interface Review {
  id: string;
  rating: number;
  comment: string | null;
  featured: boolean;
  approved: boolean;
  createdAt: string;
  reviewer?: {
    name: string;
  };
}

export interface HomepageReview {
  id: string;
  rating: number;
  comment: string | null;
  featured: boolean;
  createdAt: string;
  customerName: string;
}

export interface PendingReviewOrder {
  id: string;
  createdAt: string;
  totalPrice: number;
  items: { productName: string; quantity: number }[];
}

export interface CreateReviewInput {
  orderId: string;
  rating: number;
  comment?: string;
}

/**
 * Create a review for an order
 */
export async function createReview(input: CreateReviewInput): Promise<{
  review: Review;
  pointsEarned: number;
  message: string;
}> {
  const response = await apiClient.post('/reviews', input);
  return response.data.data;
}

/**
 * Get orders awaiting review
 */
export async function getPendingReviews(): Promise<{
  orders: PendingReviewOrder[];
  pointsPerReview: number;
  totalPotentialPoints: number;
}> {
  const response = await apiClient.get('/reviews/pending');
  return response.data.data;
}

/**
 * Get reviews for homepage
 */
export async function getHomepageReviews(limit: number = 6): Promise<HomepageReview[]> {
  const response = await apiClient.get(`/reviews/homepage?limit=${limit}`);
  return response.data.data;
}

/**
 * Get approved reviews (paginated)
 */
export async function getApprovedReviews(limit: number = 20, offset: number = 0): Promise<{
  reviews: Review[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}> {
  const response = await apiClient.get(`/reviews?limit=${limit}&offset=${offset}`);
  return response.data.data;
}
