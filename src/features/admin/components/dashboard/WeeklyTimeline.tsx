import React, { useState } from 'react';
import { FiPlus, FiUsers } from 'react-icons/fi';
import {
  InterviewerInfo,
  WeeklyOverviewDay,
  WeeklyOverviewScheduledInterview
} from '../../types/interview';
import {
  CommandCenterViewMode,
  STATUS_STYLES,
  getInterviewerInitials,
  getPairLabel,
  getPrimaryOperationalInterview,
  getHistoricalInterviews,
  getOperationalInterviews
} from './dashboardTypes';
import InterviewTooltip from './InterviewTooltip';

interface WeeklyTimelineProps {
  days: WeeklyOverviewDay[];
  viewMode: CommandCenterViewMode;
  rangeLabel: string;
  filterByInterviewer: number | null;
  onSlotClick: (date: string, time: string, availableInterviewers: InterviewerInfo[]) => void;
  onInterviewClick: (interview: WeeklyOverviewScheduledInterview) => void;
}

const TIME_SLOTS = [
  '08:00', '09:00', '10:00', '11:00', '12:00',
  '14:00', '15:00', '16:00', '17:00'
];

const buildSlotPairs = (interviewers: InterviewerInfo[]): Array<[InterviewerInfo, InterviewerInfo]> => {
  const pairs: Array<[InterviewerInfo, InterviewerInfo]> = [];
  interviewers.forEach((first, i) => {
    interviewers.slice(i + 1).forEach(second => pairs.push([first, second]));
  });
  return pairs;
};

const getTodayDateString = (): string => {
  const today = new Date();
  const year = today.getFullYear();
  const month = `${today.getMonth() + 1}`.padStart(2, '0');
  const day = `${today.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

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
  rangeLabel,
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
            const visibleScheduled = day.scheduled.filter(interview => isInterviewVisible(interview, filterByInterviewer));
            const scheduled = getOperationalInterviews(visibleScheduled).length;
            const historical = getHistoricalInterviews(visibleScheduled).length;
            const available = day.available.length;
            const intensity = Math.min(100, scheduled * 18 + available * 4);
            return (
              <div key={day.date} className="rounded-lg border border-gray-200 p-4">
                <p className="text-sm font-semibold text-gray-900">{day.dayLabel}</p>
                <div className="mt-3 h-24 rounded-lg border border-teal-200 bg-teal-50" style={{ opacity: Math.max(0.2, intensity / 100) }} />
                <p className="mt-3 text-xs text-gray-500">
                  {scheduled} activas · {available} libres{historical ? ` · ${historical} historial` : ''}
                </p>
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
            const visibleScheduled = getOperationalInterviews(
              day.scheduled.filter(interview => isInterviewVisible(interview, filterByInterviewer))
            );
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
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-bold uppercase tracking-wide text-gray-900">Timeline semanal</h3>
            {viewMode !== 'day' && <span className="text-sm font-semibold text-gray-600">{rangeLabel}</span>}
          </div>
          <p className="text-xs text-gray-500">Bloques de 60 minutos: solidos agendados, punteados disponibles</p>
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
                <div className="flex h-28 items-center justify-end pr-2 text-xs font-semibold text-gray-500">{time}</div>
                {days.map(day => {
                  const slotInterviews = day.scheduled.filter(interview =>
                    interview.time === time && isInterviewVisible(interview, filterByInterviewer)
                  );
                  const scheduled = getPrimaryOperationalInterview(slotInterviews);
                  const activeCount = getOperationalInterviews(slotInterviews).length;
                  const historicalCount = getHistoricalInterviews(slotInterviews).length;
                  const pastAvailable = day.date < getTodayDateString()
                    ? day.available.find(slot => slot.time === time && (!filterByInterviewer || slot.availableInterviewers.some(interviewer => interviewer.id === filterByInterviewer)))
                    : undefined;
                  const available = day.date >= getTodayDateString()
                    ? day.available.find(slot => slot.time === time && slot.interviewerCount >= 2 && (!filterByInterviewer || slot.availableInterviewers.some(interviewer => interviewer.id === filterByInterviewer)))
                    : undefined;

                  if (scheduled && available) {
                    const pair = [scheduled.interviewer1, scheduled.interviewer2].filter(Boolean) as InterviewerInfo[];
                    const availPairs = buildSlotPairs(available.availableInterviewers);
                    if (availPairs.length === 0) {
                      return (
                        <button
                          key={`${day.date}-${time}`}
                          type="button"
                          onClick={() => onInterviewClick(scheduled)}
                          onMouseEnter={event => showTooltip(scheduled, event.currentTarget)}
                          onMouseLeave={() => setTooltip(null)}
                          onFocus={event => showTooltip(scheduled, event.currentTarget)}
                          onBlur={() => setTooltip(null)}
                          className={`relative h-28 overflow-visible rounded-lg border px-3 py-2 text-left text-xs shadow-sm transition-all hover:scale-[1.01] hover:shadow-md ${STATUS_STYLES[scheduled.status] || STATUS_STYLES.SCHEDULED}`}
                        >
                          {(activeCount > 1 || historicalCount > 0) && (
                            <span className="absolute right-2 top-2 rounded-full bg-white/90 px-1.5 py-0.5 text-[10px] font-bold text-gray-600 shadow-sm">
                              {activeCount > 1 ? `+${activeCount - 1}` : `${historicalCount} hist.`}
                            </span>
                          )}
                          <p className="truncate font-bold">{scheduled.studentName}</p>
                          <p className="truncate">{pair.map(interviewer => getInterviewerInitials(interviewer.name)).join(' + ')}</p>
                          {historicalCount > 0 && <p className="mt-1 truncate text-[11px] opacity-80">{historicalCount} cancelada(s) en historial</p>}
                        </button>
                      );
                    }
                    return (
                      <div
                        key={`${day.date}-${time}`}
                        className="flex flex-col gap-1 rounded-lg border border-amber-200 bg-amber-50 p-1 shadow-sm"
                        style={{ minHeight: '7rem', height: 'auto' }}
                      >
                        <button
                          type="button"
                          onClick={() => onInterviewClick(scheduled)}
                          onMouseEnter={event => showTooltip(scheduled, event.currentTarget)}
                          onMouseLeave={() => setTooltip(null)}
                          onFocus={event => showTooltip(scheduled, event.currentTarget)}
                          onBlur={() => setTooltip(null)}
                          className={`relative flex-shrink-0 rounded-md border px-2 py-1.5 text-left text-xs transition-all hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-100 ${STATUS_STYLES[scheduled.status] || STATUS_STYLES.SCHEDULED}`}
                        >
                          {(activeCount > 1 || historicalCount > 0) && (
                            <span className="absolute right-2 top-1.5 rounded-full bg-white/90 px-1.5 py-0.5 text-[10px] font-bold text-gray-600 shadow-sm">
                              {activeCount > 1 ? `+${activeCount - 1}` : `${historicalCount} hist.`}
                            </span>
                          )}
                          <p className="truncate font-bold">{scheduled.studentName}</p>
                          <p className="truncate">{pair.map(interviewer => getInterviewerInitials(interviewer.name)).join(' + ')}</p>
                        </button>
                        {availPairs.length === 1 ? (
                          <button
                            type="button"
                            onClick={() => onSlotClick(day.date, available.time, available.availableInterviewers)}
                            className="inline-flex flex-shrink-0 items-center justify-between gap-2 rounded-md border border-dashed border-teal-300 bg-white px-2 py-1.5 text-left text-xs font-semibold text-teal-800 hover:bg-teal-50 focus:outline-none focus:ring-2 focus:ring-teal-200"
                            aria-label={`Agendar pareja libre el ${day.dayLabel} a las ${available.time}`}
                          >
                            <span className="min-w-0">
                              <span className="block truncate">Pareja libre</span>
                              <span className="block truncate text-[11px] font-medium text-teal-700">
                                {getPairLabel(available.availableInterviewers)}
                              </span>
                            </span>
                            <FiPlus className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                          </button>
                        ) : (
                          <>
                            <div className="flex items-center gap-1 px-1 pt-0.5">
                              <FiUsers className="h-3 w-3 text-teal-600" aria-hidden="true" />
                              <span className="text-[10px] font-semibold text-teal-700">{availPairs.length} parejas libres</span>
                            </div>
                            {availPairs.map(availPair => (
                              <button
                                key={`${availPair[0].id}-${availPair[1].id}`}
                                type="button"
                                onClick={() => onSlotClick(day.date, available.time, available.availableInterviewers)}
                                className="inline-flex flex-shrink-0 items-center justify-between gap-2 rounded-md border border-dashed border-teal-300 bg-white px-2 py-1 text-left text-xs font-semibold text-teal-800 hover:bg-teal-50 focus:outline-none focus:ring-2 focus:ring-teal-200"
                                aria-label={`Agendar ${availPair[0].name} + ${availPair[1].name} el ${day.dayLabel} a las ${available.time}`}
                              >
                                <span className="min-w-0 truncate">
                                  {getInterviewerInitials(availPair[0].name)} + {getInterviewerInitials(availPair[1].name)}
                                </span>
                                <FiPlus className="h-3 w-3 flex-shrink-0" aria-hidden="true" />
                              </button>
                            ))}
                          </>
                        )}
                      </div>
                    );
                  }

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
                        className={`relative h-28 overflow-visible rounded-lg border px-3 py-2 text-left text-xs shadow-sm transition-all hover:scale-[1.01] hover:shadow-md ${STATUS_STYLES[scheduled.status] || STATUS_STYLES.SCHEDULED}`}
                      >
                        {(activeCount > 1 || historicalCount > 0) && (
                          <span className="absolute right-2 top-2 rounded-full bg-white/90 px-1.5 py-0.5 text-[10px] font-bold text-gray-600 shadow-sm">
                            {activeCount > 1 ? `+${activeCount - 1}` : `${historicalCount} hist.`}
                          </span>
                        )}
                        <p className="truncate font-bold">{scheduled.studentName}</p>
                        <p className="truncate">{pair.map(interviewer => getInterviewerInitials(interviewer.name)).join(' + ')}</p>
                        {historicalCount > 0 && <p className="mt-1 truncate text-[11px] opacity-80">{historicalCount} cancelada(s) en historial</p>}
                      </button>
                    );
                  }

                  if (available) {
                    const availPairs = buildSlotPairs(available.availableInterviewers);
                    if (availPairs.length <= 1) {
                      return (
                        <button
                          key={`${day.date}-${time}`}
                          type="button"
                          onClick={() => onSlotClick(day.date, available.time, available.availableInterviewers)}
                          className="h-28 rounded-lg border border-dashed border-teal-300 bg-teal-50 px-3 py-2 text-left text-xs text-teal-800 transition-colors hover:bg-teal-100 hover:shadow-sm"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="truncate font-semibold">{getPairLabel(available.availableInterviewers)}</span>
                          </div>
                          <p className="truncate">{available.interviewerCount} disponibles</p>
                          {historicalCount > 0 && <p className="mt-1 truncate text-[11px] text-gray-500">{historicalCount} historial cancelado</p>}
                        </button>
                      );
                    }
                    return (
                      <div
                        key={`${day.date}-${time}`}
                        className="flex flex-col gap-1 rounded-lg border border-dashed border-teal-400 bg-teal-50 px-2 py-2"
                        style={{ minHeight: '7rem', height: 'auto' }}
                      >
                        <div className="flex items-center justify-between gap-1 pb-0.5">
                          <div className="flex items-center gap-1">
                            <FiUsers className="h-3 w-3 text-teal-600" aria-hidden="true" />
                            <span className="text-[10px] font-bold uppercase tracking-wide text-teal-700">
                              {availPairs.length} parejas
                            </span>
                          </div>
                          <span className="text-[10px] text-teal-600">{available.interviewerCount} disp.</span>
                        </div>
                        {availPairs.map(availPair => (
                          <button
                            key={`${availPair[0].id}-${availPair[1].id}`}
                            type="button"
                            onClick={() => onSlotClick(day.date, available.time, available.availableInterviewers)}
                            className="flex items-center justify-between gap-2 rounded-md border border-dashed border-teal-300 bg-white px-2 py-1 text-left text-xs font-semibold text-teal-800 hover:border-teal-500 hover:bg-teal-50 focus:outline-none focus:ring-2 focus:ring-teal-200"
                            aria-label={`Agendar ${availPair[0].name} + ${availPair[1].name} el ${day.dayLabel} a las ${available.time}`}
                          >
                            <span className="min-w-0 truncate">
                              {getInterviewerInitials(availPair[0].name)} + {getInterviewerInitials(availPair[1].name)}
                            </span>
                            <FiPlus className="h-3 w-3 flex-shrink-0 text-teal-600" aria-hidden="true" />
                          </button>
                        ))}
                        {historicalCount > 0 && (
                          <p className="truncate text-[10px] text-gray-500">{historicalCount} historial cancelado</p>
                        )}
                      </div>
                    );
                  }

                  if (pastAvailable) {
                    return (
                      <div
                        key={`${day.date}-${time}`}
                        className="flex h-28 items-center justify-center rounded-lg border border-dashed border-gray-200 bg-gray-100 px-2 text-center text-[11px] font-semibold uppercase tracking-wide text-gray-400"
                        title="Slot pasado no disponible para agendar"
                      >
                        Pasado
                      </div>
                    );
                  }

                  return <div key={`${day.date}-${time}`} className="h-28 rounded-lg border border-gray-100 bg-gray-50/50" />;
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
