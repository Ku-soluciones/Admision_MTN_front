import { useFeatureFlag } from './useFeatureFlag';

/**
 * Hook que consulta el estado del flag `process-active-guard`.
 *
 * Cuando el flag está en `false`, no hay un proceso de postulación activo
 * para familias/apoderados.
 */
export function useProcessActiveGuard() {
  const { isEnabled, isLoading, error } = useFeatureFlag('process-active-guard');

  return {
    isProcessActive: isEnabled,
    isLoading,
    error: error ?? null,
  };
}
