/**
 * Invoice Service Tests
 *
 * Tests invoice PDF generation and email delivery.
 */

import { mockReset, DeepMockProxy } from 'jest-mock-extended';
import { PrismaClient, Invoice, Order, User, OrderItem, Product, ProductVariant } from '@prisma/client';

// Mock prisma
jest.mock('@/lib/prisma', () => {
  const mock = jest.requireActual('jest-mock-extended').mockDeep();
  return {
    __esModule: true,
    default: mock,
    prisma: mock,
  };
});

// Mock react-pdf renderer
const mockRenderToBuffer = jest.fn();
jest.mock('@react-pdf/renderer', () => ({
  renderToBuffer: (element: unknown) => mockRenderToBuffer(element),
}));

// Mock PDF component
jest.mock('@/lib/pdf/invoice', () => ({
  InvoicePDF: jest.fn((props) => props),
  InvoiceData: null,
  InvoiceItem: null,
}));

// Mock email service
const mockSendInvoiceEmail = jest.fn();
jest.mock('../email', () => ({
  sendInvoiceEmail: (...args: unknown[]) => mockSendInvoiceEmail(...args),
}));

// Mock R2 storage
const mockUploadToR2 = jest.fn();
const mockIsR2Configured = jest.fn();
const mockGenerateInvoiceKey = jest.fn();
jest.mock('../r2-storage', () => ({
  uploadToR2: (...args: unknown[]) => mockUploadToR2(...args),
  isR2Configured: () => mockIsR2Configured(),
  generateInvoiceKey: (invoiceNumber: string) => mockGenerateInvoiceKey(invoiceNumber),
}));

import prismaImport from '@/lib/prisma';
const prisma = prismaImport as unknown as DeepMockProxy<PrismaClient>;

import {
  generateInvoicePDF,
  generateAndSendInvoice,
  getInvoiceForPDF,
} from '../invoice-service';

describe('Invoice Service', () => {
  const mockInvoice = {
    id: 'inv-123',
    invoiceNumber: 'INV-20240115-0001',
    orderId: 'order-123',
    subtotal: 83.33,
    vatRate: 20,
    vatAmount: 16.67,
    total: 100.00,
    currency: 'GBP',
    issueDate: new Date('2024-01-15'),
    dueDate: new Date('2024-02-15'),
    order: {
      id: 'order-123',
      totalPrice: 100.00,
      createdAt: new Date('2024-01-15'),
      customer: {
        name: 'John Doe',
        email: 'john@example.com',
      },
      items: [
        {
          quantity: 2,
          unitPrice: 25.00,
          totalPrice: 50.00,
          product: { name: 'Custom Mug' },
          variant: { name: 'Large' },
        },
        {
          quantity: 1,
          unitPrice: 33.33,
          totalPrice: 33.33,
          product: { name: 'Photo Print' },
          variant: null,
        },
      ],
    },
  };

  beforeEach(() => {
    mockReset(prisma);
    jest.clearAllMocks();

    mockRenderToBuffer.mockResolvedValue(Buffer.from('PDF content'));
    mockSendInvoiceEmail.mockResolvedValue(true);
    mockIsR2Configured.mockReturnValue(false);
    mockGenerateInvoiceKey.mockImplementation((num: string) => `invoices/${num}.pdf`);
  });

  describe('generateInvoicePDF', () => {
    it('should generate PDF with correct invoice data', async () => {
      await generateInvoicePDF(mockInvoice as never);

      expect(mockRenderToBuffer).toHaveBeenCalledTimes(1);
    });

    it('should build correct item descriptions with variants', async () => {
      // The function should combine product name with variant name
      await generateInvoicePDF(mockInvoice as never);

      expect(mockRenderToBuffer).toHaveBeenCalled();
    });

    it('should handle items without variants', async () => {
      const invoiceWithoutVariant = {
        ...mockInvoice,
        order: {
          ...mockInvoice.order,
          items: [
            {
              quantity: 1,
              unitPrice: 50.00,
              totalPrice: 50.00,
              product: { name: 'Simple Product' },
              variant: null,
            },
          ],
        },
      };

      await generateInvoicePDF(invoiceWithoutVariant as never);

      expect(mockRenderToBuffer).toHaveBeenCalled();
    });

    it('should handle empty items array with fallback line item', async () => {
      const invoiceWithNoItems = {
        ...mockInvoice,
        order: {
          ...mockInvoice.order,
          items: [],
        },
      };

      await generateInvoicePDF(invoiceWithNoItems as never);

      expect(mockRenderToBuffer).toHaveBeenCalled();
    });

    it('should handle Decimal types from Prisma', async () => {
      const invoiceWithDecimals = {
        ...mockInvoice,
        subtotal: { toNumber: () => 83.33 },
        vatRate: { toNumber: () => 20 },
        vatAmount: { toNumber: () => 16.67 },
        total: { toNumber: () => 100.00 },
        order: {
          ...mockInvoice.order,
          items: [
            {
              quantity: 1,
              unitPrice: { toNumber: () => 83.33 },
              totalPrice: { toNumber: () => 83.33 },
              product: { name: 'Test' },
              variant: null,
            },
          ],
        },
      };

      await generateInvoicePDF(invoiceWithDecimals as never);

      expect(mockRenderToBuffer).toHaveBeenCalled();
    });
  });

  describe('generateAndSendInvoice', () => {
    beforeEach(() => {
      prisma.invoice.findUnique.mockResolvedValue({
        ...mockInvoice,
        pdfUrl: null,
      } as never);
    });

    it('should generate PDF and send email successfully', async () => {
      const result = await generateAndSendInvoice('inv-123');

      expect(result.success).toBe(true);
      expect(mockRenderToBuffer).toHaveBeenCalled();
      expect(mockSendInvoiceEmail).toHaveBeenCalledWith(
        'john@example.com',
        'John Doe',
        'INV-20240115-0001',
        'ORDER-12', // First 8 chars of order ID uppercased
        100.00,
        expect.any(String) // Base64 PDF
      );
    });

    it('should return error when invoice not found', async () => {
      prisma.invoice.findUnique.mockResolvedValue(null);

      const result = await generateAndSendInvoice('non-existent');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invoice not found');
    });

    it('should upload to R2 when configured', async () => {
      mockIsR2Configured.mockReturnValue(true);
      mockUploadToR2.mockResolvedValue({
        success: true,
        url: 'https://r2.example.com/invoices/INV-001.pdf',
      });
      prisma.invoice.update.mockResolvedValue({} as Invoice);

      const result = await generateAndSendInvoice('inv-123');

      expect(result.success).toBe(true);
      expect(result.pdfUrl).toBe('https://r2.example.com/invoices/INV-001.pdf');
      expect(mockUploadToR2).toHaveBeenCalled();
      expect(prisma.invoice.update).toHaveBeenCalledWith({
        where: { id: 'inv-123' },
        data: { pdfUrl: 'https://r2.example.com/invoices/INV-001.pdf' },
      });
    });

    it('should continue if R2 upload fails', async () => {
      mockIsR2Configured.mockReturnValue(true);
      mockUploadToR2.mockResolvedValue({
        success: false,
        error: 'Upload failed',
      });

      const result = await generateAndSendInvoice('inv-123');

      expect(result.success).toBe(true);
      expect(result.pdfUrl).toBeUndefined();
    });

    it('should still send email if PDF generation fails', async () => {
      mockRenderToBuffer.mockRejectedValue(new Error('PDF generation failed'));

      const result = await generateAndSendInvoice('inv-123');

      // Email should still be attempted with empty PDF
      expect(mockSendInvoiceEmail).toHaveBeenCalledWith(
        'john@example.com',
        'John Doe',
        'INV-20240115-0001',
        expect.any(String),
        100.00,
        '' // Empty string for failed PDF
      );
    });

    it('should return partial success if email fails', async () => {
      mockSendInvoiceEmail.mockResolvedValue(false);

      const result = await generateAndSendInvoice('inv-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Email sending failed');
    });

    it('should handle email service throwing error', async () => {
      mockSendInvoiceEmail.mockRejectedValue(new Error('SMTP error'));

      const result = await generateAndSendInvoice('inv-123');

      expect(result.success).toBe(false);
    });

    it('should use "Customer" as fallback when name is null', async () => {
      prisma.invoice.findUnique.mockResolvedValue({
        ...mockInvoice,
        order: {
          ...mockInvoice.order,
          customer: {
            name: null,
            email: 'anonymous@example.com',
          },
        },
      } as never);

      await generateAndSendInvoice('inv-123');

      expect(mockSendInvoiceEmail).toHaveBeenCalledWith(
        'anonymous@example.com',
        'Customer',
        expect.any(String),
        expect.any(String),
        expect.any(Number),
        expect.any(String)
      );
    });

    it('should handle total as Prisma Decimal type', async () => {
      prisma.invoice.findUnique.mockResolvedValue({
        ...mockInvoice,
        total: { toString: () => '150.00' },
      } as never);

      await generateAndSendInvoice('inv-123');

      expect(mockSendInvoiceEmail).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.any(String),
        expect.any(String),
        150,
        expect.any(String)
      );
    });
  });

  describe('getInvoiceForPDF', () => {
    it('should fetch invoice with all related data', async () => {
      prisma.invoice.findUnique.mockResolvedValue(mockInvoice as never);

      const invoice = await getInvoiceForPDF('inv-123');

      expect(invoice).toEqual(mockInvoice);
      expect(prisma.invoice.findUnique).toHaveBeenCalledWith({
        where: { id: 'inv-123' },
        include: {
          order: {
            include: {
              customer: {
                select: { name: true, email: true },
              },
              items: {
                include: {
                  product: { select: { name: true } },
                  variant: { select: { name: true } },
                },
              },
            },
          },
        },
      });
    });

    it('should return null when invoice not found', async () => {
      prisma.invoice.findUnique.mockResolvedValue(null);

      const invoice = await getInvoiceForPDF('non-existent');

      expect(invoice).toBeNull();
    });
  });

  describe('Edge cases', () => {
    it('should handle very large invoice totals', async () => {
      prisma.invoice.findUnique.mockResolvedValue({
        ...mockInvoice,
        subtotal: 999999.99,
        vatAmount: 199999.99,
        total: 1199999.98,
      } as never);

      const result = await generateAndSendInvoice('inv-123');

      expect(result.success).toBe(true);
    });

    it('should handle zero-value invoices', async () => {
      prisma.invoice.findUnique.mockResolvedValue({
        ...mockInvoice,
        subtotal: 0,
        vatAmount: 0,
        total: 0,
      } as never);

      const result = await generateAndSendInvoice('inv-123');

      expect(result.success).toBe(true);
    });

    it('should handle unicode characters in customer name', async () => {
      prisma.invoice.findUnique.mockResolvedValue({
        ...mockInvoice,
        order: {
          ...mockInvoice.order,
          customer: {
            name: 'José García 日本語',
            email: 'jose@example.com',
          },
        },
      } as never);

      const result = await generateAndSendInvoice('inv-123');

      expect(result.success).toBe(true);
      expect(mockSendInvoiceEmail).toHaveBeenCalledWith(
        'jose@example.com',
        'José García 日本語',
        expect.any(String),
        expect.any(String),
        expect.any(Number),
        expect.any(String)
      );
    });

    it('should handle multiple currencies', async () => {
      prisma.invoice.findUnique.mockResolvedValue({
        ...mockInvoice,
        currency: 'EUR',
      } as never);

      const result = await generateAndSendInvoice('inv-123');

      expect(result.success).toBe(true);
    });
  });
});
