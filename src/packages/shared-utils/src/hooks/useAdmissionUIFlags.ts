import { useQuery } from '@tanstack/react-query';

export interface AdmissionUIFlags {
  showIniciarPostulacion: boolean;
  showPostularHeader: boolean;
  showCrearCuentaLogin: boolean;
  showPostularOtroHijo: boolean;
}

export const DEFAULT_FLAGS: AdmissionUIFlags = {
  showIniciarPostulacion: true,
  showPostularHeader: true,
  showCrearCuentaLogin: true,
  showPostularOtroHijo: true,
};

const STORAGE_KEY = 'admission_ui_flags';
const STALE_TIME = 1000 * 60 * 5; // 5 minutos

const ALLOWED_KEYS: (keyof AdmissionUIFlags)[] = [
  'showIniciarPostulacion',
  'showPostularHeader',
  'showCrearCuentaLogin',
  'showPostularOtroHijo',
];

/** Normalize a value to boolean, discarding unexpected types or keys */
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

/** Get flags from localStorage if available */
function getLocalFlags(): AdmissionUIFlags | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return normalizeFlags(JSON.parse(stored));
    }
  } catch { /* ignore */ }
  return null;
}

/**
 * Hook que obtiene los flags de UI de admisión.
 * Prioridad: localStorage > Edge Config > DEFAULT_FLAGS
 */
export function useAdmissionUIFlags() {
  return useQuery<AdmissionUIFlags>({
    queryKey: ['edge-config', 'admissionUI'],
    queryFn: async () => {
      // Check localStorage first
      const local = getLocalFlags();
      if (local) return local;

      // Fall back to Edge Config
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
