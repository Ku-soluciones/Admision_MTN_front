import React, { useEffect, useMemo, useState } from 'react';
import {
  FiAlertCircle,
  FiCalendar,
  FiCheck,
  FiChevronRight,
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
  CYCLE_DIRECTOR: 'Dir. Ciclo',
  PSYCHOLOGIST: 'Psicologia',
  COORDINATOR: 'Coordinacion',
  INTERVIEWER: 'Entrevista',
  TEACHER: 'Docente'
};

const pairKey = (pair: SuggestedInterviewerPair) =>
  `${pair.interviewer1.id}-${pair.interviewer2.id}`;

const interviewerLabel = (interviewer: InterviewerInfo) =>
  `${interviewer.name}${interviewer.role ? ` (${roleLabels[interviewer.role] || interviewer.role})` : ''}`;

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

const buildPairs = (interviewers: InterviewerInfo[]): SuggestedInterviewerPair[] => {
  const pairs: SuggestedInterviewerPair[] = [];
  for (let i = 0; i < interviewers.length; i += 1) {
    for (let j = i + 1; j < interviewers.length; j += 1) {
      pairs.push({ interviewer1: interviewers[i], interviewer2: interviewers[j] });
    }
  }
  return pairs;
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
        const filteredSlotsByDate = (data.slotsByDate || []).filter(day => !isPastDate(day.date));
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
  const selectedSummary = selectedSlot && selectedPair && selectedDate
    ? {
        date: selectedDate,
        time: selectedSlot.time,
        pair: selectedPair
      }
    : null;

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
    selectPair(date, slot, slot.suggestedPair);
  };

  if (isLoading) {
    return (
      <section className="rounded-lg border border-blue-100 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <LoadingSpinner size="md" />
          <div>
            <p className="text-sm font-semibold text-gray-900">Buscando el proximo horario disponible</p>
            <p className="text-sm text-gray-600">Revisando agendas comunes para {duration} minutos.</p>
          </div>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-5">
          {[0, 1, 2, 3, 4].map(item => (
            <div key={item} className="h-16 animate-pulse rounded-lg bg-gray-100" />
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
              <p className="font-semibold text-red-900">No se pudo cargar la sugerencia automatica</p>
              <p className="mt-1 text-sm text-red-700">{error}</p>
            </div>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={onManualMode}>
            Modo avanzado
          </Button>
        </div>
      </section>
    );
  }

  if (!slotsData?.nextAvailable || days.every(day => day.slots.length === 0)) {
    return (
      <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-gray-100 p-2">
              <FiCalendar className="h-5 w-5 text-gray-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">Sin disponibilidad en los proximos {daysToSearch} dias</p>
              <p className="mt-1 text-sm text-gray-600">Puedes ampliar la busqueda o seleccionar entrevistadores manualmente.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => setDaysToSearch(prev => Math.min(prev + 5, 14))}>
              Buscar mas adelante
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={onManualMode}>
              Modo avanzado
            </Button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-5">
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-emerald-700 shadow-sm">
              <FiCheck className="h-4 w-4" />
              Proximo horario disponible
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <p className="text-xl font-bold text-emerald-950">
                {formatDate(slotsData.nextAvailable.date)} a las {slotsData.nextAvailable.time}
              </p>
              <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-sm font-medium text-emerald-800">
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

      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Seleccionar otro dia</h3>
            <p className="text-sm text-gray-600">Los dias con punto verde tienen al menos una pareja disponible.</p>
          </div>
          <button
            type="button"
            onClick={() => setDaysToSearch(prev => Math.min(prev + 5, 14))}
            className="inline-flex items-center gap-2 self-start rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={daysToSearch >= 14}
          >
            <FiRefreshCw className="h-4 w-4" />
            Ampliar busqueda
          </button>
        </div>

        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2">
          {days.map((day, index) => {
            const isSelected = selectedDayIndex === index;
            const date = new Date(`${day.date}T00:00:00`);
            const shortLabel = index === 0 ? 'Hoy' : index === 1 ? 'Manana' : date.toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric' });

            return (
              <button
                key={day.date}
                type="button"
                onClick={() => setSelectedDayIndex(index)}
                className={`min-w-[108px] rounded-lg border px-3 py-2 text-left transition ${
                  isSelected
                    ? 'border-azul-monte-tabor bg-blue-50 text-azul-monte-tabor shadow-sm'
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
              Horarios para {selectedDay?.dayLabel || 'el dia seleccionado'}
            </h4>
            <button
              type="button"
              onClick={onManualMode}
              className="text-sm font-semibold text-azul-monte-tabor hover:underline"
            >
              Modo avanzado
            </button>
          </div>

          {!selectedDay || selectedDay.slots.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-5 text-center">
              <p className="text-sm font-medium text-gray-700">No hay parejas disponibles este dia.</p>
              <p className="mt-1 text-sm text-gray-500">Prueba otro dia o usa el modo avanzado.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {selectedDay.slots.map(slot => {
                const isSelected = selectedDate === selectedDay.date && selectedSlot?.time === slot.time;
                const hasManyInterviewers = slot.interviewerCount > 2;
                const pairs = hasManyInterviewers ? buildPairs(slot.availableInterviewers) : [];

                return (
                  <div
                    key={`${selectedDay.date}-${slot.time}`}
                    className={`rounded-lg border p-3 transition ${
                      isSelected ? 'border-azul-monte-tabor bg-blue-50 shadow-sm' : 'border-gray-200 bg-white'
                    }`}
                  >
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => selectSlot(selectedDay.date, slot)}
                        className="flex min-w-0 flex-1 items-start gap-3 text-left disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <span className="flex h-11 w-16 flex-none items-center justify-center rounded-lg bg-gray-900 text-sm font-bold text-white">
                          {slot.time}
                        </span>
                        <span className="min-w-0">
                          <span className="block font-semibold text-gray-900">
                            {interviewerLabel(slot.suggestedPair.interviewer1)} + {interviewerLabel(slot.suggestedPair.interviewer2)}
                          </span>
                          <span className="mt-1 flex flex-wrap items-center gap-2 text-sm text-gray-600">
                            <FiUsers className="h-4 w-4" />
                            {slot.interviewerCount} entrevistadores disponibles
                            {hasManyInterviewers && (
                              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
                                elegir pareja
                              </span>
                            )}
                          </span>
                        </span>
                      </button>
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => selectSlot(selectedDay.date, slot)}
                        className="inline-flex items-center justify-center rounded-lg border border-azul-monte-tabor px-3 py-2 text-sm font-semibold text-azul-monte-tabor hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isSelected ? 'Seleccionado' : 'Seleccionar'}
                        <FiChevronRight className="ml-1 h-4 w-4" />
                      </button>
                    </div>

                    {hasManyInterviewers && isSelected && (
                      <div className="mt-3 rounded-lg border border-blue-200 bg-white p-3">
                        <p className="mb-3 text-sm font-semibold text-blue-900">
                          {slot.interviewerCount} entrevistadores disponibles. Selecciona la pareja para esta entrevista.
                        </p>
                        <div className="grid gap-2 md:grid-cols-2">
                          {pairs.map(pair => {
                            const checked = selectedPair ? pairKey(pair) === pairKey(selectedPair) : false;
                            return (
                              <label
                                key={pairKey(pair)}
                                className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm transition ${
                                  checked ? 'border-azul-monte-tabor bg-blue-50' : 'border-gray-200 hover:bg-gray-50'
                                }`}
                              >
                                <input
                                  type="radio"
                                  name={`pair-${selectedDay.date}-${slot.time}`}
                                  checked={checked}
                                  onChange={() => selectPair(selectedDay.date, slot, pair)}
                                  className="mt-1 text-azul-monte-tabor focus:ring-azul-monte-tabor"
                                />
                                <span className="font-medium text-gray-800">
                                  {interviewerLabel(pair.interviewer1)} + {interviewerLabel(pair.interviewer2)}
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

      {selectedSummary && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold text-emerald-950">Horario seleccionado</p>
              <p className="text-sm text-emerald-800">
                {formatDate(selectedSummary.date)} a las {selectedSummary.time} con {interviewerLabel(selectedSummary.pair.interviewer1)} + {interviewerLabel(selectedSummary.pair.interviewer2)}
              </p>
            </div>
            <FiCheck className="hidden h-6 w-6 text-emerald-700 md:block" />
          </div>
        </div>
      )}
    </section>
  );
};

export default QuickScheduleSelector;
