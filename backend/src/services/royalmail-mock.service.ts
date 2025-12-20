/**
 * Royal Mail Mock Service
 *
 * This is a mock implementation of the Royal Mail Click & Drop API
 * used during development to avoid API costs and allow testing
 * without real Royal Mail credentials.
 *
 * In production, replace this with the real Royal Mail service.
 */

interface ShipmentRequest {
  orderId: string;
  recipientName: string;
  recipientAddress: {
    line1: string;
    line2?: string;
    city: string;
    postcode: string;
    country: string;
  };
  weight: number; // in grams
  serviceCode?: string;
}

interface ShipmentResponse {
  success: boolean;
  trackingNumber: string;
  royalmailOrderId: string;
  carrier: string;
  estimatedDelivery?: string;
  labelUrl?: string;
}

interface TrackingResponse {
  trackingNumber: string;
  status: 'pending' | 'in_transit' | 'delivered' | 'failed';
  events: Array<{
    timestamp: string;
    location: string;
    description: string;
  }>;
  estimatedDelivery?: string;
}

export class RoyalMailMockService {
  /**
   * Create a mock shipment
   * Returns fake tracking number and Royal Mail order ID
   */
  async createShipment(request: ShipmentRequest): Promise<ShipmentResponse> {
    // Simulate API delay
    await this.delay(500);

    // Generate fake tracking number (Royal Mail format: XX 1234 5678 9GB)
    const trackingNumber = this.generateTrackingNumber();
    const royalmailOrderId = `RM-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    // Simulate estimated delivery (3-5 business days)
    const estimatedDelivery = new Date();
    estimatedDelivery.setDate(estimatedDelivery.getDate() + Math.floor(Math.random() * 3) + 3);

    return {
      success: true,
      trackingNumber,
      royalmailOrderId,
      carrier: 'Royal Mail',
      estimatedDelivery: estimatedDelivery.toISOString(),
      labelUrl: `https://mock-labels.example.com/${royalmailOrderId}.pdf`,
    };
  }

  /**
   * Get mock tracking information
   */
  async getTracking(trackingNumber: string): Promise<TrackingResponse> {
    // Simulate API delay
    await this.delay(300);

    // Generate mock tracking events
    const events = this.generateMockEvents();

    return {
      trackingNumber,
      status: 'in_transit',
      events,
      estimatedDelivery: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    };
  }

  /**
   * Health check for the mock service
   */
  async healthCheck(): Promise<{ status: 'ok' | 'error'; message: string }> {
    return {
      status: 'ok',
      message: 'Mock Royal Mail service is operational (development mode)',
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
   * Generate mock tracking events
   */
  private generateMockEvents() {
    const now = new Date();
    const events = [
      {
        timestamp: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        location: 'London Mail Centre',
        description: 'Item received at mail centre',
      },
      {
        timestamp: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        location: 'Birmingham Sorting Office',
        description: 'Item in transit',
      },
      {
        timestamp: new Date(now.getTime() - 12 * 60 * 60 * 1000).toISOString(),
        location: 'Local Delivery Office',
        description: 'Out for delivery',
      },
    ];

    return events;
  }

  /**
   * Simulate network delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const royalMailService = new RoyalMailMockService();
