import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../../../packages/shared-ui/src/components/ui/ConfirmDialog';
import { UsersIcon, BarChartIcon, LogoIcon, ClipboardDocumentListIcon, AcademicCapIcon } from '../components/icons/Icons';
import GradeAvailabilityManager from '../components/gradeAvailability/GradeAvailabilityManager';
import {
  FiFileText,
  FiUsers,
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
  FiSearch,
  FiMessageSquare
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
import EvaluationReports from '../components/admin/EvaluationReports';
import { StaffManagement } from '../components/users';
import { InterviewManagement } from '../components/interviews';
import ApplicantMetricsView from '../components/admin/ApplicantMetricsView';
import { Application, applicationService } from '../services/applicationService';
import CoordinatorDashboardModal from '../components/modals/CoordinatorDashboardModal';
// Mock service removido - usando applicationService real
import { useAuth } from '../context/AuthContext';
import ApplicationsTable from '../components/admin/ApplicationsTable';
import SimpleToast from '../components/ui/SimpleToast';
import AdminDataTables from '../components/admin/AdminDataTables';
import StudentDetailModal from '../components/admin/StudentDetailModal';
import ApplicationDecisionModal from '../components/admin/ApplicationDecisionModal';
import InterviewForm from '../components/interviews/InterviewForm';
import { InterviewFormMode, InterviewType } from '../types/interview';
import interviewService from '../services/interviewService';
import InterviewCommandCenter from '../components/dashboard/InterviewCommandCenter';
import InterviewerPairManagement from '../components/users/InterviewerPairManagement';

const AdmissionReportTabs = React.lazy(() =>
  import('../components/admissionReports/AdmissionReportTabs')
    .then((module) => ({ default: module.AdmissionReportTabs }))
);

const PrekinderOperations = React.lazy(() =>
  import('../../prekinder/pages/PrekinderOperations')
    .then((module) => ({ default: module.PrekinderOperations }))
);

const sections = [
  { key: 'postulaciones', label: 'Gestión de Postulaciones', icon: ClipboardDocumentListIcon },
  { key: 'evaluaciones',  label: 'Gestión de Evaluaciones',  icon: AcademicCapIcon },
  { key: 'entrevistas',   label: 'Gestión de Entrevistas',   icon: FiMessageSquare },
  { key: 'calendario',    label: 'Calendario Global',         icon: FiCalendar },
  { key: 'usuarios',       label: 'Gestión de Usuarios',      icon: UsersIcon },
  { key: 'vacantes',       label: 'Gestión de Vacantes',      icon: FiBookOpen },
];

interface SidebarContentProps {
  user: { firstName?: string; lastName?: string } | null;
  activeSection: string;
  onSectionChange: (key: string) => void;
  onShowCoordinator: () => void;
  onLogout: () => void;
  onNavigate?: () => void;
}

const SidebarContent = React.memo(function SidebarContent({
  user,
  activeSection,
  onSectionChange,
  onShowCoordinator,
  onLogout,
  onNavigate,
}: SidebarContentProps) {
  return (
    <>
      <div className="p-6 text-center">
        <LogoIcon className="mx-auto w-16 h-16 sm:w-24 sm:h-24 flex-shrink-0" />
        <h1 className="text-xl font-bold text-azul-monte-tabor">Panel Admin</h1>
        <p className="text-sm text-gris-piedra mt-1">{user?.firstName} {user?.lastName}</p>
      </div>
      <nav className="px-4" aria-label="Menú de navegación principal del administrador">
        <button
          onClick={() => { onSectionChange('admissionReports'); onNavigate?.(); }}
          className="w-full flex items-center gap-3 px-4 py-3 mb-2 rounded-lg text-left transition-colors bg-azul-monte-tabor hover:bg-blue-900 text-white shadow-sm"
          aria-label="Navegar a Admisión"
          aria-current={activeSection === 'admissionReports' ? 'page' : undefined}
        >
          <BarChartIcon className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
          <div className="flex-1">
            <div className="text-sm font-semibold">Admisión</div>
            <div className="text-xs opacity-90">Reportes y gestión</div>
          </div>
        </button>
        <div className="my-4 border-y border-gray-200 py-4">
          <p className="mb-2 px-2 text-[11px] font-bold uppercase tracking-wider text-gris-piedra">
            Proceso independiente
          </p>
          <button
            onClick={() => { onSectionChange('prekinder'); onNavigate?.(); }}
            className={`flex min-h-14 w-full items-center gap-3 rounded-lg border px-3 py-3 text-left transition-colors ${
              activeSection === 'prekinder'
                ? 'border-azul-monte-tabor bg-azul-monte-tabor text-white'
                : 'border-blue-200 bg-blue-50 text-azul-monte-tabor hover:border-azul-monte-tabor'
            }`}
            aria-label="Administrar el proceso independiente de Prekínder"
            aria-current={activeSection === 'prekinder' ? 'page' : undefined}
          >
            <AcademicCapIcon className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
            <span className="min-w-0">
              <span className="block text-sm font-bold">Prekínder</span>
              <span className={`block text-xs leading-4 ${activeSection === 'prekinder' ? 'text-blue-100' : 'text-blue-800'}`}>
                Etapas, jornadas y decisiones
              </span>
            </span>
          </button>
        </div>
        {sections.map(section => {
          const Icon = section.icon;
          return (
            <button
              key={section.key}
              onClick={() => {
                onSectionChange(section.key);
                onNavigate?.();
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 mb-2 rounded-lg text-left transition-colors ${
                activeSection === section.key
                  ? 'bg-azul-monte-tabor text-white'
                  : 'text-gris-piedra hover:bg-gray-100'
              }`}
              aria-label={`Navegar a ${section.label}`}
              aria-current={activeSection === section.key ? 'page' : undefined}
            >
              <Icon className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
              <span className="text-sm">{section.label}</span>
            </button>
          );
        })}
      </nav>
      <div className="px-4 mt-auto pb-6 flex flex-col gap-3">
        <ChangePasswordButton className="w-full" variant="outline" />
        <Button
          variant="outline"
          className="w-full"
          onClick={onLogout}
          ariaLabel="Cerrar sesión y salir del panel de administración"
        >
          Cerrar Sesión
        </Button>
      </div>
    </>
  );
});

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeSection, setActiveSection] = useState(
    () => searchParams.get('section') === 'prekinder' ? 'prekinder' : 'admissionReports'
  );
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
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
  const [userSubsection, setUserSubsection] = useState<'staff' | 'pairs'>('staff');

  // Coordinator Dashboard Modal state
  const [showCoordinatorDashboard, setShowCoordinatorDashboard] = useState(false);

  // Mobile sidebar state
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Estados para aplicaciones reales
  const { applications } = useApplications();
  const { addNotification } = useNotifications();
  const { user, logout } = useAuth();
  const { dispatch } = useAppContext();

  // Overlay global de carga de página
  const [isPageLoading, setIsPageLoading] = useState(false);

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
  const [interviewToOpenId, setInterviewToOpenId] = useState<number | null>(null);


  // Carga inicial: solo dashboard necesita aplicaciones y usuarios
  useEffect(() => {
    if (activeSection !== 'prekinder') {
      loadApplications();
      loadUsers();
    }
  }, []);

  // Carga por sección: cada sección carga lo que necesita al entrar
  useEffect(() => {
    if (activeSection === 'postulaciones') {
      loadAdminApplications();
    } else if (activeSection === 'evaluaciones') {
      loadApplications();
    } else if (activeSection === 'usuarios') {
      loadUsers();
    }
  }, [activeSection]);

  const loadApplications = async () => {
    try {
      setIsPageLoading(true);
      dispatch({ type: 'SET_LOADING', payload: true });
      // Use the applicationService which handles the API calls properly
      const applications = await applicationService.getAllApplications();

      // Load evaluations for each application
      const applicationsWithEvaluations = await Promise.all(
        applications.map(async (app) => {
          try {
            // 
            const evaluations = await evaluationService.getEvaluationsByApplicationId(app.id);
            // 

            // Log detalles de evaluaciones académicas
            const academicEvals = evaluations.filter(e =>
              e.evaluationType === 'MATHEMATICS_EXAM' ||
              e.evaluationType === 'LANGUAGE_EXAM' ||
              e.evaluationType === 'ENGLISH_EXAM'
            );
            // 

            return { ...app, evaluations };
          } catch (error) {
            return { ...app, evaluations: [] };
          }
        })
      );


      dispatch({ type: 'SET_APPLICATIONS', payload: applicationsWithEvaluations });
    } catch (error) {
      // applicationService already handles fallbacks, but set empty array if it fails completely
      dispatch({ type: 'SET_APPLICATIONS', payload: [] });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
      setIsPageLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      setIsLoadingUsers(true);
      const usersData = await userService.getSchoolStaffUsersPublic();
      // userService devuelve PagedResponse, necesitamos solo el contenido (solo staff del colegio)
      setUsers(usersData.content || []);
    } catch (error) {
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

    const birthDate = new Date(app.student.birthDate);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear() -
               (today.getMonth() < birthDate.getMonth() ||
                (today.getMonth() === birthDate.getMonth() && today.getDate() < birthDate.getDate()) ? 1 : 0);

    const nombreCompleto = `${app.student.firstName} ${app.student.paternalLastName || app.student.lastName} ${app.student.maternalLastName || ''}`.trim();

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
      colegioDestino: app.student.gender || null,
      añoAcademico: (app as any).applicationYear?.toString() || (new Date().getFullYear() + 1).toString(),
      
      // Estado de postulación
      estadoPostulacion: app.status,
      estadoPago: app.paymentStatus,
      pagoRequerido: app.paymentRequired,
      fechaPago: app.paidAt,
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

      nombreMadre: app.mother?.fullName,
      emailMadre: app.mother?.email,
      telefonoMadre: app.mother?.phone,

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
            return { ...app, evaluations: [] };
          }
        })
      );

      setAdminApplications(appsWithEvaluations);
    } catch (error) {
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


      if (failed.length > 0) {
        // Si alguna falló, verificar si son errores 409 (duplicado)
        const duplicateErrors = failed.filter((f: any) =>
          f.reason?.response?.status === 409
        );

        if (duplicateErrors.length > 0) {
        }

        // Si todas las fallas fueron por duplicados, considerarlo como éxito parcial
        if (failed.length === duplicateErrors.length && successful.length > 0) {
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
    const postulante = transformApplicationToPostulante(app);
    setSelectedPostulante(postulante);
    setIsDetailModalOpen(true);
  };

  const handleCloseDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedPostulante(null);
  };

  useEffect(() => {
    const requestedSection = searchParams.get('section');
    if (requestedSection === 'admision') {
      setActiveSection('admissionReports');
    } else if (requestedSection === 'prekinder') {
      setActiveSection('prekinder');
    } else if (activeSection === 'prekinder') {
      setActiveSection('admissionReports');
    }
  }, [searchParams]);

  const handleSectionChange = (key: string) => {
    setInterviewToOpenId(null);
    setActiveSection(key);

    const next = new URLSearchParams(searchParams);
    if (key === 'admissionReports') {
      next.set('section', 'admision');
    } else if (key === 'prekinder') {
      next.set('section', 'prekinder');
      ['year', 'grade', 'status', 'action'].forEach((parameter) => next.delete(parameter));
    } else {
      ['section', 'year', 'grade', 'status', 'action'].forEach((parameter) => next.delete(parameter));
    }
    setSearchParams(next);
  };

  const renderSection = () => {
    switch (activeSection) {
      case 'metricas':
        return (
          <div className="space-y-6">
            <ApplicantMetricsView />
          </div>
        );

      case 'admissionReports':
        return (
          <React.Suspense fallback={<div className="h-64 animate-pulse rounded-2xl border border-slate-200 bg-white" role="status" aria-label="Cargando Admisión" />}>
            <div className="space-y-6">
              <AdmissionReportTabs />
            </div>
          </React.Suspense>
        );

      case 'prekinder':
        return (
          <React.Suspense
            fallback={
              <div
                className="h-64 animate-pulse rounded-2xl border border-blue-100 bg-blue-50"
                role="status"
                aria-label="Cargando administración Prekínder"
              />
            }
          >
            <PrekinderOperations embedded />
          </React.Suspense>
        );

      case 'vacantes':
        return (
          <div className="space-y-5">
            <section className="flex flex-col gap-4 border-b border-gray-200 pb-5">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-600">Gestión de Vacantes</p>
                <p className="mt-1 max-w-3xl text-sm text-gray-600">Configura qué niveles tienen vacantes disponibles para los postulantes</p>
              </div>
            </section>
            <GradeAvailabilityManager />
          </div>
        );

      case 'dashboard':
        return (
          <div className="space-y-6">
            <InterviewCommandCenter
              onNavigateToInterviews={(interviewId) => {
                setInterviewToOpenId(interviewId ?? null);
                setActiveSection('entrevistas');
              }}
            />
          </div>
        );

      case 'evaluaciones':
        return (
          <div className="space-y-5">
            <section className="flex flex-col gap-4 border-b border-gray-200 pb-5">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-600">Gestión de Evaluaciones</p>
                <p className="mt-1 max-w-3xl text-sm text-gray-600">
                  Administra y supervisa las evaluaciones del proceso de admisión.
                </p>
              </div>
              <div className="inline-flex self-start gap-2" aria-label="Vista de evaluaciones">
                <button
                  type="button"
                  onClick={() => setEvaluationSubsection('management')}
                  aria-pressed={evaluationSubsection === 'management'}
                  className={`inline-flex min-h-11 items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-blue-200 ${
                    evaluationSubsection === 'management'
                      ? 'bg-white text-gray-950 ring-1 ring-gray-200'
                      : 'text-gray-600 hover:text-gray-950'
                  }`}
                >
                  <FiList className="h-4 w-4" aria-hidden="true" />
                  Gestión de Evaluaciones
                </button>
                <button
                  type="button"
                  onClick={() => setEvaluationSubsection('reports')}
                  aria-pressed={evaluationSubsection === 'reports'}
                  className={`inline-flex min-h-11 items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-blue-200 ${
                    evaluationSubsection === 'reports'
                      ? 'bg-white text-gray-950 ring-1 ring-gray-200'
                      : 'text-gray-600 hover:text-gray-950'
                  }`}
                >
                  <FiFile className="h-4 w-4" aria-hidden="true" />
                  Informes y Reportes
                </button>
              </div>
            </section>
            {evaluationSubsection === 'management' ? (
              <EvaluationManagement
                applications={applications}
                onRefresh={loadApplications}
                onAssign={handleAssignEvaluator}
                hideHeader
              />
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
          <div className="space-y-5">
            {/* Encabezado */}
            <section className="flex flex-col gap-4 border-b border-gray-200 pb-5">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-600">Gestión de Postulaciones</p>
                <p className="mt-1 max-w-3xl text-sm text-gray-600">Seguimiento y gestión de las postulaciones del proceso de admisión</p>
              </div>
            </section>

            {/* KPIs */}
            <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Resumen de postulaciones">
              <div className="min-w-[148px] rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-blue-700">
                <div className="flex items-center gap-2">
                  <FiFileText className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                  <p className="min-w-0 truncate text-xs font-semibold">Total Activas</p>
                  <p className="ml-auto text-lg font-bold leading-none">{applicationsToFilter.length}</p>
                </div>
              </div>
              <div className="min-w-[132px] rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-700">
                <div className="flex items-center gap-2">
                  <FiClock className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                  <p className="min-w-0 truncate text-xs font-semibold">Nuevas</p>
                  <p className="ml-auto text-lg font-bold leading-none">{applicationsToFilter.filter(app => app.status === 'PENDING').length}</p>
                </div>
              </div>
              <div className="min-w-[132px] rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-700">
                <div className="flex items-center gap-2">
                  <FiCheckCircle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                  <p className="min-w-0 truncate text-xs font-semibold">Aceptadas</p>
                  <p className="ml-auto text-lg font-bold leading-none">{applicationsToFilter.filter(app => app.status === 'APPROVED').length}</p>
                </div>
              </div>
              <div className="min-w-[148px] rounded-lg border border-purple-200 bg-purple-50 px-3 py-2 text-purple-700">
                <div className="flex items-center gap-2">
                  <FiUsers className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                  <p className="min-w-0 truncate text-xs font-semibold">En Revisión</p>
                  <p className="ml-auto text-lg font-bold leading-none">{applicationsToFilter.filter(app => app.status === 'UNDER_REVIEW').length}</p>
                </div>
              </div>
            </div>

            {/* Acciones */}
            <div className="flex flex-wrap justify-end gap-2">
              {statusFilter !== 'all' && (
                <button
                  type="button"
                  onClick={() => setStatusFilter('all')}
                  className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-100"
                >
                  <FiX className="h-4 w-4" aria-hidden="true" />
                  Limpiar filtro{statusFilter !== 'all' && `: ${getStatusLabel(statusFilter)}`}
                </button>
              )}
              <button
                type="button"
                onClick={loadAdminApplications}
                disabled={isLoadingAdminApplications}
                className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:opacity-60"
              >
                <FiRefreshCw className={`h-4 w-4 ${isLoadingAdminApplications ? 'animate-spin motion-reduce:animate-none' : ''}`} aria-hidden="true" />
                Actualizar
              </button>
            </div>

            <ApplicationsTable
              applications={filteredApplications}
              isLoading={isLoadingAdminApplications}
              onView={handleViewApplicationDetail}
              onArchive={confirmArchive}
              onDecision={(application) => setDecisionModal({ show: true, application })}
            />
          </div>
        );

      case 'usuarios':
        return (
          <div className="space-y-5">
            <section className="flex flex-col gap-4 border-b border-gray-200 pb-5">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-600">Gestión de Usuarios</p>
                <p className="mt-1 max-w-3xl text-sm text-gray-600">Administra el personal y las parejas de entrevistas.</p>
              </div>
              <div className="inline-flex self-start gap-2" aria-label="Vista de usuarios">
                <button
                  type="button"
                  onClick={() => setUserSubsection('staff')}
                  aria-pressed={userSubsection === 'staff'}
                  className={`inline-flex min-h-11 items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-blue-200 ${
                    userSubsection === 'staff'
                      ? 'bg-white text-gray-950 ring-1 ring-gray-200'
                      : 'text-gray-600 hover:text-gray-950'
                  }`}
                >
                  <FiUser className="h-4 w-4" aria-hidden="true" />
                  Personal del Colegio
                </button>
                <button
                  type="button"
                  onClick={() => setUserSubsection('pairs')}
                  aria-pressed={userSubsection === 'pairs'}
                  className={`inline-flex min-h-11 items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-blue-200 ${
                    userSubsection === 'pairs'
                      ? 'bg-white text-gray-950 ring-1 ring-gray-200'
                      : 'text-gray-600 hover:text-gray-950'
                  }`}
                >
                  <FiUsers className="h-4 w-4" aria-hidden="true" />
                  Parejas Director + Psicólogo
                </button>
              </div>
            </section>
            {userSubsection === 'staff' && <StaffManagement hideHeader />}
            {userSubsection === 'pairs' && <InterviewerPairManagement />}
          </div>
        );

      case 'entrevistas':
        return (
          <div className="space-y-6">
            <InterviewManagement
              onBack={() => setActiveSection('dashboard')}
              initialInterviewId={interviewToOpenId}
            />
          </div>
        );

      case 'calendario':
        return (
          <div className="space-y-6">
            <InterviewCommandCenter
              onNavigateToInterviews={(interviewId) => {
                setInterviewToOpenId(interviewId ?? null);
                setActiveSection('entrevistas');
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

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gray-50">
      {/* Overlay global de carga */}
      {isPageLoading && (
        <div className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-2xl px-10 py-8 flex flex-col items-center gap-4 min-w-[200px]">
            <div className="w-12 h-12 border-4 border-azul-monte-tabor border-t-transparent rounded-full animate-spin"></div>
            <p className="text-azul-monte-tabor font-semibold text-base">Cargando...</p>
          </div>
        </div>
      )}
      {/* Mobile top bar */}
      <div className="md:hidden bg-white shadow-sm px-4 py-3 flex items-center justify-between z-30">
        <div>
          <h1 className="text-lg font-bold text-azul-monte-tabor">Panel Admin</h1>
          <p className="text-xs text-gris-piedra">{user?.firstName} {user?.lastName}</p>
        </div>
        <button
          onClick={() => setIsSidebarOpen(prev => !prev)}
          className="p-2.5 min-w-[44px] min-h-[44px] rounded-lg text-gris-piedra hover:bg-gray-100 transition-colors"
          aria-expanded={isSidebarOpen}
          aria-controls="mobile-sidebar"
          aria-label={isSidebarOpen ? 'Cerrar menú de navegación' : 'Abrir menú de navegación'}
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
      <div
        id="mobile-sidebar"
        aria-hidden={!isSidebarOpen}
        inert={!isSidebarOpen}
        className={`md:hidden fixed top-0 left-0 h-full w-64 bg-white shadow-xl z-50 flex flex-col overflow-y-auto transform transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <SidebarContent
          user={user}
          activeSection={activeSection}
          onSectionChange={handleSectionChange}
          onShowCoordinator={() => setShowCoordinatorDashboard(true)}
          onLogout={logout}
          onNavigate={() => setIsSidebarOpen(false)}
        />
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Sidebar */}
        <aside className="w-64 bg-white shadow-md flex-col hidden md:flex overflow-y-auto">
          <SidebarContent
            user={user}
            activeSection={activeSection}
            onSectionChange={handleSectionChange}
            onShowCoordinator={() => setShowCoordinatorDashboard(true)}
            onLogout={logout}
          />
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-4 sm:p-6 min-w-0 overflow-y-auto" role="main" aria-label="Contenido principal del dashboard">
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
        onRefresh={loadApplications}
        onEdit={(postulante) => {
          handleCloseDetailModal();
          // TODO: Implementar edición si se necesita
        }}
        onScheduleInterview={(postulante, interviewType) => {
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
                duration: 60,
                followUpRequired: false,
                createdAt: new Date().toISOString(),
                id: 0
              }}
              mode={InterviewFormMode.CREATE}
              onSubmit={async (data) => {
                try {
                  setIsSchedulingInterview(true);

                  const interview = await interviewService.createInterview(data as any);

                  // Enviar invitación por email automáticamente
                  try {
                    await interviewService.sendInterviewInvitation(interview.id);
                  } catch (emailError) {
                    // No fallar si el email no se envía, solo loggear el error
                    console.warn('No se pudo enviar la invitación por email:', emailError);
                  }

                  setApplicationToast({
                    message: `Entrevista programada exitosamente para ${scheduleInterviewModal.postulante?.nombreCompleto}`,
                    type: 'success'
                  });

                  setScheduleInterviewModal({ show: false, postulante: null, interviewType: undefined });
                  await loadAdminApplications(); // Reload to show updated interview status
                } catch (error: any) {
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

      <ConfirmDialog
        isOpen={showLogoutConfirm}
        title="Cerrar sesión"
        message="¿Está seguro que desea cerrar sesión?"
        confirmText="Sí, cerrar sesión"
        cancelText="Cancelar"
        variant="danger"
        onConfirm={() => {
          setShowLogoutConfirm(false);
          logout();
        }}
        onClose={() => setShowLogoutConfirm(false)}
      />
    </div>
  );
};

export default AdminDashboard;
