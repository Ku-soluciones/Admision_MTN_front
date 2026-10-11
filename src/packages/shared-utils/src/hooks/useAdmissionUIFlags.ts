import { useQuery } from '@tanstack/react-query';

export interface AdmissionUIFlags {
  showIniciarPostulacion: boolean;
  showPostularHeader: boolean;
  showPostularOtroHijo: boolean;
}

/** Lee valores del entorno, castea a booleano. Defaults a false si no está definido */
function getEnvFlags(): AdmissionUIFlags {
  const show = import.meta.env.VITE_SHOW_POSTULACION === 'true';
  return {
    showIniciarPostulacion: show,
    showPostularHeader: show,
    showPostularOtroHijo: show,
  };
}

/**
 * Hook que obtiene los flags de UI de admisión desde variables de entorno.
 * Cambiar los valores en .env y redeployar para aplicar.
 */
export function useAdmissionUIFlags() {
  return useQuery<AdmissionUIFlags>({
    queryKey: ['env-flags'],
    queryFn: getEnvFlags,
    // No stale time porque los valores vienen del build, no cambian en runtime
    staleTime: Infinity,
  });
}
