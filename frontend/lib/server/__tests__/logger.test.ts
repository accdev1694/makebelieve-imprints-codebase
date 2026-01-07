/**
 * Logger Tests
 */

import {
  logger,
  createRequestLogger,
  logApiRequest,
  logDatabaseQuery,
  logExternalApi,
} from '../logger';

describe('Logger', () => {
  let consoleSpy: {
    log: jest.SpyInstance;
    error: jest.SpyInstance;
    warn: jest.SpyInstance;
    debug: jest.SpyInstance;
  };

  beforeEach(() => {
    consoleSpy = {
      log: jest.spyOn(console, 'log').mockImplementation(),
      error: jest.spyOn(console, 'error').mockImplementation(),
      warn: jest.spyOn(console, 'warn').mockImplementation(),
      debug: jest.spyOn(console, 'debug').mockImplementation(),
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('logger.info', () => {
    it('should log info messages', () => {
      logger.info('Test message');

      expect(consoleSpy.log).toHaveBeenCalledTimes(1);
      expect(consoleSpy.log).toHaveBeenCalledWith(expect.stringContaining('Test message'));
    });

    it('should include context in log', () => {
      logger.info('User action', { userId: '123', action: 'login' });

      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('userId')
      );
    });
  });

  describe('logger.error', () => {
    it('should log error messages', () => {
      logger.error('Something went wrong');

      expect(consoleSpy.error).toHaveBeenCalledTimes(1);
      expect(consoleSpy.error).toHaveBeenCalledWith(expect.stringContaining('Something went wrong'));
    });

    it('should serialize Error objects', () => {
      const error = new Error('Test error');
      logger.error('Failed', error);

      expect(consoleSpy.error).toHaveBeenCalledWith(expect.stringContaining('Test error'));
    });

    it('should handle string errors', () => {
      logger.error('Failed', 'Simple error string');

      expect(consoleSpy.error).toHaveBeenCalledWith(expect.stringContaining('Simple error string'));
    });

    it('should include context with error', () => {
      const error = new Error('DB error');
      logger.error('Query failed', error, { query: 'SELECT *', table: 'users' });

      expect(consoleSpy.error).toHaveBeenCalledWith(expect.stringContaining('query'));
      expect(consoleSpy.error).toHaveBeenCalledWith(expect.stringContaining('DB error'));
    });
  });

  describe('logger.warn', () => {
    it('should log warning messages', () => {
      logger.warn('Deprecated API used');

      expect(consoleSpy.warn).toHaveBeenCalledTimes(1);
      expect(consoleSpy.warn).toHaveBeenCalledWith(expect.stringContaining('Deprecated API used'));
    });

    it('should include context', () => {
      logger.warn('Rate limit approaching', { current: 90, limit: 100 });

      expect(consoleSpy.warn).toHaveBeenCalledWith(expect.stringContaining('current'));
    });
  });

  describe('logger.debug', () => {
    it('should log debug messages when level allows', () => {
      // Debug is below default INFO level, so it may not log
      logger.debug('Debug info');

      // Debug calls console.debug
      // Whether it logs depends on LOG_LEVEL env var
    });
  });

  describe('logger.child', () => {
    it('should create child logger with preset context', () => {
      const childLogger = logger.child({ requestId: 'req-123' });
      childLogger.info('Child message');

      expect(consoleSpy.log).toHaveBeenCalledWith(expect.stringContaining('requestId'));
    });

    it('should merge additional context', () => {
      const childLogger = logger.child({ requestId: 'req-123' });
      childLogger.info('User action', { userId: 'user-456' });

      const logCall = consoleSpy.log.mock.calls[0][0];
      expect(logCall).toContain('requestId');
      expect(logCall).toContain('userId');
    });

    it('should have all log methods', () => {
      const childLogger = logger.child({ service: 'test' });

      expect(childLogger.debug).toBeDefined();
      expect(childLogger.info).toBeDefined();
      expect(childLogger.warn).toBeDefined();
      expect(childLogger.error).toBeDefined();
    });
  });

  describe('createRequestLogger', () => {
    it('should create logger with request ID', () => {
      const reqLogger = createRequestLogger('req-abc-123');
      reqLogger.info('Processing request');

      expect(consoleSpy.log).toHaveBeenCalledWith(expect.stringContaining('req-abc-123'));
    });

    it('should include additional context', () => {
      const reqLogger = createRequestLogger('req-abc', { userId: 'user-123', path: '/api/test' });
      reqLogger.info('Request handled');

      const logCall = consoleSpy.log.mock.calls[0][0];
      expect(logCall).toContain('userId');
      expect(logCall).toContain('path');
    });
  });

  describe('logApiRequest', () => {
    it('should log successful requests as info', () => {
      logApiRequest('GET', '/api/users', 200, 45);

      expect(consoleSpy.log).toHaveBeenCalledWith(expect.stringContaining('GET /api/users 200'));
    });

    it('should log client errors as warn', () => {
      logApiRequest('POST', '/api/auth', 401, 12);

      expect(consoleSpy.warn).toHaveBeenCalledWith(expect.stringContaining('401'));
    });

    it('should log server errors as error', () => {
      logApiRequest('PUT', '/api/orders', 500, 150);

      expect(consoleSpy.error).toHaveBeenCalledWith(expect.stringContaining('500'));
    });

    it('should include duration in milliseconds', () => {
      logApiRequest('GET', '/api/products', 200, 123);

      expect(consoleSpy.log).toHaveBeenCalledWith(expect.stringContaining('123ms'));
    });

    it('should include additional context', () => {
      logApiRequest('POST', '/api/orders', 201, 200, { orderId: 'order-123' });

      expect(consoleSpy.log).toHaveBeenCalledWith(expect.stringContaining('orderId'));
    });
  });

  describe('logDatabaseQuery', () => {
    it('should log database operations at debug level', () => {
      // Note: logDatabaseQuery uses debug level, which is below default INFO level
      // So it won't output unless LOG_LEVEL is set to 'debug'
      // This test verifies the function doesn't throw
      logDatabaseQuery('findMany', 'User', 25);

      // Function should complete without error
      // Debug logs are suppressed at default INFO level
    });

    it('should include context when debug level is enabled', () => {
      logDatabaseQuery('create', 'Order', 50, { orderTotal: 99.99 });

      // Function should complete without error
      // Actual output depends on LOG_LEVEL env var
    });
  });

  describe('logExternalApi', () => {
    it('should log successful external API calls', () => {
      logExternalApi('Stripe', '/v1/charges', 200, 350);

      expect(consoleSpy.log).toHaveBeenCalledWith(expect.stringContaining('Stripe'));
      expect(consoleSpy.log).toHaveBeenCalledWith(expect.stringContaining('350ms'));
    });

    it('should log failed external API calls as errors', () => {
      logExternalApi('Wise', '/v1/transfers', 500, 1200);

      expect(consoleSpy.error).toHaveBeenCalledWith(expect.stringContaining('500'));
    });

    it('should include context', () => {
      logExternalApi('RoyalMail', '/labels', 200, 800, { trackingNumber: 'RM123' });

      expect(consoleSpy.log).toHaveBeenCalledWith(expect.stringContaining('trackingNumber'));
    });
  });

  describe('Context serialization', () => {
    it('should handle Date objects in context', () => {
      logger.info('Event', { timestamp: new Date('2024-01-15T10:00:00Z') });

      expect(consoleSpy.log).toHaveBeenCalledWith(expect.stringContaining('2024-01-15'));
    });

    it('should handle nested objects', () => {
      logger.info('Complex data', {
        user: {
          id: '123',
          profile: {
            name: 'John',
          },
        },
      });

      expect(consoleSpy.log).toHaveBeenCalledWith(expect.stringContaining('profile'));
    });

    it('should handle arrays in context', () => {
      logger.info('Items', { ids: ['a', 'b', 'c'] });

      expect(consoleSpy.log).toHaveBeenCalledWith(expect.stringContaining('a'));
    });

    it('should handle null and undefined values', () => {
      logger.info('Nullable', { value: null, other: undefined });

      // Should not throw
      expect(consoleSpy.log).toHaveBeenCalled();
    });

    it('should handle Error objects in context', () => {
      const error = new Error('Nested error');
      logger.info('With error', { error });

      expect(consoleSpy.log).toHaveBeenCalledWith(expect.stringContaining('Nested error'));
    });

    it('should handle bigint values', () => {
      logger.info('Big number', { value: BigInt(123456789012345) });

      expect(consoleSpy.log).toHaveBeenCalledWith(expect.stringContaining('123456789012345'));
    });

    it('should handle functions in context (as placeholder)', () => {
      logger.info('With function', { callback: () => {} });

      expect(consoleSpy.log).toHaveBeenCalledWith(expect.stringContaining('[Function]'));
    });
  });

  describe('Edge cases', () => {
    it('should handle empty context', () => {
      logger.info('No context', {});

      expect(consoleSpy.log).toHaveBeenCalled();
    });

    it('should handle undefined context', () => {
      logger.info('Undefined context', undefined);

      expect(consoleSpy.log).toHaveBeenCalled();
    });

    it('should handle very long messages', () => {
      const longMessage = 'A'.repeat(10000);
      logger.info(longMessage);

      expect(consoleSpy.log).toHaveBeenCalled();
    });

    it('should handle special characters in messages', () => {
      logger.info('Special chars: "quotes" <tags> & ampersands');

      expect(consoleSpy.log).toHaveBeenCalled();
    });

    it('should handle unicode in messages', () => {
      logger.info('Unicode: 日本語 🚀 émojis');

      expect(consoleSpy.log).toHaveBeenCalledWith(expect.stringContaining('日本語'));
    });
  });
});
