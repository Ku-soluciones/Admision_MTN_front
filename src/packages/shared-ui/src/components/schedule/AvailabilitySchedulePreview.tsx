import React, { useEffect, useState } from 'react';
import LoadingSpinner from '../ui/LoadingSpinner';
import { interviewerScheduleService, InterviewerSchedule } from '../../services/interviewerScheduleService';

interface AvailabilitySchedulePreviewProps {
  userId: number;
}

const DAYS: Array<keyof typeof DAY_LABELS> = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];
const DAY_LABELS = {
  MONDAY: 'Lun',
  TUESDAY: 'Mar',
  WEDNESDAY: 'Mié',
  THURSDAY: 'Jue',
  FRIDAY: 'Vie'
} as const;

const generateTimeSlots = (): string[] => {
  const slots: string[] = [];
  for (let hour = 8; hour < 16; hour++) {
    slots.push(`${hour.toString().padStart(2, '0')}:00`);
  }
  return slots;
};

const timeSlots = generateTimeSlots();

const formatTimeDisplay = (time: string): string => {
  return time; // 24h format (Chile)
};

/**
 * Vista de solo lectura de los horarios de disponibilidad del usuario.
 * Pensada para incrustarse en el modal de edición sin permitir cambios.
 */
const AvailabilitySchedulePreview: React.FC<AvailabilitySchedulePreviewProps> = ({ userId }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [schedule, setSchedule] = useState<Record<string, Set<string>>>({
    MONDAY: new Set(),
    TUESDAY: new Set(),
    WEDNESDAY: new Set(),
    THURSDAY: new Set(),
    FRIDAY: new Set()
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
          FRIDAY: new Set()
        };

        schedules.forEach((s: InterviewerSchedule) => {
          if (!s.dayOfWeek || s.scheduleType !== 'RECURRING') return;
          if (!DAYS.includes(s.dayOfWeek as any)) return;
          const start = s.startTime.substring(0, 5);
          const end = s.endTime.substring(0, 5);
          timeSlots.forEach(slot => {
            if (slot >= start && slot < end) {
              next[s.dayOfWeek as string].add(slot);
            }
          });
        });

        if (!cancelled) setSchedule(next);
      } catch (e) {
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
        <span className="ml-2 text-sm text-gray-600">Cargando horarios...</span>
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  const totalBlocks = DAYS.reduce((acc, d) => acc + schedule[d].size, 0);
  const activeDays = DAYS.filter(d => schedule[d].size > 0).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-3 text-xs text-gray-600">
        <span>
          <strong className="text-gray-900">{activeDays}</strong> día(s) activo(s)
          {' · '}
          <strong className="text-gray-900">{totalBlocks}</strong> bloque(s) de 60 min
        </span>
        <span className="text-gray-400">Solo lectura</span>
      </div>

      <div className="border border-gray-200 rounded overflow-hidden">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-gray-50">
              <th className="border border-gray-200 px-2 py-1 text-left font-medium text-gray-600">Hora</th>
              {DAYS.map(day => (
                <th key={day} className="border border-gray-200 px-2 py-1 text-center font-medium text-gray-600">
                  {DAY_LABELS[day]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {timeSlots.map(slot => (
              <tr key={slot}>
                <td className="border border-gray-200 px-2 py-1 text-gray-600 whitespace-nowrap">
                  {formatTimeDisplay(slot)}
                </td>
                {DAYS.map(day => {
                  const has = schedule[day].has(slot);
                  return (
                    <td
                      key={`${day}-${slot}`}
                      className={`border border-gray-200 px-2 py-1 text-center ${
                        has ? 'bg-green-50 text-green-700 font-medium' : 'text-gray-300'
                      }`}
                    >
                      {has ? '✓' : '·'}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalBlocks === 0 && (
        <p className="mt-3 text-sm text-gray-500 italic">
          Este usuario aún no ha configurado horarios. Usa "Gestionar Horarios" para definirlos.
        </p>
      )}
    </div>
  );
};

export default AvailabilitySchedulePreview;

