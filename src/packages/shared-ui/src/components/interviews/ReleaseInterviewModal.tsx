import React, { useState } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { FiUnlock, FiAlertCircle, FiCalendar, FiClock, FiUser, FiInfo } from 'react-icons/fi';
import { Interview, INTERVIEW_TYPE_LABELS, INTERVIEW_STATUS_LABELS } from '../../types/interview';
import { interviewService } from '../../services/interviewService';

interface ReleaseInterviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  interview: Interview | null;
  onSuccess: () => void;
}

const ReleaseInterviewModal: React.FC<ReleaseInterviewModalProps> = ({
  isOpen,
  onClose,
  interview,
  onSuccess
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!interview) return;

    try {
      setIsSubmitting(true);
      setError(null);

      await interviewService.releaseRejectedInterview(interview.id, notes.trim() || undefined);

      onSuccess();
      onClose();
    } catch (error: any) {
      setError(error.response?.data?.message || error.message || 'Error al liberar la entrevista');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setError(null);
      setNotes('');
      onClose();
    }
  };

  if (!interview) return null;

  // Formatear fecha y hora
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

  const dateTime = formatDateTime(interview.scheduledDate, interview.scheduledTime);

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Liberar Entrevista Rechazada"
      size="md"
    >
      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {/* Información */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start space-x-3">
          <FiInfo className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-amber-800 mb-1">
              Liberar entrevista para reprogramación
            </h4>
            <p className="text-sm text-amber-700">
              Esta acción permitirá reagendar la entrevista que fue rechazada por la familia. 
              La entrevista volverá a estado pendiente y podrá ser reprogramada con nueva fecha y hora.
            </p>
          </div>
        </div>

        {/* Detalles de la entrevista */}
        <div className="bg-gray-50 rounded-lg p-4 space-y-3">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">
            Detalles de la Entrevista
          </h4>

          <div className="grid grid-cols-1 gap-3">
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

            {/* Estado actual */}
            <div className="flex items-start space-x-2">
              <FiAlertCircle className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-xs text-gray-600">Estado Actual</p>
                <p className="text-sm font-medium text-gray-900">{INTERVIEW_STATUS_LABELS[interview.status]}</p>
              </div>
            </div>

            {/* Fecha y Hora original */}
            <div className="flex items-start space-x-2">
              <FiCalendar className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-xs text-gray-600">Fecha y Hora Original</p>
                <p className="text-sm font-medium text-gray-900 capitalize">{dateTime.date}</p>
                <p className="text-sm text-gray-700 flex items-center mt-1">
                  <FiClock className="w-3 h-3 mr-1" />
                  {dateTime.time} hrs
                </p>
              </div>
            </div>

            {/* Entrevistador(es) */}
            <div className="flex items-start space-x-2">
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

        {/* Notas opcionales */}
        <div className="space-y-2">
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
            Notas (opcional)
          </label>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Agregue notas sobre la liberación de esta entrevista..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
            rows={3}
            maxLength={500}
          />
          <p className="text-xs text-gray-500 text-right">{notes.length}/500</p>
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
            disabled={isSubmitting}
            className="bg-amber-600 hover:bg-amber-700 text-white disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></span>
                Liberando...
              </>
            ) : (
              <>
                <FiUnlock className="w-4 h-4 mr-2" />
                Liberar para Reagendar
              </>
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default ReleaseInterviewModal;
