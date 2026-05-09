/**
 * Rehidratación de sesión al recargar la página (F5).
 *
 * Tras un F5 el access token se pierde (vivía en memoria). Sin embargo, si la
 * cookie HttpOnly del refresh sigue viva en el BFF, podemos pedir un nuevo
 * access token y restaurar la sesión sin pedir credenciales al usuario.
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

