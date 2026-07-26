import React, { useState, useEffect } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { useGradeAvailability } from '../../../../packages/shared-ui/src/hooks/useGradeAvailability';
import { GRADE_LEVELS } from '../../../../packages/shared-ui/src/types/gradeAvailability';
import type { GradeAvailabilityUpdate } from '../../../../packages/shared-ui/src/types/gradeAvailability';

interface GradeAvailabilityManagerProps {
  onClose?: () => void;
}

type GenderKey = 'M' | 'F';

const GradeAvailabilityManager: React.FC<GradeAvailabilityManagerProps> = ({ onClose }) => {
  const { grades, loading, error, saveGrades, refetch } = useGradeAvailability();
  const [localGrades, setLocalGrades] = useState<Record<string, { M: boolean; F: boolean }>>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (grades.length > 0) {
      const initial: Record<string, { M: boolean; F: boolean }> = {};
      grades.forEach((g) => {
        initial[g.gradeLevel] = {
          M: g.hasVacancyM,
          F: g.hasVacancyF,
        };
      });
      setLocalGrades(initial);
    }
  }, [grades]);

  const handleToggle = (gradeLevel: string, gender: GenderKey) => {
    setLocalGrades((prev) => {
      const newState = {
        ...prev,
        [gradeLevel]: {
          ...prev[gradeLevel],
          [gender]: !prev[gradeLevel][gender],
        },
      };

      const anyChanged = grades.some((g) => {
        const originalM = g.hasVacancyM;
        const originalF = g.hasVacancyF;
        const newM = newState[g.gradeLevel].M;
        const newF = newState[g.gradeLevel].F;
        return originalM !== newM || originalF !== newF;
      });

      setHasChanges(anyChanged);
      return newState;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveMessage(null);

    const updates: GradeAvailabilityUpdate[] = Object.entries(localGrades).map(
      ([gradeLevel, genders]) => ({
        gradeLevel,
        hasVacancyM: genders.M,
        hasVacancyF: genders.F,
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
    const initial: Record<string, { M: boolean; F: boolean }> = {};
    grades.forEach((g) => {
      initial[g.gradeLevel] = {
        M: g.hasVacancyM,
        F: g.hasVacancyF,
      };
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

  const totalWithVacancyM = Object.values(localGrades).filter((g) => g.M).length;
  const totalWithVacancyF = Object.values(localGrades).filter((g) => g.F).length;
  const totalCount = GRADE_LEVELS.length;

  const GradeToggle = ({
    gradeLevel,
    gender,
    isAvailable,
  }: {
    gradeLevel: string;
    gender: GenderKey;
    isAvailable: boolean;
  }) => (
    <label className="relative cursor-pointer">
      <input
        type="checkbox"
        checked={isAvailable}
        onChange={() => handleToggle(gradeLevel, gender)}
        className="peer sr-only"
      />
      <div
        className={`h-6 w-11 rounded-full transition-colors peer-checked:bg-green-500 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-green-500 peer-focus:ring-offset-2 ${
          isAvailable ? 'bg-green-500' : 'bg-gray-300'
        }`}
      />
      <div className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform peer-checked:translate-x-5" />
    </label>
  );

  return (
    <Card className="p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-800">Disponibilidad de Vacantes por Nivel y Género</h2>
        <p className="mt-1 text-sm text-gray-500">
          Marca las vacantes disponibles según el género del postulante.
          Actualmente {totalWithVacancyM} de {totalCount} niveles tienen vacantes masculinas y{' '}
          {totalWithVacancyF} de {totalCount} tienen vacantes femeninas.
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

      <div className="mb-6">
        {/* Header */}
        <div className="mb-2 grid grid-cols-3 gap-4 px-4">
          <div className="font-medium text-gray-700">Nivel</div>
          <div className="text-center font-medium text-gray-700">
            <span className="inline-flex items-center justify-center rounded-full bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-700">
              Masculino (M)
            </span>
          </div>
          <div className="text-center font-medium text-gray-700">
            <span className="inline-flex items-center justify-center rounded-full bg-pink-100 px-3 py-1 text-sm font-semibold text-pink-700">
              Femenino (F)
            </span>
          </div>
        </div>

        {/* Grade rows */}
        <div className="space-y-2">
          {GRADE_LEVELS.map((level) => {
            const isM = localGrades[level.value]?.M ?? false;
            const isF = localGrades[level.value]?.F ?? false;

            return (
              <div
                key={level.value}
                className={`grid grid-cols-3 items-center gap-4 rounded-lg p-4 transition-colors ${
                  isM || isF ? 'bg-green-50' : 'bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full ${
                      isM || isF ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-700'
                    }`}
                  >
                    {isM || isF ? (
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}
                  </div>
                  <div>
                    <span className={`font-medium ${isM || isF ? 'text-gray-800' : 'text-gray-500'}`}>
                      {level.label}
                    </span>
                  </div>
                </div>

                <div className="flex justify-center">
                  <GradeToggle gradeLevel={level.value} gender="M" isAvailable={isM} />
                </div>

                <div className="flex justify-center">
                  <GradeToggle gradeToggle gradeLevel={level.value} gender="F" isAvailable={isF} />
                </div>
              </div>
            );
          })}
        </div>
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
