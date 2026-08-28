import React from 'react';
import { FiEye, FiRefreshCw, FiUnlock } from 'react-icons/fi';
import { INTERVIEW_STATUS_LABELS, INTERVIEW_TYPE_LABELS, InterviewStatus, WeeklyOverviewDay, WeeklyOverviewScheduledInterview } from '../../types/interview';
import { isHistoricalInterview, isOperationalInterview } from './dashboardTypes';

interface ScheduledPairsTableProps {
  days: WeeklyOverviewDay[];
  onInterviewClick: (interview: WeeklyOverviewScheduledInterview) => void;
  onReleaseInterview?: (interview: WeeklyOverviewScheduledInterview) => void;
  onRescheduleInterview?: (interview: WeeklyOverviewScheduledInterview) => void;
}

const getLabel = (labels: Record<string, string>, value: string): string => labels[value] || value;

type ScheduledRow = WeeklyOverviewScheduledInterview & { date: string; dayLabel: string };

const ScheduledPairsTable: React.FC<ScheduledPairsTableProps> = ({
  days,
  onInterviewClick,
  onReleaseInterview,
  onRescheduleInterview
}) => {
  const allRows: ScheduledRow[] = days
    .flatMap(day => day.scheduled.map(interview => ({ ...interview, date: day.date, dayLabel: day.dayLabel })));
  const rows = allRows
    .filter(isOperationalInterview)
    .sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`));
  const historicalRows = allRows
    .filter(isHistoricalInterview)
    .sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`));
  const renderRow = (row: ScheduledRow, tone: 'active' | 'history') => {
    const pair = [row.interviewer1.name, row.interviewer2?.name].filter(Boolean).join(' + ');
    return (
      <tr key={`${tone}-${row.id}`} className={tone === 'history' ? 'bg-gray-50/70 hover:bg-gray-100' : 'hover:bg-gray-50'}>
        <td className="whitespace-nowrap px-4 py-3 text-gray-700">{row.dayLabel}, {row.time}</td>
        <td className="px-4 py-3 text-gray-700">{pair}</td>
        <td className="px-4 py-3 font-medium text-gray-900">{row.studentName}</td>
        <td className="whitespace-nowrap px-4 py-3 text-gray-600">{getLabel(INTERVIEW_TYPE_LABELS, row.interviewType)}</td>
        <td className="whitespace-nowrap px-4 py-3 text-gray-600">{getLabel(INTERVIEW_STATUS_LABELS, row.status)}</td>
        <td className="px-4 py-3">
          <div className="flex justify-end gap-2">
            {tone === 'history' && row.status === InterviewStatus.REJECTED_BY_FAMILY && onReleaseInterview && (
              <button
                type="button"
                onClick={() => onReleaseInterview(row)}
                className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800 hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-200"
                aria-label={`Liberar entrevista rechazada de ${row.studentName}`}
              >
                <FiUnlock className="h-4 w-4" aria-hidden="true" />
                Liberar
              </button>
            )}
            {tone === 'history' && row.status === InterviewStatus.CANCELLED && (
              <button
                type="button"
                onClick={() => (onRescheduleInterview || onInterviewClick)(row)}
                className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-800 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-200"
                aria-label={`Reagendar entrevista cancelada de ${row.studentName}`}
              >
                <FiRefreshCw className="h-4 w-4" aria-hidden="true" />
                Reagendar
              </button>
            )}
            <button
              type="button"
              onClick={() => onInterviewClick(row)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-100"
              aria-label={`Ver entrevista de ${row.studentName}`}
            >
              <FiEye aria-hidden="true" />
            </button>
          </div>
        </td>
      </tr>
    );
  };

  return (
    <section className="rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-200 p-4">
        <h3 className="text-sm font-bold uppercase tracking-wide text-gray-900">Parejas agendadas</h3>
        <p className="text-xs text-gray-500">
          {rows.length} entrevistas activas en el rango actual{historicalRows.length ? ` · ${historicalRows.length} en historial accionable` : ''}
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="p-8 text-center text-sm text-gray-500">No hay entrevistas activas en este rango.</div>
      ) : (
        <div className="max-h-80 overflow-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="sticky top-0 bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Fecha</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Pareja</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Familia</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Tipo</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Estado</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-600">Accion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {rows.map(row => renderRow(row, 'active'))}
            </tbody>
          </table>
        </div>
      )}

      {historicalRows.length > 0 && (
        <div className="border-t border-gray-200">
          <div className="bg-gray-50 px-4 py-3">
            <h4 className="text-xs font-bold uppercase tracking-wide text-gray-700">Historial del rango</h4>
            <p className="text-xs text-gray-500">No ocupa disponibilidad, pero permite revisar, liberar o reagendar registros cerrados.</p>
          </div>
          <div className="max-h-60 overflow-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="sticky top-0 bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Fecha original</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Pareja</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Familia</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Tipo</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Estado</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-600">Accion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {historicalRows.map(row => renderRow(row, 'history'))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
};

export default ScheduledPairsTable;
