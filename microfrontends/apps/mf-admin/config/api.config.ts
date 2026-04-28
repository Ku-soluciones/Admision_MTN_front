/**
 * API Configuration
 *
 * All URLs come from environment variables (VITE_API_BASE_URL).
 * Everything goes through NGINX gateway with /v1/ prefix.
 *
 * Environments:
 * - Local dev:  VITE_API_BASE_URL=http://localhost:8081      (NGINX local via Docker)
 * - Staging:    VITE_API_BASE_URL=https://admitia-nginx-staging.up.railway.app
 * - Production: VITE_API_BASE_URL=https://admitia-nginx.up.railway.app
 */

export function getApiBaseUrl(): string {
  return import.meta.env.VITE_API_BASE_URL || 'http://localhost:8081';
}

export function apiPath(path: string): string {
  return path;
}
