/**
 * Reviews Integration Tests
 * Tests for review creation and listing with order ownership checks
 */

import request from 'supertest';
import app from '../index';
import { createTestUser, generateTestTokens, createTestDesign, createTestOrder } from './helpers';

describe('Reviews API', () => {
  describe('POST /api/reviews', () => {
    it('should create a review for own order', async () => {
      const { user } = await createTestUser();
      const { accessToken } = generateTestTokens(user.id, user.type);
      const design = await createTestDesign(user.id);
      const order = await createTestOrder(user.id, design.id);

      const response = await request(app)
        .post('/api/reviews')
        .set('Cookie', [`accessToken=${accessToken}`])
        .send({
          orderId: order.id,
          rating: 5,
          comment: 'Excellent quality print!',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.review).toMatchObject({
        rating: 5,
        comment: 'Excellent quality print!',
      });
      expect(response.body.data.review.order.id).toBe(order.id);
    });

    it('should reject review without authentication', async () => {
      const { user } = await createTestUser();
      const design = await createTestDesign(user.id);
      const order = await createTestOrder(user.id, design.id);

      const response = await request(app)
        .post('/api/reviews')
        .send({
          orderId: order.id,
          rating: 5,
          comment: 'Great!',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should reject review for non-existent order', async () => {
      const { user } = await createTestUser();
      const { accessToken } = generateTestTokens(user.id, user.type);

      const response = await request(app)
        .post('/api/reviews')
        .set('Cookie', [`accessToken=${accessToken}`])
        .send({
          orderId: '00000000-0000-0000-0000-000000000000',
          rating: 5,
          comment: 'Great!',
        })
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should reject review for other user order', async () => {
      const { user: owner } = await createTestUser({ email: 'orderowner@example.com' });
      const { user: other } = await createTestUser({ email: 'otheruser@example.com' });
      const { accessToken } = generateTestTokens(other.id, other.type);
      const design = await createTestDesign(owner.id);
      const order = await createTestOrder(owner.id, design.id);

      const response = await request(app)
        .post('/api/reviews')
        .set('Cookie', [`accessToken=${accessToken}`])
        .send({
          orderId: order.id,
          rating: 1,
          comment: 'Trying to leave fake review',
        })
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should reject duplicate review for same order', async () => {
      const { user } = await createTestUser({ email: 'reviewer@example.com' });
      const { accessToken } = generateTestTokens(user.id, user.type);
      const design = await createTestDesign(user.id);
      const order = await createTestOrder(user.id, design.id);

      // Create first review
      await request(app)
        .post('/api/reviews')
        .set('Cookie', [`accessToken=${accessToken}`])
        .send({
          orderId: order.id,
          rating: 5,
          comment: 'First review',
        })
        .expect(201);

      // Try to create duplicate review
      const response = await request(app)
        .post('/api/reviews')
        .set('Cookie', [`accessToken=${accessToken}`])
        .send({
          orderId: order.id,
          rating: 3,
          comment: 'Second review attempt',
        })
        .expect(409);

      expect(response.body.success).toBe(false);
    });

    it('should validate rating range (1-5)', async () => {
      const { user } = await createTestUser({ email: 'ratingtest@example.com' });
      const { accessToken } = generateTestTokens(user.id, user.type);
      const design = await createTestDesign(user.id);
      const order = await createTestOrder(user.id, design.id);

      // Rating too low
      const response1 = await request(app)
        .post('/api/reviews')
        .set('Cookie', [`accessToken=${accessToken}`])
        .send({
          orderId: order.id,
          rating: 0,
        })
        .expect(400);

      expect(response1.body.success).toBe(false);

      // Rating too high
      const response2 = await request(app)
        .post('/api/reviews')
        .set('Cookie', [`accessToken=${accessToken}`])
        .send({
          orderId: order.id,
          rating: 6,
        })
        .expect(400);

      expect(response2.body.success).toBe(false);
    });
  });

  describe('GET /api/reviews', () => {
    it('should list reviews with pagination', async () => {
      const { user } = await createTestUser({ email: 'listreview@example.com' });
      const { accessToken } = generateTestTokens(user.id, user.type);

      // Create multiple orders with reviews
      for (let i = 0; i < 3; i++) {
        const design = await createTestDesign(user.id, { title: `Design ${i}` });
        const order = await createTestOrder(user.id, design.id);
        await request(app)
          .post('/api/reviews')
          .set('Cookie', [`accessToken=${accessToken}`])
          .send({
            orderId: order.id,
            rating: 4 + (i % 2),
            comment: `Review ${i}`,
          });
      }

      const response = await request(app)
        .get('/api/reviews?page=1&limit=2')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.reviews).toBeDefined();
      expect(response.body.data.pagination).toMatchObject({
        page: 1,
        limit: 2,
      });
      expect(response.body.data.averageRating).toBeDefined();
    });

    it('should return average rating', async () => {
      const response = await request(app)
        .get('/api/reviews')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(typeof response.body.data.averageRating).toBe('number');
    });
  });

  describe('GET /api/reviews/:id', () => {
    it('should get review by ID', async () => {
      const { user } = await createTestUser({ email: 'getreview@example.com' });
      const { accessToken } = generateTestTokens(user.id, user.type);
      const design = await createTestDesign(user.id);
      const order = await createTestOrder(user.id, design.id);

      // Create review
      const createResponse = await request(app)
        .post('/api/reviews')
        .set('Cookie', [`accessToken=${accessToken}`])
        .send({
          orderId: order.id,
          rating: 5,
          comment: 'Test review',
        })
        .expect(201);

      const reviewId = createResponse.body.data.review.id;

      // Get review by ID
      const response = await request(app)
        .get(`/api/reviews/${reviewId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.review.id).toBe(reviewId);
      expect(response.body.data.review.rating).toBe(5);
      expect(response.body.data.review.comment).toBe('Test review');
    });

    it('should return 404 for non-existent review', async () => {
      const response = await request(app)
        .get('/api/reviews/00000000-0000-0000-0000-000000000000')
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });
});
