import React, { useEffect, useMemo, useState } from 'react';
import {
  FiAlertCircle,
  FiCalendar,
  FiCheck,
  FiClock,
  FiRefreshCw,
  FiUsers
} from 'react-icons/fi';
import Button from '../ui/Button';
import LoadingSpinner from '../ui/LoadingSpinner';
import interviewService from '../../services/interviewService';
import {
  DaySlotsInfo,
  InterviewerInfo,
  NextAvailableSlotInfo,
  NextAvailableSlotsResponse,
  SuggestedInterviewerPair
} from '../../types/interview';
import { buildFamilyInterviewerPairs } from '../../utils/interviewerEligibility';

interface QuickScheduleSelection {
  date: string;
  time: string;
  interviewer1Id: number;
  interviewer1Name: string;
  interviewer2Id: number;
  interviewer2Name: string;
  interviewers: InterviewerInfo[];
}

interface QuickScheduleSelectorProps {
  duration: number;
  onSlotSelect: (selection: QuickScheduleSelection) => void;
  onManualMode: () => void;
  disabled?: boolean;
}

const roleLabels: Record<string, string> = {
  CYCLE_DIRECTOR: 'Director/a de Ciclo',
  PSYCHOLOGIST: 'Psicólogo/a',
  COORDINATOR: 'Coordinador/a',
  INTERVIEWER: 'Entrevistador/a',
  TEACHER: 'Docente'
};

const pairKey = (pair: SuggestedInterviewerPair) =>
  `${pair.interviewer1.id}-${pair.interviewer2.id}`;

const interviewerLabel = (interviewer: InterviewerInfo) =>
  interviewer.name;

const interviewerRoleLabel = (interviewer: InterviewerInfo) =>
  roleLabels[interviewer.role || ''] || 'Entrevistador/a';

const formatDate = (date: string) => {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('es-CL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  });
};

const getTodayDateString = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = `${today.getMonth() + 1}`.padStart(2, '0');
  const day = `${today.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const isPastDate = (date: string) => date < getTodayDateString();

const buildFamilyPairs = (interviewers: InterviewerInfo[]): SuggestedInterviewerPair[] => {
  return buildFamilyInterviewerPairs(interviewers).map(([interviewer1, interviewer2]) => ({
    interviewer1,
    interviewer2
  }));
};

const QuickScheduleSelector: React.FC<QuickScheduleSelectorProps> = ({
  duration,
  onSlotSelect,
  onManualMode,
  disabled = false
}) => {
  const [slotsData, setSlotsData] = useState<NextAvailableSlotsResponse | null>(null);
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [selectedSlot, setSelectedSlot] = useState<NextAvailableSlotInfo | null>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedPair, setSelectedPair] = useState<SuggestedInterviewerPair | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [daysToSearch, setDaysToSearch] = useState(5);

  useEffect(() => {
    let isMounted = true;

    const loadSlots = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const data = await interviewService.getNextAvailableSlots({
          days: daysToSearch,
          duration
        });

        if (!isMounted) return;
        const filteredSlotsByDate = (data.slotsByDate || [])
          .filter(day => !isPastDate(day.date))
          .map(day => ({
            ...day,
            slots: day.slots.filter(slot => buildFamilyPairs(slot.availableInterviewers).length > 0)
          }));
        const firstAvailableDay = filteredSlotsByDate.find(day => day.slots.length > 0);
        const firstAvailableSlot = firstAvailableDay?.slots[0];
        const nextAvailable = data.nextAvailable && !isPastDate(data.nextAvailable.date)
          ? data.nextAvailable
          : firstAvailableDay && firstAvailableSlot
            ? {
                date: firstAvailableDay.date,
                time: firstAvailableSlot.time,
                dayOfWeek: firstAvailableDay.dayOfWeek,
                interviewers: firstAvailableSlot.availableInterviewers
              }
            : null;

        setSlotsData({
          ...data,
          nextAvailable,
          slotsByDate: filteredSlotsByDate
        });

        const nextDate = nextAvailable?.date;
        const nextIndex = nextDate
          ? Math.max(0, filteredSlotsByDate.findIndex(day => day.date === nextDate))
          : 0;
        setSelectedDayIndex(nextIndex);
      } catch (requestError: any) {
        if (!isMounted) return;
        setError(requestError?.response?.data?.message || requestError?.message || 'No se pudo cargar disponibilidad.');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadSlots();

    return () => {
      isMounted = false;
    };
  }, [daysToSearch, duration]);

  const days = slotsData?.slotsByDate ?? [];
  const selectedDay: DaySlotsInfo | undefined = days[selectedDayIndex];
  const nextAvailableSlot = useMemo(() => {
    if (!slotsData?.nextAvailable) return null;
    const day = slotsData.slotsByDate.find(item => item.date === slotsData.nextAvailable?.date);
    return day?.slots.find(slot => slot.time === slotsData.nextAvailable?.time) ?? null;
  }, [slotsData]);

  const selectPair = (date: string, slot: NextAvailableSlotInfo, pair: SuggestedInterviewerPair) => {
    if (isPastDate(date)) {
      setError('No se puede agendar entrevistas en fechas anteriores a hoy.');
      return;
    }

    setSelectedDate(date);
    setSelectedSlot(slot);
    setSelectedPair(pair);
    onSlotSelect({
      date,
      time: slot.time,
      interviewer1Id: pair.interviewer1.id,
      interviewer1Name: pair.interviewer1.name,
      interviewer2Id: pair.interviewer2.id,
      interviewer2Name: pair.interviewer2.name,
      interviewers: [pair.interviewer1, pair.interviewer2]
    });
  };

  const selectSlot = (date: string, slot: NextAvailableSlotInfo) => {
    const familyPair = buildFamilyPairs(slot.availableInterviewers)[0];
    if (!familyPair) {
      setError('No hay una pareja válida para entrevista familiar en este horario.');
      return;
    }
    selectPair(date, slot, familyPair);
  };

  if (isLoading) {
    return (
      <section className="rounded-lg border border-gray-200 bg-white p-5">
        <div className="flex items-center gap-3">
          <LoadingSpinner size="md" />
          <div>
            <p className="text-sm font-semibold text-gray-900">Buscando el próximo horario disponible</p>
            <p className="text-sm text-gray-600">Revisando agendas comunes de {duration} minutos.</p>
          </div>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-5">
          {[0, 1, 2, 3, 4].map(item => (
            <div key={item} className="h-16 animate-pulse rounded-lg bg-gray-100 motion-reduce:animate-none" />
          ))}
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-lg border border-red-200 bg-red-50 p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <FiAlertCircle className="mt-0.5 h-5 w-5 flex-none text-red-600" />
            <div>
              <p className="font-semibold text-red-900">No se pudieron cargar las sugerencias</p>
              <p className="mt-1 text-sm text-red-700">{error}</p>
            </div>
          </div>
          <Button type="button" variant="outline" size="sm" className="min-h-11" onClick={onManualMode}>
            Agendar manualmente
          </Button>
        </div>
      </section>
    );
  }

  if (!slotsData?.nextAvailable || days.every(day => day.slots.length === 0)) {
    return (
      <section className="rounded-lg border border-gray-200 bg-white p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-gray-100 p-2">
              <FiCalendar className="h-5 w-5 text-gray-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">Sin disponibilidad en los próximos {daysToSearch} días</p>
              <p className="mt-1 text-sm text-gray-600">Amplía la búsqueda o agenda manualmente.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" size="sm" className="min-h-11" onClick={() => setDaysToSearch(prev => Math.min(prev + 5, 14))}>
              Buscar más adelante
            </Button>
            <Button type="button" variant="outline" size="sm" className="min-h-11" onClick={onManualMode}>
              Agendar manualmente
            </Button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-5">
      <div className="rounded-lg border border-emerald-300 bg-white p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="mb-2 inline-flex items-center gap-2 text-xs font-semibold text-emerald-700">
              <FiCheck className="h-4 w-4" />
              Próximo horario disponible
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <p className="text-xl font-bold text-emerald-950">
                {formatDate(slotsData.nextAvailable.date)} a las {slotsData.nextAvailable.time}
              </p>
              <span className="inline-flex items-center gap-1 text-sm font-medium text-emerald-800">
                <FiClock className="h-4 w-4" />
                {duration} min
              </span>
            </div>
            <p className="mt-2 text-sm text-emerald-900">
              {slotsData.nextAvailable.interviewers.map(interviewerLabel).join(' + ')}
            </p>
          </div>
          <Button
            type="button"
            variant="success"
            disabled={disabled || !nextAvailableSlot}
            onClick={() => nextAvailableSlot && selectSlot(slotsData.nextAvailable!.date, nextAvailableSlot)}
            className="shrink-0"
          >
            <FiCheck className="mr-2 h-5 w-5" />
            Usar este horario
          </Button>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Seleccionar otro día</h3>
            <p className="text-sm text-gray-600">El indicador verde señala días con parejas disponibles.</p>
          </div>
          <button
            type="button"
            onClick={() => setDaysToSearch(prev => Math.min(prev + 5, 14))}
            className="inline-flex min-h-11 items-center gap-2 self-start rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={daysToSearch >= 14}
          >
            <FiRefreshCw className="h-4 w-4" />
            Ampliar búsqueda
          </button>
        </div>

        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2">
          {days.map((day, index) => {
            const isSelected = selectedDayIndex === index;
            const date = new Date(`${day.date}T00:00:00`);
            const shortLabel = index === 0 ? 'Hoy' : index === 1 ? 'Mañana' : date.toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric' });

            return (
              <button
                key={day.date}
                type="button"
                onClick={() => setSelectedDayIndex(index)}
                className={`min-h-11 min-w-[108px] rounded-lg border px-3 py-2 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-blue-200 ${
                  isSelected
                    ? 'border-azul-monte-tabor bg-blue-50 text-azul-monte-tabor'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <span className="block text-sm font-semibold">{shortLabel}</span>
                <span className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                  <span className={`h-2 w-2 rounded-full ${day.slots.length > 0 ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                  {day.slots.length} horarios
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h4 className="text-sm font-semibold text-gray-900">
              Horarios para {selectedDay?.dayLabel || 'el día seleccionado'}
            </h4>
            <button
              type="button"
              onClick={onManualMode}
              className="min-h-11 rounded-lg px-2 text-sm font-semibold text-azul-monte-tabor hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-200"
            >
              Agendar manualmente
            </button>
          </div>

          {!selectedDay || selectedDay.slots.length === 0 ? (
            <div className="border-y border-gray-200 py-5 text-center">
              <p className="text-sm font-medium text-gray-700">No hay parejas disponibles este día.</p>
              <p className="mt-1 text-sm text-gray-500">Prueba otro día o agenda manualmente.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 border-y border-gray-200">
              {selectedDay.slots.map(slot => {
                const isSelected = selectedDate === selectedDay.date && selectedSlot?.time === slot.time;
                const pairs = buildFamilyPairs(slot.availableInterviewers);
                const primaryPair = pairs[0];
                const hasManyInterviewers = pairs.length > 1;

                return (
                  <div
                    key={`${selectedDay.date}-${slot.time}`}
                    className={`px-2 py-3 transition-colors ${
                      isSelected ? 'bg-blue-50' : 'bg-white'
                    }`}
                  >
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => selectSlot(selectedDay.date, slot)}
                      className="flex min-h-11 w-full min-w-0 items-start gap-3 rounded-md px-1 text-left focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        <span className="w-14 flex-none pt-0.5 text-sm font-bold text-gray-950">
                          {slot.time}
                        </span>
                        <span className="min-w-0">
                          <span className="block font-semibold text-gray-900">
                            {interviewerLabel(primaryPair.interviewer1)} + {interviewerLabel(primaryPair.interviewer2)}
                          </span>
                          <span className="mt-1 flex flex-wrap items-center gap-1.5 text-sm text-gray-600">
                            <FiUsers className="h-4 w-4" />
                            {slot.interviewerCount} entrevistadores disponibles
                            {hasManyInterviewers && <span>· {pairs.length} parejas</span>}
                          </span>
                        </span>
                        {isSelected && <FiCheck className="ml-auto mt-0.5 h-5 w-5 flex-none text-azul-monte-tabor" aria-hidden="true" />}
                    </button>

                    {hasManyInterviewers && isSelected && (
                      <div className="mt-2 border-t border-blue-200 pt-3">
                        <p className="mb-2 text-sm font-semibold text-blue-900">
                          Elegir pareja
                        </p>
                        <div className="divide-y divide-blue-100">
                          {pairs.map(pair => {
                            const checked = selectedPair ? pairKey(pair) === pairKey(selectedPair) : false;
                            return (
                              <label
                                key={pairKey(pair)}
                                className={`flex min-h-11 cursor-pointer items-start gap-3 px-1 py-2 text-sm transition-colors focus-within:ring-2 focus-within:ring-blue-200 ${
                                  checked ? 'text-blue-950' : 'text-gray-800 hover:bg-white/70'
                                }`}
                              >
                                <input
                                  type="radio"
                                  name={`pair-${selectedDay.date}-${slot.time}`}
                                  checked={checked}
                                  onChange={() => selectPair(selectedDay.date, slot, pair)}
                                  className="mt-1 text-azul-monte-tabor focus:ring-azul-monte-tabor"
                                />
                                <span className="min-w-0">
                                  <span className="block font-medium">
                                    {interviewerLabel(pair.interviewer1)} + {interviewerLabel(pair.interviewer2)}
                                  </span>
                                  <span className={`mt-0.5 block text-xs ${checked ? 'text-blue-800' : 'text-gray-600'}`}>
                                    {interviewerRoleLabel(pair.interviewer1)} + {interviewerRoleLabel(pair.interviewer2)}
                                  </span>
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default QuickScheduleSelector;
