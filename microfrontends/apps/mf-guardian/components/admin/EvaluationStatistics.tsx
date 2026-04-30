import React, { useState, useEffect } from 'react';
import { useNotifications } from '../../context/AppContext';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import { 
  evaluationService
} from '../../services/evaluationService';
import {
  EVALUATION_TYPE_LABELS,
  EVALUATION_STATUS_LABELS
} from '../../types/evaluation';
import { 
  ChartBarIcon,
  ClockIcon,
  CheckCircleIcon,
  UserIcon,
  TrophyIcon,
  ArrowUpIcon,
  ArrowDownIcon
} from '../icons/Icons';

interface EvaluationStatsData {
  totalEvaluations: number;
  statusBreakdown: Record<string, number>;
  typeBreakdown: Record<string, number>;
  averageScoresByType: Record<string, number>;
  evaluatorActivity: Record<string, number>;
  completionRate: number;
}

const EvaluationStatistics: React.FC = () => {
  const [stats, setStats] = useState<EvaluationStatsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedView, setSelectedView] = useState<'overview' | 'performance' | 'workload'>('overview');

  const { addNotification } = useNotifications();

  useEffect(() => {
    loadStatistics();
  }, []);

  const loadStatistics = async () => {
    try {
      setIsLoading(true);
      const data = await evaluationService.getEvaluationStatistics();
      setStats(data);
    } catch (error) {
      console.error('Error loading evaluation statistics:', error);
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Error al cargar las estadísticas de evaluación'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'IN_PROGRESS': return 'bg-blue-100 text-blue-800';
      case 'COMPLETED': return 'bg-green-100 text-green-800';
      case 'REVIEWED': return 'bg-purple-100 text-purple-800';
      case 'APPROVED': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 80) return 'text-blue-600';
    if (score >= 70) return 'text-yellow-600';
    if (score >= 60) return 'text-orange-600';
    return 'text-red-600';
  };

  const getTopPerformers = () => {
    if (!stats?.evaluatorActivity) return [];
    
    return Object.entries(stats.evaluatorActivity)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .slice(0, 5);
  };

  const getTypePerformance = () => {
    if (!stats?.averageScoresByType || !stats?.typeBreakdown) return [];
    
    return Object.entries(stats.averageScoresByType)
      .map(([type, avgScore]) => ({
        type,
        displayName: EVALUATION_TYPE_LABELS[type as keyof typeof EVALUATION_TYPE_LABELS] || type,
        avgScore: avgScore as number,
        total: stats.typeBreakdown[type] || 0
      }))
      .sort((a, b) => b.avgScore - a.avgScore);
  };

  if (isLoading) {
    return (
      <Card className="p-8 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-azul-monte-tabor mx-auto mb-4"></div>
        <p className="text-gris-piedra">Cargando estadísticas...</p>
      </Card>
    );
  }

  if (!stats) {
    return (
      <Card className="p-8 text-center">
        <ChartBarIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <p className="text-gris-piedra">No hay estadísticas disponibles</p>
        <Button variant="primary" onClick={loadStatistics} className="mt-4">
          Recargar
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-6 bg-gradient-to-r from-azul-monte-tabor to-blue-600 text-white">
        <div className="flex flex-wrap justify-between items-start gap-3">
          <div>
            <h2 className="text-2xl font-bold mb-2">
              Estadísticas de Evaluaciones
            </h2>
            <p className="text-blue-100">
              Análisis completo del sistema de evaluación
            </p>
          </div>
          <Button 
            variant="outline" 
            onClick={loadStatistics}
            className="text-white border-white hover:bg-white hover:text-azul-monte-tabor"
          >
            Actualizar
          </Button>
        </div>
      </Card>

      {/* Navigation tabs */}
      <div className="flex flex-wrap gap-2">
        {[
          { key: 'overview', label: 'Resumen General', icon: ChartBarIcon },
          { key: 'performance', label: '🏆 Rendimiento', icon: TrophyIcon },
          { key: 'workload', label: 'Carga de Trabajo', icon: UserIcon }
        ].map(tab => (
          <Button
            key={tab.key}
            variant={selectedView === tab.key ? 'primary' : 'outline'}
            onClick={() => setSelectedView(tab.key as any)}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {/* Overview Section */}
      {selectedView === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="p-6 text-center">
            <ChartBarIcon className="w-12 h-12 text-azul-monte-tabor mx-auto mb-3" />
            <p className="text-3xl font-bold text-azul-monte-tabor">{stats.totalEvaluations}</p>
            <p className="text-sm text-gris-piedra">Total Evaluaciones</p>
          </Card>

          <Card className="p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
              <span className="text-2xl"></span>
            </div>
            <p className="text-3xl font-bold text-green-600">{Math.round(stats.completionRate)}%</p>
            <p className="text-sm text-gris-piedra">Tasa de Finalización</p>
          </Card>

          <Card className="p-6 text-center">
            <ClockIcon className="w-12 h-12 text-yellow-500 mx-auto mb-3" />
            <p className="text-3xl font-bold text-yellow-600">
              {stats.statusBreakdown['PENDING'] || 0}
            </p>
            <p className="text-sm text-gris-piedra">Pendientes</p>
          </Card>

          <Card className="p-6 text-center">
            <CheckCircleIcon className="w-12 h-12 text-green-500 mx-auto mb-3" />
            <p className="text-3xl font-bold text-green-600">
              {stats.statusBreakdown['COMPLETED'] || 0}
            </p>
            <p className="text-sm text-gris-piedra">Completadas</p>
          </Card>
        </div>
      )}

      {/* Status Breakdown */}
      {selectedView === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6">
            <h3 className="text-lg font-bold text-azul-monte-tabor mb-4">
              Estado de Evaluaciones
            </h3>
            <div className="space-y-3">
              {Object.entries(stats.statusBreakdown).map(([status, count]) => (
                <div key={status} className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <Badge className={getStatusColor(status)} size="sm">
                      {EVALUATION_STATUS_LABELS[status as keyof typeof EVALUATION_STATUS_LABELS] || status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-bold text-azul-monte-tabor">{count as number}</span>
                    <span className="text-sm text-gris-piedra">
                      ({Math.round(((count as number) / stats.totalEvaluations) * 100)}%)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-bold text-azul-monte-tabor mb-4">
              Tipos de Evaluación
            </h3>
            <div className="space-y-3">
              {Object.entries(stats.typeBreakdown).map(([type, count]) => (
                <div key={type} className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gris-piedra">
                      {EVALUATION_TYPE_LABELS[type as keyof typeof EVALUATION_TYPE_LABELS] || type}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-bold text-azul-monte-tabor">{count as number}</span>
                    <span className="text-sm text-gris-piedra">
                      ({Math.round(((count as number) / stats.totalEvaluations) * 100)}%)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Performance Section */}
      {selectedView === 'performance' && (
        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-bold text-azul-monte-tabor mb-4">
              🏆 Rendimiento por Tipo de Evaluación
            </h3>
            <div className="space-y-4">
              {getTypePerformance().map(({ type, displayName, avgScore, total }) => (
                <div key={type} className="border rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-medium text-azul-monte-tabor">{displayName}</h4>
                      <p className="text-sm text-gris-piedra">{total} evaluaciones realizadas</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-2xl font-bold ${getScoreColor(avgScore)}`}>
                        {avgScore.toFixed(1)}
                      </p>
                      <p className="text-sm text-gris-piedra">Promedio</p>
                    </div>
                  </div>
                  <div className="mt-3 bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        avgScore >= 90 ? 'bg-green-500' :
                        avgScore >= 80 ? 'bg-blue-500' :
                        avgScore >= 70 ? 'bg-yellow-500' :
                        avgScore >= 60 ? 'bg-orange-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${Math.min(avgScore, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Workload Section */}
      {selectedView === 'workload' && (
        <Card className="p-6">
          <h3 className="text-lg font-bold text-azul-monte-tabor mb-4">
            Evaluadores Más Activos
          </h3>
          <div className="space-y-4">
            {getTopPerformers().map(([evaluator, count], index) => (
              <div key={evaluator} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                    index === 0 ? 'bg-yellow-500' :
                    index === 1 ? 'bg-gray-400' :
                    index === 2 ? 'bg-amber-600' : 'bg-azul-monte-tabor'
                  }`}>
                    {index + 1}
                  </div>
                  <div>
                    <h4 className="font-medium text-azul-monte-tabor">{evaluator}</h4>
                    <p className="text-sm text-gris-piedra">Evaluaciones completadas</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-azul-monte-tabor">{count as number}</p>
                  {index === 0 && (
                    <Badge variant="success" size="sm">
                      🏆 Top Evaluador
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

export default EvaluationStatistics;