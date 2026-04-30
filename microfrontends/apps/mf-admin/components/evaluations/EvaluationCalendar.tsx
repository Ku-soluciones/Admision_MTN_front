import React, { useState, useEffect } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import LoadingSpinner from '../ui/LoadingSpinner';
import {
  EvaluationSchedule,
  EvaluationType,
  ScheduleStatus,
  EVALUATION_TYPE_LABELS,
  ScheduleUtils
} from '../../types/evaluation';
import { evaluationService } from '../../services/evaluationService';
import { 
  ChevronLeftIcon, 
  ChevronRightIcon,
  CalendarIcon,
  ClockIcon
} from '../icons/Icons';

interface EvaluationCalendarProps {
  evaluatorId?: number;
  applicationId?: number;
  onScheduleClick?: (schedule: EvaluationSchedule) => void;
  className?: string;
}

const EvaluationCalendar: React.FC<EvaluationCalendarProps> = ({
  evaluatorId,
  applicationId,
  onScheduleClick,
  className = ''
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [schedules, setSchedules] = useState<EvaluationSchedule[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSchedulesForMonth();
  }, [currentDate, evaluatorId, applicationId]);

  const loadSchedulesForMonth = async () => {
    try {
      setLoading(true);
      setError(null);

      const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

      let monthSchedules: EvaluationSchedule[] = [];

      if (evaluatorId) {
        // Cargar calendario del evaluador
        try {
          monthSchedules = await evaluationService.getEvaluatorSchedule(
            evaluatorId,
            startDate.toISOString(),
            endDate.toISOString()
          );
        } catch (apiError) {
          // Fallback a datos mock
          monthSchedules = evaluationService.createLocalMockSchedules(1);
        }
      } else if (applicationId) {
        // Cargar citas familiares
        try {
          const familySchedules = await evaluationService.getFamilySchedules(applicationId);
          monthSchedules = familySchedules.filter(schedule => {
            const scheduleDate = new Date(schedule.scheduledDate);
            return scheduleDate >= startDate && scheduleDate <= endDate;
          });
        } catch (apiError) {
          // Fallback a datos mock
          monthSchedules = evaluationService.createLocalMockSchedules(applicationId);
        }
      } else {
        // Cargar todas las programaciones (para vista administrativa)
        monthSchedules = evaluationService.createLocalMockSchedules(1);
      }

      setSchedules(monthSchedules);
    } catch (err: any) {
      setError(err.message || 'Error al cargar el calendario');
    } finally {
      setLoading(false);
    }
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startCalendar = new Date(firstDay);
    
    // Comenzar desde el lunes de la semana
    const dayOfWeek = firstDay.getDay();
    const daysBack = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    startCalendar.setDate(startCalendar.getDate() - daysBack);
    
    const days = [];
    for (let i = 0; i < 42; i++) { // 6 semanas x 7 días
      const date = new Date(startCalendar);
      date.setDate(startCalendar.getDate() + i);
      days.push(date);
    }
    
    return days;
  };

  const getSchedulesForDate = (date: Date) => {
    const dateString = date.toISOString().split('T')[0];
    return schedules.filter(schedule => 
      schedule.scheduledDate.startsWith(dateString)
    );
  };

  const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('es-CL', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getScheduleColor = (schedule: EvaluationSchedule): string => {
    const baseColors = {
      [EvaluationType.MATHEMATICS_EXAM]: 'bg-blue-100 text-blue-800 border-blue-200',
      [EvaluationType.LANGUAGE_EXAM]: 'bg-green-100 text-green-800 border-green-200',
      [EvaluationType.ENGLISH_EXAM]: 'bg-purple-100 text-purple-800 border-purple-200',
      [EvaluationType.PSYCHOLOGICAL_INTERVIEW]: 'bg-pink-100 text-pink-800 border-pink-200',
      [EvaluationType.CYCLE_DIRECTOR_INTERVIEW]: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      [EvaluationType.CYCLE_DIRECTOR_REPORT]: 'bg-orange-100 text-orange-800 border-orange-200'
    };

    let color = baseColors[schedule.evaluationType] || 'bg-gray-100 text-gray-800 border-gray-200';

    // Modificar según el estado
    if (schedule.status === ScheduleStatus.COMPLETED) {
      color = 'bg-green-100 text-green-800 border-green-300';
    } else if (schedule.status === ScheduleStatus.CANCELLED) {
      color = 'bg-red-100 text-red-800 border-red-300';
    } else if (ScheduleUtils.requiresConfirmation(schedule)) {
      color = 'bg-orange-100 text-orange-800 border-orange-300';
    }

    return color;
  };

  const isToday = (date: Date): boolean => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isCurrentMonth = (date: Date): boolean => {
    return date.getMonth() === currentDate.getMonth();
  };

  const days = getDaysInMonth();
  const monthYear = currentDate.toLocaleDateString('es-CL', {
    month: 'long',
    year: 'numeric'
  });

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header del calendario */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateMonth('prev')}
            >
              <ChevronLeftIcon className="w-4 h-4" />
            </Button>
            
            <h2 className="text-xl font-semibold text-azul-monte-tabor capitalize">
              {monthYear}
            </h2>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateMonth('next')}
            >
              <ChevronRightIcon className="w-4 h-4" />
            </Button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={goToToday}
          >
            <CalendarIcon className="w-4 h-4 mr-2" />
            Hoy
          </Button>
        </div>

        {/* Leyenda */}
        <div className="flex flex-wrap gap-2 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-blue-200 rounded"></div>
            <span>Exámenes</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-pink-200 rounded"></div>
            <span>Entrevistas</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-orange-200 rounded"></div>
            <span>Pendiente confirmación</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-green-200 rounded"></div>
            <span>Completado</span>
          </div>
        </div>
      </Card>

      {/* Calendario */}
      <Card className="p-4">
        {loading ? (
          <div className="text-center py-8">
            <LoadingSpinner size="lg" />
            <p className="mt-4 text-gray-600">Cargando calendario...</p>
          </div>
        ) : error ? (
          <div className="text-center py-8 text-red-600">
            <p>{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={loadSchedulesForMonth}
              className="mt-2"
            >
              Reintentar
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-1">
            {/* Headers de días de la semana */}
            {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(day => (
              <div
                key={day}
                className="p-2 text-center text-sm font-medium text-gray-500 border-b"
              >
                {day}
              </div>
            ))}

            {/* Días del calendario */}
            {days.map((date, index) => {
              const daySchedules = getSchedulesForDate(date);
              const isCurrentMonthDay = isCurrentMonth(date);
              const isTodayDay = isToday(date);

              return (
                <div
                  key={index}
                  className={`min-h-[100px] p-1 border border-gray-100 ${
                    !isCurrentMonthDay 
                      ? 'bg-gray-50 text-gray-400' 
                      : 'bg-white'
                  } ${
                    isTodayDay 
                      ? 'bg-blue-50 border-blue-300' 
                      : ''
                  }`}
                >
                  <div className={`text-sm font-medium mb-1 ${
                    isTodayDay ? 'text-blue-600' : 'text-gray-900'
                  }`}>
                    {date.getDate()}
                  </div>

                  <div className="space-y-1">
                    {daySchedules.slice(0, 2).map(schedule => (
                      <div
                        key={schedule.id}
                        onClick={() => onScheduleClick?.(schedule)}
                        className={`
                          text-xs p-1 rounded border cursor-pointer hover:opacity-80
                          ${getScheduleColor(schedule)}
                          ${onScheduleClick ? 'cursor-pointer' : ''}
                        `}
                        title={`${EVALUATION_TYPE_LABELS[schedule.evaluationType]} - ${formatTime(schedule.scheduledDate)}`}
                      >
                        <div className="truncate font-medium">
                          {formatTime(schedule.scheduledDate)}
                        </div>
                        <div className="truncate">
                          {EVALUATION_TYPE_LABELS[schedule.evaluationType]}
                        </div>
                      </div>
                    ))}

                    {daySchedules.length > 2 && (
                      <div className="text-xs text-gray-500 text-center py-1">
                        +{daySchedules.length - 2} más
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
};

export default EvaluationCalendar;