import React, { useEffect, useState } from 'react';
import LoadingSpinner from '../ui/LoadingSpinner';
import { interviewerScheduleService, InterviewerSchedule } from '../../services/interviewerScheduleService';

interface AvailabilitySchedulePreviewProps {
  userId: number;
}

const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'] as const;
type DayKey = typeof DAYS[number];

const DAY_LABELS: Record<DayKey, string> = {
  MONDAY: 'Lun',
  TUESDAY: 'Mar',
  WEDNESDAY: 'Mié',
  THURSDAY: 'Jue',
  FRIDAY: 'Vie',
};

const TIME_SLOTS = Array.from({ length: 8 }, (_, i) => {
  const hour = 8 + i;
  return `${hour.toString().padStart(2, '0')}:00`;
});

/** Index where afternoon starts (12:00) */
const AFTERNOON_INDEX = 4;

const formatHour = (time: string): string => {
  const hour = parseInt(time.split(':')[0]);
  return `${hour}:00`;
};

const endHour = (time: string): string => {
  const hour = parseInt(time.split(':')[0]) + 1;
  return `${hour}:00`;
};

/**
 * Vista de solo lectura de los horarios de disponibilidad del usuario.
 * Diseño visual alineado con SimpleAvailabilityCalendar (editor).
 */
const AvailabilitySchedulePreview: React.FC<AvailabilitySchedulePreviewProps> = ({ userId }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [schedule, setSchedule] = useState<Record<string, Set<string>>>({
    MONDAY: new Set(),
    TUESDAY: new Set(),
    WEDNESDAY: new Set(),
    THURSDAY: new Set(),
    FRIDAY: new Set(),
  });

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!userId) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError(null);
        const currentYear = new Date().getFullYear();
        const schedules = await interviewerScheduleService.getInterviewerSchedulesByYear(userId, currentYear);

        const next: Record<string, Set<string>> = {
          MONDAY: new Set(),
          TUESDAY: new Set(),
          WEDNESDAY: new Set(),
          THURSDAY: new Set(),
          FRIDAY: new Set(),
        };

        schedules.forEach((s: InterviewerSchedule) => {
          if (!s.dayOfWeek || s.scheduleType !== 'RECURRING') return;
          if (!(DAYS as readonly string[]).includes(s.dayOfWeek)) return;
          const start = s.startTime.substring(0, 5);
          const end = s.endTime.substring(0, 5);
          TIME_SLOTS.forEach(slot => {
            if (slot >= start && slot < end) {
              next[s.dayOfWeek as string].add(slot);
            }
          });
        });

        if (!cancelled) setSchedule(next);
      } catch {
        if (!cancelled) setError('No se pudieron cargar los horarios');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <LoadingSpinner size="sm" />
        <span className="ml-2 text-sm text-gray-500">Cargando horarios…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 py-4 px-3 bg-red-50 rounded-lg text-sm text-red-600">
        <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
        </svg>
        {error}
      </div>
    );
  }

  const totalBlocks = DAYS.reduce((acc, d) => acc + schedule[d].size, 0);
  const activeDays = DAYS.filter(d => schedule[d].size > 0).length;

  return (
    <div>
      {/* ── Summary ── */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            {totalBlocks} {totalBlocks === 1 ? 'bloque' : 'bloques'} · {totalBlocks}h
          </span>
          <span className="text-xs text-gray-400">{activeDays}/5 días</span>
        </div>
        <span className="text-[10px] uppercase tracking-wider text-gray-300 font-medium">Solo lectura</span>
      </div>

      {/* ── Mini grid ── */}
      <div
        className="inline-grid gap-1 w-full"
        style={{ gridTemplateColumns: 'minmax(40px, auto) repeat(5, 1fr)' }}
      >
        {/* Header */}
        <div />
        {DAYS.map(day => {
          const dayActive = schedule[day].size > 0;
          return (
            <div
              key={day}
              className={`text-center py-1.5 rounded text-xs font-semibold ${
                dayActive ? 'text-emerald-600 bg-emerald-50' : 'text-gray-400'
              }`}
            >
              {DAY_LABELS[day]}
            </div>
          );
        })}

        {/* Slots */}
        {TIME_SLOTS.map((slot, idx) => (
          <React.Fragment key={slot}>
            {/* Afternoon separator */}
            {idx === AFTERNOON_INDEX && (
              <div className="col-span-6 flex items-center gap-1.5 py-0.5">
                <div className="h-px flex-1 bg-gray-100" />
                <span className="text-[9px] uppercase tracking-widest text-gray-300">PM</span>
                <div className="h-px flex-1 bg-gray-100" />
              </div>
            )}

            {/* Time label */}
            <div className="flex items-center justify-end pr-1.5">
              <span className="text-[10px] font-medium text-gray-400 tabular-nums">{formatHour(slot)}</span>
            </div>

            {/* Day cells */}
            {DAYS.map(day => {
              const has = schedule[day].has(slot);
              return (
                <div
                  key={`${day}-${slot}`}
                  className={`h-8 rounded flex items-center justify-center text-[10px] font-medium transition-colors ${
                    has
                      ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                      : 'bg-gray-50/50 text-gray-200 border border-transparent'
                  }`}
                  title={has ? `${DAY_LABELS[day]} ${formatHour(slot)}–${endHour(slot)}` : undefined}
                >
                  {has ? (
                    <svg className="w-3 h-3 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <span className="w-1 h-1 rounded-full bg-gray-200" />
                  )}
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>

      {/* ── Empty state ── */}
      {totalBlocks === 0 && (
        <div className="mt-3 flex items-center gap-2 py-3 px-4 bg-gray-50 rounded-lg text-sm text-gray-500">
          <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          Sin horarios configurados. Usa "Gestionar Horarios" para definirlos.
        </div>
      )}
    </div>
  );
};

export default AvailabilitySchedulePreview;
