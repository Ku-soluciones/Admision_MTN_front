/**
 * Applicant Metrics Modal Component
 * Displays detailed metrics for all applicants in a tabular format
 */

import React, { useState, useEffect } from 'react';
import { FiX, FiRefreshCw } from 'react-icons/fi';
import { dashboardClient } from '../../src/api/dashboard.client';
import type { ApplicantMetric, ApplicantMetricsFilters } from '../../src/api/dashboard.types';

interface ApplicantMetricsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ApplicantMetricsModal: React.FC<ApplicantMetricsModalProps> = ({
  isOpen,
  onClose
}) => {
  const [applicants, setApplicants] = useState<ApplicantMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ApplicantMetricsFilters>({
    academicYear: new Date().getFullYear() + 1,
    sortBy: 'studentName',
    sortOrder: 'ASC'
  });

  useEffect(() => {
    if (isOpen) {
      loadApplicantMetrics();
    }
  }, [isOpen, filters]);

  const loadApplicantMetrics = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await dashboardClient.getApplicantMetrics(filters);
      setApplicants(response.data || []);
    } catch (err: any) {
      console.error('Error loading applicant metrics:', err);
      setError(err.message || 'Error al cargar métricas de postulantes');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    loadApplicantMetrics();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-start justify-center p-4 pt-8">
        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-7xl max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-blue-700">
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-white">
                Métricas de Postulantes
              </h2>
              <p className="text-sm text-blue-100 mt-1">
                Vista detallada de todos los postulantes y sus métricas
              </p>
            </div>

            <div className="flex items-center space-x-3">
              {/* Refresh Button */}
              <button
                onClick={handleRefresh}
                disabled={loading}
                className="inline-flex items-center px-3 py-2 border border-white/30 rounded-md shadow-sm text-sm font-medium text-white bg-white/10 hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Actualizar datos"
              >
                <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>

              {/* Close Button */}
              <button
                onClick={onClose}
                className="text-white/80 hover:text-white transition-colors p-2"
              >
                <FiX className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* Loading State */}
            {loading && (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Cargando métricas de postulantes...</p>
                </div>
              </div>
            )}

            {/* Error State */}
            {!loading && error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center">
                  <svg className="h-5 w-5 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <p className="text-red-800">{error}</p>
                </div>
                <button
                  onClick={handleRefresh}
                  className="mt-3 text-sm text-red-700 hover:text-red-900 underline"
                >
                  Reintentar
                </button>
              </div>
            )}

            {/* Applicants Table */}
            {!loading && !error && (
              <div className="bg-white border border-gray-200 shadow-sm rounded-lg overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">Métricas Detalladas</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {applicants.length} postulantes encontrados para el año {filters.academicYear}
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Postulante
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Nivel
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Estado
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Evaluaciones
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Entrevistas
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Documentos
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {applicants.map((applicant) => (
                        <tr key={applicant.applicationId} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{applicant.studentName}</div>
                            <div className="text-sm text-gray-500">{applicant.guardianEmail}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{applicant.gradeApplied}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              applicant.applicationStatus === 'APPROVED' ? 'bg-green-100 text-green-800' :
                              applicant.applicationStatus === 'REJECTED' ? 'bg-red-100 text-red-800' :
                              applicant.applicationStatus === 'SUBMITTED' ? 'bg-blue-100 text-blue-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {applicant.applicationStatus}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {applicant.evaluationsCompleted}/{applicant.evaluationsTotal}
                            </div>
                            <div className="text-sm text-gray-500">
                              {applicant.evaluationPassRate} aprobación
                              {applicant.evaluationAvgScore && ` | Promedio: ${applicant.evaluationAvgScore}`}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {applicant.familyInterviewsCompleted} completadas
                            </div>
                            {applicant.interviewAvgScore && (
                              <div className="text-sm text-gray-500">
                                Promedio: {applicant.interviewAvgScore}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {applicant.documentsApproved}/{applicant.documentsTotal}
                            </div>
                            <div className="text-sm text-gray-500">
                              {applicant.documentCompletionRate} completado
                            </div>
                          </td>
                        </tr>
                      ))}
                      {applicants.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-6 py-12 text-center text-sm text-gray-500">
                            No se encontraron postulantes para los filtros seleccionados
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApplicantMetricsModal;
