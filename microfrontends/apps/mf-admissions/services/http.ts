/**
 * Cliente HTTP Unificado para API Gateway
 * Integración con autenticación Bearer, reintentos exponenciales y manejo de errores
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { oidcService } from './oidcService';
import { getApiBaseUrl } from '../config/api.config';
import { csrfService } from './csrfService';

// Tipos
interface RetryConfig {
  attempts: number;
  delay: number;
  jitter: boolean;
  retryableStatuses: number[];
}

interface HttpError {
  status: number;
  message: string;
  data?: any;
  correlationId?: string;
}

interface RequestMetrics {
  startTime: number;
  endTime?: number;
  duration?: number;
  retryAttempt: number;
  correlationId: string;
}

// Configuración por defecto
const DEFAULT_TIMEOUT = 30000;
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  attempts: 3,
  delay: 1000, // 1 segundo base
  jitter: true,
  retryableStatuses: [408, 429, 500, 502, 503, 504],
};

class HttpClient {
  private client: AxiosInstance;
  private retryConfig: RetryConfig;
  private metrics: Map<string, RequestMetrics> = new Map();

  constructor() {
    this.retryConfig = DEFAULT_RETRY_CONFIG;

    // Create axios instance WITHOUT baseURL
    // baseURL will be set dynamically in the request interceptor
    this.client = axios.create({
      // NO baseURL - will be set in interceptor
      timeout: DEFAULT_TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Client-Type': 'mtn-admission-web',
        'X-Client-Version': import.meta.env.VITE_APP_VERSION || '1.0.0',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request Interceptor
    this.client.interceptors.request.use(
      async (config) => {
        // CRITICAL: Set baseURL at REQUEST TIME to ensure runtime evaluation
        // This runs in the browser, so getApiBaseUrl() will detect the correct hostname
        const runtimeBaseURL = getApiBaseUrl();

        // Build full URL if config.url is relative
        if (config.url && !config.url.startsWith('http')) {
          config.url = runtimeBaseURL + config.url;
        }

        console.log('📤 http.ts - Runtime baseURL:', runtimeBaseURL);
        console.log('📤 http.ts - Full URL:', config.url);

        const correlationId = crypto.randomUUID();

        // Agregar headers de autenticación y correlación
        const token = await this.getAccessToken();
        if (token) {
          config.headers = {
            ...config.headers,
            'Authorization': `Bearer ${token}`,
          };
          console.log('✅ http.ts - Authorization header added');
        } else {
          console.warn('⚠️ http.ts - No token available, request will be sent without auth');
        }

        config.headers = {
          ...config.headers,
          'X-Correlation-Id': correlationId,
          'X-Request-Time': new Date().toISOString(),
          'X-Timezone': Intl.DateTimeFormat().resolvedOptions().timeZone,
        };

        // Add CSRF token for POST, PUT, DELETE, PATCH requests
        const method = String(config.method || 'get').toUpperCase();
        const needsCsrf = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method);
        const url = String(config.url || '');

        if (needsCsrf && !url.includes('/csrf-token')) {
          try {
            const csrfHeaders = await csrfService.getCsrfHeaders();
            const csrfToken = String(csrfHeaders['X-CSRF-Token']);
            config.headers = {
              ...config.headers,
              'X-CSRF-Token': csrfToken,
            };
            // console.log(`🛡️ http.ts - Added CSRF token to ${method} request:`, csrfToken.substring(0, 20) + '...');
          } catch (error) {
            console.error('❌ http.ts - Failed to get CSRF token:', error);
            // Continue without CSRF - backend will reject if required
          }
        }

        // Iniciar métricas
        this.metrics.set(correlationId, {
          startTime: Date.now(),
          retryAttempt: (config as any)._retryAttempt || 0,
          correlationId,
        });


        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response Interceptor
    this.client.interceptors.response.use(
      (response) => {
        const correlationId = response.config.headers['X-Correlation-Id'] as string;
        
        // Actualizar métricas
        if (correlationId && this.metrics.has(correlationId)) {
          const metrics = this.metrics.get(correlationId)!;
          metrics.endTime = Date.now();
          metrics.duration = metrics.endTime - metrics.startTime;
          
          
          this.metrics.delete(correlationId);
        }

        return response;
      },
      async (error: AxiosError) => {
        return this.handleError(error);
      }
    );
  }

  private async getAccessToken(): Promise<string | null> {
    try {
      // Primero intentar obtener el token de usuario regular (apoderado)
      let token = localStorage.getItem('auth_token');
      console.log('🔑 http.ts - auth_token:', token ? `${token.substring(0, 20)}...` : 'NOT FOUND');

      // Si no hay token de usuario regular, intentar con token de profesor
      if (!token) {
        token = localStorage.getItem('professor_token');
        console.log('🔑 http.ts - professor_token:', token ? `${token.substring(0, 20)}...` : 'NOT FOUND');
      }

      // Si aún no hay token, intentar OIDC como fallback
      if (!token) {
        token = oidcService.getAccessToken();
        console.log('🔑 http.ts - oidc token:', token ? `${token.substring(0, 20)}...` : 'NOT FOUND');
      }

      console.log('🔑 http.ts - Final token to use:', token ? 'FOUND' : 'NULL');
      return token;
    } catch (error) {
      console.error('❌ http.ts - Error getting token:', error);
      return null;
    }
  }

  private sanitizeHeaders(headers: any): any {
    const sanitized = { ...headers };
    
    // Ocultar información sensible en logs
    if (sanitized.Authorization) {
      sanitized.Authorization = 'Bearer ***';
    }
    
    return sanitized;
  }

  private async handleError(error: AxiosError): Promise<never> {
    const correlationId = error.config?.headers?.['X-Correlation-Id'] as string;
    
    // Actualizar métricas de error
    if (correlationId && this.metrics.has(correlationId)) {
      const metrics = this.metrics.get(correlationId)!;
      metrics.endTime = Date.now();
      metrics.duration = metrics.endTime - metrics.startTime;
      
    }

    // Verificar si es reintentable
    if (this.shouldRetry(error)) {
      return this.retryRequest(error);
    }

    // Mapear errores específicos
    if (error.response?.status === 401) {
      await this.handle401Error(error);
    } else if (error.response?.status === 403) {
      this.handle403Error(error);
    }

    // Limpiar métricas
    if (correlationId) {
      this.metrics.delete(correlationId);
    }

    throw this.createHttpError(error, correlationId);
  }

  private shouldRetry(error: AxiosError): boolean {
    const config = error.config as any;
    const retryAttempt = config._retryAttempt || 0;
    const status = error.response?.status;

    return (
      retryAttempt < this.retryConfig.attempts &&
      status !== undefined &&
      this.retryConfig.retryableStatuses.includes(status)
    );
  }

  private async retryRequest(error: AxiosError): Promise<AxiosResponse> {
    const config = error.config as any;
    const retryAttempt = (config._retryAttempt || 0) + 1;
    
    // Calcular delay con jitter exponencial
    const baseDelay = this.retryConfig.delay * Math.pow(2, retryAttempt - 1);
    const jitter = this.retryConfig.jitter ? Math.random() * 0.1 : 0;
    const delay = baseDelay + (baseDelay * jitter);


    // Esperar antes de reintentar
    await new Promise(resolve => setTimeout(resolve, delay));

    // Configurar reintento
    config._retryAttempt = retryAttempt;

    return this.client.request(config);
  }

  private async handle401Error(error: AxiosError): Promise<void> {
    // Check if this is a session invalidation (user logged in from another device/tab)
    const errorData = error.response?.data as any;
    if (errorData?.code === 'SESSION_INVALIDATED') {
      console.warn('⚠️ Session invalidated - User logged in from another device');

      // Clear ALL tokens
      localStorage.removeItem('auth_token');
      localStorage.removeItem('professor_token');
      sessionStorage.clear();

      // Show alert to user
      alert('Tu sesión ha sido cerrada porque iniciaste sesión en otro dispositivo o pestaña.');

      // Redirect to login
      this.redirectToLogin();
      return;
    }

    // For other 401 errors, try to renew token
    try {
      const newUser = await oidcService.renewToken();

      if (!newUser) {
        this.redirectToLogin();
      }
    } catch (renewError) {
      this.redirectToLogin();
    }
  }

  private handle403Error(error: AxiosError): void {

    // Mostrar página de acceso denegado
    if (window.location.pathname !== '/unauthorized') {
      window.location.href = '/unauthorized';
    }
  }

  private redirectToLogin(): void {
    // Guardar la URL actual para redirección después del login
    const currentPath = window.location.pathname + window.location.search;
    sessionStorage.setItem('redirectAfterLogin', currentPath);
    
    window.location.href = '/login';
  }

  private createHttpError(error: AxiosError, correlationId?: string): HttpError {
    return {
      status: error.response?.status || 0,
      message: error.response?.data?.message || error.message || 'Error de conexión',
      data: error.response?.data,
      correlationId,
    };
  }

  // Métodos públicos
  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.get<T>(url, config);

    // DEFENSIVE: Validate response exists before accessing data
    if (!response || !response.data) {
      console.error('❌ http.ts - GET response or response.data is undefined');
      console.error('❌ http.ts - URL:', url);
      throw new Error('No se recibió respuesta válida del servidor');
    }

    return response.data;
  }

  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.post<T>(url, data, config);

    // DEFENSIVE: Validate response exists before accessing data
    if (!response || !response.data) {
      console.error('❌ http.ts - POST response or response.data is undefined');
      console.error('❌ http.ts - URL:', url);
      throw new Error('No se recibió respuesta válida del servidor');
    }

    return response.data;
  }

  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.put<T>(url, data, config);

    // DEFENSIVE: Validate response exists before accessing data
    if (!response || !response.data) {
      console.error('❌ http.ts - PUT response or response.data is undefined');
      console.error('❌ http.ts - URL:', url);
      throw new Error('No se recibió respuesta válida del servidor');
    }

    return response.data;
  }

  async patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.patch<T>(url, data, config);

    // DEFENSIVE: Validate response exists before accessing data
    if (!response || !response.data) {
      console.error('❌ http.ts - PATCH response or response.data is undefined');
      console.error('❌ http.ts - URL:', url);
      throw new Error('No se recibió respuesta válida del servidor');
    }

    return response.data;
  }

  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.delete<T>(url, config);

    // DEFENSIVE: Validate response exists before accessing data
    if (!response || !response.data) {
      console.error('❌ http.ts - DELETE response or response.data is undefined');
      console.error('❌ http.ts - URL:', url);
      throw new Error('No se recibió respuesta válida del servidor');
    }

    return response.data;
  }

  // Métodos de configuración
  setRetryConfig(config: Partial<RetryConfig>): void {
    this.retryConfig = { ...this.retryConfig, ...config };
  }

  setTimeout(timeout: number): void {
    this.client.defaults.timeout = timeout;
  }

  setBaseURL(baseURL: string): void {
    this.client.defaults.baseURL = baseURL;
  }

  // Métricas y debugging
  getMetrics(): Map<string, RequestMetrics> {
    return new Map(this.metrics);
  }

  clearMetrics(): void {
    this.metrics.clear();
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      await this.get('/actuator/health');
      return true;
    } catch (error) {
      return false;
    }
  }
}

// Instancia singleton
const httpClient = new HttpClient();

export default httpClient;
export { HttpClient, type HttpError, type RetryConfig, type RequestMetrics };