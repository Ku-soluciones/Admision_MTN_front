import React, { useState, useEffect, useMemo } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import LoadingSpinner from '../ui/LoadingSpinner';
import Modal from '../ui/Modal';
import InterviewDetailsPanel from '../interviews/InterviewDetailsPanel';
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
  FiRefreshCw,
  FiRotateCcw,
  FiCheckCircle,
  FiGrid,
  FiCalendar as FiCalendarIcon
} from 'react-icons/fi';
import {
  Interview,
  InterviewStatus,
  InterviewType,
  InterviewMode,
  INTERVIEW_STATUS_LABELS,
  INTERVIEW_TYPE_LABELS,
  INTERVIEW_MODE_LABELS,
  InterviewLifecycle,
  InterviewUtils,
  INTERVIEW_CONFIG
} from '../../types/interview';
import interviewService from '../../services/interviewService';
import { userService } from '../../services/userService';

const DAYS_OF_WEEK = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const getDateString = (date: Date): string => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const sortOperationalFirst = (interviews: Interview[]): Interview[] => (
  [...interviews].sort((a, b) => {
    const aInactive = InterviewLifecycle.isInactive(a.status) ? 1 : 0;
    const bInactive = InterviewLifecycle.isInactive(b.status) ? 1 : 0;
    if (aInactive !== bInactive) return aInactive - bInactive;
    return `${a.scheduledTime}-${a.id}`.localeCompare(`${b.scheduledTime}-${b.id}`);
  })
);

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
  initialDate?: string;
}

const parseCalendarDate = (value?: string): Date => {
  if (!value) return new Date();
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return new Date();
  return new Date(year, month - 1, day);
};

const SharedCalendar: React.FC<SharedCalendarProps> = ({
  className = '',
  onCreateInterview,
  showCreateButton = true,
  initialDate,
}) => {
  const [currentDate, setCurrentDate] = useState(() => parseCalendarDate(initialDate));
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedInterview, setSelectedInterview] = useState<Interview | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedDayInterviews, setSelectedDayInterviews] = useState<Interview[]>([]);
  const [showDayInterviews, setShowDayInterviews] = useState(false);
  const [calendarMessage, setCalendarMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [filters, setFilters] = useState({
    interviewerId: '',
    status: '',
    type: '',
    mode: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [showRejected, setShowRejected] = useState(true); // Mostrar rechazadas por defecto en admin

  useEffect(() => {
    loadCalendarData();
    loadUsers();
  }, [currentDate, filters, showRejected]);

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
      
      // Obtener entrevistas del mes (incluyendo rechazadas si se solicita)
      let calendarInterviews = await interviewService.getCalendarInterviews(
        startDateStr, 
        endDateStr,
        filters.interviewerId ? parseInt(filters.interviewerId) : undefined,
        showRejected // Nuevo parámetro para incluir rechazadas
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
      setCalendarMessage({ type: 'error', text: 'No se pudo cargar el calendario de entrevistas.' });
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
      
      const dayInterviews = sortOperationalFirst(interviews.filter(interview => {
        // Parse date as YYYY-MM-DD WITHOUT timezone conversion
        // scheduledDate from backend is "2025-01-17" (no time, no timezone)
        // We need to compare it to calendar day without UTC conversion
        const dateStr = date.toISOString().split('T')[0]; // "2025-01-17"
        return interview.scheduledDate === dateStr;
      }));
      
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
    if (getDateString(day.date) < getDateString(new Date())) {
      return;
    }

    if (onCreateInterview && day.interviews.every(interview => InterviewLifecycle.isInactive(interview.status))) {
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
        onClick={(e) => { e.stopPropagation(); handleInterviewClick(interview); }}
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
        {interview.entrySource === 'MANUAL' && (
          <span className="mt-0.5 inline-flex rounded-full bg-white/90 px-1.5 py-0.5 text-[9px] font-bold text-amber-900">
            Excepcional
          </span>
        )}
        
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
    const operationalInterviews = day.interviews.filter(interview => !InterviewLifecycle.isInactive(interview.status));
    const historicalCount = day.interviews.length - operationalInterviews.length;
    const hasConflicts = operationalInterviews.length > 1 && 
      operationalInterviews.some((interview, i) => 
        operationalInterviews.slice(i + 1).some(other => 
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
          ${getDateString(day.date) < getDateString(new Date()) ? 'cursor-not-allowed opacity-60 hover:bg-white' : ''}
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
          {historicalCount > 0 && (
            <div className="text-[11px] font-medium text-gray-400">
              {historicalCount} historial
            </div>
          )}
        </div>
      </div>
    );
  };

  const summary = getInterviewSummary();

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Resumen operativo */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {[
          { label: 'Total', value: summary.total, Icon: FiGrid, className: 'border-gray-200 bg-gray-50 text-gray-600' },
          { label: 'Agendadas', value: (summary.byStatus[InterviewStatus.SCHEDULED] || 0) + (summary.byStatus[InterviewStatus.CONFIRMED] || 0), Icon: FiCalendarIcon, className: 'border-blue-200 bg-blue-50 text-blue-700' },
          { label: 'Completadas', value: summary.byStatus[InterviewStatus.COMPLETED] || 0, Icon: FiCheckCircle, className: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
        ].map(({ label, value, Icon, className }) => (
          <div key={label} className={`min-w-[132px] flex items-center gap-2 rounded-lg border px-3 py-2 ${className}`}>
            <Icon className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
            <span className="text-xs font-semibold">{label}</span>
            <span className="ml-auto text-lg font-bold leading-none">{value}</span>
          </div>
        ))}
      </div>

      {/* Controles del calendario */}
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-100"
          >
            <FiFilter className="h-4 w-4" />
            Filtros
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => navigateMonth('prev')}
            className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-100"
            aria-label="Mes anterior"
          >
            <FiChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => navigateMonth('next')}
            className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-100"
            aria-label="Mes siguiente"
          >
            <FiChevronRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={goToToday}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-100"
          >
            <FiRotateCcw className="h-4 w-4" />
            Hoy
          </button>
          <button
            type="button"
            onClick={loadCalendarData}
            disabled={isLoading}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:opacity-60"
            aria-label="Actualizar"
          >
            <FiRefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
          {showCreateButton && onCreateInterview && (
            <button
              type="button"
              onClick={() => onCreateInterview(new Date(), '09:00')}
              className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-dorado-nazaret px-3 py-2 text-sm font-semibold text-white hover:bg-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-300"
            >
              <FiPlus className="h-4 w-4" />
              Nueva Entrevista
            </button>
          )}
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

          {/* Toggle mostrar rechazadas */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showRejected}
                onChange={(e) => setShowRejected(e.target.checked)}
                className="w-4 h-4 text-azul-monte-tabor border-gray-300 rounded focus:ring-azul-monte-tabor"
              />
              <span className="text-sm text-gray-700">
                Mostrar entrevistas rechazadas por familia
              </span>
              {showRejected && (
                <span className="text-xs text-gray-500 ml-2">
                  (Las entrevistas rechazadas aparecen en gris y pueden ser liberadas para reprogramar)
                </span>
              )}
            </label>
          </div>
        </Card>
      )}

      {/* Resumen y título del mes */}
      {calendarMessage && (
        <div className={`rounded-lg border px-4 py-3 text-sm font-medium ${
          calendarMessage.type === 'success'
            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
            : 'border-red-200 bg-red-50 text-red-700'
        }`}>
          {calendarMessage.text}
        </div>
      )}

      {/* Calendario principal */}
      <section className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-col gap-2 p-4 md:flex-row md:items-end md:justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wide text-gray-900">
            {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h3>
          <div className="flex flex-wrap gap-3 text-xs text-gray-500">
            {Object.entries(INTERVIEW_CONFIG.COLORS).map(([status, color]) => (
              <span key={status} className="inline-flex items-center gap-1">
                <span className="h-3 w-3 rounded" style={{ backgroundColor: color }} />
                {INTERVIEW_STATUS_LABELS[status as InterviewStatus]}
              </span>
            ))}
            <span className="inline-flex items-center gap-1">
              <span className="h-3 w-3 rounded bg-red-500" />
              Conflictos de horario
            </span>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : (
          <>
            {/* Días de la semana */}
            <div className="grid grid-cols-7 gap-2 p-2">
              {DAYS_OF_WEEK.map(day => (
                <div key={day} className="rounded-lg bg-gray-50 px-3 py-2 text-center">
                  <p className="text-sm font-bold text-gray-900">{day}</p>
                </div>
              ))}
            </div>

            {/* Días del mes */}
            <div className="grid grid-cols-7">
              {calendarDays.map((day, index) => renderCalendarDay(day, index))}
            </div>
          </>
        )}
      </section>

      {/* Modal de detalles de entrevista */}
      <Modal isOpen={showDetails} onClose={() => setShowDetails(false)} size="xl" showCloseButton={false}>
        {selectedInterview && (
          <InterviewDetailsPanel
            interview={selectedInterview}
            onClose={() => setShowDetails(false)}
            onRelease={selectedInterview.status === InterviewStatus.REJECTED_BY_FAMILY ? async (interview) => {
              try {
                await interviewService.releaseRejectedInterview(interview.id);
                setShowDetails(false);
                setSelectedInterview(null);
                setCalendarMessage({ type: 'success', text: 'Entrevista liberada para reagendar.' });
                loadCalendarData();
              } catch (error: any) {
                setCalendarMessage({ type: 'error', text: error.message || 'Error al liberar la entrevista.' });
              }
            } : undefined}
          />
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
