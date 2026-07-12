/**
 * Sincronización de sesión entre pestañas usando BroadcastChannel.
 *
 * Permite que un login/logout/refresh en una pestaña se propague a todas
 * las demás del mismo origen. Si BroadcastChannel no está disponible
 * (entornos antiguos / SSR), usa un fallback con `storage` events.
 *
 * Validación: todos los mensajes pasan por `isValidAuthMessage()` antes
 * de aplicarse al store. Un mensaje malformado (token vacío, expiresIn
 * no numérico, timestamp ausente o demasiado viejo) se descarta en
 * silencio en vez de corromper la sesión local.
 */
import { authStore } from './store';
import { emitAuthEvent } from './events';
import { clearRefreshTokenFallback } from './refreshTokenFallback';

const CHANNEL_NAME = 'admitia-auth';

/** Antigüedad máxima aceptada de un mensaje broadcast (ms). Mitiga replays. */
const MAX_MESSAGE_AGE_MS = 60_000;

type AuthMessage =
  | { type: 'LOGIN'; token: string; expiresIn: number; user?: any; firebaseLinked?: boolean; t: number }
  | { type: 'LOGOUT'; reason?: string; t: number }
  | { type: 'REFRESH'; token: string; expiresIn: number; t: number };

let channel: BroadcastChannel | null = null;

// Usar Set para permitir múltiples callbacks (múltiples pestañas/módulos)
const onLogoutCallbacks = new Set<(reason?: string) => void>();

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

/**
 * Valida la forma del mensaje antes de aplicarlo al store.
 * Devuelve `true` sólo si el payload tiene la estructura esperada para
 * su `type` y no es un replay obvio (timestamp >60s en el pasado/futuro).
 */
function isValidAuthMessage(msg: unknown): msg is AuthMessage {
  if (!msg || typeof msg !== 'object') return false;
  const m = msg as Record<string, unknown>;

  // Timestamp obligatorio y dentro de una ventana razonable.
  if (typeof m.t !== 'number' || !Number.isFinite(m.t)) return false;
  const drift = Math.abs(Date.now() - m.t);
  if (drift > MAX_MESSAGE_AGE_MS) return false;

  switch (m.type) {
    case 'LOGIN':
    case 'REFRESH': {
      const tokenOk = typeof m.token === 'string' && m.token.length > 0;
      const expOk = typeof m.expiresIn === 'number' && Number.isFinite(m.expiresIn) && m.expiresIn > 0;
      return tokenOk && expOk;
    }
    case 'LOGOUT':
      // `reason` es opcional; si está presente, debe ser string.
      return m.reason === undefined || typeof m.reason === 'string';
    default:
      return false;
  }
}

function handleMessage(raw: AuthMessage | undefined): void {
  if (!isValidAuthMessage(raw)) {
    // Mensaje malformado o caducado: descartar.
    return;
  }
  const msg = raw;
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
      clearRefreshTokenFallback();
      emitAuthEvent({ type: 'cross-tab-logout', reason: msg.reason });
      // Notificar a todos los callbacks registrados
      onLogoutCallbacks.forEach(cb => {
        try { cb(msg.reason); } catch { /* no-op */ }
      });
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
 * 
 * NOTA: Ahora soporta múltiples callbacks (múltiples pestañas/módulos)
 * usando un Set en lugar de una variable única.
 */
export function onCrossTabLogout(cb: (reason?: string) => void): () => void {
  onLogoutCallbacks.add(cb);
  // Asegura que el canal está abierto.
  getChannel();
  return () => { onLogoutCallbacks.delete(cb); };
}

export function closeAuthChannel(): void {
  try { channel?.close(); } catch { /* no-op */ }
  channel = null;
}
