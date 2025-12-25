/**
 * Designs Integration Tests
 * Tests for design CRUD operations with ownership checks
 */

import request from 'supertest';
import app from '../index';
import { createTestUser, createTestAdmin, generateTestTokens, createTestDesign } from './helpers';
import { UserType } from '@prisma/client';

describe('Designs API', () => {
  describe('POST /api/designs', () => {
    it('should create a design when authenticated', async () => {
      const { user } = await createTestUser();
      const { accessToken } = generateTestTokens(user.id, user.type);

      const response = await request(app)
        .post('/api/designs')
        .set('Cookie', [`accessToken=${accessToken}`])
        .send({
          name: 'My Test Design',
          imageUrl: 'https://example.com/design.png',
          printSize: 'A4',
          material: 'MATTE',
          orientation: 'PORTRAIT',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.design).toMatchObject({
        name: 'My Test Design',
        imageUrl: 'https://example.com/design.png',
        printSize: 'A4',
        material: 'MATTE',
        orientation: 'PORTRAIT',
      });
    });

    it('should reject design creation without authentication', async () => {
      const response = await request(app)
        .post('/api/designs')
        .send({
          name: 'Unauthenticated Design',
          imageUrl: 'https://example.com/design.png',
          printSize: 'A4',
          material: 'MATTE',
          orientation: 'PORTRAIT',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should reject design with invalid data', async () => {
      const { user } = await createTestUser();
      const { accessToken } = generateTestTokens(user.id, user.type);

      const response = await request(app)
        .post('/api/designs')
        .set('Cookie', [`accessToken=${accessToken}`])
        .send({
          name: '', // Empty name should fail
          imageUrl: 'not-a-valid-url',
          printSize: 'INVALID_SIZE',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/designs', () => {
    it('should list only user own designs', async () => {
      const { user: user1 } = await createTestUser({ email: 'user1@example.com' });
      const { user: user2 } = await createTestUser({ email: 'user2@example.com' });
      const { accessToken } = generateTestTokens(user1.id, user1.type);

      // Create designs for both users
      await createTestDesign(user1.id, { title: 'User1 Design' });
      await createTestDesign(user2.id, { title: 'User2 Design' });

      const response = await request(app)
        .get('/api/designs')
        .set('Cookie', [`accessToken=${accessToken}`])
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.designs.length).toBeGreaterThanOrEqual(1);
      // User should only see their own designs
      response.body.data.designs.forEach((design: any) => {
        expect(design.userId).toBe(user1.id);
      });
    });

    it('should allow admin to see all designs', async () => {
      const { user: admin } = await createTestAdmin({ email: 'admin@example.com' });
      const { user: regularUser } = await createTestUser({ email: 'regular@example.com' });
      const { accessToken } = generateTestTokens(admin.id, admin.type);

      await createTestDesign(regularUser.id, { title: 'Regular User Design' });

      const response = await request(app)
        .get('/api/designs')
        .set('Cookie', [`accessToken=${accessToken}`])
        .expect(200);

      expect(response.body.success).toBe(true);
      // Admin should see designs from other users too
      expect(response.body.data.designs.length).toBeGreaterThanOrEqual(1);
    });

    it('should support pagination', async () => {
      const { user } = await createTestUser();
      const { accessToken } = generateTestTokens(user.id, user.type);

      // Create multiple designs
      for (let i = 0; i < 5; i++) {
        await createTestDesign(user.id, { title: `Design ${i}` });
      }

      const response = await request(app)
        .get('/api/designs?page=1&limit=2')
        .set('Cookie', [`accessToken=${accessToken}`])
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.designs.length).toBeLessThanOrEqual(2);
      expect(response.body.data.pagination).toMatchObject({
        page: 1,
        limit: 2,
      });
    });
  });

  describe('GET /api/designs/:id', () => {
    it('should get design by ID for owner', async () => {
      const { user } = await createTestUser();
      const { accessToken } = generateTestTokens(user.id, user.type);
      const design = await createTestDesign(user.id, { title: 'My Design' });

      const response = await request(app)
        .get(`/api/designs/${design.id}`)
        .set('Cookie', [`accessToken=${accessToken}`])
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.design.id).toBe(design.id);
    });

    it('should deny access to other user designs', async () => {
      const { user: owner } = await createTestUser({ email: 'owner@example.com' });
      const { user: other } = await createTestUser({ email: 'other@example.com' });
      const { accessToken } = generateTestTokens(other.id, other.type);
      const design = await createTestDesign(owner.id, { title: 'Owner Design' });

      const response = await request(app)
        .get(`/api/designs/${design.id}`)
        .set('Cookie', [`accessToken=${accessToken}`])
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should allow admin to view any design', async () => {
      const { user: owner } = await createTestUser({ email: 'owner2@example.com' });
      const { user: admin } = await createTestAdmin({ email: 'admin2@example.com' });
      const { accessToken } = generateTestTokens(admin.id, admin.type);
      const design = await createTestDesign(owner.id, { title: 'Owner Design' });

      const response = await request(app)
        .get(`/api/designs/${design.id}`)
        .set('Cookie', [`accessToken=${accessToken}`])
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.design.id).toBe(design.id);
    });

    it('should return 404 for non-existent design', async () => {
      const { user } = await createTestUser();
      const { accessToken } = generateTestTokens(user.id, user.type);

      const response = await request(app)
        .get('/api/designs/00000000-0000-0000-0000-000000000000')
        .set('Cookie', [`accessToken=${accessToken}`])
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/designs/:id', () => {
    it('should update design for owner', async () => {
      const { user } = await createTestUser();
      const { accessToken } = generateTestTokens(user.id, user.type);
      const design = await createTestDesign(user.id, { title: 'Original Title' });

      const response = await request(app)
        .put(`/api/designs/${design.id}`)
        .set('Cookie', [`accessToken=${accessToken}`])
        .send({
          name: 'Updated Title',
          material: 'GLOSSY',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.design.name).toBe('Updated Title');
      expect(response.body.data.design.material).toBe('GLOSSY');
    });

    it('should deny update to other user design', async () => {
      const { user: owner } = await createTestUser({ email: 'owner3@example.com' });
      const { user: other } = await createTestUser({ email: 'other3@example.com' });
      const { accessToken } = generateTestTokens(other.id, other.type);
      const design = await createTestDesign(owner.id);

      const response = await request(app)
        .put(`/api/designs/${design.id}`)
        .set('Cookie', [`accessToken=${accessToken}`])
        .send({ name: 'Hacked Title' })
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/designs/:id', () => {
    it('should delete design for owner', async () => {
      const { user } = await createTestUser();
      const { accessToken } = generateTestTokens(user.id, user.type);
      const design = await createTestDesign(user.id);

      const response = await request(app)
        .delete(`/api/designs/${design.id}`)
        .set('Cookie', [`accessToken=${accessToken}`])
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify design is deleted
      const getResponse = await request(app)
        .get(`/api/designs/${design.id}`)
        .set('Cookie', [`accessToken=${accessToken}`])
        .expect(404);
    });

    it('should deny delete to other user design', async () => {
      const { user: owner } = await createTestUser({ email: 'owner4@example.com' });
      const { user: other } = await createTestUser({ email: 'other4@example.com' });
      const { accessToken } = generateTestTokens(other.id, other.type);
      const design = await createTestDesign(owner.id);

      const response = await request(app)
        .delete(`/api/designs/${design.id}`)
        .set('Cookie', [`accessToken=${accessToken}`])
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should allow admin to delete any design', async () => {
      const { user: owner } = await createTestUser({ email: 'owner5@example.com' });
      const { user: admin } = await createTestAdmin({ email: 'admin5@example.com' });
      const { accessToken } = generateTestTokens(admin.id, admin.type);
      const design = await createTestDesign(owner.id);

      const response = await request(app)
        .delete(`/api/designs/${design.id}`)
        .set('Cookie', [`accessToken=${accessToken}`])
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });
});
