import React, { useState, useMemo } from 'react';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import Card from '../ui/Card';
import { 
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  UserIcon
} from '../icons/Icons';
import { 
  FiCalendar, 
  FiChevronLeft, 
  FiChevronRight, 
  FiClock, 
  FiUser, 
  FiMapPin, 
  FiVideo 
} from 'react-icons/fi';
import {
  Interview,
  InterviewCalendarProps,
  InterviewStatus,
  InterviewMode,
  INTERVIEW_STATUS_LABELS,
  INTERVIEW_TYPE_LABELS,
  INTERVIEW_MODE_LABELS,
  InterviewUtils,
  INTERVIEW_CONFIG
} from '../../types/interview';

// Utility function to create a local date from YYYY-MM-DD string
// Prevents timezone issues when parsing date strings
const parseLocalDate = (dateString: string): Date => {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
};

const DAYS_OF_WEEK = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  interviews: Interview[];
}

const InterviewCalendar: React.FC<InterviewCalendarProps> = ({
  interviews,
  onSelectEvent,
  onSelectSlot,
  onEventDrop,
  className = ''
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');

  // Generar días del calendario
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const startDate = new Date(firstDayOfMonth);
    startDate.setDate(startDate.getDate() - firstDayOfMonth.getDay());
    
    const days: CalendarDay[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      
      const dayInterviews = interviews.filter(interview => {
        // Usar parseLocalDate para evitar problemas de zona horaria
        const interviewDate = parseLocalDate(interview.scheduledDate);
        return interviewDate.toDateString() === date.toDateString();
      });
      
      days.push({
        date: new Date(date),
        isCurrentMonth: date.getMonth() === month,
        isToday: date.toDateString() === today.toDateString(),
        interviews: dayInterviews
      });
    }
    
    return days;
  }, [currentDate, interviews]);

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prevDate => {
      const newDate = new Date(prevDate);
      newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
      return newDate;
    });
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const handleDateClick = (day: CalendarDay) => {
    setSelectedDate(day.date);
    if (day.interviews.length === 0 && onSelectSlot) {
      const startTime = new Date(day.date);
      startTime.setHours(9, 0, 0, 0);
      const endTime = new Date(startTime);
      endTime.setHours(10, 0, 0, 0);
      
      onSelectSlot({
        start: startTime,
        end: endTime
      });
    }
  };

  const handleInterviewClick = (interview: Interview, event: React.MouseEvent) => {
    event.stopPropagation();
    onSelectEvent(interview);
  };

  const getStatusColor = (status: InterviewStatus): string => {
    return INTERVIEW_CONFIG.COLORS[status] || '#6B7280';
  };

  const getModeIcon = (mode: InterviewMode) => {
    switch (mode) {
      case InterviewMode.VIRTUAL:
        return <FiVideo className="w-3 h-3" />;
      case InterviewMode.IN_PERSON:
        return <FiMapPin className="w-3 h-3" />;
      default:
        return <FiUser className="w-3 h-3" />;
    }
  };

  const formatTime = (time: string | undefined): string => {
    if (!time) return '--:--';
    return time.substring(0, 5); // HH:MM
  };

  const renderInterviewEvent = (interview: Interview) => {
    const statusColor = getStatusColor(interview.status);
    const isUpcoming = InterviewUtils.isUpcoming(interview.scheduledDate, interview.scheduledTime);
    const isOverdue = InterviewUtils.isOverdue(interview.scheduledDate, interview.scheduledTime, interview.status);
    
    return (
      <div
        key={interview.id}
        onClick={(e) => handleInterviewClick(interview, e)}
        className={`
          relative p-1 mb-1 rounded text-xs cursor-pointer transition-all hover:shadow-md
          ${isUpcoming ? 'ring-2 ring-blue-400' : ''}
          ${isOverdue ? 'ring-2 ring-red-400' : ''}
        `}
        style={{
          backgroundColor: statusColor,
          color: 'white'
        }}
        title={`${interview.studentName} - ${INTERVIEW_TYPE_LABELS[interview.type]} (${formatTime(interview.scheduledTime)})`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1 min-w-0">
            {getModeIcon(interview.mode)}
            <span className="truncate font-medium">
              {formatTime(interview.scheduledTime)}
            </span>
          </div>
          <div className="text-xs opacity-75">
            {InterviewUtils.formatDuration(interview.duration)}
          </div>
        </div>
        <div className="truncate font-medium">
          {interview.studentName}
        </div>
        <div className="truncate text-xs opacity-75">
          {INTERVIEW_TYPE_LABELS[interview.type]}
        </div>
        
        {isUpcoming && (
          <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
        )}
        {isOverdue && (
          <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-400 rounded-full"></div>
        )}
      </div>
    );
  };

  const renderCalendarDay = (day: CalendarDay, index: number) => {
    const isSelected = selectedDate && day.date.toDateString() === selectedDate.toDateString();
    
    return (
      <div
        key={index}
        onClick={() => handleDateClick(day)}
        className={`
          relative min-h-[120px] p-2 border-r border-b border-gray-200 cursor-pointer transition-colors
          ${day.isCurrentMonth ? 'bg-white hover:bg-gray-50' : 'bg-gray-50 text-gray-400'}
          ${day.isToday ? 'bg-blue-50 border-blue-200' : ''}
          ${isSelected ? 'bg-yellow-50 border-yellow-200' : ''}
        `}
      >
        {/* Número del día */}
        <div className={`
          text-sm font-medium mb-1
          ${day.isToday ? 'text-blue-600' : ''}
          ${isSelected ? 'text-yellow-600' : ''}
        `}>
          {day.date.getDate()}
        </div>
        
        {/* Indicador de día actual */}
        {day.isToday && (
          <div className="absolute top-1 right-1 w-2 h-2 bg-blue-500 rounded-full"></div>
        )}
        
        {/* Entrevistas del día */}
        <div className="space-y-1">
          {day.interviews.slice(0, 3).map(interview => renderInterviewEvent(interview))}
          
          {day.interviews.length > 3 && (
            <div className="text-xs text-gray-500 font-medium">
              +{day.interviews.length - 3} más
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderSelectedDateDetails = () => {
    if (!selectedDate) return null;
    
    const dayInterviews = interviews.filter(interview => {
      // Usar parseLocalDate para evitar problemas de zona horaria
      const interviewDate = parseLocalDate(interview.scheduledDate);
      return interviewDate.toDateString() === selectedDate.toDateString();
    });
    
    const formattedDate = selectedDate.toLocaleDateString('es-CL', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    return (
      <Card className="p-4">
        <h3 className="text-lg font-medium text-gray-900 mb-4 capitalize">
          {formattedDate}
        </h3>
        
        {dayInterviews.length === 0 ? (
          <div className="text-center py-8">
            <CalendarIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No hay entrevistas programadas</p>
            <Button
              variant="primary"
              size="sm"
              className="mt-2"
              onClick={() => {
                const startTime = parseLocalDate(selectedDate.toISOString().split('T')[0]);
                startTime.setHours(9, 0, 0, 0);
                const endTime = new Date(startTime);
                endTime.setHours(10, 0, 0, 0);
                
                onSelectSlot && onSelectSlot({
                  start: startTime,
                  end: endTime
                });
              }}
            >
              Programar Entrevista
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {dayInterviews
              .sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime))
              .map(interview => (
                <div
                  key={interview.id}
                  onClick={() => onSelectEvent(interview)}
                  className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <FiClock className="w-4 h-4 text-gray-400" />
                        <span className="font-medium">
                          {formatTime(interview.scheduledTime)} 
                          ({InterviewUtils.formatDuration(interview.duration)})
                        </span>
                        {getModeIcon(interview.mode)}
                      </div>
                      
                      <h4 className="font-medium text-gray-900 mb-1">
                        {interview.studentName}
                      </h4>
                      
                      <div className="text-sm text-gray-600 space-y-1">
                        <div>{INTERVIEW_TYPE_LABELS[interview.type]}</div>
                        <div className="flex items-center space-x-1">
                          <FiUser className="w-3 h-3" />
                          <span>{interview.interviewerName}</span>
                        </div>
                        {interview.location && (
                          <div className="flex items-center space-x-1">
                            <FiMapPin className="w-3 h-3" />
                            <span>{interview.location}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end space-y-1">
                      <Badge variant={InterviewUtils.getStatusColor(interview.status)}>
                        {INTERVIEW_STATUS_LABELS[interview.status]}
                      </Badge>
                      
                      {InterviewUtils.isUpcoming(interview.scheduledDate, interview.scheduledTime) && (
                        <span className="text-xs text-blue-600 font-medium">
                          Próximamente
                        </span>
                      )}
                      
                      {InterviewUtils.isOverdue(interview.scheduledDate, interview.scheduledTime, interview.status) && (
                        <span className="text-xs text-red-600 font-medium">
                          Vencida
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}
      </Card>
    );
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header del calendario */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h2 className="text-xl font-semibold text-gray-900">
            {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h2>
          
          <div className="flex space-x-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateMonth('prev')}
            >
              <FiChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateMonth('next')}
            >
              <FiChevronRight className="w-4 h-4" />
            </Button>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={goToToday}
          >
            Hoy
          </Button>
        </div>

        <div className="flex items-center space-x-2">
          <div className="flex space-x-1">
            {(['month', 'week', 'day'] as const).map(mode => (
              <Button
                key={mode}
                variant={viewMode === mode ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setViewMode(mode)}
              >
                {mode === 'month' ? 'Mes' : mode === 'week' ? 'Semana' : 'Día'}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Leyenda de colores */}
      <div className="flex flex-wrap gap-4 text-xs">
        {Object.entries(INTERVIEW_CONFIG.COLORS).map(([status, color]) => (
          <div key={status} className="flex items-center space-x-1">
            <div
              className="w-3 h-3 rounded"
              style={{ backgroundColor: color }}
            ></div>
            <span>{INTERVIEW_STATUS_LABELS[status as InterviewStatus]}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendario principal */}
        <div className="lg:col-span-2">
          <Card className="overflow-hidden">
            {/* Días de la semana */}
            <div className="grid grid-cols-7 bg-gray-50">
              {DAYS_OF_WEEK.map(day => (
                <div key={day} className="p-3 text-center text-sm font-medium text-gray-500 border-r border-b border-gray-200">
                  {day}
                </div>
              ))}
            </div>
            
            {/* Días del mes */}
            <div className="grid grid-cols-7">
              {calendarDays.map((day, index) => renderCalendarDay(day, index))}
            </div>
          </Card>
        </div>

        {/* Panel lateral */}
        <div className="space-y-4">
          {renderSelectedDateDetails()}
          
          {/* Resumen del día */}
          <Card className="p-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Resumen del Mes
            </h3>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Total entrevistas:</span>
                <span className="font-medium">{interviews.length}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Completadas:</span>
                <span className="font-medium text-green-600">
                  {interviews.filter(i => i.status === InterviewStatus.COMPLETED).length}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Programadas:</span>
                <span className="font-medium text-blue-600">
                  {interviews.filter(i => i.status === InterviewStatus.SCHEDULED || i.status === InterviewStatus.CONFIRMED).length}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Canceladas:</span>
                <span className="font-medium text-red-600">
                  {interviews.filter(i => i.status === InterviewStatus.CANCELLED).length}
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default InterviewCalendar;