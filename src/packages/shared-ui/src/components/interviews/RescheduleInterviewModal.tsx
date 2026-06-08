import React, { useState } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import DayScheduleSelector from '../DayScheduleSelector';
import { FiRefreshCw, FiAlertCircle, FiCalendar, FiClock, FiUser, FiArrowRight } from 'react-icons/fi';
import { Interview, INTERVIEW_TYPE_LABELS } from '../../types/interview';
import { interviewService } from '../../services/interviewService';

interface RescheduleInterviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  interview: Interview | null;
  onSuccess: () => void;
}

const RescheduleInterviewModal: React.FC<RescheduleInterviewModalProps> = ({
  isOpen,
  onClose,
  interview,
  onSuccess
}) => {
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getTodayDateString = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = `${today.getMonth() + 1}`.padStart(2, '0');
    const day = `${today.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleDateTimeSelect = (date: string, time: string) => {
    if (date && date < getTodayDateString()) {
      setNewDate('');
      setNewTime('');
      setError('No se puede reagendar entrevistas en fechas anteriores a hoy.');
      return;
    }

    setNewDate(date);
    setNewTime(time);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!interview) return;

    // Validaciones
    if (!newDate || !newTime) {
      setError('Por favor seleccione una nueva fecha y hora');
      return;
    }

    if (newDate < getTodayDateString()) {
      setError('No se puede reagendar entrevistas en fechas anteriores a hoy.');
      return;
    }

    if (!reason.trim()) {
      setError('Por favor ingrese un motivo de reagendación');
      return;
    }

    if (reason.trim().length < 10) {
      setError('El motivo debe tener al menos 10 caracteres');
      return;
    }

    // Validar que la nueva fecha/hora no sea la misma que la actual
    if (newDate === interview.scheduledDate && newTime === interview.scheduledTime) {
      setError('La nueva fecha y hora deben ser diferentes a las actuales');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);


      await interviewService.rescheduleInterview(interview.id, newDate, newTime, reason.trim());


      // Limpiar formulario y cerrar modal
      setNewDate('');
      setNewTime('');
      setReason('');
      onSuccess();
      onClose();
    } catch (error: any) {
      setError(error.response?.data?.message || error.message || 'Error al reagendar la entrevista');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setNewDate('');
      setNewTime('');
      setReason('');
      setError(null);
      onClose();
    }
  };

  if (!interview) return null;

  // Formatear fecha y hora actual
  const formatDateTime = (date: string, time: string) => {
    const [year, month, day] = date.split('-');
    const [hour, minute] = time.split(':');
    const dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute));

    return {
      date: dateObj.toLocaleDateString('es-CL', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      }),
      time: dateObj.toLocaleTimeString('es-CL', {
        hour: '2-digit',
        minute: '2-digit'
      })
    };
  };

  const currentDateTime = formatDateTime(interview.scheduledDate, interview.scheduledTime);
  const newDateTime = newDate && newTime ? formatDateTime(newDate, newTime) : null;

  // Determinar el tipo de operación según el estado
  const getModalConfig = () => {
    switch (interview.status) {
      case 'PENDING':
        return {
          title: 'Agendar Entrevista',
          color: 'green',
          header: 'Programar nueva entrevista',
          message: 'Seleccione fecha y hora para programar esta entrevista. Se notificará automáticamente al apoderado.',
          buttonText: 'Programar Entrevista',
          showCurrentDate: false
        };
      case 'CANCELLED':
        return {
          title: 'Reagendar Entrevista Cancelada',
          color: 'emerald',
          header: 'Reagendar entrevista cancelada',
          message: 'Esta entrevista fue cancelada anteriormente. Al seleccionar nueva fecha y hora, se reactivará y notificará a todas las partes.',
          buttonText: 'Reagendar Entrevista',
          showCurrentDate: true
        };
      case 'REJECTED_BY_FAMILY':
        return {
          title: 'Reagendar Entrevista Rechazada',
          color: 'amber',
          header: 'La familia rechazó el horario anterior',
          message: 'Seleccione un nuevo horario que funcione para todas las partes. La entrevista se programará inmediatamente.',
          buttonText: 'Programar Nuevo Horario',
          showCurrentDate: false // No mostrar fecha rechazada
        };
      default: // SCHEDULED, CONFIRMED
        return {
          title: 'Reagendar Entrevista',
          color: 'blue',
          header: 'Cambiar fecha y hora',
          message: 'El horario actual será liberado automáticamente. Se notificará del cambio a apoderado y entrevistadores.',
          buttonText: 'Confirmar Reagendación',
          showCurrentDate: true
        };
    }
  };

  const config = getModalConfig();
  const colorMap: Record<string, { bg: string; border: string; icon: string; header: string; text: string }> = {
    green: { bg: 'bg-green-50', border: 'border-green-200', icon: 'text-green-600', header: 'text-green-800', text: 'text-green-700' },
    emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200', icon: 'text-emerald-600', header: 'text-emerald-800', text: 'text-emerald-700' },
    amber: { bg: 'bg-amber-50', border: 'border-amber-200', icon: 'text-amber-600', header: 'text-amber-800', text: 'text-amber-700' },
    blue: { bg: 'bg-blue-50', border: 'border-blue-200', icon: 'text-blue-600', header: 'text-blue-800', text: 'text-blue-700' }
  };
  const colorClasses = colorMap[config.color] || colorMap.blue;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={config.title}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {/* Info contextual según estado */}
        <div className={`${colorClasses.bg} ${colorClasses.border} rounded-lg p-4 flex items-start space-x-3 border`}>
          <FiAlertCircle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${colorClasses.icon}`} />
          <div className="flex-1">
            <h4 className={`text-sm font-semibold mb-1 ${colorClasses.header}`}>
              {config.header}
            </h4>
            <p className={`text-sm ${colorClasses.text}`}>
              {config.message}
            </p>
          </div>
        </div>

        {/* Detalles de la entrevista */}
        <div className="bg-gray-50 rounded-lg p-4 space-y-3">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">
            {config.showCurrentDate ? 'Horario Actual' : 'Información de la Entrevista'}
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Estudiante */}
            <div className="flex items-start space-x-2">
              <FiUser className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-xs text-gray-600">Estudiante</p>
                <p className="text-sm font-medium text-gray-900">{interview.studentName}</p>
              </div>
            </div>

            {/* Tipo de Entrevista */}
            <div className="flex items-start space-x-2">
              <div className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0"></div>
              <div className="flex-1">
                <p className="text-xs text-gray-600">Tipo de Entrevista</p>
                <p className="text-sm font-medium text-gray-900">{INTERVIEW_TYPE_LABELS[interview.type]}</p>
              </div>
            </div>

            {/* Fecha y Hora Actual */}
            <div className="flex items-start space-x-2 md:col-span-2">
              <FiCalendar className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-xs text-gray-600">Fecha y Hora Actual</p>
                <p className="text-sm font-medium text-gray-900 capitalize">{currentDateTime.date}</p>
                <p className="text-sm text-gray-700 flex items-center mt-1">
                  <FiClock className="w-3 h-3 mr-1" />
                  {currentDateTime.time} hrs
                </p>
              </div>
            </div>

            {/* Entrevistador(es) */}
            <div className="flex items-start space-x-2 md:col-span-2">
              <FiUser className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-xs text-gray-600">Entrevistador(es)</p>
                <p className="text-sm font-medium text-gray-900">{interview.interviewerName}</p>
                {interview.secondInterviewerName && (
                  <p className="text-sm text-gray-700 mt-1">
                    & {interview.secondInterviewerName}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Selector de nueva fecha y hora */}
        <div className="border border-gray-200 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-4">
            Seleccionar Nueva Fecha y Hora
          </h4>
          <DayScheduleSelector
            evaluatorId={interview.interviewerId}
            evaluatorName={interview.interviewerName}
            secondEvaluatorId={interview.secondInterviewerId}
            secondEvaluatorName={interview.secondInterviewerName}
            selectedDate={newDate}
            selectedTime={newTime}
            onDateTimeSelect={handleDateTimeSelect}
            disabled={isSubmitting}
          />
        </div>

        {/* Comparación visual: Antes → Después */}
        {newDateTime && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-green-800 mb-3 flex items-center">
              <FiRefreshCw className="w-4 h-4 mr-2" />
              Resumen del Cambio
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
              {/* Antes */}
              <div className="text-center md:text-left">
                <p className="text-xs text-gray-600 mb-1">Fecha Actual</p>
                <p className="text-sm font-medium text-gray-700 capitalize">
                  {currentDateTime.date}
                </p>
                <p className="text-sm text-gray-600 flex items-center justify-center md:justify-start mt-1">
                  <FiClock className="w-3 h-3 mr-1" />
                  {currentDateTime.time}
                </p>
              </div>

              {/* Flecha */}
              <div className="flex justify-center">
                <FiArrowRight className="w-6 h-6 text-green-600" />
              </div>

              {/* Después */}
              <div className="text-center md:text-right">
                <p className="text-xs text-green-600 mb-1 font-medium">Nueva Fecha</p>
                <p className="text-sm font-semibold text-green-800 capitalize">
                  {newDateTime.date}
                </p>
                <p className="text-sm text-green-700 flex items-center justify-center md:justify-end mt-1">
                  <FiClock className="w-3 h-3 mr-1" />
                  {newDateTime.time}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Campo de motivo de reagendación */}
        <div>
          <label htmlFor="rescheduleReason" className="block text-sm font-medium text-gray-700 mb-2">
            Motivo de Reagendación *
          </label>
          <textarea
            id="rescheduleReason"
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              setError(null);
            }}
            placeholder="Ingrese el motivo detallado de la reagendación (mínimo 10 caracteres)..."
            rows={3}
            disabled={isSubmitting}
            maxLength={500}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors resize-none ${
              error
                ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
            } ${isSubmitting ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}`}
            required
          />
          <p className="mt-1 text-xs text-gray-500">
            {reason.length}/500 caracteres
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Botones de acción */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={
              isSubmitting ||
              !newDate ||
              !newTime ||
              !reason.trim() ||
              reason.trim().length < 10 ||
              (newDate === interview.scheduledDate && newTime === interview.scheduledTime)
            }
            className={`text-white disabled:bg-gray-300 disabled:cursor-not-allowed ${
              interview.status === 'PENDING' ? 'bg-green-600 hover:bg-green-700' :
              interview.status === 'CANCELLED' ? 'bg-emerald-600 hover:bg-emerald-700' :
              interview.status === 'REJECTED_BY_FAMILY' ? 'bg-amber-600 hover:bg-amber-700' :
              'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {isSubmitting ? (
              <>
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></span>
                {interview.status === 'PENDING' ? 'Programando...' : 'Reagendando...'}
              </>
            ) : (
              <>
                <FiRefreshCw className="w-4 h-4 mr-2" />
                {config.buttonText}
              </>
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default RescheduleInterviewModal;
