import React, { useState, useEffect } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import LoadingSpinner from '../ui/LoadingSpinner';
import { 
  FiAlertTriangle, 
  FiClock, 
  FiCheckCircle, 
  FiCalendar, 
  FiUser, 
  FiPlus,
  FiEye,
  FiEdit,
  FiRefreshCw
} from 'react-icons/fi';
import {
  Interview,
  InterviewStatus,
  InterviewResult,
  INTERVIEW_STATUS_LABELS,
  INTERVIEW_RESULT_LABELS,
  InterviewUtils
} from '../../types/interview';
import { applicationService } from '../../services/applicationService';
import interviewService from '../../services/interviewService';

interface InterviewDashboardProps {
  onScheduleInterview: (applicationId: number) => void;
  onViewInterview: (interview: Interview) => void;
  onEditInterview: (interview: Interview) => void;
  className?: string;
}

interface StudentNeedingInterview {
  applicationId: number;
  studentName: string;
  gradeApplied: string;
  daysSinceApplication: number;
  status: string;
}

interface UpcomingInterview extends Interview {
  daysUntil: number;
  timeUntil: string;
}

interface CompletedInterview extends Interview {
  daysAgo: number;
}

const InterviewDashboard: React.FC<InterviewDashboardProps> = ({
  onScheduleInterview,
  onViewInterview,
  onEditInterview,
  className = ''
}) => {
  const [studentsNeedingInterviews, setStudentsNeedingInterviews] = useState<StudentNeedingInterview[]>([]);
  const [upcomingInterviews, setUpcomingInterviews] = useState<UpcomingInterview[]>([]);
  const [completedInterviews, setCompletedInterviews] = useState<CompletedInterview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Cargar aplicaciones y entrevistas en paralelo
      const [applications, interviewsResponse] = await Promise.all([
        applicationService.getAllApplications(),
        interviewService.getAllInterviews()
      ]);

      const interviews = interviewsResponse.interviews;

      // 1. Estudiantes que NECESITAN entrevistas (URGENTE)
      const needingInterviews: StudentNeedingInterview[] = [];
      
      applications.forEach(app => {
        const hasInterviews = interviews.some(interview => interview.applicationId === app.id);
        
        if (!hasInterviews && app.student) {
          const daysSince = calculateDaysSince(app.createdAt || app.submissionDate);
          
          needingInterviews.push({
            applicationId: app.id,
            studentName: `${app.student.firstName} ${app.student.lastName} ${app.student.maternalLastName || ''}`.trim(),
            gradeApplied: app.student.gradeApplied || 'No especificado',
            daysSinceApplication: daysSince,
            status: app.status
          });
        }
      });

      // Ordenar por días desde aplicación (más urgente primero)
      needingInterviews.sort((a, b) => b.daysSinceApplication - a.daysSinceApplication);
      setStudentsNeedingInterviews(needingInterviews.slice(0, 10)); // Solo top 10

      // 2. Entrevistas PRÓXIMAS (próximos 7 días)
      const now = new Date();
      const nextWeek = new Date();
      nextWeek.setDate(now.getDate() + 7);

      const upcoming: UpcomingInterview[] = interviews
        .filter(interview => {
          const interviewDate = new Date(`${interview.scheduledDate}T${interview.scheduledTime}`);
          return interviewDate >= now && 
                 interviewDate <= nextWeek && 
                 (interview.status === InterviewStatus.SCHEDULED || 
                  interview.status === InterviewStatus.CONFIRMED);
        })
        .map(interview => {
          const interviewDate = new Date(`${interview.scheduledDate}T${interview.scheduledTime}`);
          const diffTime = interviewDate.getTime() - now.getTime();
          const daysUntil = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          const hoursUntil = Math.ceil(diffTime / (1000 * 60 * 60));
          
          return {
            ...interview,
            daysUntil,
            timeUntil: daysUntil === 0 ? `${hoursUntil}h` : `${daysUntil}d`
          };
        })
        .sort((a, b) => a.daysUntil - b.daysUntil);

      setUpcomingInterviews(upcoming);

      // 3. Entrevistas COMPLETADAS (últimas 15)
      const completed: CompletedInterview[] = interviews
        .filter(interview => interview.status === InterviewStatus.COMPLETED)
        .map(interview => {
          const completedDate = new Date(interview.completedAt || interview.scheduledDate);
          const diffTime = now.getTime() - completedDate.getTime();
          const daysAgo = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          return {
            ...interview,
            daysAgo
          };
        })
        .sort((a, b) => a.daysAgo - b.daysAgo) // Más recientes primero
        .slice(0, 15);

      setCompletedInterviews(completed);

    } catch (err: any) {
      console.error('Error loading dashboard data:', err);
      setError('Error al cargar los datos del dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  const calculateDaysSince = (dateString: string): number => {
    if (!dateString) return 0;
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getUrgencyColor = (days: number): string => {
    if (days >= 7) return 'text-red-600 bg-red-100';
    if (days >= 3) return 'text-yellow-600 bg-yellow-100';
    return 'text-blue-600 bg-blue-100';
  };

  const formatTimeUntil = (daysUntil: number): string => {
    if (daysUntil === 0) return 'Hoy';
    if (daysUntil === 1) return 'Mañana';
    return `${daysUntil} días`;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-6 text-center">
        <p className="text-red-600 mb-4">{error}</p>
        <Button onClick={loadDashboardData} variant="outline">
          <FiRefreshCw className="w-4 h-4 mr-2" />
          Reintentar
        </Button>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header con botón de actualizar */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Dashboard de Entrevistas</h2>
        <Button onClick={loadDashboardData} variant="outline">
          <FiRefreshCw className="w-4 h-4 mr-2" />
          Actualizar
        </Button>
      </div>

      {/* Resumen rápido */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 border-red-200">
          <div className="flex items-center justify-center">
            <FiAlertTriangle className="w-8 h-8 text-red-500 mr-3" />
            <div className="text-center">
              <p className="text-3xl font-bold text-red-600">{studentsNeedingInterviews.length}</p>
              <p className="text-sm text-red-700">Sin Entrevistas</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4 border-yellow-200">
          <div className="flex items-center justify-center">
            <FiClock className="w-8 h-8 text-yellow-500 mr-3" />
            <div className="text-center">
              <p className="text-3xl font-bold text-yellow-600">{upcomingInterviews.length}</p>
              <p className="text-sm text-yellow-700">Próximas 7 días</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4 border-green-200">
          <div className="flex items-center justify-center">
            <FiCheckCircle className="w-8 h-8 text-green-500 mr-3" />
            <div className="text-center">
              <p className="text-3xl font-bold text-green-600">{completedInterviews.length}</p>
              <p className="text-sm text-green-700">Completadas</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 1. URGENTE - Estudiantes sin entrevistas */}
        <Card className="p-6 border-red-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-red-800 flex items-center">
              <FiAlertTriangle className="w-5 h-5 mr-2" />
              🚨 URGENTE - Sin Entrevistas
            </h3>
          </div>

          {studentsNeedingInterviews.length === 0 ? (
            <div className="text-center py-4 text-gray-500">
              <FiCheckCircle className="w-8 h-8 mx-auto mb-2 text-green-400" />
              <p>¡Todos los estudiantes tienen entrevistas programadas!</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {studentsNeedingInterviews.map((student) => (
                <div key={student.applicationId} className="p-3 bg-red-50 rounded-lg border border-red-200">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-medium text-gray-900">{student.studentName}</h4>
                      <p className="text-sm text-gray-600">{student.gradeApplied}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getUrgencyColor(student.daysSinceApplication)}`}>
                      {student.daysSinceApplication} días
                    </span>
                  </div>
                  
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => onScheduleInterview(student.applicationId)}
                    className="w-full"
                  >
                    <FiPlus className="w-4 h-4 mr-1" />
                    Agendar Ahora
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* 2. PENDIENTES - Próximas entrevistas */}
        <Card className="p-6 border-yellow-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-yellow-800 flex items-center">
              <FiClock className="w-5 h-5 mr-2" />
              📅 PRÓXIMAS - 7 días
            </h3>
          </div>

          {upcomingInterviews.length === 0 ? (
            <div className="text-center py-4 text-gray-500">
              <FiCalendar className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              <p>No hay entrevistas programadas en los próximos 7 días</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {upcomingInterviews.map((interview) => (
                <div key={interview.id} className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-medium text-gray-900">{interview.studentName}</h4>
                      <p className="text-sm text-gray-600">
                        {(() => {
                          const [year, month, day] = interview.scheduledDate.split('-');
                          const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                          return date.toLocaleDateString('es-CL');
                        })()} - {interview.scheduledTime}
                      </p>
                      <p className="text-xs text-gray-500">{interview.interviewerName}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-medium text-yellow-700">
                        {formatTimeUntil(interview.daysUntil)}
                      </span>
                      <Badge variant={InterviewUtils.getStatusColor(interview.status)} size="sm" className="block mt-1">
                        {INTERVIEW_STATUS_LABELS[interview.status]}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onViewInterview(interview)}
                      className="flex-1"
                    >
                      <FiEye className="w-4 h-4 mr-1" />
                      Ver
                    </Button>
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => onEditInterview(interview)}
                      className="flex-1"
                    >
                      <FiEdit className="w-4 h-4 mr-1" />
                      Editar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* 3. COMPLETADAS - Entrevistas realizadas */}
        <Card className="p-6 border-green-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-green-800 flex items-center">
              <FiCheckCircle className="w-5 h-5 mr-2" />
              ✅ COMPLETADAS - Recientes
            </h3>
          </div>

          {completedInterviews.length === 0 ? (
            <div className="text-center py-4 text-gray-500">
              <FiUser className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              <p>No hay entrevistas completadas recientes</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {completedInterviews.map((interview) => (
                <div key={interview.id} className="p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-medium text-gray-900">{interview.studentName}</h4>
                      <p className="text-sm text-gray-600">{interview.interviewerName}</p>
                      <p className="text-xs text-gray-500">
                        Hace {interview.daysAgo} día{interview.daysAgo > 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className="text-right">
                      {interview.result && (
                        <Badge 
                          variant={InterviewUtils.getResultColor(interview.result)} 
                          size="sm"
                        >
                          {INTERVIEW_RESULT_LABELS[interview.result]}
                        </Badge>
                      )}
                      {interview.score && (
                        <p className="text-xs text-gray-600 mt-1">
                          {interview.score}/10
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onViewInterview(interview)}
                    className="w-full"
                  >
                    <FiEye className="w-4 h-4 mr-1" />
                    Ver Detalles
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default InterviewDashboard;