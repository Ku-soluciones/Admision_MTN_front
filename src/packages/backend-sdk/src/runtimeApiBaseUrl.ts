export const STAGING_API_BASE_URL = 'https://admitia-nginx-staging.up.railway.app';
export const PRODUCTION_API_BASE_URL = 'https://admitia-nginx.up.railway.app';

type RuntimeApiContext = {
  hostname?: string;
  origin?: string;
  configuredBaseUrl?: string;
};

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '');

/**
 * Local development deliberately returns an empty base URL. Requests such as
 * `/v1/auth/refresh` then remain same-origin and Vite forwards them to Railway.
 */
export function resolveRuntimeApiBaseUrl(context: RuntimeApiContext = {}): string {
  const hostname = context.hostname
    ?? (typeof window !== 'undefined' ? window.location.hostname : undefined);
  const origin = context.origin
    ?? (typeof window !== 'undefined' ? window.location.origin : '');

  if (hostname === 'localhost' || hostname === '127.0.0.1') return '';
  if (context.configuredBaseUrl) return trimTrailingSlash(context.configuredBaseUrl);
  if (origin) return trimTrailingSlash(origin);
  return PRODUCTION_API_BASE_URL;
}

export function configuredApiBaseUrl(): string {
  const env = (import.meta as any).env ?? {};
  return resolveRuntimeApiBaseUrl({
    configuredBaseUrl: env.VITE_API_BASE_URL || env.VITE_API_URL,
  });
}
