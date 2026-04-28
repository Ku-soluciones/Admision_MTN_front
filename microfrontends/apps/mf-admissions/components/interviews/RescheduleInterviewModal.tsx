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

  const handleDateTimeSelect = (date: string, time: string) => {
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

      console.log(`🔄 Reagendando entrevista ${interview.id} a ${newDate} ${newTime} con razón: "${reason}"`);

      await interviewService.rescheduleInterview(interview.id, newDate, newTime, reason.trim());

      console.log('✅ Entrevista reagendada exitosamente');

      // Limpiar formulario y cerrar modal
      setNewDate('');
      setNewTime('');
      setReason('');
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('❌ Error al reagendar entrevista:', error);
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

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Reagendar Entrevista"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {/* Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start space-x-3">
          <FiAlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-blue-800 mb-1">
              Reagendar Entrevista
            </h4>
            <p className="text-sm text-blue-700">
              Seleccione una nueva fecha y hora disponible. Se enviará una notificación automática al apoderado y al entrevistador con los nuevos detalles.
            </p>
          </div>
        </div>

        {/* Detalles de la entrevista actual */}
        <div className="bg-gray-50 rounded-lg p-4 space-y-3">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">
            Información Actual de la Entrevista
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
              <div className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0">📝</div>
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
            <p className="text-sm text-red-700">❌ {error}</p>
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
            className="bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></span>
                Reagendando...
              </>
            ) : (
              <>
                <FiRefreshCw className="w-4 h-4 mr-2" />
                Reagendar Entrevista
              </>
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default RescheduleInterviewModal;
