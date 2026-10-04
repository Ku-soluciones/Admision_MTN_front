import { statusRequestError } from '../../../../packages/shared-ui/src/utils/applicationStatusPolicy';
import { useCallback, useEffect, useMemo, useState } from 'react';
import dashboardClient from '../../../../packages/shared-ui/src/src/api/dashboard.client';
import type {
  FinalDecision,
  FinalSummaryApplicant,
  FinalSummaryResponse
} from '../../../../packages/shared-ui/src/src/api/dashboard.types';

export function useFinalSummary(academicYear: number) {
  const [rows, setRows] = useState<FinalSummaryApplicant[]>([]);
  const [meta, setMeta] = useState<FinalSummaryResponse['meta'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await dashboardClient.getFinalSummary(academicYear);
      setRows(response.data || []);
      setMeta(response.meta || null);
    } catch (err) {
      setRows([]);
      setError(err instanceof Error ? err.message : 'No se pudo cargar el resumen final');
    } finally {
      setLoading(false);
    }
  }, [academicYear]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const updateDecision = useCallback(async (applicationId: number, decision: FinalDecision) => {
    setSavingId(applicationId);
    try {
      const response = await dashboardClient.updateFinalDecision(applicationId, decision);
      setRows((current) => current.map((row) => row.applicationId === applicationId
        ? { ...row, status: response.data.status, statusLabel: response.data.statusLabel, allowedStatusTransitions: response.data.allowedStatusTransitions, statusChangeBlockedReason: response.data.statusChangeBlockedReason }
        : row));
      return response.message;
    } catch (error) {
      await refresh();
      throw new Error(statusRequestError(error));
    } finally {
      setSavingId(null);
    }
  }, [refresh]);

  return useMemo(() => ({ rows, meta, loading, error, savingId, refresh, updateDecision }), [rows, meta, loading, error, savingId, refresh, updateDecision]);
}
