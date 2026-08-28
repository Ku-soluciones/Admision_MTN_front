import React, { useState } from 'react';
import { FiPlus } from 'react-icons/fi';
import {
  AvailableInterviewerPair,
  InterviewerInfo,
  WeeklyOverviewDay,
  WeeklyOverviewScheduledInterview
} from '../../types/interview';
import {
  CommandCenterViewMode,
  STATUS_STYLES,
  getPrimaryOperationalInterview,
  getHistoricalInterviews,
  getOperationalInterviews
} from './dashboardTypes';
import InterviewTooltip from './InterviewTooltip';
import { countFamilyInterviewerPairs } from '../../../../packages/shared-ui/src/utils/interviewerEligibility';

interface WeeklyTimelineProps {
  days: WeeklyOverviewDay[];
  viewMode: CommandCenterViewMode;
  rangeLabel: string;
  filterByInterviewer: number | null;
  onSlotClick: (
    date: string,
    time: string,
    availableInterviewers: InterviewerInfo[],
    availablePairs?: AvailableInterviewerPair[]
  ) => void;
  onInterviewClick: (interview: WeeklyOverviewScheduledInterview) => void;
}

const TIME_SLOTS = [
  '08:00', '09:00', '10:00', '11:00', '12:00',
  '14:00', '15:00', '16:00', '17:00'
];

const getFamilyPairCount = (interviewers: InterviewerInfo[], reportedCount?: number): number => (
  typeof reportedCount === 'number' ? reportedCount : countFamilyInterviewerPairs(interviewers)
);

interface SlotAvailabilityButtonProps {
  label: string;
  dayLabel: string;
  date: string;
  time: string;
  interviewers: InterviewerInfo[];
  cyclePairs: AvailableInterviewerPair[];
  familyPairCount: number;
  onSlotClick: WeeklyTimelineProps['onSlotClick'];
  compact?: boolean;
}

const SlotAvailabilityButton: React.FC<SlotAvailabilityButtonProps> = ({
  label,
  dayLabel,
  date,
  time,
  interviewers,
  cyclePairs,
  familyPairCount,
  onSlotClick,
  compact = false
}) => (
  <button
    type="button"
    onClick={() => onSlotClick(date, time, interviewers, cyclePairs)}
    className={`flex w-full flex-col justify-center text-left text-teal-950 transition-colors hover:bg-teal-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-teal-300 ${
      compact
        ? 'min-h-11 border-t border-gray-200 bg-white px-2 py-1.5'
        : 'h-28 rounded-lg border border-teal-300 bg-white px-3 py-2.5'
    }`}
    aria-label={`${label} el ${dayLabel} a las ${time}. ${familyPairCount} parejas familiares y ${cyclePairs.length} parejas de Director de Ciclo y Psicólogo`}
  >
    <span className="flex w-full items-center justify-between gap-2">
      <span className="text-xs font-bold">{label}</span>
      <FiPlus className="h-4 w-4 flex-shrink-0 text-teal-700" aria-hidden="true" />
    </span>
    <span className={`space-y-0.5 text-[10px] font-medium leading-4 text-teal-800 ${compact ? '' : 'mt-2'}`}>
      {familyPairCount > 0 && (
        <span className="block">Familiar: {familyPairCount}</span>
      )}
      {cyclePairs.length > 0 && (
        <span className="block">Director + Psicólogo: {cyclePairs.length}</span>
      )}
    </span>
  </button>
);

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
      <section className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-gray-950">Mapa mensual</h3>
            <p className="text-sm text-gray-600">Intensidad por carga diaria</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-gray-200 bg-gray-200 md:grid-cols-5">
          {days.map(day => {
            const visibleScheduled = day.scheduled.filter(interview => isInterviewVisible(interview, filterByInterviewer));
            const scheduled = getOperationalInterviews(visibleScheduled).length;
            const historical = getHistoricalInterviews(visibleScheduled).length;
            const available = day.available.length;
            const intensity = Math.min(100, scheduled * 18 + available * 4);
            return (
              <div key={day.date} className="bg-white p-4">
                <p className="text-sm font-semibold text-gray-900">{day.dayLabel}</p>
                <div className="mt-3 h-2 rounded-full bg-gray-100" aria-hidden="true">
                  <div className="h-full rounded-full bg-teal-600" style={{ width: `${Math.max(4, intensity)}%` }} />
                </div>
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
      <section className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="mb-4">
          <h3 className="text-base font-bold text-gray-950">Vista de dos semanas</h3>
          <p className="text-sm text-gray-600">Mañana y tarde por día hábil</p>
        </div>
        <div className="grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-gray-200 bg-gray-200 md:grid-cols-2 xl:grid-cols-5">
          {days.map(day => {
            const visibleScheduled = getOperationalInterviews(
              day.scheduled.filter(interview => isInterviewVisible(interview, filterByInterviewer))
            );
            const morning = visibleScheduled.filter(interview => interview.time < '13:00').length;
            const afternoon = visibleScheduled.length - morning;
            return (
              <div key={day.date} className="bg-white p-3">
                <p className="mb-3 text-sm font-semibold text-gray-900">{day.dayLabel}</p>
                <div className="grid grid-cols-2 divide-x divide-gray-200 border-y border-gray-200 text-center text-xs">
                  <div className="p-3 text-blue-700">
                    <p className="text-lg font-bold">{morning}</p>
                    <p>Mañana</p>
                  </div>
                  <div className="p-3 text-teal-700">
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
    <section className="relative rounded-lg border border-gray-200 bg-white p-4">
      <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h3 className="text-base font-bold text-gray-950">Agenda semanal</h3>
            {viewMode !== 'day' && <span className="text-sm font-semibold text-gray-600">{rangeLabel}</span>}
          </div>
          <p className="text-sm text-gray-600">Bloques de 60 minutos con disponibilidad válida por tipo de entrevista.</p>
        </div>
        <div className="flex flex-wrap gap-3 text-xs text-gray-500">
          <span className="inline-flex items-center gap-1"><span className="h-3 w-3 rounded border border-blue-400 bg-blue-50" /> Agendada</span>
          <span className="inline-flex items-center gap-1"><span className="h-3 w-3 rounded border border-teal-300 bg-white" /> Disponible</span>
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
                    ? day.available.find(slot => {
                      const familyPairCount = getFamilyPairCount(slot.availableInterviewers, slot.familyPairCount);
                      const cyclePairCount = slot.availablePairCount ?? slot.availablePairs?.length ?? 0;
                      return slot.time === time
                        && (familyPairCount > 0 || cyclePairCount > 0)
                        && (!filterByInterviewer || slot.availableInterviewers.some(interviewer => interviewer.id === filterByInterviewer));
                    })
                    : undefined;

                  if (scheduled && available) {
                    const pair = [scheduled.interviewer1, scheduled.interviewer2].filter(Boolean) as InterviewerInfo[];
                    const cyclePairs = available.availablePairs || [];
                    const familyPairCount = getFamilyPairCount(available.availableInterviewers, available.familyPairCount);
                    const hasValidAvailability = cyclePairs.length > 0 || familyPairCount > 0;
                    return (
                      <div
                        key={`${day.date}-${time}`}
                        className="flex h-28 flex-col overflow-hidden rounded-lg border border-gray-200 bg-white"
                      >
                        <button
                          type="button"
                          onClick={() => onInterviewClick(scheduled)}
                          onMouseEnter={event => showTooltip(scheduled, event.currentTarget)}
                          onMouseLeave={() => setTooltip(null)}
                          onFocus={event => showTooltip(scheduled, event.currentTarget)}
                          onBlur={() => setTooltip(null)}
                          className={`relative min-h-12 flex-1 border-0 px-2 py-1.5 text-left text-xs focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-200 ${STATUS_STYLES[scheduled.status] || STATUS_STYLES.SCHEDULED}`}
                        >
                          {(activeCount > 1 || historicalCount > 0) && (
                            <span className="absolute right-2 top-1.5 text-[10px] font-bold text-gray-600">
                              {activeCount > 1 ? `+${activeCount - 1}` : `${historicalCount} hist.`}
                            </span>
                          )}
                          <p className="truncate font-bold">{scheduled.studentName}</p>
                          <p className="truncate text-[11px]" title={pair.map(interviewer => interviewer.name).join(' + ')}>
                            {pair.map(interviewer => interviewer.name).join(' + ')}
                          </p>
                        </button>
                        {hasValidAvailability && (
                          <SlotAvailabilityButton
                            compact
                            label="Agendar otra"
                            dayLabel={day.dayLabel}
                            date={day.date}
                            time={available.time}
                            interviewers={available.availableInterviewers}
                            cyclePairs={cyclePairs}
                            familyPairCount={familyPairCount}
                            onSlotClick={onSlotClick}
                          />
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
                        className={`relative h-28 overflow-visible rounded-lg border px-3 py-2 text-left text-xs transition-colors focus:outline-none focus:ring-2 focus:ring-blue-200 ${STATUS_STYLES[scheduled.status] || STATUS_STYLES.SCHEDULED}`}
                      >
                        {(activeCount > 1 || historicalCount > 0) && (
                          <span className="absolute right-2 top-2 text-[10px] font-bold text-gray-600">
                            {activeCount > 1 ? `+${activeCount - 1}` : `${historicalCount} hist.`}
                          </span>
                        )}
                        <p className="truncate font-bold">{scheduled.studentName}</p>
                        <p className="mt-1 line-clamp-2 text-[11px] leading-snug" title={pair.map(interviewer => interviewer.name).join(' + ')}>
                          {pair.map(interviewer => interviewer.name).join(' + ')}
                        </p>
                        {historicalCount > 0 && <p className="mt-1 truncate text-[11px] opacity-80">{historicalCount} cancelada(s) en historial</p>}
                      </button>
                    );
                  }

                  if (available) {
                    const cyclePairs = available.availablePairs || [];
                    const familyPairCount = getFamilyPairCount(available.availableInterviewers, available.familyPairCount);

                    if (cyclePairs.length === 0 && familyPairCount === 0) {
                      return (
                        <div
                          key={`${day.date}-${time}`}
                          className="flex h-28 flex-col justify-center rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600"
                        >
                          <p className="font-semibold text-gray-800">Sin parejas válidas</p>
                          <p className="mt-1 leading-snug">Hay entrevistadores libres, pero no forman una combinación permitida.</p>
                        </div>
                      );
                    }

                    return (
                      <SlotAvailabilityButton
                        key={`${day.date}-${time}`}
                        label="Disponible"
                        dayLabel={day.dayLabel}
                        date={day.date}
                        time={available.time}
                        interviewers={available.availableInterviewers}
                        cyclePairs={cyclePairs}
                        familyPairCount={familyPairCount}
                        onSlotClick={onSlotClick}
                      />
                    );
                  }

                  if (pastAvailable) {
                    return (
                      <div
                        key={`${day.date}-${time}`}
                        className="flex h-28 items-center justify-center rounded-lg border border-gray-200 bg-gray-100 px-2 text-center text-xs font-medium text-gray-500"
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
