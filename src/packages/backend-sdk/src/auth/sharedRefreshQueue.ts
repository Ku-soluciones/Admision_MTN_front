/**
 * Cola de refresh compartida entre el interceptor reactivo y el timer
 * proactivo. Centraliza la llamada a POST /v1/auth/refresh para que sólo
 * UNA petición de refresh esté en vuelo a la vez, evitando que el backend
 * detecte "reuso" de refresh token y revoque la sesión por seguridad.
 *
 * Usa fetch directamente con credentials: 'include' para que la cookie
 * HttpOnly del refresh viaje automáticamente.
 */
import { authStore } from './store';
import { emitAuthEvent } from './events';
import { broadcastRefresh } from './broadcast';
import { createRefreshQueue } from './refreshQueue';

const DEFAULT_AUTH_BASE_URL = 'http://localhost:8081';
const REFRESH_PATH = '/v1/auth/refresh';
const STAGING_AUTH_BASE_URL = 'https://admitia-nginx-staging.up.railway.app';
const PRODUCTION_AUTH_BASE_URL = 'https://admitia-nginx.up.railway.app';

function readEnv(key: string): string | undefined {
  return (import.meta as any).env?.[key];
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

function resolveRefreshUrl(): string {
  const baseUrl =
    readEnv('VITE_AUTH_BASE_URL') ||
    readEnv('VITE_API_BASE_URL') ||
    readEnv('VITE_API_URL') ||
    resolveRuntimeAuthBaseUrl();

  return `${trimTrailingSlash(baseUrl)}${REFRESH_PATH}`;
}

function resolveRuntimeAuthBaseUrl(): string {
  if (typeof window === 'undefined') return DEFAULT_AUTH_BASE_URL;

  const host = window.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1') return DEFAULT_AUTH_BASE_URL;
  if (host.includes('staging') || host.includes('dev.') || host.includes('.dev.')) return STAGING_AUTH_BASE_URL;
  return PRODUCTION_AUTH_BASE_URL;
}

function resolveEnvironmentFromHost(): string {
  const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  return host === 'localhost' || host === '127.0.0.1' ? 'development' : 'production';
}

function storageKey(baseKey: string): string {
  return `${baseKey}__${resolveEnvironmentFromHost()}`;
}

function persistAccessToken(token: string, role?: string): void {
  if (typeof localStorage === 'undefined') return;

  const normalizedRole = String(role || '').toUpperCase();
  const isStaff =
    normalizedRole !== '' &&
    normalizedRole !== 'APODERADO' &&
    normalizedRole !== 'GUARDIAN';

  localStorage.setItem(storageKey('auth_token'), token);
  if (isStaff) {
    localStorage.setItem(storageKey('professor_token'), token);
    localStorage.setItem('professor_token', token);
  } else {
    localStorage.setItem('auth_token', token);
  }
}

export interface SharedRefreshResult {
  token: string;
  expiresIn: number;
  user?: any;
  firebaseLinked?: boolean;
}

async function doRefresh(): Promise<SharedRefreshResult> {
  const response = await fetch(resolveRefreshUrl(), {
    method: 'POST',
    credentials: 'include',
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Refresh failed: ${response.status} ${body}`);
  }

  const data = await response.json();
  if (!data?.token || typeof data.expiresIn !== 'number') {
    throw new Error('Respuesta de refresh inválida');
  }

  authStore.updateAccessToken(data.token, data.expiresIn, data.user ?? undefined);
  persistAccessToken(data.token, data.user?.role);
  if (typeof data.firebaseLinked === 'boolean') {
    authStore.setFirebaseLinked(data.firebaseLinked);
  }
  broadcastRefresh(data.token, data.expiresIn);
  emitAuthEvent({ type: 'refresh-succeeded', expiresIn: data.expiresIn });
  return {
    token: data.token as string,
    expiresIn: data.expiresIn as number,
    user: data.user,
    firebaseLinked: data.firebaseLinked,
  };
}

const sharedRefreshQueue = createRefreshQueue<SharedRefreshResult | null>({
  refresh: doRefresh,
  onFailure: (err) => {
    // NO limpiamos authStore aquí: el refresh proactivo no debe cerrar la
    // sesión por un fallo transitorio. Los callers (interceptor/api.ts) son
    // quienes deciden si el contexto es terminal.
    const status = (err as any)?.status ?? (err as any)?.message?.match(/\d{3}/)?.[0];
    emitAuthEvent({ type: 'refresh-failed', status, reason: 'shared-queue' });
  },
});

/**
 * Ejecuta (o espera) el refresh compartido. Devuelve el resultado del refresh
 * o null si el refresh falló definitivamente.
 */
export function runSharedRefresh(): Promise<SharedRefreshResult | null> {
  return sharedRefreshQueue.run();
}

/** Indica si hay un refresh en curso. */
export function isSharedRefreshRunning(): boolean {
  return sharedRefreshQueue.isRefreshing();
}
