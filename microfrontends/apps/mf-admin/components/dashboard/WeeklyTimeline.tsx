import React, { useState } from 'react';
import { FiAlertTriangle } from 'react-icons/fi';
import {
  InterviewerInfo,
  WeeklyOverviewDay,
  WeeklyOverviewScheduledInterview
} from '../../types/interview';
import {
  CommandCenterViewMode,
  STATUS_STYLES,
  getInterviewerInitials,
  getPairLabel
} from './dashboardTypes';
import InterviewTooltip from './InterviewTooltip';

interface WeeklyTimelineProps {
  days: WeeklyOverviewDay[];
  viewMode: CommandCenterViewMode;
  filterByInterviewer: number | null;
  onSlotClick: (date: string, time: string, availableInterviewers: InterviewerInfo[]) => void;
  onInterviewClick: (interview: WeeklyOverviewScheduledInterview) => void;
}

const TIME_SLOTS = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
  '11:00', '11:30', '12:00', '12:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30', '17:00'
];

const isInterviewVisible = (interview: WeeklyOverviewScheduledInterview, filterByInterviewer: number | null): boolean => (
  !filterByInterviewer ||
  interview.interviewer1.id === filterByInterviewer ||
  interview.interviewer2?.id === filterByInterviewer
);

interface TooltipState {
  interview: WeeklyOverviewScheduledInterview;
  left: number;
  top: number;
  placement: 'above' | 'below';
}

const WeeklyTimeline: React.FC<WeeklyTimelineProps> = ({
  days,
  viewMode,
  filterByInterviewer,
  onSlotClick,
  onInterviewClick
}) => {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const showTooltip = (interview: WeeklyOverviewScheduledInterview, element: HTMLElement) => {
    const rect = element.getBoundingClientRect();
    const tooltipWidth = 320;
    const tooltipHeight = 180;
    const margin = 16;
    const centeredLeft = rect.left + rect.width / 2;
    const left = Math.min(
      window.innerWidth - tooltipWidth / 2 - margin,
      Math.max(tooltipWidth / 2 + margin, centeredLeft)
    );
    const hasRoomBelow = rect.bottom + tooltipHeight + margin < window.innerHeight;

    setTooltip({
      interview,
      left,
      top: hasRoomBelow ? rect.bottom + 10 : Math.max(margin, rect.top - 10),
      placement: hasRoomBelow ? 'below' : 'above'
    });
  };

  if (viewMode === 'month') {
    return (
      <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wide text-gray-900">Mapa mensual</h3>
            <p className="text-xs text-gray-500">Intensidad por carga diaria</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          {days.map(day => {
            const scheduled = day.scheduled.filter(interview => isInterviewVisible(interview, filterByInterviewer)).length;
            const available = day.available.length;
            const intensity = Math.min(100, scheduled * 18 + available * 4);
            return (
              <div key={day.date} className="rounded-lg border border-gray-200 p-4">
                <p className="text-sm font-semibold text-gray-900">{day.dayLabel}</p>
                <div className="mt-3 h-24 rounded-lg border border-teal-200 bg-teal-50" style={{ opacity: Math.max(0.2, intensity / 100) }} />
                <p className="mt-3 text-xs text-gray-500">{scheduled} agendadas · {available} libres</p>
              </div>
            );
          })}
        </div>
      </section>
    );
  }

  if (viewMode === '2weeks') {
    return (
      <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <div className="mb-4">
          <h3 className="text-sm font-bold uppercase tracking-wide text-gray-900">Timeline compacto</h3>
          <p className="text-xs text-gray-500">Manana y tarde por dia habil</p>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
          {days.map(day => {
            const visibleScheduled = day.scheduled.filter(interview => isInterviewVisible(interview, filterByInterviewer));
            const morning = visibleScheduled.filter(interview => interview.time < '13:00').length;
            const afternoon = visibleScheduled.length - morning;
            return (
              <div key={day.date} className="rounded-lg border border-gray-200 p-3">
                <p className="mb-3 text-sm font-semibold text-gray-900">{day.dayLabel}</p>
                <div className="grid grid-cols-2 gap-2 text-center text-xs">
                  <div className="rounded-md bg-blue-50 p-3 text-blue-700">
                    <p className="text-lg font-bold">{morning}</p>
                    <p>Manana</p>
                  </div>
                  <div className="rounded-md bg-teal-50 p-3 text-teal-700">
                    <p className="text-lg font-bold">{afternoon}</p>
                    <p>Tarde</p>
                  </div>
                </div>
                <p className="mt-3 text-xs text-gray-500">{day.available.length} slots libres</p>
              </div>
            );
          })}
        </div>
      </section>
    );
  }

  return (
    <section className="relative rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wide text-gray-900">Timeline semanal</h3>
          <p className="text-xs text-gray-500">Bloques solidos agendados, bloques punteados disponibles</p>
        </div>
        <div className="flex flex-wrap gap-3 text-xs text-gray-500">
          <span className="inline-flex items-center gap-1"><span className="h-3 w-3 rounded border border-blue-400 bg-blue-50" /> Agendada</span>
          <span className="inline-flex items-center gap-1"><span className="h-3 w-3 rounded border border-dashed border-teal-300 bg-teal-50" /> Disponible</span>
          <span className="inline-flex items-center gap-1"><span className="h-3 w-3 rounded border border-amber-300 bg-amber-50" /> Multiples</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[760px]">
          <div
            className="grid gap-2"
            style={{ gridTemplateColumns: `76px repeat(${days.length}, minmax(120px, 1fr))` }}
          >
            <div />
            {days.map(day => (
              <div key={day.date} className="rounded-lg bg-gray-50 px-3 py-2 text-center">
                <p className="text-sm font-bold text-gray-900">{day.dayLabel}</p>
                <p className="text-xs text-gray-500">{day.date}</p>
              </div>
            ))}

            {TIME_SLOTS.map(time => (
              <React.Fragment key={time}>
                <div className="flex h-14 items-center justify-end pr-2 text-xs font-semibold text-gray-500">{time}</div>
                {days.map(day => {
                  const scheduled = day.scheduled.find(interview => interview.time === time && isInterviewVisible(interview, filterByInterviewer));
                  const available = day.available.find(slot => slot.time === time && (!filterByInterviewer || slot.availableInterviewers.some(interviewer => interviewer.id === filterByInterviewer)));

                  if (scheduled) {
                    const pair = [scheduled.interviewer1, scheduled.interviewer2].filter(Boolean) as InterviewerInfo[];
                    return (
                      <button
                        key={`${day.date}-${time}`}
                        type="button"
                        onClick={() => onInterviewClick(scheduled)}
                        onMouseEnter={event => showTooltip(scheduled, event.currentTarget)}
                        onMouseLeave={() => setTooltip(null)}
                        onFocus={event => showTooltip(scheduled, event.currentTarget)}
                        onBlur={() => setTooltip(null)}
                        className={`relative h-14 overflow-visible rounded-lg border px-2 text-left text-xs shadow-sm transition-all hover:scale-[1.02] hover:shadow-md ${STATUS_STYLES[scheduled.status] || STATUS_STYLES.SCHEDULED}`}
                      >
                        <p className="truncate font-bold">{scheduled.studentName}</p>
                        <p className="truncate">{pair.map(interviewer => getInterviewerInitials(interviewer.name)).join(' + ')}</p>
                      </button>
                    );
                  }

                  if (available) {
                    return (
                      <button
                        key={`${day.date}-${time}`}
                        type="button"
                        onClick={() => onSlotClick(day.date, available.time, available.availableInterviewers)}
                        className={`h-14 rounded-lg border border-dashed px-2 text-left text-xs transition-colors hover:shadow-sm ${
                          available.interviewerCount > 2
                            ? 'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100'
                            : 'border-teal-300 bg-teal-50 text-teal-800 hover:bg-teal-100'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate font-semibold">{getPairLabel(available.availableInterviewers)}</span>
                          {available.interviewerCount > 2 && <FiAlertTriangle className="h-3 w-3 flex-shrink-0" aria-hidden="true" />}
                        </div>
                        <p className="truncate">{available.interviewerCount} disponibles</p>
                      </button>
                    );
                  }

                  return <div key={`${day.date}-${time}`} className="h-14 rounded-lg border border-gray-100 bg-gray-50/50" />;
                })}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      <InterviewTooltip
        interview={tooltip?.interview || null}
        className="fixed z-[80] w-80 text-left"
        style={tooltip ? {
          left: tooltip.left,
          top: tooltip.top,
          transform: tooltip.placement === 'above' ? 'translate(-50%, -100%)' : 'translate(-50%, 0)'
        } : undefined}
      />
    </section>
  );
};

export default WeeklyTimeline;
