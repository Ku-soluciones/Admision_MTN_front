import { useQuery } from '@tanstack/react-query';

export interface AdmissionUIFlags {
  showIniciarPostulacion: boolean;
  showPostularHeader: boolean;
  showCrearCuentaLogin: boolean;
  showPostularOtroHijo: boolean;
}

const STALE_TIME = 1000 * 60 * 5; // 5 minutos

const DEFAULT_FLAGS: AdmissionUIFlags = {
  showIniciarPostulacion: true,
  showPostularHeader: true,
  showCrearCuentaLogin: true,
  showPostularOtroHijo: true,
};

/**
 * Hook que obtiene los flags de UI de admisión desde Edge Config.
 * Controla qué botones UI son visibles para los usuarios.
 */
export function useAdmissionUIFlags() {
  return useQuery<AdmissionUIFlags>({
    queryKey: ['edge-config', 'admissionUI'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/edge-config/admissionUI', { cache: 'no-store' });
        if (!res.ok) throw new Error('Flag not found');
        const data = await res.json();
        return { ...DEFAULT_FLAGS, ...data };
      } catch {
        return DEFAULT_FLAGS;
      }
    },
    staleTime: STALE_TIME,
    retry: 1,
  });
}
