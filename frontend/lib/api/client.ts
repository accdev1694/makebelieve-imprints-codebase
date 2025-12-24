import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';

// API base URL - will be configured via environment variable
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

// Create axios instance with default config
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000, // Reduced from 30s to 10s for faster feedback
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Important: Send cookies with requests (for httpOnly cookies)
});

// Request interceptor - Add any auth headers if needed
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // You can add custom headers here if needed
    // For now, we rely on httpOnly cookies for auth
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Token refresh state management
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: Error | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve();
    }
  });
  failedQueue = [];
};

// Response interceptor - Handle common errors
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // Handle 401 Unauthorized - try to refresh token
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      // Don't try to refresh if we're already calling the refresh endpoint
      const url = originalRequest.url || '';
      if (url.includes('auth/refresh')) {
        return Promise.reject(error);
      }

      if (isRefreshing) {
        // If already refreshing, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => {
            return apiClient(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Attempt to refresh the access token
        await apiClient.post('/auth/refresh');

        // Token refreshed successfully, process queued requests
        processQueue();
        isRefreshing = false;

        // Retry the original request
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Refresh failed - reject all queued requests
        processQueue(refreshError as Error);
        isRefreshing = false;

        // Don't redirect to login, just reject - let the component handle it
        return Promise.reject(refreshError);
      }
    }

    // Handle other errors
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const apiError = error.response.data as any; // Cast to any to check for message property
      const message =
        apiError?.message || 'An error occurred during the request. Please try again.';
      return Promise.reject({
        statusCode: error.response.status,
        message,
        error: apiError?.error || 'Error',
        data: apiError,
      });
    } else if (error.request) {
      // The request was made but no response was received
      return Promise.reject({
        statusCode: -1,
        message: 'No response from server. Check your network connection.',
        error: 'Network Error',
      });
    } else {
      // Something happened in setting up the request that triggered an Error
      return Promise.reject({
        statusCode: -1,
        message: error.message,
        error: 'Request Setup Error',
      });
    }
  }
);

export { apiClient };
export default apiClient;
