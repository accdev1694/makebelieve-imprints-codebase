import apiClient from './client';

export interface PointsBalance {
  points: number;
  discountValue: number;
  pointsPerPound: number;
  message: string;
}

export interface PointsTransaction {
  id: string;
  amount: number;
  type: string;
  description: string;
  createdAt: string;
}

export interface PointsHistory {
  transactions: PointsTransaction[];
  currentBalance: number;
}

/**
 * Get user's current points balance
 */
export async function getUserPoints(): Promise<PointsBalance> {
  const response = await apiClient.get('/users/points');
  return response.data.data;
}

/**
 * Get user's points transaction history
 */
export async function getPointsHistory(limit: number = 20): Promise<PointsHistory> {
  const response = await apiClient.get(`/users/points/history?limit=${limit}`);
  return response.data.data;
}
