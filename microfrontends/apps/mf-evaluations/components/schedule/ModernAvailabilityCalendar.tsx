import React, { useState, useEffect, useRef, useCallback } from 'react';
import Button from '../ui/Button';
import LoadingSpinner from '../ui/LoadingSpinner';
import { interviewerScheduleService, InterviewerSchedule } from '../../services/interviewerScheduleService';
import { useNotifications } from '../../context/AppContext';

interface ModernAvailabilityCalendarProps {
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
  isPendingDelete?: boolean;
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

interface QuickConfig {
  startTime: string;
  endTime: string;
  selectedDays: string[];
}

const ModernAvailabilityCalendar: React.FC<ModernAvailabilityCalendarProps> = ({
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
  const [viewMode, setViewMode] = useState<'simple' | 'advanced'>('simple');
  const [isDragging] = useState(false);
  const [dragSelection] = useState<Set<string>>(new Set());
  const [showQuickConfig, setShowQuickConfig] = useState(false);
  
  // Quick config state
  const [quickConfig, setQuickConfig] = useState<QuickConfig>({
    startTime: '09:00',
    endTime: '15:00',
    selectedDays: []
  });

  const { addNotification } = useNotifications();
  const tableRef = useRef<HTMLDivElement>(null);

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

  // Calculate summary statistics
  const getSummaryStats = useCallback(() => {
    let totalBlocks = 0;
    let activeDays = 0;
    const dayRanges: { [key: string]: { start: string; end: string }[] } = {};

    days.forEach(day => {
      const daySchedule = schedule[day as keyof WeeklySchedule];
      const selectedSlots = Object.entries(daySchedule)
        .filter(([_, slot]) => slot.isSelected || slot.hasSchedule)
        .map(([time, _]) => time)
        .sort();

      if (selectedSlots.length > 0) {
        activeDays++;
        totalBlocks += selectedSlots.length;
        
        // Convert slots to ranges
        const ranges: { start: string; end: string }[] = [];
        let start = selectedSlots[0];
        let prev = selectedSlots[0];

        for (let i = 1; i < selectedSlots.length; i++) {
          const current = selectedSlots[i];
          const prevTime = new Date(`2000-01-01 ${prev}:00`);
          const currentTime = new Date(`2000-01-01 ${current}:00`);
          const diffMinutes = (currentTime.getTime() - prevTime.getTime()) / (1000 * 60);

          if (diffMinutes > 30) {
            // End current range
            const endTime = new Date(prevTime.getTime() + 30 * 60000);
            ranges.push({
              start: formatTimeDisplay(start),
              end: formatTimeDisplay(`${endTime.getHours().toString().padStart(2, '0')}:${endTime.getMinutes().toString().padStart(2, '0')}`)
            });
            start = current;
          }
          prev = current;
        }

        // Add last range
        const endTime = new Date(`2000-01-01 ${prev}:00`);
        endTime.setMinutes(endTime.getMinutes() + 30);
        ranges.push({
          start: formatTimeDisplay(start),
          end: formatTimeDisplay(`${endTime.getHours().toString().padStart(2, '0')}:${endTime.getMinutes().toString().padStart(2, '0')}`)
        });

        dayRanges[day] = ranges;
      }
    });

    const totalHours = (totalBlocks * 0.5).toFixed(1);

    // Find main range pattern
    let mainRange = '';
    if (activeDays > 0) {
      const firstDayRanges = dayRanges[days.find(day => dayRanges[day]) || ''];
      if (firstDayRanges && firstDayRanges.length > 0) {
        const firstRange = firstDayRanges[0];
        const samePatternDays = days.filter(day => 
          dayRanges[day] && 
          dayRanges[day].length === 1 && 
          dayRanges[day][0].start === firstRange.start && 
          dayRanges[day][0].end === firstRange.end
        ).length;

        if (samePatternDays === activeDays) {
          mainRange = `${firstRange.start} - ${firstRange.end}`;
        }
      }
    }

    return {
      activeDays,
      totalBlocks,
      totalHours,
      mainRange,
      dayRanges
    };
  }, [schedule]);

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
          isSelected: false,
          isPendingDelete: true
        };
      } else {
        newSchedule[day as keyof WeeklySchedule][timeSlot] = {
          ...currentSlot,
          isSelected: !currentSlot.isSelected,
          isPendingDelete: false
        };
      }

      setHasChanges(true);
      return newSchedule;
    });
  };

  // Quick config functions
  const applyQuickConfig = () => {
    const { startTime, endTime, selectedDays } = quickConfig;
    
    if (selectedDays.length === 0) {
      addNotification({
        type: 'warning',
        title: 'Configuración rápida',
        message: 'Por favor selecciona al menos un día de la semana.'
      });
      return;
    }

    setSchedule(prev => {
      const newSchedule = JSON.parse(JSON.stringify(prev)) as WeeklySchedule;

      selectedDays.forEach(day => {
        timeSlots.forEach(slot => {
          if (slot >= startTime && slot < endTime) {
            if (newSchedule[day as keyof WeeklySchedule][slot]) {
              newSchedule[day as keyof WeeklySchedule][slot] = {
                ...newSchedule[day as keyof WeeklySchedule][slot],
                isSelected: true,
                isPendingDelete: false
              };
            }
          }
        });
      });

      setHasChanges(true);
      return newSchedule;
    });

    setShowQuickConfig(false);
    addNotification({
      type: 'success',
      title: 'Configuración aplicada',
      message: `Disponibilidad configurada para ${selectedDays.length} día(s).`
    });
  };

  // Quick actions
  const selectAllWeek = () => {
    setSchedule(prev => {
      const newSchedule = JSON.parse(JSON.stringify(prev)) as WeeklySchedule;
      
      days.forEach(day => {
        timeSlots.forEach(slot => {
          if (newSchedule[day as keyof WeeklySchedule][slot]) {
            newSchedule[day as keyof WeeklySchedule][slot] = {
              ...newSchedule[day as keyof WeeklySchedule][slot],
              isSelected: true,
              isPendingDelete: false
            };
          }
        });
      });

      setHasChanges(true);
      return newSchedule;
    });
  };

  const clearSelection = () => {
    setSchedule(prev => {
      const newSchedule = JSON.parse(JSON.stringify(prev)) as WeeklySchedule;
      
      days.forEach(day => {
        timeSlots.forEach(slot => {
          if (newSchedule[day as keyof WeeklySchedule][slot] && !newSchedule[day as keyof WeeklySchedule][slot].hasSchedule) {
            newSchedule[day as keyof WeeklySchedule][slot] = {
              ...newSchedule[day as keyof WeeklySchedule][slot],
              isSelected: false,
              isPendingDelete: false
            };
          }
        });
      });

      setHasChanges(true);
      return newSchedule;
    });
  };

  const copyMondayToWeek = () => {
    const mondaySchedule = schedule.MONDAY;
    
    setSchedule(prev => {
      const newSchedule = JSON.parse(JSON.stringify(prev)) as WeeklySchedule;
      
      ['TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'].forEach(day => {
        timeSlots.forEach(slot => {
          const mondaySlot = mondaySchedule[slot];
          if (mondaySlot && newSchedule[day as keyof WeeklySchedule][slot]) {
            newSchedule[day as keyof WeeklySchedule][slot] = {
              ...newSchedule[day as keyof WeeklySchedule][slot],
              isSelected: mondaySlot.isSelected || mondaySlot.hasSchedule,
              isPendingDelete: false
            };
          }
        });
      });

      setHasChanges(true);
      return newSchedule;
    });
  };

  // Save schedules
  const saveSchedules = async () => {
    try {
      setSaving(true);

      const existingSchedules = await interviewerScheduleService.getInterviewerSchedulesByYear(userId, new Date().getFullYear());
      
      const selectedSlots = new Set<string>();
      for (const day of days) {
        const daySchedule = schedule[day as keyof WeeklySchedule];
        Object.entries(daySchedule).forEach(([time, slot]) => {
          if (slot.isSelected || slot.hasSchedule) {
            selectedSlots.add(`${day}-${time}`);
          }
        });
      }

      const existingSlotsMap = new Map<string, number>();
      existingSchedules.forEach((schedule: InterviewerSchedule) => {
        if (schedule.dayOfWeek && schedule.scheduleType === 'RECURRING') {
          const startTime = schedule.startTime;
          const endTime = schedule.endTime;

          timeSlots.forEach(slot => {
            if (slot >= startTime && slot < endTime) {
              const key = `${schedule.dayOfWeek}-${slot}`;
              existingSlotsMap.set(key, schedule.id!);
            }
          });
        }
      });

      const slotsToDelete = new Set<number>();
      const slotsToCreate: Array<{day: string, time: string}> = [];

      existingSlotsMap.forEach((scheduleId, key) => {
        if (!selectedSlots.has(key)) {
          slotsToDelete.add(scheduleId);
        }
      });

      selectedSlots.forEach(key => {
        if (!existingSlotsMap.has(key)) {
          const [day, time] = key.split('-');
          slotsToCreate.push({ day, time });
        }
      });

      // Delete schedules
      for (const scheduleId of slotsToDelete) {
        await interviewerScheduleService.deleteSchedule(scheduleId);
      }

      // Create new schedules
      const slotsByDay: Record<string, string[]> = {};
      slotsToCreate.forEach(({ day, time }) => {
        if (!slotsByDay[day]) slotsByDay[day] = [];
        slotsByDay[day].push(time);
      });

      for (const [day, times] of Object.entries(slotsByDay)) {
        times.sort();

        for (const slot of times) {
          const [hour, minute] = slot.split(':').map(Number);
          const nextMinute = minute === 0 ? 30 : 0;
          const nextHour = minute === 30 ? hour + 1 : hour;
          const endTime = `${nextHour.toString().padStart(2, '0')}:${nextMinute.toString().padStart(2, '0')}`;

          const scheduleData = {
            interviewer: { 
              id: userId,
              firstName: '',
              lastName: '',
              email: '',
              role: userRole || 'PROFESSOR'
            },
            dayOfWeek: day,
            startTime: slot,
            endTime: endTime,
            scheduleType: 'RECURRING' as const,
            year: new Date().getFullYear(),
            isActive: true,
            notes: 'Bloque de 30 minutos - Sistema de horarios'
          };

          await interviewerScheduleService.createSchedule(scheduleData);
        }
      }

      await loadSchedules();
      setHasChanges(false);

      if (onScheduleChange) {
        onScheduleChange();
      }

      addNotification({
        type: 'success',
        title: 'Horarios guardados',
        message: 'Tu disponibilidad ha sido actualizada exitosamente.'
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

  const discardChanges = () => {
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

  const stats = getSummaryStats();

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Disponibilidad para entrevistas</h2>
            <p className="text-blue-100 mt-1">
              Define cuándo puedes recibir entrevistas durante la semana. Cada bloque equivale a 30 minutos.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === 'simple' ? 'secondary' : 'outline'}
              size="sm"
              onClick={() => setViewMode('simple')}
              className="bg-white/20 hover:bg-white/30 text-white border-white/30"
            >
              Vista Simple
            </Button>
            <Button
              variant={viewMode === 'advanced' ? 'secondary' : 'outline'}
              size="sm"
              onClick={() => setViewMode('advanced')}
              className="bg-white/20 hover:bg-white/30 text-white border-white/30"
            >
              Vista Avanzada
            </Button>
          </div>
        </div>
      </div>

      {/* Quick Config Section */}
      <div className="border-b border-gray-200 p-6 bg-gray-50">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Configuración rápida</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowQuickConfig(!showQuickConfig)}
          >
            {showQuickConfig ? 'Ocultar' : 'Mostrar'}
          </Button>
        </div>

        {showQuickConfig && (
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <p className="text-sm text-gray-600 mb-4">
              Selecciona un rango horario y los días donde quieres aplicar disponibilidad.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Hora de inicio
                </label>
                <select
                  value={quickConfig.startTime}
                  onChange={(e) => setQuickConfig(prev => ({ ...prev, startTime: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {timeSlots.slice(0, -1).map(slot => (
                    <option key={slot} value={slot}>{formatTimeDisplay(slot)}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Hora de término
                </label>
                <select
                  value={quickConfig.endTime}
                  onChange={(e) => setQuickConfig(prev => ({ ...prev, endTime: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {timeSlots.slice(1).map(slot => (
                    <option key={slot} value={slot}>{formatTimeDisplay(slot)}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Días de la semana
                </label>
                <div className="flex gap-2">
                  {dayButtons.map(({ key, label }) => (
                    <button
                      key={key}
                      onClick={() => {
                        setQuickConfig(prev => ({
                          ...prev,
                          selectedDays: prev.selectedDays.includes(key)
                            ? prev.selectedDays.filter(d => d !== key)
                            : [...prev.selectedDays, key]
                        }));
                      }}
                      className={`w-10 h-10 rounded-lg font-medium transition-colors ${
                        quickConfig.selectedDays.includes(key)
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <Button
              onClick={applyQuickConfig}
              className="w-full md:w-auto"
            >
              Aplicar disponibilidad
            </Button>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="border-b border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Acciones rápidas</h3>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={selectAllWeek}>
            Seleccionar toda la semana
          </Button>
          <Button variant="outline" size="sm" onClick={clearSelection}>
            Limpiar selección
          </Button>
          <Button variant="outline" size="sm" onClick={copyMondayToWeek}>
            Copiar lunes a toda la semana
          </Button>
        </div>
      </div>

      {/* Summary Panel */}
      <div className="border-b border-gray-200 p-6 bg-blue-50">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Disponibilidad configurada</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg p-4">
            <div className="text-2xl font-bold text-blue-600">{stats.activeDays}</div>
            <div className="text-sm text-gray-600">Días activos</div>
          </div>
          <div className="bg-white rounded-lg p-4">
            <div className="text-2xl font-bold text-green-600">{stats.totalBlocks}</div>
            <div className="text-sm text-gray-600">Bloques seleccionados</div>
          </div>
          <div className="bg-white rounded-lg p-4">
            <div className="text-2xl font-bold text-purple-600">{stats.totalHours}</div>
            <div className="text-sm text-gray-600">Horas semanales</div>
          </div>
          <div className="bg-white rounded-lg p-4">
            <div className="text-lg font-bold text-orange-600">
              {stats.mainRange || 'Variable'}
            </div>
            <div className="text-sm text-gray-600">Rango principal</div>
          </div>
        </div>

        {stats.mainRange && (
          <div className="mt-4 text-sm text-gray-700">
            <strong>Patrón detectado:</strong> {stats.activeDays} días · {stats.mainRange}
          </div>
        )}
      </div>

      {/* Calendar Grid */}
      <div className="p-6">
        {viewMode === 'simple' ? (
          // Simple View - Day by day ranges
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Vista simple</h3>
            {days.map(day => {
              const dayRanges = stats.dayRanges[day];
              return (
                <div key={day} className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-gray-900">{dayLabels[day as keyof typeof dayLabels]}</h4>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setViewMode('advanced')}
                    >
                      Editar
                    </Button>
                  </div>
                  {dayRanges && dayRanges.length > 0 ? (
                    <div className="mt-2 space-y-1">
                      {dayRanges.map((range, index) => (
                        <div key={index} className="text-sm text-gray-700">
                          {range.start} - {range.end}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-2 text-sm text-gray-500">Sin disponibilidad</div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          // Advanced View - Full grid
          <div ref={tableRef} className="overflow-x-auto">
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
                {timeSlots.map(timeSlot => (
                  <tr key={timeSlot}>
                    <td className="border border-gray-300 bg-gray-50 p-2 font-medium text-gray-700 text-center text-sm">
                      {formatTimeDisplay(timeSlot)}
                    </td>
                    {days.map(day => {
                      const slot = schedule[day as keyof WeeklySchedule][timeSlot];
                      const isSelected = slot?.isSelected;
                      const hasSchedule = slot?.hasSchedule;
                      const isPendingDelete = slot?.isPendingDelete;

                      return (
                        <td key={`${day}-${timeSlot}`} className="border border-gray-300 p-1">
                          <button
                            onClick={() => toggleTimeSlot(day, timeSlot)}
                            className={`w-full h-8 rounded-md text-xs font-medium transition-all duration-200 ${
                              isPendingDelete
                                ? 'bg-red-100 border-2 border-red-400 text-red-700'
                                : hasSchedule
                                ? 'bg-green-100 border-2 border-green-400 text-green-700 hover:bg-green-200'
                                : isSelected
                                ? 'bg-blue-100 border-2 border-blue-400 text-blue-700 hover:bg-blue-200'
                                : 'bg-white border-2 border-gray-300 text-gray-500 hover:bg-gray-50 hover:border-gray-400'
                            }`}
                            title={
                              isPendingDelete
                                ? 'Pendiente de eliminación'
                                : hasSchedule
                                ? 'Click para eliminar horario guardado'
                                : isSelected
                                ? 'Click para quitar'
                                : 'Click para agregar'
                            }
                          >
                            {hasSchedule && !isPendingDelete && '✓'}
                            {isPendingDelete && '×'}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="border-t border-gray-200 p-6 bg-gray-50">
        <div className="flex flex-wrap items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-white border-2 border-gray-300 rounded"></div>
            <span className="text-gray-700">Disponible</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-100 border-2 border-blue-400 rounded"></div>
            <span className="text-gray-700">Seleccionado (sin guardar)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-100 border-2 border-green-400 rounded flex items-center justify-center text-xs text-green-700">✓</div>
            <span className="text-gray-700">Guardado</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-100 border-2 border-red-400 rounded flex items-center justify-center text-xs text-red-700">×</div>
            <span className="text-gray-700">Pendiente de eliminación</span>
          </div>
        </div>
      </div>

      {/* Bottom Action Bar */}
      {hasChanges && (
        <div className="sticky bottom-0 bg-yellow-50 border-t border-yellow-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-yellow-400 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-yellow-800">Hay cambios sin guardar</span>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={discardChanges}
                disabled={saving}
              >
                Descartar cambios
              </Button>
              <Button
                onClick={saveSchedules}
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {saving ? 'Guardando...' : 'Guardar cambios'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModernAvailabilityCalendar;
