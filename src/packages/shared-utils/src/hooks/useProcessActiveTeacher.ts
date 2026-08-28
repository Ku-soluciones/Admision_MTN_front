import { useFeatureFlag } from './useFeatureFlag';

/**
 * Hook que consulta el estado del flag `process-active-teacher`.
 *
 * Cuando el flag está en `false`, no hay un proceso de postulación activo
 * y se debe impedir el inicio de sesión de profesores/evaluadores.
 *
 * @returns {object}
 *  - `isProcessActive`: boolean — si el proceso está activo
 *  - `isLoading`: boolean — si se está evaluando el flag
 *  - `error`: Error | null
 */
export function useProcessActiveTeacher() {
  const { isEnabled, isLoading, error } = useFeatureFlag('process-active-teacher');

  return {
    isProcessActive: isEnabled,
    isLoading,
    error: error ?? null,
  };
}
