import React from 'react';
import { FiFilter, FiX } from 'react-icons/fi';
import { InterviewerLoad } from '../../types/interview';
import { formatRole } from './dashboardTypes';

interface InterviewerLoadPanelProps {
  interviewers: InterviewerLoad[];
  selectedInterviewerId: number | null;
  onInterviewerClick: (interviewerId: number | null) => void;
}

const getLoadColor = (loadPercentage: number): string => {
  if (loadPercentage >= 90) return 'bg-red-500';
  if (loadPercentage >= 70) return 'bg-amber-500';
  return 'bg-emerald-500';
};

const InterviewerLoadPanel: React.FC<InterviewerLoadPanelProps> = ({
  interviewers,
  selectedInterviewerId,
  onInterviewerClick
}) => (
  <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
    <div className="mb-4 flex items-center justify-between gap-3">
      <div>
        <h3 className="text-sm font-bold uppercase tracking-wide text-gray-900">Carga por entrevistador</h3>
        <p className="text-xs text-gray-500">Click para filtrar el timeline</p>
      </div>
      {selectedInterviewerId && (
        <button
          type="button"
          onClick={() => onInterviewerClick(null)}
          className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-50"
        >
          <FiX className="h-3 w-3" aria-hidden="true" />
          Limpiar
        </button>
      )}
    </div>

    {interviewers.length === 0 ? (
      <div className="rounded-lg border border-dashed border-gray-200 p-6 text-center text-sm text-gray-500">
        No hay carga registrada en este rango.
      </div>
    ) : (
      <div className="space-y-3">
        {interviewers.map(interviewer => {
          const isSelected = selectedInterviewerId === interviewer.id;
          return (
            <button
              key={interviewer.id}
              type="button"
              onClick={() => onInterviewerClick(isSelected ? null : interviewer.id)}
              className={`w-full rounded-lg border p-3 text-left transition-all ${
                isSelected ? 'border-gray-900 bg-gray-50 shadow-sm' : 'border-gray-100 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-gray-900">{interviewer.name}</p>
                  <p className="text-xs text-gray-500">{formatRole(interviewer.role)}</p>
                </div>
                <div className="flex items-center gap-1 text-xs font-semibold text-gray-500">
                  {isSelected && <FiFilter className="h-3 w-3" aria-hidden="true" />}
                  {interviewer.scheduledCount}/{interviewer.capacity}
                </div>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-100">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${getLoadColor(interviewer.loadPercentage)}`}
                  style={{ width: `${Math.min(100, interviewer.loadPercentage)}%` }}
                />
              </div>
              <p className="mt-2 text-right text-xs font-semibold text-gray-500">{interviewer.loadPercentage}% carga</p>
            </button>
          );
        })}
      </div>
    )}
  </section>
);

export default InterviewerLoadPanel;
