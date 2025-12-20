/**
 * Auth Integration Tests
 * Tests for authentication flow: register, login, refresh, logout
 */

import request from 'supertest';
import app from '../index';
import { createTestUser, extractCookies } from './helpers';

describe('Auth API', () => {
  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'newuser@example.com',
          password: 'SecurePass123!',
          name: 'New User',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toMatchObject({
        email: 'newuser@example.com',
        name: 'New User',
        type: 'customer',
      });
      expect(response.body.data.user.password).toBeUndefined();

      // Should set cookies
      const cookies = extractCookies(response.headers);
      expect(cookies.accessToken).toBeDefined();
      expect(cookies.refreshToken).toBeDefined();
    });

    it('should reject registration with existing email', async () => {
      // Create user first
      await createTestUser({ email: 'existing@example.com' });

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'existing@example.com',
          password: 'SecurePass123!',
          name: 'Duplicate User',
        })
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('already registered');
    });

    it('should reject registration with invalid email', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'invalid-email',
          password: 'SecurePass123!',
          name: 'Test User',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject registration with weak password', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: '123', // Too short
          name: 'Test User',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login successfully with correct credentials', async () => {
      const { user, password } = await createTestUser({
        email: 'login@example.com',
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: user.email,
          password,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toMatchObject({
        id: user.id,
        email: user.email,
        name: user.name,
      });

      // Should set cookies
      const cookies = extractCookies(response.headers);
      expect(cookies.accessToken).toBeDefined();
      expect(cookies.refreshToken).toBeDefined();
    });

    it('should reject login with incorrect password', async () => {
      const { user } = await createTestUser({
        email: 'wrongpass@example.com',
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: user.email,
          password: 'WrongPassword123!',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid');
    });

    it('should reject login with non-existent email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'AnyPassword123!',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return current user when authenticated', async () => {
      const { user, password } = await createTestUser();

      // Login first
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: user.email,
          password,
        });

      const cookies = extractCookies(loginResponse.headers);

      // Get current user
      const response = await request(app)
        .get('/api/auth/me')
        .set('Cookie', [`accessToken=${cookies.accessToken}`])
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toMatchObject({
        userId: user.id,
        type: user.type,
      });
    });

    it('should reject when not authenticated', async () => {
      const response = await request(app).get('/api/auth/me').expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout successfully', async () => {
      const { user, password } = await createTestUser();

      // Login first
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: user.email,
          password,
        });

      const cookies = extractCookies(loginResponse.headers);

      // Logout
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Cookie', [`refreshToken=${cookies.refreshToken}`])
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Logged out');

      // Should clear cookies
      expect(response.headers['set-cookie']).toBeDefined();
    });

    it('should logout even without refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('should refresh access token with valid refresh token', async () => {
      const { user, password } = await createTestUser();

      // Login first
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: user.email,
          password,
        });

      const cookies = extractCookies(loginResponse.headers);

      // Refresh token
      const response = await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', [`refreshToken=${cookies.refreshToken}`])
        .expect(200);

      expect(response.body.success).toBe(true);

      // Should set new cookies
      const newCookies = extractCookies(response.headers);
      expect(newCookies.accessToken).toBeDefined();
      expect(newCookies.refreshToken).toBeDefined();
      expect(newCookies.refreshToken).not.toBe(cookies.refreshToken); // Should rotate
    });

    it('should reject refresh without refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });
});
