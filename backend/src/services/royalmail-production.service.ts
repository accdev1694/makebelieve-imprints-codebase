import axios, { AxiosInstance, AxiosError } from 'axios';
import {
  IRoyalMailService,
  CreateShipmentRequest,
  CreateShipmentResponse,
  TrackingResponse,
  HealthCheckResponse,
  RetryConfig,
  DEFAULT_RETRY_CONFIG,
  TrackingStatus,
} from '../types/royal-mail.types';

/**
 * Production Royal Mail Click and Drop API Service
 * Implements retry logic with exponential backoff
 */
export class RoyalMailProductionService implements IRoyalMailService {
  private client: AxiosInstance;
  private retryConfig: RetryConfig;
  private apiKey: string;
  private apiSecret: string;
  private baseUrl: string;

  constructor(retryConfig: RetryConfig = DEFAULT_RETRY_CONFIG) {
    this.apiKey = process.env.ROYAL_MAIL_API_KEY || '';
    this.apiSecret = process.env.ROYAL_MAIL_API_SECRET || '';
    this.baseUrl = process.env.ROYAL_MAIL_API_URL || 'https://api.royalmail.net/shipping/v3';
    this.retryConfig = retryConfig;

    // Initialize axios client with authentication
    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Content-Type': 'application/json',
        'X-IBM-Client-Id': this.apiKey,
        'X-IBM-Client-Secret': this.apiSecret,
      },
      timeout: 30000, // 30 second timeout
    });

    // Validate configuration
    if (!this.apiKey || !this.apiSecret) {
      console.warn(
        'Royal Mail API credentials not configured. Set ROYAL_MAIL_API_KEY and ROYAL_MAIL_API_SECRET environment variables.'
      );
    }
  }

  /**
   * Execute a function with retry logic and exponential backoff
   */
  private async withRetry<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    let lastError: Error | undefined;
    let delay = this.retryConfig.initialDelayMs;

    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        const isAxiosError = axios.isAxiosError(error);
        const statusCode = isAxiosError ? (error as AxiosError).response?.status : undefined;

        // Don't retry on client errors (4xx), only on server errors (5xx) and network errors
        if (statusCode && statusCode >= 400 && statusCode < 500) {
          console.error(
            `${operationName} failed with client error ${statusCode}, not retrying`,
            { error: this.formatError(error) }
          );
          throw error;
        }

        if (attempt < this.retryConfig.maxRetries) {
          console.warn(
            `${operationName} failed (attempt ${attempt + 1}/${this.retryConfig.maxRetries + 1}), retrying in ${delay}ms`,
            { error: this.formatError(error) }
          );

          await this.sleep(delay);

          // Exponential backoff with max delay cap
          delay = Math.min(
            delay * this.retryConfig.backoffMultiplier,
            this.retryConfig.maxDelayMs
          );
        }
      }
    }

    console.error(
      `${operationName} failed after ${this.retryConfig.maxRetries + 1} attempts`,
      { error: this.formatError(lastError) }
    );
    throw lastError;
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Format error for logging
   */
  private formatError(error: unknown): Record<string, unknown> {
    if (axios.isAxiosError(error)) {
      return {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
      };
    }
    return {
      message: error instanceof Error ? error.message : String(error),
    };
  }

  /**
   * Create a shipment with Royal Mail
   */
  async createShipment(request: CreateShipmentRequest): Promise<CreateShipmentResponse> {
    return this.withRetry(async () => {
      try {
        const payload = {
          orderReference: request.orderId,
          recipient: {
            name: request.recipientAddress.name,
            addressLine1: request.recipientAddress.addressLine1,
            addressLine2: request.recipientAddress.addressLine2,
            city: request.recipientAddress.city,
            postcode: request.recipientAddress.postcode,
            countryCode: request.recipientAddress.country,
            phoneNumber: request.recipientAddress.phoneNumber,
            emailAddress: request.recipientAddress.email,
          },
          sender: {
            name: request.senderAddress.name,
            addressLine1: request.senderAddress.addressLine1,
            addressLine2: request.senderAddress.addressLine2,
            city: request.senderAddress.city,
            postcode: request.senderAddress.postcode,
            countryCode: request.senderAddress.country,
          },
          packages: [
            {
              weight: request.packageDetails.weight,
              dimensions: {
                length: request.packageDetails.length,
                width: request.packageDetails.width,
                height: request.packageDetails.height,
              },
              contents: request.packageDetails.description,
              value: request.packageDetails.value,
            },
          ],
          serviceCode: request.serviceCode || 'CRL24', // Default to Royal Mail 24
          safePlace: request.safePlace,
          signature: request.requiresSignature,
        };

        const response = await this.client.post('/shipments', payload);

        return {
          success: true,
          trackingNumber: response.data.trackingNumber,
          labelUrl: response.data.labelUrl,
          shipmentId: response.data.shipmentId,
          estimatedDelivery: response.data.estimatedDelivery,
          cost: response.data.cost,
          currency: response.data.currency || 'GBP',
        };
      } catch (error) {
        if (axios.isAxiosError(error)) {
          return {
            success: false,
            trackingNumber: '',
            shipmentId: '',
            errors: [
              error.response?.data?.message || error.message || 'Failed to create shipment',
            ],
          };
        }
        throw error;
      }
    }, 'createShipment');
  }

  /**
   * Get tracking status for a shipment
   */
  async getTrackingStatus(trackingNumber: string): Promise<TrackingResponse> {
    return this.withRetry(async () => {
      try {
        const response = await this.client.get(`/tracking/${trackingNumber}`);

        return {
          success: true,
          trackingNumber,
          currentStatus: this.mapTrackingStatus(response.data.status),
          events: response.data.events.map((event: any) => ({
            timestamp: event.timestamp,
            status: this.mapTrackingStatus(event.status),
            location: event.location,
            description: event.description,
          })),
          estimatedDelivery: response.data.estimatedDelivery,
          signedBy: response.data.signedBy,
        };
      } catch (error) {
        if (axios.isAxiosError(error)) {
          return {
            success: false,
            trackingNumber,
            currentStatus: TrackingStatus.EXCEPTION,
            events: [],
            errors: [
              error.response?.data?.message || error.message || 'Failed to get tracking status',
            ],
          };
        }
        throw error;
      }
    }, 'getTrackingStatus');
  }

  /**
   * Map Royal Mail status codes to our internal status enum
   */
  private mapTrackingStatus(status: string): TrackingStatus {
    const statusMap: Record<string, TrackingStatus> = {
      CREATED: TrackingStatus.CREATED,
      COLLECTED: TrackingStatus.COLLECTED,
      'IN TRANSIT': TrackingStatus.IN_TRANSIT,
      'OUT FOR DELIVERY': TrackingStatus.OUT_FOR_DELIVERY,
      DELIVERED: TrackingStatus.DELIVERED,
      'FAILED DELIVERY': TrackingStatus.FAILED_DELIVERY,
      RETURNED: TrackingStatus.RETURNED,
    };

    return statusMap[status] || TrackingStatus.EXCEPTION;
  }

  /**
   * Check Royal Mail API health
   */
  async healthCheck(): Promise<HealthCheckResponse> {
    const startTime = Date.now();

    try {
      // Use a lightweight endpoint for health check
      await this.client.get('/health', { timeout: 5000 });

      const responseTime = Date.now() - startTime;

      return {
        success: true,
        status: responseTime < 2000 ? 'healthy' : 'degraded',
        responseTime,
        lastChecked: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        status: 'down',
        responseTime: Date.now() - startTime,
        message: error instanceof Error ? error.message : 'Health check failed',
        lastChecked: new Date().toISOString(),
      };
    }
  }
}
