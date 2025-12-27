import { mockDeep, mockReset, DeepMockProxy } from 'jest-mock-extended';
import { PrismaClient, EmailCampaign, Promo, CampaignType, CampaignStatus, DiscountType, PromoScope } from '@prisma/client';

// Must be declared before jest.mock due to hoisting
const prismaMock = mockDeep<PrismaClient>() as DeepMockProxy<PrismaClient>;
const sendEmailMock = jest.fn();

// Mock prisma - use getter to avoid hoisting issues
jest.mock('@/lib/prisma', () => ({
  get prisma() {
    return prismaMock;
  },
}));

jest.mock('../email', () => ({
  sendEmail: (...args: unknown[]) => sendEmailMock(...args),
}));

import {
  generateCampaignHtml,
  generateCampaignPlainText,
  sendCampaign,
  sendTestCampaign,
} from '../campaign-service';

describe('Campaign Service', () => {
  beforeEach(() => {
    mockReset(prismaMock);
    sendEmailMock.mockReset();
    jest.clearAllMocks();
  });

  // Helper to create a mock campaign
  const createMockCampaign = (overrides: Partial<EmailCampaign> = {}): EmailCampaign => ({
    id: 'campaign-123',
    name: 'Test Campaign',
    subject: 'Test Subject',
    previewText: 'Preview text here',
    content: '<h1>Hello World</h1><p>This is test content.</p>',
    plainText: null,
    type: 'NEWSLETTER' as CampaignType,
    promoId: null,
    status: 'DRAFT' as CampaignStatus,
    scheduledAt: null,
    sentAt: null,
    recipientCount: 0,
    sentCount: 0,
    failedCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  // Helper to create a mock promo
  const createMockPromo = (overrides: Partial<Promo> = {}): Promo => ({
    id: 'promo-123',
    code: 'TESTCODE',
    name: 'Test Promo',
    description: 'A test promo',
    discountType: 'PERCENTAGE' as DiscountType,
    discountValue: 10 as unknown as import('@prisma/client/runtime/library').Decimal,
    scope: 'ALL_PRODUCTS' as PromoScope,
    categoryId: null,
    subcategoryId: null,
    productIds: [],
    minOrderAmount: null,
    maxUses: null,
    maxUsesPerUser: 1,
    currentUses: 0,
    startsAt: null,
    expiresAt: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  describe('generateCampaignHtml', () => {
    it('should generate HTML with campaign content', () => {
      const campaign = createMockCampaign();
      const html = generateCampaignHtml(campaign);

      expect(html).toContain('<h1>Hello World</h1>');
      expect(html).toContain('<p>This is test content.</p>');
      expect(html).toContain('MakeBelieve Imprints');
      expect(html).toContain('Shop Now');
    });

    it('should include unsubscribe link with recipient email', () => {
      const campaign = createMockCampaign();
      const html = generateCampaignHtml(campaign, null, 'test@example.com');

      expect(html).toContain('unsubscribe?email=test%40example.com');
      expect(html).toContain('Unsubscribe');
    });

    it('should include promo section for PROMO type campaigns', () => {
      const campaign = createMockCampaign({
        type: 'PROMO' as CampaignType,
        promoId: 'promo-123',
      });
      const promo = createMockPromo({
        code: 'SUMMER20',
        discountType: 'PERCENTAGE' as DiscountType,
        discountValue: 20 as unknown as import('@prisma/client/runtime/library').Decimal,
      });

      const html = generateCampaignHtml(campaign, promo);

      expect(html).toContain('SUMMER20');
      expect(html).toContain('20% OFF');
      expect(html).toContain('Use code at checkout');
    });

    it('should show fixed amount for FIXED discount type', () => {
      const campaign = createMockCampaign({
        type: 'PROMO' as CampaignType,
      });
      const promo = createMockPromo({
        code: 'SAVE10',
        discountType: 'FIXED' as DiscountType,
        discountValue: 10 as unknown as import('@prisma/client/runtime/library').Decimal,
      });

      const html = generateCampaignHtml(campaign, promo);

      expect(html).toContain('SAVE10');
      expect(html).toContain('£10.00 OFF');
    });

    it('should include expiry date when promo has one', () => {
      const campaign = createMockCampaign({
        type: 'PROMO' as CampaignType,
      });
      const expiryDate = new Date('2025-12-31');
      const promo = createMockPromo({
        expiresAt: expiryDate,
      });

      const html = generateCampaignHtml(campaign, promo);

      expect(html).toContain('Valid until');
      expect(html).toContain('31/12/2025');
    });

    it('should not include promo section for NEWSLETTER type', () => {
      const campaign = createMockCampaign({
        type: 'NEWSLETTER' as CampaignType,
      });
      const promo = createMockPromo();

      const html = generateCampaignHtml(campaign, promo);

      expect(html).not.toContain('Use code at checkout');
      expect(html).not.toContain('TESTCODE');
    });

    it('should have proper HTML structure', () => {
      const campaign = createMockCampaign();
      const html = generateCampaignHtml(campaign);

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<html>');
      expect(html).toContain('</html>');
      expect(html).toContain('<head>');
      expect(html).toContain('<body');
    });
  });

  describe('generateCampaignPlainText', () => {
    it('should generate plain text with campaign content', () => {
      const campaign = createMockCampaign({
        content: '<h1>Title</h1><p>Content paragraph</p>',
      });
      const text = generateCampaignPlainText(campaign);

      expect(text).toContain('MakeBelieve Imprints');
      expect(text).toContain('Title');
      expect(text).toContain('Content paragraph');
      expect(text).not.toContain('<h1>');
      expect(text).not.toContain('<p>');
    });

    it('should strip HTML tags from content', () => {
      const campaign = createMockCampaign({
        content: '<div><strong>Bold</strong> and <em>italic</em></div>',
      });
      const text = generateCampaignPlainText(campaign);

      expect(text).toContain('Bold');
      expect(text).toContain('italic');
      expect(text).not.toContain('<div>');
      expect(text).not.toContain('<strong>');
      expect(text).not.toContain('<em>');
    });

    it('should include unsubscribe link', () => {
      const campaign = createMockCampaign();
      const text = generateCampaignPlainText(campaign, null, 'test@example.com');

      expect(text).toContain('Unsubscribe');
      expect(text).toContain('test%40example.com');
    });

    it('should include promo code for PROMO type campaigns', () => {
      const campaign = createMockCampaign({
        type: 'PROMO' as CampaignType,
      });
      const promo = createMockPromo({
        code: 'PROMO25',
        discountValue: 25 as unknown as import('@prisma/client/runtime/library').Decimal,
      });

      const text = generateCampaignPlainText(campaign, promo);

      expect(text).toContain('YOUR PROMO CODE: PROMO25');
      expect(text).toContain('25% OFF');
    });

    it('should handle HTML entities correctly', () => {
      const campaign = createMockCampaign({
        content: '&nbsp;Space&amp;More&lt;Less&gt;',
      });
      const text = generateCampaignPlainText(campaign);

      // Entities should be converted: &nbsp; -> space, &amp; -> &, &lt; -> <, &gt; -> >
      expect(text).toContain('Space&More<Less>');
    });
  });

  describe('sendCampaign', () => {
    it('should return error for non-existent campaign', async () => {
      prismaMock.emailCampaign.findUnique.mockResolvedValue(null);

      const result = await sendCampaign('nonexistent-id');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Campaign not found');
      expect(result.sentCount).toBe(0);
      expect(result.failedCount).toBe(0);
    });

    it('should return error for already sent campaign', async () => {
      const campaign = createMockCampaign({ status: 'SENT' as CampaignStatus });
      prismaMock.emailCampaign.findUnique.mockResolvedValue(campaign);

      const result = await sendCampaign('campaign-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Campaign cannot be sent in current status');
    });

    it('should return error for campaign in SENDING status', async () => {
      const campaign = createMockCampaign({ status: 'SENDING' as CampaignStatus });
      prismaMock.emailCampaign.findUnique.mockResolvedValue(campaign);

      const result = await sendCampaign('campaign-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Campaign cannot be sent in current status');
    });

    it('should return error when no active subscribers', async () => {
      const campaign = createMockCampaign({ status: 'DRAFT' as CampaignStatus });
      prismaMock.emailCampaign.findUnique.mockResolvedValue(campaign);
      prismaMock.promo.findUnique.mockResolvedValue(null);
      prismaMock.subscriber.findMany.mockResolvedValue([]);

      const result = await sendCampaign('campaign-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('No active subscribers');
    });

    it('should send to all active subscribers successfully', async () => {
      const campaign = createMockCampaign({ status: 'DRAFT' as CampaignStatus });
      const subscribers = [
        { email: 'user1@example.com' },
        { email: 'user2@example.com' },
        { email: 'user3@example.com' },
      ];

      prismaMock.emailCampaign.findUnique.mockResolvedValue(campaign);
      prismaMock.promo.findUnique.mockResolvedValue(null);
      prismaMock.subscriber.findMany.mockResolvedValue(subscribers);
      prismaMock.emailCampaign.update.mockResolvedValue(campaign);
      sendEmailMock.mockResolvedValue(true);

      const result = await sendCampaign('campaign-123');

      expect(result.success).toBe(true);
      expect(result.sentCount).toBe(3);
      expect(result.failedCount).toBe(0);
      expect(sendEmailMock).toHaveBeenCalledTimes(3);
    });

    it('should handle partial failures', async () => {
      const campaign = createMockCampaign({ status: 'DRAFT' as CampaignStatus });
      const subscribers = [
        { email: 'user1@example.com' },
        { email: 'user2@example.com' },
        { email: 'user3@example.com' },
      ];

      prismaMock.emailCampaign.findUnique.mockResolvedValue(campaign);
      prismaMock.promo.findUnique.mockResolvedValue(null);
      prismaMock.subscriber.findMany.mockResolvedValue(subscribers);
      prismaMock.emailCampaign.update.mockResolvedValue(campaign);

      // First two succeed, third fails
      sendEmailMock
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(true)
        .mockRejectedValueOnce(new Error('Email failed'));

      const result = await sendCampaign('campaign-123');

      expect(result.success).toBe(true); // Still success if some emails sent
      expect(result.sentCount).toBe(2);
      expect(result.failedCount).toBe(1);
    });

    it('should update campaign status to SENDING then SENT', async () => {
      const campaign = createMockCampaign({ status: 'DRAFT' as CampaignStatus });
      const subscribers = [{ email: 'user1@example.com' }];

      prismaMock.emailCampaign.findUnique.mockResolvedValue(campaign);
      prismaMock.promo.findUnique.mockResolvedValue(null);
      prismaMock.subscriber.findMany.mockResolvedValue(subscribers);
      prismaMock.emailCampaign.update.mockResolvedValue(campaign);
      sendEmailMock.mockResolvedValue(true);

      await sendCampaign('campaign-123');

      // First update - SENDING
      expect(prismaMock.emailCampaign.update).toHaveBeenNthCalledWith(1, {
        where: { id: 'campaign-123' },
        data: {
          status: 'SENDING',
          recipientCount: 1,
        },
      });

      // Second update - SENT with stats
      expect(prismaMock.emailCampaign.update).toHaveBeenNthCalledWith(2, {
        where: { id: 'campaign-123' },
        data: expect.objectContaining({
          status: 'SENT',
          sentCount: 1,
          failedCount: 0,
        }),
      });
    });

    it('should update status to FAILED when all emails fail', async () => {
      const campaign = createMockCampaign({ status: 'DRAFT' as CampaignStatus });
      const subscribers = [
        { email: 'user1@example.com' },
        { email: 'user2@example.com' },
      ];

      prismaMock.emailCampaign.findUnique.mockResolvedValue(campaign);
      prismaMock.promo.findUnique.mockResolvedValue(null);
      prismaMock.subscriber.findMany.mockResolvedValue(subscribers);
      prismaMock.emailCampaign.update.mockResolvedValue(campaign);
      sendEmailMock.mockRejectedValue(new Error('Email service down'));

      const result = await sendCampaign('campaign-123');

      expect(result.success).toBe(false);
      expect(result.sentCount).toBe(0);
      expect(result.failedCount).toBe(2);

      // Should update with FAILED status
      expect(prismaMock.emailCampaign.update).toHaveBeenLastCalledWith({
        where: { id: 'campaign-123' },
        data: expect.objectContaining({
          status: 'FAILED',
        }),
      });
    });

    it('should include promo in emails for PROMO campaigns', async () => {
      const promo = createMockPromo({ code: 'SPECIAL50' });
      const campaign = createMockCampaign({
        status: 'DRAFT' as CampaignStatus,
        type: 'PROMO' as CampaignType,
        promoId: 'promo-123',
      });
      const subscribers = [{ email: 'user1@example.com' }];

      prismaMock.emailCampaign.findUnique.mockResolvedValue(campaign);
      prismaMock.promo.findUnique.mockResolvedValue(promo);
      prismaMock.subscriber.findMany.mockResolvedValue(subscribers);
      prismaMock.emailCampaign.update.mockResolvedValue(campaign);
      sendEmailMock.mockResolvedValue(true);

      await sendCampaign('campaign-123');

      expect(prismaMock.promo.findUnique).toHaveBeenCalledWith({
        where: { id: 'promo-123' },
      });
      expect(sendEmailMock).toHaveBeenCalledWith(
        expect.objectContaining({
          html: expect.stringContaining('SPECIAL50'),
        })
      );
    });

    it('should allow sending SCHEDULED campaigns', async () => {
      const campaign = createMockCampaign({ status: 'SCHEDULED' as CampaignStatus });
      const subscribers = [{ email: 'user1@example.com' }];

      prismaMock.emailCampaign.findUnique.mockResolvedValue(campaign);
      prismaMock.promo.findUnique.mockResolvedValue(null);
      prismaMock.subscriber.findMany.mockResolvedValue(subscribers);
      prismaMock.emailCampaign.update.mockResolvedValue(campaign);
      sendEmailMock.mockResolvedValue(true);

      const result = await sendCampaign('campaign-123');

      expect(result.success).toBe(true);
      expect(result.sentCount).toBe(1);
    });

    it('should use plainText if provided in campaign', async () => {
      const campaign = createMockCampaign({
        status: 'DRAFT' as CampaignStatus,
        plainText: 'Custom plain text version',
      });
      const subscribers = [{ email: 'user1@example.com' }];

      prismaMock.emailCampaign.findUnique.mockResolvedValue(campaign);
      prismaMock.promo.findUnique.mockResolvedValue(null);
      prismaMock.subscriber.findMany.mockResolvedValue(subscribers);
      prismaMock.emailCampaign.update.mockResolvedValue(campaign);
      sendEmailMock.mockResolvedValue(true);

      await sendCampaign('campaign-123');

      expect(sendEmailMock).toHaveBeenCalledWith(
        expect.objectContaining({
          text: 'Custom plain text version',
        })
      );
    });
  });

  describe('sendTestCampaign', () => {
    it('should return false for non-existent campaign', async () => {
      prismaMock.emailCampaign.findUnique.mockResolvedValue(null);

      const result = await sendTestCampaign('nonexistent-id', 'test@example.com');

      expect(result).toBe(false);
      expect(sendEmailMock).not.toHaveBeenCalled();
    });

    it('should send test email successfully', async () => {
      const campaign = createMockCampaign();
      prismaMock.emailCampaign.findUnique.mockResolvedValue(campaign);
      prismaMock.promo.findUnique.mockResolvedValue(null);
      sendEmailMock.mockResolvedValue(true);

      const result = await sendTestCampaign('campaign-123', 'admin@example.com');

      expect(result).toBe(true);
      expect(sendEmailMock).toHaveBeenCalledTimes(1);
      expect(sendEmailMock).toHaveBeenCalledWith({
        to: 'admin@example.com',
        subject: '[TEST] Test Subject',
        html: expect.any(String),
        text: expect.any(String),
      });
    });

    it('should prefix subject with [TEST]', async () => {
      const campaign = createMockCampaign({ subject: 'Holiday Sale!' });
      prismaMock.emailCampaign.findUnique.mockResolvedValue(campaign);
      prismaMock.promo.findUnique.mockResolvedValue(null);
      sendEmailMock.mockResolvedValue(true);

      await sendTestCampaign('campaign-123', 'admin@example.com');

      expect(sendEmailMock).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: '[TEST] Holiday Sale!',
        })
      );
    });

    it('should include promo in test email for PROMO campaigns', async () => {
      const promo = createMockPromo({ code: 'TESTPROMO' });
      const campaign = createMockCampaign({
        type: 'PROMO' as CampaignType,
        promoId: 'promo-123',
      });

      prismaMock.emailCampaign.findUnique.mockResolvedValue(campaign);
      prismaMock.promo.findUnique.mockResolvedValue(promo);
      sendEmailMock.mockResolvedValue(true);

      await sendTestCampaign('campaign-123', 'admin@example.com');

      expect(sendEmailMock).toHaveBeenCalledWith(
        expect.objectContaining({
          html: expect.stringContaining('TESTPROMO'),
        })
      );
    });

    it('should return false if email sending fails', async () => {
      const campaign = createMockCampaign();
      prismaMock.emailCampaign.findUnique.mockResolvedValue(campaign);
      prismaMock.promo.findUnique.mockResolvedValue(null);
      sendEmailMock.mockResolvedValue(false);

      const result = await sendTestCampaign('campaign-123', 'admin@example.com');

      expect(result).toBe(false);
    });

    it('should use plainText if provided in campaign', async () => {
      const campaign = createMockCampaign({
        plainText: 'Custom plain text',
      });
      prismaMock.emailCampaign.findUnique.mockResolvedValue(campaign);
      prismaMock.promo.findUnique.mockResolvedValue(null);
      sendEmailMock.mockResolvedValue(true);

      await sendTestCampaign('campaign-123', 'admin@example.com');

      expect(sendEmailMock).toHaveBeenCalledWith(
        expect.objectContaining({
          text: 'Custom plain text',
        })
      );
    });
  });
});
