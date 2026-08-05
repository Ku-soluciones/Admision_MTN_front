import { useEffect, useState, type PropsWithChildren } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { authStore, useAuthStore } from '../../../packages/backend-sdk/src/auth/store';
import { refreshAccessToken } from '../services/api';

export function PrekinderAdminGuard({ children }: PropsWithChildren) {
  const session = useAuthStore((state) => state);
  const location = useLocation();
  const [checking, setChecking] = useState(() => !authStore.getValidAccessToken());

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
    return () => { cancelled = true; };
  }, []);

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f4f1e9] text-slate-900">
        <p className="text-sm font-semibold" role="status">Verificando sesión administrativa…</p>
      </div>
    );
  }

  if (!authStore.getValidAccessToken() || !session.user) {
    const redirect = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?redirect=${redirect}`} replace />;
  }

  if (session.user.role !== 'ADMIN') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f4f1e9] px-6 text-slate-900">
        <div className="max-w-md rounded-2xl bg-white p-8 text-center shadow-[0_12px_35px_rgba(15,23,42,0.08)]" role="alert">
          <ShieldAlert className="mx-auto text-red-700" size={38} />
          <h1 className="mt-5 text-2xl font-bold">Acceso exclusivo para administración</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">Tu sesión es válida, pero no tiene el rol ADMIN requerido para ingresar al módulo Prekínder.</p>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}
