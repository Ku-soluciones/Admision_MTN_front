import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FiActivity, FiCalendar, FiGrid, FiList, FiRefreshCw, FiSearch } from 'react-icons/fi';
import interviewService from '../../services/interviewService';
import { InterviewStatus, WeeklyOverviewResponse } from '../../types/interview';
import SharedCalendar from '../admin/SharedCalendar';
import AvailableSlotsPanel from './AvailableSlotsPanel';
import InterviewerLoadPanel from './InterviewerLoadPanel';
import QuickSchedulePopover from './QuickSchedulePopover';
import RangeSelector from './RangeSelector';
import ScheduledPairsTable from './ScheduledPairsTable';
import SummaryBar from './SummaryBar';
import WeeklyTimeline from './WeeklyTimeline';
import { CommandCenterViewMode, QuickScheduleData, SelectedSlot } from './dashboardTypes';

interface InterviewCommandCenterProps {
  initialSurface?: 'operations' | 'calendar';
  onNavigateToInterviews?: () => void;
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

const startOfWeek = (date: Date): Date => {
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  return addDays(date, diff);
};

const getRangeForMode = (anchorDate: Date, viewMode: CommandCenterViewMode): { startDate: string; endDate: string } => {
  if (viewMode === 'day') {
    return { startDate: toDateString(anchorDate), endDate: toDateString(anchorDate) };
  }

  const start = startOfWeek(anchorDate);
  if (viewMode === 'week') {
    return { startDate: toDateString(start), endDate: toDateString(addDays(start, 4)) };
  }
  if (viewMode === '2weeks') {
    return { startDate: toDateString(start), endDate: toDateString(addDays(start, 11)) };
  }
  return { startDate: toDateString(start), endDate: toDateString(addDays(start, 27)) };
};

const formatRangeLabel = (startDate: string, endDate: string, viewMode: CommandCenterViewMode): string => {
  const formatter = new Intl.DateTimeFormat('es-CL', { day: 'numeric', month: 'short' });
  const start = formatter.format(new Date(`${startDate}T00:00:00`));
  const end = formatter.format(new Date(`${endDate}T00:00:00`));
  const prefix = viewMode === 'day' ? 'Dia' : viewMode === 'month' ? 'Mes' : viewMode === '2weeks' ? '2 semanas' : 'Semana';
  return `${prefix} ${start} - ${end}`;
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
      available: day.available.filter(slot => slot.availableInterviewers.some(interviewer => interviewer.name.toLowerCase().includes(query)))
    }))
  };
};

const getStepDays = (viewMode: CommandCenterViewMode): number => {
  if (viewMode === 'day') return 1;
  if (viewMode === '2weeks') return 14;
  if (viewMode === 'month') return 28;
  return 7;
};

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

  const range = useMemo(() => getRangeForMode(anchorDate, viewMode), [anchorDate, viewMode]);
  const rangeLabel = useMemo(() => formatRangeLabel(range.startDate, range.endDate, viewMode), [range.endDate, range.startDate, viewMode]);
  const visibleOverview = useMemo(() => overview ? filterOverview(overview, searchTerm) : null, [overview, searchTerm]);

  const loadOverview = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await interviewService.getWeeklyOverview({
        startDate: range.startDate,
        endDate: range.endDate,
        duration: 30
      });
      setOverview(response);
    } catch (loadError) {
      setError('No se pudo cargar el centro de entrevistas.');
      setOverview(null);
    } finally {
      setIsLoading(false);
    }
  }, [range.endDate, range.startDate]);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  const handleSchedule = async (data: QuickScheduleData) => {
    setIsScheduling(true);
    setSuccessMessage(null);
    try {
      await interviewService.createInterview({
        applicationId: data.applicationId,
        interviewerId: data.interviewer1Id,
        secondInterviewerId: data.interviewer2Id,
        type: data.type,
        mode: data.mode,
        scheduledDate: data.date,
        scheduledTime: data.time,
        duration: 30,
        location: data.location,
        status: InterviewStatus.SCHEDULED
      });
      setSelectedSlot(null);
      setSuccessMessage('Entrevista programada y dashboard actualizado.');
      await loadOverview();
    } catch (scheduleError) {
      setError('No se pudo programar la entrevista desde el dashboard.');
    } finally {
      setIsScheduling(false);
    }
  };

  const moveRange = (direction: number) => {
    setAnchorDate(current => addDays(current, getStepDays(viewMode) * direction));
  };

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-600">Calendario y entrevistas</p>
            <h2 className="mt-1 text-2xl font-bold text-gray-950">Centro operativo de entrevistas</h2>
            <div className="mt-3 grid max-w-4xl gap-2 text-sm text-gray-600 md:grid-cols-3">
              <div className="flex items-start gap-2 rounded-lg bg-gray-50 p-3">
                <FiActivity className="mt-0.5 h-4 w-4 flex-shrink-0 text-teal-600" aria-hidden="true" />
                <span>Revisa agenda, carga y disponibilidad sin salir del calendario.</span>
              </div>
              <div className="flex items-start gap-2 rounded-lg bg-gray-50 p-3">
                <FiGrid className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600" aria-hidden="true" />
                <span>Cambia entre dia, semana, dos semanas, mes o calendario mensual.</span>
              </div>
              <div className="flex items-start gap-2 rounded-lg bg-gray-50 p-3">
                <FiList className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" aria-hidden="true" />
                <span>Agenda seleccionando un postulante pendiente por nombre o RUT.</span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={loadOverview}
              disabled={isLoading}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
            >
              <FiRefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} aria-hidden="true" />
              Actualizar
            </button>
            <button
              type="button"
              onClick={() => setSurface('calendar')}
              className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold ${
                surface === 'calendar'
                  ? 'border-gray-900 bg-gray-900 text-white'
                  : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              <FiCalendar className="h-4 w-4" aria-hidden="true" />
              Calendario
            </button>
            <button
              type="button"
              onClick={() => setSurface('operations')}
              className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold ${
                surface === 'operations'
                  ? 'border-gray-900 bg-gray-900 text-white'
                  : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              <FiGrid className="h-4 w-4" aria-hidden="true" />
              Vista operativa
            </button>
          </div>
        </div>

        {surface === 'operations' && (
          <div className="mt-5 grid gap-4 xl:grid-cols-[1fr_320px]">
            <RangeSelector
              viewMode={viewMode}
              rangeLabel={rangeLabel}
              onViewModeChange={setViewMode}
              onPrevious={() => moveRange(-1)}
              onNext={() => moveRange(1)}
              onToday={() => setAnchorDate(new Date())}
            />
            <label className="relative block">
              <FiSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
              <input
                value={searchTerm}
                onChange={event => setSearchTerm(event.target.value)}
                className="h-10 w-full rounded-lg border border-gray-200 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                placeholder="Buscar familia o entrevistador"
              />
            </label>
          </div>
        )}
      </section>

      {surface === 'calendar' ? (
        <SharedCalendar
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
        <div className="rounded-lg border border-gray-200 bg-white p-12 text-center text-sm text-gray-500 shadow-sm">
          Cargando centro de entrevistas...
        </div>
      ) : visibleOverview ? (
        <>
          <SummaryBar summary={visibleOverview.summary} />
          <WeeklyTimeline
            days={visibleOverview.days}
            viewMode={viewMode}
            filterByInterviewer={filterByInterviewer}
            onSlotClick={(date, time, availableInterviewers) => setSelectedSlot({ date, time, availableInterviewers })}
            onInterviewClick={() => onNavigateToInterviews?.()}
          />
          <div className="grid gap-5 xl:grid-cols-[minmax(280px,360px)_1fr]">
            <InterviewerLoadPanel
              interviewers={visibleOverview.interviewerLoad}
              selectedInterviewerId={filterByInterviewer}
              onInterviewerClick={setFilterByInterviewer}
            />
            <AvailableSlotsPanel
              days={visibleOverview.days}
              onSlotClick={(date, time, availableInterviewers) => setSelectedSlot({ date, time, availableInterviewers })}
            />
          </div>
          <ScheduledPairsTable
            days={visibleOverview.days}
            onInterviewClick={() => onNavigateToInterviews?.()}
          />
        </>
      ) : (
        <div className="rounded-lg border border-gray-200 bg-white p-12 text-center text-sm text-gray-500 shadow-sm">
          No hay datos de entrevistas para este rango.
        </div>
      )}

      {selectedSlot && (
        <QuickSchedulePopover
          date={selectedSlot.date}
          time={selectedSlot.time}
          availableInterviewers={selectedSlot.availableInterviewers}
          isSubmitting={isScheduling}
          onSchedule={handleSchedule}
          onClose={() => setSelectedSlot(null)}
        />
      )}
        </>
      )}
    </div>
  );
};

export default InterviewCommandCenter;
