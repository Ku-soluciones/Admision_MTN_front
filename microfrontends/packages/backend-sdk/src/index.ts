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
  for (const key of AUTH_STORAGE_KEYS) {
    const token = storage.getItem(key);
    if (token) {
      return token;
    }
  }

  return null;
}

export function resolveSession(storage: Pick<Storage, 'getItem'> = window.localStorage): AuthSession | null {
  const raw =
    storage.getItem('authenticated_user') ||
    storage.getItem('professor_user') ||
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
      token: resolveAccessToken(storage),
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
