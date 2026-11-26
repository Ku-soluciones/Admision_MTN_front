import React from 'react';
import type { SetupStepStatus } from '../../pages/processSetupPolicy';

export const SETUP_STEPS = [
  { id: 'seats', label: 'Cupos' },
  { id: 'ageDocuments', label: 'Edad y documentos' },
  { id: 'calendar', label: 'Calendario' },
  { id: 'preparation', label: 'Preparación' },
  { id: 'review', label: 'Revisión' },
] as const;

export type ProcessSetupStep = (typeof SETUP_STEPS)[number]['id'];

type Props = {
  activeStep: ProcessSetupStep;
  statuses: Record<ProcessSetupStep, SetupStepStatus>;
  onStepChange: (step: ProcessSetupStep) => void;
  children: React.ReactNode;
};

const statusLabel: Record<SetupStepStatus, string> = {
  SAVED: 'Guardado',
  PENDING: 'Pendiente',
  REQUIRED: 'Requerido para abrir',
  INVALID: 'Revisar datos',
};

const statusTone: Record<SetupStepStatus, string> = {
  SAVED: 'bg-emerald-100 text-emerald-800',
  PENDING: 'bg-slate-100 text-slate-600',
  REQUIRED: 'bg-amber-100 text-amber-900',
  INVALID: 'bg-red-100 text-red-800',
};

export default function ProcessSetupStepper({ activeStep, statuses, onStepChange, children }: Props) {
  const activeIndex = SETUP_STEPS.findIndex((step) => step.id === activeStep);
  return (
    <div className="space-y-6">
      <nav aria-label="Configuración del proceso" className="grid gap-2 md:grid-cols-5">
        {SETUP_STEPS.map((step, index) => {
          const status = statuses[step.id];
          const selected = step.id === activeStep;
          return (
            <button
              key={step.id}
              type="button"
              aria-label={`Paso ${index + 1}: ${step.label}`}
              aria-current={selected ? 'step' : undefined}
              onClick={() => onStepChange(step.id)}
              className={`rounded-xl border p-3 text-left transition-colors ${selected ? 'border-azul-monte-tabor bg-blue-50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}
            >
              <span className="block text-xs font-black uppercase tracking-wide text-slate-500">Paso {index + 1}</span>
              <span className="mt-1 block text-sm font-black text-slate-900">{step.label}</span>
              <span className={`mt-2 inline-flex rounded-full px-2 py-1 text-[11px] font-bold ${statusTone[status]}`}>{statusLabel[status]}</span>
            </button>
          );
        })}
      </nav>

      <div>{children}</div>

      <div className="flex items-center justify-between border-t border-slate-200 pt-5">
        <button
          type="button"
          className="secondary"
          disabled={activeIndex <= 0}
          onClick={() => onStepChange(SETUP_STEPS[activeIndex - 1].id)}
        >
          Anterior
        </button>
        <button
          type="button"
          className="primary"
          disabled={activeIndex >= SETUP_STEPS.length - 1}
          onClick={() => onStepChange(SETUP_STEPS[activeIndex + 1].id)}
        >
          Siguiente
        </button>
      </div>
    </div>
  );
}
