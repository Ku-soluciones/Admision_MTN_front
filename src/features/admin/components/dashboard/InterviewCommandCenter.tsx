import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FiCalendar, FiEdit3, FiGrid, FiRefreshCw, FiSearch } from 'react-icons/fi';
import interviewService from '../../services/interviewService';
import { AvailableInterviewerPair, InterviewLifecycle, InterviewStatus, INTERVIEW_VALIDATION, InterviewerInfo, ManualInterviewCreateResult, WeeklyOverviewResponse } from '../../types/interview';
import SharedCalendar from '../admin/SharedCalendar';
import AvailableSlotsPanel from './AvailableSlotsPanel';
import InterviewerLoadPanel from './InterviewerLoadPanel';
import ManualInterviewDialog from './ManualInterviewDialog';
import QuickSchedulePopover from './QuickSchedulePopover';
import RangeSelector from './RangeSelector';
import RejectedInterviewsQueue from './RejectedInterviewsQueue';
import ScheduledPairsTable from './ScheduledPairsTable';
import SummaryBar from './SummaryBar';
import WeeklyTimeline from './WeeklyTimeline';
import { CommandCenterViewMode, QuickScheduleData, SelectedSlot } from './dashboardTypes';

interface InterviewCommandCenterProps {
  initialSurface?: 'operations' | 'calendar';
  onNavigateToInterviews?: (interviewId?: number) => void;
}

const addDays = (date: Date, days: number): Date => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const toDateString = (date: Date): string => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getTodayDateString = (): string => toDateString(new Date());

const isPastDate = (date: string): boolean => date < getTodayDateString();

const startOfWeek = (date: Date): Date => {
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  return addDays(date, diff);
};

const normalizeBusinessAnchor = (date: Date): Date => {
  const day = date.getDay();
  if (day === 6) return addDays(date, 2);
  if (day === 0) return addDays(date, 1);
  return date;
};

const getRangeForMode = (anchorDate: Date, viewMode: CommandCenterViewMode): { startDate: string; endDate: string } => {
  const businessAnchor = normalizeBusinessAnchor(anchorDate);

  if (viewMode === 'day') {
    return { startDate: toDateString(businessAnchor), endDate: toDateString(businessAnchor) };
  }

  const start = startOfWeek(businessAnchor);
  if (viewMode === 'week') {
    return { startDate: toDateString(start), endDate: toDateString(addDays(start, 4)) };
  }
  if (viewMode === '2weeks') {
    return { startDate: toDateString(start), endDate: toDateString(addDays(start, 11)) };
  }
  return { startDate: toDateString(start), endDate: toDateString(addDays(start, 27)) };
};

const formatRangeLabel = (startDate: string, endDate: string, viewMode: CommandCenterViewMode): string => {
  if (viewMode === 'day') return '';
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
  if (sameMonth) {
    const month = new Intl.DateTimeFormat('es-CL', { month: 'long' }).format(start);
    return `${start.getDate()} - ${end.getDate()} de ${month}`;
  }
  const fmt = new Intl.DateTimeFormat('es-CL', { day: 'numeric', month: 'short' });
  return `${fmt.format(start)} - ${fmt.format(end)}`;
};

const filterOverview = (overview: WeeklyOverviewResponse, searchTerm: string): WeeklyOverviewResponse => {
  const query = searchTerm.trim().toLowerCase();
  if (!query) return overview;

  return {
    ...overview,
    days: overview.days.map(day => ({
      ...day,
      scheduled: day.scheduled.filter(interview => {
        const pair = [interview.interviewer1.name, interview.interviewer2?.name].filter(Boolean).join(' ');
        return `${interview.studentName} ${pair} ${interview.interviewType}`.toLowerCase().includes(query);
      }),
      available: day.available.filter(slot =>
        slot.availableInterviewers.some(interviewer => interviewer.name.toLowerCase().includes(query)) ||
        (slot.availablePairs || []).some(pair =>
          `${pair.cycleDirector.name} ${pair.psychologist.name}`.toLowerCase().includes(query)
        )
      )
    }))
  };
};

const onlyHourlyOverviewSlots = (overview: WeeklyOverviewResponse): WeeklyOverviewResponse => ({
  ...overview,
  days: overview.days.map(day => ({
    ...day,
    available: day.available.filter(slot => slot.time.endsWith(':00'))
  }))
});

type SlotAvailabilityCache = Record<string, InterviewerInfo[]>;

const SLOT_AVAILABILITY_CACHE_KEY = 'admin-interview-slot-availability-cache';

const getSlotKey = (date: string, time: string): string => `${date}T${time}`;

const readSlotAvailabilityCache = (): SlotAvailabilityCache => {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(window.sessionStorage.getItem(SLOT_AVAILABILITY_CACHE_KEY) || '{}');
  } catch {
    return {};
  }
};

const writeSlotAvailabilityCache = (cache: SlotAvailabilityCache) => {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(SLOT_AVAILABILITY_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Session cache is only a UX aid; never block scheduling if storage fails.
  }
};

const uniqueInterviewers = (interviewers: InterviewerInfo[]): InterviewerInfo[] => {
  const seen = new Set<number>();
  return interviewers.filter(interviewer => {
    if (seen.has(interviewer.id)) return false;
    seen.add(interviewer.id);
    return true;
  });
};

const cacheExplicitAvailability = (
  overview: WeeklyOverviewResponse,
  currentCache: SlotAvailabilityCache
): SlotAvailabilityCache => {
  const nextCache = { ...currentCache };
  overview.days.forEach(day => {
    // Cache slots the backend explicitly says are available
    day.available.forEach(slot => {
      if (slot.interviewerCount >= 2) {
        nextCache[getSlotKey(day.date, slot.time)] = uniqueInterviewers(slot.availableInterviewers);
      }
    });
    // Seed cache from scheduled interviews so restorePartialAvailability can
    // recover remaining pairs even on a fresh page load with no prior session.
    // We merge — never replace a richer existing entry.
    day.scheduled.forEach(interview => {
      if (InterviewLifecycle.isInactive(interview.status as InterviewStatus)) return;
      const key = getSlotKey(day.date, interview.time);
      const existing = nextCache[key] ?? [];
      const fromInterview: InterviewerInfo[] = [interview.interviewer1, interview.interviewer2].filter(Boolean) as InterviewerInfo[];
      const merged = uniqueInterviewers([...existing, ...fromInterview]);
      nextCache[key] = merged;
    });
  });
  return nextCache;
};

const removeBookedInterviewersFromCache = (
  currentCache: SlotAvailabilityCache,
  date: string,
  time: string,
  bookedInterviewerIds: number[],
  fallbackInterviewers: InterviewerInfo[] = []
): SlotAvailabilityCache => {
  const key = getSlotKey(date, time);
  const knownInterviewers = currentCache[key] || fallbackInterviewers;
  return {
    ...currentCache,
    [key]: uniqueInterviewers(knownInterviewers)
      .filter(interviewer => !bookedInterviewerIds.includes(interviewer.id))
  };
};

const restorePartialAvailability = (
  overview: WeeklyOverviewResponse,
  availabilityCache: SlotAvailabilityCache
): WeeklyOverviewResponse => ({
  ...overview,
  days: overview.days.map(day => {
    const availableByTime = new Map(day.available.map(slot => [slot.time, slot]));
    const scheduledTimes = Array.from(new Set(day.scheduled.map(interview => interview.time)));
    const recoveredSlots = scheduledTimes.flatMap(time => {
      const explicitSlot = availableByTime.get(time);
      if (explicitSlot && explicitSlot.interviewerCount >= 2) return [];

      const rememberedInterviewers = availabilityCache[getSlotKey(day.date, time)];
      if (!rememberedInterviewers?.length) return [];

      const occupiedInterviewerIds = new Set<number>();
      day.scheduled
        .filter(interview => interview.time === time && !InterviewLifecycle.isInactive(interview.status as InterviewStatus))
        .forEach(interview => {
          occupiedInterviewerIds.add(interview.interviewer1.id);
          if (interview.interviewer2?.id) occupiedInterviewerIds.add(interview.interviewer2.id);
        });

      const remainingInterviewers = rememberedInterviewers.filter(interviewer => !occupiedInterviewerIds.has(interviewer.id));
      if (remainingInterviewers.length < 2) return [];

      return [{
        time,
        availableInterviewers: remainingInterviewers,
        interviewerCount: remainingInterviewers.length
      }];
    });

    const mergedAvailableByTime = new Map(day.available.map(slot => [slot.time, slot]));
    recoveredSlots.forEach(slot => {
      const currentSlot = mergedAvailableByTime.get(slot.time);
      if (!currentSlot || currentSlot.interviewerCount < 2) {
        mergedAvailableByTime.set(slot.time, slot);
      }
    });

    return {
      ...day,
      available: Array.from(mergedAvailableByTime.values()).sort((a, b) => a.time.localeCompare(b.time))
    };
  })
});

const getStepDays = (viewMode: CommandCenterViewMode): number => {
  if (viewMode === 'day') return 1;
  if (viewMode === '2weeks') return 14;
  if (viewMode === 'month') return 28;
  return 7;
};

const BOOKING_DURATION_MINUTES = INTERVIEW_VALIDATION.DURATION.DEFAULT;

const InterviewCommandCenter: React.FC<InterviewCommandCenterProps> = ({
  initialSurface = 'operations',
  onNavigateToInterviews,
}) => {
  const [surface, setSurface] = useState<'operations' | 'calendar'>(initialSurface);
  const [viewMode, setViewMode] = useState<CommandCenterViewMode>('week');
  const [anchorDate, setAnchorDate] = useState(() => new Date());
  const [overview, setOverview] = useState<WeeklyOverviewResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSlot, setSelectedSlot] = useState<SelectedSlot | null>(null);
  const [filterByInterviewer, setFilterByInterviewer] = useState<number | null>(null);
  const [isScheduling, setIsScheduling] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [calendarRefreshKey, setCalendarRefreshKey] = useState(0);
  const availabilityCacheRef = useRef<SlotAvailabilityCache>(readSlotAvailabilityCache());

  const range = useMemo(() => getRangeForMode(anchorDate, viewMode), [anchorDate, viewMode]);
  const rangeLabel = useMemo(() => formatRangeLabel(range.startDate, range.endDate, viewMode), [range.endDate, range.startDate, viewMode]);
  const visibleOverview = useMemo(() => overview ? filterOverview(overview, searchTerm) : null, [overview, searchTerm]);
  const rejectedCount = useMemo(() => (
    visibleOverview?.days.reduce((count, day) => (
      count + day.scheduled.filter(interview => interview.status === InterviewStatus.REJECTED_BY_FAMILY).length
    ), 0) || 0
  ), [visibleOverview]);

  const enrichScheduledSlots = useCallback(async (hourlyOverview: WeeklyOverviewResponse): Promise<WeeklyOverviewResponse> => {
    const today = new Date().toISOString().split('T')[0];
    const slotsToEnrich: Array<{ dayIndex: number; time: string; date: string }> = [];

    hourlyOverview.days.forEach((day, dayIndex) => {
      if (day.date < today) return;
      const availableByTime = new Map(day.available.map(slot => [slot.time, slot]));
      const scheduledTimes = Array.from(new Set(
        day.scheduled
          .filter(interview => !InterviewLifecycle.isInactive(interview.status as InterviewStatus))
          .map(interview => interview.time)
      ));
      scheduledTimes.forEach(time => {
        const existing = availableByTime.get(time);
        if (!existing || existing.interviewerCount < 2) {
          slotsToEnrich.push({ dayIndex, time, date: day.date });
        }
      });
    });

    if (slotsToEnrich.length === 0) return hourlyOverview;

    const enriched = await Promise.all(
      slotsToEnrich.map(async slot => {
        try {
          const result = await interviewService.getSlotAvailability(slot.date, slot.time, BOOKING_DURATION_MINUTES);
          return { ...slot, ...result };
        } catch {
          return { ...slot, availableInterviewers: [], interviewerCount: 0 };
        }
      })
    );

    const enrichedDays = hourlyOverview.days.map((day, dayIndex) => {
      const additions = enriched.filter(e => e.dayIndex === dayIndex && e.interviewerCount >= 2);
      if (additions.length === 0) return day;
      const availableByTime = new Map(day.available.map(slot => [slot.time, slot]));
      additions.forEach(addition => {
        const existing = availableByTime.get(addition.time);
        if (!existing || existing.interviewerCount < 2) {
          availableByTime.set(addition.time, {
            time: addition.time,
            availableInterviewers: addition.availableInterviewers,
            interviewerCount: addition.interviewerCount,
            familyPairCount: addition.familyPairCount,
            availablePairs: addition.availablePairs,
            availablePairCount: addition.availablePairCount,
            availableInterviewTypes: addition.availableInterviewTypes
          });
        }
      });
      return {
        ...day,
        available: Array.from(availableByTime.values()).sort((a, b) => a.time.localeCompare(b.time))
      };
    });

    return { ...hourlyOverview, days: enrichedDays };
  }, []);

  const loadOverview = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await interviewService.getWeeklyOverview({
        startDate: range.startDate,
        endDate: range.endDate,
        duration: BOOKING_DURATION_MINUTES
      });
      const hourlyOverview = onlyHourlyOverviewSlots(response);
      const enrichedOverview = await enrichScheduledSlots(hourlyOverview);
      availabilityCacheRef.current = cacheExplicitAvailability(enrichedOverview, availabilityCacheRef.current);
      writeSlotAvailabilityCache(availabilityCacheRef.current);
      setOverview(restorePartialAvailability(enrichedOverview, availabilityCacheRef.current));
    } catch (loadError) {
      setError('No se pudo cargar el centro de entrevistas.');
      setOverview(null);
    } finally {
      setIsLoading(false);
    }
  }, [enrichScheduledSlots, range.endDate, range.startDate]);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  const handleSchedule = async (data: QuickScheduleData, bookedInterviewerIds: [number, number]): Promise<void> => {
    setIsScheduling(true);
    setSuccessMessage(null);
    try {
      const interview = await interviewService.createInterview({
        applicationId: data.applicationId,
        interviewerId: data.interviewer1Id,
        secondInterviewerId: data.interviewer2Id,
        interviewerPairId: data.interviewerPairId,
        type: data.type,
        mode: data.mode,
        scheduledDate: data.date,
        scheduledTime: data.time,
        duration: BOOKING_DURATION_MINUTES,
        location: data.location,
        status: InterviewStatus.SCHEDULED
      });

      availabilityCacheRef.current = removeBookedInterviewersFromCache(
        availabilityCacheRef.current,
        data.date,
        data.time,
        [bookedInterviewerIds[0], bookedInterviewerIds[1]],
        selectedSlot?.availableInterviewers || []
      );
      writeSlotAvailabilityCache(availabilityCacheRef.current);

      // Enviar invitación por email automáticamente
      const invitation = await interviewService.sendInterviewInvitation(interview.id);
      setSuccessMessage(invitation.success
        ? 'Entrevista programada e invitación enviada.'
        : 'Entrevista programada. La invitación quedó pendiente de envío.');
      await loadOverview();
    } catch (scheduleError: any) {
      const message = scheduleError?.response?.data?.message || scheduleError?.message || 'No se pudo programar la entrevista.';
      setError(message);
      throw new Error(message);
    } finally {
      setIsScheduling(false);
    }
  };

  const moveRange = (direction: number) => {
    setAnchorDate(current => addDays(current, getStepDays(viewMode) * direction));
  };

  const handleSlotClick = (
    date: string,
    time: string,
    availableInterviewers: InterviewerInfo[],
    availablePairs: AvailableInterviewerPair[] = []
  ) => {
    if (isPastDate(date)) {
      setError('No se puede agendar entrevistas en fechas anteriores a hoy.');
      return;
    }

    setError(null);
    setSelectedSlot({ date, time, availableInterviewers, availablePairs });
  };

  const handleReleaseHistoricalInterview = async (interviewId: number) => {
    setError(null);
    setSuccessMessage(null);
    try {
      await interviewService.releaseRejectedInterview(interviewId);
      setSuccessMessage('Entrevista liberada para reagendar.');
      await loadOverview();
    } catch (releaseError: any) {
      setError(releaseError.message || 'No se pudo liberar la entrevista rechazada.');
    }
  };

  const handleManualInterviewCreated = async (result: ManualInterviewCreateResult) => {
    setError(null);
    if (!result.emailRequested) {
      setSuccessMessage('Entrevista excepcional guardada. No se enviaron correos.');
    } else if (result.emailSent) {
      setSuccessMessage('Entrevista excepcional guardada. Se enviaron la invitación y las notificaciones.');
    } else {
      setSuccessMessage('Entrevista excepcional guardada correctamente.');
      setError(result.emailMessage || 'La entrevista quedó guardada, pero no se pudieron enviar los correos.');
    }
    setCalendarRefreshKey(current => current + 1);
    await loadOverview();
  };

  return (
    <div className="space-y-5">
      <section className="flex flex-col gap-4 border-b border-gray-200 pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <h2 className="text-xl font-bold text-gray-950">Calendario global</h2>
          <p className="mt-1 max-w-3xl text-sm text-gray-600">
            {surface === 'operations'
              ? 'Agenda, disponibilidad y carga de entrevistadores.'
              : 'Vista mensual de todas las entrevistas.'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowManualEntry(true)}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-bold text-amber-900 hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-200"
          >
            <FiEdit3 className="h-4 w-4" aria-hidden="true" />
            Ingreso excepcional
          </button>
          <div className="inline-flex gap-2" aria-label="Vista del calendario">
            <button
              type="button"
              onClick={() => setSurface('operations')}
              aria-pressed={surface === 'operations'}
              className={`inline-flex min-h-11 items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-blue-200 ${
                surface === 'operations'
                  ? 'bg-white text-gray-950 ring-1 ring-gray-200'
                  : 'text-gray-600 hover:text-gray-950'
              }`}
            >
              <FiGrid className="h-4 w-4" aria-hidden="true" />
              Vista operativa
            </button>
            <button
              type="button"
              onClick={() => setSurface('calendar')}
              aria-pressed={surface === 'calendar'}
              className={`inline-flex min-h-11 items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-blue-200 ${
                surface === 'calendar'
                  ? 'bg-white text-gray-950 ring-1 ring-gray-200'
                  : 'text-gray-600 hover:text-gray-950'
              }`}
            >
              <FiCalendar className="h-4 w-4" aria-hidden="true" />
              Calendario
            </button>
          </div>
        </div>
      </section>

      {surface === 'calendar' ? (
        <SharedCalendar
          key={calendarRefreshKey}
          onCreateInterview={() => setSurface('operations')}
          showCreateButton
        />
      ) : (
        <>
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          {successMessage}
        </div>
      )}

      {isLoading && !visibleOverview ? (
        <div className="rounded-lg border border-gray-200 bg-white p-12 text-center text-sm text-gray-500">
          Cargando centro de entrevistas...
        </div>
      ) : visibleOverview ? (
        <>
          <SummaryBar summary={visibleOverview.summary} rejectedCount={rejectedCount} />
          <RejectedInterviewsQueue
            days={visibleOverview.days}
            onInterviewClick={(interview) => onNavigateToInterviews?.(interview.id)}
            onReleaseInterview={(interview) => void handleReleaseHistoricalInterview(interview.id)}
          />
          <div className="grid gap-3 xl:grid-cols-[minmax(520px,1fr)_minmax(260px,360px)]">
            <RangeSelector
              viewMode={viewMode}
              isLoading={isLoading}
              onViewModeChange={setViewMode}
              onPrevious={() => moveRange(-1)}
              onNext={() => moveRange(1)}
              onToday={() => setAnchorDate(new Date())}
              onRefresh={loadOverview}
            />
            <label className="relative block">
              <FiSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" aria-hidden="true" />
              <input
                value={searchTerm}
                onChange={event => setSearchTerm(event.target.value)}
                className="h-11 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 text-sm text-gray-900 placeholder:text-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                placeholder="Buscar familia o entrevistador"
              />
            </label>
          </div>
          <WeeklyTimeline
            days={visibleOverview.days}
            viewMode={viewMode}
            rangeLabel={rangeLabel}
            filterByInterviewer={filterByInterviewer}
            onSlotClick={handleSlotClick}
            onInterviewClick={(interview) => onNavigateToInterviews?.(interview.id)}
          />
          <div className="grid gap-5 xl:grid-cols-[minmax(280px,360px)_1fr]">
            <InterviewerLoadPanel
              interviewers={visibleOverview.interviewerLoad}
              selectedInterviewerId={filterByInterviewer}
              onInterviewerClick={setFilterByInterviewer}
            />
            <AvailableSlotsPanel
              days={visibleOverview.days}
              onSlotClick={handleSlotClick}
            />
          </div>
          <ScheduledPairsTable
            days={visibleOverview.days}
            onInterviewClick={(interview) => onNavigateToInterviews?.(interview.id)}
            onReleaseInterview={(interview) => void handleReleaseHistoricalInterview(interview.id)}
            onRescheduleInterview={(interview) => onNavigateToInterviews?.(interview.id)}
          />
        </>
      ) : (
        <div className="rounded-lg border border-gray-200 bg-white p-12 text-center text-sm text-gray-500">
          No hay datos de entrevistas para este rango.
        </div>
      )}

      {selectedSlot && (
        <QuickSchedulePopover
          date={selectedSlot.date}
          time={selectedSlot.time}
          availableInterviewers={selectedSlot.availableInterviewers}
          availablePairs={selectedSlot.availablePairs}
          isSubmitting={isScheduling}
          onSchedule={handleSchedule}
          onClose={() => setSelectedSlot(null)}
        />
      )}

        </>
      )}

      {showManualEntry && (
        <ManualInterviewDialog
          onClose={() => setShowManualEntry(false)}
          onCreated={handleManualInterviewCreated}
        />
      )}
    </div>
  );
};

export default InterviewCommandCenter;
