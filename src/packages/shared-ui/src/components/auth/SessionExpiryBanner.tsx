/**
 * SessionExpiryBanner — banner inline para login pages.
 *
 * Lee el query param `?reason=` que escribe el interceptor de `api.ts`
 * cuando fuerza un redirect tras una sesión perdida (expirada, revocada,
 * cerrada en otra pestaña, …) y muestra un mensaje específico para que
 * el usuario entienda por qué volvió al login.
 *
 * Razones soportadas (ver `reasonFromCode` en `backend-sdk/src/auth/errors.ts`):
 *   - expired   → access/refresh expirado por tiempo
 *   - other-tab → logout en otra pestaña del mismo origen
 *   - revoked   → sesión revocada server-side
 *   - invalid   → refresh token inválido
 *   - <code en minúsculas> → fallback genérico
 *
 * El banner es no-bloqueante: si no hay `reason` válida, no renderiza nada.
 * Si se renderiza, ofrece un botón "Cerrar" para descartarlo localmente.
 */
import React, { useMemo, useState } from 'react';

export interface SessionExpiryBannerProps {
  /** Razón cruda leída del query string. Pasa `searchParams.get('reason')`. */
  reason: string | null | undefined;
  /** Variante visual: portal admin/profesor usa tonos azules, apoderado idem. */
  variant?: 'default' | 'admin';
  /** Clase CSS extra para integrar con el layout del login. */
  className?: string;
}

interface BannerCopy {
  title: string;
  detail: string;
}

const COPY: Record<string, BannerCopy> = {
  expired: {
    title: 'Tu sesión expiró',
    detail: 'Por seguridad, debes iniciar sesión de nuevo para continuar.',
  },
  'other-tab': {
    title: 'Cerraste sesión en otra pestaña',
    detail: 'Tu sesión fue cerrada en otra ventana del navegador. Vuelve a iniciar sesión aquí.',
  },
  revoked: {
    title: 'Tu sesión fue cerrada',
    detail: 'Un administrador o tu propio cierre desde otro dispositivo terminó esta sesión. Inicia sesión nuevamente.',
  },
  invalid: {
    title: 'Sesión no válida',
    detail: 'No pudimos validar tu sesión anterior. Inicia sesión de nuevo para continuar.',
  },
};

const GENERIC: BannerCopy = {
  title: 'Inicia sesión para continuar',
  detail: 'Tu sesión anterior ya no está activa.',
};

function normalize(reason: string | null | undefined): string | null {
  if (!reason) return null;
  const r = reason.trim().toLowerCase();
  if (!r) return null;
  // Permitimos solo caracteres seguros (no inyectamos HTML, pero evitamos
  // que llegue cualquier string raro al copy resolver).
  if (!/^[a-z][a-z0-9_-]{0,40}$/.test(r)) return null;
  return r;
}

const SessionExpiryBanner: React.FC<SessionExpiryBannerProps> = ({
  reason,
  variant = 'default',
  className = '',
}) => {
  const [dismissed, setDismissed] = useState(false);
  const normalized = useMemo(() => normalize(reason), [reason]);

  if (!normalized || dismissed) return null;

  const copy = COPY[normalized] ?? GENERIC;

  const palette = variant === 'admin'
    ? {
        bg: 'bg-amber-50',
        border: 'border-amber-300',
        text: 'text-amber-900',
        title: 'text-amber-900',
        dismiss: 'text-amber-700 hover:text-amber-900',
      }
    : {
        bg: 'bg-amber-50',
        border: 'border-amber-300',
        text: 'text-amber-900',
        title: 'text-amber-900',
        dismiss: 'text-amber-700 hover:text-amber-900',
      };

  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex items-start gap-3 ${palette.bg} ${palette.border} ${palette.text} border rounded-lg px-4 py-3 ${className}`}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="w-5 h-5 mt-0.5 shrink-0"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v6" />
        <circle cx="12" cy="16.5" r="0.75" fill="currentColor" stroke="none" />
      </svg>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold ${palette.title}`}>{copy.title}</p>
        <p className="text-sm mt-0.5 opacity-90">{copy.detail}</p>
      </div>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Descartar mensaje"
        className={`text-xs font-medium ${palette.dismiss} shrink-0`}
      >
        Cerrar
      </button>
    </div>
  );
};

export default SessionExpiryBanner;

