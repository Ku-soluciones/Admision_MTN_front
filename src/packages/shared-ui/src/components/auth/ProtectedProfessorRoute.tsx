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
import { useAuthStore } from '../../../../backend-sdk/src/index';
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

  // Nunca montar contenido protegido con snapshots persistidos: pueden estar
  // vencidos y provocan el patrón pantalla → 401 → login.
  if (isLoading) {
    if (storeRoleOk) return <>{children}</>;
    return <>{loadingFallback ?? <DefaultSpinner />}</>;
  }

  // Post-bootstrap: sólo el store cuenta. Cualquier `currentProfessor`
  // en localStorage sin sesión BFF activa se ignora.
  if (storeRoleOk) return <>{children}</>;

  return <Navigate to={loginPath} replace />;
};

export default ProtectedProfessorRoute;
