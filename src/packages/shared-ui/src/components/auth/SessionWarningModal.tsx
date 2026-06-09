/**
 * SessionWarningModal — modal de aviso de inactividad.
 *
 * Se muestra `warnBeforeSeconds` antes de que la sesión expire por
 * inactividad. Ofrece al usuario dos acciones:
 *   - "Seguir trabajando" → ejecuta `onExtend()` (típicamente: cualquier
 *     llamada al BFF reseteará el `expiresAt` vía refresh proactivo). El
 *     gesto en sí mismo (click) ya resetea el timer del hook
 *     `useSessionTimeout`.
 *   - "Cerrar sesión"    → ejecuta `onLogout()` inmediatamente.
 *
 * Si el usuario no actúa, el manager de fuera disparará `onExpire` y
 * este modal se desmontará al cambiar `open=false`.
 *
 * El countdown se calcula localmente con setInterval; no asume nada del
 * SDK más allá del valor inicial en `secondsRemaining`.
 */
import React, { useEffect, useState } from 'react';

export interface SessionWarningModalProps {
  open: boolean;
  /** Segundos hasta el auto-logout. Se usa como semilla del countdown. */
  secondsRemaining: number;
  onExtend: () => void;
  onLogout: () => void;
}

const formatRemaining = (s: number): string => {
  const safe = Math.max(0, Math.floor(s));
  const m = Math.floor(safe / 60);
  const r = safe % 60;
  if (m <= 0) return `${r}s`;
  return `${m}m ${r.toString().padStart(2, '0')}s`;
};

const SessionWarningModal: React.FC<SessionWarningModalProps> = ({
  open,
  secondsRemaining,
  onExtend,
  onLogout,
}) => {
  const [remaining, setRemaining] = useState(secondsRemaining);

  // Reset del countdown cuando se vuelve a abrir o cambia la semilla.
  useEffect(() => {
    if (!open) return;
    setRemaining(secondsRemaining);
    const tick = setInterval(() => {
      setRemaining((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(tick);
  }, [open, secondsRemaining]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="session-warning-title"
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 px-4"
    >
      <div className="w-full max-w-sm bg-white rounded-xl shadow-xl p-6">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 2" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h2 id="session-warning-title" className="text-base font-semibold text-gray-900">
              ¿Sigues ahí?
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Tu sesión se cerrará por inactividad en{' '}
              <span className="font-semibold tabular-nums">{formatRemaining(remaining)}</span>.
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <button
            type="button"
            onClick={onLogout}
            className="px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md"
          >
            Cerrar sesión
          </button>
          <button
            type="button"
            onClick={onExtend}
            autoFocus
            className="px-4 py-2 text-sm font-semibold text-white bg-azul-monte-tabor hover:opacity-90 rounded-md"
          >
            Seguir trabajando
          </button>
        </div>
      </div>
    </div>
  );
};

export default SessionWarningModal;

