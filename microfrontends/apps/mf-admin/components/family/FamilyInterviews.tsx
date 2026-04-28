import React, { useState, useEffect } from 'react';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import LoadingSpinner from '../ui/LoadingSpinner';
import { 
  FiCalendar, 
  FiClock, 
  FiMapPin, 
  FiVideo, 
  FiUser, 
  FiCheck,
  FiInfo,
  FiAlertCircle,
  FiFileText
} from 'react-icons/fi';
import {
  Interview,
  InterviewStatus,
  InterviewType,
  InterviewMode,
  INTERVIEW_STATUS_LABELS,
  INTERVIEW_TYPE_LABELS,
  INTERVIEW_MODE_LABELS,
  InterviewUtils
} from '../../types/interview';
import interviewService from '../../services/interviewService';
import { useAuth } from '../../context/AuthContext';

interface FamilyInterviewsProps {
  className?: string;
}

const FamilyInterviews: React.FC<FamilyInterviewsProps> = ({ className = '' }) => {
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    loadFamilyInterviews();
  }, [user]);

  const loadFamilyInterviews = async () => {
    console.log('🔍 FamilyInterviews - User:', user);
    console.log('🔍 FamilyInterviews - applicationId:', user?.applicationId);

    if (!user?.applicationId) {
      console.warn('⚠️ No applicationId found in user context');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      console.log(`📋 Cargando entrevistas para applicationId: ${user.applicationId}`);
      // Obtener entrevistas por aplicación de la familia
      const response = await interviewService.getInterviewsByApplication(user.applicationId);
      console.log(`✅ Response completo:`, response);

      // Extract interviews array from response object
      const familyInterviews = response.interviews || [];
      console.log(`✅ Entrevistas cargadas (${familyInterviews.length}):`, familyInterviews);
      setInterviews(familyInterviews);
    } catch (error) {
      console.error('❌ Error cargando entrevistas familiares:', error);
      setError('Error al cargar las entrevistas');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: InterviewStatus): string => {
    return InterviewUtils.getStatusColor(status);
  };

  const getModeIcon = (mode: InterviewMode) => {
    switch (mode) {
      case InterviewMode.VIRTUAL:
        return <FiVideo className="w-4 h-4 text-blue-600" />;
      case InterviewMode.IN_PERSON:
        return <FiMapPin className="w-4 h-4 text-green-600" />;
      case InterviewMode.HYBRID:
        return <FiUser className="w-4 h-4 text-purple-600" />;
    }
  };

  const getTypeIcon = (type: InterviewType) => {
    switch (type) {
      case InterviewType.FAMILY:
        return <FiUser className="w-4 h-4 text-blue-600" />;
      case InterviewType.INDIVIDUAL:
        return <FiUser className="w-4 h-4 text-green-600" />;
      case InterviewType.PSYCHOLOGICAL:
        return <FiInfo className="w-4 h-4 text-purple-600" />;
      case InterviewType.ACADEMIC:
        return <FiFileText className="w-4 h-4 text-orange-600" />;
      case InterviewType.BEHAVIORAL:
        return <FiAlertCircle className="w-4 h-4 text-red-600" />;
    }
  };

  const formatDate = (date: string): string => {
    return new Date(date).toLocaleDateString('es-CL', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (time: string): string => {
    return time.substring(0, 5); // HH:MM
  };

  const renderInterviewCard = (interview: Interview) => {
    const isUpcoming = InterviewUtils.isUpcoming(interview.scheduledDate, interview.scheduledTime);
    const isOverdue = InterviewUtils.isOverdue(interview.scheduledDate, interview.scheduledTime, interview.status);

    return (
      <Card key={interview.id} className={`p-6 transition-all duration-200 hover:shadow-lg ${
        isUpcoming ? 'ring-2 ring-blue-400 bg-blue-50' : 
        isOverdue ? 'ring-2 ring-red-400 bg-red-50' : ''
      }`}>
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            {getTypeIcon(interview.type)}
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {INTERVIEW_TYPE_LABELS[interview.type]}
              </h3>
              <p className="text-sm text-gray-600">
                {interview.type === InterviewType.FAMILY && interview.secondInterviewerName ? (
                  <>
                    Entrevistadores: {interview.interviewerName} y {interview.secondInterviewerName}
                  </>
                ) : (
                  <>
                    Entrevistador: {interview.interviewerName}
                  </>
                )}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Badge variant={getStatusColor(interview.status)}>
              {INTERVIEW_STATUS_LABELS[interview.status]}
            </Badge>
            {isUpcoming && (
              <Badge variant="warning">
                Próximamente
              </Badge>
            )}
            {isOverdue && interview.status !== InterviewStatus.COMPLETED && (
              <Badge variant="danger">
                Vencida
              </Badge>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="flex items-center space-x-2">
            <FiCalendar className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-medium capitalize">
              {formatDate(interview.scheduledDate)}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <FiClock className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-medium">
              {formatTime(interview.scheduledTime)} ({InterviewUtils.formatDuration(interview.duration)})
            </span>
          </div>

          <div className="flex items-center space-x-2">
            {getModeIcon(interview.mode)}
            <span className="text-sm font-medium">
              {INTERVIEW_MODE_LABELS[interview.mode]}
            </span>
          </div>

          {interview.mode === InterviewMode.IN_PERSON && interview.location && (
            <div className="flex items-center space-x-2">
              <FiMapPin className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-600 truncate">
                {interview.location}
              </span>
            </div>
          )}

          {interview.mode === InterviewMode.VIRTUAL && interview.virtualMeetingLink && (
            <div className="flex items-center space-x-2">
              <FiVideo className="w-4 h-4 text-gray-400" />
              <a 
                href={interview.virtualMeetingLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:text-blue-800 underline truncate"
              >
                Unirse a la reunión
              </a>
            </div>
          )}
        </div>

        {interview.preparation && (
          <div className="mb-4 p-3 bg-blue-50 rounded-lg">
            <h4 className="text-sm font-medium text-blue-900 mb-1">Preparación</h4>
            <p className="text-sm text-blue-800">{interview.preparation}</p>
          </div>
        )}

        {interview.notes && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <h4 className="text-sm font-medium text-gray-900 mb-1">Notas</h4>
            <p className="text-sm text-gray-700">{interview.notes}</p>
          </div>
        )}

        {interview.status === InterviewStatus.COMPLETED && (
          <div className="mt-4 p-3 bg-green-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-green-900">Entrevista Completada</h4>
              {interview.score && (
                <Badge variant="success">
                  Puntuación: {interview.score}/10
                </Badge>
              )}
            </div>
            
            {interview.recommendations && (
              <p className="text-sm text-green-800 mb-2">{interview.recommendations}</p>
            )}
            
            {interview.followUpRequired && (
              <div className="flex items-center space-x-1 text-sm text-orange-600">
                <FiAlertCircle className="w-4 h-4" />
                <span>Se requiere seguimiento</span>
              </div>
            )}
          </div>
        )}

        {isUpcoming && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center space-x-2 text-yellow-800">
              <FiAlertCircle className="w-4 h-4" />
              <span className="text-sm font-medium">
                Recordatorio: Su entrevista es en las próximas 24 horas
              </span>
            </div>
          </div>
        )}
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className={`flex justify-center items-center py-12 ${className}`}>
        <div className="flex items-center space-x-3">
          <LoadingSpinner size="lg" />
          <span className="text-lg text-gray-600">Cargando entrevistas...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className={`p-6 text-center ${className}`}>
        <div className="flex items-center justify-center space-x-2 text-red-600 mb-4">
          <FiAlertCircle className="w-6 h-6" />
          <span className="text-lg font-medium">{error}</span>
        </div>
        <Button 
          variant="outline" 
          onClick={loadFamilyInterviews}
          className="text-red-600 border-red-600 hover:bg-red-50"
        >
          Reintentar
        </Button>
      </Card>
    );
  }

  if (!interviews.length) {
    return (
      <Card className={`p-12 text-center ${className}`}>
        <div className="flex justify-center mb-6">
          <div className="relative">
            <FiCalendar className="w-20 h-20 text-gray-300" />
            <FiClock className="w-8 h-8 text-gray-400 absolute -bottom-1 -right-1 bg-white rounded-full p-1" />
          </div>
        </div>

        <h3 className="text-xl font-semibold text-gray-900 mb-3">
          Todavía no hay entrevistas programadas
        </h3>

        <p className="text-gray-600 mb-2 max-w-md mx-auto">
          Cuando el colegio programe entrevistas para su solicitud de admisión, aparecerán aquí con todos los detalles.
        </p>

        <p className="text-sm text-gray-500 mb-6">
          Recibirá una notificación por correo electrónico cuando se agende una entrevista.
        </p>

        <div className="inline-flex items-center space-x-2 text-sm text-blue-600 bg-blue-50 px-4 py-2 rounded-lg">
          <FiInfo className="w-4 h-4" />
          <span>Las entrevistas son programadas por el equipo de admisiones</span>
        </div>

        {!user?.applicationId && (
          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg max-w-md mx-auto">
            <p className="text-sm text-yellow-800">
              <strong>Nota:</strong> Si tiene entrevistas programadas pero no las ve, intente cerrar sesión y volver a iniciar sesión.
            </p>
          </div>
        )}
      </Card>
    );
  }

  const upcomingInterviews = interviews.filter(i => 
    i.status === InterviewStatus.SCHEDULED || 
    i.status === InterviewStatus.CONFIRMED ||
    i.status === InterviewStatus.IN_PROGRESS
  );
  
  const completedInterviews = interviews.filter(i => 
    i.status === InterviewStatus.COMPLETED
  );

  const otherInterviews = interviews.filter(i => 
    !upcomingInterviews.includes(i) && !completedInterviews.includes(i)
  );

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Resumen */}
      <Card className="p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Mis Entrevistas</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{upcomingInterviews.length}</div>
            <div className="text-sm text-gray-600">Próximas</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{completedInterviews.length}</div>
            <div className="text-sm text-gray-600">Completadas</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-600">{interviews.length}</div>
            <div className="text-sm text-gray-600">Total</div>
          </div>
        </div>
      </Card>

      {/* Entrevistas próximas */}
      {upcomingInterviews.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Próximas Entrevistas</h3>
          <div className="space-y-4">
            {upcomingInterviews
              .sort((a, b) => new Date(a.scheduledDate + 'T' + a.scheduledTime).getTime() - 
                             new Date(b.scheduledDate + 'T' + b.scheduledTime).getTime())
              .map(renderInterviewCard)}
          </div>
        </div>
      )}

      {/* Entrevistas completadas */}
      {completedInterviews.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Entrevistas Completadas</h3>
          <div className="space-y-4">
            {completedInterviews
              .sort((a, b) => new Date(b.completedAt || '').getTime() - 
                             new Date(a.completedAt || '').getTime())
              .map(renderInterviewCard)}
          </div>
        </div>
      )}

      {/* Otras entrevistas */}
      {otherInterviews.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Historial</h3>
          <div className="space-y-4">
            {otherInterviews
              .sort((a, b) => new Date(b.scheduledDate + 'T' + b.scheduledTime).getTime() - 
                             new Date(a.scheduledDate + 'T' + a.scheduledTime).getTime())
              .map(renderInterviewCard)}
          </div>
        </div>
      )}
    </div>
  );
};

export default FamilyInterviews;