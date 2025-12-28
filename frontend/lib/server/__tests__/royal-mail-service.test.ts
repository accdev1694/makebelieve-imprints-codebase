/**
 * Royal Mail Service Tests
 *
 * Tests for the Royal Mail Click & Drop API integration
 */

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock environment variable
const originalEnv = process.env;

beforeEach(() => {
  jest.resetModules();
  mockFetch.mockReset();
  process.env = {
    ...originalEnv,
    ROYAL_MAIL_API_KEY: 'test-api-key-12345',
  };
});

afterAll(() => {
  process.env = originalEnv;
});

import {
  checkHealth,
  createShipment,
  getOrders,
  getOrderByReference,
  getLabel,
  deleteOrders,
  manifestOrders,
  getManifest,
  listOrders,
  getCountryCode,
  CreateShipmentRequest,
} from '../royal-mail-service';

describe('Royal Mail Service', () => {
  describe('getCountryCode', () => {
    it('should return correct ISO code for United Kingdom', () => {
      expect(getCountryCode('United Kingdom')).toBe('GB');
    });

    it('should return correct ISO code for United States', () => {
      expect(getCountryCode('United States')).toBe('US');
    });

    it('should return correct ISO code for Germany', () => {
      expect(getCountryCode('Germany')).toBe('DE');
    });

    it('should return correct ISO code for France', () => {
      expect(getCountryCode('France')).toBe('FR');
    });

    it('should return correct ISO code for Australia', () => {
      expect(getCountryCode('Australia')).toBe('AU');
    });

    it('should return correct ISO code for Japan', () => {
      expect(getCountryCode('Japan')).toBe('JP');
    });

    it('should return GB as default for unknown countries', () => {
      expect(getCountryCode('Unknown Country')).toBe('GB');
    });

    it('should return correct codes for all European countries', () => {
      expect(getCountryCode('Ireland')).toBe('IE');
      expect(getCountryCode('Spain')).toBe('ES');
      expect(getCountryCode('Italy')).toBe('IT');
      expect(getCountryCode('Netherlands')).toBe('NL');
      expect(getCountryCode('Belgium')).toBe('BE');
      expect(getCountryCode('Austria')).toBe('AT');
      expect(getCountryCode('Portugal')).toBe('PT');
      expect(getCountryCode('Sweden')).toBe('SE');
      expect(getCountryCode('Denmark')).toBe('DK');
      expect(getCountryCode('Finland')).toBe('FI');
      expect(getCountryCode('Norway')).toBe('NO');
      expect(getCountryCode('Switzerland')).toBe('CH');
      expect(getCountryCode('Poland')).toBe('PL');
      expect(getCountryCode('Czech Republic')).toBe('CZ');
      expect(getCountryCode('Greece')).toBe('GR');
      expect(getCountryCode('Hungary')).toBe('HU');
      expect(getCountryCode('Romania')).toBe('RO');
    });

    it('should return correct codes for rest of world', () => {
      expect(getCountryCode('Canada')).toBe('CA');
      expect(getCountryCode('New Zealand')).toBe('NZ');
      expect(getCountryCode('Singapore')).toBe('SG');
      expect(getCountryCode('Hong Kong')).toBe('HK');
      expect(getCountryCode('United Arab Emirates')).toBe('AE');
    });
  });

  describe('checkHealth', () => {
    it('should return healthy status when API responds successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          commit: 'abc123',
          build: '1.0.0',
          release: '2024.1',
          releaseDate: '2024-01-01T00:00:00Z',
        }),
      });

      const result = await checkHealth();

      expect(result.healthy).toBe(true);
      expect(result.version).toBe('2024.1');
      expect(result.error).toBeUndefined();
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.parcel.royalmail.com/api/v1/version',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-api-key-12345',
          }),
        })
      );
    });

    it('should return unhealthy status when API returns error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ message: 'Internal Server Error' }),
      });

      const result = await checkHealth();

      expect(result.healthy).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should return unhealthy status when network fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await checkHealth();

      expect(result.healthy).toBe(false);
      expect(result.error).toBe('Network error');
    });

    it('should handle rate limiting (429)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({}),
      });

      const result = await checkHealth();

      expect(result.healthy).toBe(false);
      expect(result.error).toContain('Rate limit');
    });

    it('should handle authentication failure (401)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({}),
      });

      const result = await checkHealth();

      expect(result.healthy).toBe(false);
      expect(result.error).toContain('Authentication failed');
    });
  });

  describe('createShipment', () => {
    const validShipmentRequest: CreateShipmentRequest = {
      orderReference: 'ORDER-123',
      recipient: {
        fullName: 'John Smith',
        addressLine1: '123 Main Street',
        city: 'London',
        postcode: 'SW1A 1AA',
        countryCode: 'GB',
        emailAddress: 'john@example.com',
      },
      packages: [
        {
          weightInGrams: 500,
          packageFormatIdentifier: 'parcel',
        },
      ],
    };

    it('should create shipment successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          successCount: 1,
          errorsCount: 0,
          createdOrders: [
            {
              orderIdentifier: 12345678,
              orderReference: 'ORDER-123',
            },
          ],
          failedOrders: [],
        }),
      });

      const result = await createShipment(validShipmentRequest);

      expect(result.error).toBeUndefined();
      expect(result.data).toBeDefined();
      expect(result.data?.successCount).toBe(1);
      expect(result.data?.createdOrders[0].orderIdentifier).toBe(12345678);
    });

    it('should send correct payload to API', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          successCount: 1,
          errorsCount: 0,
          createdOrders: [{ orderIdentifier: 123, orderReference: 'ORDER-123' }],
          failedOrders: [],
        }),
      });

      await createShipment(validShipmentRequest);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.parcel.royalmail.com/api/v1/orders',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-api-key-12345',
            'Content-Type': 'application/json',
          }),
        })
      );

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.items[0].orderReference).toBe('ORDER-123');
      expect(callBody.items[0].recipient.address.fullName).toBe('John Smith');
      expect(callBody.items[0].packages[0].weightInGrams).toBe(500);
    });

    it('should include customs info for international shipments', async () => {
      const internationalRequest: CreateShipmentRequest = {
        ...validShipmentRequest,
        recipient: {
          ...validShipmentRequest.recipient,
          countryCode: 'US',
        },
        orderItems: [
          {
            description: 'Custom Print',
            quantity: 1,
            value: 25.99,
            weight: 500,
            countryOfOrigin: 'GB',
          },
        ],
        customsInfo: {
          contentType: 'Sale',
          senderType: 'Business',
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          successCount: 1,
          errorsCount: 0,
          createdOrders: [{ orderIdentifier: 123, orderReference: 'ORDER-123' }],
          failedOrders: [],
        }),
      });

      await createShipment(internationalRequest);

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.items[0].customsInfo).toBeDefined();
      expect(callBody.items[0].customsInfo.contentType).toBe('Sale');
      expect(callBody.items[0].orderItems).toBeDefined();
    });

    it('should handle API error response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          message: 'Invalid postcode',
          errors: ['Postcode format is invalid'],
        }),
      });

      const result = await createShipment(validShipmentRequest);

      expect(result.error).toBeDefined();
      expect(result.error?.message).toBe('Invalid postcode');
    });

    it('should handle failed orders in response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          successCount: 0,
          errorsCount: 1,
          createdOrders: [],
          failedOrders: [
            {
              orderReference: 'ORDER-123',
              errors: ['Address validation failed'],
            },
          ],
        }),
      });

      const result = await createShipment(validShipmentRequest);

      expect(result.data?.errorsCount).toBe(1);
      expect(result.data?.failedOrders[0].errors).toContain('Address validation failed');
    });
  });

  describe('getOrders', () => {
    it('should fetch orders by identifiers', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => [
          {
            orderIdentifier: 12345,
            orderReference: 'ORDER-123',
            createdOn: '2024-01-01T00:00:00Z',
            orderDate: '2024-01-01T00:00:00Z',
            trackingNumber: 'RM123456789GB',
            packages: [],
          },
        ],
      });

      const result = await getOrders([12345]);

      expect(result.error).toBeUndefined();
      expect(result.data).toHaveLength(1);
      expect(result.data?.[0].trackingNumber).toBe('RM123456789GB');
    });

    it('should handle multiple order identifiers', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => [
          { orderIdentifier: 123, orderReference: 'ORDER-1' },
          { orderIdentifier: 456, orderReference: 'ORDER-2' },
        ],
      });

      await getOrders([123, 456]);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.parcel.royalmail.com/api/v1/orders/123;456',
        expect.anything()
      );
    });

    it('should encode string order references', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => [],
      });

      await getOrders(['ORDER-123', 'ORDER-456']);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('%22ORDER-123%22'),
        expect.anything()
      );
    });

    it('should handle not found error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ message: 'Order not found' }),
      });

      const result = await getOrders([99999]);

      expect(result.error).toBeDefined();
    });
  });

  describe('getOrderByReference', () => {
    it('should return single order', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => [
          {
            orderIdentifier: 12345,
            orderReference: 'ORDER-123',
            trackingNumber: 'RM123456789GB',
          },
        ],
      });

      const result = await getOrderByReference('ORDER-123');

      expect(result.error).toBeUndefined();
      expect(result.data?.orderReference).toBe('ORDER-123');
    });

    it('should return error when order not found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => [],
      });

      const result = await getOrderByReference('NONEXISTENT');

      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe('NOT_FOUND');
    });
  });

  describe('getLabel', () => {
    it('should return PDF buffer for label', async () => {
      const pdfBuffer = Buffer.from('%PDF-1.4 mock pdf content');

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/pdf' }),
        arrayBuffer: async () => pdfBuffer.buffer,
      });

      const result = await getLabel([12345]);

      expect(result.error).toBeUndefined();
      expect(result.data).toBeInstanceOf(Buffer);
    });

    it('should include correct query parameters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/pdf' }),
        arrayBuffer: async () => new ArrayBuffer(0),
      });

      await getLabel([12345], { includeReturnsLabel: true, includeCN: true });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('documentType=postageLabel'),
        expect.anything()
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('includeReturnsLabel=true'),
        expect.anything()
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('includeCN=true'),
        expect.anything()
      );
    });

    it('should handle error when label not ready', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ message: 'Label not yet generated' }),
      });

      const result = await getLabel([12345]);

      expect(result.error).toBeDefined();
    });
  });

  describe('deleteOrders', () => {
    it('should delete orders successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          deletedOrders: [{ orderReference: 'ORDER-123' }],
          errors: [],
        }),
      });

      const result = await deleteOrders([12345]);

      expect(result.error).toBeUndefined();
      expect(result.data?.deletedOrders).toHaveLength(1);
    });

    it('should use DELETE method', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ deletedOrders: [], errors: [] }),
      });

      await deleteOrders([12345]);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ method: 'DELETE' })
      );
    });
  });

  describe('manifestOrders', () => {
    it('should create manifest successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          manifestNumber: 1001,
          documentPdf: 'base64encodedpdf',
        }),
      });

      const result = await manifestOrders();

      expect(result.error).toBeUndefined();
      expect(result.data?.manifestNumber).toBe(1001);
    });

    it('should include carrier name if provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ manifestNumber: 1001 }),
      });

      await manifestOrders('Royal Mail OBA');

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.carrierName).toBe('Royal Mail OBA');
    });

    it('should handle no eligible orders', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ message: 'No orders eligible for manifesting' }),
      });

      const result = await manifestOrders();

      expect(result.error).toBeDefined();
    });
  });

  describe('getManifest', () => {
    it('should retrieve manifest details', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          manifestNumber: 1001,
          status: 'Completed',
          documentPdf: 'base64pdf',
        }),
      });

      const result = await getManifest(1001);

      expect(result.error).toBeUndefined();
      expect(result.data?.status).toBe('Completed');
    });
  });

  describe('listOrders', () => {
    it('should list orders with pagination', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          orders: [
            { orderIdentifier: 1, orderReference: 'ORDER-1' },
            { orderIdentifier: 2, orderReference: 'ORDER-2' },
          ],
          continuationToken: 'next-page-token',
        }),
      });

      const result = await listOrders({ pageSize: 25 });

      expect(result.error).toBeUndefined();
      expect(result.data?.orders).toHaveLength(2);
      expect(result.data?.continuationToken).toBe('next-page-token');
    });

    it('should include query parameters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ orders: [], continuationToken: null }),
      });

      await listOrders({
        pageSize: 50,
        startDateTime: '2024-01-01T00:00:00Z',
        endDateTime: '2024-01-31T23:59:59Z',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('pageSize=50'),
        expect.anything()
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('startDateTime='),
        expect.anything()
      );
    });

    it('should handle continuation token for pagination', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ orders: [], continuationToken: null }),
      });

      await listOrders({ continuationToken: 'abc123' });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('continuationToken=abc123'),
        expect.anything()
      );
    });
  });

  describe('API Key Handling', () => {
    it('should throw error when API key is not set', async () => {
      // Remove API key
      delete process.env.ROYAL_MAIL_API_KEY;

      // Need to re-import to pick up env change
      jest.resetModules();
      const { checkHealth: checkHealthNoKey } = await import('../royal-mail-service');

      await expect(checkHealthNoKey()).rejects.toThrow('ROYAL_MAIL_API_KEY environment variable is not set');
    });
  });

  describe('Error Handling', () => {
    it('should handle network timeout', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network timeout'));

      const result = await checkHealth();

      expect(result.healthy).toBe(false);
      expect(result.error).toContain('timeout');
    });

    it('should handle malformed JSON response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => {
          throw new Error('Invalid JSON');
        },
      });

      const result = await checkHealth();

      expect(result.healthy).toBe(false);
    });
  });
});
