/**
 * Refresh proactivo del access token.
 *
 * Programa un único timer global que dispara `POST /api/auth/refresh` antes
 * de que expire el access token. El refresh viaja por cookie HttpOnly, así
 * que el front sólo necesita disparar la llamada con `withCredentials: true`.
 */
import { authStore } from './store';

/** Lee una variable VITE_* desde import.meta.env o globalThis sin romper en
 *  entornos donde `import.meta` no está disponible (tests, CommonJS). */
function readEnvNumber(key: string, fallback: number): number {
  try {
    const meta: any = (Function('return import.meta')() as any) ?? {};
    const raw = meta?.env?.[key];
    if (raw === undefined || raw === null || raw === '') return fallback;
    const n = Number(raw);
    return Number.isFinite(n) ? n : fallback;
  } catch {
    return fallback;
  }
}

export interface ScheduleRefreshOptions {
  /**
   * Función que ejecuta la llamada de refresh y devuelve el nuevo access token
   * + `expiresIn`. Debe usar el mismo cliente HTTP que la app (con
   * `withCredentials: true`) para que la cookie del refresh se envíe.
   */
  refresh: () => Promise<{ token: string; expiresIn: number; user?: any; firebaseLinked?: boolean } | null>;
  /** Callback cuando el refresh falla — típicamente forzar logout/redirect. */
  onFailure?: (error: unknown) => void;
  /** Segundos de anticipación con respecto al exp del access. Default 60. */
  leadSeconds?: number;
}

let timer: ReturnType<typeof setTimeout> | undefined;
let currentOptions: ScheduleRefreshOptions | null = null;

export function scheduleRefresh(expiresIn: number, options?: ScheduleRefreshOptions): void {
  if (options) currentOptions = options;
  if (!currentOptions) return;

  cancelScheduledRefresh();

  const lead = currentOptions.leadSeconds ?? readEnvNumber('VITE_REFRESH_LEAD_SEC', 60);
  const delayMs = Math.max(expiresIn - lead, 5) * 1000;

  timer = setTimeout(async () => {
    try {
      const result = await currentOptions!.refresh();
      if (!result) {
        cancelScheduledRefresh();
        return;
      }
      authStore.updateAccessToken(result.token, result.expiresIn, result.user ?? undefined);
      if (typeof result.firebaseLinked === 'boolean') {
        authStore.setFirebaseLinked(result.firebaseLinked);
      }
      // Re-programa con la nueva expiración.
      scheduleRefresh(result.expiresIn);
    } catch (err) {
      cancelScheduledRefresh();
      authStore.clear();
      currentOptions?.onFailure?.(err);
    }
  }, delayMs);
}

export function cancelScheduledRefresh(): void {
  if (timer) {
    clearTimeout(timer);
    timer = undefined;
  }
}

export function isRefreshScheduled(): boolean {
  return Boolean(timer);
}
