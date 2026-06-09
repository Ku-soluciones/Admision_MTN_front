/**
 * AuthNavigationBridge — puente SPA-navigation para eventos de auth.
 *
 * El interceptor de `api.ts` y `SessionTimeoutManager` emiten eventos a
 * través del bus `onAuthEvent` cuando la sesión se pierde. Históricamente,
 * el redirect se hacía con `window.location.href = …` (full reload), lo
 * que descarta formularios en curso, pierde estado React y reinstancia
 * Firebase/QueryClient innecesariamente.
 *
 * Este componente vive dentro del `HashRouter` (en `AppProviders`) y, al
 * recibir un evento de pérdida de sesión, ejecuta una navegación SPA con
 * `react-router-dom`, preservando `state.from` para post-login redirect.
 *
 * Antes de navegar, marca `window.__authNavHandled = true` para que el
 * fallback `setTimeout(window.location.href…)` del interceptor sepa que
 * ya fue manejado y se aborte. Esto evita la doble navegación.
 *
 * Si el bridge no llegó a montarse (e.g. fallo de hidratación de React),
 * el fallback duro del interceptor sigue funcionando como safety net.
 */
import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { onAuthEvent, authStore } from '../../packages/backend-sdk/src/auth';

const ADMIN_PATH_HINTS = ['/admin', '/profesor', '/coordinador'] as const;

function resolveLoginTarget(pathname: string, reason: string): string {
  const isAdminLike = ADMIN_PATH_HINTS.some((p) => pathname.includes(p));
  const base = isAdminLike ? '/admin/login' : '/login';
  return `${base}?reason=${encodeURIComponent(reason)}`;
}

function extractReason(event: { type: string } & Record<string, unknown>): string {
  // El bus tipa cada evento; aquí accedemos defensivamente porque el
  // listener procesa el unión de todos los tipos.
  const code = typeof event.code === 'string' ? event.code : undefined;
  const reason = typeof event.reason === 'string' ? event.reason : undefined;
  return reason ?? code ?? event.type;
}

export function AuthNavigationBridge(): null {
  const navigate = useNavigate();
  const location = useLocation();

  // Recordamos si alguna vez observamos una sesión activa. Si nunca la
  // hubo durante la vida de este bridge, los eventos `expired`/`terminal`
  // provienen del bootstrap de un usuario no-logueado (401 en /refresh,
  // /check, /me) y NO debemos navegar al login — es ruido del arranque.
  const hadSessionRef = useRef(false);

  useEffect(() => {
    // Sembrar si ya hay sesión al montar.
    if (authStore.getValidAccessToken()) hadSessionRef.current = true;
    // Suscripción permanente: cualquier login posterior cuenta como
    // "sesión observada".
    const unsubStore = authStore.subscribe(() => {
      if (authStore.getState().accessToken) hadSessionRef.current = true;
    });
    return unsubStore;
  }, []);

  useEffect(() => {
    const off = onAuthEvent((evt) => {
      switch (evt.type) {
        case 'expired':
        case 'terminal':
        case 'cross-tab-logout':
        case 'idle-expire':
          break;
        default:
          return; // ignoramos refresh-succeeded / refresh-failed / idle-warn
      }

      // Guard: si nunca hubo sesión activa durante la vida de este
      // bridge, ignoramos. Cubre el caso del bootstrap de un usuario
      // no-logueado (POST /v1/auth/refresh → 401 REFRESH_INVALID).
      if (!hadSessionRef.current) return;

      // Si ya estamos en una login page, no naveguemos otra vez (loop).
      const currentPath = location.pathname;
      if (currentPath.includes('/login')) return;

      const reason = extractReason(evt as any);
      const target = resolveLoginTarget(currentPath, reason);

      // Señalar al interceptor que el redirect ya fue manejado para
      // abortar su fallback `window.location.href`.
      (window as any).__authNavHandled = true;

      // Navegación SPA conservando la URL previa para post-login redirect.
      navigate(target, {
        replace: true,
        state: { from: currentPath + location.search },
      });
    });
    return off;
  }, [navigate, location.pathname, location.search]);

  return null;
}

export default AuthNavigationBridge;

