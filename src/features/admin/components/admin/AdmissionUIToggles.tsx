import React, { useState, useEffect, useCallback } from 'react';
import Button from '../../components/ui/Button';
import { useAdmissionUIFlags, AdmissionUIFlags } from '../../../../packages/shared-utils/src/hooks/useAdmissionUIFlags';

const TOGGLE_LABELS: Record<keyof AdmissionUIFlags, string> = {
  showIniciarPostulacion: '"Iniciar postulación" (HomePage)',
  showPostularHeader: '"Postular" (Headers)',
  showPostularOtroHijo: '"Postular otro hijo" (Dashboard)',
};

const ToggleRow: React.FC<{
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}> = ({ label, checked, onChange, disabled }) => (
  <label className="flex items-center justify-between py-2 cursor-pointer">
    <span className="text-sm text-gray-700">{label}</span>
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-200 ${
        checked ? 'bg-teal-600' : 'bg-gray-300'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  </label>
);

const AdmissionUIToggles: React.FC = () => {
  const { data: flags, isLoading } = useAdmissionUIFlags();
  const [localFlags, setLocalFlags] = useState<AdmissionUIFlags | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync local flags when server flags load
  useEffect(() => {
    if (flags && !localFlags) {
      setLocalFlags(flags);
    }
  }, [flags, localFlags]);

  const handleSave = useCallback(async () => {
    if (!localFlags) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/edge-config/admissionUI', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(localFlags),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || `Error ${res.status}`);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err: any) {
      setError(err.message || 'Error al guardar configuración');
    } finally {
      setSaving(false);
    }
  }, [localFlags]);

  if (isLoading || !localFlags) {
    return <div className="p-4 text-sm text-gray-500">Cargando...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
        {(Object.keys(TOGGLE_LABELS) as Array<keyof AdmissionUIFlags>).map((key) => (
          <div key={key} className="px-4">
            <ToggleRow
              label={TOGGLE_LABELS[key]}
              checked={localFlags[key]}
              onChange={(checked) => setLocalFlags((prev) => prev ? { ...prev, [key]: checked } : prev)}
              disabled={saving}
            />
          </div>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-center justify-between gap-3">
          <span>{error}</span>
          <button onClick={handleSave} className="text-sm font-semibold hover:underline shrink-0">
            Reintentar
          </button>
        </div>
      )}

      <div className="flex items-center gap-3">
        <Button
          variant="primary"
          size="sm"
          onClick={handleSave}
          isLoading={saving}
        >
          Guardar cambios
        </Button>
        {saved && (
          <span className="text-sm text-teal-600">✓ Cambios guardados</span>
        )}
      </div>
    </div>
  );
};

export default AdmissionUIToggles;
