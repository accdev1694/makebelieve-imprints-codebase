import { IRoyalMailService } from '../types/royal-mail.types';
import { RoyalMailMockService } from './royalmail-mock.service';
import { RoyalMailProductionService } from './royalmail-production.service';

/**
 * Royal Mail Service Factory
 *
 * Returns the appropriate Royal Mail service implementation based on environment:
 * - Mock service for development (USE_ROYAL_MAIL_MOCK=true or missing credentials)
 * - Production service for production (USE_ROYAL_MAIL_MOCK=false and credentials present)
 *
 * Environment variables:
 * - USE_ROYAL_MAIL_MOCK: Set to 'true' to force mock mode (default in development)
 * - ROYAL_MAIL_API_KEY: Royal Mail API key (required for production)
 * - ROYAL_MAIL_API_SECRET: Royal Mail API secret (required for production)
 * - ROYAL_MAIL_API_URL: Royal Mail API base URL (optional, defaults to production URL)
 */
export function createRoyalMailService(): IRoyalMailService {
  const useMock = process.env.USE_ROYAL_MAIL_MOCK === 'true';
  const hasCredentials =
    process.env.ROYAL_MAIL_API_KEY && process.env.ROYAL_MAIL_API_SECRET;

  // Use mock if explicitly requested or if credentials are missing
  if (useMock || !hasCredentials) {
    if (!useMock && !hasCredentials) {
      console.warn(
        'Royal Mail API credentials not found. Using mock service. Set ROYAL_MAIL_API_KEY and ROYAL_MAIL_API_SECRET to use production service.'
      );
    } else {
      console.info('Using Royal Mail mock service (development mode)');
    }
    return new RoyalMailMockService();
  }

  console.info('Using Royal Mail production service');
  return new RoyalMailProductionService();
}

/**
 * Singleton instance of the Royal Mail service
 * Use this throughout the application
 */
export const royalMailService = createRoyalMailService();
