import apiClient from './client';

export interface TrackingEvent {
  timestamp: string;
  location: string;
  status: string;
  description: string;
}

export interface TrackingInfo {
  trackingNumber: string;
  status: string;
  estimatedDelivery?: string;
  events: TrackingEvent[];
  currentLocation?: string;
}

export interface TrackingResponse {
  success: boolean;
  trackingNumber: string;
  status: string;
  estimatedDelivery?: string;
  events?: TrackingEvent[];
  currentLocation?: string;
  lastUpdated?: string;
}

/**
 * Shipping Service
 * Handles all shipping and tracking related API calls
 */
export const shippingService = {
  /**
   * Get tracking status for a shipment
   */
  async getTrackingStatus(trackingNumber: string): Promise<TrackingResponse> {
    const response = await apiClient.get<{ success: boolean; data: TrackingResponse }>(
      `/shipping/tracking/${trackingNumber}`
    );
    return response.data.data;
  },

  /**
   * Check Royal Mail API health
   */
  async healthCheck(): Promise<{ status: string; message: string; responseTime?: number }> {
    const response = await apiClient.get<{
      success: boolean;
      data: { status: string; message: string; responseTime?: number };
    }>('/shipping/health');
    return response.data.data;
  },
};

/**
 * Tracking status labels for UI display
 */
export const TRACKING_STATUS_LABELS: Record<string, string> = {
  created: 'Label Created',
  collected: 'Collected',
  in_transit: 'In Transit',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  failed_delivery: 'Delivery Failed',
  returned: 'Returned to Sender',
};

/**
 * Get status color for UI
 */
export const getTrackingStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    created: 'bg-gray-500/10 text-gray-500 border-gray-500/50',
    collected: 'bg-blue-500/10 text-blue-500 border-blue-500/50',
    in_transit: 'bg-purple-500/10 text-purple-500 border-purple-500/50',
    out_for_delivery: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/50',
    delivered: 'bg-green-500/10 text-green-500 border-green-500/50',
    failed_delivery: 'bg-red-500/10 text-red-500 border-red-500/50',
    returned: 'bg-orange-500/10 text-orange-500 border-orange-500/50',
  };
  return colors[status] || 'bg-gray-500/10 text-gray-500 border-gray-500/50';
};
