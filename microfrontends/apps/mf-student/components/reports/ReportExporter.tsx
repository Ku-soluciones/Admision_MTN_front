import React, { useState } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import LoadingSpinner from '../ui/LoadingSpinner';
import { 
  FiDownload, 
  FiFileText, 
  FiBarChart2, 
  FiCalendar,
  FiTrendingUp,
  FiFilter,
  FiCheck,
  FiX
} from 'react-icons/fi';
import { Interview, InterviewStats } from '../../types/interview';
import { reportExportService, ExportOptions, ReportData } from '../../services/reportExportService';
import { useAuth } from '../../context/AuthContext';

interface ReportExporterProps {
  interviews: Interview[];
  stats?: InterviewStats;
  className?: string;
}

const ReportExporter: React.FC<ReportExporterProps> = ({ interviews, stats, className = '' }) => {
  const { user } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState<string | null>(null);
  
  // Estado del formulario de exportación
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'excel',
    reportType: 'interviews',
    includeCharts: true,
    includeSummary: true,
    dateRange: {
      start: '',
      end: ''
    },
    filters: {
      status: [],
      type: [],
      interviewer: []
    }
  });

  const reportTypes = [
    {
      id: 'interviews',
      name: 'Listado de Entrevistas',
      description: 'Reporte detallado de todas las entrevistas con filtros personalizables',
      icon: <FiFileText className="w-5 h-5" />,
      color: 'text-blue-600'
    },
    {
      id: 'statistics',
      name: 'Estadísticas Generales',
      description: 'Análisis estadístico completo del proceso de entrevistas',
      icon: <FiBarChart2 className="w-5 h-5" />,
      color: 'text-green-600'
    },
    {
      id: 'calendar',
      name: 'Calendario de Entrevistas',
      description: 'Vista de calendario con programación de entrevistas por semanas',
      icon: <FiCalendar className="w-5 h-5" />,
      color: 'text-purple-600'
    },
    {
      id: 'performance',
      name: 'Análisis de Rendimiento',
      description: 'Evaluación de performance de entrevistadores y tiempos de respuesta',
      icon: <FiTrendingUp className="w-5 h-5" />,
      color: 'text-orange-600'
    }
  ];

  const statusOptions = [
    'PENDING', 'SCHEDULED', 'CONFIRMED', 'IN_PROGRESS', 
    'COMPLETED', 'CANCELLED', 'NO_SHOW', 'RESCHEDULED'
  ];

  const typeOptions = [
    'INDIVIDUAL', 'FAMILY', 'PSYCHOLOGICAL', 'ACADEMIC', 'BEHAVIORAL'
  ];

  const handleExport = async () => {
    if (!interviews || interviews.length === 0) {
      setExportStatus('No hay datos para exportar');
      return;
    }

    setIsExporting(true);
    setExportStatus('Preparando exportación...');

    try {
      // Filtrar entrevistas según criterios
      let filteredInterviews = [...interviews];
      
      // Filtrar por rango de fechas
      if (exportOptions.dateRange?.start && exportOptions.dateRange?.end) {
        const startDate = new Date(exportOptions.dateRange.start);
        const endDate = new Date(exportOptions.dateRange.end);
        
        filteredInterviews = filteredInterviews.filter(interview => {
          const interviewDate = new Date(interview.scheduledDate);
          return interviewDate >= startDate && interviewDate <= endDate;
        });
      }

      // Filtrar por estado
      if (exportOptions.filters?.status && exportOptions.filters.status.length > 0) {
        filteredInterviews = filteredInterviews.filter(interview =>
          exportOptions.filters!.status!.includes(interview.status)
        );
      }

      // Filtrar por tipo
      if (exportOptions.filters?.type && exportOptions.filters.type.length > 0) {
        filteredInterviews = filteredInterviews.filter(interview =>
          exportOptions.filters!.type!.includes(interview.type)
        );
      }

      setExportStatus(`Exportando ${filteredInterviews.length} entrevistas...`);

      // Realizar exportación según tipo
      switch (exportOptions.reportType) {
        case 'interviews':
          if (exportOptions.format === 'excel') {
            await reportExportService.exportInterviewsToExcel(filteredInterviews, exportOptions);
          } else {
            const reportData: ReportData = {
              title: 'Reporte de Entrevistas',
              subtitle: `${filteredInterviews.length} entrevistas incluidas`,
              generatedAt: new Date().toISOString(),
              generatedBy: `${user?.firstName} ${user?.lastName}`,
              interviews: filteredInterviews
            };
            await reportExportService.exportToPDF(reportData, exportOptions);
          }
          break;

        case 'statistics':
          if (stats) {
            await reportExportService.exportStatsToExcel(stats, exportOptions);
          } else {
            throw new Error('No hay estadísticas disponibles');
          }
          break;

        case 'calendar':
          await reportExportService.exportCalendarToExcel(filteredInterviews, exportOptions);
          break;

        case 'performance':
          await reportExportService.exportPerformanceToExcel(filteredInterviews, exportOptions);
          break;

        default:
          throw new Error('Tipo de reporte no válido');
      }

      setExportStatus('✅ Exportación completada exitosamente');
      
      setTimeout(() => {
        setShowModal(false);
        setExportStatus(null);
      }, 2000);

    } catch (error: any) {
      console.error('Error en exportación:', error);
      setExportStatus(`❌ Error: ${error.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleFilterChange = (filterType: 'status' | 'type' | 'interviewer', value: string, checked: boolean) => {
    setExportOptions(prev => ({
      ...prev,
      filters: {
        ...prev.filters,
        [filterType]: checked 
          ? [...(prev.filters?.[filterType] || []), value]
          : (prev.filters?.[filterType] || []).filter(item => item !== value)
      }
    }));
  };

  return (
    <div className={className}>
      {/* Botón principal de exportación */}
      <Button
        variant="outline"
        onClick={() => setShowModal(true)}
        className="flex items-center"
      >
        <FiDownload className="w-4 h-4 mr-2" />
        Exportar Reportes
      </Button>

      {/* Modal de configuración de exportación */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Exportar Reportes de Entrevistas"
        size="lg"
      >
        <div className="space-y-6">
          {/* Selección de tipo de reporte */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Tipo de Reporte</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {reportTypes.map((type) => (
                <Card
                  key={type.id}
                  className={`p-4 cursor-pointer transition-all border-2 ${
                    exportOptions.reportType === type.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setExportOptions(prev => ({ ...prev, reportType: type.id as any }))}
                >
                  <div className="flex items-start space-x-3">
                    <div className={type.color}>
                      {type.icon}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 mb-1">{type.name}</h4>
                      <p className="text-sm text-gray-600">{type.description}</p>
                    </div>
                    {exportOptions.reportType === type.id && (
                      <FiCheck className="w-5 h-5 text-blue-600" />
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Formato de exportación */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3">Formato</h3>
            <div className="flex space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="format"
                  value="excel"
                  checked={exportOptions.format === 'excel'}
                  onChange={(e) => setExportOptions(prev => ({ ...prev, format: e.target.value as any }))}
                  className="mr-2"
                />
                <span className="text-sm">Excel (.xlsx)</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="format"
                  value="pdf"
                  checked={exportOptions.format === 'pdf'}
                  onChange={(e) => setExportOptions(prev => ({ ...prev, format: e.target.value as any }))}
                  className="mr-2"
                />
                <span className="text-sm">PDF</span>
              </label>
            </div>
          </div>

          {/* Rango de fechas */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3">
              <FiCalendar className="w-5 h-5 inline mr-2" />
              Rango de Fechas (Opcional)
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha Inicio
                </label>
                <input
                  type="date"
                  value={exportOptions.dateRange?.start || ''}
                  onChange={(e) => setExportOptions(prev => ({
                    ...prev,
                    dateRange: { ...prev.dateRange, start: e.target.value, end: prev.dateRange?.end || '' }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha Fin
                </label>
                <input
                  type="date"
                  value={exportOptions.dateRange?.end || ''}
                  onChange={(e) => setExportOptions(prev => ({
                    ...prev,
                    dateRange: { ...prev.dateRange, start: prev.dateRange?.start || '', end: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Filtros avanzados */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3">
              <FiFilter className="w-5 h-5 inline mr-2" />
              Filtros Avanzados
            </h3>
            
            <div className="space-y-4">
              {/* Filtro por estado */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Estados a Incluir</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {statusOptions.map(status => (
                    <label key={status} className="flex items-center text-sm">
                      <input
                        type="checkbox"
                        checked={exportOptions.filters?.status?.includes(status) || false}
                        onChange={(e) => handleFilterChange('status', status, e.target.checked)}
                        className="mr-2"
                      />
                      <span className="text-xs">{status.replace('_', ' ')}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Filtro por tipo */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Tipos a Incluir</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {typeOptions.map(type => (
                    <label key={type} className="flex items-center text-sm">
                      <input
                        type="checkbox"
                        checked={exportOptions.filters?.type?.includes(type) || false}
                        onChange={(e) => handleFilterChange('type', type, e.target.checked)}
                        className="mr-2"
                      />
                      <span className="text-xs">{type}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Opciones adicionales */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3">Opciones Adicionales</h3>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={exportOptions.includeSummary}
                  onChange={(e) => setExportOptions(prev => ({ ...prev, includeSummary: e.target.checked }))}
                  className="mr-2"
                />
                <span className="text-sm">Incluir resumen estadístico</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={exportOptions.includeCharts}
                  onChange={(e) => setExportOptions(prev => ({ ...prev, includeCharts: e.target.checked }))}
                  className="mr-2"
                />
                <span className="text-sm">Incluir gráficos y visualizaciones</span>
              </label>
            </div>
          </div>

          {/* Estado de exportación */}
          {exportStatus && (
            <Card className="p-4 bg-blue-50 border-blue-200">
              <div className="flex items-center space-x-2">
                {isExporting && <LoadingSpinner size="sm" />}
                <span className="text-sm text-blue-800">{exportStatus}</span>
              </div>
            </Card>
          )}

          {/* Información de vista previa */}
          <Card className="p-4 bg-gray-50">
            <h4 className="font-medium text-gray-900 mb-2">Vista Previa de Exportación</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Entrevistas disponibles:</span>
                <span className="font-medium ml-1">{interviews?.length || 0}</span>
              </div>
              <div>
                <span className="text-gray-600">Formato seleccionado:</span>
                <span className="font-medium ml-1 uppercase">{exportOptions.format}</span>
              </div>
              <div>
                <span className="text-gray-600">Tipo de reporte:</span>
                <span className="font-medium ml-1">
                  {reportTypes.find(t => t.id === exportOptions.reportType)?.name}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Con filtros aplicados:</span>
                <span className="font-medium ml-1">
                  {(exportOptions.filters?.status?.length || 0) + 
                   (exportOptions.filters?.type?.length || 0) > 0 ? 'Sí' : 'No'}
                </span>
              </div>
            </div>
          </Card>

          {/* Botones de acción */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => setShowModal(false)}
              disabled={isExporting}
            >
              <FiX className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={handleExport}
              disabled={isExporting || !interviews || interviews.length === 0}
              isLoading={isExporting}
              loadingText="Exportando..."
            >
              <FiDownload className="w-4 h-4 mr-2" />
              Exportar Reporte
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ReportExporter;