import { useQuery } from '@tanstack/react-query';

export interface AdmissionUIFlags {
  showIniciarPostulacion: boolean;
  showPostularHeader: boolean;
  showPostularOtroHijo: boolean;
}

export const DEFAULT_FLAGS: AdmissionUIFlags = {
  showIniciarPostulacion: true,
  showPostularHeader: true,
  showPostularOtroHijo: true,
};

const ALLOWED_KEYS: (keyof AdmissionUIFlags)[] = [
  'showIniciarPostulacion',
  'showPostularHeader',
  'showPostularOtroHijo',
];

const STALE_TIME = 1000 * 60 * 5; // 5 minutos

/** Normalize raw API response to AdmissionUIFlags, discarding unexpected types/keys */
function normalizeFlags(raw: unknown): AdmissionUIFlags {
  const result = { ...DEFAULT_FLAGS };
  if (raw && typeof raw === 'object') {
    for (const key of ALLOWED_KEYS) {
      const val = (raw as Record<string, unknown>)[key];
      result[key] = typeof val === 'boolean' ? val : DEFAULT_FLAGS[key];
    }
  }
  return result;
}

/**
 * Hook que obtiene los flags de UI de admisión desde Edge Config.
 * Fuente de verdad: /api/edge-config/admissionUI
 */
export function useAdmissionUIFlags() {
  return useQuery<AdmissionUIFlags>({
    queryKey: ['edge-config', 'admissionUI'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/edge-config/admissionUI', { cache: 'no-store' });
        if (!res.ok) throw new Error('Flag not found');
        const data = await res.json();
        return normalizeFlags(data);
      } catch {
        return DEFAULT_FLAGS;
      }
    },
    staleTime: STALE_TIME,
    retry: 1,
  });
}
