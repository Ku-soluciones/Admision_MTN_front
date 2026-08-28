import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Button from '../ui/Button';
import LoadingSpinner from '../ui/LoadingSpinner';
import { interviewerScheduleService, InterviewerSchedule } from '../../services/interviewerScheduleService';
import { useNotifications } from '../../context/AppContext';

// ─── Constants ───────────────────────────────────────────────────────────────

const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'] as const;
type DayKey = typeof DAYS[number];

const DAY_LABELS: Record<DayKey, string> = {
  MONDAY: 'Lunes',
  TUESDAY: 'Martes',
  WEDNESDAY: 'Miércoles',
  THURSDAY: 'Jueves',
  FRIDAY: 'Viernes',
};

const DAY_SHORT: Record<DayKey, string> = {
  MONDAY: 'Lun',
  TUESDAY: 'Mar',
  WEDNESDAY: 'Mié',
  THURSDAY: 'Jue',
  FRIDAY: 'Vie',
};

/** Blocks from 08:00 to 15:00 — each represents one 60-min slot ending at +1h.
 *  Last block is 15:00–16:00, so full range is 08:00–16:00. */
const TIME_SLOTS = Array.from({ length: 8 }, (_, i) => {
  const hour = 8 + i;
  return `${hour.toString().padStart(2, '0')}:00`;
});

const formatHour = (time: string): string => {
  const hour = parseInt(time.split(':')[0]);
  return `${hour}:00`;
};

const endHourLabel = (time: string): string => {
  const hour = parseInt(time.split(':')[0]) + 1;
  return `${hour}:00`;
};

/** Index where afternoon starts (12:00) — used for visual separator */
const AFTERNOON_INDEX = 4; // 08, 09, 10, 11 | 12, 13, 14, 15

// ─── Types ───────────────────────────────────────────────────────────────────

interface SimpleAvailabilityCalendarProps {
  userId: number;
  userRole: string;
  onScheduleChange?: () => void;
}

type SlotState = 'empty' | 'saved' | 'added' | 'removed';

interface SlotInfo {
  state: SlotState;
  scheduleId?: number;
}

type WeekGrid = Record<DayKey, Record<string, SlotInfo>>;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function emptyGrid(): WeekGrid {
  const grid = {} as WeekGrid;
  for (const day of DAYS) {
    grid[day] = {};
    for (const slot of TIME_SLOTS) {
      grid[day][slot] = { state: 'empty' };
    }
  }
  return grid;
}

function countSlots(grid: WeekGrid, predicate: (s: SlotState) => boolean): number {
  let n = 0;
  for (const day of DAYS) {
    for (const slot of TIME_SLOTS) {
      if (predicate(grid[day][slot].state)) n++;
    }
  }
  return n;
}

// ─── Component ───────────────────────────────────────────────────────────────

const SimpleAvailabilityCalendar: React.FC<SimpleAvailabilityCalendarProps> = ({
  userId,
  userRole,
  onScheduleChange,
}) => {
  const [grid, setGrid] = useState<WeekGrid>(emptyGrid);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { addNotification } = useNotifications();

  // ── Derived state ──────────────────────────────────────────────────────────

  const hasChanges = useMemo(() => {
    return countSlots(grid, s => s === 'added' || s === 'removed') > 0;
  }, [grid]);

  const stats = useMemo(() => {
    let activeBlocks = 0;
    const dayBlocks: Record<string, number> = {};
    for (const day of DAYS) {
      let dayCount = 0;
      for (const slot of TIME_SLOTS) {
        const s = grid[day][slot].state;
        if (s === 'saved' || s === 'added') {
          activeBlocks++;
          dayCount++;
        }
      }
      dayBlocks[day] = dayCount;
    }
    const activeDays = DAYS.filter(d => dayBlocks[d] > 0).length;
    return { activeBlocks, activeDays, totalHours: activeBlocks, dayBlocks };
  }, [grid]);

  // ── Load ───────────────────────────────────────────────────────────────────

  const loadSchedules = useCallback(async () => {
    try {
      setLoading(true);
      const year = new Date().getFullYear();
      const schedules = await interviewerScheduleService.getInterviewerSchedulesByYear(userId, year);
      const newGrid = emptyGrid();

      schedules.forEach((sch: InterviewerSchedule) => {
        if (!sch.dayOfWeek || !(DAYS as readonly string[]).includes(sch.dayOfWeek)) return;
        if (sch.scheduleType !== 'RECURRING') return;

        const st = sch.startTime.substring(0, 5);
        const et = sch.endTime.substring(0, 5);
        TIME_SLOTS.forEach(slot => {
          if (slot >= st && slot < et && newGrid[sch.dayOfWeek as DayKey][slot]) {
            newGrid[sch.dayOfWeek as DayKey][slot] = {
              state: 'saved',
              scheduleId: sch.id,
            };
          }
        });
      });

      setGrid(newGrid);
    } catch (err) {
      console.error('Error loading schedules:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      loadSchedules();
    } else {
      setGrid(emptyGrid());
      setLoading(false);
    }
  }, [userId, loadSchedules]);

  // ── Actions ────────────────────────────────────────────────────────────────

  const toggleSlot = (day: DayKey, slot: string) => {
    setGrid(prev => {
      const next = JSON.parse(JSON.stringify(prev)) as WeekGrid;
      const cur = next[day][slot];
      switch (cur.state) {
        case 'empty':
          next[day][slot] = { state: 'added' };
          break;
        case 'saved':
          next[day][slot] = { state: 'removed', scheduleId: cur.scheduleId };
          break;
        case 'added':
          next[day][slot] = { state: 'empty' };
          break;
        case 'removed':
          next[day][slot] = { state: 'saved', scheduleId: cur.scheduleId };
          break;
      }
      return next;
    });
  };

  const toggleDay = (day: DayKey) => {
    setGrid(prev => {
      const next = JSON.parse(JSON.stringify(prev)) as WeekGrid;
      const hasEmpty = TIME_SLOTS.some(s => next[day][s].state === 'empty' || next[day][s].state === 'removed');
      for (const slot of TIME_SLOTS) {
        const cur = next[day][slot];
        if (hasEmpty) {
          if (cur.state === 'empty') next[day][slot] = { state: 'added' };
          if (cur.state === 'removed') next[day][slot] = { state: 'saved', scheduleId: cur.scheduleId };
        } else {
          if (cur.state === 'saved') next[day][slot] = { state: 'removed', scheduleId: cur.scheduleId };
          if (cur.state === 'added') next[day][slot] = { state: 'empty' };
        }
      }
      return next;
    });
  };

  const toggleAll = () => {
    setGrid(prev => {
      const next = JSON.parse(JSON.stringify(prev)) as WeekGrid;
      const hasEmpty = DAYS.some(d => TIME_SLOTS.some(s => next[d][s].state === 'empty' || next[d][s].state === 'removed'));
      for (const day of DAYS) {
        for (const slot of TIME_SLOTS) {
          const cur = next[day][slot];
          if (hasEmpty) {
            if (cur.state === 'empty') next[day][slot] = { state: 'added' };
            if (cur.state === 'removed') next[day][slot] = { state: 'saved', scheduleId: cur.scheduleId };
          } else {
            if (cur.state === 'saved') next[day][slot] = { state: 'removed', scheduleId: cur.scheduleId };
            if (cur.state === 'added') next[day][slot] = { state: 'empty' };
          }
        }
      }
      return next;
    });
  };

  const discard = () => {
    loadSchedules();
  };

  // ── Save ───────────────────────────────────────────────────────────────────

  const save = async () => {
    try {
      setSaving(true);

      const toDelete = new Set<number>();
      const toCreate: Array<{ day: string; time: string }> = [];

      for (const day of DAYS) {
        for (const slot of TIME_SLOTS) {
          const info = grid[day][slot];
          if (info.state === 'removed' && info.scheduleId) {
            toDelete.add(info.scheduleId);
          }
          if (info.state === 'added') {
            toCreate.push({ day, time: slot });
          }
        }
      }

      for (const id of Array.from(toDelete)) {
        await interviewerScheduleService.deleteSchedule(id);
      }

      for (const { day, time } of toCreate) {
        const hour = parseInt(time.split(':')[0]);
        await interviewerScheduleService.createSchedule({
          interviewer: { id: userId, firstName: '', lastName: '', email: '', role: userRole || 'PROFESSOR' },
          dayOfWeek: day,
          startTime: time,
          endTime: `${(hour + 1).toString().padStart(2, '0')}:00`,
          scheduleType: 'RECURRING',
          year: new Date().getFullYear(),
          isActive: true,
          notes: 'Bloque de 60 minutos',
        });
      }

      await loadSchedules();
      onScheduleChange?.();

      addNotification({
        type: 'success',
        title: 'Horarios guardados',
        message: `${toCreate.length} creados, ${toDelete.size} eliminados.`,
      });
    } catch {
      addNotification({
        type: 'error',
        title: 'Error al guardar',
        message: 'No se pudieron guardar los horarios. Intenta nuevamente.',
      });
    } finally {
      setSaving(false);
    }
  };

  // ── Slot visual ────────────────────────────────────────────────────────────

  const slotStyle = (state: SlotState): React.CSSProperties & Record<string, string> => {
    const base: React.CSSProperties = {
      transition: 'all 150ms cubic-bezier(.4,0,.2,1)',
    };
    switch (state) {
      case 'saved':
        return { ...base, '--tw-shadow': '0 1px 2px 0 rgba(16,185,129,.12)' } as any;
      case 'added':
        return { ...base, '--tw-shadow': '0 1px 3px 0 rgba(59,130,246,.15)' } as any;
      default:
        return base as any;
    }
  };

  const slotClasses = (state: SlotState): string => {
    const base = 'group relative w-full h-14 rounded-lg text-xs font-medium cursor-pointer select-none flex flex-col items-center justify-center gap-0.5 border-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1';
    switch (state) {
      case 'saved':
        return `${base} bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 hover:border-emerald-400 hover:shadow-sm focus-visible:ring-emerald-400 active:scale-[0.97]`;
      case 'added':
        return `${base} bg-blue-50 text-blue-600 border-blue-300 border-dashed hover:bg-blue-100 hover:border-blue-400 hover:shadow-sm focus-visible:ring-blue-400 active:scale-[0.97]`;
      case 'removed':
        return `${base} bg-red-50/60 text-red-400 border-red-200 hover:bg-red-100 hover:border-red-300 focus-visible:ring-red-400 active:scale-[0.97]`;
      default:
        return `${base} bg-white text-gray-300 border-gray-100 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-400 focus-visible:ring-gray-400 active:scale-[0.97]`;
    }
  };

  const slotIcon = (state: SlotState): React.ReactNode => {
    switch (state) {
      case 'saved':
        return (
          <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        );
      case 'added':
        return (
          <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        );
      case 'removed':
        return (
          <svg className="w-3.5 h-3.5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
      default:
        return null;
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <LoadingSpinner />
        <span className="ml-3 text-gray-500">Cargando horarios…</span>
      </div>
    );
  }

  const addedCount = countSlots(grid, s => s === 'added');
  const removedCount = countSlots(grid, s => s === 'removed');

  return (
    <div className="relative">
      {/* Saving overlay */}
      {saving && (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-[2px] flex items-center justify-center z-50 rounded-xl">
          <div className="flex flex-col items-center gap-3">
            <LoadingSpinner />
            <p className="text-sm font-medium text-gray-700">Guardando cambios…</p>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
              <svg className="w-4.5 h-4.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Disponibilidad semanal</h2>
          </div>
          <p className="text-sm text-gray-500 mt-1 ml-10">
            Bloques de 1 hora · Lunes a viernes · 08:00 – 16:00
          </p>
        </div>
        <button
          type="button"
          onClick={toggleAll}
          className="px-3 py-1.5 text-xs font-medium text-gray-500 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 hover:text-gray-700 transition-colors"
        >
          {countSlots(grid, s => s === 'empty' || s === 'removed') > 0
            ? '☐ Seleccionar todo'
            : '☒ Limpiar todo'}
        </button>
      </div>

      {/* ── Summary chips ── */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          {stats.activeBlocks} {stats.activeBlocks === 1 ? 'bloque' : 'bloques'} · {stats.totalHours}h
        </span>
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-gray-50 text-gray-500 border border-gray-100">
          {stats.activeDays}/5 días
        </span>
        {hasChanges && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 animate-[fadeIn_200ms_ease-out]">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            Cambios sin guardar
          </span>
        )}
      </div>

      {/* ── Grid ── */}
      <div className="overflow-x-auto -mx-1 px-1">
        <div
          className="inline-grid gap-1.5"
          style={{ gridTemplateColumns: 'minmax(56px, auto) repeat(5, minmax(80px, 1fr))' }}
        >
          {/* Header row */}
          <div /> {/* empty corner */}
          {DAYS.map(day => {
            const dayCount = stats.dayBlocks[day];
            const dayActive = dayCount > 0;
            return (
              <button
                key={day}
                type="button"
                onClick={() => toggleDay(day)}
                className={`text-center py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer select-none ${
                  dayActive
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-100 hover:bg-emerald-100 hover:border-emerald-200'
                    : 'text-gray-400 border border-transparent hover:bg-gray-50 hover:border-gray-200 hover:text-gray-600'
                }`}
                title={`Click para ${dayActive ? 'limpiar' : 'llenar'} ${DAY_LABELS[day]}`}
              >
                <span className="hidden sm:block">{DAY_LABELS[day]}</span>
                <span className="sm:hidden">{DAY_SHORT[day]}</span>
                {dayActive && (
                  <span className="block text-[10px] font-normal text-emerald-500 mt-0.5">
                    {dayCount}h
                  </span>
                )}
              </button>
            );
          })}

          {/* Time rows */}
          {TIME_SLOTS.map((slot, idx) => (
            <React.Fragment key={slot}>
              {/* Morning/Afternoon divider */}
              {idx === AFTERNOON_INDEX && (
                <>
                  <div className="col-span-6 flex items-center gap-2 py-1">
                    <div className="h-px flex-1 bg-gray-200" />
                    <span className="text-[10px] uppercase tracking-widest text-gray-300 font-medium">Tarde</span>
                    <div className="h-px flex-1 bg-gray-200" />
                  </div>
                </>
              )}

              {/* Time label */}
              <div className="flex items-center justify-end pr-2">
                <div className="text-right">
                  <span className="text-xs font-semibold text-gray-500 tabular-nums leading-none">
                    {formatHour(slot)}
                  </span>
                  <span className="block text-[10px] text-gray-300 tabular-nums">
                    {endHourLabel(slot)}
                  </span>
                </div>
              </div>

              {/* Day cells */}
              {DAYS.map(day => {
                const info = grid[day][slot];
                return (
                  <button
                    key={`${day}-${slot}`}
                    type="button"
                    onClick={() => toggleSlot(day, slot)}
                    className={slotClasses(info.state)}
                    style={slotStyle(info.state)}
                    aria-label={`${DAY_LABELS[day]} ${formatHour(slot)}–${endHourLabel(slot)} — ${
                      info.state === 'saved' ? 'Guardado' :
                      info.state === 'added' ? 'Nuevo' :
                      info.state === 'removed' ? 'Eliminado' : 'Vacío'
                    }`}
                  >
                    {slotIcon(info.state)}
                    {info.state !== 'empty' && (
                      <span className={`text-[10px] tabular-nums leading-none ${
                        info.state === 'removed' ? 'line-through opacity-60' : 'opacity-70'
                      }`}>
                        {formatHour(slot)}–{endHourLabel(slot)}
                      </span>
                    )}
                    {/* Hover hint on empty */}
                    {info.state === 'empty' && (
                      <span className="text-[10px] text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity">
                        {formatHour(slot)}
                      </span>
                    )}
                  </button>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* ── Legend ── */}
      <div className="flex flex-wrap items-center gap-5 mt-5 pt-4 border-t border-gray-100 text-xs text-gray-500">
        <span className="flex items-center gap-2">
          <span className="w-3.5 h-3.5 rounded bg-emerald-50 border-2 border-emerald-200 inline-flex items-center justify-center">
            <svg className="w-2 h-2 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
          </span>
          Guardado
        </span>
        <span className="flex items-center gap-2">
          <span className="w-3.5 h-3.5 rounded bg-blue-50 border-2 border-blue-300 border-dashed inline-flex items-center justify-center">
            <svg className="w-2 h-2 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
          </span>
          Nuevo
        </span>
        <span className="flex items-center gap-2">
          <span className="w-3.5 h-3.5 rounded bg-red-50/60 border-2 border-red-200 inline-flex items-center justify-center">
            <svg className="w-2 h-2 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </span>
          A eliminar
        </span>
        <span className="flex items-center gap-2">
          <span className="w-3.5 h-3.5 rounded bg-white border-2 border-gray-100" />
          Vacío
        </span>
      </div>

      {/* ── Sticky action bar ── */}
      {hasChanges && (
        <div className="sticky bottom-0 mt-6 -mx-6 px-6 py-3.5 bg-white/95 backdrop-blur-sm border-t border-gray-200 flex items-center justify-between gap-4 z-40 shadow-[0_-4px_12px_rgba(0,0,0,.04)]">
          <div className="flex items-center gap-3 text-sm text-gray-600">
            {addedCount > 0 && (
              <span className="inline-flex items-center gap-1 text-blue-600 font-medium">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                {addedCount} {addedCount === 1 ? 'nuevo' : 'nuevos'}
              </span>
            )}
            {addedCount > 0 && removedCount > 0 && <span className="text-gray-300">·</span>}
            {removedCount > 0 && (
              <span className="inline-flex items-center gap-1 text-red-500 font-medium">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                {removedCount} a eliminar
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={discard} disabled={saving}>
              Descartar
            </Button>
            <Button variant="primary" size="sm" onClick={save} isLoading={saving} loadingText="Guardando…">
              Guardar cambios
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SimpleAvailabilityCalendar;
