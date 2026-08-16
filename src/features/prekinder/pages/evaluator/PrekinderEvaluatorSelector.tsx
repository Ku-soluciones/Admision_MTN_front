import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../../../admin/context/AppContext';
import { INSTRUMENT_TO_PROFILE } from '../../components/evaluator/SpecialtyProfile';

interface WorkspaceInstrument {
  instrumentId: string;
  instrumentCode: string;
  active: boolean;
}

interface Workspace {
  date: string;
  processId: string;
  instruments: Array<{
    instrument: WorkspaceInstrument;
    groups: Array<{
      groupId: string;
      groupName: string;
      applicantCount: number;
    }>;
  }>;
}

function instrumentToRoute(instrumentCode: string): string {
  const profile = INSTRUMENT_TO_PROFILE[instrumentCode];
  if (!profile) return '/prekinder/evaluador';
  const routes: Record<string, string> = {
    ACADEMIC: 'academic',
    PSYCHOMOTOR: 'psychomotor',
    PSYCHOLOGY: 'psychology',
    INDICATORS: 'indicators',
    GROUP_OBSERVATION: 'group-observation',
    LEARNING_SUPPORT: 'learning-support',
    DAP: 'dap',
  };
  return `/prekinder/evaluador/${routes[profile] ?? profile.toLowerCase().replace(/_/g, '-')}`;
}

const INSTRUMENT_LABELS: Record<string, string> = {
  ACADEMIC: 'Académico',
  PSYCHOMOTOR: 'Psicomotriz',
  PSYCHOLOGY: 'Psicológico',
  INDICATORS: 'Indicadores',
  GROUP_OBSERVATION: 'Observación Grupal',
  LEARNING_SUPPORT: 'Apoyo de Aprendizaje',
  DAP: 'DAP',
};

export function PrekinderEvaluatorSelector() {
  const navigate = useNavigate();
  const { addNotification } = useNotifications();

  const handleSelect = (instrumentCode: string) => {
    sessionStorage.removeItem('pk-pending-workspace');
    navigate(instrumentToRoute(instrumentCode), { replace: true });
  };

  const handleCancel = () => {
    sessionStorage.removeItem('pk-pending-workspace');
    navigate('/profesor', { replace: true });
  };

  React.useEffect(() => {
    const stored = sessionStorage.getItem('pk-pending-workspace');
    if (!stored) {
      addNotification({
        type: 'warning',
        title: 'Sin espacio de trabajo',
        message: 'No se encontró espacio de trabajo. Serás redirigido al portal de profesores.',
      });
      navigate('/profesor', { replace: true });
    }
  }, [navigate, addNotification]);

  const stored = sessionStorage.getItem('pk-pending-workspace');
  if (!stored) return null;

  let workspace: Workspace;
  try {
    workspace = JSON.parse(stored);
  } catch {
    addNotification({
      type: 'error',
      title: 'Error',
      message: 'No se pudo leer el espacio de trabajo.',
    });
    navigate('/profesor', { replace: true });
    return null;
  }

  const availableInstruments = workspace.instruments
    .map(i => i.instrument)
    .filter(inst => inst.active);

  return (
    <div className="min-h-screen bg-white flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <img
            src="https://ik.imagekit.io/11mmsqbe5/mtn-admisiones/logoMTN.png?updatedAt=1780848171943"
            alt="Logo Monte Tabor y Nazaret"
            className="h-16 mx-auto mb-6"
          />
          <h2 className="text-3xl font-bold text-azul-monte-tabor">
            Selector de Instrumento
          </h2>
          <p className="mt-2 text-lg text-gris-piedra">
            Tienes múltiples instrumentos asignados. Selecciona uno para continuar.
          </p>
        </div>

        <div className="space-y-4 mt-8">
          {availableInstruments.map((instrument) => (
            <button
              key={instrument.instrumentId}
              onClick={() => handleSelect(instrument.instrumentCode)}
              className="w-full p-6 text-left border-2 border-gray-200 rounded-xl hover:border-dorado-nazaret hover:bg-cream transition-all duration-200"
            >
              <div className="font-bold text-slate-900 text-lg">
                {INSTRUMENT_LABELS[instrument.instrumentCode] || instrument.instrumentCode}
              </div>
              <div className="text-sm text-gris-piedra mt-1">
                Código: {instrument.instrumentCode}
              </div>
            </button>
          ))}
        </div>

        <button
          onClick={handleCancel}
          className="w-full mt-6 py-3 text-center text-azul-monte-tabor hover:underline text-sm font-semibold"
        >
          Cancelar y volver al portal de profesores
        </button>
      </div>
    </div>
  );
}
