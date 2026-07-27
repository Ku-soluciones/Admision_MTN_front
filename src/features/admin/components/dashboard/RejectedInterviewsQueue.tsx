import React, { useState } from 'react';
import { FiAlertOctagon, FiChevronDown, FiEye, FiUnlock } from 'react-icons/fi';
import {
  INTERVIEW_TYPE_LABELS,
  WeeklyOverviewDay,
  WeeklyOverviewScheduledInterview
} from '../../types/interview';

interface RejectedInterviewsQueueProps {
  days: WeeklyOverviewDay[];
  onInterviewClick: (interview: WeeklyOverviewScheduledInterview) => void;
  onReleaseInterview?: (interview: WeeklyOverviewScheduledInterview) => void;
}

type RejectedRow = WeeklyOverviewScheduledInterview & { date: string; dayLabel: string };

const getRejectedRows = (days: WeeklyOverviewDay[]): RejectedRow[] => (
  days
    .flatMap(day => day.scheduled.map(interview => ({ ...interview, date: day.date, dayLabel: day.dayLabel })))
    .filter(interview => interview.status === 'REJECTED_BY_FAMILY')
    .sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`))
);

const getTypeLabel = (type: string): string => INTERVIEW_TYPE_LABELS[type as keyof typeof INTERVIEW_TYPE_LABELS] || type;

const RejectedInterviewsQueue: React.FC<RejectedInterviewsQueueProps> = ({
  days,
  onInterviewClick,
  onReleaseInterview
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const rows = getRejectedRows(days);

  if (rows.length === 0) return null;

  const panelId = 'rejected-interviews-panel';
  const firstRow = rows[0];

  return (
    <section className="rounded-lg border border-red-200 bg-red-50 text-red-950">
      <button
        type="button"
        onClick={() => setIsExpanded(current => !current)}
        aria-expanded={isExpanded}
        aria-controls={panelId}
        className="flex w-full flex-col gap-2 px-3 py-2 text-left focus:outline-none focus:ring-2 focus:ring-inset focus:ring-red-300 md:flex-row md:items-center md:justify-between"
      >
        <span className="flex min-w-0 items-center gap-2">
          <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-white text-red-600">
            <FiAlertOctagon className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-bold">Rechazadas</span>
            <span className="block truncate text-xs font-medium text-red-800">
              {rows.length} pendiente{rows.length === 1 ? '' : 's'} de liberar
              {firstRow ? ` · ${firstRow.studentName}` : ''}
            </span>
          </span>
        </span>

        <span className="flex flex-shrink-0 items-center gap-2 text-sm font-bold text-red-800">
          {isExpanded ? 'Ocultar pendientes' : 'Ver pendientes'}
          <FiChevronDown
            className={`h-4 w-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
            aria-hidden="true"
          />
        </span>
      </button>

      {isExpanded && (
        <div id={panelId} className="border-t border-red-200 px-3 py-3">
          <div className="grid gap-2 xl:grid-cols-2 2xl:grid-cols-3">
            {rows.map(row => {
              const pair = [row.interviewer1.name, row.interviewer2?.name].filter(Boolean).join(' + ');
              return (
                <div
                  key={row.id}
                  className="flex min-w-0 items-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-gray-950">{row.studentName}</p>
                    <p className="mt-0.5 truncate text-xs font-medium text-gray-600">{row.dayLabel}, {row.time} · {getTypeLabel(row.interviewType)}</p>
                    <p className="mt-0.5 truncate text-xs text-gray-500">{pair}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onInterviewClick(row)}
                    className="inline-flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-700 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-300"
                    aria-label={`Abrir entrevista rechazada de ${row.studentName}`}
                  >
                    <FiEye className="h-4 w-4" aria-hidden="true" />
                  </button>
                  {onReleaseInterview && (
                    <button
                      type="button"
                      onClick={() => onReleaseInterview(row)}
                      className="inline-flex min-h-11 flex-shrink-0 items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-bold text-red-800 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-300"
                      aria-label={`Liberar entrevista rechazada de ${row.studentName}`}
                    >
                      <FiUnlock className="h-3.5 w-3.5" aria-hidden="true" />
                      Liberar
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
};

export default RejectedInterviewsQueue;
