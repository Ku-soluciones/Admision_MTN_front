import React, { useMemo } from 'react';
import { FiCheck, FiFilter } from 'react-icons/fi';
import type { CourseApplicant } from '../../../../packages/shared-ui/src/src/api/dashboard.types';
import { hasDataQualityIssue, isResolvedApplicant, requiresAction, statusTone } from './admissionReportUtils';

interface ApplicantKpiCardsProps {
  rows: CourseApplicant[];
  selectedStatus: string;
  needsActionSelected?: boolean;
  onStatusSelect: (status: string) => void;
  onNeedsAction?: () => void;
}

export const ApplicantKpiCards: React.FC<ApplicantKpiCardsProps> = ({
  rows,
  selectedStatus,
  needsActionSelected,
  onStatusSelect,
  onNeedsAction
}) => {
  const stats = useMemo(() => ({
    total: rows.length,
    courses: new Set(rows.map((row) => row.gradeApplied)).size,
    needsAction: rows.filter(requiresAction).length,
    resolved: rows.filter(isResolvedApplicant).length,
    recordsToReview: rows.filter(hasDataQualityIssue).length
  }), [rows]);

  const statuses = useMemo(() => {
    const totals = new Map<string, number>();
    rows.forEach((row) => totals.set(row.statusLabel, (totals.get(row.statusLabel) || 0) + 1));
    return Array.from(totals, ([status, total]) => ({
      status,
      total,
      percentage: rows.length ? Math.round((total / rows.length) * 100) : 0
    })).sort((a, b) => b.total - a.total || a.status.localeCompare(b.status, 'es'));
  }, [rows]);

  return (
    <section aria-label="Resumen operativo y filtro rápido por estado" className="border-y border-slate-200 bg-white px-1 py-3 sm:px-4">
      <div className="grid gap-4 xl:grid-cols-[minmax(300px,0.9fr)_minmax(320px,1.1fr)_auto] xl:items-center">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <div className="flex items-baseline gap-2">
            <strong className="text-2xl font-bold tracking-[-0.03em] text-slate-950">{stats.total}</strong>
            <span className="text-sm font-semibold text-slate-700">postulantes · {stats.courses} cursos</span>
          </div>

          <dl className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
            <div className="flex items-baseline gap-1.5">
              <dt className="text-slate-600">Por resolver</dt>
              <dd className="font-bold tabular-nums text-amber-700">{stats.needsAction}</dd>
            </div>
            <div className="flex items-baseline gap-1.5">
              <dt className="text-slate-600">Cerrados</dt>
              <dd className="font-bold tabular-nums text-emerald-700">{stats.resolved}</dd>
            </div>
            <div className="flex items-baseline gap-1.5">
              <dt className="text-slate-600">Incompletos</dt>
              <dd className="font-bold tabular-nums text-slate-900">{stats.recordsToReview}</dd>
            </div>
          </dl>
        </div>

        <div className="xl:border-l xl:border-slate-200 xl:pl-5">
          <div className="mb-2 flex items-center justify-between gap-3">
            <span className="text-xs font-bold text-slate-700">Estado del proceso</span>
            <span className="text-xs tabular-nums text-slate-500">Selecciona para filtrar</span>
          </div>
          <div className="flex h-2 overflow-hidden rounded-sm bg-slate-100" aria-hidden="true">
            {statuses.map(({ status, percentage }) => (
              <span key={status} className={statusTone(status).bar} style={{ width: `${percentage}%` }} />
            ))}
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {statuses.map(({ status, total, percentage }) => {
              const selected = selectedStatus === status;
              const tone = statusTone(status);
              return (
                <button
                  key={status}
                  type="button"
                  onClick={() => onStatusSelect(status)}
                  aria-pressed={selected}
                  className={`inline-flex min-h-11 items-center gap-2 rounded-lg px-2.5 text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-1 sm:min-h-10 ${
                    selected
                      ? 'bg-blue-50 text-blue-950 ring-1 ring-inset ring-blue-200'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span className={`h-2 w-2 rounded-sm ${tone.bar}`} aria-hidden="true" />
                  <span>{status}</span>
                  <span className="tabular-nums text-slate-500">{total} · {percentage}%</span>
                  {selected && <FiCheck className="h-3.5 w-3.5 text-blue-800" aria-hidden="true" />}
                </button>
              );
            })}
          </div>
        </div>

        {onNeedsAction && stats.needsAction > 0 && (
          <button
            type="button"
            onClick={onNeedsAction}
            aria-pressed={needsActionSelected}
            className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2 xl:justify-self-end ${
              needsActionSelected
                ? 'bg-blue-900 text-white'
                : 'border border-slate-300 bg-white text-blue-900 hover:bg-slate-50'
            }`}
          >
            <FiFilter className="h-4 w-4" aria-hidden="true" />
            {needsActionSelected ? 'Mostrando por resolver' : 'Ver por resolver'}
          </button>
        )}
      </div>
    </section>
  );
};
