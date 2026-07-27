import { useQuery } from '@tanstack/react-query';

interface FlagResponse {
  enabled: boolean;
}

interface UseFeatureFlagResult {
  isEnabled: boolean;
  isLoading: boolean;
  error: Error | null;
}

export function useFeatureFlag(flagKey: string): UseFeatureFlagResult {
  const { data, isLoading, error } = useQuery<FlagResponse>({
    queryKey: ['flag', flagKey],
    queryFn: async () => {
      const res = await fetch(`/api/flags/${flagKey}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
        },
      });

      if (!res.ok) {
        throw new Error(`Error al evaluar el flag ${flagKey}`);
      }

      return res.json();
    },
    staleTime: 0,
    gcTime: 30 * 1000,
    retry: 2,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });

  return {
    isEnabled: data?.enabled ?? false,
    isLoading,
    error: error ?? null,
  };
}
