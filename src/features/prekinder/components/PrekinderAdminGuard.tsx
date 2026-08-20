import { useEffect, useState, type PropsWithChildren } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import {
  authStore,
  useAuthStore,
} from "../../../packages/backend-sdk/src/auth/store";
import { refreshAccessToken } from "../services/api";

type GuardProps = PropsWithChildren<{ roles?: string[]; loginPath?: string }>;

export function PrekinderAdminGuard({
  children,
  roles = ["ADMIN", "COORDINATOR", "CYCLE_DIRECTOR", "PREKINDER_PROFESSIONAL"],
  loginPath = "/login",
}: GuardProps) {
  const session = useAuthStore((state) => state);
  const location = useLocation();
  const [checking, setChecking] = useState(
    () => !authStore.getValidAccessToken(),
  );

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
      <div className="pk-page flex items-center justify-center">
        <p className="flex items-center gap-3 text-sm font-semibold" role="status">
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-dorado-nazaret" />
          Verificando tu sesión…
        </p>
      </div>
    );
  }

  if (!authStore.getValidAccessToken() || !session.user) {
    const redirect = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`${loginPath}?redirect=${redirect}`} replace />;
  }

  if (!roles.includes(String(session.user.role))) {
    return (
      <main className="pk-page flex items-center justify-center px-6">
        <div
          className="pk-panel max-w-md p-8 text-center shadow-[0_16px_40px_rgba(30,58,138,0.08)]"
          role="alert"
        >
          <ShieldAlert className="mx-auto text-red-700" size={38} />
          <h1 className="mt-5 text-2xl font-bold">
            Este espacio no está asignado a tu perfil
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Tu sesión es válida, pero no tiene un rol habilitado para esta
            sección de Prekínder.
          </p>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}
