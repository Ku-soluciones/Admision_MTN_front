import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
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
  FiLogOut
} from 'react-icons/fi';
import { useApplications } from '../context/AppContext';
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
  { key: 'formulario-complementario', label: 'Formulario Complementario' },
  { key: 'documentos', label: 'Documentos' },
  { key: 'calendario', label: 'Calendario de Entrevistas' },
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
      alert(error.message || `No se pudo abrir el documento ${documentName || ''}`.trim());
    }
  };
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
          console.warn('Dashboard data no contiene un array de applications:', dashboardData);
          setRealApplications([]);
          setError('Formato de datos inválido del servidor');
        }
      } catch (error: any) {
        console.error('Error loading dashboard data:', error);
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
        console.error('Error loading documents:', error);
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

  // Handler for adding another child (navigate to form with family data pre-filled)
  const handleAddAnotherChild = () => {
    if (hasRealApplication && realApplications.length > 0) {
      // Pass the first application's family data to pre-fill the form
      navigate('/postulacion', {
        state: {
          prefillFamilyData: true,
          familyData: {
            father: realApplications[0].father,
            mother: realApplications[0].mother,
            guardian: realApplications[0].guardian,
            supporter: realApplications[0].supporter
          }
        }
      });
    } else {
      navigate('/postulacion');
    }
  };

  const renderSection = () => {
    switch (activeSection) {
      case 'resumen':
        return (
          <div className="space-y-6">
            {/* Header con logo del colegio */}
            <Card className="p-6 bg-gradient-to-r from-azul-monte-tabor to-blue-700 text-blanco-pureza">
              {/* Mostrar error si existe */}
              {error && (
                <div className="mb-4 p-4 bg-red-100 border border-red-300 rounded-lg">
                  <p className="text-red-700 font-medium flex items-center gap-2">
                    <FiAlertTriangle className="w-5 h-5" />
                    Error al cargar datos:
                  </p>
                  <p className="text-red-600 text-sm">{error}</p>
                  <button
                    onClick={() => window.location.reload()}
                    className="mt-2 text-red-600 hover:text-red-800 underline text-sm"
                    aria-label="Reintentar carga de datos"
                  >
                    Reintentar
                  </button>
                </div>
              )}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-3">
                <div className="flex items-center gap-4">
                  <LogoIcon className="w-16 h-16 sm:w-24 sm:h-24 flex-shrink-0" />
                  <div>
                    <h1 className="text-xl sm:text-3xl font-bold">Monte Tabor & Nazaret</h1>
                    <p className="text-blue-100 text-sm sm:text-lg">Portal de Apoderados</p>
                    {user && (
                      <p className="text-blue-200 text-sm">Bienvenido, {user.firstName} {user.lastName}</p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <Button
                    variant="outline"
                    size="sm"
                    className="ml-2 text-white border-white hover:bg-red-500 hover:text-white hover:border-red-500"
                    onClick={() => {
                      if (window.confirm('¿Está seguro que desea cerrar sesión?')) {
                        logout();
                      }
                    }}
                  >
                    <FiLogOut className="w-4 h-4 mr-2" />
                    Cerrar Sesión
                  </Button>
                </div>
              </div>
              <p className="text-blue-100">
                Bienvenido al portal de seguimiento del proceso de admisión. 
                Aquí podrá monitorear el progreso de la postulación de su hijo/a.
              </p>
            </Card>

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
                    <Link to="/postulacion">
                      <Button variant="primary" size="lg" className="w-full">
                        Crear Nueva Postulación
                      </Button>
                    </Link>
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
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-azul-monte-tabor">Mis Hijos Postulantes</h2>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleAddAnotherChild}
                      className="flex items-center gap-2"
                    >
                      <FiPlus className="w-4 h-4" />
                      Postular Otro Hijo
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                    {realApplications.map((app, index) => (
                      <button
                        key={app.id}
                        onClick={() => setSelectedApplicationIndex(index)}
                        className={`p-4 rounded-lg border-2 transition-all text-left ${
                          selectedApplicationIndex === index
                            ? 'border-azul-monte-tabor bg-blue-50'
                            : 'border-gray-200 bg-white hover:border-azul-monte-tabor hover:bg-blue-50'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <FiUser className="w-5 h-5 text-azul-monte-tabor" />
                            <h3 className="font-semibold text-azul-monte-tabor">
                              {app.student.firstName} {app.student.lastName}
                            </h3>
                          </div>
                          {selectedApplicationIndex === index && (
                            <FiCheckCircle className="w-5 h-5 text-verde-esperanza" />
                          )}
                        </div>
                        <p className="text-sm text-gris-piedra mb-1">
                          <strong>Nivel:</strong> {app.student.gradeApplied}
                        </p>
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
                      </button>
                    ))}
                  </div>

                  {/* Estadísticas de postulaciones */}
                  {Array.isArray(realApplications) && realApplications.length > 1 && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-200">
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
            
              {/* Accesos Rápidos */}
              <Card className="p-6 mt-6">
                <h3 className="text-lg font-bold text-azul-monte-tabor mb-4">Accesos Rápidos</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <button
                    onClick={() => setActiveSection('formulario-complementario')}
                    className="flex items-center gap-3 p-4 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors text-left"
                    aria-label="Ir al formulario complementario"
                  >
                    <FiFileText className="w-8 h-8 text-purple-600" aria-hidden="true" />
                    <div>
                      <h4 className="font-semibold text-azul-monte-tabor">Formulario Complementario</h4>
                      <p className="text-sm text-gris-piedra">Completar información adicional</p>
                    </div>
                  </button>

                  <button
                    onClick={() => setActiveSection('calendario')}
                    className="flex items-center gap-3 p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors text-left"
                    aria-label="Ir a mi calendario para ver fechas y eventos personalizados"
                  >
                    <CalendarIcon className="w-8 h-8 text-azul-monte-tabor" aria-hidden="true" />
                    <div>
                      <h4 className="font-semibold text-azul-monte-tabor">Mi Calendario</h4>
                      <p className="text-sm text-gris-piedra">Ver mis fechas y eventos personalizados</p>
                    </div>
                  </button>

                  <button
                    onClick={() => setActiveSection('calendario')}
                    className="flex items-center gap-3 p-4 bg-green-50 hover:bg-green-100 rounded-lg transition-colors text-left"
                    aria-label="Ir a mis entrevistas programadas"
                  >
                    <UsersIcon className="w-8 h-8 text-verde-esperanza" aria-hidden="true" />
                    <div>
                      <h4 className="font-semibold text-azul-monte-tabor">Mis Entrevistas</h4>
                      <p className="text-sm text-gris-piedra">Ver mis entrevistas programadas</p>
                    </div>
                  </button>
                </div>
              </Card>
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
                <Link to="/postulacion">
                  <Button variant="primary">
                    Crear Nueva Postulación
                  </Button>
                </Link>
              </div>
            )}
          </Card>
        );
      case 'formulario-complementario':
        return (
          <div>
            {hasRealApplication ? (
              <ComplementaryApplicationForm />
            ) : (
              <Card className="p-6">
                <div className="text-center py-8">
                  <FileTextIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gris-piedra mb-4">
                    Debe completar su postulación primero antes de llenar el formulario complementario
                  </p>
                  <Link to="/postulacion">
                    <Button variant="primary">
                      Crear Nueva Postulación
                    </Button>
                  </Link>
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
    <div className="bg-gray-50 min-h-screen">
      {/* Mobile top bar */}
      <div className="md:hidden bg-azul-monte-tabor text-white px-4 py-3 flex items-center justify-between">
        <span className="font-bold text-lg">Portal Apoderados</span>
        <button
          onClick={() => setIsSidebarOpen(prev => !prev)}
          className="p-2 rounded-lg hover:bg-blue-800 transition-colors"
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

      {/* Mobile sidebar overlay */}
      {isSidebarOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black bg-opacity-40 z-40"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Mobile sidebar drawer */}
      <div className={`md:hidden fixed top-0 left-0 h-full w-64 bg-azul-monte-tabor z-50 transform transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 pt-14">
          <nav className="space-y-2" aria-label="Secciones del portal de apoderados">
            {sections.map(section => (
              <button
                key={section.key}
                onClick={() => { setActiveSection(section.key); setIsSidebarOpen(false); }}
                className={`w-full text-left px-4 py-3 rounded-lg font-semibold transition-colors duration-200 ${activeSection === section.key ? 'bg-dorado-nazaret/20 text-dorado-nazaret' : 'text-blanco-pureza hover:bg-blue-800'}`}
              >
                {section.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      <div className="flex py-6 sm:py-12 px-4 sm:px-6">
        {/* Desktop Sidebar */}
        <aside className="w-64 bg-azul-monte-tabor p-6 flex-shrink-0 hidden md:flex md:flex-col rounded-xl mr-8 self-start sticky top-20" role="complementary" aria-label="Menú de navegación">
          <nav className="space-y-2" aria-label="Secciones del portal de apoderados">
            {sections.map(section => (
              <button
                key={section.key}
                onClick={() => setActiveSection(section.key)}
                className={`w-full text-left px-4 py-2 rounded-lg font-semibold transition-colors duration-200 ${activeSection === section.key ? 'bg-dorado-nazaret/20 text-dorado-nazaret' : 'text-blanco-pureza hover:bg-blue-800'}`}
                aria-label={`Navegar a sección ${section.label}`}
                aria-current={activeSection === section.key ? 'page' : undefined}
              >
                {section.label}
              </button>
            ))}
          </nav>
        </aside>
        {/* Main Content */}
        <main className="flex-1 min-w-0 max-w-3xl mx-auto md:mx-0" role="main" aria-label="Contenido principal del portal de apoderados">
          {renderSection()}
        </main>
      </div>
    </div>
    );
};

export default FamilyDashboard;
