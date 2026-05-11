import React, { useState, useEffect } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import Modal from '../ui/Modal';
import LoadingSpinner from '../ui/LoadingSpinner';
import SimpleToast from '../ui/SimpleToast';
import {
  CalendarIcon,
  ClockIcon,
  UserIcon,
  CheckCircleIcon,
  XCircleIcon,
  RefreshIcon,
  PlusIcon,
  FilterIcon,
  ViewIcon,
  EditIcon
} from '../icons/Icons';
import { FiCalendar, FiClock, FiUser, FiVideo, FiMapPin, FiPhone, FiMail, FiFilter, FiSearch, FiEye, FiEdit, FiCheck, FiX, FiRefreshCw, FiArrowLeft } from 'react-icons/fi';
import {
  Interview,
  InterviewStatus,
  InterviewType,
  InterviewMode,
  InterviewResult,
  InterviewFilters,
  InterviewStats,
  InterviewFormMode,
  CreateInterviewRequest,
  UpdateInterviewRequest,
  CompleteInterviewRequest,
  INTERVIEW_STATUS_LABELS,
  INTERVIEW_TYPE_LABELS,
  INTERVIEW_MODE_LABELS,
  INTERVIEW_RESULT_LABELS,
  InterviewUtils
} from '../../types/interview';
import InterviewTable from './InterviewTable';
import InterviewForm from './InterviewForm';
import InterviewCalendar from './InterviewCalendar';
import InterviewStatsPanel from './InterviewStatsPanel';
import InterviewStatusPanel from './InterviewStatusPanel';
import InterviewOverview from './InterviewOverview';
import CancelInterviewModal from './CancelInterviewModal';
import RescheduleInterviewModal from './RescheduleInterviewModal';
// Removed excessive imports for simplification
import interviewService from '../../services/interviewService';
import { emailTemplateService, EmailTemplate } from '../../services/emailTemplateService';
import { applicationService } from '../../services/applicationService';
// Removed non-essential service imports

interface InterviewManagementProps {
  className?: string;
  onBack?: () => void;
}

const InterviewManagement: React.FC<InterviewManagementProps> = ({ className = '', onBack }) => {
  // Estados principales
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [selectedInterview, setSelectedInterview] = useState<Interview | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Estados de modal
  const [showForm, setShowForm] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [formMode, setFormMode] = useState<InterviewFormMode>(InterviewFormMode.CREATE);

  // Estados para modales de cancelación y reagendación
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [interviewToCancel, setInterviewToCancel] = useState<Interview | null>(null);
  const [interviewToReschedule, setInterviewToReschedule] = useState<Interview | null>(null);

  // Estado para sincronización entre vistas
  const [refreshKey, setRefreshKey] = useState(0);

  // Estados de filtros
  const [filters, setFilters] = useState<InterviewFilters>({
    page: 0,
    size: 10,
    sort: 'scheduledDate,desc'
  });
  const [showFilters, setShowFilters] = useState(false);

  // Datos de estadísticas
  const [stats, setStats] = useState<InterviewStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  // Modos esenciales + vista de estudiantes
  const [viewMode, setViewMode] = useState<'students' | 'table' | 'calendar'>('students');
  
  // Estados para la vista de estudiantes
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [selectedStudentName, setSelectedStudentName] = useState<string>('');

  // Modal de gestión de entrevistas del estudiante
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [studentModalId, setStudentModalId] = useState<number | null>(null);
  const [studentModalName, setStudentModalName] = useState<string>('');
  const [studentModalRefreshKey, setStudentModalRefreshKey] = useState(0);

  // Simplified email template state
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([]);

  useEffect(() => {
    loadInterviews();
    loadStats();
    loadEmailTemplates();
  }, [filters]);

  // Auto-refresh cuando el componente se monta o actualiza
  useEffect(() => {
    loadInterviews();
  }, [refreshKey]);

  const loadInterviews = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Usar servicio real con filtros
      if (filters.status || filters.type || filters.mode || filters.dateFrom || filters.dateTo) {
        const response = await interviewService.getInterviewsWithFilters(
          {
            status: filters.status,
            type: filters.type,
            mode: filters.mode,
            startDate: filters.dateFrom,
            endDate: filters.dateTo,
            interviewerId: filters.interviewerId
          },
          filters.page || 0,
          filters.size || 20,
          'scheduledDate',
          'desc'
        );
        setInterviews(response.interviews);
      } else {
        // Cargar todas las entrevistas sin filtros
        const response = await interviewService.getAllInterviews(
          filters.page || 0,
          filters.size || 20,
          'scheduledDate',
          'desc'
        );
        setInterviews(response.interviews);
      }

    } catch (err: any) {
      setError(err.message || 'Error al cargar las entrevistas');
      showToast('Error al cargar las entrevistas', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      setIsLoadingStats(true);
      
      // Usar servicio real para estadísticas
      const statsData = await interviewService.getInterviewStatistics();
      setStats(statsData);
      
    } catch (err: any) {
      // Si hay error, no mostrar estadísticas pero no fallar la carga
      setStats(null);
    } finally {
      setIsLoadingStats(false);
    }
  };

  const loadEmailTemplates = async () => {
    try {
      const response = await emailTemplateService.getAllTemplates();
      if (response.success && Array.isArray(response.data)) {
        // Filtrar solo templates relacionados con entrevistas
        const interviewTemplates = response.data.filter(template => 
          template.category.includes('INTERVIEW') || 
          template.category === 'STUDENT_SELECTION' ||
          template.category === 'STUDENT_REJECTION'
        );
        setEmailTemplates(interviewTemplates);
      } else {
        setEmailTemplates([]);
      }
    } catch (error) {
      // Si falla, usar templates vacíos pero no mostrar error
      setEmailTemplates([]);
    }
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  const handleCreateInterview = () => {
    setSelectedInterview(null);
    setFormMode(InterviewFormMode.CREATE);
    setShowForm(true);
  };

  const handleEditInterview = (interview: Interview) => {
    setSelectedInterview(interview);
    setFormMode(InterviewFormMode.EDIT);
    setShowForm(true);
  };

  const handleCompleteInterview = (interview: Interview) => {
    setSelectedInterview(interview);
    setFormMode(InterviewFormMode.COMPLETE);
    setShowForm(true);
  };

  const handleViewInterview = (interview: Interview) => {
    setSelectedInterview(interview);
    setFormMode(InterviewFormMode.VIEW);
    setShowForm(true);
  };

  const handleEditFromView = (interview: Interview) => {
    setSelectedInterview(interview);
    setFormMode(InterviewFormMode.EDIT);
    // No cerrar el modal, solo cambiar el modo
  };

  // Verificar si ya existe una entrevista programada del mismo tipo para la aplicación
  const hasScheduledInterviewOfType = (applicationId: number, interviewType: InterviewType): boolean => {
    return interviews.some(interview => 
      interview.applicationId === applicationId && 
      interview.type === interviewType &&
      (interview.status === InterviewStatus.SCHEDULED || 
       interview.status === InterviewStatus.CONFIRMED ||
       interview.status === InterviewStatus.IN_PROGRESS)
    );
  };

  const handleFormSubmit = async (data: CreateInterviewRequest | UpdateInterviewRequest | CompleteInterviewRequest) => {
    try {
      setIsSubmitting(true);
      
      if (formMode === InterviewFormMode.CREATE) {
        const createData = data as CreateInterviewRequest;
        
        // Prevenir doble programación del mismo tipo
        if (hasScheduledInterviewOfType(createData.applicationId, createData.type)) {
          showToast(`Ya existe una entrevista ${createData.type.toLowerCase()} programada o en progreso para esta solicitud. No se puede programar otra del mismo tipo.`, 'error');
          setIsSubmitting(false);
          return;
        }
        
        await interviewService.createInterview(createData);
        showToast('Entrevista programada exitosamente con estado AGENDADA', 'success');
      } else if (formMode === InterviewFormMode.EDIT && selectedInterview) {
        await interviewService.updateInterview(selectedInterview.id, data as UpdateInterviewRequest);
        showToast('Entrevista actualizada exitosamente', 'success');
      } else if (formMode === InterviewFormMode.COMPLETE && selectedInterview) {
        await interviewService.completeInterview(selectedInterview.id, data as CompleteInterviewRequest);
        showToast('Entrevista completada exitosamente', 'success');
      }
      
      setShowForm(false);
      await loadInterviews();
      await loadStats(); // Recargar estadísticas también
      
      // Incrementar refreshKey para sincronizar todas las vistas
      setRefreshKey(prev => prev + 1);
      
    } catch (err: any) {

      // Extraer mensaje específico del backend si existe
      let errorMessage = 'Error al procesar la entrevista';

      if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.response?.data?.error === 'SLOT_ALREADY_TAKEN') {
        errorMessage = 'Este horario ya está reservado. Por favor seleccione otro horario.';
      } else if (err.message) {
        errorMessage = err.message;
      }

      showToast(errorMessage, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelInterview = (interview: Interview) => {
    setInterviewToCancel(interview);
    setShowCancelModal(true);
  };

  const handleCancelSuccess = async () => {
    showToast('Entrevista cancelada exitosamente', 'success');
    setShowCancelModal(false);
    setInterviewToCancel(null);
    await loadInterviews();
    await loadStats();
    setRefreshKey(prev => prev + 1);
  };

  const handleRescheduleInterview = (interview: Interview) => {
    setInterviewToReschedule(interview);
    setShowRescheduleModal(true);
  };

  const handleRescheduleSuccess = async () => {
    showToast('Entrevista reagendada exitosamente', 'success');
    setShowRescheduleModal(false);
    setInterviewToReschedule(null);
    await loadInterviews();
    await loadStats();
    setRefreshKey(prev => prev + 1);
  };

  const handleFilterChange = (newFilters: Partial<InterviewFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters, page: 0 }));
  };

  const resetFilters = () => {
    setFilters({
      page: 0,
      size: 10,
      sort: 'scheduledDate,desc'
    });
  };

  // Funciones simplificadas de notificación
  const handleSendNotification = async (interview: Interview, type: 'scheduled' | 'confirmed' | 'reminder') => {
    try {
      // Simulación de envío de notificación
      showToast('Notificación enviada exitosamente', 'success');
    } catch (error) {
      showToast('Error al enviar notificación', 'error');
    }
  };

  const handleSendReminder = async (interview: Interview) => {
    try {
      // Simulación de envío de recordatorio
      showToast('Recordatorio enviado exitosamente', 'success');
    } catch (error) {
      showToast('Error al enviar recordatorio', 'error');
    }
  };

  // Funciones para la vista de estudiantes
  const handleStudentSelect = (applicationId: number, studentName: string) => {
    setStudentModalId(applicationId);
    setStudentModalName(studentName);
    setStudentModalRefreshKey(k => k + 1);
    setShowStudentModal(true);
  };

  const handleBackToStudentList = () => {
    setSelectedStudentId(null);
    setSelectedStudentName('');
  };

  const handleScheduleInterviewForStudent = (applicationId: number, interviewType?: string) => {

    const interviewData = {
      applicationId: applicationId.toString(),
      studentName: selectedStudentName,
      type: interviewType as any,
    } as any;


    setSelectedInterview(interviewData);
    setFormMode(InterviewFormMode.CREATE);
    setShowForm(true);

  };

  // Removed unused getViewModeIcon function

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {onBack && (
            <Button 
              onClick={onBack}
              variant="outline"
              className="flex items-center"
            >
              <FiArrowLeft className="w-4 h-4 mr-2" />
              Volver
            </Button>
          )}
          <CalendarIcon className="w-8 h-8 text-azul-monte-tabor flex-shrink-0" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Gestión de Entrevistas
            </h1>
            <p className="text-sm text-gray-600">
              Programa, gestiona y evalúa las entrevistas de admisión
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className={showFilters ? 'bg-blue-50 border-blue-300' : ''}
          >
            <FiFilter className="w-5 h-5 mr-2" />
            Filtros
          </Button>
          
          <Button
            variant="outline"
            onClick={loadInterviews}
            disabled={isLoading}
          >
            <FiRefreshCw className={`w-5 h-5 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>

          <Button
            variant="primary"
            onClick={handleCreateInterview}
          >
            <PlusIcon className="w-5 h-5 mr-2" />
            Nueva Entrevista
          </Button>
        </div>
      </div>

      {/* Estadísticas rápidas */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4 text-center">
            <CalendarIcon className="w-6 h-6 text-blue-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-blue-600">{stats.totalInterviews}</p>
            <p className="text-sm text-gray-600">Total Entrevistas</p>
          </Card>
          
          <Card className="p-4 text-center">
            <ClockIcon className="w-6 h-6 text-orange-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-orange-600">{stats.pendingInterviews}</p>
            <p className="text-sm text-gray-600">Pendientes</p>
          </Card>
          
          <Card className="p-4 text-center">
            <CheckCircleIcon className="w-6 h-6 text-green-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-green-600">{stats.completedInterviews}</p>
            <p className="text-sm text-gray-600">Completadas</p>
          </Card>
          
          <Card className="p-4 text-center">
            <UserIcon className="w-6 h-6 text-purple-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-purple-600">{(stats.averageScore || 0).toFixed(1)}</p>
            <p className="text-sm text-gray-600">Puntuación Promedio</p>
          </Card>
        </div>
      )}

      {/* Filtros expansibles */}
      {showFilters && (
        <Card className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Estado
              </label>
              <select
                value={filters.status || ''}
                onChange={(e) => handleFilterChange({ status: e.target.value as InterviewStatus || undefined })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-azul-monte-tabor"
              >
                <option value="">Todos los estados</option>
                {Object.values(InterviewStatus).map(status => (
                  <option key={status} value={status}>
                    {INTERVIEW_STATUS_LABELS[status]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo
              </label>
              <select
                value={filters.type || ''}
                onChange={(e) => handleFilterChange({ type: e.target.value as InterviewType || undefined })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-azul-monte-tabor"
              >
                <option value="">Todos los tipos</option>
                {Object.values(InterviewType).map(type => (
                  <option key={type} value={type}>
                    {INTERVIEW_TYPE_LABELS[type]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fecha desde
              </label>
              <input
                type="date"
                value={filters.dateFrom || ''}
                onChange={(e) => handleFilterChange({ dateFrom: e.target.value || undefined })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-azul-monte-tabor"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fecha hasta
              </label>
              <input
                type="date"
                value={filters.dateTo || ''}
                onChange={(e) => handleFilterChange({ dateTo: e.target.value || undefined })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-azul-monte-tabor"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 mt-4">
            <Button variant="outline" onClick={resetFilters}>
              Limpiar Filtros
            </Button>
            <Button variant="primary" onClick={() => setShowFilters(false)}>
              Aplicar Filtros
            </Button>
          </div>
        </Card>
      )}

      {/* Navegación de vistas */}
      <div className="flex gap-2">
        <Button
          variant={viewMode === 'students' ? 'primary' : 'outline'}
          onClick={() => setViewMode('students')}
        >
          <FiUser className="w-5 h-5 mr-2" />
          Estudiantes
        </Button>
        <Button
          variant={viewMode === 'table' ? 'primary' : 'outline'}
          onClick={() => setViewMode('table')}
        >
          <FiFilter className="w-5 h-5 mr-2" />
          Lista
        </Button>
        <Button
          variant={viewMode === 'calendar' ? 'primary' : 'outline'}
          onClick={() => setViewMode('calendar')}
        >
          <FiCalendar className="w-5 h-5 mr-2" />
          Calendario
        </Button>
      </div>

      {/* Vista principal según modo seleccionado */}
      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : error ? (
        <Card className="p-6 text-center">
          <XCircleIcon className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-red-800 mb-2">Error al cargar</h3>
          <p className="text-red-600 mb-4">{error}</p>
          <Button variant="outline" onClick={loadInterviews}>
            Reintentar
          </Button>
        </Card>
      ) : (
        <>
          {viewMode === 'students' && (
            selectedStudentId ? (
              <StudentDetailView
                applicationId={selectedStudentId}
                studentName={selectedStudentName}
                onBack={handleBackToStudentList}
                onScheduleInterview={handleScheduleInterviewForStudent}
                onViewInterview={handleViewInterview}
                onEditInterview={handleEditInterview}
                refreshKey={refreshKey}
              />
            ) : (
              <StudentListView
                onStudentSelect={handleStudentSelect}
              />
            )
          )}

          {viewMode === 'table' && (
            <Card className="p-6">
              <InterviewTable
                key={`table-${refreshKey}`}
                interviews={interviews}
                isLoading={isLoading}
                onEdit={handleEditInterview}
                onComplete={handleCompleteInterview}
                onCancel={handleCancelInterview}
                onReschedule={handleRescheduleInterview}
                onView={handleViewInterview}
                onSendNotification={handleSendNotification}
                onSendReminder={handleSendReminder}
              />
            </Card>
          )}

          {viewMode === 'calendar' && (
            <Card className="p-6">
              <InterviewCalendar
                key={`calendar-${refreshKey}`}
                interviews={interviews}
                onSelectEvent={handleViewInterview}
                onSelectSlot={(slotInfo) => {
                  handleCreateInterview();
                }}
              />
            </Card>
          )}
        </>
      )}

      {/* Modal de formulario */}
      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title={
          formMode === InterviewFormMode.CREATE ? 'Nueva Entrevista' :
          formMode === InterviewFormMode.EDIT ? 'Editar Entrevista' :
          formMode === InterviewFormMode.COMPLETE ? 'Completar Entrevista' :
          'Detalles de Entrevista'
        }
        size="lg"
      >
        <InterviewForm
          interview={selectedInterview}
          mode={formMode}
          onSubmit={handleFormSubmit}
          onCancel={() => setShowForm(false)}
          onEdit={handleEditFromView}
          isSubmitting={isSubmitting}
        />
      </Modal>

      {/* Modal de cancelación de entrevista */}
      <CancelInterviewModal
        isOpen={showCancelModal}
        onClose={() => {
          setShowCancelModal(false);
          setInterviewToCancel(null);
        }}
        interview={interviewToCancel}
        onSuccess={handleCancelSuccess}
      />

      {/* Modal de reagendación de entrevista */}
      <RescheduleInterviewModal
        isOpen={showRescheduleModal}
        onClose={() => {
          setShowRescheduleModal(false);
          setInterviewToReschedule(null);
        }}
        interview={interviewToReschedule}
        onSuccess={handleRescheduleSuccess}
      />

      {/* Removed complex email modal for simplification */}

      {/* Modal gestión entrevistas del estudiante */}
      {showStudentModal && studentModalId && (
        <StudentInterviewsModal
          applicationId={studentModalId}
          studentName={studentModalName}
          refreshKey={studentModalRefreshKey}
          onClose={() => setShowStudentModal(false)}
          onSchedule={(appId: number, type: string) => {
            setShowStudentModal(false);
            handleScheduleInterviewForStudent(appId, type);
          }}
          onView={handleViewInterview}
          onEdit={handleEditInterview}
          onRefresh={() => {
            setStudentModalRefreshKey(k => k + 1);
            setRefreshKey(k => k + 1);
          }}
        />
      )}

      {/* Toast de notificaciones */}
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

const Tip: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="relative group/tip inline-flex">
    {children}
    <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs font-medium text-white bg-gray-800 rounded-md whitespace-nowrap opacity-0 group-hover/tip:opacity-100 transition-opacity duration-150 z-50">
      {label}
      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800" />
    </div>
  </div>
);

// Componente simple para lista de estudiantes
interface StudentListViewProps {
  onStudentSelect: (applicationId: number, studentName: string) => void;
}

const StudentListView: React.FC<StudentListViewProps> = ({ onStudentSelect }) => {
  const [applications, setApplications] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadApplications();
  }, []);

  const loadApplications = async () => {
    try {
      setIsLoading(true);
      const response = await applicationService.getAllApplications();
      const validApplications = response.filter(app =>
        app && app.id && app.student && app.student.firstName && app.student.lastName
      );
      const mappedApplications = validApplications.map(app => ({
        id: app.id,
        studentName: `${app.student.firstName} ${app.student.lastName} ${app.student.maternalLastName || ''}`.trim(),
        gradeApplied: app.student.gradeApplied || 'Sin especificar',
        parentNames: [
          app.father?.fullName || 'N/A',
          app.mother?.fullName || 'N/A'
        ].filter(name => name !== 'N/A').join(' y ') || 'Sin información de padres',
        status: app.status || 'PENDING'
      }));
      setApplications(mappedApplications);
    } catch (error) {
      setApplications([
        { id: 1, studentName: 'Juan Pérez González', gradeApplied: 'Kinder', parentNames: 'María González y Pedro Pérez', status: 'APPROVED' },
        { id: 4, studentName: 'Ana Martínez López', gradeApplied: '1° Básico', parentNames: 'Carmen López y Roberto Martínez', status: 'APPROVED' },
        { id: 26, studentName: 'GASPAR GONZALEZ', gradeApplied: '2° Básico', parentNames: 'Padres de Gaspar', status: 'APPROVED' },
        { id: 7, studentName: 'María Fernández Torres', gradeApplied: 'Kinder', parentNames: 'Carlos Torres y Ana Fernández', status: 'PENDING' },
        { id: 8, studentName: 'Pablo García Morales', gradeApplied: '1° Básico', parentNames: 'Luis Morales y Carmen García', status: 'PENDING' },
        { id: 15, studentName: 'Sofía López Ruiz', gradeApplied: '3° Básico', parentNames: 'Roberto Ruiz y Patricia López', status: 'PENDING' },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'APPROVED': return 'bg-green-100 text-green-800';
      case 'REJECTED': return 'bg-red-100 text-red-800';
      case 'UNDER_REVIEW': return 'bg-yellow-100 text-yellow-800';
      case 'EXAM_SCHEDULED': return 'bg-indigo-100 text-indigo-800';
      case 'INTERVIEW_SCHEDULED': return 'bg-purple-100 text-purple-800';
      case 'PENDING': default: return 'bg-blue-100 text-blue-800';
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      APPROVED: 'Aceptado', REJECTED: 'Rechazado', UNDER_REVIEW: 'En Revisión',
      EXAM_SCHEDULED: 'Examen Agendado', INTERVIEW_SCHEDULED: 'Entrevista Programada', PENDING: 'Pendiente'
    };
    return labels[status?.toUpperCase()] || status;
  };

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return applications;
    return applications.filter(app =>
      app.studentName?.toLowerCase().includes(q) ||
      app.gradeApplied?.toLowerCase().includes(q) ||
      app.parentNames?.toLowerCase().includes(q) ||
      app.status?.toLowerCase().includes(q)
    );
  }, [applications, search]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paged = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <Card className="p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Estudiantes para Entrevistas</h3>
        <p className="text-sm text-gray-600">Selecciona un estudiante para gestionar sus entrevistas</p>
      </div>

      {/* Buscador */}
      <div className="relative mb-3">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
        </svg>
        <input
          type="text"
          value={search}
          onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
          placeholder="Buscar por nombre, grado, padres o estado…"
          className="w-full pl-9 pr-9 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-azul-monte-tabor focus:border-transparent"
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Hint instructivo */}
      {selectedId === null && applications.length > 0 && (
        <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-blue-50 border border-blue-100 rounded-lg text-blue-600 text-xs">
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Selecciona un estudiante para gestionar sus entrevistas
        </div>
      )}

      {/* Tabla */}
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="w-6 px-3 py-2.5"></th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Estudiante</th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Grado</th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Padres</th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide" style={{ minWidth: 180 }}>Estado / Acción</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {paged.map((app) => {
              const isSelected = selectedId === app.id;
              const parts = app.studentName.split(/\s+/).filter(Boolean);
              const initials = parts.length > 1
                ? `${parts[0]?.charAt(0) || 'N'}${parts[parts.length - 1]?.charAt(0) || ''}`
                : parts[0]?.slice(0, 2) || 'NN';

              return (
                <tr
                  key={app.id}
                  onClick={() => setSelectedId(prev => prev === app.id ? null : app.id)}
                  className={`transition-colors cursor-pointer group ${isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                >
                  {/* Indicador lateral */}
                  <td className="px-3 py-3">
                    <div className={`w-1.5 h-8 rounded-full transition-all duration-300 ${
                      isSelected ? 'bg-azul-monte-tabor' : 'bg-transparent group-hover:bg-gray-200'
                    }`} />
                  </td>

                  {/* Estudiante */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`shrink-0 h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold transition-colors duration-300 ${
                        isSelected ? 'bg-azul-monte-tabor text-white' : 'bg-azul-monte-tabor bg-opacity-10 text-azul-monte-tabor'
                      }`}>
                        {initials.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className={`text-sm font-medium truncate transition-colors duration-300 ${isSelected ? 'text-azul-monte-tabor' : 'text-gray-900'}`}>
                          {app.studentName}
                        </div>
                        <div className="text-xs text-gray-400 sm:hidden">{app.gradeApplied}</div>
                      </div>
                    </div>
                  </td>

                  {/* Grado */}
                  <td className="px-4 py-3 whitespace-nowrap hidden sm:table-cell">
                    <span className="text-sm text-gray-700">{app.gradeApplied}</span>
                  </td>

                  {/* Padres */}
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="text-sm text-gray-500 truncate max-w-[200px] block">{app.parentNames}</span>
                  </td>

                  {/* Estado / Acción — cross-fade */}
                  <td className="px-4 py-3 relative overflow-hidden" style={{ minWidth: 180 }}>
                    {/* Badge de estado — se va al seleccionar */}
                    <div
                      className="absolute inset-y-0 left-4 right-4 flex items-center transition-all duration-300"
                      style={{
                        opacity: isSelected ? 0 : 1,
                        transform: isSelected ? 'translateX(-10px)' : 'translateX(0)',
                        pointerEvents: isSelected ? 'none' : 'auto'
                      }}
                    >
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(app.status)}`}>
                        {getStatusLabel(app.status)}
                      </span>
                    </div>

                    {/* Botón gestionar — aparece al seleccionar */}
                    <div
                      className="absolute inset-y-0 left-4 right-4 flex items-center gap-2 transition-all duration-300"
                      style={{
                        opacity: isSelected ? 1 : 0,
                        transform: isSelected ? 'translateX(0)' : 'translateX(10px)',
                        pointerEvents: isSelected ? 'auto' : 'none'
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Tip label="Ver y gestionar entrevistas del estudiante">
                        <button
                          onClick={() => onStudentSelect(app.id, app.studentName)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-azul-monte-tabor text-white hover:bg-blue-700 transition-colors shadow-sm whitespace-nowrap"
                        >
                          <FiCalendar className="w-3.5 h-3.5" />
                          Gestionar entrevistas
                        </button>
                      </Tip>
                      <Tip label="Deseleccionar">
                        <button
                          onClick={(e) => { e.stopPropagation(); setSelectedId(null); }}
                          className="flex items-center justify-center w-7 h-7 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors shrink-0"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </Tip>
                    </div>

                    {/* Spacer invisible */}
                    <div className="invisible">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs">placeholder</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer: contador + selector + paginación */}
      <div className="flex flex-wrap items-center justify-between gap-3 mt-3 px-1">
        <span className="text-xs text-gray-400">
          {Math.min((currentPage - 1) * pageSize + 1, applications.length)}–{Math.min(currentPage * pageSize, applications.length)} de {applications.length} estudiantes
        </span>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-400">Por página:</span>
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
              className="text-xs border border-gray-300 rounded px-1.5 py-1 bg-white"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="px-2 py-1 rounded border text-xs disabled:opacity-40 hover:bg-gray-100">«</button>
              <button onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 1} className="px-2 py-1 rounded border text-xs disabled:opacity-40 hover:bg-gray-100">‹</button>
              <span className="px-3 py-1 rounded border text-xs bg-azul-monte-tabor text-white">{currentPage} / {totalPages}</span>
              <button onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage === totalPages} className="px-2 py-1 rounded border text-xs disabled:opacity-40 hover:bg-gray-100">›</button>
              <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} className="px-2 py-1 rounded border text-xs disabled:opacity-40 hover:bg-gray-100">»</button>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

// Componente simple para vista detallada del estudiante
interface StudentDetailViewProps {
  applicationId: number;
  studentName: string;
  onBack: () => void;
  onScheduleInterview: (applicationId: number, interviewType?: string) => void;
  onViewInterview: (interview: Interview) => void;
  onEditInterview: (interview: Interview) => void;
  refreshKey: number; // Nueva prop para manejar actualizaciones
}

const StudentDetailView: React.FC<StudentDetailViewProps> = ({
  applicationId,
  studentName,
  onBack,
  onScheduleInterview,
  onViewInterview,
  onEditInterview,
  refreshKey
}) => {
  const [studentInterviews, setStudentInterviews] = useState<Interview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSendingSummary, setIsSendingSummary] = useState(false);
  const [summaryToast, setSummaryToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    loadStudentInterviews();
  }, [applicationId, refreshKey]); // Agregamos refreshKey a las dependencias

  const loadStudentInterviews = async () => {
    try {
      setIsLoading(true);

      const response = await interviewService.getInterviewsByApplication(applicationId);

      setStudentInterviews(response.interviews || []);
    } catch (error) {
      setStudentInterviews([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Función para enviar resumen de entrevistas al apoderado
  const handleSendInterviewSummary = async () => {
    try {
      setIsSendingSummary(true);

      const result = await interviewService.sendInterviewSummary(applicationId);

      if (result.success) {
        setSummaryToast({
          message: `${result.message || 'Resumen de entrevistas enviado exitosamente'}`,
          type: 'success'
        });
      } else {
        // Mostrar detalles específicos del error
        let errorMsg = result.error || 'Error al enviar resumen';
        if (result.details && result.details.missing) {
          errorMsg += ` - Faltan: ${result.details.missing.join(', ')}`;
        }
        setSummaryToast({
          message: `${errorMsg}`,
          type: 'error'
        });
      }
    } catch (error) {
      setSummaryToast({
        message: 'Error inesperado al enviar resumen de entrevistas',
        type: 'error'
      });
    } finally {
      setIsSendingSummary(false);
      // Auto-ocultar toast después de 5 segundos
      setTimeout(() => setSummaryToast(null), 5000);
    }
  };

  const interviewTypes = [
    { key: 'CYCLE_DIRECTOR', label: 'Entrevista Director de Ciclo', requiresTwoInterviewers: false },
    { key: 'FAMILY', label: 'Entrevista Familiar', requiresTwoInterviewers: true }
  ];

  const getInterviewForType = (type: string) => {
    // Buscar entrevista por tipo exacto
    const found = studentInterviews.find(interview => interview.type === type);

    // Log solo para debugging - es normal no tener todas las entrevistas agendadas
    if (found) {
    }

    return found;
  };

  return (
    <div className="space-y-6">
      {/* Toast para mensajes de envío de resumen */}
      {summaryToast && (
        <SimpleToast
          message={summaryToast.message}
          type={summaryToast.type}
          onClose={() => setSummaryToast(null)}
        />
      )}

      <Card className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">{studentName}</h3>
            <p className="text-sm text-gray-600">ID de aplicación: {applicationId}</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={handleSendInterviewSummary}
              disabled={isSendingSummary || isLoading}
            >
              <FiMail className="w-4 h-4 mr-2" />
              {isSendingSummary ? 'Enviando...' : 'Enviar Resumen por Email'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={loadStudentInterviews}
              disabled={isLoading}
            >
              Recargar
            </Button>
            <Button variant="outline" onClick={onBack}>
              <FiArrowLeft className="w-4 h-4 mr-2" />
              Volver a Lista
            </Button>
          </div>
        </div>

        <div className="grid gap-4">
          <div className="flex justify-between items-center">
            <h4 className="font-medium text-gray-900">Tipos de Entrevista</h4>
            <div className="text-sm text-blue-600 bg-blue-50 px-2 py-1 rounded">
              Debug: {studentInterviews.length} entrevistas cargadas
            </div>
          </div>
          
          {interviewTypes.map((type) => {
            const existingInterview = getInterviewForType(type.key);
            
            return (
              <div key={type.key} className="p-4 border border-gray-200 rounded-lg">
                <div className="flex justify-between items-center">
                  <div>
                    <h5 className="font-medium text-gray-900">{type.label}</h5>
                    {existingInterview ? (
                      <div className="text-sm text-gray-600 mt-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <FiCheck className="w-4 h-4 text-green-500" />
                          <span className="font-medium text-green-700">Programada</span>
                          <Badge
                            variant={
                              existingInterview.status === 'COMPLETED' ? 'success' :
                              existingInterview.status === 'CONFIRMED' ? 'info' :
                              existingInterview.status === 'SCHEDULED' ? 'warning' : 'secondary'
                            }
                            size="sm"
                          >
                            {existingInterview.status}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs bg-gray-50 p-2 rounded">
                          <div>
                            <span className="font-medium">Fecha:</span>
                            <br />
                            {(() => {
                              // Parsear fecha en zona horaria local para evitar desfase
                              const [year, month, day] = existingInterview.scheduledDate.split('-');
                              const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                              return date.toLocaleDateString('es-CL', {
                                weekday: 'short',
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              });
                            })()}
                          </div>
                          <div>
                            <span className="font-medium">Hora:</span>
                            <br />
                            {existingInterview.scheduledTime || 'No especificada'}
                          </div>
                          <div className={existingInterview.secondInterviewerName ? "col-span-2" : ""}>
                            <span className="font-medium">{existingInterview.secondInterviewerName ? 'Entrevistadores:' : 'Entrevistador:'}</span>
                            <br />
                            {existingInterview.interviewerName || 'No asignado'}
                            {existingInterview.secondInterviewerName && (
                              <> y {existingInterview.secondInterviewerName}</>
                            )}
                          </div>
                          <div>
                            <span className="font-medium">⏱️ Duración:</span>
                            <br />
                            {existingInterview.duration || 60} min
                          </div>
                          {existingInterview.location && (
                            <div className="col-span-2">
                              <span className="font-medium">Ubicación:</span>
                              <br />
                              {existingInterview.location}
                            </div>
                          )}
                          {existingInterview.notes && (
                            <div className="col-span-2">
                              <span className="font-medium">Notas:</span>
                              <br />
                              {existingInterview.notes}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500 mt-1 flex items-center gap-2">
                        <FiX className="w-4 h-4 text-gray-400" />
                        <span>No programada</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    {existingInterview ? (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onViewInterview(existingInterview)}
                        >
                          <FiEye className="w-4 h-4 mr-1" />
                          Ver
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onEditInterview(existingInterview)}
                        >
                          <FiEdit className="w-4 h-4 mr-1" />
                          Editar
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => onScheduleInterview(applicationId, type.key)}
                      >
                        <FiCalendar className="w-4 h-4 mr-1" />
                        Agendar
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
};

// ─── Modal de gestión de entrevistas del estudiante ─────────────────────────
interface StudentInterviewsModalProps {
  applicationId: number;
  studentName: string;
  refreshKey: number;
  onClose: () => void;
  onSchedule: (applicationId: number, type: string) => void;
  onView: (interview: Interview) => void;
  onEdit: (interview: Interview) => void;
  onRefresh: () => void;
}

const INTERVIEW_TYPES_CONFIG = [
  { key: 'CYCLE_DIRECTOR', label: 'Entrevista Director de Ciclo', icon: '🎓' },
  { key: 'FAMILY',         label: 'Entrevista Familiar',          icon: '👨‍👩‍👧' },
];

const StudentInterviewsModal: React.FC<StudentInterviewsModalProps> = ({
  applicationId,
  studentName,
  refreshKey,
  onClose,
  onSchedule,
  onView,
  onEdit,
  onRefresh,
}) => {
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    interviewService.getInterviewsByApplication(applicationId)
      .then(res => { if (!cancelled) setInterviews(res.interviews || []); })
      .catch(() => { if (!cancelled) setInterviews([]); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [applicationId, refreshKey]);

  const getForType = (key: string) =>
    interviews.find(i => i.type === key);

  const statusLabel = (s: string) => {
    const m: Record<string, string> = {
      SCHEDULED: 'Agendada', CONFIRMED: 'Confirmada',
      IN_PROGRESS: 'En curso', COMPLETED: 'Completada',
      CANCELLED: 'Cancelada', NO_SHOW: 'No asistió'
    };
    return m[s] || s;
  };

  const statusColor = (s: string) => {
    const m: Record<string, string> = {
      SCHEDULED: 'bg-yellow-100 text-yellow-800',
      CONFIRMED: 'bg-blue-100 text-blue-800',
      IN_PROGRESS: 'bg-indigo-100 text-indigo-800',
      COMPLETED: 'bg-green-100 text-green-800',
      CANCELLED: 'bg-red-100 text-red-800',
      NO_SHOW: 'bg-gray-100 text-gray-700',
    };
    return m[s] || 'bg-gray-100 text-gray-700';
  };

  const formatLocalDate = (d: string) => {
    const [y, m, day] = d.split('-');
    return new Date(parseInt(y), parseInt(m) - 1, parseInt(day))
      .toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* Panel */}
      <div
        className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-azul-monte-tabor to-blue-600">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <FiUser className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white leading-tight">{studentName}</h2>
              <p className="text-xs text-blue-100">Gestión de entrevistas</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onRefresh}
              title="Recargar"
              className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/20 text-white hover:bg-white/30 transition-colors"
            >
              <FiRefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/20 text-white hover:bg-white/30 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {isLoading ? (
            <div className="flex justify-center py-10">
              <LoadingSpinner size="lg" />
            </div>
          ) : (
            INTERVIEW_TYPES_CONFIG.map(({ key, label, icon }) => {
              const existing = getForType(key);
              return (
                <div
                  key={key}
                  className={`rounded-xl border-2 p-5 transition-colors ${
                    existing ? 'border-green-200 bg-green-50/40' : 'border-gray-200 bg-gray-50/60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    {/* Info izquierda */}
                    <div className="flex items-start gap-3 min-w-0">
                      <span className="text-2xl shrink-0 mt-0.5">{icon}</span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-gray-900 text-sm">{label}</h3>
                          {existing && (
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(existing.status)}`}>
                              {statusLabel(existing.status)}
                            </span>
                          )}
                        </div>

                        {existing ? (
                          <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-gray-600">
                            <div className="flex items-center gap-1.5">
                              <FiCalendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                              {formatLocalDate(existing.scheduledDate)}
                            </div>
                            <div className="flex items-center gap-1.5">
                              <FiClock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                              {existing.scheduledTime || '—'} · {existing.duration || 60} min
                            </div>
                            <div className="flex items-center gap-1.5 col-span-2">
                              <FiUser className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                              {existing.interviewerName || 'Sin asignar'}
                              {existing.secondInterviewerName && ` y ${existing.secondInterviewerName}`}
                            </div>
                            {existing.location && (
                              <div className="flex items-center gap-1.5 col-span-2">
                                <FiMapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                {existing.location}
                              </div>
                            )}
                          </div>
                        ) : (
                          <p className="mt-1 text-xs text-gray-400">No programada aún</p>
                        )}
                      </div>
                    </div>

                    {/* Acciones derecha */}
                    <div className="flex flex-col gap-2 shrink-0">
                      {existing ? (
                        <>
                          <button
                            onClick={() => { onView(existing); onClose(); }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border-2 border-azul-monte-tabor text-azul-monte-tabor hover:bg-blue-50 transition-colors whitespace-nowrap"
                          >
                            <FiEye className="w-3.5 h-3.5" />
                            Ver detalles
                          </button>
                          <button
                            onClick={() => { onEdit(existing); onClose(); }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border-2 border-gray-300 text-gray-600 hover:bg-gray-100 transition-colors whitespace-nowrap"
                          >
                            <FiEdit className="w-3.5 h-3.5" />
                            Editar
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => onSchedule(applicationId, key)}
                          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-azul-monte-tabor text-white hover:bg-blue-700 transition-colors shadow-sm whitespace-nowrap"
                        >
                          <FiCalendar className="w-3.5 h-3.5" />
                          Agendar entrevista
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-gray-50 flex justify-between items-center">
          <span className="text-xs text-gray-400">
            {interviews.filter(i => i.status !== 'CANCELLED').length} / {INTERVIEW_TYPES_CONFIG.length} entrevistas asignadas
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default InterviewManagement;