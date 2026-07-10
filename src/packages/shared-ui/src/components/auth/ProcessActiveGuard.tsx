import React from 'react';
import { useProcessActiveTeacher } from '../../../../shared-utils/src/hooks/useProcessActiveTeacher';
import {
  authStore,
  getStorageKey,
  BASE_STORAGE_KEYS,
} from '../../../../backend-sdk/src/index';

interface ProcessActiveGuardProps {
  children: React.ReactNode;
  /** Componente opcional a mostrar cuando el proceso está inactivo */
  fallback?: React.ReactNode;
}

/**
 * Guard que bloquea el contenido (típicamente un formulario de login)
 * cuando el flag `process-active-teacher` está en `false`.
 *
 * Si el proceso de admisión no está activo, muestra un mensaje informativo
 * en lugar del contenido protegido (children).
 */
const ProcessActiveGuard: React.FC<ProcessActiveGuardProps> = ({ children, fallback }) => {
  const { isProcessActive, isLoading } = useProcessActiveTeacher();
  const hasStaffSession = Boolean(authStore.getValidAccessToken())
    || (typeof window !== 'undefined' && Boolean(localStorage.getItem(getStorageKey(BASE_STORAGE_KEYS.PROFESSOR_TOKEN))));

  if (hasStaffSession) {
    return <>{children}</>;
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-azul-monte-tabor" />
      </div>
    );
  }

  if (!isProcessActive) {
    if (fallback) return <>{fallback}</>;

    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-white px-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-lg">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
            <svg
              className="h-8 w-8 text-amber-600"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h2 className="mb-2 text-xl font-semibold text-gray-800">
            Proceso de postulación no activo
          </h2>
          <p className="text-sm text-gray-600">
            Actualmente no hay un proceso de admisión activo. Por favor, intente nuevamente
            cuando se habilite un nuevo período de postulación.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProcessActiveGuard;

