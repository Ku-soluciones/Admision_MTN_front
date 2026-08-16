import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { LogoIcon } from "../../../admin/components/icons/Icons";
import { professorAuthService } from "../../../evaluations/services/professorAuthService";
import { getStorageKey, BASE_STORAGE_KEYS, clearOtherSessions } from "../../../../packages/backend-sdk/src/index";
import { prekinderApi } from "../../services/api";

function today() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Santiago",
  }).format(new Date());
}

const INSTRUMENT_TO_ROUTE: Record<string, string> = {
  ACADEMIC: "academic",
  PSYCHOMOTOR: "psychomotor",
  PSYCHOLOGY: "psychology",
  INDICATORS: "indicators",
  GROUP_OBSERVATION: "group-observation",
  SUPPORT: "support",
  DAP: "dap",
};

export function PrekinderEvaluatorLogin() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get("redirect") || "/prekinder/evaluador";
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError("Por favor completa todos los campos");
      return;
    }

    if (!email.includes("@mtn.cl")) {
      setError("Debe usar un email institucional (@mtn.cl)");
      return;
    }

    setIsLoggingIn(true);

    try {
      clearOtherSessions("professor");

      const response = await professorAuthService.login({
        email,
        password,
      });

      const u = (response as any).user;
      const respRole = u?.role || (response as any).role || "";
      const respFirstName = u?.firstName || (response as any).firstName || "";
      const respLastName = u?.lastName || (response as any).lastName || "";
      const respEmail = u?.email || (response as any).email || "";
      const respId = u?.id || (response as any).id || 0;

      if (response.success && response.token) {
        localStorage.setItem(getStorageKey(BASE_STORAGE_KEYS.CURRENT_PROFESSOR), JSON.stringify({
          id: respId,
          firstName: respFirstName,
          lastName: respLastName,
          email: respEmail,
          role: respRole,
        }));

        // PREKINDER_PROFESSIONAL va a su portal de instrumentos
        if (respRole === "PREKINDER_PROFESSIONAL") {
          try {
            const workspace = await prekinderApi.evaluatorWorkspace(today());
            const instruments = workspace.instruments
              .map((i) => i.instrument)
              .filter((inst) => inst.active);

            if (instruments.length === 0) {
              setError("No tienes instrumentos asignados. Contacta a coordinación.");
              return;
            }

            sessionStorage.setItem("pk-workspace-cache", JSON.stringify(workspace));

            if (instruments.length === 1) {
              const route = INSTRUMENT_TO_ROUTE[instruments[0].instrumentCode];
              if (route) {
                navigate(`/prekinder/evaluador/${route}`, { replace: true });
              } else {
                navigate(redirect, { replace: true });
              }
            } else {
              // Por ahora redirigir al primero; el selector se implementará después
              const route = INSTRUMENT_TO_ROUTE[instruments[0].instrumentCode];
              if (route) {
                navigate(`/prekinder/evaluador/${route}`, { replace: true });
              } else {
                navigate(redirect, { replace: true });
              }
            }
          } catch {
            setError("No pudimos cargar tu espacio de trabajo. Intenta nuevamente.");
          }
          return;
        }

        navigate(redirect, { replace: true });
      } else {
        setError(response.message || "Credenciales inválidas");
      }
    } catch (err) {
      setError("No pudimos conectar con el servidor. Intenta nuevamente.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 px-4">
      <div className="absolute top-8 left-8">
        <div className="flex items-center gap-2">
          <LogoIcon className="h-8 w-8" />
          <span className="font-bold text-azul-monte-tabor">Prekinder</span>
        </div>
      </div>

      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-xl">
          <div className="text-center">
            <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-xl bg-blue-100">
              <ShieldCheck className="h-7 w-7 text-blue-700" />
            </div>
            <h1 className="text-2xl font-black text-gray-900">
              Portal del Evaluador
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              Ingresa con tu cuenta institucional para acceder a la evaluación
              de postulantes Prekínder.
            </p>
          </div>

          <form onSubmit={handleLogin} className="mt-8 space-y-4">
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-gray-600">
                Correo institucional
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nombre@mtn.cl"
                className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-3 text-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                disabled={isLoggingIn}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-600">
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Tu contraseña"
                className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-3 text-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                disabled={isLoggingIn}
              />
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-azul-monte-tabor px-4 py-3 text-sm font-bold text-white hover:bg-blue-800 disabled:opacity-50"
            >
              {isLoggingIn ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Verificando…
                </>
              ) : (
                "Ingresar"
              )}
            </button>
          </form>

          <div className="mt-6 border-t border-gray-100 pt-6 text-center">
            <a
              href="/admin/prekinder"
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              ← Volver al panel de administración
            </a>
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-gray-400">
          Uso exclusivo de profesionales autorizados por coordinación.
        </p>
      </div>
    </div>
  );
}
