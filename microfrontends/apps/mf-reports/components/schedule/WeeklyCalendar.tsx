import React, { useState, useEffect } from 'react';
import Button from '../ui/Button';
import LoadingSpinner from '../ui/LoadingSpinner';
import { interviewerScheduleService, InterviewerSchedule } from '../../services/interviewerScheduleService';

interface WeeklyCalendarProps {
  userId: number;
  userRole: string;
  onScheduleChange?: () => void;
}

interface TimeSlot {
  hour: number;
  minute: number;
  time: string; // "08:00", "08:30", etc.
  isSelected: boolean;
  hasSchedule: boolean;
  scheduleId?: number;
}

interface DaySchedule {
  [key: string]: TimeSlot; // key is "08:00", "08:30", etc.
}

interface WeeklySchedule {
  MONDAY: DaySchedule;
  TUESDAY: DaySchedule;
  WEDNESDAY: DaySchedule;
  THURSDAY: DaySchedule;
  FRIDAY: DaySchedule;
}

const WeeklyCalendar: React.FC<WeeklyCalendarProps> = ({
  userId,
  userRole,
  onScheduleChange
}) => {

  const [schedule, setSchedule] = useState<WeeklySchedule>({
    MONDAY: {},
    TUESDAY: {},
    WEDNESDAY: {},
    THURSDAY: {},
    FRIDAY: {}
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Generar slots de 30 minutos desde 8:00 AM hasta 4:30 PM
  const generateTimeSlots = (): string[] => {
    const slots: string[] = [];
    for (let hour = 8; hour <= 16; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`);
      if (hour < 16) { // No agregar 16:30 si solo queremos hasta 16:00
        slots.push(`${hour.toString().padStart(2, '0')}:30`);
      }
    }
    return slots;
  };

  const timeSlots = generateTimeSlots(); // ["08:00", "08:30", ..., "16:00", "16:30"]
  const days = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];
  const dayLabels = {
    MONDAY: 'Lunes',
    TUESDAY: 'Martes',
    WEDNESDAY: 'Miércoles',
    THURSDAY: 'Jueves',
    FRIDAY: 'Viernes'
  };

  // Inicializar el calendario vacío
  const initializeEmptySchedule = (): WeeklySchedule => {
    const emptySchedule: WeeklySchedule = {
      MONDAY: {},
      TUESDAY: {},
      WEDNESDAY: {},
      THURSDAY: {},
      FRIDAY: {}
    };

    days.forEach(day => {
      timeSlots.forEach(timeSlot => {
        const [hourStr, minuteStr] = timeSlot.split(':');
        emptySchedule[day as keyof WeeklySchedule][timeSlot] = {
          hour: parseInt(hourStr),
          minute: parseInt(minuteStr),
          time: timeSlot,
          isSelected: false,
          hasSchedule: false
        };
      });
    });

    return emptySchedule;
  };

  // Cargar horarios existentes
  const loadSchedules = async () => {
    try {
      setLoading(true);
      const currentYear = new Date().getFullYear();
      console.log(`[WeeklyCalendar] Cargando horarios para userId: ${userId}, año: ${currentYear}`);
      const schedules = await interviewerScheduleService.getInterviewerSchedulesByYear(userId, currentYear);
      console.log(`[WeeklyCalendar] Horarios recibidos del backend:`, schedules);
      console.log(`[WeeklyCalendar] Total de horarios: ${schedules.length}`);

      // Inicializar calendario vacío
      const newSchedule = initializeEmptySchedule();

      // Marcar horarios existentes
      let markedCount = 0;
      schedules.forEach((schedule: InterviewerSchedule) => {
        console.log(`[WeeklyCalendar] Procesando schedule:`, {
          id: schedule.id,
          dayOfWeek: schedule.dayOfWeek,
          startTime: schedule.startTime,
          endTime: schedule.endTime,
          scheduleType: schedule.scheduleType
        });

        // Validar que el día existe en nuestro calendario (solo Lunes-Viernes)
        const validDays = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];
        if (!schedule.dayOfWeek || !validDays.includes(schedule.dayOfWeek)) {
          console.log(`[WeeklyCalendar] Día no soportado o inválido: ${schedule.dayOfWeek} (solo Lun-Vie)`);
          return; // Skip este horario
        }

        if (schedule.dayOfWeek && schedule.scheduleType === 'RECURRING') {
          // Normalizar tiempos para asegurar formato "08:00" (con cero adelante)
          // Esto previene problemas de comparación con tiempos como "8:00"
          const startTime = schedule.startTime.padStart(5, '0'); // "8:00" → "08:00"
          const endTime = schedule.endTime.padStart(5, '0');     // "8:30" → "08:30"
          console.log(`[WeeklyCalendar] Tiempos normalizados - Start: ${startTime}, End: ${endTime}`);

          // Marcar todos los slots en el rango como ocupados
          timeSlots.forEach(slot => {
            if (slot >= startTime && slot < endTime) {
              if (newSchedule[schedule.dayOfWeek as keyof WeeklySchedule][slot]) {
                newSchedule[schedule.dayOfWeek as keyof WeeklySchedule][slot] = {
                  ...newSchedule[schedule.dayOfWeek as keyof WeeklySchedule][slot],
                  hasSchedule: true,
                  isSelected: false,
                  scheduleId: schedule.id
                };
                markedCount++;
                console.log(`[WeeklyCalendar] Marcado slot ${schedule.dayOfWeek} ${slot} con schedule ID ${schedule.id}`);
              }
            }
          });
        } else {
          console.log(`[WeeklyCalendar] Schedule omitido - dayOfWeek: ${schedule.dayOfWeek}, tipo: ${schedule.scheduleType}`);
        }
      });

      console.log(`[WeeklyCalendar] Total de slots marcados: ${markedCount}`);
      setSchedule(newSchedule);
    } catch (error) {
      console.error('[WeeklyCalendar] Error loading schedules:', error);
      console.error('[WeeklyCalendar] Error details:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) {
      loadSchedules();
    } else {
      setSchedule(initializeEmptySchedule());
      setLoading(false);
    }
  }, [userId]);

  // Alternar selección de slot de tiempo
  const toggleTimeSlot = (day: string, timeSlot: string) => {
    setSchedule(prev => {
      // Crear copia profunda para evitar mutaciones
      const newSchedule = JSON.parse(JSON.stringify(prev)) as WeeklySchedule;
      const currentSlot = newSchedule[day as keyof WeeklySchedule][timeSlot];

      // DEFENSIVE CHECK: Verify slot exists before trying to access it
      if (!currentSlot) {
        console.error(`Slot ${timeSlot} no existe para ${day}`);
        return prev; // Return previous state unchanged
      }

      // Si ya tiene horario guardado, lo marcamos para eliminación
      if (currentSlot.hasSchedule) {
        newSchedule[day as keyof WeeklySchedule][timeSlot] = {
          ...currentSlot,
          hasSchedule: false,
          isSelected: false
        };
      } else {
        // Alternar selección normal
        newSchedule[day as keyof WeeklySchedule][timeSlot] = {
          ...currentSlot,
          isSelected: !currentSlot.isSelected
        };
      }

      setHasChanges(true);
      return newSchedule;
    });
  };

  // Obtener slots seleccionados para un día (ordenados)
  const getSelectedSlots = (day: string): string[] => {
    const daySchedule = schedule[day as keyof WeeklySchedule];
    return Object.entries(daySchedule)
      .filter(([_, slot]) => slot.isSelected)
      .map(([time, _]) => time)
      .sort();
  };

  // Guardar cambios con lógica incremental (solo modifica lo que cambió)
  const saveSchedules = async () => {
    try {
      setSaving(true);

      console.log('Iniciando guardado incremental de horarios...');

      // 1. Cargar horarios actuales de la BD
      const existingSchedules = await interviewerScheduleService.getInterviewerSchedulesByYear(userId, new Date().getFullYear());
      console.log(`Horarios existentes en BD: ${existingSchedules.length}`);

      // 2. Construir conjunto de slots seleccionados en pantalla
      // IMPORTANTE: Incluir tanto los nuevos (isSelected) como los existentes (hasSchedule)
      const selectedSlots = new Set<string>();
      for (const day of days) {
        const daySchedule = schedule[day as keyof WeeklySchedule];
        Object.entries(daySchedule).forEach(([time, slot]) => {
          // Considerar tanto slots nuevos como existentes que no han sido desmarcados
          if (slot.isSelected || slot.hasSchedule) {
            selectedSlots.add(`${day}-${time}`);
          }
        });
      }
      console.log(`Slots activos en pantalla (nuevos + existentes): ${selectedSlots.size}`);

      // 3. Construir mapa de slots existentes en BD
      const existingSlotsMap = new Map<string, number>(); // key: "MONDAY-09:00", value: scheduleId
      existingSchedules.forEach((schedule: InterviewerSchedule) => {
        if (schedule.dayOfWeek && schedule.scheduleType === 'RECURRING') {
          const startTime = schedule.startTime;
          const endTime = schedule.endTime;

          // Marcar todos los slots en el rango
          timeSlots.forEach(slot => {
            if (slot >= startTime && slot < endTime) {
              const key = `${schedule.dayOfWeek}-${slot}`;
              existingSlotsMap.set(key, schedule.id!);
            }
          });
        }
      });
      console.log(`Slots existentes mapeados: ${existingSlotsMap.size}`);

      // 4. Calcular diferencias
      const slotsToDelete = new Set<number>(); // scheduleIds a eliminar
      const slotsToCreate: Array<{day: string, time: string}> = []; // slots a crear

      // Encontrar slots a eliminar (en BD pero NO en pantalla)
      existingSlotsMap.forEach((scheduleId, key) => {
        if (!selectedSlots.has(key)) {
          slotsToDelete.add(scheduleId);
        }
      });

      // Encontrar slots a crear (en pantalla pero NO en BD)
      selectedSlots.forEach(key => {
        if (!existingSlotsMap.has(key)) {
          const [day, time] = key.split('-');
          slotsToCreate.push({ day, time });
        }
      });

      console.log(`Horarios a eliminar: ${slotsToDelete.size}`);
      console.log(`Horarios a crear: ${slotsToCreate.length}`);

      // 5. Ejecutar solo los cambios necesarios

      // Eliminar horarios desmarcados
      for (const scheduleId of slotsToDelete) {
        console.log(`🗑️ Eliminando horario ID: ${scheduleId}`);
        await interviewerScheduleService.deleteSchedule(scheduleId);
      }

      // Crear horarios nuevos (UN registro de 30 minutos por cada bloque)
      // NO agrupar bloques consecutivos - cada bloque es independiente
      const slotsByDay: Record<string, string[]> = {};
      slotsToCreate.forEach(({ day, time }) => {
        if (!slotsByDay[day]) slotsByDay[day] = [];
        slotsByDay[day].push(time);
      });

      for (const [day, times] of Object.entries(slotsByDay)) {
        // Ordenar tiempos
        times.sort();

        // Crear UN registro por cada bloque de 30 minutos
        for (const slot of times) {
          const [hour, minute] = slot.split(':').map(Number);

          // Calcular el fin del bloque (siempre +30 minutos)
          const nextMinute = minute === 0 ? 30 : 0;
          const nextHour = minute === 30 ? hour + 1 : hour;
          const endTime = `${nextHour.toString().padStart(2, '0')}:${nextMinute.toString().padStart(2, '0')}`;

          console.log(`Creando bloque de 30 min: ${day} ${slot}-${endTime}`);

          const scheduleData = {
            interviewer: { id: userId },
            dayOfWeek: day,
            startTime: slot,
            endTime: endTime,  // Siempre +30 minutos
            scheduleType: 'RECURRING' as const,
            year: new Date().getFullYear(),
            isActive: true,
            notes: 'Bloque de 30 minutos - Sistema de horarios'
          };

          await interviewerScheduleService.createSchedule(scheduleData);
        }
      }

      console.log('Guardado incremental completado');

      // 6. Recargar horarios
      await loadSchedules();
      setHasChanges(false);

      if (onScheduleChange) {
        onScheduleChange();
      }

    } catch (error) {
      console.error('Error saving schedules:', error);
      alert('Error al guardar los horarios. Por favor, inténtalo nuevamente.');
    } finally {
      setSaving(false);
    }
  };

  // Formatear hora para mostrar
  const formatHour = (timeSlot: string): string => {
    const [hourStr, minuteStr] = timeSlot.split(':');
    const hour = parseInt(hourStr);
    const minute = minuteStr;

    if (hour === 12) return `12:${minute} PM`;
    if (hour > 12) return `${hour - 12}:${minute} PM`;
    return `${hour}:${minute} AM`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoadingSpinner />
        <span className="ml-2">Cargando horarios...</span>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Horarios Disponibles para Entrevistas
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Haz click en las casillas para marcar tus horarios disponibles (8:00 AM - 4:30 PM, intervalos de 30 min)
          </p>
        </div>

        {hasChanges && (
          <Button
            onClick={saveSchedules}
            disabled={saving}
            style={{
              backgroundColor: '#3b82f6',
              color: 'white',
              padding: '8px 16px',
              borderRadius: '4px',
              border: 'none',
              cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.6 : 1
            }}
          >
            {saving ? 'Guardando Horarios...' : 'Guardar Horarios'}
          </Button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="border border-gray-300 bg-gray-50 p-3 text-left font-medium text-gray-700">
                Hora
              </th>
              {days.map(day => (
                <th key={day} className="border border-gray-300 bg-gray-50 p-3 text-center font-medium text-gray-700">
                  {dayLabels[day as keyof typeof dayLabels]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {timeSlots.map(timeSlot => {
              return (
                <tr key={timeSlot}>
                  <td className="border border-gray-300 bg-gray-50 p-2 font-medium text-gray-700 text-center text-sm">
                    {formatHour(timeSlot)}
                  </td>
                  {days.map(day => {
                    const slot = schedule[day as keyof WeeklySchedule][timeSlot];
                    const isSelected = slot?.isSelected;
                    const hasSchedule = slot?.hasSchedule;


                    return (
                      <td key={`${day}-${timeSlot}`} className="border border-gray-300 p-1">
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            toggleTimeSlot(day, timeSlot);
                          }}
                          style={{
                            width: '100%',
                            height: '32px', // Reducido de 48px para acomodar más filas
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: '500',
                            border: '2px solid #333',
                            cursor: 'pointer',
                            backgroundColor: hasSchedule
                              ? '#22c55e'
                              : isSelected
                                ? '#3b82f6'
                                : '#f3f4f6',
                            color: hasSchedule || isSelected ? 'white' : '#6b7280'
                          }}
                          title={
                            hasSchedule
                              ? 'Click para eliminar horario guardado'
                              : isSelected
                                ? 'Click para quitar'
                                : 'Click para agregar'
                          }
                        >
                          {hasSchedule ? '' : isSelected ? '' : ''}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center gap-6 text-sm text-gray-600">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gray-100 border rounded"></div>
          <span>Disponible para marcar</span>
        </div>
        <div className="flex items-center gap-2">
          <div style={{
            width: '16px',
            height: '16px',
            backgroundColor: '#3b82f6',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '12px'
          }}></div>
          <span>Seleccionado (sin guardar)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-500 rounded flex items-center justify-center text-white text-xs"></div>
          <span>Horario guardado (click para eliminar)</span>
        </div>
      </div>

      {hasChanges && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            Tienes cambios sin guardar. Haz click en "Guardar Cambios" para aplicarlos.
          </p>
        </div>
      )}
    </div>
  );
};

export default WeeklyCalendar;
