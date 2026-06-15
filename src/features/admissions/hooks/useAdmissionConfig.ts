import { useQuery } from '@tanstack/react-query';
import { getEdgeConfigItem } from '../../../packages/shared-utils/src/edgeConfig';
import type {
  AdmissionHome,
  AdmissionExams,
  AdmissionConfig,
} from '../types/admissionConfig';

const STALE_TIME = 1000 * 60 * 5; // 5 minutos

/**
 * Hook que obtiene la configuración del calendario de admisión
 * desde Vercel Edge Config.
 */
export function useAdmissionHome() {
  return useQuery<AdmissionHome>({
    queryKey: ['edge-config', 'admissionHome'],
    queryFn: () => getEdgeConfigItem<AdmissionHome>('admissionHome'),
    staleTime: STALE_TIME,
    retry: 2,
  });
}

/**
 * Hook que obtiene la información de exámenes de admisión
 * desde Vercel Edge Config.
 */
export function useAdmissionExams() {
  return useQuery<AdmissionExams>({
    queryKey: ['edge-config', 'admissionExams'],
    queryFn: () => getEdgeConfigItem<AdmissionExams>('admissionExams'),
    staleTime: STALE_TIME,
    retry: 2,
  });
}

/**
 * Hook combinado que obtiene toda la config de admisión.
 */
export function useAdmissionConfig(): {
  data: AdmissionConfig | undefined;
  isLoading: boolean;
  isError: boolean;
} {
  const home = useAdmissionHome();
  const exams = useAdmissionExams();

  return {
    data:
      home.data && exams.data
        ? { admissionHome: home.data, admissionExams: exams.data }
        : undefined,
    isLoading: home.isLoading || exams.isLoading,
    isError: home.isError || exams.isError,
  };
}

