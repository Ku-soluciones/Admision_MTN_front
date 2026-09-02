import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../../admin/components/ui/Card';
import Button from '../../admin/components/ui/Button';
import Badge from '../../admin/components/ui/Badge';
import { ArrowLeftIcon, CheckCircleIcon, XCircleIcon, ClockIcon, AlertTriangleIcon } from '../../admin/components/icons/Icons';
import { interviewService } from '../services/interviewService';
import { documentService } from '../../../packages/shared-ui/src/services/documentService';
import { useNotifications } from '../../admin/context/AppContext';
import { professorEvaluationService } from '../../admin/services/professorEvaluationService';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface StudentWithDocuments {
  applicationId: number;
  studentName: string;
  parentNames: string;
  gradeApplied: string;
  interviewId: number;
  interviewStatus: string;
  scheduledDate: string;
  documents: DocumentInfo[];
  hasError: boolean;
  errorMessage?: string;
}

interface DocumentInfo {
  id: number;
  documentType: string;
  originalName?: string;
  fileName?: string;
  fileSize?: number;
  contentType?: string;
  approvalStatus?: string;
  approval_status?: string;
}

const CycleDirectorDirectory: React.FC = () => {
  const navigate = useNavigate();
  const { addNotification } = useNotifications();

  const [students, setStudents] = useState<StudentWithDocuments[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Obtener el profesor actual del localStorage
  const [currentProfessor] = useState(() => {
    const storedProfessor = localStorage.getItem('currentProfessor');
    return storedProfessor ? JSON.parse(storedProfessor) : null;
  });

  const currentProfessorId = currentProfessor?.id;

  useEffect(() => {
    const loadStudentsWithDocuments = async () => {
      if (!currentProfessorId) {
        setLoadError('No se pudo identificar al profesor');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setLoadError(null);

        // Obtener entrevistas del director de ciclo
        const interviews = await interviewService.getInterviewsByInterviewer(currentProfessorId);

        // Filtrar solo entrevistas de tipo CYCLE_DIRECTOR
        const cycleDirectorInterviews = interviews.filter(
          (interview: any) => interview.type === 'CYCLE_DIRECTOR'
        );

        if (cycleDirectorInterviews.length === 0) {
          setStudents([]);
          setIsLoading(false);
          return;
        }

        // Obtener documentos para cada estudiante
        const studentsWithDocs: StudentWithDocuments[] = [];

        for (const interview of cycleDirectorInterviews) {
          try {
            const documents = await interviewService.getDocumentsByApplication(interview.applicationId);

            studentsWithDocs.push({
              applicationId: interview.applicationId,
              studentName: interview.studentName || 'Sin nombre',
              parentNames: interview.parentNames || 'Sin información',
              gradeApplied: interview.gradeApplied || 'No especificado',
              interviewId: interview.id,
              interviewStatus: interview.status,
              scheduledDate: interview.scheduledDate,
              documents: documents || [],
              hasError: false
            });
          } catch (error) {
            // Si falla la carga de documentos, mostrar error por estudiante
            studentsWithDocs.push({
              applicationId: interview.applicationId,
              studentName: interview.studentName || 'Sin nombre',
              parentNames: interview.parentNames || 'Sin información',
              gradeApplied: interview.gradeApplied || 'No especificado',
              interviewId: interview.id,
              interviewStatus: interview.status,
              scheduledDate: interview.scheduledDate,
              documents: [],
              hasError: true,
              errorMessage: 'Error al cargar documentos'
            });
          }
        }

        setStudents(studentsWithDocs);
      } catch (error: any) {
        setLoadError('Error de conexión. No se pudieron obtener las entrevistas.');
        addNotification({
          type: 'error',
          title: 'Error de conexión',
          message: 'No se pudieron cargar las entrevistas del director de ciclo'
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadStudentsWithDocuments();
  }, [currentProfessorId, addNotification]);

  const handleViewInterview = async (interviewId: number) => {
    try {
      const evaluations = await professorEvaluationService.ensureInterviewEvaluations(interviewId);
      const directorInterview = evaluations.find(item => item.evaluationType === 'CYCLE_DIRECTOR_INTERVIEW');
      if (!directorInterview) throw new Error('No se encontró la evaluación asociada');
      navigate(`/profesor/entrevista-director/${directorInterview.id}`);
    } catch (error: any) {
      addNotification({
        type: 'error',
        title: 'No se pudo abrir la entrevista',
        message: error.message || 'No fue posible obtener la evaluación asociada a esta entrevista'
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <Badge variant="success">Completada</Badge>;
      case 'SCHEDULED':
        return <Badge variant="warning">Programada</Badge>;
      case 'CANCELLED':
        return <Badge variant="danger">Cancelada</Badge>;
      case 'IN_PROGRESS':
        return <Badge variant="info">En Progreso</Badge>;
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  };

  const getApprovalBadge = (status?: string) => {
    if (status === 'APPROVED') {
      return <CheckCircleIcon className="w-4 h-4 text-green-500" />;
    }
    if (status === 'REJECTED') {
      return <XCircleIcon className="w-4 h-4 text-red-500" />;
    }
    return <ClockIcon className="w-4 h-4 text-yellow-500" />;
  };

  const getApprovalLabel = (status?: string) => {
    if (status === 'APPROVED') return 'Aprobado';
    if (status === 'REJECTED') return 'Rechazado';
    return 'Pendiente';
  };

  const getApprovalColor = (status?: string) => {
    if (status === 'APPROVED') return 'text-green-600 bg-green-50 border-green-200';
    if (status === 'REJECTED') return 'text-red-600 bg-red-50 border-red-200';
    return 'text-yellow-600 bg-yellow-50 border-yellow-200';
  };

  const getApprovedCount = (documents: DocumentInfo[]) => {
    return documents.filter(d =>
      (d.approvalStatus === 'APPROVED') || (d.approval_status === 'APPROVED')
    ).length;
  };

  const getTotalCount = (documents: DocumentInfo[]) => {
    return documents.length;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <button
            onClick={() => navigate('/profesor')}
            className="inline-flex items-center text-azul-monte-tabor hover:text-blue-800 transition-colors mb-2"
          >
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            Volver al Dashboard
          </button>
          <h1 className="text-2xl font-bold text-azul-monte-tabor">
            Mis Estudiantes
          </h1>
          <p className="text-gray-600 mt-1">
            Documentos de postulación validados para cada estudiante
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-6 py-8">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-azul-monte-tabor mx-auto"></div>
            <p className="mt-4 text-gray-600">Cargando estudiantes...</p>
          </div>
        ) : loadError ? (
          <Card className="p-8 text-center">
            <AlertTriangleIcon className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-700 mb-2">
              Error de conexión
            </h3>
            <p className="text-gray-500 mb-4">{loadError}</p>
            <Button
              variant="outline"
              onClick={() => window.location.reload()}
            >
              Reintentar
            </Button>
          </Card>
        ) : students.length === 0 ? (
          <Card className="p-8 text-center">
            <h3 className="text-lg font-medium text-gray-700 mb-2">
              No hay estudiantes asignados
            </h3>
            <p className="text-gray-500">
              No tienes entrevistas de Director de Ciclo asignadas actualmente.
            </p>
          </Card>
        ) : (
          <div className="space-y-6">
            {students.map((student) => (
              <Card key={student.applicationId} className="p-6">
                {/* Encabezado del estudiante */}
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold text-gray-900">
                        {student.studentName}
                      </h3>
                      {getStatusBadge(student.interviewStatus)}
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p><span className="font-medium">Curso:</span> {student.gradeApplied}</p>
                      <p><span className="font-medium">Apoderado:</span> {student.parentNames}</p>
                      {student.scheduledDate && (
                        <p><span className="font-medium">Fecha entrevista:</span> {format(new Date(student.scheduledDate), "dd 'de' MMMM 'de' yyyy", { locale: es })}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleViewInterview(student.interviewId)}
                    >
                      Ver Entrevista
                    </Button>
                  </div>
                </div>

                {/* Sección de Documentos */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">
                    Documentos de Postulación
                  </h4>

                  {student.hasError ? (
                    <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
                      <AlertTriangleIcon className="w-5 h-5" />
                      <span className="text-sm">{student.errorMessage || 'Error al cargar documentos'}</span>
                    </div>
                  ) : student.documents.length === 0 ? (
                    <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-700">
                      <ClockIcon className="w-5 h-5" />
                      <span className="text-sm">No hay documentos validados aún</span>
                    </div>
                  ) : (
                    <>
                      {/* Resumen de documentos */}
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-sm text-gray-600">Estado:</span>
                        <span className={`font-semibold ${getApprovedCount(student.documents) === getTotalCount(student.documents) && getTotalCount(student.documents) > 0 ? 'text-green-600' : 'text-orange-600'}`}>
                          {getApprovedCount(student.documents)} de {getTotalCount(student.documents)} documentos aprobados
                        </span>
                      </div>

                      {/* Lista de documentos */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {student.documents.map((doc) => {
                          const status = doc.approvalStatus || doc.approval_status;
                          return (
                            <div
                              key={doc.id}
                              className={`p-3 rounded-lg border ${getApprovalColor(status)}`}
                            >
                              <div className="flex items-start gap-2">
                                {getApprovalBadge(status)}
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-sm truncate">
                                    {documentService.getDocumentTypeLabel(doc.documentType)}
                                  </p>
                                  <p className="text-xs opacity-75 truncate">
                                    {doc.originalName || doc.fileName || 'Sin nombre'}
                                  </p>
                                  <p className="text-xs mt-1 font-medium">
                                    {getApprovalLabel(status)}
                                  </p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CycleDirectorDirectory;
