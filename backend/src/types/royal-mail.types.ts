/**
 * Royal Mail Click and Drop API Types
 * https://www.royalmail.com/business/services/sending/international-delivery/click-and-drop
 */

export interface ShippingAddress {
  name: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  postcode: string;
  country: string;
  phoneNumber?: string;
  email?: string;
}

export interface PackageDetails {
  weight: number; // in grams
  length: number; // in cm
  width: number; // in cm
  height: number; // in cm
  value: number; // in GBP
  description: string;
  contents?: string;
}

export interface CreateShipmentRequest {
  orderId: string;
  recipientAddress: ShippingAddress;
  senderAddress: ShippingAddress;
  packageDetails: PackageDetails;
  serviceCode?: string; // e.g., "CRL24", "TPL24", "TPS24"
  safePlace?: string;
  requiresSignature?: boolean;
}

export interface CreateShipmentResponse {
  success: boolean;
  trackingNumber: string;
  labelUrl?: string;
  shipmentId: string;
  estimatedDelivery?: string;
  cost?: number;
  currency?: string;
  errors?: string[];
}

export enum TrackingStatus {
  CREATED = 'CREATED',
  COLLECTED = 'COLLECTED',
  IN_TRANSIT = 'IN_TRANSIT',
  OUT_FOR_DELIVERY = 'OUT_FOR_DELIVERY',
  DELIVERED = 'DELIVERED',
  FAILED_DELIVERY = 'FAILED_DELIVERY',
  RETURNED = 'RETURNED',
  EXCEPTION = 'EXCEPTION',
}

export interface TrackingEvent {
  timestamp: string;
  status: TrackingStatus;
  location?: string;
  description: string;
}

export interface TrackingResponse {
  success: boolean;
  trackingNumber: string;
  currentStatus: TrackingStatus;
  events: TrackingEvent[];
  estimatedDelivery?: string;
  signedBy?: string;
  errors?: string[];
}

export interface HealthCheckResponse {
  success: boolean;
  status: 'healthy' | 'degraded' | 'down';
  responseTime?: number;
  message?: string;
  lastChecked: string;
}

/**
 * Royal Mail Service Interface
 * Defines the contract for both mock and production implementations
 */
export interface IRoyalMailService {
  /**
   * Create a shipment and get tracking number
   * @param request - Shipment creation request
   * @returns Promise with shipment details including tracking number
   */
  createShipment(request: CreateShipmentRequest): Promise<CreateShipmentResponse>;

  /**
   * Get tracking status for a shipment
   * @param trackingNumber - The tracking number to check
   * @returns Promise with tracking details and history
   */
  getTrackingStatus(trackingNumber: string): Promise<TrackingResponse>;

  /**
   * Check if the Royal Mail API is accessible
   * @returns Promise with health status
   */
  healthCheck(): Promise<HealthCheckResponse>;
}

/**
 * Retry configuration for API calls
 */
export interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
};
