import { authStore } from '../../../packages/backend-sdk/src/auth/store';

const LOCAL_GATEWAY = 'http://localhost:8081';

function baseUrl(): string {
  const configured = (import.meta as any).env?.VITE_API_BASE_URL as string | undefined;
  if (configured) return configured.replace(/\/+$/, '');
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') return LOCAL_GATEWAY;
  return window.location.origin;
}

const refreshChannel = typeof BroadcastChannel !== 'undefined'
  ? new BroadcastChannel('admitia-prekinder-auth')
  : null;

refreshChannel?.addEventListener('message', (event) => {
  const data = event.data;
  if (data?.type === 'ACCESS_REFRESHED' && typeof data.token === 'string' && typeof data.expiresIn === 'number') {
    authStore.updateAccessToken(data.token, data.expiresIn, data.user);
  }
});

let refreshInFlight: Promise<string | null> | null = null;

export function refreshAccessToken(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = coordinateRefresh().finally(() => { refreshInFlight = null; });
  return refreshInFlight;
}

async function coordinateRefresh(): Promise<string | null> {
  const execute = async () => {
    const response = await fetch(`${baseUrl()}/v1/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) return null;
    const data = await response.json();
    if (!data?.token || typeof data.expiresIn !== 'number') return null;
    authStore.updateAccessToken(data.token, data.expiresIn, data.user);
    refreshChannel?.postMessage({ type: 'ACCESS_REFRESHED', token: data.token, expiresIn: data.expiresIn, user: data.user });
    return data.token as string;
  };
  if ('locks' in navigator) {
    return navigator.locks.request('admitia-prekinder-refresh', execute);
  }
  return execute();
}

export async function apiRequest<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  let token = authStore.getValidAccessToken(15_000);
  if (!token) token = await refreshAccessToken();
  if (!token) throw new ApiError(401, 'Tu sesión expiró. Ingresa nuevamente.');
  const response = await fetch(`${baseUrl()}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      Authorization: `Bearer ${token}`,
      'X-Request-ID': crypto.randomUUID(),
      ...init.headers,
    },
  });
  if (response.status === 401 && retry) {
    const renewed = await refreshAccessToken();
    if (renewed) return apiRequest<T>(path, init, false);
  }
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(response.status, body?.error?.message || recoveryMessage(response.status));
  }
  return body.data as T;
}

function recoveryMessage(status: number): string {
  if (status === 409) return 'El dato cambió. Resincroniza e intenta nuevamente.';
  if (status === 503) return 'El tiempo real no está disponible. Puedes continuar en modo seguro.';
  return 'No pudimos completar la operación. Intenta nuevamente.';
}

export class ApiError extends Error {
  constructor(public readonly status: number, message: string) { super(message); }
}

export type Evaluation = {
  evaluationId: string;
  applicationId: string;
  typeCode: string;
  status: string;
  serverSequence: number;
  version: number;
};

export type Comment = {
  commentId: string;
  evaluationId: string;
  authorId: string;
  operationId: string;
  serverSequence: number;
  status: string;
  revision: number;
  revisionState: 'CURRENT' | 'CONFLICTED' | 'TOMBSTONE';
  content: string;
  createdAt: string;
};

export const prekinderApi = {
  evaluations: () => apiRequest<Evaluation[]>('/v1/prekinder/evaluations'),
  comments: (evaluationId: string) => apiRequest<Comment[]>(`/v1/prekinder/evaluations/${evaluationId}/comments`),
  ticket: () => apiRequest<{ ticket: string; expiresInSeconds: number }>('/v1/prekinder/realtime/tickets', { method: 'POST' }),
  createComment: (evaluationId: string, operationId: string, content: string) =>
    apiRequest<{ comment: Comment; duplicate: boolean }>(`/v1/prekinder/evaluations/${evaluationId}/comments`, {
      method: 'POST', body: JSON.stringify({ operationId, content }),
    }),
  events: (evaluationId: string, afterSequence: number) =>
    apiRequest<Array<{ eventId: string; entityId: string; sequence: number; eventType: string }>>(
      `/v1/prekinder/evaluations/${evaluationId}/events?afterSequence=${afterSequence}`,
    ),
};

export function websocketUrl(): string {
  const url = new URL(baseUrl());
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  url.pathname = '/v1/prekinder/realtime';
  url.search = '';
  return url.toString();
}
