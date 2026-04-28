import React from 'react';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import { 
  EditIcon, 
  ViewIcon, 
  CheckCircleIcon, 
  XCircleIcon,
  CalendarIcon,
  ClockIcon
} from '../icons/Icons';
import {
  FiEdit,
  FiEye,
  FiCheck,
  FiX,
  FiCalendar,
  FiClock,
  FiMapPin,
  FiVideo,
  FiRefreshCw,
  FiUser,
  FiMail,
  FiBell,
  FiTrash2
} from 'react-icons/fi';
import {
  Interview,
  InterviewTableProps,
  InterviewStatus,
  InterviewType,
  InterviewMode,
  InterviewResult,
  INTERVIEW_STATUS_LABELS,
  INTERVIEW_TYPE_LABELS,
  INTERVIEW_MODE_LABELS,
  INTERVIEW_RESULT_LABELS,
  InterviewUtils
} from '../../types/interview';

const InterviewTable: React.FC<InterviewTableProps> = ({
  interviews,
  isLoading = false,
  onEdit,
  onComplete,
  onCancel,
  onReschedule,
  onView,
  onSendNotification,
  onSendReminder,
  onRefreshDashboard,
  className = ''
}) => {
  const [deletingId, setDeletingId] = React.useState<number | null>(null);

  const handleDelete = async (interview: Interview) => {
    if (!confirm(`¿Está seguro que desea cancelar esta entrevista? Esta acción marcará la entrevista como cancelada.`)) {
      return;
    }

    try {
      setDeletingId(interview.id);

      // Use interviewService.cancelInterview for soft delete (sets status to CANCELLED)
      const interviewService = (await import('../../services/interviewService')).default;
      await interviewService.cancelInterview(interview.id, 'Cancelada por administrador');

      console.log('🔄 Interview cancelled successfully, triggering dashboard refresh');

      // Use callback to refresh parent dashboard instead of full page reload
      if (onRefreshDashboard) {
        onRefreshDashboard();
      } else {
        // Fallback to page reload if callback not provided (backward compatibility)
        window.location.reload();
      }
    } catch (error) {
      console.error('Error cancelling interview:', error);
      alert(`Error al cancelar la entrevista: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    } finally {
      setDeletingId(null);
    }
  };

  const getStatusBadge = (status: InterviewStatus) => {
    const variant = InterviewUtils.getStatusColor(status);
    return (
      <Badge variant={variant}>
        {INTERVIEW_STATUS_LABELS[status]}
      </Badge>
    );
  };

  const getTypeBadge = (type: InterviewType) => {
    const colors = {
      [InterviewType.INDIVIDUAL]: 'bg-blue-100 text-blue-800',
      [InterviewType.FAMILY]: 'bg-green-100 text-green-800',
      [InterviewType.PSYCHOLOGICAL]: 'bg-purple-100 text-purple-800',
      [InterviewType.ACADEMIC]: 'bg-yellow-100 text-yellow-800',
      [InterviewType.BEHAVIORAL]: 'bg-pink-100 text-pink-800'
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[type]}`}>
        {INTERVIEW_TYPE_LABELS[type]}
      </span>
    );
  };

  const getModeIcon = (mode: InterviewMode, location?: string, virtualLink?: string) => {
    switch (mode) {
      case InterviewMode.IN_PERSON:
        return (
          <div className="flex items-center text-sm text-gray-600">
            <FiMapPin className="w-4 h-4 mr-1" />
            <span className="truncate" title={location}>
              {location || 'Presencial'}
            </span>
          </div>
        );
      case InterviewMode.VIRTUAL:
        return (
          <div className="flex items-center text-sm text-gray-600">
            <FiVideo className="w-4 h-4 mr-1" />
            <span>Virtual</span>
          </div>
        );
      case InterviewMode.HYBRID:
        return (
          <div className="flex items-center text-sm text-gray-600">
            <FiUser className="w-4 h-4 mr-1" />
            <span>Híbrida</span>
          </div>
        );
      default:
        return null;
    }
  };

  const getResultBadge = (result?: InterviewResult) => {
    if (!result) return null;
    
    const variant = InterviewUtils.getResultColor(result);
    return (
      <Badge variant={variant} className="text-xs">
        {INTERVIEW_RESULT_LABELS[result]}
      </Badge>
    );
  };

  const formatDateTime = (date: string, time: string) => {
    // NO usar new Date() para evitar problemas de zona horaria
    // date viene como "2024-11-03", time como "14:00:00"
    const [year, month, day] = date.split('-');
    const [hour, minute] = time.split(':');

    // Crear fecha en zona horaria local explícitamente
    const dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute));

    return {
      date: dateObj.toLocaleDateString('es-CL', {
        day: '2-digit',
        month: '2-digit'
      }),
      time: dateObj.toLocaleTimeString('es-CL', {
        hour: '2-digit',
        minute: '2-digit'
      }),
      dayName: dateObj.toLocaleDateString('es-CL', {
        weekday: 'short'
      })
    };
  };

  const canCompleteInterview = (interview: Interview): boolean => {
    return interview.status === InterviewStatus.IN_PROGRESS || 
           interview.status === InterviewStatus.CONFIRMED;
  };

  const canEditInterview = (interview: Interview): boolean => {
    return interview.status !== InterviewStatus.COMPLETED && 
           interview.status !== InterviewStatus.CANCELLED;
  };

  const canCancelInterview = (interview: Interview): boolean => {
    return interview.status === InterviewStatus.SCHEDULED || 
           interview.status === InterviewStatus.CONFIRMED;
  };

  const isUpcoming = (interview: Interview): boolean => {
    return InterviewUtils.isUpcoming(interview.scheduledDate, interview.scheduledTime);
  };

  const isOverdue = (interview: Interview): boolean => {
    return InterviewUtils.isOverdue(interview.scheduledDate, interview.scheduledTime, interview.status);
  };

  if (interviews.length === 0 && !isLoading) {
    return (
      <div className="text-center py-12">
        <CalendarIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No hay entrevistas programadas
        </h3>
        <p className="text-gray-500">
          Las entrevistas programadas aparecerán aquí.
        </p>
      </div>
    );
  }

  return (
    <div className={`overflow-hidden ${className}`}>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Estudiante
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Fecha y Hora
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tipo
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Modalidad
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Entrevistador
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Estado
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Resultado
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {interviews.map((interview) => {
              const dateTime = formatDateTime(interview.scheduledDate, interview.scheduledTime);
              const upcoming = isUpcoming(interview);
              const overdue = isOverdue(interview);
              
              return (
                <tr 
                  key={interview.id} 
                  className={`hover:bg-gray-50 ${
                    upcoming ? 'bg-blue-50' : 
                    overdue ? 'bg-red-50' : ''
                  }`}
                >
                  {/* Estudiante */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {interview.studentName}
                      </div>
                      <div className="text-sm text-gray-500">
                        {interview.gradeApplied}
                      </div>
                      <div className="text-xs text-gray-400">
                        {interview.parentNames}
                      </div>
                    </div>
                  </td>

                  {/* Fecha y Hora */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <FiCalendar className="w-4 h-4 text-gray-400 mr-2" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {dateTime.dayName} {dateTime.date}
                        </div>
                        <div className="text-sm text-gray-500 flex items-center">
                          <FiClock className="w-3 h-3 mr-1" />
                          {dateTime.time} ({InterviewUtils.formatDuration(interview.duration)})
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Tipo */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getTypeBadge(interview.type)}
                  </td>

                  {/* Modalidad */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getModeIcon(interview.mode, interview.location, interview.virtualMeetingLink)}
                  </td>

                  {/* Entrevistador(es) */}
                  <td className="px-6 py-4">
                    <div className="flex items-start">
                      <FiUser className="w-4 h-4 text-gray-400 mr-2 mt-0.5 flex-shrink-0" />
                      <div className="text-sm text-gray-900">
                        <div>{interview.interviewerName}</div>
                        {interview.secondInterviewerName && (
                          <div className="text-xs text-gray-600 mt-1 flex items-center">
                            <span className="mr-1">&</span>
                            {interview.secondInterviewerName}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Estado */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col space-y-1">
                      {getStatusBadge(interview.status)}
                      {upcoming && (
                        <span className="text-xs text-blue-600 font-medium">
                          Próximamente
                        </span>
                      )}
                      {overdue && (
                        <span className="text-xs text-red-600 font-medium">
                          Vencida
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Resultado */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col space-y-1">
                      {getResultBadge(interview.result)}
                      {interview.score && (
                        <span className="text-xs text-gray-600">
                          Puntuación: {interview.score}/10
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Acciones */}
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                    <div className="flex justify-end space-x-1">
                      {/* Ver detalles */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onView(interview)}
                        title="Ver detalles"
                      >
                        <FiEye className="w-4 h-4" />
                      </Button>

                      {/* Editar */}
                      {canEditInterview(interview) && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onEdit(interview)}
                          title="Editar entrevista"
                        >
                          <FiEdit className="w-4 h-4" />
                        </Button>
                      )}

                      {/* Reprogramar */}
                      {canEditInterview(interview) && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onReschedule(interview)}
                          title="Reprogramar"
                        >
                          <FiRefreshCw className="w-4 h-4" />
                        </Button>
                      )}

                      {/* Completar */}
                      {canCompleteInterview(interview) && (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => onComplete(interview)}
                          title="Completar entrevista"
                        >
                          <FiCheck className="w-4 h-4" />
                        </Button>
                      )}

                      {/* Enviar notificación */}
                      {onSendNotification && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onSendNotification(interview, 'scheduled')}
                          title="Enviar notificación por correo"
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        >
                          <FiMail className="w-4 h-4" />
                        </Button>
                      )}

                      {/* Enviar recordatorio */}
                      {onSendReminder && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onSendReminder(interview)}
                          title="Enviar recordatorio por correo"
                          className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                        >
                          <FiBell className="w-4 h-4" />
                        </Button>
                      )}

                      {/* Cancelar */}
                      {canCancelInterview(interview) && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onCancel(interview)}
                          title="Cancelar entrevista"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <FiX className="w-4 h-4" />
                        </Button>
                      )}

                      {/* Eliminar (solo para canceladas) */}
                      {interview.status === InterviewStatus.CANCELLED && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(interview)}
                          disabled={deletingId === interview.id}
                          title="Eliminar entrevista cancelada permanentemente"
                          className="text-red-700 hover:text-red-800 hover:bg-red-100 border-red-300 font-medium"
                        >
                          {deletingId === interview.id ? (
                            <>
                              <FiRefreshCw className="w-4 h-4 animate-spin mr-1" />
                              <span className="text-xs">Eliminando...</span>
                            </>
                          ) : (
                            <>
                              <FiTrash2 className="w-4 h-4 mr-1" />
                              <span className="text-xs">Eliminar</span>
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {isLoading && (
        <div className="flex justify-center items-center py-8">
          <div className="flex items-center space-x-2">
            <FiRefreshCw className="w-5 h-5 animate-spin text-azul-monte-tabor" />
            <span className="text-gray-600">Cargando entrevistas...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default InterviewTable;