/**
 * ProtectedProfessorRoute — guard unificado para rutas del portal de
 * profesores (TEACHER, COORDINATOR, CYCLE_DIRECTOR, PSYCHOLOGIST, ...).
 *
 * Reemplaza las dos copias divergentes que vivían en `features/evaluations`
 * y `features/interviews`. La versión anterior leía SÓLO de
 * `localStorage.currentProfessor` — un blob JSON spoofable desde DevTools
 * que permitía bypass del guard escribiendo `{"role":"TEACHER",...}` sin
 * jamás haber pasado por el BFF.
 *
 * Política de autorización (en orden):
 *
 * 1. **Durante `isLoading=true` (F5)**: fast-path por localStorage.
 *    Si existe `professor_token` env-prefixed Y `currentProfessor` con
 *    `role` en STAFF_ROLES, renderizamos el contenido (evita flash de
 *    spinner durante el bootstrap del authStore). El `professor_token`
 *    sólo lo escribe `professorAuthService.login` post-200 del BFF, así
 *    que su presencia es señal de login real.
 *
 * 2. **Post-bootstrap (`isLoading=false`)**: SOLO el `authStore.user.role`
 *    cuenta. Esto cierra el spoof: aunque alguien escriba `currentProfessor`
 *    en DevTools, sin `authStore.accessToken` válido el guard redirige.
 *
 * 3. **Sin sesión y sin fast-path**: `<Navigate to={loginPath} />`.
 *
 * El hook `useAuthHook` se inyecta porque cada feature tiene su propio
 * `useAuth()` (admin / admissions / student / coordinator). Si no se pasa,
 * el guard asume `isLoading=false` (sin bootstrap a esperar).
 */
import React, { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import {
  useAuthStore,
  getStorageKey,
  BASE_STORAGE_KEYS,
} from '../../../../backend-sdk/src/index';
import { isStaffRole } from '../../hooks/auth/roles';

export interface ProtectedProfessorRouteProps {
  children: ReactNode;
  /** Hook del context auth de la feature, aporta `isLoading`. */
  useAuthHook?: () => { isLoading: boolean };
  /** URL de redirect cuando no hay sesión. Default: `/profesor/login`. */
  loginPath?: string;
  /** Spinner / placeholder durante bootstrap si no hay fast-path. */
  loadingFallback?: ReactNode;
}

interface LegacyProfessorSnapshot {
  hasToken: boolean;
  isValid: boolean;
}

function readLegacyProfessorSnapshot(): LegacyProfessorSnapshot {
  if (typeof window === 'undefined' || !window.localStorage) {
    return { hasToken: false, isValid: false };
  }
  try {
    const professorToken = localStorage.getItem(getStorageKey(BASE_STORAGE_KEYS.PROFESSOR_TOKEN));
    const raw =
      localStorage.getItem(getStorageKey(BASE_STORAGE_KEYS.CURRENT_PROFESSOR))
      || localStorage.getItem('currentProfessor');
    if (!raw) return { hasToken: Boolean(professorToken), isValid: false };
    const data = JSON.parse(raw);
    const isValid =
      Boolean(data?.id)
      && Boolean(data?.email)
      && isStaffRole(data?.role);
    return { hasToken: Boolean(professorToken), isValid };
  } catch {
    return { hasToken: false, isValid: false };
  }
}

const DefaultSpinner: React.FC = () => (
  <div className="flex min-h-screen items-center justify-center bg-blanco-pureza">
    <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-azul-monte-tabor" />
  </div>
);

const ProtectedProfessorRoute: React.FC<ProtectedProfessorRouteProps> = ({
  children,
  useAuthHook,
  loginPath = '/profesor/login',
  loadingFallback,
}) => {
  // `isLoading` viene del feature context (puede no estar inyectado).
  const ctx = useAuthHook?.();
  const isLoading = Boolean(ctx?.isLoading);

  // Fuente canónica post-bootstrap: in-memory authStore.
  const storeUser = useAuthStore((s) => s.user);
  const storeToken = useAuthStore((s) => s.accessToken);
  const storeRoleOk = Boolean(storeToken) && isStaffRole(storeUser?.role as string | undefined);

  // Durante el bootstrap, evitamos el flash de spinner si hay rastro
  // confiable de sesión profesor en localStorage (professor_token +
  // currentProfessor con role válido). Después del bootstrap, esto se
  // ignora y sólo cuenta el store.
  if (isLoading) {
    if (storeRoleOk) return <>{children}</>;
    const legacy = readLegacyProfessorSnapshot();
    if (legacy.hasToken && legacy.isValid) return <>{children}</>;
    return <>{loadingFallback ?? <DefaultSpinner />}</>;
  }

  // Post-bootstrap: sólo el store cuenta. Cualquier `currentProfessor`
  // en localStorage sin sesión BFF activa se ignora.
  if (storeRoleOk) return <>{children}</>;

  // Limpieza defensiva del JSON spoofable para que no quede ruido tras
  // un guard fallido (el verdadero token ya lo limpia el interceptor).
  try {
    localStorage.removeItem(getStorageKey(BASE_STORAGE_KEYS.CURRENT_PROFESSOR));
    localStorage.removeItem('currentProfessor');
  } catch { /* no-op */ }

  return <Navigate to={loginPath} replace />;
};

export default ProtectedProfessorRoute;
