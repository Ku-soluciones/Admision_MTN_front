import React, { useEffect, useRef, useState } from 'react';
import Modal from '../ui/Modal';
import SimpleToast from '../ui/SimpleToast';
import api from '../../services/api';
import {
  formatDisplayValue,
  formatPersonDisplayName,
  hasDisplayValue
} from '../../utils/applicationDecisionDisplay';

interface PersonSummary {
  fullName?: unknown;
  name?: unknown;
  firstName?: unknown;
  lastName?: unknown;
  paternalLastName?: unknown;
  maternalLastName?: unknown;
  email?: unknown;
}

interface StudentSummary extends PersonSummary {
  gradeApplied?: unknown;
  gradeApplying?: unknown;
  grade?: unknown;
}

interface ProcessSummary {
  id?: number | string;
  type?: unknown;
  interviewType?: unknown;
  evaluationType?: unknown;
  interviewer?: unknown;
  interviewerName?: unknown;
  evaluator?: unknown;
  evaluatorName?: unknown;
  score?: unknown;
  maxScore?: unknown;
  status?: unknown;
}

interface DecisionApplication {
  id: number | string;
  student?: StudentSummary | null;
  father?: PersonSummary | null;
  mother?: PersonSummary | null;
  guardian?: PersonSummary | null;
  applicantUser?: PersonSummary | null;
  interviews?: ProcessSummary[] | null;
  evaluations?: ProcessSummary[] | null;
}

interface ApplicationDecisionModalProps {
  isOpen: boolean;
  onClose: () => void;
  application: DecisionApplication | null;
  onDecisionMade: () => void;
}

const getRequestErrorMessage = (error: unknown): string => {
  if (!error || typeof error !== 'object') {
    return 'No se pudo registrar la decisión. Intenta nuevamente.';
  }

  const requestError = error as {
    message?: unknown;
    response?: { data?: { message?: unknown; error?: { message?: unknown } } };
  };
  const backendMessage = requestError.response?.data?.error?.message
    || requestError.response?.data?.message;

  return formatDisplayValue(
    backendMessage || requestError.message,
    'No se pudo registrar la decisión. Intenta nuevamente.'
  );
};

const ApplicationDecisionModal: React.FC<ApplicationDecisionModalProps> = ({
  isOpen,
  onClose,
  application,
  onDecisionMade
}) => {
  const [decision, setDecision] = useState<'APPROVED' | 'REJECTED' | null>(null);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
  }, []);

  if (!application) return null;

  const interviews = Array.isArray(application.interviews) ? application.interviews : [];
  const evaluations = Array.isArray(application.evaluations) ? application.evaluations : [];
  const studentName = formatPersonDisplayName(application.student, 'Sin nombre registrado');
  const guardian = application.guardian
    || application.father
    || application.mother
    || application.applicantUser;

  const handleClose = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setDecision(null);
    setNote('');
    setShowConfirmation(false);
    setToast(null);
    onClose();
  };

  const handleSubmitDecision = async () => {
    if (loading) return;

    if (!decision) {
      setToast({ message: 'Por favor selecciona una decisión', type: 'error' });
      return;
    }

    setLoading(true);
    try {
      await api.post(
        `/v1/applications/${application.id}/final-decision`,
        { decision, note: note.trim() }
      );

      setShowConfirmation(true);
      onDecisionMade();
      closeTimerRef.current = setTimeout(() => {
        handleClose();
      }, 2000);
    } catch (error) {
      setToast({ message: getRequestErrorMessage(error), type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {toast && (
        <SimpleToast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      <Modal isOpen={isOpen} onClose={handleClose}>
      {showConfirmation ? (
        <div className="p-8 text-center">
          <div className="mb-4">
            {decision === 'APPROVED' ? (
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            ) : (
              <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
            )}
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {decision === 'APPROVED' ? '¡Decisión Aprobada!' : 'Decisión Registrada'}
          </h3>
          <p className="text-gray-600">
            Se ha enviado un email de notificación al apoderado
          </p>
        </div>
      ) : (
        <div className="p-6 max-w-4xl">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Decisión Final de Admisión
          </h2>

          {/* Información del Estudiante */}
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
            <h3 className="font-semibold text-blue-900 mb-2">Información del Postulante</h3>
            <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              <div>
                <span className="text-blue-700 font-medium">Estudiante:</span>
                <p className="break-words text-blue-900">{studentName}</p>
              </div>
              <div>
                <span className="text-blue-700 font-medium">Curso:</span>
                <p className="break-words text-blue-900">
                  {formatDisplayValue(
                    application.student?.gradeApplied
                    || application.student?.gradeApplying
                    || application.student?.grade,
                    'Sin curso registrado'
                  )}
                </p>
              </div>
              <div>
                <span className="text-blue-700 font-medium">Apoderado:</span>
                <p className="break-words text-blue-900">
                  {formatPersonDisplayName(guardian, 'Sin apoderado registrado')}
                </p>
              </div>
              <div>
                <span className="text-blue-700 font-medium">Email:</span>
                <p className="break-all text-blue-900">
                  {formatDisplayValue(guardian?.email, 'Sin email registrado')}
                </p>
              </div>
            </div>
          </div>

          {/* Resumen del Proceso */}
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Entrevistas */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Entrevistas
              </h4>
              {interviews.length > 0 ? (
                <div className="space-y-2">
                  {interviews.map((interview, index) => (
                    <div key={interview.id ?? index} className="border-l-2 border-blue-300 pl-3 text-sm">
                      <p className="break-words font-medium text-gray-900">
                        {formatDisplayValue(interview.type || interview.interviewType, 'Entrevista')}
                      </p>
                      <p className="break-words text-gray-600">
                        {formatPersonDisplayName(
                          interview.interviewerName || interview.interviewer,
                          'Sin entrevistador asignado'
                        )}
                      </p>
                      <p className={`text-xs ${interview.status === 'COMPLETED' ? 'text-green-600' : 'text-yellow-700'}`}>
                        {formatDisplayValue(interview.status, 'Sin estado')}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">Sin entrevistas registradas</p>
              )}
            </div>

            {/* Evaluaciones */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Evaluaciones
              </h4>
              {evaluations.length > 0 ? (
                <div className="space-y-2">
                  {evaluations.map((evaluation, index) => (
                    <div key={evaluation.id ?? index} className="border-l-2 border-green-300 pl-3 text-sm">
                      <p className="break-words font-medium text-gray-900">
                        {formatDisplayValue(evaluation.evaluationType || evaluation.type, 'Evaluación')}
                      </p>
                      <p className="break-words text-gray-600">
                        {formatPersonDisplayName(
                          evaluation.evaluatorName || evaluation.evaluator,
                          'Sin evaluador asignado'
                        )}
                      </p>
                      {hasDisplayValue(evaluation.score) && (
                        <p className="text-green-600 font-semibold">
                          {formatDisplayValue(evaluation.score)}/{formatDisplayValue(evaluation.maxScore, '100')}
                        </p>
                      )}
                      <p className={`text-xs ${evaluation.status === 'COMPLETED' ? 'text-green-600' : 'text-yellow-700'}`}>
                        {formatDisplayValue(evaluation.status, 'Sin estado')}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">Sin evaluaciones registradas</p>
              )}
            </div>
          </div>

          {/* Decisión */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="font-semibold text-gray-900 mb-4">Tomar Decisión Final</h3>

            <div className="mb-4 flex flex-col gap-4 sm:flex-row">
              <button
                type="button"
                onClick={() => setDecision('APPROVED')}
                aria-pressed={decision === 'APPROVED'}
                className={`flex-1 p-4 border-2 rounded-lg transition-all ${
                  decision === 'APPROVED'
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-300 hover:border-green-400'
                }`}
              >
                <div className="flex items-center justify-center">
                  <svg className={`w-6 h-6 mr-2 ${decision === 'APPROVED' ? 'text-green-600' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className={`font-semibold ${decision === 'APPROVED' ? 'text-green-700' : 'text-gray-700'}`}>
                    APROBAR
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setDecision('REJECTED')}
                aria-pressed={decision === 'REJECTED'}
                className={`flex-1 p-4 border-2 rounded-lg transition-all ${
                  decision === 'REJECTED'
                    ? 'border-red-500 bg-red-50'
                    : 'border-gray-300 hover:border-red-400'
                }`}
              >
                <div className="flex items-center justify-center">
                  <svg className={`w-6 h-6 mr-2 ${decision === 'REJECTED' ? 'text-red-600' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className={`font-semibold ${decision === 'REJECTED' ? 'text-red-700' : 'text-gray-700'}`}>
                    RECHAZAR
                  </span>
                </div>
              </button>
            </div>

            <div className="mb-6">
              <label htmlFor="final-decision-note" className="block text-sm font-medium text-gray-700 mb-2">
                {decision === 'APPROVED' ? 'Mensaje de Bienvenida (opcional)' : 'Observaciones (opcional)'}
              </label>
              <textarea
                id="final-decision-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={
                  decision === 'APPROVED'
                    ? 'Mensaje personalizado para la familia...'
                    : 'Razón o comentarios sobre la decisión...'
                }
              />
            </div>

            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={handleClose}
                disabled={loading}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSubmitDecision}
                disabled={!decision || loading}
                className={`px-6 py-2 rounded-md text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed ${
                  decision === 'APPROVED'
                    ? 'bg-green-600 hover:bg-green-700'
                    : decision === 'REJECTED'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-gray-400'
                }`}
              >
                {loading ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Procesando...
                  </span>
                ) : (
                  `Confirmar ${decision === 'APPROVED' ? 'Aprobación' : decision === 'REJECTED' ? 'Rechazo' : 'Decisión'}`
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </Modal>
    </>
  );
};

export default ApplicationDecisionModal;
