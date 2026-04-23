import React, { useState } from 'react';
import Modal from '../ui/Modal';
import axios from 'axios';
import { getApiBaseUrl } from '../../config/api.config';

interface ApplicationDecisionModalProps {
  isOpen: boolean;
  onClose: () => void;
  application: any;
  onDecisionMade: () => void;
}

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

  if (!application) return null;

  const handleSubmitDecision = async () => {
    if (!decision) {
      alert('Por favor selecciona una decisión');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      await axios.post(
        `/v1/applications/${application.id}/final-decision`,
        {
          decision,
          note
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      setShowConfirmation(true);
      setTimeout(() => {
        setShowConfirmation(false);
        onDecisionMade();
        onClose();
      }, 2000);
    } catch (error) {
      console.error('Error al enviar decisión:', error);
      alert('Error al procesar la decisión. Por favor intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setDecision(null);
    setNote('');
    setShowConfirmation(false);
    onClose();
  };

  return (
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
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-blue-700 font-medium">Estudiante:</span>
                <p className="text-blue-900">{application.student?.fullName || application.student?.firstName + ' ' + application.student?.lastName}</p>
              </div>
              <div>
                <span className="text-blue-700 font-medium">Curso:</span>
                <p className="text-blue-900">{application.student?.gradeApplied}</p>
              </div>
              <div>
                <span className="text-blue-700 font-medium">Apoderado:</span>
                <p className="text-blue-900">{application.father?.fullName || application.mother?.fullName}</p>
              </div>
              <div>
                <span className="text-blue-700 font-medium">Email:</span>
                <p className="text-blue-900">{application.father?.email || application.mother?.email}</p>
              </div>
            </div>
          </div>

          {/* Resumen del Proceso */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            {/* Entrevistas */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Entrevistas
              </h4>
              {application.interviews && application.interviews.length > 0 ? (
                <div className="space-y-2">
                  {application.interviews.map((interview: any) => (
                    <div key={interview.id} className="text-sm border-l-2 border-blue-300 pl-3">
                      <p className="font-medium text-gray-900">{interview.type}</p>
                      <p className="text-gray-600">{interview.interviewer}</p>
                      <p className={`text-xs ${interview.status === 'COMPLETED' ? 'text-green-600' : 'text-yellow-600'}`}>
                        {interview.status}
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
              {application.evaluations && application.evaluations.length > 0 ? (
                <div className="space-y-2">
                  {application.evaluations.map((evaluation: any) => (
                    <div key={evaluation.id} className="text-sm border-l-2 border-green-300 pl-3">
                      <p className="font-medium text-gray-900">{evaluation.type}</p>
                      <p className="text-gray-600">{evaluation.evaluator}</p>
                      {evaluation.score && (
                        <p className="text-green-600 font-semibold">
                          {evaluation.score}/{evaluation.maxScore || 100}
                        </p>
                      )}
                      <p className={`text-xs ${evaluation.status === 'COMPLETED' ? 'text-green-600' : 'text-yellow-600'}`}>
                        {evaluation.status}
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

            <div className="flex gap-4 mb-4">
              <button
                onClick={() => setDecision('APPROVED')}
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
                onClick={() => setDecision('REJECTED')}
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
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {decision === 'APPROVED' ? 'Mensaje de Bienvenida (opcional)' : 'Observaciones (opcional)'}
              </label>
              <textarea
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
                onClick={handleClose}
                disabled={loading}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
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
  );
};

export default ApplicationDecisionModal;
