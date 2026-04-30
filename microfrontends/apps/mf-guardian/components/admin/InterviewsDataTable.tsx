import React, { useState, useEffect, useCallback } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import LoadingSpinner from '../ui/LoadingSpinner';
import AdvancedPagination from '../ui/AdvancedPagination';
import { useNotifications } from '../../context/AppContext';
import InterviewTable from '../interviews/InterviewTable';
import InterviewForm from '../interviews/InterviewForm';
import InterviewStatsPanel from '../interviews/InterviewStatsPanel';
import { FiPlus, FiDownload, FiFilter, FiRefreshCw, FiCalendar, FiUsers, FiBarChart } from 'react-icons/fi';
import {
  Interview,
  InterviewStatus,
  InterviewType,
  InterviewMode,
  InterviewFilters,
  InterviewStats,
  InterviewFormMode,
  CreateInterviewRequest,
  UpdateInterviewRequest,
  CompleteInterviewRequest,
  INTERVIEW_STATUS_LABELS,
  INTERVIEW_TYPE_LABELS,
  INTERVIEW_MODE_LABELS
} from '../../types/interview';
import interviewService from '../../services/interviewService';

interface InterviewsDataTableProps {
  className?: string;
}

const InterviewsDataTable: React.FC<InterviewsDataTableProps> = ({ className = '' }) => {
  // Estados principales
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [stats, setStats] = useState<InterviewStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Estados de paginación y filtros optimizados
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(5);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [filters, setFilters] = useState<InterviewFilters>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  // Estados de modales
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showFiltersModal, setShowFiltersModal] = useState(false);
  const [selectedInterview, setSelectedInterview] = useState<Interview | null>(null);

  // Estados de formulario
  const [formMode, setFormMode] = useState<InterviewFormMode>(InterviewFormMode.CREATE);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estados de vista
  const [activeView, setActiveView] = useState<'table' | 'calendar' | 'stats'>('table');

  const { addNotification } = useNotifications();

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Cargar datos iniciales
  useEffect(() => {
    loadInterviews();
    loadStats();
  }, [currentPage, pageSize, filters, debouncedSearchTerm]);

  const loadInterviews = async () => {
    try {
      setIsLoading(true);
      setError(null);

      let result;
      if (Object.keys(filters).length > 0) {
        result = await interviewService.getInterviewsWithFilters(
          filters,
          currentPage,
          pageSize,
          'scheduledDate',
          'desc'
        );
      } else {
        result = await interviewService.getAllInterviews(
          currentPage,
          pageSize,
          'scheduledDate',
          'desc',
          debouncedSearchTerm
        );
      }

      setInterviews(result.interviews);
      setTotalElements(result.totalElements);
      setTotalPages(result.totalPages);
    } catch (error) {
      console.error('Error loading interviews:', error);
      setError('Error al cargar las entrevistas');
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Error al cargar las entrevistas'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const statistics = await interviewService.getInterviewStatistics();
      setStats(statistics);
    } catch (error) {
      console.error('Error loading interview stats:', error);
    }
  };

  const refreshData = useCallback(async () => {
    setIsRefreshing(true);
    await Promise.all([loadInterviews(), loadStats()]);
    setIsRefreshing(false);
    addNotification({ type: 'success', title: 'Éxito', message: 'Datos actualizados correctamente' });
  }, [loadInterviews, loadStats]);

  // Handlers de CRUD
  const handleCreateInterview = async (data: CreateInterviewRequest) => {
    try {
      setIsSubmitting(true);
      await interviewService.createInterview(data);
      addNotification({ type: 'success', title: 'Éxito', message: 'Entrevista creada exitosamente' });
      setShowCreateModal(false);
      await refreshData();
    } catch (error) {
      console.error('Error creating interview:', error);
      addNotification({ type: 'error', title: 'Error', message: 'Error al crear la entrevista' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateInterview = async (data: UpdateInterviewRequest) => {
    if (!selectedInterview) return;

    try {
      setIsSubmitting(true);
      await interviewService.updateInterview(selectedInterview.id, data);
      addNotification({ type: 'success', title: 'Éxito', message: 'Entrevista actualizada exitosamente' });
      setShowEditModal(false);
      setSelectedInterview(null);
      await refreshData();
    } catch (error) {
      console.error('Error updating interview:', error);
      addNotification({ type: 'error', title: 'Error', message: 'Error al actualizar la entrevista' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCompleteInterview = async (data: CompleteInterviewRequest) => {
    if (!selectedInterview) return;

    try {
      setIsSubmitting(true);
      await interviewService.completeInterview(selectedInterview.id, data);
      addNotification({ type: 'success', title: 'Éxito', message: 'Entrevista completada exitosamente' });
      setShowCompleteModal(false);
      setSelectedInterview(null);
      await refreshData();
    } catch (error) {
      console.error('Error completing interview:', error);
      addNotification({ type: 'error', title: 'Error', message: 'Error al completar la entrevista' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handlers de acciones de tabla
  const handleView = (interview: Interview) => {
    setSelectedInterview(interview);
    setFormMode(InterviewFormMode.VIEW);
    setShowViewModal(true);
  };

  const handleEdit = (interview: Interview) => {
    setSelectedInterview(interview);
    setFormMode(InterviewFormMode.EDIT);
    setShowEditModal(true);
  };

  const handleComplete = (interview: Interview) => {
    setSelectedInterview(interview);
    setFormMode(InterviewFormMode.COMPLETE);
    setShowCompleteModal(true);
  };

  const handleCancel = async (interview: Interview) => {
    if (window.confirm('¿Está seguro de que desea cancelar esta entrevista?')) {
      try {
        await interviewService.cancelInterview(interview.id);
        addNotification({ type: 'success', title: 'Éxito', message: 'Entrevista cancelada exitosamente' });
        await refreshData();
      } catch (error) {
        console.error('Error cancelling interview:', error);
        addNotification({ type: 'error', title: 'Error', message: 'Error al cancelar la entrevista' });
      }
    }
  };

  const handleReschedule = (interview: Interview) => {
    // TODO: Implementar modal de reprogramación
    setSelectedInterview(interview);
    setFormMode(InterviewFormMode.EDIT);
    setShowEditModal(true);
    addNotification({ type: 'info', title: 'Información', message: 'Funcionalidad de reprogramación próximamente' });
  };

  const handleSendNotification = async (interview: Interview, type: 'scheduled' | 'confirmed' | 'reminder') => {
    try {
      await interviewService.sendNotification(interview.id, type);
      addNotification({ type: 'success', title: 'Éxito', message: 'Notificación enviada exitosamente' });
    } catch (error) {
      console.error('Error sending notification:', error);
      addNotification({ type: 'error', title: 'Error', message: 'Error al enviar la notificación' });
    }
  };

  const handleSendReminder = async (interview: Interview) => {
    try {
      await interviewService.sendReminder(interview.id);
      addNotification({ type: 'success', title: 'Éxito', message: 'Recordatorio enviado exitosamente' });
    } catch (error) {
      console.error('Error sending reminder:', error);
      addNotification({ type: 'error', title: 'Error', message: 'Error al enviar el recordatorio' });
    }
  };

  // Handlers de filtros
  const handleApplyFilters = (newFilters: InterviewFilters) => {
    setFilters(newFilters);
    setCurrentPage(0);
    setShowFiltersModal(false);
  };

  const handleClearFilters = () => {
    setFilters({});
    setSearchTerm('');
    setCurrentPage(0);
  };

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    setCurrentPage(0);
  };

  // Handlers de exportación
  const handleExportData = async () => {
    try {
      // TODO: Implementar exportación de datos
      addNotification({ type: 'info', title: 'Información', message: 'Funcionalidad de exportación próximamente' });
    } catch (error) {
      console.error('Error exporting data:', error);
      addNotification({ type: 'error', title: 'Error', message: 'Error al exportar los datos' });
    }
  };

  // Render de filtros activos
  const renderActiveFilters = () => {
    const activeFilters = [];
    
    if (filters.status) {
      activeFilters.push(`Estado: ${INTERVIEW_STATUS_LABELS[filters.status]}`);
    }
    if (filters.type) {
      activeFilters.push(`Tipo: ${INTERVIEW_TYPE_LABELS[filters.type]}`);
    }
    if (filters.mode) {
      activeFilters.push(`Modalidad: ${INTERVIEW_MODE_LABELS[filters.mode]}`);
    }
    if (filters.dateFrom) {
      activeFilters.push(`Desde: ${new Date(filters.dateFrom).toLocaleDateString()}`);
    }
    if (filters.dateTo) {
      activeFilters.push(`Hasta: ${new Date(filters.dateTo).toLocaleDateString()}`);
    }

    if (activeFilters.length === 0) return null;

    return (
      <div className="flex flex-wrap gap-2 mb-4">
        {activeFilters.map((filter, index) => (
          <span
            key={index}
            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
          >
            {filter}
          </span>
        ))}
        <Button
          variant="outline"
          size="sm"
          onClick={handleClearFilters}
          className="text-xs"
        >
          Limpiar filtros
        </Button>
      </div>
    );
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header con estadísticas */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center">
              <FiCalendar className="h-8 w-8 text-blue-400" />
              <div className="ml-4">
                <p className="text-2xl font-semibold text-gray-900">{stats.totalInterviews}</p>
                <p className="text-gray-600">Total Entrevistas</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center">
              <FiUsers className="h-8 w-8 text-green-400" />
              <div className="ml-4">
                <p className="text-2xl font-semibold text-gray-900">{stats.completedInterviews}</p>
                <p className="text-gray-600">Completadas</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center">
              <FiBarChart className="h-8 w-8 text-yellow-400" />
              <div className="ml-4">
                <p className="text-2xl font-semibold text-gray-900">{stats.scheduledInterviews}</p>
                <p className="text-gray-600">Programadas</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center">
              <FiCalendar className="h-8 w-8 text-red-400" />
              <div className="ml-4">
                <p className="text-2xl font-semibold text-gray-900">{stats.upcomingInterviews}</p>
                <p className="text-gray-600">Próximas</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Controles principales */}
      <Card className="p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          {/* Título y descripción */}
          <div>
            <h2 className="text-xl font-bold text-gray-900">Gestión de Entrevistas</h2>
            <p className="text-gray-600">Administra entrevistas, horarios y seguimiento de evaluaciones</p>
          </div>

          {/* Acciones principales */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="primary"
              onClick={() => {
                setFormMode(InterviewFormMode.CREATE);
                setShowCreateModal(true);
              }}
              className="flex items-center gap-2"
            >
              <FiPlus className="w-4 h-4" />
              Nueva Entrevista
            </Button>
            
            <Button
              variant="outline"
              onClick={() => setShowFiltersModal(true)}
              className="flex items-center gap-2"
            >
              <FiFilter className="w-4 h-4" />
              Filtros
            </Button>
            
            <Button
              variant="outline"
              onClick={handleExportData}
              className="flex items-center gap-2"
            >
              <FiDownload className="w-4 h-4" />
              Exportar
            </Button>
            
            <Button
              variant="outline"
              onClick={refreshData}
              disabled={isRefreshing}
              className="flex items-center gap-2"
            >
              <FiRefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Actualizando...' : 'Actualizar'}
            </Button>
          </div>
        </div>

        {/* Barra de búsqueda */}
        <div className="mt-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar por estudiante, entrevistador o notas..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Filtros activos */}
        {renderActiveFilters()}
      </Card>

      {/* Contenido principal */}
      <Card className="p-0 overflow-hidden">
        {error ? (
          <div className="p-6 text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={refreshData}>Reintentar</Button>
          </div>
        ) : (
          <>
            <InterviewTable
              interviews={interviews}
              isLoading={isLoading}
              onView={handleView}
              onEdit={handleEdit}
              onComplete={handleComplete}
              onCancel={handleCancel}
              onReschedule={handleReschedule}
              onSendNotification={handleSendNotification}
              onSendReminder={handleSendReminder}
            />

            {/* Paginación Avanzada */}
            {totalElements > 0 && (
              <div className="px-6 py-4 border-t border-gray-200">
                <AdvancedPagination
                  current={currentPage + 1}
                  total={totalElements}
                  pageSize={pageSize}
                  onChange={(page: number, newPageSize: number) => {
                    setCurrentPage(page - 1);
                    if (newPageSize !== pageSize) {
                      setPageSize(newPageSize);
                    }
                  }}
                  onShowSizeChange={(page: number, newPageSize: number) => {
                    setCurrentPage(page - 1);
                    setPageSize(newPageSize);
                  }}
                  pageSizeOptions={[5, 10, 20, 50, 100]}
                  showSizeChanger={true}
                  showQuickJumper={true}
                  showTotal={true}
                  size="default"
                />
              </div>
            )}
          </>
        )}
      </Card>

      {/* Modal para crear entrevista */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Nueva Entrevista"
        size="lg"
      >
        <InterviewForm
          mode={InterviewFormMode.CREATE}
          onSubmit={handleCreateInterview}
          onCancel={() => setShowCreateModal(false)}
          isSubmitting={isSubmitting}
        />
      </Modal>

      {/* Modal para editar entrevista */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedInterview(null);
        }}
        title="Editar Entrevista"
        size="lg"
      >
        {selectedInterview && (
          <InterviewForm
            interview={selectedInterview}
            mode={InterviewFormMode.EDIT}
            onSubmit={handleUpdateInterview}
            onCancel={() => {
              setShowEditModal(false);
              setSelectedInterview(null);
            }}
            isSubmitting={isSubmitting}
          />
        )}
      </Modal>

      {/* Modal para completar entrevista */}
      <Modal
        isOpen={showCompleteModal}
        onClose={() => {
          setShowCompleteModal(false);
          setSelectedInterview(null);
        }}
        title="Completar Entrevista"
        size="lg"
      >
        {selectedInterview && (
          <InterviewForm
            interview={selectedInterview}
            mode={InterviewFormMode.COMPLETE}
            onSubmit={handleCompleteInterview}
            onCancel={() => {
              setShowCompleteModal(false);
              setSelectedInterview(null);
            }}
            isSubmitting={isSubmitting}
          />
        )}
      </Modal>

      {/* Modal para ver detalles */}
      <Modal
        isOpen={showViewModal}
        onClose={() => {
          setShowViewModal(false);
          setSelectedInterview(null);
        }}
        title="Detalles de Entrevista"
        size="lg"
      >
        {selectedInterview && (
          <InterviewForm
            interview={selectedInterview}
            mode={InterviewFormMode.VIEW}
            onSubmit={() => {}}
            onCancel={() => {
              setShowViewModal(false);
              setSelectedInterview(null);
            }}
            isSubmitting={false}
          />
        )}
      </Modal>

      {/* Modal de filtros */}
      <Modal
        isOpen={showFiltersModal}
        onClose={() => setShowFiltersModal(false)}
        title="Filtrar Entrevistas"
        size="md"
      >
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Estado
            </label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              value={filters.status || ''}
              onChange={(e) => setFilters(prev => ({ 
                ...prev, 
                status: e.target.value as InterviewStatus || undefined 
              }))}
            >
              <option value="">Todos los estados</option>
              {Object.entries(INTERVIEW_STATUS_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo
            </label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              value={filters.type || ''}
              onChange={(e) => setFilters(prev => ({ 
                ...prev, 
                type: e.target.value as InterviewType || undefined 
              }))}
            >
              <option value="">Todos los tipos</option>
              {Object.entries(INTERVIEW_TYPE_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Modalidad
            </label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              value={filters.mode || ''}
              onChange={(e) => setFilters(prev => ({ 
                ...prev, 
                mode: e.target.value as InterviewMode || undefined 
              }))}
            >
              <option value="">Todas las modalidades</option>
              {Object.entries(INTERVIEW_MODE_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fecha desde
              </label>
              <input
                type="date"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                value={filters.dateFrom || ''}
                onChange={(e) => setFilters(prev => ({ 
                  ...prev, 
                  dateFrom: e.target.value || undefined 
                }))}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fecha hasta
              </label>
              <input
                type="date"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                value={filters.dateTo || ''}
                onChange={(e) => setFilters(prev => ({ 
                  ...prev, 
                  dateTo: e.target.value || undefined 
                }))}
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setShowFiltersModal(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setFilters({});
                setShowFiltersModal(false);
              }}
            >
              Limpiar
            </Button>
            <Button
              variant="primary"
              onClick={() => handleApplyFilters(filters)}
            >
              Aplicar Filtros
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default InterviewsDataTable;