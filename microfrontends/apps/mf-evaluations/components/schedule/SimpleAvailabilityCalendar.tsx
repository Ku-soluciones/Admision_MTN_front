import React, { useState, useEffect } from 'react';
import Button from '../ui/Button';
import LoadingSpinner from '../ui/LoadingSpinner';
import { interviewerScheduleService, InterviewerSchedule } from '../../services/interviewerScheduleService';
import { useNotifications } from '../../context/AppContext';

interface SimpleAvailabilityCalendarProps {
  userId: number;
  userRole: string;
  onScheduleChange?: () => void;
}

interface TimeSlot {
  hour: number;
  minute: number;
  time: string;
  isSelected: boolean;
  hasSchedule: boolean;
  scheduleId?: number;
}

interface DaySchedule {
  [key: string]: TimeSlot;
}

interface WeeklySchedule {
  MONDAY: DaySchedule;
  TUESDAY: DaySchedule;
  WEDNESDAY: DaySchedule;
  THURSDAY: DaySchedule;
  FRIDAY: DaySchedule;
}

const SimpleAvailabilityCalendar: React.FC<SimpleAvailabilityCalendarProps> = ({
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
  const [reloading, setReloading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  
  // Quick config state
  const [startTime, setStartTime] = useState('12:30');
  const [endTime, setEndTime] = useState('15:30');
  const [selectedDays, setSelectedDays] = useState({
    MONDAY: false,
    TUESDAY: false,
    WEDNESDAY: false,
    THURSDAY: false,
    FRIDAY: false
  });

  const { addNotification } = useNotifications();

  // Generate time slots from 8:00 AM to 4:30 PM
  const generateTimeSlots = (): string[] => {
    const slots: string[] = [];
    for (let hour = 8; hour <= 16; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`);
      if (hour < 16) {
        slots.push(`${hour.toString().padStart(2, '0')}:30`);
      }
    }
    return slots;
  };

  const timeSlots = generateTimeSlots();
  const days = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];
  const dayLabels = {
    MONDAY: 'Lunes',
    TUESDAY: 'Martes',
    WEDNESDAY: 'Miércoles',
    THURSDAY: 'Jueves',
    FRIDAY: 'Viernes'
  };

  const dayButtons = [
    { key: 'MONDAY', label: 'L' },
    { key: 'TUESDAY', label: 'M' },
    { key: 'WEDNESDAY', label: 'X' },
    { key: 'THURSDAY', label: 'J' },
    { key: 'FRIDAY', label: 'V' }
  ];

  // Initialize empty schedule
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

  // Load existing schedules
  const loadSchedules = async () => {
    try {
      setLoading(true);
      const currentYear = new Date().getFullYear();
      const schedules = await interviewerScheduleService.getInterviewerSchedulesByYear(userId, currentYear);

      const newSchedule = initializeEmptySchedule();

      schedules.forEach((schedule: InterviewerSchedule) => {
        const validDays = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];
        if (!schedule.dayOfWeek || !validDays.includes(schedule.dayOfWeek)) {
          return;
        }

        if (schedule.dayOfWeek && schedule.scheduleType === 'RECURRING') {
          const startTime = schedule.startTime.padStart(5, '0');
          const endTime = schedule.endTime.padStart(5, '0');

          timeSlots.forEach(slot => {
            if (slot >= startTime && slot < endTime) {
              if (newSchedule[schedule.dayOfWeek as keyof WeeklySchedule][slot]) {
                newSchedule[schedule.dayOfWeek as keyof WeeklySchedule][slot] = {
                  ...newSchedule[schedule.dayOfWeek as keyof WeeklySchedule][slot],
                  hasSchedule: true,
                  isSelected: false,
                  scheduleId: schedule.id
                };
              }
            }
          });
        }
      });

      setSchedule(newSchedule);
    } catch (error) {
      console.error('Error loading schedules:', error);
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

  // Format time for display
  const formatTimeDisplay = (time: string): string => {
    const [hourStr, minuteStr] = time.split(':');
    const hour = parseInt(hourStr);
    const minute = minuteStr;

    if (hour === 12) return `12:${minute} PM`;
    if (hour > 12) return `${hour - 12}:${minute} PM`;
    return `${hour}:${minute} AM`;
  };

  // Toggle time slot selection
  const toggleTimeSlot = (day: string, timeSlot: string) => {
    setSchedule(prev => {
      const newSchedule = JSON.parse(JSON.stringify(prev)) as WeeklySchedule;
      const currentSlot = newSchedule[day as keyof WeeklySchedule][timeSlot];

      if (!currentSlot) return prev;

      if (currentSlot.hasSchedule) {
        newSchedule[day as keyof WeeklySchedule][timeSlot] = {
          ...currentSlot,
          hasSchedule: false,
          isSelected: false
        };
      } else {
        newSchedule[day as keyof WeeklySchedule][timeSlot] = {
          ...currentSlot,
          isSelected: !currentSlot.isSelected
        };
      }

      setHasChanges(true);
      return newSchedule;
    });
  };

  // Toggle day selection for quick config
  const toggleDay = (day: string) => {
    setSelectedDays(prev => ({
      ...prev,
      [day]: !prev[day as keyof typeof prev]
    }));
  };

  // Apply quick config
  const applyQuickConfig = () => {
    const activeDays = Object.keys(selectedDays).filter(day => selectedDays[day as keyof typeof selectedDays]);
    
    if (activeDays.length === 0) {
      addNotification({
        type: 'warning',
        title: 'Configuración rápida',
        message: 'Por favor selecciona al menos un día de la semana.'
      });
      return;
    }

    setSchedule(prev => {
      const newSchedule = JSON.parse(JSON.stringify(prev)) as WeeklySchedule;

      activeDays.forEach(day => {
        timeSlots.forEach(slot => {
          if (slot >= startTime && slot < endTime) {
            if (newSchedule[day as keyof WeeklySchedule][slot]) {
              newSchedule[day as keyof WeeklySchedule][slot] = {
                ...newSchedule[day as keyof WeeklySchedule][slot],
                isSelected: true
              };
            }
          }
        });
      });

      setHasChanges(true);
      return newSchedule;
    });
  };

  // Calculate summary
  const getSummary = () => {
    let totalBlocks = 0;
    let activeDays = 0;

    days.forEach(day => {
      const daySchedule = schedule[day as keyof WeeklySchedule];
      const selectedSlots = Object.entries(daySchedule)
        .filter(([_, slot]) => slot.isSelected || slot.hasSchedule)
        .map(([time, _]) => time);

      if (selectedSlots.length > 0) {
        activeDays++;
        totalBlocks += selectedSlots.length;
      }
    });

    const totalHours = (totalBlocks * 0.5);

    return {
      activeDays,
      totalHours,
      timeRange: activeDays > 0 ? `${formatTimeDisplay(startTime)} - ${formatTimeDisplay(endTime)}` : ''
    };
  };

  // Save schedules
  const saveSchedules = async () => {
    try {
      setSaving(true);

      // Get all selected slots
      const selectedSlots = new Set<string>();
      for (const day of days) {
        const daySchedule = schedule[day as keyof WeeklySchedule];
        Object.entries(daySchedule).forEach(([time, slot]) => {
          if (slot.isSelected || slot.hasSchedule) {
            selectedSlots.add(`${day}-${time}`);
          }
        });
      }

      // Get existing schedules and delete ALL of them first
      const existingSchedules = await interviewerScheduleService.getInterviewerSchedulesByYear(userId, new Date().getFullYear());
      const existingScheduleIds = new Set<number>();
      
      existingSchedules.forEach((schedule: InterviewerSchedule) => {
        if (schedule.id) {
          existingScheduleIds.add(schedule.id);
        }
      });

      // Delete all existing schedules in parallel
      if (existingScheduleIds.size > 0) {
        await Promise.all(
          Array.from(existingScheduleIds).map(scheduleId => 
            interviewerScheduleService.deleteSchedule(scheduleId)
          )
        );
      }

      // Prepare new schedules for creation
      const newSchedules: Array<InterviewerSchedule> = [];
      selectedSlots.forEach(key => {
        const [day, time] = key.split('-');
        const [hour, minute] = time.split(':').map(Number);
        const nextMinute = minute === 0 ? 30 : 0;
        const nextHour = minute === 30 ? hour + 1 : hour;
        const endTime = `${nextHour.toString().padStart(2, '0')}:${nextMinute.toString().padStart(2, '0')}`;

        newSchedules.push({
          interviewer: { 
            id: userId,
            firstName: '',
            lastName: '',
            email: '',
            role: userRole || 'PROFESSOR'
          },
          dayOfWeek: day,
          startTime: time,
          endTime: endTime,
          scheduleType: 'RECURRING' as const,
          year: new Date().getFullYear(),
          isActive: true,
          notes: 'Bloque de 30 minutos - Sistema de horarios'
        });
      });

      // Create all new schedules in parallel
      if (newSchedules.length > 0) {
        await Promise.all(
          newSchedules.map(scheduleData => 
            interviewerScheduleService.createSchedule(scheduleData)
          )
        );
      }

      // Reload schedules with loading indicator
      setReloading(true);
      await loadSchedules();
      setReloading(false);
      
      setHasChanges(false);

      if (onScheduleChange) {
        onScheduleChange();
      }

      addNotification({
        type: 'success',
        title: 'Horarios guardados',
        message: `Se han guardado ${newSchedules.length} bloques de horario exitosamente.`,
      });

    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Error al guardar horarios',
        message: 'No se pudieron guardar los horarios. Por favor, inténtalo nuevamente.',
      });
    } finally {
      setSaving(false);
    }
  };

  // Cancel changes
  const cancelChanges = () => {
    loadSchedules();
    setHasChanges(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoadingSpinner />
        <span className="ml-2">Cargando horarios...</span>
      </div>
    );
  }

  const summary = getSummary();

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white relative">
      {/* Loading Overlay */}
      {(saving || reloading) && (
        <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center z-50 rounded-lg">
          <div className="flex flex-col items-center gap-4">
            <LoadingSpinner size="lg" />
            <div className="text-center">
              <p className="text-lg font-medium text-gray-900">
                {saving ? 'Guardando horarios...' : 'Actualizando vista...'}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                {saving ? 'Procesando tus cambios en paralelo' : 'Cargando datos actualizados'}
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Header with copy button */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Disponibilidad para entrevistas</h1>
          <p className="text-gray-600 mt-1">Define cuándo puedes recibir entrevistas durante la semana.</p>
        </div>
        <Button variant="outline" size="sm">
          Copiar
        </Button>
      </div>

      {/* Quick Configuration */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-4">Configuración rápida</h2>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Desde</label>
            <select 
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {timeSlots.slice(0, -1).map(slot => (
                <option key={slot} value={slot}>{formatTimeDisplay(slot)}</option>
              ))}
            </select>
          </div>
          
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Hasta</label>
            <select 
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {timeSlots.slice(1).map(slot => (
                <option key={slot} value={slot}>{formatTimeDisplay(slot)}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-1">
            {dayButtons.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => toggleDay(key)}
                className={`w-8 h-8 rounded text-sm font-medium transition-colors ${
                  selectedDays[key as keyof typeof selectedDays]
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <Button onClick={applyQuickConfig}>
            Aplicar a días seleccionados
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="mb-6 p-4 bg-gray-50 rounded">
        {summary.activeDays > 0 ? (
          <p className="text-gray-700">
            <strong className="capitalize">{dayLabels.MONDAY.toLowerCase()}</strong> a <strong className="capitalize">{dayLabels.FRIDAY.toLowerCase()}</strong> · {summary.timeRange} · {summary.totalHours} horas semanales
          </p>
        ) : (
          <p className="text-gray-500">Sin disponibilidad configurada</p>
        )}
      </div>

      {/* Weekly Schedule Table */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-4">Agenda semanal</h2>
        <div className="border border-gray-300 rounded overflow-hidden">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50">
                <th className="border border-gray-300 px-4 py-2 text-left text-sm font-medium text-gray-700">Hora</th>
                {days.map(day => (
                  <th key={day} className="border border-gray-300 px-4 py-2 text-center text-sm font-medium text-gray-700">
                    {dayLabels[day as keyof typeof dayLabels]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {timeSlots.map(timeSlot => (
                <tr key={timeSlot}>
                  <td className="border border-gray-300 px-4 py-2 text-sm text-gray-700">
                    {formatTimeDisplay(timeSlot)}
                  </td>
                  {days.map(day => {
                    const slot = schedule[day as keyof WeeklySchedule][timeSlot];
                    const isSelected = slot?.isSelected;
                    const hasSchedule = slot?.hasSchedule;

                    return (
                      <td key={`${day}-${timeSlot}`} className="border border-gray-300 px-4 py-2 text-center">
                        <button
                          onClick={() => toggleTimeSlot(day, timeSlot)}
                          className={`w-full h-6 flex items-center justify-center text-sm ${
                            hasSchedule || isSelected
                              ? 'text-green-600 font-medium'
                              : 'text-gray-400'
                          } hover:bg-gray-50 transition-colors`}
                        >
                          {hasSchedule || isSelected ? '✓' : '-'}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Action Buttons */}
      {hasChanges && (
        <div className="flex items-center justify-between p-4 bg-yellow-50 border border-yellow-200 rounded">
          <div className="flex items-center gap-2">
            <span className="text-yellow-800 font-medium">Cambios sin guardar</span>
            {saving && (
              <div className="flex items-center gap-2">
                <LoadingSpinner size="sm" />
                <span className="text-yellow-600 text-sm">Procesando...</span>
              </div>
            )}
            {reloading && (
              <div className="flex items-center gap-2">
                <LoadingSpinner size="sm" />
                <span className="text-yellow-600 text-sm">Actualizando vista...</span>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={cancelChanges} disabled={saving || reloading}>
              Cancelar
            </Button>
            <Button onClick={saveSchedules} disabled={saving || reloading}>
              {saving ? 'Guardando...' : reloading ? 'Actualizando...' : 'Guardar cambios'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SimpleAvailabilityCalendar;
