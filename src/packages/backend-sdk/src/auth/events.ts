/**
 * Bus de eventos de auth.
 *
 * Permite a la app (o a un módulo de telemetría) observar los puntos
 * críticos del ciclo de vida de la sesión sin acoplarse al interceptor
 * de axios ni al `authStore`. Si nadie se suscribe, los `emit()` son
 * no-op: cero costo.
 *
 * Uso:
 *   import { onAuthEvent } from '@/packages/backend-sdk/src/auth/events';
 *   const off = onAuthEvent((evt) => trackingClient.log('auth', evt));
 *   // ... más tarde
 *   off();
 */

export type AuthEvent =
  /** Refresh proactivo o reactivo falló de forma definitiva. */
  | { type: 'refresh-failed'; reason?: string; status?: number }
  /** Refresh exitoso (proactivo o reactivo). */
  | { type: 'refresh-succeeded'; expiresIn?: number }
  /** Sesión terminada por el BFF (REFRESH_INVALID, SESSION_REVOKED, …). */
  | { type: 'terminal'; code?: string; status?: number }
  /** Otra pestaña hizo logout y este tab lo recibió por broadcast. */
  | { type: 'cross-tab-logout'; reason?: string }
  /** El access token expiró client-side y se forzó redirect. */
  | { type: 'expired'; route?: string }
  /** Modal de inactividad mostrado (faltan N segundos para expirar). */
  | { type: 'idle-warn'; warnBeforeSeconds: number }
  /** Auto-logout por inactividad o hard-cap absoluto. */
  | { type: 'idle-expire'; cause: 'inactivity' | 'absolute' };

type AuthEventListener = (event: AuthEvent) => void;

const listeners = new Set<AuthEventListener>();

/**
 * Registra un listener. Devuelve una función para desuscribirse.
 * Múltiples listeners están soportados; las excepciones de uno no
 * afectan al resto.
 */
export function onAuthEvent(listener: AuthEventListener): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

/**
 * Emite un evento a todos los listeners. Best-effort: cualquier error
 * dentro de un listener se aísla con try/catch para no romper el
 * caller (típicamente un interceptor de red).
 */
export function emitAuthEvent(event: AuthEvent): void {
  if (listeners.size === 0) return;
  listeners.forEach((l) => {
    try { l(event); } catch { /* no-op */ }
  });
}

/**
 * Limpia todos los listeners. Útil para tests.
 */
export function _resetAuthEventListeners(): void {
  listeners.clear();
}

