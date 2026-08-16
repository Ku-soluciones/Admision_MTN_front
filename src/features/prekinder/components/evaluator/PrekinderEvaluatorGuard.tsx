import { useEffect, useState, type PropsWithChildren } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import {
  authStore,
  useAuthStore,
} from "../../../../packages/backend-sdk/src/auth/store";
import { refreshAccessToken } from "../../services/api";
import type { SpecialtyProfile } from "./SpecialtyProfile";
import { PROFILE_ROLES } from "./SpecialtyProfile";

type GuardProps = PropsWithChildren<{
  profile: SpecialtyProfile;
  loginPath?: string;
}>;

export function PrekinderEvaluatorGuard({
  children,
  profile,
  loginPath = "/prekinder/evaluador/login",
}: GuardProps) {
  const session = useAuthStore((state) => state);
  const location = useLocation();
  const [checking, setChecking] = useState(
    () => !authStore.getValidAccessToken(),
  );

  const requiredRole = PROFILE_ROLES[profile];

  useEffect(() => {
    if (authStore.getValidAccessToken()) {
      setChecking(false);
      return;
    }
    let cancelled = false;
    setChecking(true);
    void refreshAccessToken()
      .catch(() => null)
      .finally(() => {
        if (!cancelled) setChecking(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="flex items-center gap-3 text-sm font-semibold" role="status">
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-blue-600" />
          Verificando tu sesión…
        </p>
      </div>
    );
  }

  if (!authStore.getValidAccessToken() || !session.user) {
    const redirect = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`${loginPath}?redirect=${redirect}`} replace />;
  }

  // PREKINDER_PROFESSIONAL es un rol genérico que puede acceder a cualquier instrumento
  const isGenericEvaluator = session.user.role === "PREKINDER_PROFESSIONAL";
  if (!isGenericEvaluator && session.user.role !== requiredRole) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 px-6">
        <div
          className="max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-lg"
          role="alert"
        >
          <ShieldAlert className="mx-auto text-red-700" size={38} />
          <h1 className="mt-5 text-2xl font-bold">
            Este espacio no está asignado a tu perfil
          </h1>
          <p className="mt-3 text-sm leading-6 text-gray-600">
            Tu sesión es válida, pero no tienes el rol de evaluador requerido para
            esta sección de Prekínder. Por favor, contacta a coordinación si
            crees que esto es un error.
          </p>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}
