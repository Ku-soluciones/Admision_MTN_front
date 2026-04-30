import React from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import {
  EvaluationSchedule,
  EVALUATION_TYPE_LABELS,
  SCHEDULE_STATUS_LABELS,
  ScheduleUtils,
  ScheduleStatus
} from '../../types/evaluation';
import { 
  CalendarIcon, 
  ClockIcon, 
  MapPinIcon, 
  UserIcon, 
  DocumentTextIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  VideoIcon
} from '../icons/Icons';

interface EvaluationScheduleCardProps {
  schedule: EvaluationSchedule;
  variant?: 'default' | 'compact' | 'detailed';
  showActions?: boolean;
  onConfirm?: (schedule: EvaluationSchedule) => void;
  onReschedule?: (schedule: EvaluationSchedule) => void;
  onMarkComplete?: (schedule: EvaluationSchedule) => void;
  onViewDetails?: (schedule: EvaluationSchedule) => void;
  disabled?: boolean;
}

const EvaluationScheduleCard: React.FC<EvaluationScheduleCardProps> = ({
  schedule,
  variant = 'default',
  showActions = true,
  onConfirm,
  onReschedule,
  onMarkComplete,
  onViewDetails,
  disabled = false
}) => {
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-CL', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('es-CL', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadgeVariant = () => {
    return ScheduleUtils.getStatusColor(schedule.status) as any;
  };

  const getTypeIcon = () => {
    if (ScheduleUtils.isAcademicExam(schedule.evaluationType)) {
      return <DocumentTextIcon className="w-5 h-5" />;
    }
    return <UserIcon className="w-5 h-5" />;
  };

  const needsConfirmation = ScheduleUtils.requiresConfirmation(schedule);
  const isOverdue = ScheduleUtils.isConfirmationOverdue(schedule);
  const timeToConfirm = ScheduleUtils.getTimeToConfirm(schedule);

  if (variant === 'compact') {
    return (
      <Card className={`p-3 ${disabled ? 'opacity-50' : ''}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {getTypeIcon()}
            <div>
              <h4 className="font-medium text-azul-monte-tabor text-sm">
                {EVALUATION_TYPE_LABELS[schedule.evaluationType]}
              </h4>
              <p className="text-xs text-gray-600">
                {formatDate(schedule.scheduledDate)} • {formatTime(schedule.scheduledDate)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={getStatusBadgeVariant()} size="sm">
              {SCHEDULE_STATUS_LABELS[schedule.status]}
            </Badge>
            {needsConfirmation && (
              <ExclamationTriangleIcon className="w-4 h-4 text-orange-500" />
            )}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className={`p-6 ${disabled ? 'opacity-50' : ''}`}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${
              ScheduleUtils.isAcademicExam(schedule.evaluationType) 
                ? 'bg-blue-100 text-blue-600' 
                : 'bg-purple-100 text-purple-600'
            }`}>
              {getTypeIcon()}
            </div>
            <div>
              <h3 className="font-semibold text-azul-monte-tabor">
                {EVALUATION_TYPE_LABELS[schedule.evaluationType]}
              </h3>
              {schedule.gradeLevel && (
                <p className="text-sm text-gray-600">{schedule.gradeLevel}</p>
              )}
            </div>
          </div>
          <Badge variant={getStatusBadgeVariant()}>
            {SCHEDULE_STATUS_LABELS[schedule.status]}
          </Badge>
        </div>

        {/* Información del estudiante */}
        {schedule.application?.student && (
          <div className="bg-gray-50 rounded-lg p-3">
            <h4 className="font-medium text-gray-900 mb-1">Estudiante</h4>
            <p className="text-sm text-gray-700">
              {schedule.application.student.firstName} {schedule.application.student.paternalLastName || schedule.application.student.lastName || ''} {schedule.application.student.maternalLastName || ''}
            </p>
            <p className="text-xs text-gray-500">
              Postula a: {schedule.application.student.gradeApplied}
            </p>
          </div>
        )}

        {/* Detalles de la cita */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Fecha y hora */}
          <div className="flex items-center gap-3">
            <CalendarIcon className="w-5 h-5 text-gray-400" />
            <div>
              <p className="font-medium text-gray-900">
                {formatDate(schedule.scheduledDate)}
              </p>
              <p className="text-sm text-gray-600">
                {formatTime(schedule.scheduledDate)} • {ScheduleUtils.formatDuration(schedule.durationMinutes)}
              </p>
            </div>
          </div>

          {/* Evaluador */}
          <div className="flex items-center gap-3">
            <UserIcon className="w-5 h-5 text-gray-400" />
            <div>
              <p className="font-medium text-gray-900">
                {schedule.evaluator.firstName} {schedule.evaluator.lastName}
              </p>
              <p className="text-sm text-gray-600">{schedule.evaluator.email}</p>
            </div>
          </div>

          {/* Ubicación */}
          {(schedule.location || schedule.meetingLink) && (
            <div className="flex items-center gap-3">
              {schedule.meetingLink ? (
                <VideoIcon className="w-5 h-5 text-gray-400" />
              ) : (
                <MapPinIcon className="w-5 h-5 text-gray-400" />
              )}
              <div>
                <p className="font-medium text-gray-900">
                  {schedule.location || 'Reunión Virtual'}
                </p>
                {schedule.meetingLink && (
                  <a
                    href={schedule.meetingLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-azul-monte-tabor hover:underline"
                  >
                    Unirse a la reunión
                  </a>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Alertas de confirmación */}
        {needsConfirmation && (
          <div className={`rounded-lg p-3 ${
            isOverdue 
              ? 'bg-red-50 border border-red-200' 
              : 'bg-orange-50 border border-orange-200'
          }`}>
            <div className="flex items-center gap-2">
              <ExclamationTriangleIcon className={`w-5 h-5 ${
                isOverdue ? 'text-red-600' : 'text-orange-600'
              }`} />
              <div>
                <p className={`font-medium ${
                  isOverdue ? 'text-red-800' : 'text-orange-800'
                }`}>
                  {isOverdue ? 'Confirmación vencida' : 'Requiere confirmación'}
                </p>
                <p className={`text-sm ${
                  isOverdue ? 'text-red-700' : 'text-orange-700'
                }`}>
                  {isOverdue 
                    ? 'El plazo para confirmar esta cita ha vencido. Contacte al colegio.'
                    : `Debe confirmar su asistencia. Tiempo restante: ${timeToConfirm}`
                  }
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Información adicional */}
        {variant === 'detailed' && (
          <>
            {/* Asistentes requeridos */}
            {schedule.attendeesRequired && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Asistentes requeridos</h4>
                <p className="text-sm text-gray-700">{schedule.attendeesRequired}</p>
              </div>
            )}

            {/* Materiales de preparación */}
            {schedule.preparationMaterials && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Materiales necesarios</h4>
                <p className="text-sm text-gray-700">{schedule.preparationMaterials}</p>
              </div>
            )}

            {/* Instrucciones */}
            {schedule.instructions && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Instrucciones especiales</h4>
                <p className="text-sm text-gray-700">{schedule.instructions}</p>
              </div>
            )}
          </>
        )}

        {/* Acciones */}
        {showActions && !disabled && (
          <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-100">
            {/* Confirmar cita */}
            {needsConfirmation && !isOverdue && onConfirm && (
              <Button 
                size="sm" 
                onClick={() => onConfirm(schedule)}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircleIcon className="w-4 h-4 mr-1" />
                Confirmar Asistencia
              </Button>
            )}

            {/* Reprogramar */}
            {onReschedule && schedule.status !== ScheduleStatus.COMPLETED && (
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => onReschedule(schedule)}
              >
                <ClockIcon className="w-4 h-4 mr-1" />
                Reprogramar
              </Button>
            )}

            {/* Marcar como completada */}
            {onMarkComplete && schedule.status === ScheduleStatus.CONFIRMED && (
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => onMarkComplete(schedule)}
              >
                <CheckCircleIcon className="w-4 h-4 mr-1" />
                Marcar Completada
              </Button>
            )}

            {/* Ver detalles */}
            {onViewDetails && variant !== 'detailed' && (
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => onViewDetails(schedule)}
              >
                Ver Detalles
              </Button>
            )}
          </div>
        )}

        {/* Información de confirmación */}
        {schedule.confirmedAt && (
          <div className="text-xs text-gray-500 pt-2 border-t border-gray-100">
            Confirmado el {new Date(schedule.confirmedAt).toLocaleDateString('es-CL')}
            {schedule.confirmedBy && (
              <> por {schedule.confirmedBy.firstName} {schedule.confirmedBy.lastName}</>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};

export default EvaluationScheduleCard;