/**
 * authStore — store de sesión en memoria.
 *
 * Reemplaza al uso anterior de localStorage para el access token. El refresh
 * vive exclusivamente en la cookie HttpOnly del BFF, así que no se persiste
 * nada de eso aquí.
 *
 * Se implementa como un singleton "vanilla" (sin Zustand) para no agregar
 * dependencias al paquete. Cada MF puede envolverlo en `useSyncExternalStore`
 * cuando necesite reactividad en React (ver `useAuthStore`).
 */
import { useSyncExternalStore } from 'react';

export interface AuthSessionUser {
  id?: string | number;
  email?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  rut?: string | null;
  phone?: string | null;
  subject?: string;
  active?: boolean;
  emailVerified?: boolean;
  [key: string]: unknown;
}

export interface AuthState {
  /** JWT corto (15 min). En memoria. Nunca tocar localStorage. */
  accessToken: string | null;
  /** epoch ms en el que expira `accessToken`. */
  expiresAt: number | null;
  /** epoch ms del hard-cap absoluto de la sesión (login + refreshExpiresIn). */
  absoluteExpiresAt: number | null;
  /** Datos básicos del usuario autenticado. */
  user: AuthSessionUser | null;
  /** Indica si la cuenta tiene `firebase_uid` enlazado en el BFF. */
  firebaseLinked: boolean;
  /** Identificador de la sesión activa devuelto por el BFF (para diagnóstico). */
  sessionId: string | null;
  /** Roles/permisos asignados al usuario. */
  permissions: string[];
}

export interface SetSessionInput {
  token: string;
  expiresIn: number;                // segundos hasta exp del access
  absoluteSessionSeconds?: number;  // segundos del hard-cap absoluto
  user?: AuthSessionUser | null;
  firebaseLinked?: boolean;
  sessionId?: string | null;
  permissions?: string[];
}

const initialState: AuthState = {
  accessToken: null,
  expiresAt: null,
  absoluteExpiresAt: null,
  user: null,
  firebaseLinked: false,
  sessionId: null,
  permissions: [],
};

let state: AuthState = { ...initialState };
const listeners = new Set<() => void>();

function notify(): void {
  listeners.forEach((l) => {
    try { l(); } catch { /* no-op */ }
  });
}

export const authStore = {
  getState(): AuthState {
    return state;
  },

  /** Devuelve el access token sólo si no está expirado (con `skewMs` de tolerancia). */
  getValidAccessToken(skewMs = 0): string | null {
    if (!state.accessToken) return null;
    if (state.expiresAt && Date.now() >= state.expiresAt - skewMs) return null;
    return state.accessToken;
  },

  setSession(input: SetSessionInput): void {
    const now = Date.now();
    state = {
      ...state,
      accessToken: input.token,
      expiresAt: now + input.expiresIn * 1000,
      absoluteExpiresAt: input.absoluteSessionSeconds
        ? now + input.absoluteSessionSeconds * 1000
        : state.absoluteExpiresAt,
      user: input.user ?? state.user,
      firebaseLinked: input.firebaseLinked ?? state.firebaseLinked,
      sessionId: input.sessionId ?? state.sessionId,
      permissions: input.permissions ?? state.permissions,
    };
    notify();
  },

  /** Actualiza únicamente el access token tras un refresh. */
  updateAccessToken(token: string, expiresIn: number, user?: AuthSessionUser | null): void {
    state = {
      ...state,
      accessToken: token,
      expiresAt: Date.now() + expiresIn * 1000,
      user: user ?? state.user,
    };
    notify();
  },

  patchUser(patch: Partial<AuthSessionUser>): void {
    state = { ...state, user: { ...(state.user ?? {}), ...patch } as AuthSessionUser };
    notify();
  },

  setFirebaseLinked(value: boolean): void {
    if (state.firebaseLinked === value) return;
    state = { ...state, firebaseLinked: value };
    notify();
  },

  clear(): void {
    state = { ...initialState };
    notify();
  },

  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

/**
 * Hook React que se suscribe al `authStore`. Útil para componentes que
 * dependen del usuario o del access token.
 */
export function useAuthStore<T>(selector: (s: AuthState) => T): T {
  return useSyncExternalStore(
    authStore.subscribe,
    () => selector(authStore.getState()),
    () => selector(authStore.getState()),
  );
}

/**
 * Limpia residuos de versiones previas del front que persistían tokens en
 * localStorage. Llamar una sola vez al arrancar la app.
 *
 * Si `preserveLegacyKeys` se pasa, esos keys NO se eliminan (útil durante la
 * transición cuando todavía existen flujos que leen de localStorage).
 */
export function purgeLegacyAuthStorage(preserveLegacyKeys: string[] = []): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  const targets = ['token', 'refreshToken', 'auth', 'user'];
  for (const key of targets) {
    if (preserveLegacyKeys.includes(key)) continue;
    try { window.localStorage.removeItem(key); } catch { /* no-op */ }
  }
}

