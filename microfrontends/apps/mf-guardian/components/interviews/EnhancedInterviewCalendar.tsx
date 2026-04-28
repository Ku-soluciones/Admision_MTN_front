import React, { useState, useMemo, useCallback, useEffect } from 'react';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Modal from '../ui/Modal';
import {
  FiCalendar,
  FiChevronLeft,
  FiChevronRight,
  FiClock,
  FiUser,
  FiMapPin,
  FiVideo,
  FiMove,
  FiCheck,
  FiX,
  FiAlertTriangle
} from 'react-icons/fi';
import {
  Interview,
  InterviewStatus,
  InterviewMode,
  INTERVIEW_STATUS_LABELS,
  INTERVIEW_TYPE_LABELS,
  INTERVIEW_MODE_LABELS,
  InterviewUtils,
  INTERVIEW_CONFIG
} from '../../types/interview';
import interviewService from '../../services/interviewService';

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
  availableSlots: string[];
}

interface DraggedInterview {
  interview: Interview;
  originalDate: string;
  originalTime: string;
}

interface RescheduleConfirmation {
  interview: Interview;
  newDate: string;
  newTime: string;
  conflicts: Interview[];
}

interface EnhancedInterviewCalendarProps {
  interviews: Interview[];
  onSelectEvent: (interview: Interview) => void;
  onSelectSlot: (slotInfo: { start: Date; end: Date; date: string; time: string }) => void;
  onReschedule: (interview: Interview, newDate: string, newTime: string) => Promise<void>;
  className?: string;
}

const EnhancedInterviewCalendar: React.FC<EnhancedInterviewCalendarProps> = ({
  interviews,
  onSelectEvent,
  onSelectSlot,
  onReschedule,
  className = ''
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
  const [draggedInterview, setDraggedInterview] = useState<DraggedInterview | null>(null);
  const [dropTarget, setDropTarget] = useState<{ date: string; time?: string } | null>(null);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [rescheduleConfirmation, setRescheduleConfirmation] = useState<RescheduleConfirmation | null>(null);
  const [isRescheduling, setIsRescheduling] = useState(false);

  // Horarios disponibles para entrevistas
  const availableTimeSlots = INTERVIEW_CONFIG.DEFAULT_TIME_SLOTS;

  // Generar días del calendario con slots disponibles
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
        const interviewDate = new Date(interview.scheduledDate);
        return interviewDate.toDateString() === date.toDateString();
      });

      // Calcular slots disponibles (slots que no están ocupados)
      const occupiedTimes = dayInterviews.map(i => i.scheduledTime);
      const availableSlots = availableTimeSlots.filter(slot => 
        !occupiedTimes.includes(slot) && date >= today
      );
      
      days.push({
        date: new Date(date),
        isCurrentMonth: date.getMonth() === month,
        isToday: date.toDateString() === today.toDateString(),
        interviews: dayInterviews,
        availableSlots
      });
    }
    
    return days;
  }, [currentDate, interviews, availableTimeSlots]);

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

  // Manejar inicio de arrastre
  const handleDragStart = useCallback((e: React.DragEvent, interview: Interview) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', ''); // Necesario para Firefox
    
    setDraggedInterview({
      interview,
      originalDate: interview.scheduledDate,
      originalTime: interview.scheduledTime
    });

    // Estilo visual para el elemento siendo arrastrado
    const dragImage = document.createElement('div');
    dragImage.innerHTML = `📅 ${interview.studentName}`;
    dragImage.style.background = '#3B82F6';
    dragImage.style.color = 'white';
    dragImage.style.padding = '8px 12px';
    dragImage.style.borderRadius = '6px';
    dragImage.style.fontSize = '14px';
    dragImage.style.position = 'absolute';
    dragImage.style.top = '-1000px';
    document.body.appendChild(dragImage);
    e.dataTransfer.setDragImage(dragImage, 0, 0);
    
    setTimeout(() => document.body.removeChild(dragImage), 0);
  }, []);

  // Manejar drag over (permite el drop)
  const handleDragOver = useCallback((e: React.DragEvent, date: string, time?: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropTarget({ date, time });
  }, []);

  // Manejar salida de drag
  const handleDragLeave = useCallback(() => {
    setDropTarget(null);
  }, []);

  // Manejar drop con validación de disponibilidad en tiempo real
  const handleDrop = useCallback(async (e: React.DragEvent, date: string, time?: string) => {
    e.preventDefault();
    setDropTarget(null);

    if (!draggedInterview || !time) return;

    const newDate = date;
    const newTime = time;

    // Verificar si es la misma fecha y hora
    if (draggedInterview.originalDate === newDate && draggedInterview.originalTime === newTime) {
      setDraggedInterview(null);
      return;
    }

    // 🔒 VALIDACIÓN EN TIEMPO REAL: Verificar disponibilidad con el backend
    try {
      const isAvailable = await interviewService.checkInterviewerAvailability(
        draggedInterview.interview.interviewerId,
        newDate,
        newTime,
        draggedInterview.interview.id // Excluir la entrevista que se está moviendo
      );

      if (!isAvailable) {
        // El slot está ocupado - mostrar error
        alert('⚠️ Este horario ya no está disponible. Por favor seleccione otro horario.');
        setDraggedInterview(null);
        return;
      }
    } catch (error) {
      console.error('Error verificando disponibilidad:', error);
      // Continuar con validación local como fallback
    }

    // Verificar conflictos locales (fallback adicional)
    const conflicts = interviews.filter(interview =>
      interview.id !== draggedInterview.interview.id &&
      interview.scheduledDate === newDate &&
      interview.scheduledTime === newTime &&
      (interview.status === 'SCHEDULED' || interview.status === 'CONFIRMED')
    );

    // Configurar confirmación de reprogramación
    setRescheduleConfirmation({
      interview: draggedInterview.interview,
      newDate,
      newTime,
      conflicts
    });

    setShowRescheduleModal(true);
    setDraggedInterview(null);
  }, [draggedInterview, interviews]);

  // Confirmar reprogramación con manejo de errores 409
  const confirmReschedule = async () => {
    if (!rescheduleConfirmation) return;

    setIsRescheduling(true);

    try {
      await onReschedule(
        rescheduleConfirmation.interview,
        rescheduleConfirmation.newDate,
        rescheduleConfirmation.newTime
      );

      setShowRescheduleModal(false);
      setRescheduleConfirmation(null);
    } catch (error: any) {
      console.error('Error al reprogramar:', error);

      // 🔒 MANEJO DE ERROR 409: Slot ya tomado
      if (error?.response?.status === 409) {
        const errorData = error.response.data;
        alert(
          `❌ ${errorData.message || 'Este horario ya está reservado'}\n\n` +
          `Por favor seleccione otro horario disponible.`
        );

        // Cerrar modal y permitir seleccionar otro horario
        setShowRescheduleModal(false);
        setRescheduleConfirmation(null);
      } else {
        // Otros errores se manejan en el componente padre
        throw error;
      }
    } finally {
      setIsRescheduling(false);
    }
  };

  // Cancelar reprogramación
  const cancelReschedule = () => {
    setShowRescheduleModal(false);
    setRescheduleConfirmation(null);
  };

  // Obtener color de evento según estado
  const getEventColor = (interview: Interview) => {
    const colors = INTERVIEW_CONFIG.COLORS;
    return colors[interview.status] || '#6B7280';
  };

  // Renderizar evento de entrevista
  const renderInterviewEvent = (interview: Interview, isInDropZone: boolean = false) => {
    const canDrag = ['SCHEDULED', 'CONFIRMED'].includes(interview.status);
    
    return (
      <div
        key={interview.id}
        className={`
          mb-1 p-2 rounded text-xs cursor-pointer transition-all duration-200
          ${canDrag ? 'hover:shadow-md' : 'cursor-not-allowed opacity-60'}
          ${isInDropZone ? 'ring-2 ring-blue-400' : ''}
          ${draggedInterview?.interview.id === interview.id ? 'opacity-50 scale-95' : ''}
        `}
        style={{ 
          backgroundColor: getEventColor(interview),
          color: 'white'
        }}
        draggable={canDrag}
        onDragStart={(e) => canDrag && handleDragStart(e, interview)}
        onClick={() => onSelectEvent(interview)}
        title={`${interview.studentName} - ${interview.scheduledTime}\n${INTERVIEW_TYPE_LABELS[interview.type]} - ${interview.interviewerName}`}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <div className="font-medium truncate">{interview.studentName}</div>
            <div className="flex items-center mt-1">
              <FiClock className="w-3 h-3 mr-1" />
              <span>{interview.scheduledTime}</span>
              {canDrag && <FiMove className="w-3 h-3 ml-1 opacity-70" />}
            </div>
          </div>
          <div className="ml-1">
            {interview.mode === 'VIRTUAL' ? (
              <FiVideo className="w-3 h-3" />
            ) : (
              <FiMapPin className="w-3 h-3" />
            )}
          </div>
        </div>
      </div>
    );
  };

  // Renderizar slot con estados visuales mejorados
  const renderAvailableSlot = (day: CalendarDay, time: string) => {
    const dateStr = day.date.toISOString().split('T')[0];
    const isDropTarget = dropTarget?.date === dateStr && dropTarget?.time === time;

    // Verificar si está ocupado (aunque esté en availableSlots, hacer doble check)
    const isOccupied = day.interviews.some(interview =>
      interview.scheduledTime === time &&
      (interview.status === 'SCHEDULED' || interview.status === 'CONFIRMED' || interview.status === 'IN_PROGRESS')
    );

    if (isOccupied) {
      // Slot ocupado - mostrar en rojo, no clickeable
      return (
        <div
          key={time}
          className="mb-1 p-2 border-2 border-red-300 bg-red-50 rounded text-xs cursor-not-allowed opacity-60"
          title={`Slot ocupado: ${time}`}
        >
          <div className="flex items-center justify-center text-red-600">
            <FiX className="w-3 h-3 mr-1" />
            <span>{time}</span>
          </div>
        </div>
      );
    }

    // Slot disponible - verde, clickeable
    return (
      <div
        key={time}
        className={`
          mb-1 p-2 border-2 border-dashed rounded text-xs cursor-pointer transition-all duration-200
          hover:border-green-500 hover:bg-green-100 hover:scale-105
          ${isDropTarget ? 'border-blue-500 bg-blue-100 scale-105 shadow-md' : 'border-green-300 bg-green-50'}
        `}
        onDragOver={(e) => handleDragOver(e, dateStr, time)}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, dateStr, time)}
        onClick={() => onSelectSlot({
          start: new Date(`${dateStr}T${time}`),
          end: new Date(`${dateStr}T${time}`),
          date: dateStr,
          time
        })}
        title={`✅ Slot disponible: ${time}`}
      >
        <div className="flex items-center justify-center text-green-700 font-medium">
          <FiClock className="w-3 h-3 mr-1" />
          <span>{time}</span>
        </div>
      </div>
    );
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header del calendario */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h2 className="text-xl font-semibold">
            {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h2>
          <div className="flex space-x-1">
            <Button variant="outline" size="sm" onClick={() => navigateMonth('prev')}>
              <FiChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={goToToday}>
              Hoy
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigateMonth('next')}>
              <FiChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <div className="text-sm text-gray-600 flex items-center">
            <FiMove className="w-4 h-4 mr-1" />
            Arrastra para reprogramar
          </div>
          <Badge variant="info" size="sm">
            {interviews.length} entrevistas
          </Badge>
        </div>
      </div>

      {/* Leyenda de colores mejorada */}
      <div className="flex flex-wrap gap-4 text-xs">
        {Object.entries(INTERVIEW_CONFIG.COLORS).map(([status, color]) => (
          <div key={status} className="flex items-center space-x-1">
            <div
              className="w-3 h-3 rounded"
              style={{ backgroundColor: color }}
            />
            <span>{INTERVIEW_STATUS_LABELS[status as keyof typeof INTERVIEW_STATUS_LABELS]}</span>
          </div>
        ))}
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 border-2 border-dashed border-green-300 bg-green-50 rounded" />
          <span>✅ Slot disponible</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 border-2 border-red-300 bg-red-50 rounded" />
          <span>❌ Slot ocupado</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 border-2 border-blue-500 bg-blue-100 rounded" />
          <span>🎯 Seleccionando...</span>
        </div>
      </div>

      {/* Grilla del calendario */}
      <Card className="p-4">
        {/* Días de la semana */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {DAYS_OF_WEEK.map((day) => (
            <div key={day} className="p-2 text-center text-sm font-medium text-gray-700">
              {day}
            </div>
          ))}
        </div>

        {/* Días del mes */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day, index) => (
            <div
              key={index}
              className={`
                min-h-[120px] p-1 border rounded
                ${day.isCurrentMonth ? 'bg-white' : 'bg-gray-50'}
                ${day.isToday ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}
                ${dropTarget?.date === day.date.toISOString().split('T')[0] ? 'ring-2 ring-blue-400' : ''}
              `}
            >
              {/* Número del día */}
              <div className={`text-sm font-medium mb-1 ${
                day.isCurrentMonth ? 'text-gray-900' : 'text-gray-400'
              }`}>
                {day.date.getDate()}
              </div>

              {/* Entrevistas programadas */}
              <div className="space-y-1">
                {day.interviews.map((interview) =>
                  renderInterviewEvent(
                    interview, 
                    dropTarget?.date === day.date.toISOString().split('T')[0]
                  )
                )}
              </div>

              {/* Slots disponibles (solo mostrar algunos para no saturar) */}
              <div className="space-y-1">
                {day.availableSlots.slice(0, 3).map((time) =>
                  renderAvailableSlot(day, time)
                )}
                {day.availableSlots.length > 3 && (
                  <div className="text-xs text-gray-500 text-center">
                    +{day.availableSlots.length - 3} más
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Modal de confirmación de reprogramación */}
      <Modal
        isOpen={showRescheduleModal}
        onClose={cancelReschedule}
        title="Confirmar Reprogramación"
        size="md"
      >
        {rescheduleConfirmation && (
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">
                Reprogramar Entrevista
              </h4>
              <div className="text-sm text-blue-800 space-y-1">
                <p><strong>Estudiante:</strong> {rescheduleConfirmation.interview.studentName}</p>
                <p><strong>Entrevistador:</strong> {rescheduleConfirmation.interview.interviewerName}</p>
                <p><strong>Tipo:</strong> {INTERVIEW_TYPE_LABELS[rescheduleConfirmation.interview.type]}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <h5 className="font-medium text-gray-900 mb-2">Fecha y Hora Actual</h5>
                <div className="text-sm text-gray-600">
                  <p>{(() => {
                    const [year, month, day] = rescheduleConfirmation.interview.scheduledDate.split('-');
                    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                    return date.toLocaleDateString('es-CL');
                  })()}</p>
                  <p>{rescheduleConfirmation.interview.scheduledTime}</p>
                </div>
              </div>
              <div>
                <h5 className="font-medium text-gray-900 mb-2">Nueva Fecha y Hora</h5>
                <div className="text-sm text-green-700 font-medium">
                  <p>{(() => {
                    const [year, month, day] = rescheduleConfirmation.newDate.split('-');
                    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                    return date.toLocaleDateString('es-CL');
                  })()}</p>
                  <p>{rescheduleConfirmation.newTime}</p>
                </div>
              </div>
            </div>

            {/* Advertencia sobre conflictos */}
            {rescheduleConfirmation.conflicts.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                <div className="flex items-start">
                  <FiAlertTriangle className="w-5 h-5 text-yellow-600 mr-2 mt-0.5" />
                  <div>
                    <h5 className="font-medium text-yellow-800 mb-2">
                      ⚠️ Conflicto de Horario
                    </h5>
                    <p className="text-sm text-yellow-700 mb-2">
                      Ya existe una entrevista en este horario:
                    </p>
                    {rescheduleConfirmation.conflicts.map((conflict) => (
                      <div key={conflict.id} className="text-sm text-yellow-700 mb-1">
                        • {conflict.studentName} con {conflict.interviewerName}
                      </div>
                    ))}
                    <p className="text-sm text-yellow-700 mt-2">
                      Al confirmar, se sobrescribirá el horario existente.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={cancelReschedule}
                disabled={isRescheduling}
              >
                <FiX className="w-4 h-4 mr-2" />
                Cancelar
              </Button>
              <Button
                variant="primary"
                onClick={confirmReschedule}
                disabled={isRescheduling}
                isLoading={isRescheduling}
                loadingText="Reprogramando..."
                className="bg-green-600 hover:bg-green-700"
              >
                <FiCheck className="w-4 h-4 mr-2" />
                Confirmar Reprogramación
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default EnhancedInterviewCalendar;