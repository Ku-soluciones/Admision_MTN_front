import React, { useState, useEffect } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { useGradeAvailability } from '../../../../packages/shared-ui/src/hooks/useGradeAvailability';
import { GRADE_LEVELS } from '../../../../packages/shared-ui/src/types/gradeAvailability';
import type { GradeAvailabilityUpdate } from '../../../../packages/shared-ui/src/types/gradeAvailability';

interface GradeAvailabilityManagerProps {
  onClose?: () => void;
}

const GradeAvailabilityManager: React.FC<GradeAvailabilityManagerProps> = ({ onClose }) => {
  const { grades, loading, error, saveGrades, refetch } = useGradeAvailability();
  const [localGrades, setLocalGrades] = useState<Record<string, boolean>>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (grades.length > 0) {
      const initial: Record<string, boolean> = {};
      grades.forEach((g) => {
        initial[g.gradeLevel] = g.hasVacancy;
      });
      setLocalGrades(initial);
    }
  }, [grades]);

  const handleToggle = (gradeLevel: string) => {
    setLocalGrades((prev) => {
      const newValue = !prev[gradeLevel];
      const newState = { ...prev, [gradeLevel]: newValue };

      // Check if there are changes
      const original = grades.find((g) => g.gradeLevel === gradeLevel);
      const changed = original ? original.hasVacancy !== newValue : false;

      const anyChanged = grades.some((g) => {
        const originalValue = g.hasVacancy;
        const newVal = newState[g.gradeLevel];
        return originalValue !== newVal;
      });

      setHasChanges(anyChanged);
      return newState;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveMessage(null);

    const updates: GradeAvailabilityUpdate[] = Object.entries(localGrades).map(
      ([gradeLevel, hasVacancy]) => ({
        gradeLevel,
        hasVacancy,
      })
    );

    const success = await saveGrades(updates);

    if (success) {
      setSaveMessage({ type: 'success', text: 'Disponibilidad de vacantes actualizada correctamente' });
      setHasChanges(false);
      setTimeout(() => setSaveMessage(null), 3000);
    } else {
      setSaveMessage({ type: 'error', text: 'Error al guardar. Intente nuevamente.' });
    }

    setSaving(false);
  };

  const handleCancel = () => {
    // Reset to original values
    const initial: Record<string, boolean> = {};
    grades.forEach((g) => {
      initial[g.gradeLevel] = g.hasVacancy;
    });
    setLocalGrades(initial);
    setHasChanges(false);
  };

  if (loading && grades.length === 0) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center py-8">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-azul-monte-tabor" />
          <span className="ml-3 text-gray-500">Cargando niveles...</span>
        </div>
      </Card>
    );
  }

  const availableCount = Object.values(localGrades).filter(Boolean).length;
  const totalCount = GRADE_LEVELS.length;

  return (
    <Card className="p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-800">Disponibilidad de Vacantes por Nivel</h2>
        <p className="mt-1 text-sm text-gray-500">
          Marca los niveles que tienen vacantes disponibles para postulación.
          Actualmente {availableCount} de {totalCount} niveles tienen vacantes.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-700">
          {error}
          <button onClick={refetch} className="ml-2 underline hover:no-underline">
            Reintentar
          </button>
        </div>
      )}

      {saveMessage && (
        <div
          className={`mb-4 rounded-lg p-4 text-sm ${
            saveMessage.type === 'success'
              ? 'bg-green-50 text-green-700'
              : 'bg-red-50 text-red-700'
          }`}
        >
          {saveMessage.text}
        </div>
      )}

      <div className="mb-6 space-y-3">
        {GRADE_LEVELS.map((level) => {
          const isAvailable = localGrades[level.value] ?? false;

          return (
            <div
              key={level.value}
              className={`flex items-center justify-between rounded-lg border p-4 transition-colors ${
                isAvailable
                  ? 'border-green-200 bg-green-50'
                  : 'border-gray-200 bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full ${
                    isAvailable ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {isAvailable ? (
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                </div>
                <div>
                  <span className={`font-medium ${isAvailable ? 'text-gray-800' : 'text-gray-500'}`}>
                    {level.label}
                  </span>
                  <span className="ml-2 text-xs text-gray-400">({level.value})</span>
                </div>
              </div>

              <label className="relative cursor-pointer">
                <input
                  type="checkbox"
                  checked={isAvailable}
                  onChange={() => handleToggle(level.value)}
                  className="peer sr-only"
                />
                <div className="h-6 w-11 rounded-full bg-gray-300 transition-colors peer-checked:bg-green-500 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-green-500 peer-focus:ring-offset-2" />
                <div className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform peer-checked:translate-x-5" />
              </label>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between border-t pt-4">
        <div className="text-sm text-gray-500">
          {hasChanges ? (
            <span className="text-amber-600">Hay cambios sin guardar</span>
          ) : (
            <span>Sin cambios pendientes</span>
          )}
        </div>

        <div className="flex gap-3">
          {hasChanges && (
            <Button variant="outline" onClick={handleCancel} disabled={saving}>
              Cancelar
            </Button>
          )}
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={!hasChanges || saving}
            isLoading={saving}
          >
            {saving ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default GradeAvailabilityManager;
