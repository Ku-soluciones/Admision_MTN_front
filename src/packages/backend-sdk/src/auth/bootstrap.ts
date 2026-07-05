/**
 * Rehidratación de sesión al recargar la página (F5).
 *
 * Tras un F5 el access token se pierde (vivía en memoria). Sin embargo, si la
 * cookie HttpOnly del refresh sigue viva en el BFF, podemos pedir un nuevo
 * access token y restaurar la sesión sin pedir credenciales al usuario.
 * 
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
      // Cola compartida: el refresh proactivo no debe pasar un callback
      // onFailure que limpie el store; el interceptor reactivo decide qué
      // hacer si la sesión realmente expiró.
      scheduleRefresh(data.expiresIn);
    }
    return true;
  } catch (err) {
    authStore.clear();
    options.onRefreshFailure?.(err);
    return false;
  }
}

/**
 * Intercambia un Firebase ID token por una sesión BFF válida.
 * 
 * @param firebaseToken - El Firebase ID token a intercambiar.
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
      // Cola compartida: evita refresh simultáneo con el interceptor.
      // No onFailure: un refresh proactivo fallido no debe cerrar la sesión.
      scheduleRefresh(data.expiresIn);
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
