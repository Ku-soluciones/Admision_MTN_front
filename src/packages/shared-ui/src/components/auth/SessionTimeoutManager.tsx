/**
 * SessionTimeoutManager — orquesta el auto-logout por inactividad.
 *
 * Diseñado para vivir cerca de la raíz de la app, fuera de cualquier
 * página específica. Se auto-desactiva cuando NO hay sesión activa
 * (`authStore.accessToken === null`), así que es seguro renderizarlo
 * siempre, incluso en login pages.
 *
 * Cuando hay sesión:
 *   - Inicia los timers de `useSessionTimeout` (inactividad + hard-cap).
 *   - A los N segundos antes de expirar (`VITE_SESSION_WARN_BEFORE_SEC`,
 *     default 60), muestra `<SessionWarningModal />`.
 *   - Si el usuario clickea "Seguir trabajando", llama a `/api/auth/check`
 *     (request idempotente, no destructivo) para resetear `expiresAt` via
 *     refresh proactivo si corresponde, y cierra el modal.
 *   - Si pasa el tiempo sin acción, se ejecuta `onExpire`: limpiamos el
 *     store, broadcast logout y redirigimos con `?reason=expired`.
 *
 * Sin sesión: no hace nada y no monta el modal.
 *
 * Riesgo: 0 — el componente sólo lee `authStore`, no llama auth APIs
 * que puedan cambiar contratos. La llamada en "Seguir trabajando" usa
 * el endpoint sonda `/api/auth/check` que ya existe.
 */
import React, { useCallback, useState } from 'react';
import {
  authStore,
  useAuthStore,
  useSessionTimeout,
  broadcastLogout,
  emitAuthEvent,
} from '../../../../backend-sdk/src/index';
import api from '../../services/api';
import SessionWarningModal from './SessionWarningModal';

interface SessionTimeoutManagerProps {
  /** Minutos de inactividad. Default: env VITE_SESSION_INACTIVITY_MIN o 20. */
  inactivityMinutes?: number;
  /** Segundos antes de expirar para el warn. Default: env VITE_SESSION_WARN_BEFORE_SEC o 60. */
  warnBeforeSeconds?: number;
}

function readEnvNumber(key: string, fallback: number): number {
  try {
    const meta: any = (import.meta as any).env;
    const raw = meta?.[key];
    if (raw === undefined || raw === null || raw === '') return fallback;
    const n = Number(raw);
    return Number.isFinite(n) ? n : fallback;
  } catch {
    return fallback;
  }
}

function getCurrentReasonRoute(): string {
  const path = window.location.pathname;
  const isAdmin = path.includes('/admin') || path.includes('/profesor');
  return isAdmin ? '/admin/login?reason=expired' : '/login?reason=expired';
}

const SessionTimeoutManagerInner: React.FC<Required<SessionTimeoutManagerProps>> = ({
  inactivityMinutes,
  warnBeforeSeconds,
}) => {
  const [warnOpen, setWarnOpen] = useState(false);

  const handleWarn = useCallback(() => {
    setWarnOpen(true);
    emitAuthEvent({ type: 'idle-warn', warnBeforeSeconds });
  }, [warnBeforeSeconds]);

  const handleExpire = useCallback(() => {
    setWarnOpen(false);
    emitAuthEvent({ type: 'idle-expire', cause: 'inactivity' });
    try { authStore.clear(); } catch { /* no-op */ }
    try { broadcastLogout('expired'); } catch { /* no-op */ }
    if (typeof window !== 'undefined') {
      window.location.href = getCurrentReasonRoute();
    }
  }, []);

  // Wire de los timers (inactividad + hard-cap absoluto).
  useSessionTimeout(handleWarn, handleExpire, {
    inactivityMinutes,
    warnBeforeSeconds,
  });

  const handleExtend = useCallback(async () => {
    setWarnOpen(false);
    // Llamada idempotente. Si la sesión sigue válida, el interceptor
    // de `api.ts` programa refresh proactivo si el access está por
    // caducar. No tocamos /auth/refresh directamente para no acoplar
    // este componente al contrato del refresh.
    try { await api.get('/api/auth/check'); } catch { /* silencioso */ }
  }, []);

  const handleLogoutFromModal = useCallback(() => {
    handleExpire();
  }, [handleExpire]);

  return (
    <SessionWarningModal
      open={warnOpen}
      secondsRemaining={warnBeforeSeconds}
      onExtend={handleExtend}
      onLogout={handleLogoutFromModal}
    />
  );
};

const SessionTimeoutManager: React.FC<SessionTimeoutManagerProps> = ({
  inactivityMinutes,
  warnBeforeSeconds,
}) => {
  // Sólo armamos los timers si hay sesión activa. Esto evita que el
  // modal se muestre en login pages y que `useSessionTimeout` registre
  // listeners innecesariamente.
  const hasSession = useAuthStore((s) => Boolean(s.accessToken));
  if (!hasSession) return null;

  const inact = inactivityMinutes ?? readEnvNumber('VITE_SESSION_INACTIVITY_MIN', 20);
  const warn = warnBeforeSeconds ?? readEnvNumber('VITE_SESSION_WARN_BEFORE_SEC', 60);

  return <SessionTimeoutManagerInner inactivityMinutes={inact} warnBeforeSeconds={warn} />;
};

export default SessionTimeoutManager;

