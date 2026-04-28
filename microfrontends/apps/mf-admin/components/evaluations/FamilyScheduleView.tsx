import React, { useState, useEffect } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import LoadingSpinner from '../ui/LoadingSpinner';
import EvaluationScheduleCard from './EvaluationScheduleCard';
import {
  EvaluationSchedule,
  ScheduleUtils,
  ScheduleStatus,
  SCHEDULE_STATUS_LABELS
} from '../../types/evaluation';
import { evaluationService } from '../../services/evaluationService';
import { 
  CalendarIcon, 
  ClockIcon, 
  CheckCircleIcon, 
  ExclamationTriangleIcon,
  InformationCircleIcon
} from '../icons/Icons';

interface FamilyScheduleViewProps {
  applicationId: number;
  showConfirmActions?: boolean;
  onScheduleUpdate?: (schedules: EvaluationSchedule[]) => void;
}

const FamilyScheduleView: React.FC<FamilyScheduleViewProps> = ({
  applicationId,
  showConfirmActions = true,
  onScheduleUpdate
}) => {
  const [schedules, setSchedules] = useState<EvaluationSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmingSchedule, setConfirmingSchedule] = useState<number | null>(null);

  useEffect(() => {
    loadSchedules();
  }, [applicationId]);

  useEffect(() => {
    onScheduleUpdate?.(schedules);
  }, [schedules, onScheduleUpdate]);

  const loadSchedules = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Intentar primero con el endpoint real, luego fallback a mock
      let familySchedules: EvaluationSchedule[] = [];
      
      try {
        familySchedules = await evaluationService.getFamilySchedules(applicationId);
      } catch (apiError) {
        console.warn('API no disponible, usando datos mock:', apiError);
        // Usar datos mock locales
        familySchedules = evaluationService.createLocalMockSchedules(applicationId);
      }
      
      // Ordenar por fecha
      familySchedules.sort((a, b) => 
        new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime()
      );
      
      setSchedules(familySchedules);
    } catch (err: any) {
      setError(err.message || 'Error al cargar las citas programadas');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmSchedule = async (schedule: EvaluationSchedule) => {
    if (!showConfirmActions) return;

    try {
      setConfirmingSchedule(schedule.id);
      
      // Mock user ID - en producción vendría del contexto de autenticación
      const mockUserId = 1;
      
      const confirmedSchedule = await evaluationService.confirmSchedule(schedule.id, mockUserId);
      
      // Actualizar el estado local
      setSchedules(prev => prev.map(s => 
        s.id === schedule.id ? { ...s, ...confirmedSchedule } : s
      ));
      
    } catch (err: any) {
      setError(err.message || 'Error al confirmar la cita');
    } finally {
      setConfirmingSchedule(null);
    }
  };

  const getSchedulesByStatus = () => {
    const upcoming = schedules.filter(s => 
      new Date(s.scheduledDate) > new Date() && 
      [ScheduleStatus.SCHEDULED, ScheduleStatus.CONFIRMED].includes(s.status)
    );
    
    const completed = schedules.filter(s => s.status === ScheduleStatus.COMPLETED);
    const needingConfirmation = schedules.filter(s => ScheduleUtils.requiresConfirmation(s));
    const overdue = schedules.filter(s => ScheduleUtils.isConfirmationOverdue(s));
    
    return { upcoming, completed, needingConfirmation, overdue };
  };

  const renderScheduleStats = () => {
    const { upcoming, completed, needingConfirmation, overdue } = getSchedulesByStatus();
    
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="text-2xl font-bold text-blue-600">{upcoming.length}</div>
          <div className="text-sm text-blue-700">Próximas citas</div>
        </div>
        <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
          <div className="text-2xl font-bold text-green-600">{completed.length}</div>
          <div className="text-sm text-green-700">Completadas</div>
        </div>
        <div className="text-center p-4 bg-orange-50 rounded-lg border border-orange-200">
          <div className="text-2xl font-bold text-orange-600">{needingConfirmation.length}</div>
          <div className="text-sm text-orange-700">Por confirmar</div>
        </div>
        <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
          <div className="text-2xl font-bold text-red-600">{overdue.length}</div>
          <div className="text-sm text-red-700">Vencidas</div>
        </div>
      </div>
    );
  };

  const renderScheduleSection = (
    title: string,
    scheduleList: EvaluationSchedule[],
    emptyMessage: string,
    variant: 'default' | 'compact' | 'detailed' = 'default'
  ) => {
    if (scheduleList.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          <CalendarIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>{emptyMessage}</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {scheduleList.map(schedule => (
          <EvaluationScheduleCard
            key={schedule.id}
            schedule={schedule}
            variant={variant}
            showActions={showConfirmActions}
            onConfirm={showConfirmActions ? handleConfirmSchedule : undefined}
            disabled={confirmingSchedule === schedule.id}
          />
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <Card className="p-8 text-center">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-gray-600">Cargando citas programadas...</p>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6 bg-red-50 border-red-200">
        <div className="flex items-center gap-3">
          <ExclamationTriangleIcon className="w-6 h-6 text-red-500" />
          <div>
            <h3 className="font-medium text-red-800">Error al cargar las citas</h3>
            <p className="text-red-600">{error}</p>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={loadSchedules}
              className="mt-2"
            >
              Reintentar
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  const { upcoming, completed, needingConfirmation, overdue } = getSchedulesByStatus();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-azul-monte-tabor">
          Cronograma de Evaluaciones
        </h2>
        <Button variant="outline" onClick={loadSchedules}>
          🔄 Actualizar
        </Button>
      </div>

      {/* Estadísticas */}
      {schedules.length > 0 && renderScheduleStats()}

      {/* Alertas importantes */}
      {overdue.length > 0 && (
        <Card className="p-4 bg-red-50 border-red-200">
          <div className="flex items-center gap-3">
            <ExclamationTriangleIcon className="w-6 h-6 text-red-500" />
            <div>
              <h3 className="font-medium text-red-800">
                Atención: {overdue.length} cita(s) con confirmación vencida
              </h3>
              <p className="text-red-600">
                Por favor contacte al colegio para reprogramar estas citas.
              </p>
            </div>
          </div>
        </Card>
      )}

      {needingConfirmation.length > 0 && overdue.length === 0 && (
        <Card className="p-4 bg-orange-50 border-orange-200">
          <div className="flex items-center gap-3">
            <ClockIcon className="w-6 h-6 text-orange-500" />
            <div>
              <h3 className="font-medium text-orange-800">
                {needingConfirmation.length} cita(s) requieren confirmación
              </h3>
              <p className="text-orange-600">
                Confirme su asistencia lo antes posible para asegurar su lugar.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Instrucciones generales */}
      <Card className="p-4 bg-blue-50 border-blue-200">
        <div className="flex items-start gap-3">
          <InformationCircleIcon className="w-6 h-6 text-blue-600 mt-0.5" />
          <div className="text-sm text-blue-800">
            <h4 className="font-medium mb-2">Instrucciones importantes:</h4>
            <ul className="list-disc list-inside space-y-1 text-blue-700">
              <li>Llegue 15 minutos antes de su cita programada</li>
              <li>Traiga toda la documentación requerida</li>
              <li>Confirme su asistencia usando los botones correspondientes</li>
              <li>En caso de no poder asistir, contacte al colegio con al menos 24 horas de anticipación</li>
            </ul>
          </div>
        </div>
      </Card>

      {/* Citas que requieren confirmación */}
      {needingConfirmation.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-orange-800 mb-4 flex items-center gap-2">
            <ExclamationTriangleIcon className="w-5 h-5" />
            Citas Pendientes de Confirmación
          </h3>
          {renderScheduleSection(
            'Pendientes de Confirmación',
            needingConfirmation,
            'No hay citas pendientes de confirmación'
          )}
        </div>
      )}

      {/* Próximas citas */}
      {upcoming.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-azul-monte-tabor mb-4 flex items-center gap-2">
            <CalendarIcon className="w-5 h-5" />
            Próximas Citas
          </h3>
          {renderScheduleSection(
            'Próximas Citas',
            upcoming,
            'No hay citas próximas programadas'
          )}
        </div>
      )}

      {/* Citas completadas */}
      {completed.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-green-800 mb-4 flex items-center gap-2">
            <CheckCircleIcon className="w-5 h-5" />
            Evaluaciones Completadas
          </h3>
          {renderScheduleSection(
            'Completadas',
            completed,
            'No hay evaluaciones completadas',
            'compact'
          )}
        </div>
      )}

      {/* Estado vacío */}
      {schedules.length === 0 && (
        <Card className="p-8 text-center">
          <CalendarIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No hay citas programadas
          </h3>
          <p className="text-gray-600 mb-4">
            Las citas de evaluación se programarán una vez que su postulación esté completa.
          </p>
          <Button variant="outline" onClick={loadSchedules}>
            Verificar nuevamente
          </Button>
        </Card>
      )}
    </div>
  );
};

export default FamilyScheduleView;