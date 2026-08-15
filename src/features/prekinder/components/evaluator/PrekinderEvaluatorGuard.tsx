import { useEffect, useState, type PropsWithChildren } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import {
  authStore,
  useAuthStore,
} from "../../../../packages/backend-sdk/src/auth/store";
import { refreshAccessToken } from "../../services/api";
import type { SpecialtyProfile } from "./SpecialtyProfile";
import { PROFILE_TO_INSTRUMENT, PROFILE_TO_SHORT_INSTRUMENT } from "./SpecialtyProfile";
import type { EvaluatorWorkspace } from "../../services/api";

type GuardProps = PropsWithChildren<{
  profile: SpecialtyProfile;
  loginPath?: string;
}>;

function today() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Santiago",
  }).format(new Date());
}

export function PrekinderEvaluatorGuard({
  children,
  profile,
  loginPath = "/prekinder/evaluador/login",
}: GuardProps) {
  const session = useAuthStore((state) => state);
  const location = useLocation();
  const [workspace, setWorkspace] = useState<EvaluatorWorkspace | null>(() => {
    const raw = sessionStorage.getItem("pk-workspace-cache");
    return raw ? JSON.parse(raw) : null;
  });
  const [loading, setLoading] = useState(false);

  // DEBUG BYPASS
  const isDebugMode = (typeof window !== 'undefined' && window.localStorage.getItem('prekinder-debug') === '1') || new URLSearchParams(location.search).get("debug") === "1";

  if (isDebugMode) {
    return <>{children}</>;
  }

  useEffect(() => {
    if (workspace) return;
    if (!authStore.getValidAccessToken()) return;

    let cancelled = false;
    setLoading(true);

    // Try sessionStorage first
    const cached = sessionStorage.getItem("pk-workspace-cache");
    if (cached && !cancelled) {
      setWorkspace(JSON.parse(cached));
      setLoading(false);
      return;
    }

    // Fetch workspace
    import("../../services/api").then(({ prekinderApi }) => {
      if (cancelled) return;
      prekinderApi.evaluatorWorkspace(today())
        .then((ws) => {
          if (cancelled) return;
          setWorkspace(ws);
          sessionStorage.setItem("pk-workspace-cache", JSON.stringify(ws));
        })
        .catch(() => null)
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    });

    return () => { cancelled = true; };
  }, []);

  if (loading || !authStore.getValidAccessToken()) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="flex items-center gap-3 text-sm font-semibold" role="status">
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-blue-600" />
          Verificando tu sesión…
        </p>
      </div>
    );
  }

  if (!session.user) {
    const redirect = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`${loginPath}?redirect=${redirect}`} replace />;
  }

  // Check if the evaluator has access to this instrument
  const requiredShort = PROFILE_TO_SHORT_INSTRUMENT[profile];
  const hasAccess = workspace?.instruments.some(
    (w) => w.instrument.instrumentCode === requiredShort && w.instrument.active,
  );

  if (!hasAccess) {
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
            Tu sesión es válida, pero no tienes el instrumento de evaluación
            requerido para esta sección de Prekínder. Contacta a coordinación si
            crees que esto es un error.
          </p>
          <a
            href="/prekinder/evaluador/login"
            className="mt-6 inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Volver al inicio de sesión
          </a>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}
