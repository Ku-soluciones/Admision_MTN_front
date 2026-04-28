import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { FiX, FiUser, FiCheckCircle, FiAlertTriangle, FiFileText, FiUsers, FiAward } from 'react-icons/fi';
import { dashboardService, ApplicantSummary } from '../../services/dashboardService';

interface ApplicantSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  applicationId: number;
}

const ApplicantSummaryModal: React.FC<ApplicantSummaryModalProps> = ({
  isOpen,
  onClose,
  applicationId
}) => {
  const [summary, setSummary] = useState<ApplicantSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && applicationId) {
      fetchSummary();
    }
  }, [isOpen, applicationId]);

  const fetchSummary = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await dashboardService.getApplicantSummary(applicationId);
      setSummary(data);
    } catch (error: any) {
      console.error('Error fetching applicant summary:', error);
      setError(error.message || 'Error al cargar el resumen del postulante');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setSummary(null);
      setError(null);
      onClose();
    }
  };

  const getScoreColor = (score: number | null): string => {
    if (score === null) return 'text-gray-400';
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBgColor = (score: number | null): string => {
    if (score === null) return 'bg-gray-100';
    if (score >= 80) return 'bg-green-50';
    if (score >= 60) return 'bg-yellow-50';
    return 'bg-red-50';
  };

  const getDecisionBadge = (decision: 'ACEPTA' | 'NO_ACEPTA' | 'PENDIENTE') => {
    const badges = {
      ACEPTA: {
        bg: 'bg-green-100',
        text: 'text-green-800',
        label: 'Acepta',
        icon: <FiCheckCircle className="w-4 h-4" />
      },
      NO_ACEPTA: {
        bg: 'bg-red-100',
        text: 'text-red-800',
        label: 'No Acepta',
        icon: <FiX className="w-4 h-4" />
      },
      PENDIENTE: {
        bg: 'bg-yellow-100',
        text: 'text-yellow-800',
        label: 'Pendiente',
        icon: <FiAlertTriangle className="w-4 h-4" />
      }
    };

    const badge = badges[decision];
    return (
      <div className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full ${badge.bg} ${badge.text}`}>
        {badge.icon}
        <span className="font-semibold">{badge.label}</span>
      </div>
    );
  };

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-CL', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const renderScore = (label: string, score: number | null) => {
    return (
      <div className={`flex flex-col items-center p-4 rounded-lg ${getScoreBgColor(score)}`}>
        <span className="text-sm text-gray-600 mb-1">{label}</span>
        {score !== null ? (
          <span className={`text-3xl font-bold ${getScoreColor(score)}`}>
            {score.toFixed(1)}
          </span>
        ) : (
          <div className="group relative">
            <span className="text-3xl font-bold text-gray-400 cursor-help">—</span>
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block">
              <div className="bg-gray-800 text-white text-xs rounded py-1 px-2 whitespace-nowrap">
                Sin datos disponibles
              </div>
            </div>
          </div>
        )}
        <span className="text-xs text-gray-500 mt-1">sobre 100</span>
      </div>
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Resumen del Postulante"
      size="xl"
    >
      <div className="p-6">
        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-gray-600">Cargando resumen...</p>
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-red-700">Error: {error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchSummary}
              className="mt-3"
            >
              Reintentar
            </Button>
          </div>
        )}

        {/* Content */}
        {summary && !isLoading && !error && (
          <div className="space-y-6">
            {/* Header Info */}
            <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-100">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="bg-indigo-600 text-white rounded-full p-2">
                    <FiUser className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{summary.studentName}</h3>
                    <p className="text-sm text-gray-600">
                      Postula a: <span className="font-semibold">{summary.gradeApplied}</span>
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Estado: <span className="font-medium uppercase">{summary.applicationStatus}</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Exam Scores Section */}
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <FiFileText className="w-5 h-5 text-indigo-600" />
                <h4 className="text-md font-semibold text-gray-800">Puntajes de Exámenes</h4>
              </div>
              <div className="grid grid-cols-3 gap-4">
                {renderScore('Lenguaje', summary.scores.languagePct)}
                {renderScore('Inglés', summary.scores.englishPct)}
                {renderScore('Matemáticas', summary.scores.mathPct)}
              </div>
              <p className="text-xs text-gray-500 mt-3 text-center">
                * Puntajes normalizados a escala 0-100
              </p>
            </div>

            {/* Family Interview Section */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="flex items-center space-x-2 mb-3">
                <FiUsers className="w-5 h-5 text-indigo-600" />
                <h4 className="text-md font-semibold text-gray-800">Entrevista Familiar</h4>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-1">Promedio</p>
                  {summary.familyInterview.avgScore !== null ? (
                    <p className={`text-2xl font-bold ${getScoreColor(summary.familyInterview.avgScore)}`}>
                      {summary.familyInterview.avgScore.toFixed(1)}
                    </p>
                  ) : (
                    <div className="group relative inline-block">
                      <p className="text-2xl font-bold text-gray-400 cursor-help">—</p>
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block">
                        <div className="bg-gray-800 text-white text-xs rounded py-1 px-2 whitespace-nowrap">
                          Sin entrevistas completadas
                        </div>
                      </div>
                    </div>
                  )}
                  <p className="text-xs text-gray-500 mt-1">sobre 100</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-1">Cantidad</p>
                  <p className="text-2xl font-bold text-indigo-600">{summary.familyInterview.count}</p>
                  <p className="text-xs text-gray-500 mt-1">entrevistas</p>
                </div>
              </div>
            </div>

            {/* Cycle Director Decision Section */}
            <div className="bg-white rounded-lg p-4 border-2 border-gray-300">
              <div className="flex items-center space-x-2 mb-4">
                <FiAward className="w-5 h-5 text-indigo-600" />
                <h4 className="text-md font-semibold text-gray-800">Decisión del Director de Ciclo</h4>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Estado:</span>
                  {getDecisionBadge(summary.cycleDirectorDecision.decision)}
                </div>

                {summary.cycleDirectorDecision.decisionDate && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Fecha de Decisión:</span>
                    <span className="text-sm font-medium text-gray-900">
                      {formatDate(summary.cycleDirectorDecision.decisionDate)}
                    </span>
                  </div>
                )}

                {summary.cycleDirectorDecision.highlights && (
                  <div className="mt-4">
                    <p className="text-sm font-semibold text-gray-700 mb-2">Aspectos Destacados:</p>
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                      <p className="text-sm text-gray-800 whitespace-pre-wrap">
                        {summary.cycleDirectorDecision.highlights}
                      </p>
                    </div>
                  </div>
                )}

                {summary.cycleDirectorDecision.rawComment && (
                  <div className="mt-4">
                    <p className="text-sm font-semibold text-gray-700 mb-2">Comentario Completo:</p>
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 max-h-40 overflow-y-auto">
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">
                        {summary.cycleDirectorDecision.rawComment}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex justify-end pt-6 border-t border-gray-200 mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
          >
            Cerrar
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ApplicantSummaryModal;
