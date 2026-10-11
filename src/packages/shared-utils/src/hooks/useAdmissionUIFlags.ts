import { useQuery } from '@tanstack/react-query';

export interface AdmissionUIFlags {
  showIniciarPostulacion: boolean;
  showPostularHeader: boolean;
  showPostularOtroHijo: boolean;
}

/** Lee valores del entorno, castea a booleano. Defaults a false si no está definido */
function getEnvFlags(): AdmissionUIFlags {
  return {
    showIniciarPostulacion: import.meta.env.VITE_SHOW_INICIAR_POSTULACION === 'true',
    showPostularHeader: import.meta.env.VITE_SHOW_POSTULAR_HEADER === 'true',
    showPostularOtroHijo: import.meta.env.VITE_SHOW_POSTULAR_OTRO_HIJO === 'true',
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
