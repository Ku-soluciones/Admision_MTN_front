import React from 'react';
import { FiEye } from 'react-icons/fi';
import { INTERVIEW_STATUS_LABELS, INTERVIEW_TYPE_LABELS, WeeklyOverviewDay, WeeklyOverviewScheduledInterview } from '../../types/interview';

interface ScheduledPairsTableProps {
  days: WeeklyOverviewDay[];
  onInterviewClick: (interview: WeeklyOverviewScheduledInterview) => void;
}

const getLabel = (labels: Record<string, string>, value: string): string => labels[value] || value;

const ScheduledPairsTable: React.FC<ScheduledPairsTableProps> = ({ days, onInterviewClick }) => {
  const rows = days
    .flatMap(day => day.scheduled.map(interview => ({ ...interview, date: day.date, dayLabel: day.dayLabel })))
    .sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`));

  return (
    <section className="rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-200 p-4">
        <h3 className="text-sm font-bold uppercase tracking-wide text-gray-900">Parejas agendadas</h3>
        <p className="text-xs text-gray-500">{rows.length} entrevistas en el rango actual</p>
      </div>

      {rows.length === 0 ? (
        <div className="p-8 text-center text-sm text-gray-500">No hay entrevistas agendadas en este rango.</div>
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
              {rows.map(row => {
                const pair = [row.interviewer1.name, row.interviewer2?.name].filter(Boolean).join(' + ');
                return (
                  <tr key={row.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-4 py-3 text-gray-700">{row.dayLabel}, {row.time}</td>
                    <td className="px-4 py-3 text-gray-700">{pair}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{row.studentName}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-600">{getLabel(INTERVIEW_TYPE_LABELS, row.interviewType)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-600">{getLabel(INTERVIEW_STATUS_LABELS, row.status)}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => onInterviewClick(row)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100"
                        aria-label={`Ver entrevista de ${row.studentName}`}
                      >
                        <FiEye aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};

export default ScheduledPairsTable;
