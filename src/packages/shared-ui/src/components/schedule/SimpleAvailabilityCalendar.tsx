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
  MONDAY: 'L',
  TUESDAY: 'M',
  WEDNESDAY: 'X',
  THURSDAY: 'J',
  FRIDAY: 'V',
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

  const slotClasses = (state: SlotState): string => {
    const base = 'w-full h-10 rounded-md text-sm font-medium transition-all duration-100 ease-out cursor-pointer select-none flex items-center justify-center';
    switch (state) {
      case 'saved':
        return `${base} bg-emerald-100 text-emerald-700 border-2 border-emerald-300 hover:bg-emerald-200`;
      case 'added':
        return `${base} bg-blue-100 text-blue-700 border-2 border-blue-300 hover:bg-blue-200 border-dashed`;
      case 'removed':
        return `${base} bg-red-50 text-red-400 border-2 border-red-300 hover:bg-red-100 line-through`;
      default:
        return `${base} bg-gray-50 text-gray-300 border-2 border-transparent hover:bg-gray-100 hover:border-gray-200`;
    }
  };

  const slotLabel = (state: SlotState): string => {
    switch (state) {
      case 'saved': return '✓';
      case 'added': return '+';
      case 'removed': return '−';
      default: return '';
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
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900">Disponibilidad semanal</h2>
        <p className="text-sm text-gray-500 mt-1">
          Bloques de 1 hora · Lunes a viernes · 08:00 a 16:00
        </p>
      </div>

      {/* ── Summary chips ── */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-emerald-50 text-emerald-700">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          {stats.activeBlocks} {stats.activeBlocks === 1 ? 'bloque' : 'bloques'} · {stats.totalHours}h semanales
        </span>
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-gray-100 text-gray-600">
          {stats.activeDays} de 5 días activos
        </span>
        {hasChanges && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            Cambios sin guardar
          </span>
        )}
      </div>

      {/* ── Quick actions ── */}
      <div className="flex flex-wrap gap-2 mb-5">
        <button
          type="button"
          onClick={toggleAll}
          className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
        >
          {countSlots(grid, s => s === 'empty' || s === 'removed') > 0
            ? 'Seleccionar todo'
            : 'Limpiar todo'}
        </button>
      </div>

      {/* ── Grid ── */}
      <div className="overflow-x-auto">
        <div className="inline-grid gap-1.5" style={{ gridTemplateColumns: 'auto repeat(5, minmax(72px, 1fr))' }}>

          {/* Header row */}
          <div className="w-20" /> {/* empty corner */}
          {DAYS.map(day => {
            const dayActive = stats.dayBlocks[day] > 0;
            return (
              <button
                key={day}
                type="button"
                onClick={() => toggleDay(day)}
                className={`text-center py-2 rounded-md text-sm font-semibold transition-colors cursor-pointer select-none ${
                  dayActive
                    ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                    : 'text-gray-500 hover:bg-gray-100'
                }`}
                title={`Click para ${dayActive ? 'limpiar' : 'llenar'} ${DAY_LABELS[day]}`}
              >
                <span className="hidden sm:inline">{DAY_LABELS[day]}</span>
                <span className="sm:hidden">{DAY_SHORT[day]}</span>
              </button>
            );
          })}

          {/* Time rows */}
          {TIME_SLOTS.map(slot => (
            <React.Fragment key={slot}>
              {/* Time label */}
              <div className="w-20 flex items-center justify-end pr-3">
                <span className="text-xs font-medium text-gray-400 tabular-nums leading-none">
                  {formatHour(slot)}
                  <span className="text-[10px] text-gray-300 block">
                    {endHourLabel(slot)}
                  </span>
                </span>
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
                    aria-label={`${DAY_LABELS[day]} ${formatHour(slot)} - ${info.state === 'saved' ? 'Guardado' : info.state === 'added' ? 'Nuevo' : info.state === 'removed' ? 'Eliminado' : 'Vacío'}`}
                  >
                    {slotLabel(info.state)}
                  </button>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* ── Legend ── */}
      <div className="flex flex-wrap items-center gap-4 mt-4 text-xs text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-emerald-100 border-2 border-emerald-300" />
          Guardado
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-blue-100 border-2 border-blue-300 border-dashed" />
          Nuevo
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-red-50 border-2 border-red-300" />
          A eliminar
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-gray-50 border-2 border-transparent" />
          Vacío
        </span>
      </div>

      {/* ── Sticky action bar ── */}
      {hasChanges && (
        <div className="sticky bottom-0 mt-6 -mx-6 px-6 py-4 bg-white/95 backdrop-blur border-t border-gray-200 flex items-center justify-between gap-4 z-40">
          <p className="text-sm text-gray-600">
            {countSlots(grid, s => s === 'added')} {countSlots(grid, s => s === 'added') === 1 ? 'bloque nuevo' : 'bloques nuevos'}
            {countSlots(grid, s => s === 'removed') > 0 && (
              <> · {countSlots(grid, s => s === 'removed')} a eliminar</>
            )}
          </p>
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
