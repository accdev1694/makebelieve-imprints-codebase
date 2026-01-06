import apiClient from './client';
import {
  RegisterData as SharedRegisterData,
  LoginData as SharedLoginData,
  User as SharedUser,
} from '@mkbl/shared';

// Frontend uses userType with different values than shared (CUSTOMER vs customer)
// Extend for backward compatibility
export interface RegisterData extends SharedRegisterData {
  userType?: 'CUSTOMER' | 'PRINTER_ADMIN';
}

export type LoginData = SharedLoginData;

// User with frontend-specific userType naming
export interface User extends Omit<SharedUser, 'type'> {
  userType: 'CUSTOMER' | 'PRINTER_ADMIN';
  updatedAt: string;
}

export interface AuthResponse {
  success: boolean;
  data: {
    user: User;
  };
}

/**
 * Authentication Service
 * Handles all auth-related API calls
 */
export const authService = {
  /**
   * Register a new user
   */
  async register(data: RegisterData): Promise<User> {
    const response = await apiClient.post<AuthResponse>('/auth/register', data);
    return response.data.data.user;
  },

  /**
   * Login user
   */
  async login(data: LoginData): Promise<User> {
    const response = await apiClient.post<AuthResponse>('/auth/login', data);
    return response.data.data.user;
  },

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    await apiClient.post('/auth/logout');
  },

  /**
   * Get current user
   */
  async getMe(): Promise<User> {
    const response = await apiClient.get<{ success: boolean; data: { user: User } }>('/auth/me');
    return response.data.data.user;
  },

  /**
   * Refresh access token
   */
  async refresh(): Promise<void> {
    await apiClient.post('/auth/refresh');
  },
};
