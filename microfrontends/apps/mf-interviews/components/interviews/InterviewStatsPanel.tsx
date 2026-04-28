import React from 'react';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import LoadingSpinner from '../ui/LoadingSpinner';
import { 
  CalendarIcon,
  ClockIcon,
  UserIcon,
  CheckCircleIcon,
  XCircleIcon,
  BarChartIcon
} from '../icons/Icons';
import { 
  FiCalendar, 
  FiClock, 
  FiUser, 
  FiCheck, 
  FiX, 
  FiBarChart2, 
  FiTrendingUp, 
  FiTrendingDown,
  FiMapPin,
  FiVideo,
  FiStar,
  FiTarget,
  FiActivity
} from 'react-icons/fi';
import {
  InterviewStats,
  InterviewStatsProps,
  InterviewStatus,
  InterviewType,
  InterviewMode,
  INTERVIEW_STATUS_LABELS,
  INTERVIEW_TYPE_LABELS,
  INTERVIEW_MODE_LABELS,
  INTERVIEW_CONFIG
} from '../../types/interview';

const InterviewStatsPanel: React.FC<InterviewStatsProps> = ({
  stats,
  isLoading = false,
  className = ''
}) => {
  
  if (isLoading) {
    return (
      <div className={`flex justify-center items-center py-12 ${className}`}>
        <div className="flex items-center space-x-3">
          <LoadingSpinner size="lg" />
          <span className="text-lg text-gray-600">Cargando estadísticas...</span>
        </div>
      </div>
    );
  }

  // Calcular métricas derivadas
  const completionRate = stats.totalInterviews > 0 
    ? Math.round((stats.completedInterviews / stats.totalInterviews) * 100) 
    : 0;
  
  const cancellationRate = stats.totalInterviews > 0 
    ? Math.round(((stats.cancelledInterviews + stats.noShowInterviews) / stats.totalInterviews) * 100) 
    : 0;

  const getStatusPercentage = (count: number): number => {
    return stats.totalInterviews > 0 ? Math.round((count / stats.totalInterviews) * 100) : 0;
  };

  const renderProgressBar = (value: number, maxValue: number, color: string) => {
    const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;
    return (
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className={`h-2 rounded-full transition-all duration-300 ${color}`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        ></div>
      </div>
    );
  };

  const renderMetricCard = (
    title: string,
    value: number | string,
    icon: React.ReactNode,
    color: string,
    subtitle?: string,
    trend?: 'up' | 'down' | 'neutral'
  ) => {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
            <p className={`text-3xl font-bold ${color}`}>{value}</p>
            {subtitle && (
              <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
            )}
          </div>
          <div className={`p-3 rounded-full ${color.replace('text-', 'bg-').replace('-600', '-100')}`}>
            {icon}
          </div>
        </div>
        {trend && (
          <div className={`flex items-center mt-3 text-sm ${
            trend === 'up' ? 'text-green-600' : 
            trend === 'down' ? 'text-red-600' : 'text-gray-600'
          }`}>
            {trend === 'up' ? <FiTrendingUp className="w-4 h-4 mr-1" /> :
             trend === 'down' ? <FiTrendingDown className="w-4 h-4 mr-1" /> :
             <FiActivity className="w-4 h-4 mr-1" />}
            <span>
              {trend === 'up' ? 'Tendencia positiva' :
               trend === 'down' ? 'Requiere atención' :
               'Estable'}
            </span>
          </div>
        )}
      </Card>
    );
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Métricas principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {renderMetricCard(
          'Total Entrevistas',
          stats.totalInterviews,
          <FiCalendar className="w-6 h-6" />,
          'text-blue-600',
          'Todas las entrevistas',
          'neutral'
        )}

        {renderMetricCard(
          'Completadas',
          stats.completedInterviews,
          <FiCheck className="w-6 h-6" />,
          'text-green-600',
          `${completionRate}% del total`,
          completionRate > 75 ? 'up' : completionRate < 50 ? 'down' : 'neutral'
        )}

        {renderMetricCard(
          'Pendientes',
          stats.pendingInterviews,
          <FiClock className="w-6 h-6" />,
          'text-orange-600',
          'Próximas entrevistas',
          stats.pendingInterviews > 10 ? 'down' : 'neutral'
        )}

        {renderMetricCard(
          'Puntuación Promedio',
          stats.averageScore.toFixed(1),
          <FiStar className="w-6 h-6" />,
          'text-purple-600',
          'Escala 1-10',
          stats.averageScore > 7 ? 'up' : stats.averageScore < 6 ? 'down' : 'neutral'
        )}
      </div>

      {/* Métricas secundarias */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {renderMetricCard(
          'Programadas',
          stats.scheduledInterviews,
          <FiCalendar className="w-6 h-6" />,
          'text-blue-600',
          `${getStatusPercentage(stats.scheduledInterviews)}% del total`
        )}

        {renderMetricCard(
          'Canceladas',
          stats.cancelledInterviews,
          <FiX className="w-6 h-6" />,
          'text-red-600',
          `${cancellationRate}% tasa cancelación`
        )}

        {renderMetricCard(
          'Resultados Positivos',
          stats.positiveResults,
          <FiTarget className="w-6 h-6" />,
          'text-green-600',
          `${stats.completedInterviews > 0 ? Math.round((stats.positiveResults / stats.completedInterviews) * 100) : 0}% de éxito`
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Distribución por estado */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <FiBarChart2 className="w-5 h-5 mr-2 text-azul-monte-tabor" />
            Distribución por Estado
          </h3>
          <div className="space-y-4">
            {Object.entries(stats.statusDistribution).map(([status, count]) => {
              const percentage = getStatusPercentage(count);
              const statusColor = INTERVIEW_CONFIG.COLORS[status as InterviewStatus] || '#6B7280';
              
              return (
                <div key={status} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div
                        className="w-3 h-3 rounded"
                        style={{ backgroundColor: statusColor }}
                      ></div>
                      <span className="text-sm font-medium text-gray-700">
                        {INTERVIEW_STATUS_LABELS[status as InterviewStatus]}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-600">{count}</span>
                      <span className="text-xs text-gray-500 w-10 text-right">
                        {percentage}%
                      </span>
                    </div>
                  </div>
                  {renderProgressBar(count, stats.totalInterviews, 'bg-gray-400')}
                </div>
              );
            })}
          </div>
        </Card>

        {/* Distribución por tipo */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <FiUser className="w-5 h-5 mr-2 text-azul-monte-tabor" />
            Distribución por Tipo
          </h3>
          <div className="space-y-4">
            {Object.entries(stats.typeDistribution).map(([type, count]) => {
              const percentage = getStatusPercentage(count);
              const colors = {
                'INDIVIDUAL': 'bg-blue-500',
                'FAMILY': 'bg-green-500',
                'PSYCHOLOGICAL': 'bg-purple-500',
                'ACADEMIC': 'bg-yellow-500',
                'BEHAVIORAL': 'bg-pink-500'
              };
              
              return (
                <div key={type} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className={`w-3 h-3 rounded ${colors[type as keyof typeof colors] || 'bg-gray-400'}`}></div>
                      <span className="text-sm font-medium text-gray-700">
                        {INTERVIEW_TYPE_LABELS[type as InterviewType]}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-600">{count}</span>
                      <span className="text-xs text-gray-500 w-10 text-right">
                        {percentage}%
                      </span>
                    </div>
                  </div>
                  {renderProgressBar(count, stats.totalInterviews, colors[type as keyof typeof colors] || 'bg-gray-400')}
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Distribución por modalidad */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <FiMapPin className="w-5 h-5 mr-2 text-azul-monte-tabor" />
            Distribución por Modalidad
          </h3>
          <div className="space-y-4">
            {Object.entries(stats.modeDistribution).map(([mode, count]) => {
              const percentage = getStatusPercentage(count);
              const modeIcons = {
                'IN_PERSON': <FiMapPin className="w-3 h-3" />,
                'VIRTUAL': <FiVideo className="w-3 h-3" />,
                'HYBRID': <FiUser className="w-3 h-3" />
              };
              
              return (
                <div key={mode} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="text-azul-monte-tabor">
                        {modeIcons[mode as keyof typeof modeIcons]}
                      </div>
                      <span className="text-sm font-medium text-gray-700">
                        {INTERVIEW_MODE_LABELS[mode as InterviewMode]}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-600">{count}</span>
                      <span className="text-xs text-gray-500 w-10 text-right">
                        {percentage}%
                      </span>
                    </div>
                  </div>
                  {renderProgressBar(count, stats.totalInterviews, 'bg-azul-monte-tabor')}
                </div>
              );
            })}
          </div>
        </Card>

        {/* Tendencias mensuales */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <FiTrendingUp className="w-5 h-5 mr-2 text-azul-monte-tabor" />
            Tendencias Mensuales
          </h3>
          <div className="space-y-4">
            {Object.entries(stats.monthlyTrends)
              .sort()
              .slice(-6) // Últimos 6 meses
              .map(([month, count]) => {
                const maxCount = Math.max(...Object.values(stats.monthlyTrends));
                const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0;
                
                return (
                  <div key={month} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">
                        {new Date(month + '-01').toLocaleDateString('es-CL', { 
                          year: 'numeric', 
                          month: 'long' 
                        })}
                      </span>
                      <span className="text-sm text-gray-600">{count}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="h-2 rounded-full bg-azul-monte-tabor transition-all duration-300"
                        style={{ width: `${Math.max(percentage, 5)}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
          </div>
        </Card>
      </div>

      {/* Métricas de rendimiento */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
          <FiTarget className="w-5 h-5 mr-2 text-azul-monte-tabor" />
          Métricas de Rendimiento
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Tasa de finalización */}
          <div className="text-center">
            <div className="relative inline-flex items-center justify-center w-24 h-24 mb-4">
              <svg className="transform -rotate-90 w-24 h-24">
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  transform="translate(36 36)"
                  stroke="currentColor"
                  strokeWidth="2"
                  fill="transparent"
                  className="text-gray-200"
                />
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  transform="translate(36 36)"
                  stroke="currentColor"
                  strokeWidth="2"
                  fill="transparent"
                  strokeDasharray={`${2 * Math.PI * 10}`}
                  strokeDashoffset={`${2 * Math.PI * 10 * (1 - completionRate / 100)}`}
                  className="text-green-500"
                />
              </svg>
              <span className="absolute text-xl font-bold text-green-600">
                {completionRate}%
              </span>
            </div>
            <p className="text-sm font-medium text-gray-700">Tasa de Finalización</p>
            <p className="text-xs text-gray-500">Entrevistas completadas</p>
          </div>

          {/* Tasa de cancelación */}
          <div className="text-center">
            <div className="relative inline-flex items-center justify-center w-24 h-24 mb-4">
              <svg className="transform -rotate-90 w-24 h-24">
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  transform="translate(36 36)"
                  stroke="currentColor"
                  strokeWidth="2"
                  fill="transparent"
                  className="text-gray-200"
                />
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  transform="translate(36 36)"
                  stroke="currentColor"
                  strokeWidth="2"
                  fill="transparent"
                  strokeDasharray={`${2 * Math.PI * 10}`}
                  strokeDashoffset={`${2 * Math.PI * 10 * (1 - cancellationRate / 100)}`}
                  className="text-red-500"
                />
              </svg>
              <span className="absolute text-xl font-bold text-red-600">
                {cancellationRate}%
              </span>
            </div>
            <p className="text-sm font-medium text-gray-700">Tasa de Cancelación</p>
            <p className="text-xs text-gray-500">Canceladas + No asistió</p>
          </div>

          {/* Satisfacción general */}
          <div className="text-center">
            <div className="relative inline-flex items-center justify-center w-24 h-24 mb-4">
              <svg className="transform -rotate-90 w-24 h-24">
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  transform="translate(36 36)"
                  stroke="currentColor"
                  strokeWidth="2"
                  fill="transparent"
                  className="text-gray-200"
                />
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  transform="translate(36 36)"
                  stroke="currentColor"
                  strokeWidth="2"
                  fill="transparent"
                  strokeDasharray={`${2 * Math.PI * 10}`}
                  strokeDashoffset={`${2 * Math.PI * 10 * (1 - (stats.averageScore * 10) / 100)}`}
                  className="text-purple-500"
                />
              </svg>
              <span className="absolute text-xl font-bold text-purple-600">
                {(stats.averageScore * 10).toFixed(0)}%
              </span>
            </div>
            <p className="text-sm font-medium text-gray-700">Satisfacción General</p>
            <p className="text-xs text-gray-500">Basado en puntuaciones</p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default InterviewStatsPanel;