import React, { useState, useEffect } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import LoadingSpinner from '../ui/LoadingSpinner';
import {
  FiArrowLeft,
  FiUser,
  FiCalendar,
  FiClock,
  FiMapPin,
  FiVideo,
  FiPlus,
  FiEye,
  FiEdit,
  FiCheckCircle,
  FiAlertCircle,
  FiRefreshCw,
  FiInfo,
  FiTrash2
} from 'react-icons/fi';
import {
  Interview,
  InterviewStatus,
  InterviewResult,
  INTERVIEW_STATUS_LABELS,
  INTERVIEW_TYPE_LABELS,
  INTERVIEW_RESULT_LABELS,
  InterviewUtils
} from '../../types/interview';
import { applicationService } from '../../services/applicationService';
import interviewService from '../../services/interviewService';
import { interviewerScheduleService } from '../../services/interviewerScheduleService';

interface StudentDetailPageProps {
  applicationId: number;
  studentName: string;
  onBack: () => void;
  onScheduleInterview: (applicationId: number, interviewType?: string) => void;
  onViewInterview: (interview: Interview) => void;
  onEditInterview: (interview: Interview) => void;
  className?: string;
}

interface StudentDetail {
  applicationId: number;
  studentName: string;
  gradeApplied: string;
  parentNames: string;
  applicationStatus: string;
  submissionDate: string;
  interviews: Interview[];
  missingInterviewTypes: string[];
  interviewProgress: {
    completed: number;
    scheduled: number;
    missing: number;
    total: number;
  };
}

// Tipos de entrevistas requeridas para el sistema de 3 entrevistas
const REQUIRED_INTERVIEW_TYPES = [
  {
    type: 'FAMILY',
    title: '👨‍👩‍👧‍👦 Entrevista Familiar',
    description: 'Entrevista con los padres y familia del estudiante (requiere 2 entrevistadores)',
    icon: '👨‍👩‍👧‍👦',
    required: true,
    order: 1
  },
  {
    type: 'INDIVIDUAL',
    title: '🎓 Entrevista Director de Ciclo',
    description: 'Entrevista con el Director de Ciclo',
    icon: '🎓',
    required: true,
    order: 2
  },
  {
    type: 'PSYCHOLOGICAL',
    title: '🧠 Evaluación Psicológica',
    description: 'Evaluación psicopedagógica del estudiante',
    icon: '🧠',
    required: true,
    order: 3
  },
  {
    type: 'BEHAVIORAL',
    title: '⚖️ Entrevista Conductual',
    description: 'Evaluación conductual del estudiante',
    icon: '⚖️',
    required: false,
    order: 4
  }
];

// Componente para las fichas de entrevistas
interface InterviewCardProps {
  interviewType: typeof REQUIRED_INTERVIEW_TYPES[0];
  interviews: Interview[];
  onSchedule: () => void;
  onView: (interview: Interview) => void;
  applicationId: number;
  isLoading?: boolean;
}

const InterviewCard: React.FC<InterviewCardProps> = ({
  interviewType,
  interviews,
  onSchedule,
  onView,
  applicationId,
  isLoading = false
}) => {
  // Debug: log interviews and type
  console.log(`🎯 InterviewCard for type ${interviewType.type}:`, {
    totalInterviews: interviews.length,
    interviews: interviews.map(i => ({ id: i.id, type: i.type, status: i.status }))
  });

  // Buscar entrevista de este tipo (solo las activas, no canceladas)
  const existingInterview = interviews.find(interview =>
    interview.type === interviewType.type &&
    interview.status !== InterviewStatus.CANCELLED &&
    interview.status !== 'NO_SHOW'
  );

  console.log(`🎯 Found existing interview for ${interviewType.type}:`, existingInterview ? {
    id: existingInterview.id,
    status: existingInterview.status,
    interviewerName: existingInterview.interviewerName,
    secondInterviewerName: existingInterview.secondInterviewerName,
    scheduledDate: existingInterview.scheduledDate,
    scheduledTime: existingInterview.scheduledTime
  } : 'NO MATCH');
  
  const getCardStatus = () => {
    if (!existingInterview) {
      return {
        color: interviewType.required ? 'border-orange-200 bg-orange-50' : 'border-gray-200 bg-gray-50',
        status: interviewType.required ? 'Requerida' : 'Opcional',
        statusColor: interviewType.required ? 'text-orange-700 bg-orange-100' : 'text-gray-600 bg-gray-100',
        action: 'Programar'
      };
    }
    
    switch (existingInterview.status) {
      case InterviewStatus.SCHEDULED:
        return {
          color: 'border-green-300 bg-green-100',
          status: 'Programada',
          statusColor: 'text-green-800 bg-green-200',
          action: 'Ver Detalles'
        };
      case InterviewStatus.CONFIRMED:
        return {
          color: 'border-emerald-300 bg-emerald-100',
          status: 'Confirmada',
          statusColor: 'text-emerald-800 bg-emerald-200',
          action: 'Ver Detalles'
        };
      case InterviewStatus.COMPLETED:
        return {
          color: 'border-teal-300 bg-teal-100',
          status: 'Completada',
          statusColor: 'text-teal-800 bg-teal-200',
          action: 'Ver Resultado'
        };
      case InterviewStatus.CANCELLED:
        return {
          color: 'border-red-200 bg-red-50',
          status: 'Cancelada',
          statusColor: 'text-red-700 bg-red-100',
          action: 'Reprogramar'
        };
      default:
        return {
          color: 'border-gray-200 bg-gray-50',
          status: 'Sin programar',
          statusColor: 'text-gray-600 bg-gray-100',
          action: 'Programar'
        };
    }
  };

  const cardStatus = getCardStatus();

  return (
    <Card className={`p-4 ${cardStatus.color} border-2 ${isLoading ? 'opacity-50' : ''}`}>
      <div className="flex flex-col h-full">
        <div className="flex-1">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">{interviewType.icon}</span>
              <h3 className="font-medium text-gray-900 text-sm leading-tight">
                {interviewType.title.replace(/^[^\s]+\s/, '')}
              </h3>
            </div>
            <div className="flex items-center gap-2">
              {interviewType.required && (
                <span className="text-xs text-red-600 font-medium">*</span>
              )}
              <Badge
                variant="neutral"
                size="sm"
                className={`${cardStatus.statusColor} text-xs`}
              >
                {cardStatus.status}
              </Badge>
            </div>
          </div>

          <p className="text-xs text-gray-600 mb-3">
            {interviewType.description}
          </p>
          
          {existingInterview && (
            <div className="space-y-1 mb-3">
              <p className="text-xs text-gray-500">
                📅 {(() => {
                  const [year, month, day] = existingInterview.scheduledDate.split('-');
                  const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                  return date.toLocaleDateString('es-CL');
                })()}
              </p>
              <p className="text-xs text-gray-500">
                🕐 {existingInterview.scheduledTime}
              </p>
              <p className="text-xs text-gray-500">
                👤 {existingInterview.interviewerName}
                {existingInterview.secondInterviewerName && (
                  <> & {existingInterview.secondInterviewerName}</>
                )}
              </p>
              {existingInterview.status === InterviewStatus.COMPLETED && existingInterview.score && (
                <p className="text-xs font-medium text-green-600">
                  ⭐ {existingInterview.score}/10
                </p>
              )}
            </div>
          )}
        </div>
        
        <Button
          size="sm"
          variant={existingInterview ? "outline" : "primary"}
          onClick={() => existingInterview ? onView(existingInterview) : onSchedule()}
          className="w-full text-xs"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <FiRefreshCw className="w-3 h-3 mr-1 animate-spin" />
              Cargando...
            </>
          ) : existingInterview ? (
            <>
              <FiEye className="w-3 h-3 mr-1" />
              {cardStatus.action}
            </>
          ) : (
            <>
              <FiPlus className="w-3 h-3 mr-1" />
              {cardStatus.action}
            </>
          )}
        </Button>
      </div>
    </Card>
  );
};

const StudentDetailPage: React.FC<StudentDetailPageProps> = ({
  applicationId,
  studentName,
  onBack,
  onScheduleInterview,
  onViewInterview,
  onEditInterview,
  className = ''
}) => {
  const [studentDetail, setStudentDetail] = useState<StudentDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingInterviewId, setDeletingInterviewId] = useState<number | null>(null);

  useEffect(() => {
    loadStudentDetail();
  }, [applicationId]);

  const loadStudentDetail = async (refresh = false) => {
    try {
      if (refresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      console.log('📋 Loading student detail for application:', applicationId);

      // Cargar información del estudiante y sus entrevistas en paralelo
      const [applications, interviewsResponse] = await Promise.all([
        applicationService.getAllApplications(),
        interviewService.getInterviewsByApplication(applicationId)
      ]);

      const application = applications.find(app => app.id === applicationId);
      if (!application) {
        setError('Estudiante no encontrado');
        return;
      }

      console.log('📋 Found application:', application);
      console.log('📋 RAW interviews response:', interviewsResponse);
      console.log('📋 Found interviews array:', interviewsResponse.interviews);
      console.log('📋 Interviews count:', interviewsResponse.interviews?.length || 0);

      const interviews = interviewsResponse.interviews || [];

      // Debug cada entrevista
      interviews.forEach(interview => {
        console.log(`🔍 Interview ${interview.id}:`, {
          id: interview.id,
          type: interview.type,
          status: interview.status,
          interviewerName: interview.interviewerName,
          secondInterviewerName: interview.secondInterviewerName,
          scheduledDate: interview.scheduledDate,
          scheduledTime: interview.scheduledTime
        });
      });

      // Calcular progreso de entrevistas basado en los 4 tipos requeridos
      const requiredTypes = REQUIRED_INTERVIEW_TYPES.filter(t => t.required);
      const missingInterviewTypes = requiredTypes
        .filter(reqType => !interviews.some(interview => interview.type === reqType.type))
        .map(reqType => reqType.type);

      const completedCount = interviews.filter(i => i.status === InterviewStatus.COMPLETED).length;
      const scheduledCount = interviews.filter(i =>
        i.status === InterviewStatus.SCHEDULED || i.status === InterviewStatus.CONFIRMED
      ).length;
      const missingCount = missingInterviewTypes.length;

      setStudentDetail({
        applicationId: application.id,
        studentName: application.student ?
          `${application.student.firstName} ${application.student.lastName} ${application.student.maternalLastName || ''}`.trim() :
          'Sin información',
        gradeApplied: application.student?.gradeApplied || 'No especificado',
        parentNames: 'Padres de familia', // Esto se podría mejorar con datos reales
        applicationStatus: application.status,
        submissionDate: application.submissionDate || application.createdAt || '',
        interviews: interviews.sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime()),
        missingInterviewTypes,
        interviewProgress: {
          completed: completedCount,
          scheduled: scheduledCount,
          missing: missingCount,
          total: requiredTypes.length
        }
      });

      console.log('📋 Student detail loaded successfully with progress:', {
        completed: completedCount,
        scheduled: scheduledCount,
        missing: missingCount,
        total: requiredTypes.length
      });

    } catch (err: any) {
      console.error('Error loading student detail:', err);
      setError('Error al cargar los detalles del estudiante');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const formatDate = (dateString: string): string => {
    if (!dateString) return 'Sin fecha';
    // NO usar new Date(dateString) para evitar problemas de zona horaria
    const [year, month, day] = dateString.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    return date.toLocaleDateString('es-CL');
  };

  const getInterviewStatusSummary = (studentDetail: StudentDetail) => {
    const { interviewProgress } = studentDetail;
    const { completed, scheduled, missing, total } = interviewProgress;

    if (missing === total) {
      return {
        message: `Faltan las ${total} entrevistas requeridas`,
        color: 'red',
        icon: FiAlertCircle,
        progress: 0
      };
    }
    if (completed === total) {
      return {
        message: 'Proceso de entrevistas completado',
        color: 'green',
        icon: FiCheckCircle,
        progress: 100
      };
    }
    if (scheduled > 0 || completed > 0) {
      const progress = Math.round(((completed + scheduled) / total) * 100);
      return {
        message: `${completed}/${total} completadas, ${scheduled} programadas`,
        color: 'blue',
        icon: FiClock,
        progress
      };
    }
    return {
      message: `${missing} entrevistas pendientes`,
      color: 'orange',
      icon: FiAlertCircle,
      progress: 0
    };
  };

  const handleRefresh = () => {
    loadStudentDetail(true);
  };

  const handleDeleteInterview = async (interviewId: number) => {
    if (!confirm('¿Está seguro que desea eliminar esta entrevista? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      setDeletingInterviewId(interviewId);
      console.log(`🗑️ Eliminando entrevista ${interviewId}...`);

      await interviewService.deleteInterview(interviewId);

      console.log(`✅ Entrevista ${interviewId} eliminada correctamente`);

      // Recargar los detalles del estudiante para actualizar la lista
      await loadStudentDetail(true);

    } catch (error: any) {
      console.error('❌ Error eliminando entrevista:', error);
      alert('Error al eliminar la entrevista. Por favor intente nuevamente.');
    } finally {
      setDeletingInterviewId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <LoadingSpinner size="lg" />
        <span className="ml-3 text-gray-600">Cargando detalles...</span>
      </div>
    );
  }

  if (error || !studentDetail) {
    return (
      <Card className="p-6 text-center">
        <p className="text-red-600 mb-4">{error}</p>
        <Button onClick={onBack} variant="outline">
          <FiArrowLeft className="w-4 h-4 mr-2" />
          Volver
        </Button>
      </Card>
    );
  }

  const statusSummary = getInterviewStatusSummary(studentDetail);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header con botón de volver */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button onClick={onBack} variant="outline">
            <FiArrowLeft className="w-4 h-4 mr-2" />
            Volver
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{studentDetail.studentName}</h1>
            <p className="text-gray-600">{studentDetail.gradeApplied}</p>
          </div>
        </div>
        <Button
          onClick={handleRefresh}
          variant="outline"
          size="sm"
          disabled={isRefreshing}
        >
          <FiRefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>

      {/* Información del estudiante */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <FiUser className="w-5 h-5 mr-2" />
            Información del Estudiante
          </h2>
          
          <div className="flex items-center space-x-2">
            <statusSummary.icon className={`w-5 h-5 text-${statusSummary.color}-500`} />
            <div className="flex flex-col">
              <span className={`text-sm font-medium text-${statusSummary.color}-600`}>
                {statusSummary.message}
              </span>
              <div className="flex items-center gap-2 mt-1">
                <div className="w-32 bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full bg-${statusSummary.color}-500 transition-all duration-300`}
                    style={{ width: `${statusSummary.progress}%` }}
                  ></div>
                </div>
                <span className="text-xs text-gray-500">{statusSummary.progress}%</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">Curso postulado</p>
            <p className="font-medium">{studentDetail.gradeApplied}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Fecha de postulación</p>
            <p className="font-medium">{formatDate(studentDetail.submissionDate)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Estado de postulación</p>
            <Badge variant="info">{studentDetail.applicationStatus}</Badge>
          </div>
          <div>
            <p className="text-sm text-gray-600">ID de aplicación</p>
            <p className="font-medium">#{studentDetail.applicationId}</p>
          </div>
        </div>
      </Card>

      {/* Sistema de 4 Entrevistas Requeridas */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <FiCalendar className="w-5 h-5 mr-2" />
            Sistema de Entrevistas Requeridas
          </h2>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <FiInfo className="w-4 h-4" />
            <span>{studentDetail.interviewProgress.missing} pendientes de {studentDetail.interviewProgress.total}</span>
          </div>
        </div>

        {/* Indicador de progreso de entrevistas requeridas */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Progreso de Entrevistas Obligatorias</span>
            <span className="text-sm text-gray-600">
              {studentDetail.interviewProgress.completed + studentDetail.interviewProgress.scheduled} de {studentDetail.interviewProgress.total}
            </span>
          </div>
          <div className="grid grid-cols-4 gap-2 mb-3">
            {REQUIRED_INTERVIEW_TYPES.filter(t => t.required).map((type, index) => {
              const hasInterview = studentDetail.interviews.some(i => i.type === type.type);
              const interview = studentDetail.interviews.find(i => i.type === type.type);
              const isCompleted = interview?.status === InterviewStatus.COMPLETED;
              const isScheduled = interview?.status === InterviewStatus.SCHEDULED || interview?.status === InterviewStatus.CONFIRMED;

              return (
                <div key={type.type} className="text-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium mx-auto mb-1 ${
                    isCompleted ? 'bg-green-500 text-white' :
                    isScheduled ? 'bg-blue-500 text-white' :
                    'bg-gray-200 text-gray-600'
                  }`}>
                    {isCompleted ? '✓' : isScheduled ? index + 1 : index + 1}
                  </div>
                  <div className="text-xs text-gray-600">{type.icon}</div>
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-600">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span>Completada</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span>Programada</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-gray-200 rounded-full"></div>
              <span>Pendiente</span>
            </div>
          </div>
        </div>

        {/* Debug: Mostrar total de entrevistas cargadas */}
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm">
          <span className="font-medium">Debug: </span>
          {studentDetail.interviews.length} entrevistas cargadas
          {studentDetail.interviews.length > 0 && (
            <span className="ml-2">
              (IDs: {studentDetail.interviews.map(i => `${i.id}:${i.type}:${i.status}`).join(', ')})
            </span>
          )}
        </div>

        {/* Fichas de entrevistas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {REQUIRED_INTERVIEW_TYPES.map((interviewType) => (
            <InterviewCard
              key={interviewType.type}
              interviewType={interviewType}
              interviews={studentDetail.interviews}
              onSchedule={() => onScheduleInterview(studentDetail.applicationId, interviewType.type)}
              onView={onViewInterview}
              applicationId={studentDetail.applicationId}
              isLoading={isRefreshing}
            />
          ))}
        </div>

        <div className="border-t pt-6">
          <h3 className="text-md font-medium text-gray-900 mb-4 flex items-center">
            <FiCalendar className="w-4 h-4 mr-2" />
            Historial de Entrevistas ({studentDetail.interviews.length})
          </h3>

          {studentDetail.interviews.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FiCalendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-lg mb-2">No hay entrevistas registradas</p>
              <p className="text-sm">Use las fichas de arriba para programar las entrevistas requeridas</p>
            </div>
          ) : (
            <div className="space-y-4">
              {studentDetail.interviews.map((interview) => (
                <div
                  key={interview.id}
                  className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-medium text-gray-900 flex items-center">
                        <span className="text-lg mr-2">
                          {REQUIRED_INTERVIEW_TYPES.find(t => t.type === interview.type)?.icon || '📋'}
                        </span>
                        {INTERVIEW_TYPE_LABELS[interview.type]}
                      </h3>
                      <div className="text-sm text-gray-600 mt-1">
                        <FiUser className="inline w-4 h-4 mr-1" />
                        {interview.interviewerName}
                        {interview.secondInterviewerName && (
                          <>
                            {' '}&{' '}
                            {interview.secondInterviewerName}
                          </>
                        )}
                      </div>
                    </div>
                    
                    <Badge 
                      variant={InterviewUtils.getStatusColor(interview.status)}
                    >
                      {INTERVIEW_STATUS_LABELS[interview.status]}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                    <div className="flex items-center text-sm text-gray-600">
                      <FiCalendar className="w-4 h-4 mr-2" />
                      {formatDate(interview.scheduledDate)}
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <FiClock className="w-4 h-4 mr-2" />
                      {interview.scheduledTime} ({interview.duration}min)
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      {interview.mode === 'VIRTUAL' ? (
                        <>
                          <FiVideo className="w-4 h-4 mr-2" />
                          Virtual
                        </>
                      ) : (
                        <>
                          <FiMapPin className="w-4 h-4 mr-2" />
                          {interview.location || 'Presencial'}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Resultado si está completada */}
                  {interview.status === InterviewStatus.COMPLETED && interview.result && (
                    <div className="mb-4 p-3 bg-green-50 rounded-md">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-sm font-medium text-green-800">
                            Resultado: {INTERVIEW_RESULT_LABELS[interview.result]}
                          </span>
                          {interview.score && (
                            <span className="ml-3 text-sm text-green-700">
                              Puntuación: {interview.score}/10
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Acciones */}
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onViewInterview(interview)}
                    >
                      <FiEye className="w-4 h-4 mr-1" />
                      Ver
                    </Button>
                    {interview.status !== InterviewStatus.COMPLETED && interview.status !== InterviewStatus.CANCELLED && (
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => onEditInterview(interview)}
                      >
                        <FiEdit className="w-4 h-4 mr-1" />
                        Editar
                      </Button>
                    )}
                    {interview.status === InterviewStatus.CANCELLED && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteInterview(interview.id)}
                        disabled={deletingInterviewId === interview.id}
                        className="border-red-300 text-red-600 hover:bg-red-50"
                      >
                        {deletingInterviewId === interview.id ? (
                          <>
                            <FiRefreshCw className="w-4 h-4 mr-1 animate-spin" />
                            Eliminando...
                          </>
                        ) : (
                          <>
                            <FiTrash2 className="w-4 h-4 mr-1" />
                            Eliminar
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default StudentDetailPage;