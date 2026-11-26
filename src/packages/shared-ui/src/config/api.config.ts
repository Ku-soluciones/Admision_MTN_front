/**
 * API Configuration
 *
 * All URLs come from environment variables (VITE_API_BASE_URL).
 * Everything goes through NGINX gateway with /v1/ prefix.
 *
 * Environments:
 * - Local dev:  rutas relativas `/v1` mediante el proxy de Vite
 * - Staging:    VITE_API_BASE_URL=https://admitia-nginx-staging.up.railway.app
 * - Production: VITE_API_BASE_URL=https://admitia-nginx.up.railway.app
 */

import { configuredApiBaseUrl } from '../../../backend-sdk/src/runtimeApiBaseUrl';

function resolveRuntimeApiBaseUrl(): string {
  return configuredApiBaseUrl();
}

export function getApiBaseUrl(): string {
  return resolveRuntimeApiBaseUrl();
}

export function apiPath(path: string): string {
  return path;
}
