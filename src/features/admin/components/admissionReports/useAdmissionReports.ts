import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import dashboardClient from '../../../../packages/shared-ui/src/src/api/dashboard.client';
import type {
  CourseApplicant,
  ApplicantCard,
  CourseApplicantsResponse,
  ApplicantCardResponse
} from '../../../../packages/shared-ui/src/src/api/dashboard.types';

interface UseAdmissionReportsResult {
  academicYear: number;
  setAcademicYear: (year: number) => void;
  rows: CourseApplicant[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
  selectedCard: ApplicantCard | null;
  cardLoading: boolean;
  cardError: string | null;
  openCard: (applicationId: number) => void;
  closeCard: () => void;
  retryCard: () => void;
  meta: { academicYear: number; total: number } | null;
  refreshedAt: Date | null;
}

export function useAdmissionReports(initialAcademicYear?: number): UseAdmissionReportsResult {
  const defaultYear = initialAcademicYear || new Date().getFullYear() + 1;
  const [academicYear, setAcademicYear] = useState<number>(defaultYear);
  const [rows, setRows] = useState<CourseApplicant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<{ academicYear: number; total: number } | null>(null);
  const [refreshedAt, setRefreshedAt] = useState<Date | null>(null);
  const lastRefreshRef = useRef(0);

  const [selectedCard, setSelectedCard] = useState<ApplicantCard | null>(null);
  const [selectedApplicationId, setSelectedApplicationId] = useState<number | null>(null);
  const [cardLoading, setCardLoading] = useState(false);
  const [cardError, setCardError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response: CourseApplicantsResponse = await dashboardClient.getCourseApplicants(academicYear);
      setRows(response.data || []);
      setMeta(response.meta || null);
      setRefreshedAt(new Date());
      lastRefreshRef.current = Date.now();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando postulantes');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [academicYear]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const refreshWhenReturning = () => {
      if (Date.now() - lastRefreshRef.current > 120_000) void fetchData();
    };
    window.addEventListener('focus', refreshWhenReturning);
    return () => window.removeEventListener('focus', refreshWhenReturning);
  }, [fetchData]);

  const loadCard = useCallback(async (applicationId: number) => {
    setCardLoading(true);
    setCardError(null);
    setSelectedCard(null);
    try {
      const response: ApplicantCardResponse = await dashboardClient.getApplicantCard(applicationId);
      setSelectedCard(response.data);
    } catch (err) {
      setCardError(err instanceof Error ? err.message : 'Error cargando ficha del postulante');
    } finally {
      setCardLoading(false);
    }
  }, []);

  const openCard = useCallback((applicationId: number) => {
    setSelectedApplicationId(applicationId);
    void loadCard(applicationId);
  }, [loadCard]);

  const retryCard = useCallback(() => {
    if (selectedApplicationId != null) void loadCard(selectedApplicationId);
  }, [loadCard, selectedApplicationId]);

  const closeCard = useCallback(() => {
    setSelectedCard(null);
    setCardError(null);
    setSelectedApplicationId(null);
  }, []);

  return useMemo(
    () => ({
      academicYear,
      setAcademicYear,
      rows,
      loading,
      error,
      refresh: fetchData,
      selectedCard,
      cardLoading,
      cardError,
      openCard,
      closeCard,
      retryCard,
      meta,
      refreshedAt
    }),
    [academicYear, rows, loading, error, fetchData, selectedCard, cardLoading, cardError, openCard, closeCard, retryCard, meta, refreshedAt]
  );
}
