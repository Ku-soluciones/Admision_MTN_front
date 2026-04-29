/**
 * HTTP Client Service
 * Configured for MTN Microservices Architecture
 *
 * Features:
 * - Automatic retry with exponential backoff (3 attempts)
 * - 10 second timeout per request
 * - Request/response interceptors
 * - Metrics tracking (requests, errors, response times)
 * - Retry on network errors and 5xx server errors
 */

import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';
import axiosRetry from 'axios-retry';
import { getApiBaseUrl } from '../../config/api.config';
import { auth } from '../lib/firebase';

class HttpClient {
  private axiosInstance: AxiosInstance;
  private metrics = {
    requestCount: 0,
    errorCount: 0,
    lastRequestTime: null as Date | null,
    responseTime: [] as number[]
  };

  constructor() {
    // CRITICAL: Do NOT set baseURL here - it must be set at runtime
    // Setting it here causes it to be evaluated at build time
    this.axiosInstance = axios.create({
      // NO baseURL - will be set in request interceptor at runtime
      // Timeout set to 10s for better UX - prevents long waits on slow connections
      timeout: parseInt(import.meta.env.VITE_API_TIMEOUT) || 10000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    // Configure retry logic with exponential backoff
    axiosRetry(this.axiosInstance, {
      retries: 3, // Maximum 3 retry attempts
      retryDelay: (retryCount) => {
        // Exponential backoff with jitter: 1s, 2s, 4s (±25%)
        const baseDelay = Math.pow(2, retryCount - 1) * 1000;
        const jitter = 0.75 + Math.random() * 0.5; // 0.75 to 1.25
        const delay = Math.floor(baseDelay * jitter);
        console.log(`[Retry] Attempt ${retryCount} - waiting ${delay}ms`);
        return delay;
      },
      retryCondition: (error) => {
        // CRITICAL FIX: Only retry idempotent methods (GET, HEAD, OPTIONS)
        const method = error.config?.method?.toUpperCase();
        const isIdempotent = ['GET', 'HEAD', 'OPTIONS'].includes(method || '');

        // Don't retry if circuit breaker is open
        const isCBOpen = error.response?.data?.error?.includes('circuit breaker') ||
                         error.response?.data?.code === 'CIRCUIT_BREAKER_OPEN';

        if (isCBOpen) {
          console.error('[Retry] Circuit breaker OPEN - aborting retries');
          return false;
        }

        // Only retry idempotent requests with network errors or 5xx (excluding CB open)
        const isRetryable = isIdempotent && (
          axiosRetry.isNetworkError(error) ||
          (error.response && error.response.status >= 500 && error.response.status < 600)
        );

        if (isRetryable) {
          console.warn(`[Retry] Retrying ${method} request due to: ${error.message}`);
        } else if (!isIdempotent && error.response?.status >= 500) {
          console.warn(`[Retry] NOT retrying ${method} (non-idempotent method)`);
        }

        return isRetryable;
      },
      shouldResetTimeout: true, // Reset timeout on each retry
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor
    this.axiosInstance.interceptors.request.use(
      async (config) => {
        const runtimeBaseURL = getApiBaseUrl();

        if (this.metrics.requestCount === 0) {
          console.log('http.ts - Runtime baseURL:', runtimeBaseURL);
        }

        config.baseURL = runtimeBaseURL;

        // Get fresh Firebase idToken (auto-refreshed by Firebase SDK)
        const currentUser = auth.currentUser;
        if (currentUser) {
          try {
            const idToken = await currentUser.getIdToken();
            config.headers.Authorization = `Bearer ${idToken}`;
          } catch {
            // Fallback to localStorage if getIdToken fails
            const token = localStorage.getItem('auth_token');
            if (token) {
              config.headers.Authorization = `Bearer ${token}`;
            }
          }
        } else {
          // Fallback to localStorage (legacy JWT or initial load)
          const token = localStorage.getItem('auth_token') || localStorage.getItem('professor_token');
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
          }
        }

        this.metrics.requestCount++;
        this.metrics.lastRequestTime = new Date();
        (config as any).startTime = Date.now();

        return config;
      },
      (error) => {
        this.metrics.errorCount++;
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.axiosInstance.interceptors.response.use(
      (response: AxiosResponse) => {
        const startTime = (response.config as any).startTime;
        if (startTime) {
          const responseTime = Date.now() - startTime;
          this.metrics.responseTime.push(responseTime);
          // Response logging removed for security
        }
        return response;
      },
      (error: AxiosError) => {
        this.metrics.errorCount++;
        const startTime = (error.config as any)?.startTime;
        if (startTime) {
          const responseTime = Date.now() - startTime;
          this.metrics.responseTime.push(responseTime);
          // Error logging removed for security
        }
        return Promise.reject(error);
      }
    );
  }

  // HTTP Methods
  async get<T = any>(url: string, config?: any): Promise<AxiosResponse<T>> {
    return this.axiosInstance.get(url, config);
  }

  async post<T = any>(url: string, data?: any, config?: any): Promise<AxiosResponse<T>> {
    return this.axiosInstance.post(url, data, config);
  }

  async put<T = any>(url: string, data?: any, config?: any): Promise<AxiosResponse<T>> {
    return this.axiosInstance.put(url, data, config);
  }

  async delete<T = any>(url: string, config?: any): Promise<AxiosResponse<T>> {
    return this.axiosInstance.delete(url, config);
  }

  async patch<T = any>(url: string, data?: any, config?: any): Promise<AxiosResponse<T>> {
    return this.axiosInstance.patch(url, data, config);
  }

  // Configuration methods
  setBaseURL(baseURL: string) {
    this.axiosInstance.defaults.baseURL = baseURL;
  }

  setTimeout(timeout: number) {
    this.axiosInstance.defaults.timeout = timeout;
  }

  setRetryConfig(config: { attempts?: number; delay?: number; jitter?: boolean }) {
    // Update retry configuration dynamically
    axiosRetry(this.axiosInstance, {
      retries: config.attempts || 3,
      retryDelay: (retryCount) => {
        const baseDelay = config.delay || 1000;
        let delay = Math.pow(2, retryCount - 1) * baseDelay;

        // Add jitter if enabled (randomize ±25% to prevent thundering herd)
        if (config.jitter) {
          const jitterFactor = 0.75 + Math.random() * 0.5; // 0.75 to 1.25
          delay = delay * jitterFactor;
        }

        return delay;
      },
      retryCondition: (error) => {
        return axiosRetry.isNetworkOrIdempotentRequestError(error) ||
          (error.response && error.response.status >= 500);
      },
      shouldResetTimeout: true,
    });

    console.log('[HTTP Client] Retry configuration updated:', config);
  }

  // Health check method
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.axiosInstance.get('/health');
      return response.status === 200;
    } catch (error) {
      // Health check error logging removed for security
      return false;
    }
  }

  // Metrics methods
  getMetrics() {
    const avgResponseTime = this.metrics.responseTime.length > 0
      ? this.metrics.responseTime.reduce((a, b) => a + b, 0) / this.metrics.responseTime.length
      : 0;

    return {
      requestCount: this.metrics.requestCount,
      errorCount: this.metrics.errorCount,
      successRate: this.metrics.requestCount > 0
        ? ((this.metrics.requestCount - this.metrics.errorCount) / this.metrics.requestCount) * 100
        : 0,
      averageResponseTime: Math.round(avgResponseTime),
      lastRequestTime: this.metrics.lastRequestTime,
      retryEnabled: true, // Indicate retry is configured
      retryAttempts: 3, // Max retry attempts
    };
  }

  clearMetrics() {
    this.metrics = {
      requestCount: 0,
      errorCount: 0,
      lastRequestTime: null,
      responseTime: []
    };
  }

  // Get the underlying axios instance if needed
  getAxiosInstance(): AxiosInstance {
    return this.axiosInstance;
  }
}

// Export singleton instance
const httpClient = new HttpClient();
export default httpClient;