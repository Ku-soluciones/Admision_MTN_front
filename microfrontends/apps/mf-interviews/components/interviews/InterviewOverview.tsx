import React, { useState, useEffect } from 'react';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import LoadingSpinner from '../ui/LoadingSpinner';
import {
  FiUser,
  FiCalendar,
  FiClock,
  FiMapPin,
  FiVideo,
  FiEye,
  FiEdit,
  FiFilter,
  FiSearch,
  FiDownload,
  FiRefreshCw
} from 'react-icons/fi';
import {
  Interview,
  InterviewStatus,
  InterviewType,
  INTERVIEW_STATUS_LABELS,
  INTERVIEW_TYPE_LABELS,
  InterviewUtils
} from '../../types/interview';
import { applicationService } from '../../services/applicationService';
import interviewService from '../../services/interviewService';

interface PostulantInterview {
  applicationId: number;
  studentName: string;
  gradeApplied: string;
  parentNames: string;
  interviews: Interview[];
  completedInterviews: number;
  totalInterviews: number;
  pendingInterviews: Interview[];
  scheduledInterviews: Interview[];
}

interface InterviewOverviewProps {
  onViewInterview: (interview: Interview) => void;
  onEditInterview: (interview: Interview) => void;
  onCreateInterview: (applicationId: number) => void;
  className?: string;
}

const InterviewOverview: React.FC<InterviewOverviewProps> = ({
  onViewInterview,
  onEditInterview,
  onCreateInterview,
  className = ''
}) => {
  const [postulantInterviews, setPostulantInterviews] = useState<PostulantInterview[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<InterviewStatus | 'ALL'>('ALL');
  const [typeFilter, setTypeFilter] = useState<InterviewType | 'ALL'>('ALL');

  useEffect(() => {
    loadPostulantInterviews();
  }, []);

  const loadPostulantInterviews = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Obtener todas las aplicaciones
      const applications = await applicationService.getAllApplications();
      
      // Obtener todas las entrevistas - el servicio retorna un objeto con interviews array
      const interviewsResponse = await interviewService.getAllInterviews();
      const interviews = interviewsResponse.interviews; // Extraer el array de entrevistas

      // Combinar datos
      const combined: PostulantInterview[] = applications.map(app => {
        const appInterviews = interviews.filter(interview => interview.applicationId === app.id);
        
        return {
          applicationId: app.id,
          studentName: app.student ? 
            `${app.student.firstName} ${app.student.lastName} ${app.student.maternalLastName || ''}`.trim() :
            'Sin información',
          gradeApplied: app.student?.gradeApplied || 'No especificado',
          parentNames: app.student ? 'Padres de familia' : 'Sin información',
          interviews: appInterviews,
          completedInterviews: appInterviews.filter(i => i.status === InterviewStatus.COMPLETED).length,
          totalInterviews: appInterviews.length,
          pendingInterviews: appInterviews.filter(i => i.status === InterviewStatus.PENDING),
          scheduledInterviews: appInterviews.filter(i => 
            i.status === InterviewStatus.SCHEDULED || i.status === InterviewStatus.CONFIRMED
          )
        };
      });

      setPostulantInterviews(combined);
    } catch (error) {
      console.error('Error loading postulant interviews:', error);
      setError('Error al cargar las entrevistas');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredPostulants = postulantInterviews.filter(postulant => {
    const matchesSearch = postulant.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         postulant.gradeApplied.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;
    
    if (statusFilter !== 'ALL') {
      const hasStatusMatch = postulant.interviews.some(interview => interview.status === statusFilter);
      if (!hasStatusMatch) return false;
    }
    
    if (typeFilter !== 'ALL') {
      const hasTypeMatch = postulant.interviews.some(interview => interview.type === typeFilter);
      if (!hasTypeMatch) return false;
    }
    
    return true;
  });

  const formatDateTime = (date: string, time: string) => {
    try {
      // NO usar new Date(date) para evitar problemas de zona horaria
      // date viene como "2024-11-03"
      const [year, month, day] = date.split('-');
      const dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      const formattedDate = dateObj.toLocaleDateString('es-CL', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
      return `${formattedDate} ${time}`;
    } catch (error) {
      return `${date} ${time}`;
    }
  };

  const getInterviewTypeIcon = (type: InterviewType) => {
    switch (type) {
      case InterviewType.FAMILY: return '👨‍👩‍👧‍👦';
      case InterviewType.INDIVIDUAL: return '👤';
      case InterviewType.PSYCHOLOGICAL: return '🧠';
      default: return '📋';
    }
  };

  const getPostulantStatus = (postulant: PostulantInterview) => {
    if (postulant.completedInterviews === postulant.totalInterviews && postulant.totalInterviews > 0) {
      return { label: 'Completo', color: 'green' as const };
    }
    if (postulant.scheduledInterviews.length > 0) {
      return { label: 'En Proceso', color: 'blue' as const };
    }
    if (postulant.totalInterviews === 0) {
      return { label: 'Sin Entrevistas', color: 'gray' as const };
    }
    return { label: 'Pendiente', color: 'yellow' as const };
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
        <p className="text-red-600">{error}</p>
        <Button onClick={loadPostulantInterviews} className="mt-4">
          <FiRefreshCw className="w-4 h-4 mr-2" />
          Reintentar
        </Button>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header con estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded">
              <FiUser className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Postulantes</p>
              <p className="text-xl font-bold text-blue-900">{postulantInterviews.length}</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded">
              <FiCalendar className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Entrevistas Programadas</p>
              <p className="text-xl font-bold text-green-900">
                {postulantInterviews.reduce((sum, p) => sum + p.scheduledInterviews.length, 0)}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded">
              <FiUser className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Procesos Completos</p>
              <p className="text-xl font-bold text-emerald-900">
                {postulantInterviews.filter(p => p.completedInterviews === p.totalInterviews && p.totalInterviews > 0).length}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded">
              <FiClock className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Pendientes</p>
              <p className="text-xl font-bold text-yellow-900">
                {postulantInterviews.filter(p => p.totalInterviews === 0).length}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filtros */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Buscar Postulante
            </label>
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Nombre o curso..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Estado
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as InterviewStatus | 'ALL')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">Todos los estados</option>
              {Object.values(InterviewStatus).map(status => (
                <option key={status} value={status}>
                  {INTERVIEW_STATUS_LABELS[status]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de Entrevista
            </label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as InterviewType | 'ALL')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">Todos los tipos</option>
              {Object.values(InterviewType).map(type => (
                <option key={type} value={type}>
                  {INTERVIEW_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <Button
              variant="outline"
              onClick={loadPostulantInterviews}
              className="w-full"
            >
              <FiRefreshCw className="w-4 h-4 mr-2" />
              Actualizar
            </Button>
          </div>
        </div>
      </Card>

      {/* Lista de postulantes */}
      <div className="space-y-4">
        {filteredPostulants.map(postulant => {
          const status = getPostulantStatus(postulant);
          
          return (
            <Card key={postulant.applicationId} className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-blue-100 rounded-full">
                    <FiUser className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">
                      {postulant.studentName}
                    </h3>
                    <div className="flex items-center gap-3 mt-1">
                      <Badge variant="blue" size="sm">
                        {postulant.gradeApplied}
                      </Badge>
                      <span className="text-sm text-gray-600">
                        ID: #{postulant.applicationId}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Badge variant={status.color}>
                    {status.label}
                  </Badge>
                  <span className="text-sm text-gray-500">
                    {postulant.completedInterviews}/{postulant.totalInterviews} completadas
                  </span>
                </div>
              </div>

              {/* Lista de entrevistas */}
              <div className="space-y-2">
                <h4 className="font-medium text-gray-700 mb-3">
                  Entrevistas ({postulant.interviews.length})
                </h4>
                
                {postulant.interviews.length === 0 ? (
                  <div className="text-center py-4 bg-gray-50 rounded-lg">
                    <p className="text-gray-500 mb-2">No hay entrevistas programadas</p>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => onCreateInterview(postulant.applicationId)}
                    >
                      <FiCalendar className="w-4 h-4 mr-1" />
                      Crear Entrevista
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {postulant.interviews.map(interview => (
                      <div
                        key={interview.id}
                        className="p-3 border rounded-lg bg-white hover:shadow-sm transition-shadow"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">
                              {getInterviewTypeIcon(interview.type)}
                            </span>
                            <span className="font-medium text-sm">
                              {INTERVIEW_TYPE_LABELS[interview.type]}
                            </span>
                          </div>
                          <Badge 
                            variant={InterviewUtils.getStatusColor(interview.status)}
                            size="sm"
                          >
                            {INTERVIEW_STATUS_LABELS[interview.status]}
                          </Badge>
                        </div>

                        <div className="space-y-1 text-sm text-gray-600 mb-3">
                          <div className="flex items-center gap-2">
                            <FiCalendar className="w-3 h-3" />
                            <span>{formatDateTime(interview.scheduledDate, interview.scheduledTime)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <FiUser className="w-3 h-3" />
                            <span>{interview.interviewerName}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {interview.mode === 'VIRTUAL' ? (
                              <FiVideo className="w-3 h-3" />
                            ) : (
                              <FiMapPin className="w-3 h-3" />
                            )}
                            <span>{interview.location || 'Por confirmar'}</span>
                          </div>
                        </div>

                        <div className="flex gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onViewInterview(interview)}
                            className="flex-1"
                          >
                            <FiEye className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => onEditInterview(interview)}
                            className="flex-1"
                          >
                            <FiEdit className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {filteredPostulants.length === 0 && !isLoading && (
        <Card className="p-6 text-center">
          <p className="text-gray-500">No se encontraron postulantes que coincidan con los filtros</p>
        </Card>
      )}
    </div>
  );
};

export default InterviewOverview;