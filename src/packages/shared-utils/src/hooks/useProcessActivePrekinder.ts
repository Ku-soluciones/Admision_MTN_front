import { useFeatureFlag } from './useFeatureFlag';

/** Consulta el interruptor público `process-active-prekinder`. */
export function useProcessActivePrekinder() {
  const { isEnabled, isLoading, error } = useFeatureFlag('process-active-prekinder');

  return {
    isProcessActive: isEnabled,
    isLoading,
    error: error ?? null,
  };
}
