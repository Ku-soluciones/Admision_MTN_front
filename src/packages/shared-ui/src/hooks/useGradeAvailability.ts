import { useState, useEffect, useCallback } from 'react';
import { gradeAvailabilityService } from '../services/gradeAvailabilityService';
import type { GradeAvailability, GradeAvailabilityUpdate } from '../types/gradeAvailability';

interface UseGradeAvailabilityReturn {
  grades: GradeAvailability[];
  loading: boolean;
  error: string | null;
  saveGrades: (updates: GradeAvailabilityUpdate[]) => Promise<boolean>;
  refetch: () => Promise<void>;
}

export function useGradeAvailability(): UseGradeAvailabilityReturn {
  const [grades, setGrades] = useState<GradeAvailability[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGrades = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await gradeAvailabilityService.getAll();
      setGrades(data);
    } catch (err: any) {
      setError(err.message || 'Error al cargar disponibilidad de niveles');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGrades();
  }, [fetchGrades]);

  const saveGrades = useCallback(async (updates: GradeAvailabilityUpdate[]): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      const updated = await gradeAvailabilityService.updateAvailability(updates);
      setGrades(updated);
      return true;
    } catch (err: any) {
      setError(err.message || 'Error al guardar disponibilidad');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    grades,
    loading,
    error,
    saveGrades,
    refetch: fetchGrades,
  };
}
