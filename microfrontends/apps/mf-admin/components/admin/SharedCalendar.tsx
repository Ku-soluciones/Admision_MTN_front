import React, { useState, useEffect, useMemo } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import LoadingSpinner from '../ui/LoadingSpinner';
import Modal from '../ui/Modal';
import {
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  UserIcon,
  FilterIcon
} from '../icons/Icons';
import { 
  FiCalendar, 
  FiChevronLeft, 
  FiChevronRight, 
  FiClock, 
  FiUser, 
  FiMapPin, 
  FiVideo,
  FiFilter,
  FiEye,
  FiPlus,
  FiRefreshCw
} from 'react-icons/fi';
import {
  Interview,
  InterviewStatus,
  InterviewType,
  InterviewMode,
  INTERVIEW_STATUS_LABELS,
  INTERVIEW_TYPE_LABELS,
  INTERVIEW_MODE_LABELS,
  InterviewUtils,
  INTERVIEW_CONFIG
} from '../../types/interview';
import interviewService from '../../services/interviewService';
import { userService } from '../../services/userService';

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

interface User {
  id: number;
  firstName: string;
  lastName: string;
  role: string;
}

interface SharedCalendarProps {
  className?: string;
  onCreateInterview?: (date: Date, time?: string) => void;
  showCreateButton?: boolean;
}

const SharedCalendar: React.FC<SharedCalendarProps> = ({
  className = '',
  onCreateInterview,
  showCreateButton = true
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedInterview, setSelectedInterview] = useState<Interview | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedDayInterviews, setSelectedDayInterviews] = useState<Interview[]>([]);
  const [showDayInterviews, setShowDayInterviews] = useState(false);
  const [filters, setFilters] = useState({
    interviewerId: '',
    status: '',
    type: '',
    mode: ''
  });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadCalendarData();
    loadUsers();
  }, [currentDate, filters]);

  const loadCalendarData = async () => {
    try {
      setIsLoading(true);
      
      // Obtener el primer y último día del mes actual
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month + 1, 0);
      
      // Formatear fechas para la API
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];
      
      // Obtener entrevistas del mes
      let calendarInterviews = await interviewService.getCalendarInterviews(
        startDateStr, 
        endDateStr,
        filters.interviewerId ? parseInt(filters.interviewerId) : undefined
      );

      // Aplicar filtros adicionales
      if (filters.status) {
        calendarInterviews = calendarInterviews.filter(i => i.status === filters.status);
      }
      if (filters.type) {
        calendarInterviews = calendarInterviews.filter(i => i.type === filters.type);
      }
      if (filters.mode) {
        calendarInterviews = calendarInterviews.filter(i => i.mode === filters.mode);
      }

      setInterviews(calendarInterviews);
    } catch (error) {
      console.error('Error cargando calendario:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      // Obtener usuarios que pueden ser entrevistadores
      const allUsers = await userService.getAllUsers({ page: 0, size: 100 });
      const interviewers = allUsers.content.filter(user => 
        ['ADMIN', 'CYCLE_DIRECTOR', 'TEACHER', 'COORDINATOR', 'PSYCHOLOGIST']
        .includes(user.role)
      );
      setUsers(interviewers);
    } catch (error) {
      console.error('Error cargando usuarios:', error);
    }
  };

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
        // Parse date as YYYY-MM-DD WITHOUT timezone conversion
        // scheduledDate from backend is "2025-01-17" (no time, no timezone)
        // We need to compare it to calendar day without UTC conversion
        const dateStr = date.toISOString().split('T')[0]; // "2025-01-17"
        return interview.scheduledDate === dateStr;
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
    if (onCreateInterview && day.interviews.length === 0) {
      onCreateInterview(day.date, '09:00');
    }
  };

  const handleInterviewClick = (interview: Interview) => {
    setSelectedInterview(interview);
    setShowDetails(true);
  };

  const handleShowMoreClick = (e: React.MouseEvent, interviews: Interview[]) => {
    e.stopPropagation(); // Prevenir que se dispare el click del día
    setSelectedDayInterviews(interviews);
    setShowDayInterviews(true);
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

  const formatTime = (time: string): string => {
    return time.substring(0, 5); // HH:MM
  };

  const getInterviewSummary = () => {
    const total = interviews.length;
    const byStatus = interviews.reduce((acc, interview) => {
      acc[interview.status] = (acc[interview.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return { total, byStatus };
  };

  const renderInterviewEvent = (interview: Interview) => {
    const statusColor = getStatusColor(interview.status);
    const isUpcoming = InterviewUtils.isUpcoming(interview.scheduledDate, interview.scheduledTime);
    const isOverdue = InterviewUtils.isOverdue(interview.scheduledDate, interview.scheduledTime, interview.status);
    
    return (
      <div
        key={interview.id}
        onClick={() => handleInterviewClick(interview)}
        className={`
          relative p-1 mb-1 rounded text-xs cursor-pointer transition-all hover:shadow-md
          ${isUpcoming ? 'ring-1 ring-blue-400' : ''}
          ${isOverdue ? 'ring-1 ring-red-400' : ''}
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
        </div>
        <div className="truncate font-medium text-xs">
          {interview.studentName}
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
    const hasConflicts = day.interviews.length > 1 && 
      day.interviews.some((interview, i) => 
        day.interviews.slice(i + 1).some(other => 
          interview.scheduledTime === other.scheduledTime
        )
      );
    
    return (
      <div
        key={index}
        onClick={() => handleDateClick(day)}
        className={`
          relative min-h-[100px] p-1 border-r border-b border-gray-200 cursor-pointer transition-colors
          ${day.isCurrentMonth ? 'bg-white hover:bg-gray-50' : 'bg-gray-50 text-gray-400'}
          ${day.isToday ? 'bg-blue-50 border-blue-200' : ''}
          ${hasConflicts ? 'bg-red-50 border-red-200' : ''}
        `}
      >
        {/* Número del día */}
        <div className={`
          text-xs font-medium mb-1
          ${day.isToday ? 'text-blue-600' : ''}
          ${hasConflicts ? 'text-red-600' : ''}
        `}>
          {day.date.getDate()}
        </div>
        
        {/* Indicador de día actual */}
        {day.isToday && (
          <div className="absolute top-1 right-1 w-2 h-2 bg-blue-500 rounded-full"></div>
        )}
        
        {/* Indicador de conflictos */}
        {hasConflicts && (
          <div className="absolute top-1 left-1 w-2 h-2 bg-red-500 rounded-full"></div>
        )}
        
        {/* Entrevistas del día */}
        <div className="space-y-1">
          {day.interviews.slice(0, 2).map(interview => renderInterviewEvent(interview))}

          {day.interviews.length > 2 && (
            <div
              onClick={(e) => handleShowMoreClick(e, day.interviews)}
              className="text-xs text-gray-500 font-medium bg-gray-100 hover:bg-gray-200 rounded px-1 cursor-pointer transition-colors"
            >
              +{day.interviews.length - 2} más
            </div>
          )}
        </div>
      </div>
    );
  };

  const summary = getInterviewSummary();

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header del calendario */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
        <div className="flex items-center space-x-4">
          <h2 className="text-xl font-semibold text-gray-900">
            Calendario de Entrevistas
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
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <FiFilter className="w-4 h-4 mr-2" />
            Filtros
          </Button>
          
          {showCreateButton && onCreateInterview && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => onCreateInterview(new Date(), '09:00')}
            >
              <FiPlus className="w-4 h-4 mr-2" />
              Nueva Entrevista
            </Button>
          )}
          
          <Button
            variant="outline"
            size="sm"
            onClick={loadCalendarData}
            disabled={isLoading}
          >
            <FiRefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Filtros */}
      {showFilters && (
        <Card className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Entrevistador
              </label>
              <select
                value={filters.interviewerId}
                onChange={(e) => setFilters(prev => ({ ...prev, interviewerId: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="">Todos</option>
                {users.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.firstName} {user.lastName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Estado
              </label>
              <select
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="">Todos</option>
                {Object.entries(INTERVIEW_STATUS_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo
              </label>
              <select
                value={filters.type}
                onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="">Todos</option>
                {Object.entries(INTERVIEW_TYPE_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Modalidad
              </label>
              <select
                value={filters.mode}
                onChange={(e) => setFilters(prev => ({ ...prev, mode: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="">Todas</option>
                {Object.entries(INTERVIEW_MODE_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
          </div>
        </Card>
      )}

      {/* Resumen y título del mes */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
        <h3 className="text-lg font-medium text-gray-900">
          {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
        </h3>
        
        <div className="flex items-center space-x-4 text-sm text-gray-600">
          <span>Total: {summary.total}</span>
          <span>Programadas: {summary.byStatus[InterviewStatus.SCHEDULED] || 0}</span>
          <span>Completadas: {summary.byStatus[InterviewStatus.COMPLETED] || 0}</span>
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
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 rounded bg-red-500"></div>
          <span>Conflictos de horario</span>
        </div>
      </div>

      {/* Calendario principal */}
      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : (
          <>
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
          </>
        )}
      </Card>

      {/* Modal de detalles de entrevista */}
      <Modal isOpen={showDetails} onClose={() => setShowDetails(false)}>
        {selectedInterview && (
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Detalles de la Entrevista
            </h3>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Estudiante</label>
                  <p className="text-gray-900">{selectedInterview.studentName}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-600">Entrevistador{selectedInterview.secondInterviewerName ? 'es' : ''}</label>
                  <p className="text-gray-900">
                    {selectedInterview.interviewerName}
                    {selectedInterview.secondInterviewerName && (
                      <span> y {selectedInterview.secondInterviewerName}</span>
                    )}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-600">Tipo</label>
                  <p className="text-gray-900">{INTERVIEW_TYPE_LABELS[selectedInterview.type]}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-600">Estado</label>
                  <Badge variant={getStatusColor(selectedInterview.status)}>
                    {INTERVIEW_STATUS_LABELS[selectedInterview.status]}
                  </Badge>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-600">Fecha y Hora</label>
                  <p className="text-gray-900">
                    {new Date(selectedInterview.scheduledDate).toLocaleDateString('es-CL')} - {formatTime(selectedInterview.scheduledTime)}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-600">Duración</label>
                  <p className="text-gray-900">{InterviewUtils.formatDuration(selectedInterview.duration)}</p>
                </div>
              </div>

              {selectedInterview.location && (
                <div>
                  <label className="text-sm font-medium text-gray-600">Ubicación</label>
                  <p className="text-gray-900">{selectedInterview.location}</p>
                </div>
              )}

              {selectedInterview.virtualMeetingLink && (
                <div>
                  <label className="text-sm font-medium text-gray-600">Enlace Virtual</label>
                  <a
                    href={selectedInterview.virtualMeetingLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 underline"
                  >
                    {selectedInterview.virtualMeetingLink}
                  </a>
                </div>
              )}

              {selectedInterview.notes && (
                <div>
                  <label className="text-sm font-medium text-gray-600">Notas</label>
                  <p className="text-gray-900">{selectedInterview.notes}</p>
                </div>
              )}
            </div>

            <div className="flex justify-end mt-6">
              <Button variant="outline" onClick={() => setShowDetails(false)}>
                Cerrar
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal de entrevistas del día */}
      <Modal isOpen={showDayInterviews} onClose={() => setShowDayInterviews(false)}>
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Entrevistas del Día - {selectedDayInterviews[0] && new Date(selectedDayInterviews[0].scheduledDate).toLocaleDateString('es-CL')}
          </h3>

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {selectedDayInterviews.map((interview) => (
              <div
                key={interview.id}
                onClick={() => {
                  setShowDayInterviews(false);
                  handleInterviewClick(interview);
                }}
                className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                style={{
                  borderLeft: `4px solid ${getStatusColor(interview.status)}`
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-gray-900">{formatTime(interview.scheduledTime)}</span>
                    {getModeIcon(interview.mode)}
                    <span className="text-sm text-gray-600">
                      {InterviewUtils.formatDuration(interview.duration)}
                    </span>
                  </div>
                  <Badge variant={getStatusColor(interview.status)}>
                    {INTERVIEW_STATUS_LABELS[interview.status]}
                  </Badge>
                </div>

                <div className="text-sm">
                  <p className="font-medium text-gray-900">{interview.studentName}</p>
                  <p className="text-gray-600">
                    {INTERVIEW_TYPE_LABELS[interview.type]} - {interview.interviewerName}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end mt-6">
            <Button variant="outline" onClick={() => setShowDayInterviews(false)}>
              Cerrar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default SharedCalendar;