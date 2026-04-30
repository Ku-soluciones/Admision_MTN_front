/**
 * Coordinator Dashboard Modal Component
 * Modal version of the Coordinator Dashboard for displaying analytics and KPIs
 */

import React, { useState, useEffect } from 'react';
import { FiX, FiRefreshCw } from 'react-icons/fi';
import { dashboardClient } from '../../src/api/dashboard.client';
import type { DetailedAdminStats, Alert } from '../../src/api/dashboard.types';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface CoordinatorDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CoordinatorDashboardModal: React.FC<CoordinatorDashboardModalProps> = ({
  isOpen,
  onClose
}) => {
  const [stats, setStats] = useState<DetailedAdminStats | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadDashboardData();
    }
  }, [isOpen, selectedYear]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [dashboardData, alertsData] = await Promise.all([
        dashboardClient.getDetailedAdminStats({ academicYear: selectedYear }),
        dashboardClient.getInsights()
      ]);

      // Agregar valores por defecto si faltan datos
      const currentYear = new Date().getFullYear();
      const normalizedData: DetailedAdminStats = {
        totalApplications: dashboardData.totalApplications || 0,
        statusBreakdown: {
          submitted: dashboardData.statusBreakdown?.submitted || 0,
          underReview: dashboardData.statusBreakdown?.underReview || 0,
          approved: dashboardData.statusBreakdown?.approved || 0,
          rejected: dashboardData.statusBreakdown?.rejected || 0,
          waitlist: dashboardData.statusBreakdown?.waitlist || 0
        },
        gradeDistribution: dashboardData.gradeDistribution || [],
        interviewMetrics: dashboardData.interviewMetrics || {
          scheduled: 0,
          completed: 0,
          pending: 0,
          completionRate: 0
        },
        evaluationMetrics: dashboardData.evaluationMetrics || {
          total: 0,
          completed: 0,
          pending: 0,
          averageScore: 0
        },
        monthlyTrends: dashboardData.monthlyTrends || [],
        availableYears: dashboardData.availableYears?.length > 0
          ? dashboardData.availableYears
          : [currentYear]
      };

      setStats(normalizedData);
      setAlerts(alertsData);
    } catch (err: any) {
      console.error('Error loading dashboard:', err);
      setError(err.message || 'Error al cargar el dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleYearChange = (year: number) => {
    setSelectedYear(year);
  };

  const handleRefresh = () => {
    loadDashboardData();
  };

  if (!isOpen) return null;

  const statusColors: Record<string, string> = {
    submitted: '#3B82F6',
    underReview: '#F59E0B',
    approved: '#10B981',
    rejected: '#EF4444',
    waitlist: '#8B5CF6'
  };

  const statusData = stats ? [
    { name: 'Enviadas', value: stats.statusBreakdown.submitted, color: statusColors.submitted },
    { name: 'En Revisión', value: stats.statusBreakdown.underReview, color: statusColors.underReview },
    { name: 'Aprobadas', value: stats.statusBreakdown.approved, color: statusColors.approved },
    { name: 'Rechazadas', value: stats.statusBreakdown.rejected, color: statusColors.rejected },
    { name: 'Lista Espera', value: stats.statusBreakdown.waitlist, color: statusColors.waitlist }
  ] : [];

  const gradeData = stats ? (stats.gradeDistribution || []).map(g => ({
    grade: g.grade,
    count: g.count,
    percentage: g.percentage
  })) : [];

  const acceptanceRate = stats && stats.totalApplications > 0
    ? ((stats.statusBreakdown.approved / stats.totalApplications) * 100).toFixed(1)
    : '0.0';

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
                Dashboard de Coordinador
              </h2>
              <p className="text-sm text-blue-100 mt-1">
                Sistema de Admisión - Analytics y Búsqueda Avanzada
              </p>
            </div>

            <div className="flex items-center space-x-3">
              {/* Year Selector */}
              {stats && (
                <div className="flex items-center">
                  <label htmlFor="year" className="mr-2 text-sm font-medium text-white">
                    Año:
                  </label>
                  <select
                    id="year"
                    value={selectedYear}
                    onChange={(e) => handleYearChange(parseInt(e.target.value))}
                    className="block rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                  >
                    {stats.availableYears.map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
              )}

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
                  <p className="text-gray-600">Cargando dashboard...</p>
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

            {/* Dashboard Content */}
            {!loading && !error && stats && (
              <>
                {/* Alerts */}
                {alerts.length > 0 && (
                  <div className="mb-6 space-y-3">
                    {alerts.map((alert) => (
                      <div
                        key={alert.id}
                        className={`rounded-lg p-4 ${
                          alert.severity === 'error' ? 'bg-red-50 border border-red-200' :
                          alert.severity === 'warning' ? 'bg-yellow-50 border border-yellow-200' :
                          'bg-blue-50 border border-blue-200'
                        }`}
                      >
                        <div className="flex items-start">
                          <div className="flex-shrink-0">
                            {alert.severity === 'error' && (
                              <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                              </svg>
                            )}
                            {alert.severity === 'warning' && (
                              <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                              </svg>
                            )}
                            {alert.severity === 'info' && (
                              <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                          <div className="ml-3 flex-1">
                            <h3 className={`text-sm font-medium ${
                              alert.severity === 'error' ? 'text-red-800' :
                              alert.severity === 'warning' ? 'text-yellow-800' :
                              'text-blue-800'
                            }`}>
                              {alert.title}
                            </h3>
                            <div className={`mt-2 text-sm ${
                              alert.severity === 'error' ? 'text-red-700' :
                              alert.severity === 'warning' ? 'text-yellow-700' :
                              'text-blue-700'
                            }`}>
                              <p>{alert.message}</p>
                              {alert.action && (
                                <p className="mt-1 font-medium">{alert.action}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* KPI Cards */}
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-6">
                  <div className="bg-white border border-gray-200 overflow-hidden shadow-sm rounded-lg">
                    <div className="p-5">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <div className="ml-5 w-0 flex-1">
                          <dl>
                            <dt className="text-sm font-medium text-gray-500 truncate">Total Postulaciones</dt>
                            <dd className="text-lg font-semibold text-gray-900">{stats.totalApplications}</dd>
                          </dl>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white border border-gray-200 overflow-hidden shadow-sm rounded-lg">
                    <div className="p-5">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <svg className="h-6 w-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div className="ml-5 w-0 flex-1">
                          <dl>
                            <dt className="text-sm font-medium text-gray-500 truncate">Tasa de Aceptación</dt>
                            <dd className="text-lg font-semibold text-green-600">{acceptanceRate}%</dd>
                          </dl>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white border border-gray-200 overflow-hidden shadow-sm rounded-lg">
                    <div className="p-5">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <svg className="h-6 w-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <div className="ml-5 w-0 flex-1">
                          <dl>
                            <dt className="text-sm font-medium text-gray-500 truncate">Entrevistas Completadas</dt>
                            <dd className="text-lg font-semibold text-blue-600">
                              {stats.interviewMetrics.completed} / {stats.interviewMetrics.scheduled}
                            </dd>
                          </dl>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white border border-gray-200 overflow-hidden shadow-sm rounded-lg">
                    <div className="p-5">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <svg className="h-6 w-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                          </svg>
                        </div>
                        <div className="ml-5 w-0 flex-1">
                          <dl>
                            <dt className="text-sm font-medium text-gray-500 truncate">Evaluaciones Pendientes</dt>
                            <dd className="text-lg font-semibold text-purple-600">{stats.evaluationMetrics.pending}</dd>
                          </dl>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Charts Row */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                  {/* Status Distribution Pie Chart */}
                  <div className="bg-white border border-gray-200 shadow-sm rounded-lg p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Distribución por Estado</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={statusData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {statusData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                      {statusData.map((item, index) => (
                        <div key={index} className="flex items-center">
                          <div
                            className="w-3 h-3 rounded-full mr-2"
                            style={{ backgroundColor: item.color }}
                          ></div>
                          <span>{item.name}: {item.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Grade Distribution Bar Chart */}
                  <div className="bg-white border border-gray-200 shadow-sm rounded-lg p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Distribución por Nivel</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={gradeData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="grade" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="count" fill="#3B82F6" name="Postulaciones" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Progress Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white border border-gray-200 shadow-sm rounded-lg p-6">
                    <h4 className="text-sm font-medium text-gray-500 mb-4">Progreso de Entrevistas</h4>
                    <div className="mb-2">
                      <div className="flex justify-between text-sm mb-1">
                        <span>Completadas</span>
                        <span>{stats.interviewMetrics.completionRate.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${stats.interviewMetrics.completionRate}%` }}
                        ></div>
                      </div>
                    </div>
                    <div className="mt-4 text-sm text-gray-600">
                      <p>{stats.interviewMetrics.completed} de {stats.interviewMetrics.scheduled} entrevistas completadas</p>
                    </div>
                  </div>

                  <div className="bg-white border border-gray-200 shadow-sm rounded-lg p-6">
                    <h4 className="text-sm font-medium text-gray-500 mb-4">Progreso de Evaluaciones</h4>
                    <div className="mb-2">
                      <div className="flex justify-between text-sm mb-1">
                        <span>Completadas</span>
                        <span>
                          {stats.evaluationMetrics.total > 0
                            ? ((stats.evaluationMetrics.completed / stats.evaluationMetrics.total) * 100).toFixed(1)
                            : '0.0'}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-purple-600 h-2 rounded-full"
                          style={{
                            width: stats.evaluationMetrics.total > 0
                              ? `${(stats.evaluationMetrics.completed / stats.evaluationMetrics.total) * 100}%`
                              : '0%'
                          }}
                        ></div>
                      </div>
                    </div>
                    <div className="mt-4 text-sm text-gray-600">
                      <p>{stats.evaluationMetrics.completed} de {stats.evaluationMetrics.total} evaluaciones completadas</p>
                      {stats.evaluationMetrics.averageScore > 0 && (
                        <p className="mt-1">Promedio: {stats.evaluationMetrics.averageScore.toFixed(1)}</p>
                      )}
                    </div>
                  </div>

                  <div className="bg-white border border-gray-200 shadow-sm rounded-lg p-6">
                    <h4 className="text-sm font-medium text-gray-500 mb-4">Resumen General</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">En Revisión:</span>
                        <span className="font-medium">{stats.statusBreakdown.underReview}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Aprobadas:</span>
                        <span className="font-medium text-green-600">{stats.statusBreakdown.approved}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Rechazadas:</span>
                        <span className="font-medium text-red-600">{stats.statusBreakdown.rejected}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Lista de Espera:</span>
                        <span className="font-medium text-purple-600">{stats.statusBreakdown.waitlist}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CoordinatorDashboardModal;
