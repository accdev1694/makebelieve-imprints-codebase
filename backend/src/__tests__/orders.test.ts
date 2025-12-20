/**
 * Orders Integration Tests
 * Tests for order creation, listing, and status updates
 */

import request from 'supertest';
import app from '../index';
import {
  createTestUser,
  createTestAdmin,
  createTestDesign,
  createTestOrder,
  generateTestTokens,
  extractCookies,
} from './helpers';
import { OrderStatus } from '@prisma/client';

describe('Orders API', () => {
  describe('POST /api/orders', () => {
    it('should create an order successfully', async () => {
      const { user, password } = await createTestUser();
      const design = await createTestDesign(user.id);

      // Login
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({ email: user.email, password });

      const cookies = extractCookies(loginResponse.headers);

      // Create order
      const response = await request(app)
        .post('/api/orders')
        .set('Cookie', [`accessToken=${cookies.accessToken}`])
        .send({
          designId: design.id,
          printSize: 'A4',
          material: 'PAPER',
          orientation: 'PORTRAIT',
          printWidth: 210,
          printHeight: 297,
          totalPrice: 19.99,
          shippingAddress: {
            name: 'Test Customer',
            addressLine1: '123 Test St',
            city: 'London',
            postcode: 'SW1A 1AA',
            country: 'UK',
          },
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.order).toMatchObject({
        customerId: user.id,
        designId: design.id,
        status: OrderStatus.pending,
        totalPrice: 19.99,
      });
    });

    it('should reject order with non-existent design', async () => {
      const { user, password } = await createTestUser();

      // Login
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({ email: user.email, password });

      const cookies = extractCookies(loginResponse.headers);

      // Create order with fake design ID
      const response = await request(app)
        .post('/api/orders')
        .set('Cookie', [`accessToken=${cookies.accessToken}`])
        .send({
          designId: '00000000-0000-0000-0000-000000000000',
          printSize: 'A4',
          material: 'PAPER',
          orientation: 'PORTRAIT',
          printWidth: 210,
          printHeight: 297,
          totalPrice: 19.99,
          shippingAddress: {
            name: 'Test Customer',
            addressLine1: '123 Test St',
            city: 'London',
            postcode: 'SW1A 1AA',
            country: 'UK',
          },
        })
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should reject order for design owned by another user', async () => {
      const { user: owner } = await createTestUser();
      const { user: otherUser, password } = await createTestUser({
        email: 'other@example.com',
      });
      const design = await createTestDesign(owner.id);

      // Login as other user
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({ email: otherUser.email, password });

      const cookies = extractCookies(loginResponse.headers);

      // Try to create order with owner's design
      const response = await request(app)
        .post('/api/orders')
        .set('Cookie', [`accessToken=${cookies.accessToken}`])
        .send({
          designId: design.id,
          printSize: 'A4',
          material: 'PAPER',
          orientation: 'PORTRAIT',
          printWidth: 210,
          printHeight: 297,
          totalPrice: 19.99,
          shippingAddress: {
            name: 'Test Customer',
            addressLine1: '123 Test St',
            city: 'London',
            postcode: 'SW1A 1AA',
            country: 'UK',
          },
        })
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/orders', () => {
    it('should list user\'s own orders', async () => {
      const { user, password } = await createTestUser();
      const design = await createTestDesign(user.id);
      await createTestOrder(user.id, design.id);
      await createTestOrder(user.id, design.id);

      // Login
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({ email: user.email, password });

      const cookies = extractCookies(loginResponse.headers);

      // List orders
      const response = await request(app)
        .get('/api/orders')
        .set('Cookie', [`accessToken=${cookies.accessToken}`])
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.orders).toHaveLength(2);
      expect(response.body.data.pagination).toMatchObject({
        page: 1,
        total: 2,
      });
    });

    it('should list all orders for admin', async () => {
      const { user: customer1 } = await createTestUser({ email: 'c1@example.com' });
      const { user: customer2 } = await createTestUser({ email: 'c2@example.com' });
      const { user: admin, password: adminPassword } = await createTestAdmin({
        email: 'admin@example.com',
      });

      const design1 = await createTestDesign(customer1.id);
      const design2 = await createTestDesign(customer2.id);
      await createTestOrder(customer1.id, design1.id);
      await createTestOrder(customer2.id, design2.id);

      // Login as admin
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({ email: admin.email, password: adminPassword });

      const cookies = extractCookies(loginResponse.headers);

      // List all orders
      const response = await request(app)
        .get('/api/orders')
        .set('Cookie', [`accessToken=${cookies.accessToken}`])
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.orders).toHaveLength(2); // Both customer orders
    });

    it('should filter orders by status', async () => {
      const { user, password } = await createTestUser();
      const design = await createTestDesign(user.id);
      const order1 = await createTestOrder(user.id, design.id);
      const order2 = await createTestOrder(user.id, design.id);

      // Update one order status
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();
      await prisma.order.update({
        where: { id: order1.id },
        data: { status: OrderStatus.confirmed },
      });
      await prisma.$disconnect();

      // Login
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({ email: user.email, password });

      const cookies = extractCookies(loginResponse.headers);

      // Filter by confirmed status
      const response = await request(app)
        .get('/api/orders?status=confirmed')
        .set('Cookie', [`accessToken=${cookies.accessToken}`])
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.orders).toHaveLength(1);
      expect(response.body.data.orders[0].status).toBe(OrderStatus.confirmed);
    });
  });

  describe('GET /api/orders/:id', () => {
    it('should get order details', async () => {
      const { user, password } = await createTestUser();
      const design = await createTestDesign(user.id);
      const order = await createTestOrder(user.id, design.id);

      // Login
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({ email: user.email, password });

      const cookies = extractCookies(loginResponse.headers);

      // Get order
      const response = await request(app)
        .get(`/api/orders/${order.id}`)
        .set('Cookie', [`accessToken=${cookies.accessToken}`])
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.order).toMatchObject({
        id: order.id,
        customerId: user.id,
      });
    });

    it('should reject access to other user\'s order', async () => {
      const { user: owner } = await createTestUser();
      const { user: otherUser, password } = await createTestUser({
        email: 'other@example.com',
      });
      const design = await createTestDesign(owner.id);
      const order = await createTestOrder(owner.id, design.id);

      // Login as other user
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({ email: otherUser.email, password });

      const cookies = extractCookies(loginResponse.headers);

      // Try to get owner's order
      const response = await request(app)
        .get(`/api/orders/${order.id}`)
        .set('Cookie', [`accessToken=${cookies.accessToken}`])
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/orders/:id/status', () => {
    it('should update order status (admin only)', async () => {
      const { user: customer } = await createTestUser();
      const { user: admin, password: adminPassword } = await createTestAdmin({
        email: 'admin@example.com',
      });

      const design = await createTestDesign(customer.id);
      const order = await createTestOrder(customer.id, design.id);

      // Login as admin
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({ email: admin.email, password: adminPassword });

      const cookies = extractCookies(loginResponse.headers);

      // Update status
      const response = await request(app)
        .put(`/api/orders/${order.id}/status`)
        .set('Cookie', [`accessToken=${cookies.accessToken}`])
        .send({ status: OrderStatus.confirmed })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.order.status).toBe(OrderStatus.confirmed);
    });

    it('should reject status update by non-admin', async () => {
      const { user, password } = await createTestUser();
      const design = await createTestDesign(user.id);
      const order = await createTestOrder(user.id, design.id);

      // Login as customer
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({ email: user.email, password });

      const cookies = extractCookies(loginResponse.headers);

      // Try to update status
      const response = await request(app)
        .put(`/api/orders/${order.id}/status`)
        .set('Cookie', [`accessToken=${cookies.accessToken}`])
        .send({ status: OrderStatus.confirmed })
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });
});
