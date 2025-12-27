import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';

// API base URL configuration
// - Web (SSR): Uses relative '/api' path (same origin)
// - Mobile (Capacitor): Uses full URL from NEXT_PUBLIC_API_URL env var
const getApiBaseUrl = (): string => {
  // Check if running in Capacitor (mobile app)
  const isCapacitor = typeof window !== 'undefined' &&
    // @ts-expect-error - Capacitor adds this to window
    (window.Capacitor?.isNativePlatform?.() || window.Capacitor?.isNative);

  if (isCapacitor) {
    // Mobile app must use full URL to reach the API server
    return process.env.NEXT_PUBLIC_API_URL || 'https://mkbl.vercel.app/api';
  }

  // Web app uses relative path (same origin)
  return process.env.NEXT_PUBLIC_API_URL || '/api';
};

const API_BASE_URL = getApiBaseUrl();

// Retry configuration
const MAX_RETRIES = 2;
const RETRY_DELAY_BASE = 1000; // 1 second base delay

// Check if error is retryable (transient errors)
const isRetryableError = (error: AxiosError): boolean => {
  // Retry on network errors (no response)
  if (!error.response) {
    return true;
  }

  // Retry on timeout
  if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
    return true;
  }

  // Retry on server errors that might be transient
  const status = error.response.status;
  return status === 503 || status === 504 || status === 502 || status === 429;
};

// Delay helper with exponential backoff
const delay = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

// Create axios instance with default config
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000, // Increased to 15s for Neon cold starts
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Important: Send cookies with requests (for httpOnly cookies)
});

// Request interceptor - Add retry count tracking
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Initialize retry count if not set
    if (config.headers && config.headers['x-retry-count'] === undefined) {
      config.headers['x-retry-count'] = '0';
    }
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

// Response interceptor - Handle common errors with retry logic
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // Get current retry count
    const retryCount = parseInt(originalRequest?.headers?.['x-retry-count'] as string || '0', 10);

    // Check if we should retry (for transient errors)
    if (originalRequest && isRetryableError(error) && retryCount < MAX_RETRIES) {
      // Exponential backoff: 1s, 2s
      const delayMs = RETRY_DELAY_BASE * Math.pow(2, retryCount);

      // Increment retry count
      if (originalRequest.headers) {
        originalRequest.headers['x-retry-count'] = String(retryCount + 1);
      }

      // Wait before retrying
      await delay(delayMs);

      // Retry the request
      return apiClient(originalRequest);
    }

    // Handle 401 Unauthorized - try to refresh token
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      // Don't try to refresh if we're calling auth endpoints (login, register, refresh)
      const url = originalRequest.url || '';
      if (url.includes('auth/refresh') || url.includes('auth/login') || url.includes('auth/register')) {
        // Format the error properly for auth endpoints
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const apiError = error.response.data as any;
        const message = apiError?.message || 'Invalid email or password. Please try again.';
        return Promise.reject({
          statusCode: 401,
          message,
          code: apiError?.code, // Include error code for distinct error handling
          error: apiError?.error || 'Authentication Failed',
          data: apiError,
        });
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
