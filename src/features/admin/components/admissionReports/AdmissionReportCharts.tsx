import React, { useMemo } from 'react';
import { FiAlertCircle, FiCheck } from 'react-icons/fi';
import type { CourseApplicant } from '../../../../packages/shared-ui/src/src/api/dashboard.types';
import { formatGradeLabel, hasInvalidText, isResolvedApplicant, requiresAction, statusTone } from './admissionReportUtils';

interface AdmissionReportChartsProps {
  rows: CourseApplicant[];
  selectedStatus: string;
  selectedGrade: string;
  needsActionOnly: boolean;
  onStatusSelect: (status: string) => void;
  onGradeSelect: (grade: string) => void;
}

export const AdmissionReportCharts: React.FC<AdmissionReportChartsProps> = ({
  rows,
  selectedStatus,
  selectedGrade,
  needsActionOnly,
  onStatusSelect,
  onGradeSelect
}) => {
  const statusData = useMemo(() => {
    const statuses = new Map<string, number>();
    rows.forEach((row) => statuses.set(row.statusLabel, (statuses.get(row.statusLabel) || 0) + 1));
    return Array.from(statuses, ([status, total]) => ({ status, total }))
      .sort((a, b) => b.total - a.total || a.status.localeCompare(b.status, 'es'));
  }, [rows]);

  const gradeData = useMemo(() => {
    const grades = new Map<string, { total: number; pending: number; resolved: number }>();
    rows.forEach((row) => {
      const current = grades.get(row.gradeApplied) || { total: 0, pending: 0, resolved: 0 };
      current.total += 1;
      if (requiresAction(row)) current.pending += 1;
      else current.resolved += 1;
      grades.set(row.gradeApplied, current);
    });
    return Array.from(grades, ([grade, values]) => ({ grade, ...values }))
      .sort((a, b) => b.total - a.total || formatGradeLabel(a.grade).localeCompare(formatGradeLabel(b.grade), 'es'));
  }, [rows]);

  const resolved = rows.filter(isResolvedApplicant).length;
  const resolvedPercentage = rows.length ? Math.round((resolved / rows.length) * 100) : 0;
  const invalidDecisions = rows.filter((row) => hasInvalidText(row.cycleDirectorDecision)).length;
  const missingGender = rows.filter((row) => !row.gender).length;
  const missingExamAverage = rows.filter((row) => row.examAverage == null).length;
  const maxGradeTotal = Math.max(...gradeData.map((grade) => grade.total), 1);

  return (
    <section aria-label="Lectura visual del proceso de admisión" className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[0.9fr_1.25fr]">
        <article className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-950">Estado del proceso</h2>
              <p className="mt-1 text-sm text-slate-500">Selecciona un estado para filtrar el listado.</p>
            </div>
            <div className="text-right">
              <strong className="block text-2xl font-bold tabular-nums text-slate-950">{resolvedPercentage}%</strong>
              <span className="text-xs font-medium text-slate-500">cerrado</span>
            </div>
          </div>

          <div className="mt-5 flex h-3 overflow-hidden rounded bg-slate-100" aria-hidden="true">
            {statusData.map(({ status, total }) => {
              const tone = statusTone(status);
              return <span key={status} className={tone.bar} style={{ width: `${(total / rows.length) * 100}%` }} />;
            })}
          </div>

          <div className="mt-4 space-y-1.5">
            {statusData.map(({ status, total }) => {
              const selected = selectedStatus === status;
              const tone = statusTone(status);
              return (
                <button
                  key={status}
                  type="button"
                  onClick={() => onStatusSelect(status)}
                  aria-pressed={selected}
                  className={`grid min-h-11 w-full grid-cols-[12px_minmax(0,1fr)_auto_20px] items-center gap-3 rounded-lg px-3 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 ${
                    selected ? 'bg-blue-50 text-blue-950 ring-1 ring-inset ring-blue-200' : 'hover:bg-slate-50'
                  }`}
                >
                  <span className={`h-2.5 w-2.5 rounded-sm ${tone.bar}`} aria-hidden="true" />
                  <span className="truncate text-sm font-semibold">{status}</span>
                  <span className="text-sm tabular-nums text-slate-600">{total} · {Math.round((total / rows.length) * 100)}%</span>
                  {selected ? <FiCheck className="h-4 w-4 text-blue-800" aria-hidden="true" /> : <span />}
                </button>
              );
            })}
          </div>
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
          <div>
            <h2 className="text-lg font-bold text-slate-950">Carga por curso</h2>
            <p className="mt-1 text-sm text-slate-500">El largo indica volumen; el ámbar muestra lo pendiente.</p>
          </div>

          <div className="mt-5 space-y-2">
            {gradeData.map(({ grade, total, pending, resolved: gradeResolved }) => {
              const totalWidth = (total / maxGradeTotal) * 100;
              const pendingWidth = total ? (pending / total) * 100 : 0;
              const resolvedWidth = total ? (gradeResolved / total) * 100 : 0;
              const selected = selectedGrade === grade;
              return (
                <button
                  key={grade}
                  type="button"
                  onClick={() => onGradeSelect(grade)}
                  aria-pressed={selected}
                  className={`grid min-h-12 w-full grid-cols-[74px_minmax(0,1fr)_76px_20px] items-center gap-3 rounded-lg px-3 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 sm:grid-cols-[104px_minmax(0,1fr)_116px_20px] ${
                    selected ? 'bg-blue-50 ring-1 ring-inset ring-blue-200' : 'hover:bg-slate-50'
                  }`}
                  aria-label={`${formatGradeLabel(grade)}: ${total} postulantes, ${pending} pendientes. ${selected ? 'Filtro activo; presiona para quitarlo' : 'Filtrar listado'}`}
                >
                  <span className="truncate text-sm font-bold text-slate-800">{formatGradeLabel(grade)}</span>
                  <span className="h-3 overflow-hidden rounded bg-slate-100">
                    <span className="flex h-full overflow-hidden rounded" style={{ width: `${totalWidth}%` }}>
                      <span className="h-full bg-amber-400" style={{ width: `${pendingWidth}%` }} />
                      <span className="h-full bg-emerald-600" style={{ width: `${resolvedWidth}%` }} />
                    </span>
                  </span>
                  <span className="text-right text-xs tabular-nums text-slate-500">
                    <strong className="text-slate-800">{total}</strong> · {pending} pend.
                  </span>
                  {selected ? <FiCheck className="h-4 w-4 text-blue-800" aria-hidden="true" /> : <span />}
                </button>
              );
            })}
          </div>
        </article>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between" role="note" aria-label="Datos que requieren revisión">
        <div className="flex items-center gap-2 text-sm font-bold text-amber-950">
          <FiAlertCircle className="h-5 w-5 text-amber-700" aria-hidden="true" />
          Calidad de datos
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-amber-900">
          <span><strong>{invalidDecisions}</strong> decisiones inválidas</span>
          <span><strong>{missingGender}</strong> sin género</span>
          <span><strong>{missingExamAverage}</strong> sin promedio</span>
        </div>
      </div>
      {needsActionOnly && <p className="sr-only" aria-live="polite">El listado está filtrado por postulaciones que requieren acción.</p>}
    </section>
  );
};
