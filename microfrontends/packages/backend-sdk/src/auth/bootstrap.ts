/**
 * Rehidratación de sesión al recargar la página (F5).
 *
 * Tras un F5 el access token se pierde (vivía en memoria). Sin embargo, si la
 * cookie HttpOnly del refresh sigue viva en el BFF, podemos pedir un nuevo
 * access token y restaurar la sesión sin pedir credenciales al usuario.
 * 
 * Además, soporta handoff cross-origin: cuando se navega entre microfrontends,
 * el token de Firebase (mf_token) se intercambia automáticamente por un JWT
 * válido del BFF mediante /v1/auth/firebase-login.
 */
import { authStore } from './store';
import { scheduleRefresh } from './scheduleRefresh';

export interface BootstrapOptions {
  /**
   * Llama al endpoint de refresh y devuelve la nueva sesión, o null si la
   * cookie expiró/no existe. Debe usar el mismo cliente HTTP de la app
   * (con `withCredentials: true`).
   */
  refresh: () => Promise<{
    token: string;
    expiresIn: number;
    absoluteSessionSeconds?: number;
    user?: any;
    firebaseLinked?: boolean;
    sessionId?: string | null;
    permissions?: string[];
  } | null>;
  /** Callback de logout cuando el refresh falla — para programar el timer reactivo. */
  onRefreshFailure?: (error: unknown) => void;
  /** Si true (default), tras un bootstrap exitoso programa el refresh proactivo. */
  schedule?: boolean;
}

export async function bootstrapAuth(options: BootstrapOptions): Promise<boolean> {
  try {
    const data = await options.refresh();
    if (!data || !data.token) {
      authStore.clear();
      return false;
    }
    authStore.setSession({
      token: data.token,
      expiresIn: data.expiresIn,
      absoluteSessionSeconds: data.absoluteSessionSeconds,
      user: data.user,
      firebaseLinked: data.firebaseLinked,
      sessionId: data.sessionId,
      permissions: data.permissions,
    });
    if (options.schedule !== false) {
      scheduleRefresh(data.expiresIn, {
        refresh: async () => {
          const r = await options.refresh();
          return r ? { token: r.token, expiresIn: r.expiresIn, user: r.user, firebaseLinked: r.firebaseLinked } : null;
        },
        onFailure: options.onRefreshFailure,
      });
    }
    return true;
  } catch (err) {
    authStore.clear();
    options.onRefreshFailure?.(err);
    return false;
  }
}

/**
 * Intercambia un Firebase ID token (de cross-origin handoff) por una sesión BFF válida.
 * 
 * Cuando se navega entre microfrontends (ej: mf-guardian -> mf-admissions), el token
 * de Firebase se pasa via URL (mf_token). Esta función intercambia ese token por un
 * JWT del BFF y establece la sesión.
 * 
 * @param firebaseToken - El Firebase ID token (de localStorage, proveniente de otro MF)
 * @param api - Cliente HTTP configurado (axios o similar)
 * @param schedule - Si se debe programar el refresh automático (default: true)
 * @returns La sesión establecida o null si falló
 */
export async function exchangeFirebaseToken(
  firebaseToken: string,
  api: { post: (url: string, data?: any) => Promise<any> },
  schedule: boolean = true
): Promise<{ token: string; expiresIn: number; user?: any; firebaseLinked?: boolean } | null> {
  try {
    const res = await api.post('/v1/auth/firebase-login', { idToken: firebaseToken });
    const data = res.data;
    
    if (!data?.token || typeof data.expiresIn !== 'number') {
      return null;
    }
    
    authStore.setSession({
      token: data.token,
      expiresIn: data.expiresIn,
      absoluteSessionSeconds: data.absoluteSessionSeconds,
      user: data.user,
      firebaseLinked: data.firebaseLinked ?? true,
      sessionId: data.sessionId ?? null,
      permissions: data.permissions ?? [],
    });
    
    if (schedule) {
      scheduleRefresh(data.expiresIn, {
        refresh: async () => {
          try {
            const rr = await api.post('/v1/auth/refresh');
            const rd = rr.data || {};
            return rd.token && typeof rd.expiresIn === 'number'
              ? { token: rd.token, expiresIn: rd.expiresIn, user: rd.user, firebaseLinked: rd.firebaseLinked }
              : null;
          } catch {
            return null;
          }
        },
        onFailure: () => { authStore.clear(); },
      });
    }
    
    return {
      token: data.token,
      expiresIn: data.expiresIn,
      user: data.user,
      firebaseLinked: data.firebaseLinked ?? true,
    };
  } catch {
    return null;
  }
}

