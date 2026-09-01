import React from 'react';
import { FiCalendar, FiMapPin, FiUsers } from 'react-icons/fi';
import { INTERVIEW_MODE_LABELS, INTERVIEW_STATUS_LABELS, INTERVIEW_TYPE_LABELS, WeeklyOverviewScheduledInterview } from '../../types/interview';

interface InterviewTooltipProps {
  interview: WeeklyOverviewScheduledInterview | null;
  className?: string;
  style?: React.CSSProperties;
}

const safeLabel = <T extends string>(labels: Record<T, string>, value: string): string => (
  labels[value as T] || value
);

const InterviewTooltip: React.FC<InterviewTooltipProps> = ({ interview, className = '', style }) => {
  if (!interview) return null;

  const pair = [interview.interviewer1.name, interview.interviewer2?.name].filter(Boolean).join(' + ');

  return (
    <div
      className={`pointer-events-none rounded-lg border border-gray-200 bg-white p-4 text-sm shadow-xl ${className}`}
      style={style}
    >
      <div className="mb-3">
        <p className="font-bold text-gray-900">{interview.time} - {interview.endTime || 'fin pendiente'}</p>
        <p className="text-gray-600">{interview.studentName}</p>
        {interview.entrySource === 'MANUAL' && (
          <span className="mt-2 inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-900">Ingreso excepcional</span>
        )}
      </div>
      <div className="space-y-2 text-gray-600">
        <p className="flex items-center gap-2">
          <FiUsers className="h-4 w-4 text-gray-400" aria-hidden="true" />
          {pair}
        </p>
        <p className="flex items-center gap-2">
          <FiCalendar className="h-4 w-4 text-gray-400" aria-hidden="true" />
          {safeLabel(INTERVIEW_TYPE_LABELS, interview.interviewType)} · {safeLabel(INTERVIEW_STATUS_LABELS, interview.status)}
        </p>
        <p className="flex items-center gap-2">
          <FiMapPin className="h-4 w-4 text-gray-400" aria-hidden="true" />
          {safeLabel(INTERVIEW_MODE_LABELS, interview.mode)}
        </p>
      </div>
    </div>
  );
};

export default InterviewTooltip;
