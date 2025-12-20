import apiClient from './client';

export interface RegisterData {
  email: string;
  password: string;
  name: string;
  userType?: 'CUSTOMER' | 'PRINTER_ADMIN';
}

export interface LoginData {
  email: string;
  password: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  userType: 'CUSTOMER' | 'PRINTER_ADMIN';
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  user: User;
}

/**
 * Authentication Service
 * Handles all auth-related API calls
 */
export const authService = {
  /**
   * Register a new user
   */
  async register(data: RegisterData): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/register', data);
    return response.data;
  },

  /**
   * Login user
   */
  async login(data: LoginData): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/login', data);
    return response.data;
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
    const response = await apiClient.get<{ user: User }>('/auth/me');
    return response.data.user;
  },

  /**
   * Refresh access token
   */
  async refresh(): Promise<void> {
    await apiClient.post('/auth/refresh');
  },
};
