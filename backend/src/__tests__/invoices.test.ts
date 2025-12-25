/**
 * Invoices Integration Tests
 * Tests for invoice listing and retrieval with ownership checks
 */

import request from 'supertest';
import app from '../index';
import { PrismaClient } from '@prisma/client';
import { createTestUser, createTestAdmin, generateTestTokens, createTestDesign, createTestOrder } from './helpers';

const prisma = new PrismaClient();

/**
 * Helper to create a test invoice
 */
async function createTestInvoice(orderId: string, overrides?: {
  invoiceNumber?: string;
  subtotal?: number;
  vatRate?: number;
  vatAmount?: number;
  total?: number;
}) {
  const invoiceNumber = overrides?.invoiceNumber || `INV-${Date.now()}`;
  const subtotal = overrides?.subtotal || 16.66;
  const vatRate = overrides?.vatRate || 20.00;
  const vatAmount = overrides?.vatAmount || 3.33;
  const total = overrides?.total || 19.99;

  return prisma.invoice.create({
    data: {
      orderId,
      invoiceNumber,
      subtotal,
      vatRate,
      vatAmount,
      total,
      currency: 'GBP',
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      status: 'ISSUED',
    },
  });
}

describe('Invoices API', () => {
  describe('GET /api/invoices', () => {
    it('should list invoices for authenticated user', async () => {
      const { user } = await createTestUser({ email: 'invoiceuser@example.com' });
      const { accessToken } = generateTestTokens(user.id, user.type);
      const design = await createTestDesign(user.id);
      const order = await createTestOrder(user.id, design.id);
      await createTestInvoice(order.id);

      const response = await request(app)
        .get('/api/invoices')
        .set('Cookie', [`accessToken=${accessToken}`])
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.invoices).toBeDefined();
      expect(response.body.data.pagination).toBeDefined();
    });

    it('should only show user own invoices', async () => {
      const { user: user1 } = await createTestUser({ email: 'invoice1@example.com' });
      const { user: user2 } = await createTestUser({ email: 'invoice2@example.com' });
      const { accessToken } = generateTestTokens(user1.id, user1.type);

      // Create orders and invoices for both users
      const design1 = await createTestDesign(user1.id);
      const order1 = await createTestOrder(user1.id, design1.id);
      await createTestInvoice(order1.id, { invoiceNumber: 'INV-USER1' });

      const design2 = await createTestDesign(user2.id);
      const order2 = await createTestOrder(user2.id, design2.id);
      await createTestInvoice(order2.id, { invoiceNumber: 'INV-USER2' });

      const response = await request(app)
        .get('/api/invoices')
        .set('Cookie', [`accessToken=${accessToken}`])
        .expect(200);

      expect(response.body.success).toBe(true);
      // User should only see their own invoices
      const invoiceNumbers = response.body.data.invoices.map((inv: any) => inv.invoiceNumber);
      expect(invoiceNumbers).not.toContain('INV-USER2');
    });

    it('should allow admin to see all invoices', async () => {
      const { user: admin } = await createTestAdmin({ email: 'invoiceadmin@example.com' });
      const { accessToken } = generateTestTokens(admin.id, admin.type);

      const response = await request(app)
        .get('/api/invoices')
        .set('Cookie', [`accessToken=${accessToken}`])
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.invoices).toBeDefined();
    });

    it('should filter by status', async () => {
      const { user } = await createTestUser({ email: 'invoicestatus@example.com' });
      const { accessToken } = generateTestTokens(user.id, user.type);

      const response = await request(app)
        .get('/api/invoices?status=ISSUED')
        .set('Cookie', [`accessToken=${accessToken}`])
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.invoices.forEach((invoice: any) => {
        expect(invoice.status).toBe('ISSUED');
      });
    });

    it('should reject unauthenticated request', async () => {
      const response = await request(app)
        .get('/api/invoices')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/invoices/:id', () => {
    it('should get invoice by ID for owner', async () => {
      const { user } = await createTestUser({ email: 'getinvoice@example.com' });
      const { accessToken } = generateTestTokens(user.id, user.type);
      const design = await createTestDesign(user.id);
      const order = await createTestOrder(user.id, design.id);
      const invoice = await createTestInvoice(order.id);

      const response = await request(app)
        .get(`/api/invoices/${invoice.id}`)
        .set('Cookie', [`accessToken=${accessToken}`])
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.invoice.id).toBe(invoice.id);
      expect(response.body.data.invoice.invoiceNumber).toBe(invoice.invoiceNumber);
    });

    it('should deny access to other user invoice', async () => {
      const { user: owner } = await createTestUser({ email: 'invoiceowner@example.com' });
      const { user: other } = await createTestUser({ email: 'invoiceother@example.com' });
      const { accessToken } = generateTestTokens(other.id, other.type);

      const design = await createTestDesign(owner.id);
      const order = await createTestOrder(owner.id, design.id);
      const invoice = await createTestInvoice(order.id);

      const response = await request(app)
        .get(`/api/invoices/${invoice.id}`)
        .set('Cookie', [`accessToken=${accessToken}`])
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should allow admin to view any invoice', async () => {
      const { user: owner } = await createTestUser({ email: 'invoiceowner2@example.com' });
      const { user: admin } = await createTestAdmin({ email: 'invoiceadmin2@example.com' });
      const { accessToken } = generateTestTokens(admin.id, admin.type);

      const design = await createTestDesign(owner.id);
      const order = await createTestOrder(owner.id, design.id);
      const invoice = await createTestInvoice(order.id);

      const response = await request(app)
        .get(`/api/invoices/${invoice.id}`)
        .set('Cookie', [`accessToken=${accessToken}`])
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.invoice.id).toBe(invoice.id);
    });

    it('should return 404 for non-existent invoice', async () => {
      const { user } = await createTestUser({ email: 'invoice404@example.com' });
      const { accessToken } = generateTestTokens(user.id, user.type);

      const response = await request(app)
        .get('/api/invoices/00000000-0000-0000-0000-000000000000')
        .set('Cookie', [`accessToken=${accessToken}`])
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/invoices/:id/pdf', () => {
    it('should return PDF URL for owner', async () => {
      const { user } = await createTestUser({ email: 'invoicepdf@example.com' });
      const { accessToken } = generateTestTokens(user.id, user.type);
      const design = await createTestDesign(user.id);
      const order = await createTestOrder(user.id, design.id);

      // Create invoice with PDF URL
      const invoice = await prisma.invoice.create({
        data: {
          orderId: order.id,
          invoiceNumber: `INV-PDF-${Date.now()}`,
          subtotal: 16.66,
          vatRate: 20.00,
          vatAmount: 3.33,
          total: 19.99,
          currency: 'GBP',
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          status: 'ISSUED',
          pdfUrl: 'https://storage.example.com/invoices/test.pdf',
        },
      });

      const response = await request(app)
        .get(`/api/invoices/${invoice.id}/pdf`)
        .set('Cookie', [`accessToken=${accessToken}`])
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.pdfUrl).toBe('https://storage.example.com/invoices/test.pdf');
      expect(response.body.data.invoiceNumber).toBe(invoice.invoiceNumber);
    });

    it('should return 404 when PDF not generated', async () => {
      const { user } = await createTestUser({ email: 'invoicenopdf@example.com' });
      const { accessToken } = generateTestTokens(user.id, user.type);
      const design = await createTestDesign(user.id);
      const order = await createTestOrder(user.id, design.id);
      const invoice = await createTestInvoice(order.id); // No pdfUrl

      const response = await request(app)
        .get(`/api/invoices/${invoice.id}/pdf`)
        .set('Cookie', [`accessToken=${accessToken}`])
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should deny PDF access to other user', async () => {
      const { user: owner } = await createTestUser({ email: 'pdfowner@example.com' });
      const { user: other } = await createTestUser({ email: 'pdfother@example.com' });
      const { accessToken } = generateTestTokens(other.id, other.type);

      const design = await createTestDesign(owner.id);
      const order = await createTestOrder(owner.id, design.id);
      const invoice = await prisma.invoice.create({
        data: {
          orderId: order.id,
          invoiceNumber: `INV-PDFACCESS-${Date.now()}`,
          subtotal: 16.66,
          vatRate: 20.00,
          vatAmount: 3.33,
          total: 19.99,
          currency: 'GBP',
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          status: 'ISSUED',
          pdfUrl: 'https://storage.example.com/invoices/secret.pdf',
        },
      });

      const response = await request(app)
        .get(`/api/invoices/${invoice.id}/pdf`)
        .set('Cookie', [`accessToken=${accessToken}`])
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });
});
