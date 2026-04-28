import React, { useState, useEffect } from 'react';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import { 
  CalendarIcon, 
  ClockIcon, 
  CheckCircleIcon,
  ExclamationTriangleIcon,
  UserIcon,
  EyeIcon
} from '../icons/Icons';
import { interviewService } from '../../services/interviewService';
import { 
  InterviewStatus, 
  INTERVIEW_STATUS_LABELS,
  InterviewUtils,
  INTERVIEW_TYPE_LABELS 
} from '../../types/interview';

interface RequiredInterview {
  id: string;
  applicationId: number;
  studentName: string;
  gradeApplied: string;
  interviewType: 'FAMILY' | 'ACADEMIC' | 'PSYCHOLOGICAL' | 'CYCLE_DIRECTOR';
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  isScheduled: boolean;
  scheduledDate?: string;
  scheduledTime?: string;
  interviewerName?: string;
  status?: InterviewStatus;
  applicationStatus: string;
}

interface InterviewStatusPanelProps {
  onScheduleInterview: (interview: RequiredInterview) => void;
  onViewInterview: (interview: RequiredInterview) => void;
  className?: string;
}

const INTERVIEW_TYPE_LABELS = {
  'FAMILY': '👨‍👩‍👧‍👦 Entrevista Familiar',
  'ACADEMIC': '📚 Evaluación Académica', 
  'PSYCHOLOGICAL': '🧠 Evaluación Psicológica',
  'CYCLE_DIRECTOR': '👔 Director de Ciclo'
};

const INTERVIEW_TYPE_PRIORITY = {
  'FAMILY': 'HIGH',
  'CYCLE_DIRECTOR': 'HIGH', 
  'PSYCHOLOGICAL': 'MEDIUM',
  'ACADEMIC': 'MEDIUM'
};

const InterviewStatusPanel: React.FC<InterviewStatusPanelProps> = ({
  onScheduleInterview,
  onViewInterview,
  className = ''
}) => {
  const [requiredInterviews, setRequiredInterviews] = useState<RequiredInterview[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'SCHEDULED' | 'PENDING'>('ALL');
  const [expandedApplications, setExpandedApplications] = useState<Set<number>>(new Set());

  // Cargar entrevistas requeridas del backend
  useEffect(() => {
    const loadRequiredInterviews = async () => {
      setIsLoading(true);
      try {
        // Obtener todas las entrevistas del sistema
        const interviews = await interviewService.getAllInterviews();
        
        // Mapear a la estructura requerida por el componente
        const mappedInterviews: RequiredInterview[] = interviews.map((interview: any) => ({
          id: `${interview.applicationId}-${interview.type}`,
          applicationId: interview.applicationId,
          studentName: interview.studentName || 'Estudiante',
          gradeApplied: interview.gradeApplied || 'No especificado',
          interviewType: interview.type as 'FAMILY' | 'ACADEMIC' | 'PSYCHOLOGICAL' | 'CYCLE_DIRECTOR',
          priority: interview.priority || 'MEDIUM',
          isScheduled: interview.status !== InterviewStatus.PENDING,
          scheduledDate: interview.scheduledDate,
          scheduledTime: interview.scheduledTime,
          interviewerName: interview.interviewerName,
          status: interview.status,
          applicationStatus: interview.applicationStatus || 'PENDING'
        }));

        setRequiredInterviews(mappedInterviews);
      } catch (error) {
        console.error('Error cargando entrevistas requeridas:', error);
        // En caso de error, mantener array vacío
        setRequiredInterviews([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadRequiredInterviews();
  }, []);

  const getStatusBadgeProps = (interview: RequiredInterview) => {
    if (!interview.status || interview.status === InterviewStatus.PENDING) {
      return {
        variant: 'warning' as const,
        children: INTERVIEW_STATUS_LABELS[InterviewStatus.PENDING],
        className: 'bg-yellow-100 text-yellow-800 border-yellow-200'
      };
    }
    
    const variant = InterviewUtils.getStatusColor(interview.status);
    return {
      variant: variant,
      children: INTERVIEW_STATUS_LABELS[interview.status],
      className: '' // Usar colores por defecto del componente Badge
    };
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH': return 'border-l-red-500 bg-red-50';
      case 'MEDIUM': return 'border-l-yellow-500 bg-yellow-50';
      case 'LOW': return 'border-l-blue-500 bg-blue-50';
      default: return 'border-l-gray-500 bg-gray-50';
    }
  };

  const getFilteredInterviews = () => {
    return requiredInterviews.filter(interview => {
      if (filterStatus === 'SCHEDULED') return interview.isScheduled;
      if (filterStatus === 'PENDING') return !interview.isScheduled;
      return true;
    });
  };

  const groupedInterviews = getFilteredInterviews().reduce((acc, interview) => {
    if (!acc[interview.applicationId]) {
      acc[interview.applicationId] = [];
    }
    acc[interview.applicationId].push(interview);
    return acc;
  }, {} as Record<number, RequiredInterview[]>);

  const toggleApplicationExpansion = (applicationId: number) => {
    const newExpanded = new Set(expandedApplications);
    if (newExpanded.has(applicationId)) {
      newExpanded.delete(applicationId);
    } else {
      newExpanded.add(applicationId);
    }
    setExpandedApplications(newExpanded);
  };

  const getApplicationSummary = (interviews: RequiredInterview[]) => {
    const total = interviews.length;
    const completed = interviews.filter(i => i.status === InterviewStatus.COMPLETED).length;
    const scheduled = interviews.filter(i => i.isScheduled && i.status !== InterviewStatus.COMPLETED).length;
    const pending = interviews.filter(i => !i.isScheduled).length;
    
    return { total, completed, scheduled, pending };
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header con filtros */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            📋 Estado de Entrevistas Requeridas
          </h3>
          <p className="text-sm text-gray-600">
            Visualización completa del proceso de entrevistas por aplicación
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant={filterStatus === 'ALL' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setFilterStatus('ALL')}
          >
            Todas
          </Button>
          <Button
            variant={filterStatus === 'SCHEDULED' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setFilterStatus('SCHEDULED')}
          >
            Programadas
          </Button>
          <Button
            variant={filterStatus === 'PENDING' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setFilterStatus('PENDING')}
          >
            Pendientes
          </Button>
        </div>
      </div>

      {/* Lista de aplicaciones y sus entrevistas */}
      <div className="space-y-4">
        {Object.entries(groupedInterviews).map(([applicationId, interviews]) => {
          const appId = parseInt(applicationId);
          const isExpanded = expandedApplications.has(appId);
          const summary = getApplicationSummary(interviews);
          const firstInterview = interviews[0];

          return (
            <Card key={applicationId} className="overflow-hidden">
              {/* Header de la aplicación */}
              <div 
                className="p-4 border-b bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
                onClick={() => toggleApplicationExpansion(appId)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <UserIcon className="w-5 h-5 text-azul-monte-tabor" />
                    <div>
                      <h4 className="font-semibold text-gray-900">
                        {firstInterview.studentName}
                      </h4>
                      <p className="text-sm text-gray-600">
                        {firstInterview.gradeApplied} • Aplicación #{applicationId}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {/* Resumen visual */}
                    <div className="flex items-center gap-2 text-xs">
                      <span className="flex items-center gap-1">
                        <CheckCircleIcon className="w-4 h-4 text-green-600" />
                        {summary.completed} completadas
                      </span>
                      <span className="flex items-center gap-1">
                        <CalendarIcon className="w-4 h-4 text-blue-600" />
                        {summary.scheduled} programadas
                      </span>
                      <span className="flex items-center gap-1">
                        <ExclamationTriangleIcon className="w-4 h-4 text-yellow-600" />
                        {summary.pending} pendientes
                      </span>
                    </div>

                    {/* Indicador de expansión */}
                    <div className="text-gray-400">
                      {isExpanded ? '▼' : '▶'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Detalles de entrevistas (expandible) */}
              {isExpanded && (
                <div className="divide-y">
                  {interviews.map(interview => {
                    const badgeProps = getStatusBadgeProps(interview);
                    
                    return (
                      <div 
                        key={interview.id}
                        className={`p-4 border-l-4 ${getPriorityColor(interview.priority)}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h5 className="font-medium text-gray-900">
                                {INTERVIEW_TYPE_LABELS[interview.interviewType]}
                              </h5>
                              <Badge {...badgeProps} size="sm" />
                              {interview.priority === 'HIGH' && (
                                <Badge variant="error" size="sm">🔥 Alta prioridad</Badge>
                              )}
                            </div>
                            
                            {interview.isScheduled ? (
                              <div className="text-sm text-gray-600 space-y-1">
                                <p className="flex items-center gap-2">
                                  <CalendarIcon className="w-4 h-4" />
                                  {interview.scheduledDate} a las {interview.scheduledTime}
                                </p>
                                <p className="flex items-center gap-2">
                                  <UserIcon className="w-4 h-4" />
                                  {interview.interviewerName}
                                </p>
                              </div>
                            ) : (
                              <p className="text-sm text-yellow-700 bg-yellow-100 px-2 py-1 rounded">
                                ⚠️ Entrevista pendiente de programación
                              </p>
                            )}
                          </div>

                          <div className="flex gap-2 ml-4">
                            {interview.isScheduled ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onViewInterview(interview)}
                              >
                                <EyeIcon className="w-4 h-4 mr-1" />
                                Ver
                              </Button>
                            ) : (
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => onScheduleInterview(interview)}
                              >
                                <CalendarIcon className="w-4 h-4 mr-1" />
                                Programar
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Estadísticas generales */}
      <Card className="p-4 bg-blue-50 border-blue-200">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-green-600">
              {getFilteredInterviews().filter(i => i.status === InterviewStatus.COMPLETED).length}
            </div>
            <div className="text-xs text-gray-600">Completadas</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-600">
              {getFilteredInterviews().filter(i => i.isScheduled && i.status !== InterviewStatus.COMPLETED).length}
            </div>
            <div className="text-xs text-gray-600">Programadas</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-yellow-600">
              {getFilteredInterviews().filter(i => !i.isScheduled).length}
            </div>
            <div className="text-xs text-gray-600">Pendientes</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-600">
              {getFilteredInterviews().length}
            </div>
            <div className="text-xs text-gray-600">Total</div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default InterviewStatusPanel;