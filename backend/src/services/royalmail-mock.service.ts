import {
  IRoyalMailService,
  CreateShipmentRequest,
  CreateShipmentResponse,
  TrackingResponse,
  HealthCheckResponse,
  TrackingStatus,
  TrackingEvent,
} from '../types/royal-mail.types';

/**
 * Royal Mail Mock Service
 *
 * This is a mock implementation of the Royal Mail Click & Drop API
 * used during development to avoid API costs and allow testing
 * without real Royal Mail credentials.
 *
 * In production, switch to RoyalMailProductionService via environment variable.
 */
export class RoyalMailMockService implements IRoyalMailService {
  /**
   * Create a mock shipment
   * Returns fake tracking number and shipment details
   */
  async createShipment(request: CreateShipmentRequest): Promise<CreateShipmentResponse> {
    // Simulate API delay
    await this.delay(500);

    // Generate fake tracking number (Royal Mail format: XX 1234 5678 9GB)
    const trackingNumber = this.generateTrackingNumber();
    const shipmentId = `RM-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    // Simulate estimated delivery (3-5 business days)
    const estimatedDelivery = new Date();
    estimatedDelivery.setDate(estimatedDelivery.getDate() + Math.floor(Math.random() * 3) + 3);

    // Simulate cost calculation based on weight and service
    const baseCost = 3.5;
    const weightCost = (request.packageDetails.weight / 1000) * 0.5; // 50p per kg
    const cost = baseCost + weightCost;

    console.log(
      `[MOCK] Created shipment for order ${request.orderId}: ${trackingNumber}`
    );

    return {
      success: true,
      trackingNumber,
      labelUrl: `https://mock-labels.example.com/${shipmentId}.pdf`,
      shipmentId,
      estimatedDelivery: estimatedDelivery.toISOString(),
      cost: parseFloat(cost.toFixed(2)),
      currency: 'GBP',
    };
  }

  /**
   * Get mock tracking information
   */
  async getTrackingStatus(trackingNumber: string): Promise<TrackingResponse> {
    // Simulate API delay
    await this.delay(300);

    // Generate mock tracking events
    const events = this.generateMockEvents();
    const currentStatus = events[events.length - 1]?.status || TrackingStatus.IN_TRANSIT;

    console.log(`[MOCK] Fetched tracking for ${trackingNumber}: ${currentStatus}`);

    return {
      success: true,
      trackingNumber,
      currentStatus,
      events,
      estimatedDelivery: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    };
  }

  /**
   * Health check for the mock service
   */
  async healthCheck(): Promise<HealthCheckResponse> {
    await this.delay(100);

    return {
      success: true,
      status: 'healthy',
      responseTime: 100,
      message: 'Mock Royal Mail service is operational (development mode)',
      lastChecked: new Date().toISOString(),
    };
  }

  /**
   * Generate a fake Royal Mail tracking number
   * Format: XX 1234 5678 9GB
   */
  private generateTrackingNumber(): string {
    const prefix = ['GB', 'RN', 'RG', 'RB'][Math.floor(Math.random() * 4)];
    const numbers = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10)).join('');
    const suffix = 'GB';

    return `${prefix} ${numbers.slice(0, 4)} ${numbers.slice(4, 8)} ${numbers.slice(8)}${suffix}`;
  }

  /**
   * Generate mock tracking events showing shipment progression
   */
  private generateMockEvents(): TrackingEvent[] {
    const now = new Date();

    return [
      {
        timestamp: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        status: TrackingStatus.CREATED,
        location: 'Online',
        description: 'Shipment created',
      },
      {
        timestamp: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        status: TrackingStatus.COLLECTED,
        location: 'London Mail Centre',
        description: 'Item collected and received at mail centre',
      },
      {
        timestamp: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        status: TrackingStatus.IN_TRANSIT,
        location: 'Birmingham Sorting Office',
        description: 'Item in transit to delivery office',
      },
      {
        timestamp: new Date(now.getTime() - 12 * 60 * 60 * 1000).toISOString(),
        status: TrackingStatus.OUT_FOR_DELIVERY,
        location: 'Local Delivery Office',
        description: 'Out for delivery',
      },
    ];
  }

  /**
   * Simulate network delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
