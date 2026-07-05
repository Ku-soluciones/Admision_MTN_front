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
import { createRefreshQueue } from './refreshQueue';

const REFRESH_URL = '/v1/auth/refresh';

export interface SharedRefreshResult {
  token: string;
  expiresIn: number;
  user?: any;
  firebaseLinked?: boolean;
}

async function doRefresh(): Promise<SharedRefreshResult> {
  const response = await fetch(REFRESH_URL, {
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
  if (typeof data.firebaseLinked === 'boolean') {
    authStore.setFirebaseLinked(data.firebaseLinked);
  }
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
