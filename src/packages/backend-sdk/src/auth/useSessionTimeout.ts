/**
 * Hook React para auto-logout por inactividad y por hard-cap absoluto.
 *
 * - Inactividad: resetea timers ante eventos de mouse/teclado/tactil/visibilidad.
 *   Dispara `onWarn` poco antes de expirar y `onExpire` al consumirse el tiempo.
 * - Hard-cap absoluto: cierra la sesión cuando se cumple `absoluteExpiresAt`
 *   del store, sin importar la actividad reciente.
 *
 * El hook se ofrece desde el SDK para que cada MF lo consuma sin reimplementarlo.
 */
import { useEffect, useRef } from 'react';
import { authStore } from './store';

export interface UseSessionTimeoutOptions {
  /** Minutos de inactividad permitidos. Default: VITE_SESSION_INACTIVITY_MIN o 20. */
  inactivityMinutes?: number;
  /** Segundos antes de expirar para mostrar el modal de aviso. Default: VITE_SESSION_WARN_BEFORE_SEC o 60. */
  warnBeforeSeconds?: number;
}

const EVENTS: string[] = [
  'mousemove',
  'keydown',
  'click',
  'scroll',
  'touchstart',
  'visibilitychange',
];

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

export function useSessionTimeout(
  onWarn: () => void,
  onExpire: () => void,
  options: UseSessionTimeoutOptions = {},
): void {
  const warnT = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const expT = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const absT = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    const inactivityMin = options.inactivityMinutes ?? readEnvNumber('VITE_SESSION_INACTIVITY_MIN', 20);
    const warnBeforeSec = options.warnBeforeSeconds ?? readEnvNumber('VITE_SESSION_WARN_BEFORE_SEC', 60);
    const inactivityMs = inactivityMin * 60_000;
    const warnBeforeMs = warnBeforeSec * 1000;

    const reset = (): void => {
      if (warnT.current) clearTimeout(warnT.current);
      if (expT.current) clearTimeout(expT.current);
      warnT.current = setTimeout(onWarn, Math.max(inactivityMs - warnBeforeMs, 1000));
      expT.current = setTimeout(onExpire, inactivityMs);
    };

    EVENTS.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();

    // Hard-cap absoluto: cierra sesión cuando se cumple `absoluteExpiresAt`.
    const absExp = authStore.getState().absoluteExpiresAt;
    if (absExp) {
      const ms = absExp - Date.now();
      if (ms > 0) absT.current = setTimeout(onExpire, ms);
      else onExpire();
    }

    return () => {
      EVENTS.forEach((e) => window.removeEventListener(e, reset));
      if (warnT.current) clearTimeout(warnT.current);
      if (expT.current) clearTimeout(expT.current);
      if (absT.current) clearTimeout(absT.current);
    };
  }, [onWarn, onExpire, options.inactivityMinutes, options.warnBeforeSeconds]);
}



