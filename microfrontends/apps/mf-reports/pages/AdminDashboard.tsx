import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import { DashboardIcon, FileTextIcon, UsersIcon, BarChartIcon, CheckCircleIcon, ClockIcon, UserIcon } from '../components/icons/Icons';
import { 
  FiFileText, 
  FiBarChart2, 
  FiFile, 
  FiKey, 
  FiMail, 
  FiAlertTriangle, 
  FiCheckCircle, 
  FiXCircle, 
  FiRefreshCw, 
  FiEdit,
  FiUser,
  FiBookOpen,
  FiCalendar,
  FiClock,
  FiEye,
  FiDownload,
  FiUpload,
  FiPlus,
  FiTrash2,
  FiSettings,
  FiList,
  FiAlertCircle,
  FiInfo,
  FiCheck,
  FiX,
  FiSearch
} from 'react-icons/fi';
import CreateUserForm from '../components/admin/CreateUserForm';
import { CreateUserRequest, UserRole, User } from '../types/user';
import { useApplications, useNotifications, useAppContext } from '../context/AppContext';
import { userService } from '../services/userService';
import {
  evaluationService
} from '../services/evaluationService';
import ChangePasswordButton from '../src/components/common/ChangePasswordButton';
import {
  Evaluation, 
  EvaluationType, 
  EvaluationStatus,
  EVALUATION_TYPE_LABELS,
  EVALUATION_STATUS_LABELS 
} from '../types/evaluation';
import EvaluationManagement from '../components/admin/EvaluationManagement';
import EvaluationStatistics from '../components/admin/EvaluationStatistics';
import EvaluationReports from '../components/admin/EvaluationReports';
import { GuardianManagement, StaffManagement } from '../components/users';
import { InterviewManagement } from '../components/interviews';
import SharedCalendar from '../components/admin/SharedCalendar';
import ApplicantMetricsView from '../components/admin/ApplicantMetricsView';
import { Application, applicationService } from '../services/applicationService';
import CoordinatorDashboardModal from '../components/modals/CoordinatorDashboardModal';
// Mock service removido - usando applicationService real
import { useAuth } from '../context/AuthContext';
import ApplicationsTable from '../components/admin/ApplicationsTable';
import SimpleToast from '../components/ui/SimpleToast';
import { microfrontendUrls } from '../utils/microfrontendUrls';
import AdminDataTables from '../components/admin/AdminDataTables';
import StudentDetailModal from '../components/admin/StudentDetailModal';
import ApplicationDecisionModal from '../components/admin/ApplicationDecisionModal';
import InterviewForm from '../components/interviews/InterviewForm';
import { InterviewFormMode, InterviewType } from '../types/interview';
import interviewService from '../services/interviewService';

const sections = [
  { key: 'dashboard', label: 'Dashboard General' },
  { key: 'metricas', label: 'Métricas de Postulantes' },
  { key: 'tablas', label: 'Tablas de Datos' },
  { key: 'postulaciones', label: 'Gestión de Postulaciones' },
  { key: 'evaluaciones', label: 'Gestión de Evaluaciones' },
  { key: 'entrevistas', label: 'Gestión de Entrevistas' },
  { key: 'calendario', label: 'Calendario Global' },
  { key: 'usuarios', label: 'Gestión de Usuarios' },
];

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate(); // eslint-disable-line @typescript-eslint/no-unused-vars
  const [activeSection, setActiveSection] = useState('dashboard');
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedPostulante, setSelectedPostulante] = useState<any>(null);
  const [dateFilter, setDateFilter] = useState({ start: '', end: '' });
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Estados para cambio de contraseña
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  
  // Estados para gestión de usuarios
  const [showCreateUserForm, setShowCreateUserForm] = useState(false);
  const [showEditUserForm, setShowEditUserForm] = useState(false);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [userFilter, setUserFilter] = useState({
    role: 'all',
    status: 'all',
    search: ''
  });
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  
  // Evaluation management state
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [isLoadingEvaluations, setIsLoadingEvaluations] = useState(false);
  const [evaluationFilter, setEvaluationFilter] = useState({
    status: 'all',
    type: 'all',
    evaluator: 'all'
  });
  const [evaluationSubsection, setEvaluationSubsection] = useState<'management' | 'statistics' | 'reports'>('management');
  const [showAssignEvaluationModal, setShowAssignEvaluationModal] = useState(false);
  const [selectedApplicationForEvaluation, setSelectedApplicationForEvaluation] = useState<Application | null>(null);

  // User management subsection state
  const [userSubsection, setUserSubsection] = useState<'staff' | 'guardians'>('staff');

  // Coordinator Dashboard Modal state
  const [showCoordinatorDashboard, setShowCoordinatorDashboard] = useState(false);

  // Mobile sidebar state
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Estados para aplicaciones reales
  const { applications } = useApplications();
  const { addNotification } = useNotifications();
  const { user, logout } = useAuth();
  const { dispatch } = useAppContext();

  // Estados para gestión de postulaciones
  const [adminApplications, setAdminApplications] = useState<Application[]>([]);
  const [isLoadingAdminApplications, setIsLoadingAdminApplications] = useState(false);
  const [applicationToast, setApplicationToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const [archiveDialog, setArchiveDialog] = useState<{
    show: boolean;
    application: Application | null;
    message: string;
  }>({
    show: false,
    application: null,
    message: ''
  });

  // Estado para modal de decisión final
  const [decisionModal, setDecisionModal] = useState<{
    show: boolean;
    application: Application | null;
  }>({
    show: false,
    application: null
  });

  // Estado para modal de programación de entrevista
  const [scheduleInterviewModal, setScheduleInterviewModal] = useState<{
    show: boolean;
    postulante: any | null;
    interviewType?: InterviewType;
  }>({
    show: false,
    postulante: null,
    interviewType: undefined
  });
  const [isSchedulingInterview, setIsSchedulingInterview] = useState(false);


  useEffect(() => {
    // Cleanup flag to prevent state updates after unmount
    let isMounted = true;

    const loadData = async () => {
      if (isMounted) {
        await loadApplications();
        await loadUsers(); // Cargar usuarios siempre para mostrar estadísticas correctas
        if (activeSection === 'postulaciones') {
          await loadAdminApplications();
        }
      }
    };

    loadData();

    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, [activeSection]);

  const loadApplications = async () => {
    try {
      console.log('[loadApplications] Iniciando carga de aplicaciones...');
      dispatch({ type: 'SET_LOADING', payload: true });
      // Use the applicationService which handles the API calls properly
      const applications = await applicationService.getAllApplications();
      console.log(`[loadApplications] ${applications.length} aplicaciones obtenidas del backend`);

      // Load evaluations for each application
      const applicationsWithEvaluations = await Promise.all(
        applications.map(async (app) => {
          try {
            // console.log(`[loadApplications] Cargando evaluaciones para application ${app.id} (${app.student?.firstName} ${app.student?.lastName})...`);
            const evaluations = await evaluationService.getEvaluationsByApplicationId(app.id);
            // console.log(`[loadApplications] Application ${app.id}: ${evaluations.length} evaluaciones obtenidas`);

            // Log detalles de evaluaciones académicas
            const academicEvals = evaluations.filter(e =>
              e.evaluationType === 'MATHEMATICS_EXAM' ||
              e.evaluationType === 'LANGUAGE_EXAM' ||
              e.evaluationType === 'ENGLISH_EXAM'
            );
            // console.log(`[loadApplications] Application ${app.id}: ${academicEvals.length} evaluaciones académicas (${academicEvals.map(e => `${e.evaluationType} - evaluator: ${e.evaluatorId}`).join(', ')})`);

            return { ...app, evaluations };
          } catch (error) {
            console.error(`[loadApplications] Error loading evaluations for application ${app.id}:`, error);
            console.error(`[loadApplications] Error details:`, {
              message: error.message,
              response: error.response?.data,
              status: error.response?.status
            });
            return { ...app, evaluations: [] };
          }
        })
      );

      console.log(`[loadApplications] Total aplicaciones con evaluaciones: ${applicationsWithEvaluations.length}`);
      console.log(`[loadApplications] Distribución de evaluaciones:`,
        applicationsWithEvaluations.map(app => ({
          id: app.id,
          student: `${app.student?.firstName} ${app.student?.lastName}`,
          totalEvals: app.evaluations?.length || 0,
          academicEvals: app.evaluations?.filter((e: any) =>
            e.evaluationType === 'MATHEMATICS_EXAM' ||
            e.evaluationType === 'LANGUAGE_EXAM' ||
            e.evaluationType === 'ENGLISH_EXAM'
          ).length || 0
        }))
      );

      dispatch({ type: 'SET_APPLICATIONS', payload: applicationsWithEvaluations });
    } catch (error) {
      console.error('[loadApplications] Error loading applications:', error);
      // applicationService already handles fallbacks, but set empty array if it fails completely
      dispatch({ type: 'SET_APPLICATIONS', payload: [] });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
      console.log('[loadApplications] Carga completada');
    }
  };

  const loadUsers = async () => {
    try {
      setIsLoadingUsers(true);
      const usersData = await userService.getSchoolStaffUsersPublic();
      // userService devuelve PagedResponse, necesitamos solo el contenido (solo staff del colegio)
      setUsers(usersData.content || []);
    } catch (error) {
      console.error('Error cargando usuarios:', error);
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'No se pudieron cargar los usuarios'
      });
    } finally {
      setIsLoadingUsers(false);
    }
  };

  // Transformar datos de Application a Postulante para el modal
  const transformApplicationToPostulante = (app: Application): any => {
    console.log('transformApplicationToPostulante - app.student:', app.student);

    const birthDate = new Date(app.student.birthDate);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear() -
               (today.getMonth() < birthDate.getMonth() ||
                (today.getMonth() === birthDate.getMonth() && today.getDate() < birthDate.getDate()) ? 1 : 0);

    const nombreCompleto = `${app.student.firstName} ${app.student.paternalLastName || app.student.lastName} ${app.student.maternalLastName || ''}`.trim();
    console.log('nombreCompleto construido:', nombreCompleto);

    return {
      id: app.id,
      // Datos básicos del estudiante
      nombreCompleto,
      nombres: app.student.firstName,
      apellidoPaterno: app.student.paternalLastName || app.student.lastName,
      apellidoMaterno: app.student.maternalLastName || '',
      rut: app.student.rut,
      fechaNacimiento: app.student.birthDate,
      edad: age,
      
      // Categorías especiales
      esHijoFuncionario: app.student.isEmployeeChild || false,
      nombrePadreFuncionario: app.student.employeeParentName,
      esHijoExalumno: app.student.isAlumniChild || false,
      anioEgresoExalumno: app.student.alumniParentYear,
      esAlumnoInclusion: app.student.isInclusionStudent || false,
      tipoInclusion: app.student.inclusionType,
      notasInclusion: app.student.inclusionNotes,
      
      email: app.student.email,
      direccion: app.student.address,
      
      // Datos académicos
      cursoPostulado: app.student.gradeApplied,
      colegioActual: app.student.currentSchool,
      colegioDestino: (app.student.targetSchool || 'MONTE_TABOR'),
      añoAcademico: '2025',
      
      // Estado de postulación
      estadoPostulacion: app.status,
      fechaPostulacion: app.submissionDate,
      fechaActualizacion: app.submissionDate,
      
      // Contacto principal (usar apoderado como principal)
      nombreContactoPrincipal: app.guardian?.fullName || 'No especificado',
      emailContacto: app.guardian?.email || '',
      telefonoContacto: app.guardian?.phone || '',
      relacionContacto: app.guardian?.relationship || '',
      
      // Datos de padres
      nombrePadre: app.father?.fullName,
      emailPadre: app.father?.email,
      telefonoPadre: app.father?.phone,
      profesionPadre: app.father?.profession,
      
      nombreMadre: app.mother?.fullName,
      emailMadre: app.mother?.email,
      telefonoMadre: app.mother?.phone,
      profesionMadre: app.mother?.profession,
      
      // Información académica y evaluaciones
      documentosCompletos: app.documents ? app.documents.length > 0 : false,
      cantidadDocumentos: app.documents ? app.documents.length : 0,
      evaluacionPendiente: app.status === 'PENDING' || app.status === 'UNDER_REVIEW',
      entrevistaProgramada: app.status === 'INTERVIEW_SCHEDULED',
      fechaEntrevista: app.status === 'INTERVIEW_SCHEDULED' ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() : undefined,
      
      // Observaciones
      necesidadesEspeciales: app.student.additionalNotes?.toLowerCase().includes('especial') || false,
      observaciones: app.student.additionalNotes,
      notasInternas: undefined,
      
      // Metadatos
      creadoPor: app.applicantUser?.email || 'Sistema',
      fechaCreacion: app.submissionDate
    };
  };

  const loadAdminApplications = async () => {
    try {
      setIsLoadingAdminApplications(true);
      const appsData = await applicationService.getAllApplications();

      // Load evaluations for each application
      const appsWithEvaluations = await Promise.all(
        (appsData || []).map(async (app) => {
          try {
            const evaluations = await evaluationService.getEvaluationsByApplicationId(app.id);
            return { ...app, evaluations };
          } catch (error) {
            console.error(`Error loading evaluations for application ${app.id}:`, error);
            return { ...app, evaluations: [] };
          }
        })
      );

      setAdminApplications(appsWithEvaluations);
    } catch (error) {
      console.error('Error cargando postulaciones admin:', error);
      showApplicationToast('No se pudieron cargar las postulaciones', 'error');
    } finally {
      setIsLoadingAdminApplications(false);
    }
  };

  // Mostrar toast para aplicaciones
  const showApplicationToast = (message: string, type: 'success' | 'error') => {
    setApplicationToast({ message, type });
    setTimeout(() => setApplicationToast(null), 5000);
  };

  // Manejar asignación de evaluadores
  const handleAssignEvaluator = async (applicationId: number, assignments: any[]) => {
    console.log(`handleAssignEvaluator called for application ${applicationId}`);
    console.log('Assignments to create:', assignments);

    try {
      // Usar Promise.allSettled en lugar de Promise.all para manejar errores individuales
      const promises = assignments.map(assignment =>
        evaluationService.assignSpecificEvaluation(
          applicationId,
          assignment.evaluationType,
          assignment.evaluatorId
        )
      );

      const results = await Promise.allSettled(promises);

      // Contar éxitos y fallos
      const successful = results.filter(r => r.status === 'fulfilled');
      const failed = results.filter(r => r.status === 'rejected');

      console.log(`${successful.length} evaluaciones asignadas exitosamente`);
      console.log(`${failed.length} evaluaciones fallaron`);

      if (failed.length > 0) {
        // Si alguna falló, verificar si son errores 409 (duplicado)
        const duplicateErrors = failed.filter((f: any) =>
          f.reason?.response?.status === 409
        );

        if (duplicateErrors.length > 0) {
          console.warn(`${duplicateErrors.length} evaluaciones ya existían (409 Conflict)`);
        }

        // Si todas las fallas fueron por duplicados, considerarlo como éxito parcial
        if (failed.length === duplicateErrors.length && successful.length > 0) {
          console.log('Algunas evaluaciones ya existían, pero se crearon las nuevas');
        } else if (successful.length === 0) {
          // Si ninguna se creó y no todas son duplicados, lanzar error
          const firstError = (failed[0] as any).reason;
          throw firstError;
        }
      }

      // Recargar aplicaciones para reflejar los cambios
      await loadApplications();

      // No mostrar notificación aquí, el modal ya la muestra
    } catch (error: any) {
      console.error('Error asignando evaluadores:', error);
      // Re-lanzar el error para que el modal lo maneje
      throw error;
    }
  };

  // Confirmar archivado de postulación
  const confirmArchive = (application: Application) => {
    const message = `¿Estás seguro de que deseas ARCHIVAR la postulación de ${application.student.firstName} ${application.student.lastName}?

Esta acción:
• Cerrará el proceso de admisión del estudiante
• La postulación no aparecerá en la lista activa
• Quedará archivada en el sistema para consultas futuras
• Esta acción no se puede deshacer fácilmente`;

    setArchiveDialog({
      show: true,
      application,
      message
    });
  };

  // Ejecutar archivado
  const executeArchive = async () => {
    const { application } = archiveDialog;
    if (!application) return;

    try {
      await applicationService.archiveApplication(application.id);
      showApplicationToast(`Postulación de ${application.student.firstName} ${application.student.lastName} archivada exitosamente`, 'success');
      await loadAdminApplications(); // Recargar la lista
    } catch (error: any) {
      showApplicationToast(error.message || 'Error al archivar la postulación', 'error');
    } finally {
      setArchiveDialog({ show: false, application: null, message: '' });
    }
  };

  // Funciones para manejar el modal de detalles
  const handleViewApplicationDetail = (app: Application) => {
    console.log('handleViewApplicationDetail called with app:', app);
    const postulante = transformApplicationToPostulante(app);
    console.log('Transformed postulante:', postulante);
    setSelectedPostulante(postulante);
    setIsDetailModalOpen(true);
    console.log('Modal state set to open');
  };

  const handleCloseDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedPostulante(null);
  };

  const renderSection = () => {
    switch (activeSection) {
      case 'metricas':
        return (
          <div className="space-y-6">
            <ApplicantMetricsView />
          </div>
        );

      case 'tablas':
        return (
          <div className="space-y-6">
            <AdminDataTables />
          </div>
        );


      case 'dashboard':
        return (
          <div className="space-y-6">
            {/* Welcome Card */}
            <Card className="p-6 bg-gradient-to-r from-azul-monte-tabor to-blue-600 text-white">
              <h2 className="text-2xl font-bold mb-2">
                Bienvenido/a, {user?.firstName} {user?.lastName}
              </h2>
              <p className="text-blue-100 mb-4">
                Panel de administración del sistema de admisión
              </p>
              <div className="flex gap-4">
                <Button 
                  variant="outline" 
                  className="text-white border-white hover:bg-white hover:text-azul-monte-tabor"
                  onClick={() => setActiveSection('postulaciones')}
                >
                  Ver Postulaciones
                </Button>
                <Button 
                  variant="outline" 
                  className="text-white border-white hover:bg-white hover:text-azul-monte-tabor"
                  onClick={() => setActiveSection('evaluaciones')}
                >
                  Gestionar Evaluaciones
                </Button>
              </div>
            </Card>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <Card
                className="p-4 text-center cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => {
                  setStatusFilter('all');
                  setActiveSection('postulaciones');
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setStatusFilter('all');
                    setActiveSection('postulaciones');
                  }
                }}
                aria-label={`Ver todas las postulaciones. Total: ${applications.length}`}
              >
                <FileTextIcon className="w-8 h-8 text-blue-500 mx-auto mb-2" aria-hidden="true" />
                <p className="text-2xl font-bold text-blue-600">
                  {applications.length}
                </p>
                <p className="text-sm text-gris-piedra">Total Postulaciones</p>
              </Card>

              <Card
                className="p-4 text-center cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => {
                  setStatusFilter('PENDING');
                  setActiveSection('postulaciones');
                }}
              >
                <ClockIcon className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
                <p className="text-2xl font-bold text-yellow-600">
                  {applications.filter(app => app.status === 'PENDING').length}
                </p>
                <p className="text-sm text-gris-piedra">Pendientes</p>
              </Card>

              <Card
                className="p-4 text-center cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => {
                  setStatusFilter('UNDER_REVIEW');
                  setActiveSection('postulaciones');
                }}
              >
                <FiBookOpen className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-blue-500">
                  {applications.filter(app => app.status === 'UNDER_REVIEW').length}
                </p>
                <p className="text-sm text-gris-piedra">En Revisión</p>
              </Card>

              <Card
                className="p-4 text-center cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => {
                  setStatusFilter('APPROVED');
                  setActiveSection('postulaciones');
                }}
              >
                <CheckCircleIcon className="w-8 h-8 text-green-500 mx-auto mb-2" />
                <p className="text-2xl font-bold text-green-600">
                  {applications.filter(app => app.status === 'APPROVED').length}
                </p>
                <p className="text-sm text-gris-piedra">Aprobadas</p>
              </Card>

              <Card
                className="p-4 text-center cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => {
                  setStatusFilter('REJECTED');
                  setActiveSection('postulaciones');
                }}
              >
                <FiXCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
                <p className="text-2xl font-bold text-red-600">
                  {applications.filter(app => app.status === 'REJECTED').length}
                </p>
                <p className="text-sm text-gris-piedra">Rechazadas</p>
              </Card>
            </div>
          </div>
        );

      case 'evaluaciones':
        return (
          <div className="space-y-6">
            {/* Navigation tabs for subsections */}
            <div className="flex flex-wrap gap-2">
              <Button
                variant={evaluationSubsection === 'management' ? 'primary' : 'outline'}
                onClick={() => setEvaluationSubsection('management')}
              >
                <FiList className="w-5 h-5 mr-2" />
                Gestión de Evaluaciones
              </Button>
              <Button
                variant={evaluationSubsection === 'statistics' ? 'primary' : 'outline'}
                onClick={() => setEvaluationSubsection('statistics')}
              >
                <FiBarChart2 className="w-5 h-5 mr-2" />
                Estadísticas y Análisis
              </Button>
              <Button
                variant={evaluationSubsection === 'reports' ? 'primary' : 'outline'}
                onClick={() => setEvaluationSubsection('reports')}
              >
                <FiFile className="w-5 h-5 mr-2" />
                Informes y Reportes
              </Button>
            </div>

            {/* Render appropriate subsection */}
            {evaluationSubsection === 'management' ? (
              <EvaluationManagement
                applications={applications}
                onRefresh={loadApplications}
                onAssign={handleAssignEvaluator}
              />
            ) : evaluationSubsection === 'statistics' ? (
              <EvaluationStatistics />
            ) : (
              <EvaluationReports 
                applications={applications}
                onRefresh={loadApplications}
              />
            )}
          </div>
        );

      case 'postulaciones':
        const getStatusLabel = (status: string) => {
          const labels: Record<string, string> = {
            'all': 'Todas las Postulaciones',
            'PENDING': 'Pendientes',
            'UNDER_REVIEW': 'En Revisión',
            'EXAM_SCHEDULED': 'Examen Programado',
            'INTERVIEW_SCHEDULED': 'Entrevista Programada',
            'APPROVED': 'Aprobadas',
            'REJECTED': 'Rechazadas',
            'WAITLIST': 'Lista de Espera'
          };
          return labels[status] || status;
        };

        // Usar applications del contexto si adminApplications está vacío
        const applicationsToFilter = adminApplications.length > 0 ? adminApplications : applications;

        const filteredApplications = statusFilter === 'all'
          ? applicationsToFilter
          : applicationsToFilter.filter(app => app.status === statusFilter);

        return (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-center space-x-3">
                <FileTextIcon className="w-8 h-8 text-azul-monte-tabor" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    Gestión de Postulaciones
                  </h1>
                  <p className="text-sm text-gray-600">
                    {statusFilter !== 'all' && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mr-2">
                        Filtro: {getStatusLabel(statusFilter)}
                      </span>
                    )}
                    Mostrando {filteredApplications.length} de {adminApplications.length} postulaciones
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {statusFilter !== 'all' && (
                  <Button
                    variant="outline"
                    onClick={() => setStatusFilter('all')}
                  >
                    <FiX className="w-5 h-5 mr-2" />
                    Limpiar Filtro
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={loadAdminApplications}
                  disabled={isLoadingAdminApplications}
                >
                  <FiRefreshCw className={`w-5 h-5 mr-2 ${isLoadingAdminApplications ? 'animate-spin' : ''}`} />
                  Actualizar
                </Button>
              </div>
            </div>

            {/* Estadísticas rápidas */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="p-4 text-center">
                <FileTextIcon className="w-6 h-6 text-blue-500 mx-auto mb-2" />
                <p className="text-2xl font-bold text-blue-600">
                  {applicationsToFilter.length}
                </p>
                <p className="text-sm text-gray-600">Total Activas</p>
              </Card>

              <Card className="p-4 text-center">
                <ClockIcon className="w-6 h-6 text-yellow-500 mx-auto mb-2" />
                <p className="text-2xl font-bold text-yellow-600">
                  {applicationsToFilter.filter(app => app.status === 'PENDING').length}
                </p>
                <p className="text-sm text-gray-600">Nuevas</p>
              </Card>

              <Card className="p-4 text-center">
                <CheckCircleIcon className="w-6 h-6 text-green-500 mx-auto mb-2" />
                <p className="text-2xl font-bold text-green-600">
                  {applicationsToFilter.filter(app => app.status === 'APPROVED').length}
                </p>
                <p className="text-sm text-gray-600">Aceptadas</p>
              </Card>

              <Card className="p-4 text-center">
                <UsersIcon className="w-6 h-6 text-purple-500 mx-auto mb-2" />
                <p className="text-2xl font-bold text-purple-600">
                  {applicationsToFilter.filter(app => app.status === 'UNDER_REVIEW').length}
                </p>
                <p className="text-sm text-gray-600">En Revisión</p>
              </Card>
            </div>

            {/* Tabla de postulaciones */}
            <Card className="p-6">
              <ApplicationsTable
                applications={filteredApplications}
                isLoading={isLoadingAdminApplications}
                onView={handleViewApplicationDetail}
                onArchive={confirmArchive}
                onDecision={(application) => setDecisionModal({ show: true, application })}
              />
            </Card>
          </div>
        );

      case 'usuarios':
        return (
          <div className="space-y-6">
            {/* Navigation tabs for subsections */}
            <div className="flex flex-wrap gap-2">
              <Button
                variant={userSubsection === 'staff' ? 'primary' : 'outline'}
                onClick={() => setUserSubsection('staff')}
              >
                <FiUser className="w-5 h-5 mr-2" />
                Personal del Colegio
              </Button>
              <Button
                variant={userSubsection === 'guardians' ? 'primary' : 'outline'}
                onClick={() => setUserSubsection('guardians')}
              >
                <UsersIcon className="w-5 h-5 mr-2" />
                Apoderados
              </Button>
            </div>

            {/* Render appropriate subsection */}
            {userSubsection === 'staff' ? (
              <StaffManagement onBack={() => setActiveSection('dashboard')} />
            ) : (
              <GuardianManagement onBack={() => setActiveSection('dashboard')} />
            )}
          </div>
        );

      case 'entrevistas':
        return (
          <div className="space-y-6">
            <InterviewManagement onBack={() => setActiveSection('dashboard')} />
          </div>
        );

      case 'calendario':
        return (
          <div className="space-y-6">
            <SharedCalendar
              onCreateInterview={(date, time) => {
                // Cambiar a la sección de entrevistas y abrir formulario de creación
                setActiveSection('entrevistas');
                // Aquí podrías pasar los datos de fecha/hora al componente
              }}
            />
          </div>
        );

      default:
        return (
          <Card className="p-6">
            <h2 className="text-xl font-bold text-azul-monte-tabor mb-4">
              Sección en Desarrollo
            </h2>
            <p className="text-gris-piedra">Esta sección estará disponible próximamente.</p>
          </Card>
        );
    }
  };

  const SidebarContent = ({ onNavigate }: { onNavigate?: () => void }) => (
    <>
      <div className="p-6">
        <h1 className="text-xl font-bold text-azul-monte-tabor">Panel Admin</h1>
        <p className="text-sm text-gris-piedra mt-1">{user?.firstName} {user?.lastName}</p>
      </div>
      <div className="px-4 mb-4">
        <button
          onClick={() => { setShowCoordinatorDashboard(true); onNavigate?.(); }}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-md hover:shadow-lg"
          aria-label="Abrir dashboard del coordinador con analytics y búsqueda avanzada"
        >
          <FiBarChart2 className="w-5 h-5" aria-hidden="true" />
          <div className="flex-1">
            <div className="text-sm font-semibold">Dashboard Coordinador</div>
            <div className="text-xs opacity-90">Analytics y búsqueda avanzada</div>
          </div>
        </button>
      </div>
      <nav className="px-4" aria-label="Menú de navegación principal del administrador">
        {sections.map(section => (
          <button
            key={section.key}
            onClick={() => { setActiveSection(section.key); onNavigate?.(); }}
            className={`w-full flex items-center gap-3 px-4 py-3 mb-2 rounded-lg text-left transition-colors ${
              activeSection === section.key
                ? 'bg-azul-monte-tabor text-white'
                : 'text-gris-piedra hover:bg-gray-100'
            }`}
            aria-label={`Navegar a sección ${section.label}`}
            aria-current={activeSection === section.key ? 'page' : undefined}
          >
            <span className="text-sm">{section.label}</span>
          </button>
        ))}
      </nav>
      <div className="px-4 mt-4">
        <ChangePasswordButton className="w-full" variant="outline" />
      </div>
      <div className="px-4 mt-4">
        <Button
          variant="primary"
          className="w-full bg-azul-monte-tabor hover:bg-blue-700 text-white font-medium py-3 transition-all duration-200 shadow-md hover:shadow-lg"
          onClick={() => { logout(); window.location.href = microfrontendUrls.home; }}
          ariaLabel="Cerrar sesión y volver al portal principal"
        >
          Cerrar Sesión
        </Button>
      </div>
      <div className="flex-1"></div>
    </>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile top bar */}
      <div className="md:hidden bg-white shadow-sm px-4 py-3 flex items-center justify-between sticky top-0 z-30">
        <div>
          <h1 className="text-lg font-bold text-azul-monte-tabor">Panel Admin</h1>
          <p className="text-xs text-gris-piedra">{user?.firstName} {user?.lastName}</p>
        </div>
        <button
          onClick={() => setIsSidebarOpen(prev => !prev)}
          className="p-2 rounded-lg text-gris-piedra hover:bg-gray-100 transition-colors"
          aria-label="Abrir menú de navegación"
        >
          {isSidebarOpen ? (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile overlay */}
      {isSidebarOpen && (
        <div className="md:hidden fixed inset-0 bg-black bg-opacity-40 z-40" onClick={() => setIsSidebarOpen(false)} />
      )}

      {/* Mobile sidebar drawer */}
      <div className={`md:hidden fixed top-0 left-0 h-full w-64 bg-white shadow-xl z-50 flex flex-col overflow-y-auto transform transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <SidebarContent onNavigate={() => setIsSidebarOpen(false)} />
      </div>

      <div className="flex">
        {/* Desktop Sidebar */}
        <aside className="w-64 bg-white shadow-md min-h-screen flex-col hidden md:flex sticky top-0 self-start h-screen overflow-y-auto">
          <SidebarContent />
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-4 sm:p-6 min-w-0" role="main" aria-label="Contenido principal del dashboard">
          {renderSection()}
        </main>
      </div>

      {/* Modal de confirmación para archivar postulación */}
      <Modal
        isOpen={archiveDialog.show}
        onClose={() => setArchiveDialog({ show: false, application: null, message: '' })}
        title="Archivar Postulación"
        size="md"
      >
        <div className="space-y-4">
          <div className="flex items-start space-x-3">
            <FiAlertTriangle className="w-6 h-6 text-orange-500 mt-1" />
            <p className="text-gray-700 whitespace-pre-line">{archiveDialog.message}</p>
          </div>
          
          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={() => setArchiveDialog({ show: false, application: null, message: '' })}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={executeArchive}
              className="bg-orange-600 hover:bg-orange-700"
            >
              Archivar Postulación
            </Button>
          </div>
        </div>
      </Modal>

      {/* Toast para aplicaciones */}
      {applicationToast && (
        <SimpleToast
          message={applicationToast.message}
          type={applicationToast.type}
          onClose={() => setApplicationToast(null)}
        />
      )}

      {/* Modal de detalles del estudiante */}
      <StudentDetailModal
        isOpen={isDetailModalOpen}
        onClose={handleCloseDetailModal}
        postulante={selectedPostulante}
        onEdit={(postulante) => {
          handleCloseDetailModal();
          // TODO: Implementar edición si se necesita
        }}
        onScheduleInterview={(postulante, interviewType) => {
          console.log('onScheduleInterview called with:', { postulante, interviewType });
          handleCloseDetailModal();
          setScheduleInterviewModal({
            show: true,
            postulante,
            interviewType
          });
        }}
        onUpdateStatus={(postulante, status) => {
          handleCloseDetailModal();
          // TODO: Implementar actualización de estado si se necesita
        }}
      />

      {/* Modal de decisión final */}
      <ApplicationDecisionModal
        isOpen={decisionModal.show}
        onClose={() => setDecisionModal({ show: false, application: null })}
        application={decisionModal.application}
        onDecisionMade={() => {
          loadAdminApplications();
          setApplicationToast({
            message: 'Decisión registrada exitosamente',
            type: 'success'
          });
        }}
      />

      {/* Modal de programación de entrevista */}
      <Modal
        isOpen={scheduleInterviewModal.show}
        onClose={() => {
          if (!isSchedulingInterview) {
            setScheduleInterviewModal({ show: false, postulante: null, interviewType: undefined });
          }
        }}
        title="Programar Entrevista"
        size="xl"
      >
        <div className="p-6">
          {scheduleInterviewModal.postulante && (
            <InterviewForm
              interview={{
                applicationId: scheduleInterviewModal.postulante.id,
                type: scheduleInterviewModal.interviewType || InterviewType.FAMILY,
                studentName: scheduleInterviewModal.postulante.nombreCompleto,
                parentNames: `${scheduleInterviewModal.postulante.nombrePadre || 'N/A'} / ${scheduleInterviewModal.postulante.nombreMadre || 'N/A'}`,
                gradeApplied: scheduleInterviewModal.postulante.cursoPostulado,
                status: 'SCHEDULED' as any,
                interviewerId: 0,
                interviewerName: '',
                mode: 'IN_PERSON' as any,
                scheduledDate: '',
                scheduledTime: '',
                duration: 30,
                followUpRequired: false,
                createdAt: new Date().toISOString(),
                id: 0
              }}
              mode={InterviewFormMode.CREATE}
              onSubmit={async (data) => {
                try {
                  setIsSchedulingInterview(true);
                  console.log('Submitting interview data:', data);

                  await interviewService.createInterview(data as any);

                  setApplicationToast({
                    message: `Entrevista programada exitosamente para ${scheduleInterviewModal.postulante?.nombreCompleto}`,
                    type: 'success'
                  });

                  setScheduleInterviewModal({ show: false, postulante: null, interviewType: undefined });
                  await loadAdminApplications(); // Reload to show updated interview status
                } catch (error: any) {
                  console.error('Error scheduling interview:', error);
                  setApplicationToast({
                    message: error.message || 'Error al programar la entrevista',
                    type: 'error'
                  });
                } finally {
                  setIsSchedulingInterview(false);
                }
              }}
              onCancel={() => {
                if (!isSchedulingInterview) {
                  setScheduleInterviewModal({ show: false, postulante: null, interviewType: undefined });
                }
              }}
              isSubmitting={isSchedulingInterview}
            />
          )}
        </div>
      </Modal>

      {/* Coordinator Dashboard Modal */}
      <CoordinatorDashboardModal
        isOpen={showCoordinatorDashboard}
        onClose={() => setShowCoordinatorDashboard(false)}
      />
    </div>
  );
};

export default AdminDashboard;