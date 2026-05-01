import type { AuthSession, BackendEndpointMap, UserRole } from '../../contracts/src/index';

const DEFAULT_ENDPOINTS: BackendEndpointMap = {
  bff: 'http://localhost:8081',
  auth: 'http://localhost:8081',
  documents: 'http://localhost:8081',
  notifications: 'http://localhost:8081',
};

const roleFallback: UserRole = 'TEACHER';

const roleMap: Record<string, UserRole> = {
  ADMIN: 'ADMIN',
  APODERADO: 'APODERADO',
  TEACHER: 'TEACHER',
  COORDINATOR: 'COORDINATOR',
  CYCLE_DIRECTOR: 'CYCLE_DIRECTOR',
  PSYCHOLOGIST: 'PSYCHOLOGIST',
  TEACHER_LANGUAGE: 'TEACHER_LANGUAGE',
  TEACHER_MATHEMATICS: 'TEACHER_MATHEMATICS',
  TEACHER_ENGLISH: 'TEACHER_ENGLISH',
};

const BASE_DOMAIN = 'admitia.dedyn.io';

const KNOWN_ENVS = ['dev', 'sta', 'staging', 'qa', 'uat', 'test'];

/**
 * Infers the deployment environment from the current hostname at runtime.
 * Pattern: <mf-subdomain>.<env>.<BASE_DOMAIN>  → returns env segment
 * Pattern: <mf-subdomain>.<BASE_DOMAIN>          → returns 'production'
 * Localhost / unknown                            → returns 'development'
 */
export function resolveEnvironmentFromHost(hostname?: string): string {
  const host = hostname ?? (typeof window !== 'undefined' ? window.location.hostname : 'localhost');

  if (host === 'localhost' || host === '127.0.0.1') {
    return 'development';
  }

  if (!host.endsWith(BASE_DOMAIN)) {
    return 'production';
  }

  const withoutBase = host.slice(0, host.length - BASE_DOMAIN.length - 1);
  const parts = withoutBase.split('.');

  if (parts.length >= 2) {
    const envSegment = parts[parts.length - 1].toLowerCase();
    if (KNOWN_ENVS.includes(envSegment)) {
      return envSegment;
    }
  }

  return 'production';
}

/**
 * Returns a localStorage key prefixed with the current environment so that
 * tokens from different environments never collide.
 * dev   → "auth_token__dev"
 * sta   → "auth_token__sta"
 * prod  → "auth_token__production"
 * local → "auth_token__development"
 */
export function getStorageKey(baseKey: string, hostname?: string): string {
  const env = resolveEnvironmentFromHost(hostname);
  return `${baseKey}__${env}`;
}

/**
 * Returns the environment-aware MF base domain.
 * Prefers VITE_MF_BASE_DOMAIN / VITE_MF_ENV when available (build-time),
 * then falls back to runtime hostname inference.
 */
export function resolveEnvironmentDomain(env?: Record<string, string | undefined>): string {
  const baseDomain = (env?.VITE_MF_BASE_DOMAIN || BASE_DOMAIN)
    .replace(/^https?:\/\//, '')
    .replace(/\/$/, '');

  if (env?.VITE_MF_ENV) {
    const mfEnv = env.VITE_MF_ENV.trim().toLowerCase();
    if (!mfEnv || mfEnv === 'production' || mfEnv === 'prod') {
      return baseDomain;
    }
    return `${mfEnv}.${baseDomain}`;
  }

  const runtimeEnv = resolveEnvironmentFromHost();
  if (runtimeEnv === 'production' || runtimeEnv === 'development') {
    return baseDomain;
  }
  return `${runtimeEnv}.${baseDomain}`;
}

export const BASE_STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  PROFESSOR_TOKEN: 'professor_token',
  APODERADO_TOKEN: 'apoderado_token',
  AUTHENTICATED_USER: 'authenticated_user',
  PROFESSOR_USER: 'professor_user',
  CURRENT_PROFESSOR: 'currentProfessor',
  APODERADO_USER: 'apoderado_user',
} as const;

/** @deprecated Use getStorageKey(BASE_STORAGE_KEYS.X) instead */
export const AUTH_STORAGE_KEYS = [
  'auth_token',
  'professor_token',
  'apoderado_token',
] as const;

export function resolveBackendEndpoints(env: Record<string, string | undefined> = {}): BackendEndpointMap {
  return {
    bff: env.VITE_API_BASE_URL || env.VITE_API_URL || DEFAULT_ENDPOINTS.bff,
    auth: env.VITE_AUTH_BASE_URL || env.VITE_API_BASE_URL || DEFAULT_ENDPOINTS.auth,
    documents: env.VITE_DOCUMENTS_BASE_URL || env.VITE_API_BASE_URL || DEFAULT_ENDPOINTS.documents,
    notifications: env.VITE_NOTIFICATIONS_BASE_URL || env.VITE_API_BASE_URL || DEFAULT_ENDPOINTS.notifications,
  };
}

export function resolveAccessToken(storage: Pick<Storage, 'getItem'> = window.localStorage): string | null {
  const keys = [
    getStorageKey(BASE_STORAGE_KEYS.AUTH_TOKEN),
    getStorageKey(BASE_STORAGE_KEYS.PROFESSOR_TOKEN),
    getStorageKey(BASE_STORAGE_KEYS.APODERADO_TOKEN),
    BASE_STORAGE_KEYS.AUTH_TOKEN,
    BASE_STORAGE_KEYS.PROFESSOR_TOKEN,
    BASE_STORAGE_KEYS.APODERADO_TOKEN,
  ];

  for (const key of keys) {
    const token = storage.getItem(key);
    if (token) {
      return token;
    }
  }

  return null;
}

export function resolveSession(storage: Pick<Storage, 'getItem'> = window.localStorage): AuthSession | null {
  const raw =
    storage.getItem(getStorageKey(BASE_STORAGE_KEYS.AUTHENTICATED_USER)) ||
    storage.getItem(getStorageKey(BASE_STORAGE_KEYS.PROFESSOR_USER)) ||
    storage.getItem(BASE_STORAGE_KEYS.AUTHENTICATED_USER) ||
    storage.getItem(BASE_STORAGE_KEYS.PROFESSOR_USER) ||
    storage.getItem('user');

  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw);
    return {
      userId: String(parsed.id ?? ''),
      email: parsed.email ?? '',
      firstName: parsed.firstName ?? '',
      lastName: parsed.lastName ?? '',
      role: roleMap[String(parsed.role ?? '')] ?? roleFallback,
      token: resolveAccessToken(storage) ?? undefined,
    };
  } catch {
    return null;
  }
}

export function buildAuthHeaders(storage: Pick<Storage, 'getItem'> = window.localStorage): HeadersInit {
  const token = resolveAccessToken(storage);
  if (!token) {
    return {
      'Content-Type': 'application/json',
    };
  }

  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}
