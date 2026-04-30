import React, { useState, useEffect } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import LoadingSpinner from '../ui/LoadingSpinner';
import { FiCalendar, FiClock, FiUser, FiRefreshCw } from 'react-icons/fi';
import interviewService from '../../services/interviewService';

interface InterviewerAvailabilityProps {
  interviewerId: number;
  selectedDate?: string;
  onTimeSlotSelect?: (date: string, time: string) => void;
  className?: string;
}

interface DayAvailability {
  date: string;
  dayName: string;
  availableSlots: string[];
  isSelected: boolean;
}

const InterviewerAvailability: React.FC<InterviewerAvailabilityProps> = ({
  interviewerId,
  selectedDate,
  onTimeSlotSelect,
  className = ''
}) => {
  const [weeklyAvailability, setWeeklyAvailability] = useState<DayAvailability[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(new Date());

  // Función para obtener el inicio de la semana (lunes)
  const getWeekStart = (date: Date): Date => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Ajustar para que lunes sea el inicio
    return new Date(d.setDate(diff));
  };

  // Generar fechas de la semana
  const generateWeekDates = (startDate: Date): DayAvailability[] => {
    const dates: DayAvailability[] = [];
    const dayNames = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      
      const dateString = date.toISOString().split('T')[0];
      dates.push({
        date: dateString,
        dayName: dayNames[i],
        availableSlots: [],
        isSelected: selectedDate === dateString
      });
    }
    
    return dates;
  };

  useEffect(() => {
    const weekStart = getWeekStart(currentWeekStart);
    setCurrentWeekStart(weekStart);
    loadWeeklyAvailability();
  }, [interviewerId]);

  useEffect(() => {
    // Actualizar la selección cuando cambie selectedDate
    setWeeklyAvailability(prev => 
      prev.map(day => ({
        ...day,
        isSelected: selectedDate === day.date
      }))
    );
  }, [selectedDate]);

  const loadWeeklyAvailability = async () => {
    if (!interviewerId) return;

    try {
      setIsLoading(true);
      setError(null);

      const weekStart = getWeekStart(currentWeekStart);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);

      const startDateStr = weekStart.toISOString().split('T')[0];
      const endDateStr = weekEnd.toISOString().split('T')[0];

      const availability = await interviewService.getInterviewerAvailability(
        interviewerId,
        startDateStr,
        endDateStr
      );

      const weekDates = generateWeekDates(weekStart);
      
      // Combinar con la disponibilidad del backend
      const combined = weekDates.map(day => ({
        ...day,
        availableSlots: availability.find(a => a.date === day.date)?.availableSlots || []
      }));

      setWeeklyAvailability(combined);
    } catch (err) {
      console.error('Error loading weekly availability:', err);
      setError('Error al cargar disponibilidad semanal');
      // Usar datos por defecto en caso de error
      setWeeklyAvailability(generateWeekDates(getWeekStart(currentWeekStart)));
    } finally {
      setIsLoading(false);
    }
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newWeekStart = new Date(currentWeekStart);
    newWeekStart.setDate(currentWeekStart.getDate() + (direction === 'next' ? 7 : -7));
    setCurrentWeekStart(newWeekStart);
    loadWeeklyAvailability();
  };

  const formatWeekRange = () => {
    const weekEnd = new Date(currentWeekStart);
    weekEnd.setDate(currentWeekStart.getDate() + 6);
    
    const startStr = currentWeekStart.toLocaleDateString('es-CL', { 
      day: 'numeric', 
      month: 'short' 
    });
    const endStr = weekEnd.toLocaleDateString('es-CL', { 
      day: 'numeric', 
      month: 'short' 
    });
    
    return `${startStr} - ${endStr}`;
  };

  const isToday = (dateString: string): boolean => {
    const today = new Date().toISOString().split('T')[0];
    return dateString === today;
  };

  const isPast = (dateString: string): boolean => {
    const today = new Date().toISOString().split('T')[0];
    return dateString < today;
  };

  if (isLoading) {
    return (
      <Card className={`p-4 ${className}`}>
        <div className="flex justify-center items-center py-8">
          <LoadingSpinner size="sm" />
          <span className="ml-2 text-sm text-gray-600">Cargando disponibilidad...</span>
        </div>
      </Card>
    );
  }

  return (
    <Card className={`p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FiCalendar className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-medium text-gray-900">
            Disponibilidad Semanal
          </h3>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateWeek('prev')}
          >
            ←
          </Button>
          
          <span className="text-sm font-medium text-gray-600 px-3">
            {formatWeekRange()}
          </span>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateWeek('next')}
          >
            →
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={loadWeeklyAvailability}
            title="Actualizar"
          >
            <FiRefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Grid de días de la semana */}
      <div className="grid grid-cols-7 gap-2">
        {weeklyAvailability.map((day) => (
          <div
            key={day.date}
            className={`p-2 border rounded-md text-center transition-colors ${
              day.isSelected
                ? 'border-blue-500 bg-blue-50'
                : isPast(day.date)
                ? 'border-gray-200 bg-gray-50'
                : 'border-gray-200 hover:border-gray-300'
            } ${isPast(day.date) ? 'opacity-50' : ''}`}
          >
            {/* Nombre del día y fecha */}
            <div className="mb-2">
              <p className={`text-xs font-medium ${
                isToday(day.date) ? 'text-blue-600' : 'text-gray-600'
              }`}>
                {day.dayName}
              </p>
              <p className={`text-sm ${
                day.isSelected ? 'text-blue-900 font-medium' : 'text-gray-900'
              }`}>
                {new Date(day.date + 'T00:00:00').getDate()}
              </p>
            </div>

            {/* Horarios disponibles */}
            <div className="space-y-1">
              {day.availableSlots.length === 0 ? (
                <p className="text-xs text-gray-400">Sin horarios</p>
              ) : (
                day.availableSlots.slice(0, 3).map((time) => (
                  <button
                    key={time}
                    onClick={() => onTimeSlotSelect?.(day.date, time)}
                    disabled={isPast(day.date)}
                    className={`w-full text-xs px-1 py-0.5 rounded transition-colors ${
                      isPast(day.date)
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-green-100 text-green-700 hover:bg-green-200 cursor-pointer'
                    }`}
                  >
                    {time}
                  </button>
                ))
              )}
              
              {day.availableSlots.length > 3 && (
                <p className="text-xs text-blue-600 font-medium">
                  +{day.availableSlots.length - 3} más
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Leyenda */}
      <div className="mt-4 flex flex-wrap gap-4 text-xs text-gray-600">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-blue-50 border border-blue-500 rounded"></div>
          <span>Día seleccionado</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-green-100 rounded"></div>
          <span>Horarios disponibles</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-gray-50 border border-gray-200 rounded"></div>
          <span>Sin disponibilidad</span>
        </div>
      </div>
    </Card>
  );
};

export default InterviewerAvailability;