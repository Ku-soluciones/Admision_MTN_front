import React, { useState, useEffect } from 'react';
import { interviewService } from '../services/interviewService';

interface TimeSlot {
  time: string;
  isAvailable: boolean;
  isBooked: boolean;
  interviewInfo?: {
    studentName: string;
    type: string;
    id: number;
  };
}

interface DaySchedule {
  date: string;
  dayName: string;
  slots: TimeSlot[];
}

interface EvaluatorScheduleDisplayProps {
  evaluatorId: number;
  evaluatorName: string;
  weekStartDate?: string;
  onSlotSelect?: (date: string, time: string) => void;
  selectedSlot?: { date: string; time: string };
}

const EvaluatorScheduleDisplay: React.FC<EvaluatorScheduleDisplayProps> = ({
  evaluatorId,
  evaluatorName,
  weekStartDate,
  onSlotSelect,
  selectedSlot
}) => {
  const [weekSchedule, setWeekSchedule] = useState<DaySchedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(
    weekStartDate ? new Date(weekStartDate) : getWeekStart(new Date())
  );

  const timeSlots = [
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00'
  ];

  const daysOfWeek = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];

  function getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  }

  const generateWeekDates = (startDate: Date): string[] => {
    const dates: string[] = [];
    for (let i = 0; i < 5; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      dates.push(date.toISOString().split('T')[0]);
    }
    return dates;
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit' });
  };

  const loadScheduleData = async () => {
    setIsLoading(true);
    try {
      const weekDates = generateWeekDates(currentWeekStart);
      const startDate = weekDates[0];
      const endDate = weekDates[weekDates.length - 1];

      // Obtener horarios disponibles del evaluador
      let availability = await interviewService.getInterviewerAvailability(
        evaluatorId,
        startDate,
        endDate
      );

      // Si no hay disponibilidad (servicio no implementado), generar horarios por defecto
      if (availability.length === 0) {
        console.log('🔧 Generando horarios por defecto para evaluador', evaluatorId);
        availability = weekDates.map(date => ({
          date,
          availableSlots: ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30']
        }));
      }

      // Obtener entrevistas ya programadas
      let interviews: any[] = [];
      try {
        interviews = await interviewService.getInterviewsByInterviewer(evaluatorId);
      } catch (error) {
        console.log('⚠️ No se pudieron obtener entrevistas del evaluador, usando array vacío');
        interviews = [];
      }
      
      const weekInterviews = interviews.filter(interview => {
        const interviewDate = interview.scheduledDate;
        return weekDates.includes(interviewDate);
      });

      // Construir horario semanal
      const schedule: DaySchedule[] = weekDates.map((date, index) => {
        const dayAvailability = availability.find(av => av.date === date);
        const dayInterviews = weekInterviews.filter(interview => interview.scheduledDate === date);

        const slots: TimeSlot[] = timeSlots.map(time => {
          // Verificar si el horario está disponible
          const isAvailable = dayAvailability?.availableSlots?.includes(time) || false;
          const bookedInterview = dayInterviews.find(interview => interview.scheduledTime === time);
          
          return {
            time,
            isAvailable,
            isBooked: !!bookedInterview,
            interviewInfo: bookedInterview ? {
              studentName: bookedInterview.studentName,
              type: bookedInterview.type,
              id: bookedInterview.id
            } : undefined
          };
        });

        return {
          date,
          dayName: daysOfWeek[index],
          slots
        };
      });

      setWeekSchedule(schedule);
    } catch (error) {
      console.error('Error loading evaluator schedule:', error);
      // Crear schedule vacío para mostrar algo
      const weekDates = generateWeekDates(currentWeekStart);
      const emptySchedule: DaySchedule[] = weekDates.map((date, index) => ({
        date,
        dayName: daysOfWeek[index],
        slots: timeSlots.map(time => ({
          time,
          isAvailable: false,
          isBooked: false
        }))
      }));
      setWeekSchedule(emptySchedule);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadScheduleData();
  }, [evaluatorId, currentWeekStart]);

  const handleSlotClick = (date: string, time: string, slot: TimeSlot) => {
    if (slot.isAvailable && !slot.isBooked && onSlotSelect) {
      onSlotSelect(date, time);
    }
  };

  const isSlotSelected = (date: string, time: string): boolean => {
    return selectedSlot?.date === date && selectedSlot?.time === time;
  };

  const getSlotClassName = (slot: TimeSlot, date: string, time: string): string => {
    const baseClasses = "h-12 border border-gray-200 text-xs flex items-center justify-center cursor-pointer transition-colors";
    
    if (slot.isBooked) {
      return `${baseClasses} bg-red-100 text-red-800 border-red-200 cursor-not-allowed`;
    }
    
    if (!slot.isAvailable) {
      return `${baseClasses} bg-gray-100 text-gray-400 cursor-not-allowed`;
    }

    if (isSlotSelected(date, time)) {
      return `${baseClasses} bg-blue-500 text-white border-blue-500`;
    }
    
    return `${baseClasses} bg-green-50 text-green-800 border-green-200 hover:bg-green-100`;
  };

  const goToPreviousWeek = () => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(currentWeekStart.getDate() - 7);
    setCurrentWeekStart(newDate);
  };

  const goToNextWeek = () => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(currentWeekStart.getDate() + 7);
    setCurrentWeekStart(newDate);
  };

  const goToCurrentWeek = () => {
    setCurrentWeekStart(getWeekStart(new Date()));
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-300 rounded mb-4"></div>
          <div className="grid grid-cols-6 gap-2">
            {Array.from({ length: 78 }).map((_, i) => (
              <div key={i} className="h-12 bg-gray-300 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Horarios - {evaluatorName}
          </h3>
          <p className="text-sm text-gray-600">
            Semana del {formatDate(weekSchedule[0]?.date || '')} al {formatDate(weekSchedule[4]?.date || '')}
          </p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={goToPreviousWeek}
            className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
          >
            ← Anterior
          </button>
          <button
            onClick={goToCurrentWeek}
            className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Hoy
          </button>
          <button
            onClick={goToNextWeek}
            className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
          >
            Siguiente →
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mb-4 text-xs">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-green-50 border border-green-200"></div>
          <span>Disponible</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-red-100 border border-red-200"></div>
          <span>Ocupado</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-gray-100 border border-gray-200"></div>
          <span>No disponible</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-blue-500 border border-blue-500"></div>
          <span>Seleccionado</span>
        </div>
      </div>

      {/* Schedule Grid */}
      <div className="overflow-x-auto">
        <div className="grid grid-cols-6 gap-1 min-w-[600px]">
          {/* Header Row */}
          <div className="font-semibold text-sm text-gray-700 p-2">Hora</div>
          {weekSchedule.map((day) => (
            <div key={day.date} className="font-semibold text-sm text-gray-700 p-2 text-center">
              {day.dayName}<br />
              <span className="text-xs text-gray-500">{formatDate(day.date)}</span>
            </div>
          ))}

          {/* Time Slots */}
          {timeSlots.map((time) => (
            <React.Fragment key={time}>
              <div className="font-medium text-sm text-gray-600 p-2 bg-gray-50 flex items-center">
                {time}
              </div>
              {weekSchedule.map((day) => {
                const slot = day.slots.find(s => s.time === time);
                if (!slot) return <div key={`${day.date}-${time}`} className="h-12 border border-gray-200 bg-gray-100"></div>;
                
                return (
                  <div
                    key={`${day.date}-${time}`}
                    className={getSlotClassName(slot, day.date, time)}
                    onClick={() => handleSlotClick(day.date, time, slot)}
                    title={
                      slot.isBooked 
                        ? `Ocupado: ${slot.interviewInfo?.studentName} - ${slot.interviewInfo?.type}`
                        : slot.isAvailable 
                          ? 'Disponible - Clic para seleccionar'
                          : 'No disponible'
                    }
                  >
                    {slot.isBooked ? (
                      <div className="text-center">
                        <div className="font-semibold">📅</div>
                        <div className="text-xs truncate max-w-20">
                          {slot.interviewInfo?.studentName}
                        </div>
                      </div>
                    ) : slot.isAvailable ? (
                      <div className="text-center">
                        ✅
                      </div>
                    ) : (
                      <div className="text-center">
                        ❌
                      </div>
                    )}
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <span className="font-semibold text-green-600">
              {weekSchedule.reduce((total, day) => 
                total + day.slots.filter(slot => slot.isAvailable && !slot.isBooked).length, 0
              )}
            </span>
            <span className="text-gray-600"> horarios disponibles</span>
          </div>
          <div>
            <span className="font-semibold text-red-600">
              {weekSchedule.reduce((total, day) => 
                total + day.slots.filter(slot => slot.isBooked).length, 0
              )}
            </span>
            <span className="text-gray-600"> horarios ocupados</span>
          </div>
          <div>
            <span className="font-semibold text-gray-600">
              {weekSchedule.reduce((total, day) => 
                total + day.slots.filter(slot => !slot.isAvailable).length, 0
              )}
            </span>
            <span className="text-gray-600"> no disponibles</span>
          </div>
        </div>
      </div>

      {selectedSlot && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Seleccionado:</strong> {selectedSlot.date} a las {selectedSlot.time}
          </p>
        </div>
      )}
    </div>
  );
};

export default EvaluatorScheduleDisplay;