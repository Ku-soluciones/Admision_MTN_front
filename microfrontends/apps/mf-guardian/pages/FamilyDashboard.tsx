import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import SimpleToast from '../components/ui/SimpleToast';
import { ApplicationStatus, Document } from '../types';
import { DOCUMENT_TYPE_LABELS, DocumentType } from '../types/document';
import { CheckCircleIcon, ClockIcon, FileTextIcon, XCircleIcon, CalendarIcon, UsersIcon, LogoIcon } from '../components/icons/Icons';
import { 
  FiFileText, 
  FiBarChart2, 
  FiFile, 
  FiKey, 
  FiMail, 
  FiAlertTriangle,
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
  FiLogOut,
  FiCreditCard
} from 'react-icons/fi';
import { useApplications } from '../context/AppContext';
import { auth } from '../src/lib/firebase';
import { microfrontendUrls } from '../utils/microfrontendUrls';
import { applicationService, Application } from '../services/applicationService';
import { useAuth } from '../context/AuthContext';
import useUserProfile from '../hooks/useUserProfile';
import applicationWorkflowService, { type ApplicationDraft } from '../services/applicationWorkflowService';
import { documentService } from '../services/documentService';
import FamilyInterviews from '../components/family/FamilyInterviews';
import FamilyCalendar from '../components/family/FamilyCalendar';
import ComplementaryApplicationForm from './ComplementaryApplicationForm';

const sections = [
  { key: 'resumen', label: 'Resumen de Postulación' },
  { key: 'datos', label: 'Datos del Postulante y Apoderados' },
  { key: 'documentos', label: 'Documentos' },
  { key: 'ayuda', label: 'Ayuda y Soporte' },
];

const getStatusColor = (status: ApplicationStatus) => {
    switch (status) {
        case ApplicationStatus.ACCEPTED: return 'bg-verde-esperanza text-blanco-pureza';
        case ApplicationStatus.REJECTED: return 'bg-rojo-sagrado text-blanco-pureza';
        case ApplicationStatus.WAITLIST: return 'bg-dorado-nazaret text-blanco-pureza';
        case ApplicationStatus.SUBMITTED:
        case ApplicationStatus.INTERVIEW_SCHEDULED:
            return 'bg-blue-200 text-azul-monte-tabor';
        default: return 'bg-gray-200 text-gris-piedra';
    }
};

const getDocumentStatusIcon = (status: Document['status']) => {
    switch(status) {
        case 'approved': return <CheckCircleIcon className="w-5 h-5 text-verde-esperanza" />;
        case 'submitted': return <ClockIcon className="w-5 h-5 text-blue-500" />;
        case 'rejected': return <XCircleIcon className="w-5 h-5 text-rojo-sagrado" />;
        default: return <FileTextIcon className="w-5 h-5 text-gris-piedra" />;
    }
};


const FamilyDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('resumen');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [realApplications, setRealApplications] = useState<Application[]>([]);
  const [selectedApplicationIndex, setSelectedApplicationIndex] = useState(0);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [paymentLoadingId, setPaymentLoadingId] = useState<number | null>(null);

  // Function to download/view document
  const handleViewDocument = async (documentId: number, documentName: string) => {
    const viewer = window.open('', '_blank');

    try {
      const blob = await documentService.viewDocument(documentId);
      const url = window.URL.createObjectURL(blob);

      if (viewer) {
        viewer.location.href = url;
      } else {
        window.open(url, '_blank');
      }

      window.setTimeout(() => window.URL.revokeObjectURL(url), 60_000);
    } catch (error: any) {
      viewer?.close();
      setToast({ message: error.message || `No se pudo abrir el documento ${documentName || ''}`.trim(), type: 'error' });
    }
  };
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const { applications } = useApplications();
  const { user, isAuthenticated, logout } = useAuth();
  const { profile, loading: profileLoading, error: profileError } = useUserProfile();
  
  // Load real applications on component mount
  useEffect(() => {
    let isMounted = true;

    const loadApplications = async () => {
      if (!isAuthenticated || !user) {
        if (isMounted) setIsLoading(false);
        return;
      }

      try {
        if (isMounted) setIsLoading(true);
        const dashboardData = await applicationService.getDashboardData();

        if (!isMounted) return; // Evitar actualización si el componente se desmontó

        // Validar que applications sea un array
        if (dashboardData && Array.isArray(dashboardData.applications)) {
          setRealApplications(dashboardData.applications);
          setError(null);
        } else {
          setRealApplications([]);
          setError('Formato de datos inválido del servidor');
        }
      } catch (error: any) {
        if (isMounted) {
          setError('Error al cargar los datos del dashboard');
          setRealApplications([]);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadApplications();

    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, user]);

  // Load documents when application is available
  useEffect(() => {
    let isMounted = true;

    const loadDocuments = async () => {
      if (!hasRealApplication || !realApplications[0]?.id) return;

      try {
        if (isMounted) setLoadingDocuments(true);
        const response = await applicationService.getApplicationDocuments(realApplications[0].id);

        if (isMounted) {
          setDocuments(response.data || []);
        }
      } catch (error) {
        if (isMounted) setDocuments([]);
      } finally {
        if (isMounted) setLoadingDocuments(false);
      }
    };

    loadDocuments();

    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, [realApplications]);

  // Use real applications if available, otherwise fallback to context or mock data
  const hasRealApplication = Array.isArray(realApplications) && realApplications.length > 0;
  const myApplication = hasRealApplication
    ? realApplications[selectedApplicationIndex]
    : (applications.length > 0 ? applications[0] : null);
  const payableApplications = realApplications.filter(app => app.canFillComplementaryForm && !app.hasComplementaryForm);
  const hasComplementaryFormAccess = payableApplications.length > 0;
  const visibleSections = sections;

  // Navega a mf-admissions pasando el idToken para evitar re-login cross-origin
  const navigateToAdmissions = async (path = '/postulacion') => {
    try {
      const token = auth?.currentUser ? await auth.currentUser.getIdToken() : null;
      const base = path === '/postulacion' ? microfrontendUrls.admissions : microfrontendUrls.admissionsComplementary;
      const url = token ? `${base}${base.includes('?') ? '&' : '?'}mf_token=${encodeURIComponent(token)}` : base;
      window.location.href = url;
    } catch {
      window.location.href = microfrontendUrls.admissions;
    }
  };

  // Handler for adding another child (navigate to form with family data pre-filled)
  const handleAddAnotherChild = () => {
    navigateToAdmissions('/postulacion');
  };

  const handlePayApplication = async (applicationId: number) => {
    try {
      setPaymentLoadingId(applicationId);
      const payment = await applicationService.startPaymentCheckout(applicationId);
      setRealApplications(prev => prev.map(app => app.id === applicationId
        ? { ...app, paymentStatus: payment.paymentStatus, paidAt: payment.paidAt, canFillComplementaryForm: payment.canFillComplementaryForm }
        : app
      ));
      if (payment.checkoutUrl) {
        window.location.href = payment.checkoutUrl;
      } else if (payment.paymentStatus === 'PAID') {
        setToast({ message: 'La postulación ya se encuentra pagada', type: 'success' });
      }
    } catch (error: any) {
      setToast({ message: error.message || 'No se pudo iniciar el pago', type: 'error' });
    } finally {
      setPaymentLoadingId(null);
    }
  };

  const renderSection = () => {
    switch (activeSection) {
      case 'resumen':
        return (
          <div className="space-y-6">

            {/* Sección de Nueva Postulación o Resumen */}
            {!hasRealApplication ? (
              <Card className="p-8 text-center bg-gradient-to-br from-green-50 to-blue-50 border-2 border-dashed border-azul-monte-tabor">
                <div className="max-w-md mx-auto">
                  <FileTextIcon className="w-16 h-16 text-azul-monte-tabor mx-auto mb-4" />
                  <h2 className="text-2xl font-bold text-azul-monte-tabor mb-3">
                    {isLoading ? 'Cargando...' : '¡Inicie su Postulación!'}
                  </h2>
                  <p className="text-gris-piedra mb-6">
                    {isLoading 
                      ? 'Obteniendo información de su postulación...' 
                      : 'Aún no tiene una postulación registrada. Comience el proceso de admisión para su hijo/a completando el formulario de postulación.'
                    }
                  </p>
                  {!isLoading && (
                    <Button variant="primary" size="lg" className="w-full" onClick={() => navigateToAdmissions()}>
                      Crear Nueva Postulación
                    </Button>
                  )}
                  {isLoading && (
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-azul-monte-tabor"></div>
                      <span className="text-azul-monte-tabor">Cargando...</span>
                    </div>
                  )}
                </div>
              </Card>
            ) : (
              <div className="space-y-6">
                {/* Lista de Hijos Postulantes */}
                <Card className="p-6">
                  {/* Estadísticas de postulaciones */}
                  {Array.isArray(realApplications) && realApplications.length > 1 && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                        <div className="text-center p-4 bg-blue-50 rounded-lg">
                          <p className="text-2xl font-bold text-azul-monte-tabor">{realApplications.length}</p>
                          <p className="text-sm text-gris-piedra">Total Postulaciones</p>
                        </div>
                        <div className="text-center p-4 bg-green-50 rounded-lg">
                          <p className="text-2xl font-bold text-verde-esperanza">
                            {realApplications.filter(app => app.status === 'APPROVED').length}
                          </p>
                          <p className="text-sm text-gris-piedra">Aprobadas</p>
                        </div>
                        <div className="text-center p-4 bg-yellow-50 rounded-lg">
                          <p className="text-2xl font-bold text-dorado-nazaret">
                            {realApplications.filter(app => ['PENDING', 'UNDER_REVIEW'].includes(app.status)).length}
                          </p>
                          <p className="text-sm text-gris-piedra">En Proceso</p>
                        </div>
                      </div>
                  )}
                  <br/>
                  <div className="flex justify-between items-center mb-4  pt-4 border-t border-gray-200">
                    <h2 className="text-xl font-bold text-azul-monte-tabor">Mis postulaciones</h2>
                    <Button
                        variant="success"
                      size="sm"
                      onClick={handleAddAnotherChild}
                      className="flex items-center gap-2"
                    >
                      <FiPlus className="w-4 h-4" />
                      Postular otro hijo
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 gap-4 mb-4">
                    {realApplications.map((app, index) => (
                      <div
                        key={app.id}
                        onClick={() => setSelectedApplicationIndex(index)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') setSelectedApplicationIndex(index);
                        }}
                        className={`p-4 rounded-lg border-2 transition-all text-left ${
                          selectedApplicationIndex === index
                            ? 'border-azul-monte-tabor bg-blue-50'
                            : 'border-gray-200 bg-white hover:border-azul-monte-tabor hover:bg-blue-50'
                        }`}
                      >
                        <div className="flex items-center gap-4 flex-wrap">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <FiUser className="w-5 h-5 text-azul-monte-tabor flex-shrink-0" />
                            <span className="font-semibold text-azul-monte-tabor truncate">
                              {app.student.firstName} {app.student.lastName}
                            </span>
                          </div>
                          <span className="text-sm text-gris-piedra whitespace-nowrap">
                            <strong>Nivel:</strong> {app.student.gradeApplied}
                          </span>
                          <Badge
                            variant={
                              app.status === 'APPROVED' ? 'success' :
                              app.status === 'REJECTED' ? 'error' :
                              app.status === 'WAITLIST' ? 'warning' : 'info'
                            }
                            size="sm"
                          >
                            {app.status === 'PENDING' ? 'Pendiente' :
                             app.status === 'UNDER_REVIEW' ? 'En Revisión' :
                             app.status === 'APPROVED' ? 'Aprobado' :
                             app.status === 'REJECTED' ? 'Rechazado' :
                             app.status === 'WAITLIST' ? 'Lista de Espera' :
                             app.status}
                          </Badge>
                          <Badge
                            variant={app.paymentStatus === 'PAID' ? 'success' : app.paymentStatus === 'PAYMENT_PENDING' ? 'warning' : 'info'}
                            size="sm"
                          >
                            {app.paymentStatus === 'PAID' ? 'Pagado' :
                             app.paymentStatus === 'PAYMENT_PENDING' ? 'Pago pendiente' :
                             app.paymentStatus === 'FAILED' ? 'Pago fallido' :
                             app.paymentStatus === 'EXPIRED' ? 'Pago expirado' : 'No pagado'}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Acción sobre el postulante seleccionado */}
                  {myApplication && (
                    <div className="pt-4 border-t border-gray-200">
                      {myApplication.canFillComplementaryForm && !myApplication.hasComplementaryForm ? (
                        <Button
                          variant="primary"
                          className="flex items-center gap-2 text-white"
                          onClick={() => setActiveSection('formulario-complementario')}
                        >
                          <FiFileText className="w-4 h-4 mr-2" />
                          Completar Formulario Complementario
                        </Button>
                      ) : myApplication.paymentStatus !== 'PAID' ? (
                        <Button
                          variant="primary"
                          className="flex items-center gap-2 text-white"
                          onClick={() => handlePayApplication(myApplication.id)}
                          disabled={paymentLoadingId === myApplication.id}
                        >
                          <FiCreditCard className="w-4 h-4 mr-2" />
                          {paymentLoadingId === myApplication.id ? 'Preparando pago...' :
                           myApplication.paymentStatus === 'PAYMENT_PENDING' ? 'Continuar pago' : 'Pagar postulación'}
                        </Button>
                      ) : null}
                    </div>
                  )}


                </Card>
                
                <Card className="p-6">
                <h2 className="text-xl font-bold text-azul-monte-tabor mb-6">
                  {Array.isArray(realApplications) && realApplications.length > 1
                    ? `Detalles de ${myApplication.student.firstName}`
                    : 'Resumen de Postulación'}
                </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-azul-monte-tabor mb-2">Información del Postulante</h3>
                {hasRealApplication ? (
                  <>
                    <p><strong>Nombre:</strong> {myApplication.student.firstName} {myApplication.student.lastName}</p>
                    <p><strong>RUT:</strong> {myApplication.student.rut}</p>
                    <p><strong>Fecha de Nacimiento:</strong> {new Date(myApplication.student.birthDate).toLocaleDateString('es-CL')}</p>
                    <p><strong>Nivel:</strong> {myApplication.student.gradeApplied}</p>
                    <p><strong>Dirección:</strong> {myApplication.student.address}</p>
                    {myApplication.student.currentSchool && (
                      <p><strong>Colegio Actual:</strong> {myApplication.student.currentSchool}</p>
                    )}
                  </>
                ) : (
                  <>
                    <p><strong>Nombre:</strong> {myApplication.applicant?.firstName} {myApplication.applicant?.lastName}</p>
                    <p><strong>Fecha de Nacimiento:</strong> {myApplication.applicant?.birthDate}</p>
                    <p><strong>Nivel:</strong> {myApplication.applicant?.grade}</p>
                  </>
                )}
              </div>
              <div>
                <h3 className="font-semibold text-azul-monte-tabor mb-2">Estado de Postulación</h3>
                <div className="mb-2">
                  <Badge variant={
                    myApplication.status === 'APPROVED' ? 'success' : 
                    myApplication.status === 'REJECTED' ? 'error' :
                    myApplication.status === 'WAITLIST' ? 'warning' : 'info'
                  }>
                    {myApplication.status === 'PENDING' ? 'Pendiente' :
                     myApplication.status === 'UNDER_REVIEW' ? 'En Revisión' :
                     myApplication.status === 'DOCUMENTS_REQUESTED' ? 'Documentos Solicitados' :
                     myApplication.status === 'INTERVIEW_SCHEDULED' ? 'Entrevista Programada' :
                     myApplication.status === 'EXAM_SCHEDULED' ? 'Examen Programado' :
                     myApplication.status === 'APPROVED' ? 'Aprobado' :
                     myApplication.status === 'REJECTED' ? 'Rechazado' :
                     myApplication.status === 'WAITLIST' ? 'Lista de Espera' :
                     myApplication.status}
                  </Badge>
                </div>
                <p><strong>Fecha de Postulación:</strong> {new Date(myApplication.submissionDate).toLocaleDateString('es-CL')}</p>
                {hasRealApplication && myApplication.applicantUser && (
                  <p><strong>Apoderado:</strong> {myApplication.applicantUser.firstName} {myApplication.applicantUser.lastName}</p>
                )}
                {myApplication.interviewDate && (
                  <p><strong>Entrevista:</strong> {new Date(myApplication.interviewDate).toLocaleDateString('es-CL')}</p>
                )}
              </div>
            </div>

            </Card>
              </div>
            )}
          </div>
        );
      case 'datos':
        return (
          <Card className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-azul-monte-tabor">Datos del Postulante y Apoderados</h2>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  // Redirect to application form in edit mode
                  // The application ID will be passed to pre-fill the form
                  navigate('/postulacion', {
                    state: {
                      editMode: true,
                      applicationId: myApplication.id,
                      applicationData: myApplication
                    }
                  });
                }}
              >
                <FiEdit className="w-4 h-4 mr-2" />
                Editar Datos
              </Button>
            </div>

            {hasRealApplication ? (
              <div className="space-y-8">
                {/* Datos del Estudiante */}
                <div>
                  <h3 className="text-lg font-semibold text-azul-monte-tabor mb-4 border-b border-gray-200 pb-2">
                    Información del Estudiante
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p><strong>Nombres:</strong> {myApplication.student.firstName}</p>
                      <p><strong>Apellidos:</strong> {myApplication.student.lastName}</p>
                      <p><strong>RUT:</strong> {myApplication.student.rut}</p>
                      <p><strong>Fecha de Nacimiento:</strong> {new Date(myApplication.student.birthDate).toLocaleDateString('es-CL')}</p>
                    </div>
                    <div>
                      <p><strong>Nivel Postulado:</strong> {myApplication.student.gradeApplied}</p>
                      <p><strong>Dirección:</strong> {myApplication.student.address}</p>
                      {myApplication.student.email && <p><strong>Email:</strong> {myApplication.student.email}</p>}
                      {myApplication.student.currentSchool && <p><strong>Colegio Actual:</strong> {myApplication.student.currentSchool}</p>}
                    </div>
                  </div>
                  {myApplication.student.additionalNotes && (
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm"><strong>Observaciones:</strong> {myApplication.student.additionalNotes}</p>
                    </div>
                  )}
                </div>

                {/* Datos del Padre */}
                <div>
                  <h3 className="text-lg font-semibold text-azul-monte-tabor mb-4 border-b border-gray-200 pb-2">
                    Información del Padre
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p><strong>Nombre Completo:</strong> {myApplication.father.fullName}</p>
                      <p><strong>RUT:</strong> {myApplication.father.rut}</p>
                      <p><strong>Email:</strong> {myApplication.father.email}</p>
                    </div>
                    <div>
                      <p><strong>Teléfono:</strong> {myApplication.father.phone}</p>
                      <p><strong>Profesión:</strong> {myApplication.father.profession}</p>
                      <p><strong>Dirección:</strong> {myApplication.father.address}</p>
                    </div>
                  </div>
                </div>

                {/* Datos de la Madre */}
                <div>
                  <h3 className="text-lg font-semibold text-azul-monte-tabor mb-4 border-b border-gray-200 pb-2">
                    Información de la Madre
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p><strong>Nombre Completo:</strong> {myApplication.mother.fullName}</p>
                      <p><strong>RUT:</strong> {myApplication.mother.rut}</p>
                      <p><strong>Email:</strong> {myApplication.mother.email}</p>
                    </div>
                    <div>
                      <p><strong>Teléfono:</strong> {myApplication.mother.phone}</p>
                      <p><strong>Profesión:</strong> {myApplication.mother.profession}</p>
                      <p><strong>Dirección:</strong> {myApplication.mother.address}</p>
                    </div>
                  </div>
                </div>

                {/* Datos del Sostenedor */}
                <div>
                  <h3 className="text-lg font-semibold text-azul-monte-tabor mb-4 border-b border-gray-200 pb-2">
                    Sostenedor Económico
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p><strong>Nombre Completo:</strong> {myApplication.supporter.fullName}</p>
                      <p><strong>RUT:</strong> {myApplication.supporter.rut}</p>
                      <p><strong>Email:</strong> {myApplication.supporter.email}</p>
                    </div>
                    <div>
                      <p><strong>Teléfono:</strong> {myApplication.supporter.phone}</p>
                      <p><strong>Relación:</strong> {myApplication.supporter.relationship}</p>
                    </div>
                  </div>
                </div>

                {/* Datos del Apoderado */}
                <div>
                  <h3 className="text-lg font-semibold text-azul-monte-tabor mb-4 border-b border-gray-200 pb-2">
                    Apoderado Académico
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p><strong>Nombre Completo:</strong> {myApplication.guardian.fullName}</p>
                      <p><strong>RUT:</strong> {myApplication.guardian.rut}</p>
                      <p><strong>Email:</strong> {myApplication.guardian.email}</p>
                    </div>
                    <div>
                      <p><strong>Teléfono:</strong> {myApplication.guardian.phone}</p>
                      <p><strong>Relación:</strong> {myApplication.guardian.relationship}</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <FileTextIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gris-piedra mb-4">
                  No hay información de postulación disponible
                </p>
                <Button variant="primary" onClick={() => navigateToAdmissions()}>
                  Crear Nueva Postulación
                </Button>
              </div>
            )}
          </Card>
        );
      case 'formulario-complementario':
        return (
          <div>
            {hasRealApplication ? (
              hasComplementaryFormAccess ? (
                <ComplementaryApplicationForm applications={payableApplications} />
              ) : (
                <Card className="p-6">
                  <div className="text-center py-8">
                    <FiCreditCard className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gris-piedra mb-4">
                      El formulario complementario se habilita cuando exista una postulación pagada pendiente de completar.
                    </p>
                    <Button variant="primary" onClick={() => setActiveSection('resumen')}>
                      Volver al resumen
                    </Button>
                  </div>
                </Card>
              )
            ) : (
              <Card className="p-6">
                <div className="text-center py-8">
                  <FileTextIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gris-piedra mb-4">
                    Debe completar su postulación primero antes de llenar el formulario complementario
                  </p>
                  <Button variant="primary" onClick={() => navigateToAdmissions()}>
                    Crear Nueva Postulación
                  </Button>
                </div>
              </Card>
            )}
          </div>
        );
      case 'documentos':
        return (
          <Card className="p-6">
            <h2 className="text-xl font-bold text-azul-monte-tabor mb-4">Documentos</h2>

            {loadingDocuments ? (
              <div className="text-center py-8">
                <FiRefreshCw className="w-8 h-8 animate-spin mx-auto text-azul-monte-tabor mb-2" />
                <p className="text-gris-piedra">Cargando documentos...</p>
              </div>
            ) : documents.length === 0 ? (
              <div className="text-center py-8">
                <FiFile className="w-12 h-12 mx-auto text-gris-piedra mb-3" />
                <p className="text-gris-piedra mb-2">No hay documentos subidos aún</p>
                <p className="text-sm text-gris-piedra">
                  Los documentos que subas durante el proceso de postulación aparecerán aquí
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  {documents.map(doc => (
                    <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="flex items-center gap-3">
                        <FileTextIcon className="w-5 h-5 text-dorado-nazaret" />
                        <div>
                          <span className="font-medium block">
                            {(doc.documentType || doc.document_type) && DOCUMENT_TYPE_LABELS[(doc.documentType || doc.document_type) as DocumentType]
                              ? DOCUMENT_TYPE_LABELS[(doc.documentType || doc.document_type) as DocumentType]
                              : doc.originalName || doc.name || doc.documentType || doc.document_type}
                          </span>
                          <span className="text-xs text-gris-piedra">
                            Subido: {new Date(doc.uploadDate || doc.created_at || doc.upload_date).toLocaleDateString('es-CL')}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleViewDocument(doc.id, doc.originalName || doc.original_name)}
                          className="flex items-center gap-2 px-3 py-1.5 text-sm bg-azul-monte-tabor text-white rounded-lg hover:bg-opacity-90 transition-colors"
                          title="Ver documento"
                        >
                          <FiEye className="w-4 h-4" />
                          Ver
                        </button>
                        <Badge
                          variant="success"
                          size="sm"
                        >
                          Subido
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-azul-monte-tabor">
                    <strong>Total de documentos:</strong> {documents.length}
                  </p>
                </div>
              </>
            )}
          </Card>
        );
      case 'calendario':
        return <FamilyCalendar />;
      case 'ayuda':
        return (
          <Card className="p-6">
            <h2 className="text-xl font-bold text-azul-monte-tabor mb-4">Ayuda y Soporte</h2>
            <p className="text-gris-piedra">¿Tienes dudas? Contáctanos a <a href="mailto:contacto@mtn.cl" className="text-azul-monte-tabor underline">contacto@mtn.cl</a></p>
                        </Card>
        );
      default:
        return null;
    }
  };

  const SidebarContent = ({ onNavigate }: { onNavigate?: () => void }) => (
    <>
      <div className="p-6">
        <LogoIcon className="mx-auto w-1/2 w-16 h-16 sm:w-24 sm:h-24 flex-shrink-0" />
        <h1 className="text-xl font-bold text-azul-monte-tabor">Portal Apoderados</h1>
        <p className="text-sm text-gris-piedra mt-1">{user?.firstName} {user?.lastName}</p>
      </div>
      <nav className="px-4" aria-label="Secciones del portal de apoderados">
        {visibleSections.map(section => (
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
        <Button
          variant="primary"
          className="w-full bg-azul-monte-tabor hover:bg-blue-700 text-white font-medium py-3 transition-all duration-200 shadow-md hover:shadow-lg"
          onClick={() => setShowLogoutConfirm(true)}
        >
          Cerrar Sesión
        </Button>
      </div>
      <div className="flex-1"></div>
    </>
  );

  // Mostrar estado de carga
  if (isLoading) {
    return (
      <div className="bg-gray-50 min-h-screen py-12 flex items-center justify-center">
        <Card className="p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-azul-monte-tabor mx-auto mb-4"></div>
          <p className="text-gris-piedra">Cargando información del dashboard...</p>
        </Card>
      </div>
    );
  }

  // Mostrar error si hay alguno
  if (error) {
    return (
      <div className="bg-gray-50 min-h-screen py-12 flex items-center justify-center">
        <Card className="p-8 text-center">
          <XCircleIcon className="w-16 h-16 text-rojo-sagrado mx-auto mb-4" />
          <h2 className="text-xl font-bold text-rojo-sagrado mb-2">Error</h2>
          <p className="text-gris-piedra mb-4">{error}</p>
          <Button variant="primary" onClick={() => window.location.reload()}>
            Reintentar
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile top bar */}
      <div className="md:hidden bg-white shadow-sm px-4 py-3 flex items-center justify-between sticky top-0 z-30">
        <div>
          <h1 className="text-lg font-bold text-azul-monte-tabor">Portal Apoderados</h1>
          <p className="text-xs text-gris-piedra">{user?.firstName} {user?.lastName}</p>
        </div>
        <button
          onClick={() => setIsSidebarOpen(prev => !prev)}
          className="p-2 rounded-lg text-gris-piedra hover:bg-gray-100 transition-colors"
          aria-label="Abrir menú de secciones"
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
        <aside className="w-64 bg-white shadow-md min-h-screen flex-col hidden md:flex sticky top-0 self-start h-screen overflow-y-auto" role="complementary" aria-label="Menú de navegación">
          <SidebarContent />
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-4 sm:p-6 min-w-0" role="main" aria-label="Contenido principal del portal de apoderados">
          {renderSection()}
        </main>
      </div>

      <ConfirmDialog
        isOpen={showLogoutConfirm}
        title="Cerrar sesión"
        message="¿Está seguro que desea cerrar sesión?"
        confirmText="Sí, cerrar sesión"
        cancelText="Cancelar"
        variant="primary"
        onConfirm={() => {
          setShowLogoutConfirm(false);
          logout();
        }}
        onClose={() => setShowLogoutConfirm(false)}
      />

      {toast && (
        <SimpleToast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
    );
};

export default FamilyDashboard;
