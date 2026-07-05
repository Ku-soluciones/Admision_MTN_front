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

const LOCAL_API_BASE_URL = 'http://localhost:8081';
const STAGING_API_BASE_URL = 'https://admitia-nginx-staging.up.railway.app';
const PRODUCTION_API_BASE_URL = 'https://admitia-nginx.up.railway.app';

function resolveRuntimeApiBaseUrl(): string {
  if (typeof window === 'undefined') return LOCAL_API_BASE_URL;

  const host = window.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1') return import.meta.env.VITE_API_BASE_URL || LOCAL_API_BASE_URL;
  if (host.includes('staging') || host.includes('dev.') || host.includes('.dev.')) return STAGING_API_BASE_URL;
  return import.meta.env.VITE_API_BASE_URL || PRODUCTION_API_BASE_URL;
}

export function getApiBaseUrl(): string {
  return resolveRuntimeApiBaseUrl();
}

export function apiPath(path: string): string {
  return path;
}
