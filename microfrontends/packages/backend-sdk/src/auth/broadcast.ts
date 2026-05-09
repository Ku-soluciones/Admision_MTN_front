/**
 * Sincronización de sesión entre pestañas usando BroadcastChannel.
 *
 * Permite que un login/logout/refresh en una pestaña se propague a todas
 * las demás del mismo origen. Si BroadcastChannel no está disponible
 * (entornos antiguos / SSR), usa un fallback con `storage` events.
 */
import { authStore } from './store';

const CHANNEL_NAME = 'admitia-auth';

type AuthMessage =
  | { type: 'LOGIN'; token: string; expiresIn: number; user?: any; firebaseLinked?: boolean; t: number }
  | { type: 'LOGOUT'; reason?: string; t: number }
  | { type: 'REFRESH'; token: string; expiresIn: number; t: number };

let channel: BroadcastChannel | null = null;
let onLogoutCb: ((reason?: string) => void) | null = null;

function getChannel(): BroadcastChannel | null {
  if (typeof window === 'undefined') return null;
  if (channel) return channel;
  if (typeof BroadcastChannel === 'undefined') return null;
  try {
    channel = new BroadcastChannel(CHANNEL_NAME);
    channel.onmessage = (e: MessageEvent<AuthMessage>) => handleMessage(e.data);
  } catch {
    channel = null;
  }
  return channel;
}

function handleMessage(msg: AuthMessage | undefined): void {
  if (!msg || typeof msg !== 'object') return;
  switch (msg.type) {
    case 'LOGIN':
      // Sólo adoptar el login si no tenemos sesión activa local.
      if (!authStore.getState().accessToken) {
        authStore.setSession({
          token: msg.token,
          expiresIn: msg.expiresIn,
          user: msg.user,
          firebaseLinked: msg.firebaseLinked,
        });
      }
      break;
    case 'REFRESH':
      // Si otra pestaña refrescó antes que nosotros, adoptamos el token nuevo.
      authStore.updateAccessToken(msg.token, msg.expiresIn);
      break;
    case 'LOGOUT':
      authStore.clear();
      onLogoutCb?.(msg.reason);
      break;
  }
}

export function broadcastLogin(token: string, expiresIn: number, user?: any, firebaseLinked?: boolean): void {
  const ch = getChannel();
  ch?.postMessage({ type: 'LOGIN', token, expiresIn, user, firebaseLinked, t: Date.now() } satisfies AuthMessage);
}

export function broadcastLogout(reason?: string): void {
  const ch = getChannel();
  ch?.postMessage({ type: 'LOGOUT', reason, t: Date.now() } satisfies AuthMessage);
}

export function broadcastRefresh(token: string, expiresIn: number): void {
  const ch = getChannel();
  ch?.postMessage({ type: 'REFRESH', token, expiresIn, t: Date.now() } satisfies AuthMessage);
}

/**
 * Registra un callback que se invoca cuando otra pestaña hizo logout.
 * Típicamente: redirigir a `/login?reason=other-tab`.
 */
export function onCrossTabLogout(cb: (reason?: string) => void): () => void {
  onLogoutCb = cb;
  // Asegura que el canal está abierto.
  getChannel();
  return () => { onLogoutCb = null; };
}

export function closeAuthChannel(): void {
  try { channel?.close(); } catch { /* no-op */ }
  channel = null;
}

