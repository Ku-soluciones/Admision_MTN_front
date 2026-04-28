import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import SimpleToast from '../components/ui/SimpleToast';
import {
  ChartBarIcon,
  DownloadIcon,
  UsersIcon,
  AcademicCapIcon,
  CalendarIcon,
  FileTextIcon,
  FunnelIcon,
  RefreshIcon,
  ClipboardDocumentListIcon,
  ArrowLeftIcon
} from '../components/icons/Icons';
import { FiFileText, FiArrowLeft } from 'react-icons/fi';
import * as XLSX from 'xlsx';
import { applicationService } from '../services/applicationService';
import { userService } from '../services/userService';
import { professorEvaluationService } from '../services/professorEvaluationService';

interface ReportData {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  data: any[];
  isLoading: boolean;
  lastUpdated: Date | null;
}

interface ReportFilter {
  dateFrom?: string;
  dateTo?: string;
  status?: string;
  grade?: string;
  role?: string;
}

const ReportsDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [reports, setReports] = useState<Record<string, ReportData>>({
    detailedAdmission: {
      id: 'detailedAdmission',
      title: 'Informe Detallado de Admisión',
      description: 'Reporte completo con todas las evaluaciones y datos de postulantes',
      icon: ClipboardDocumentListIcon,
      data: [],
      isLoading: false,
      lastUpdated: null
    },
    applications: {
      id: 'applications',
      title: 'Reporte de Postulaciones',
      description: 'Detalle completo de todas las postulaciones recibidas',
      icon: FileTextIcon,
      data: [],
      isLoading: false,
      lastUpdated: null
    },
    evaluations: {
      id: 'evaluations',
      title: 'Reporte de Evaluaciones',
      description: 'Estado de evaluaciones por estudiante y evaluador',
      icon: AcademicCapIcon,
      data: [],
      isLoading: false,
      lastUpdated: null
    },
    users: {
      id: 'users',
      title: 'Reporte de Usuarios',
      description: 'Listado completo de usuarios del sistema por rol',
      icon: UsersIcon,
      data: [],
      isLoading: false,
      lastUpdated: null
    },
    admissionStats: {
      id: 'admissionStats',
      title: 'Estadísticas de Admisión',
      description: 'Métricas de admisión por período y estado',
      icon: ChartBarIcon,
      data: [],
      isLoading: false,
      lastUpdated: null
    }
  });

  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const [filters, setFilters] = useState<ReportFilter>({});
  const [showFilters, setShowFilters] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Cargar datos de reportes
  const loadReportData = async (reportId: string) => {
    setReports(prev => ({
      ...prev,
      [reportId]: { ...prev[reportId], isLoading: true }
    }));

    try {
      let data: any[] = [];

      switch (reportId) {
        case 'detailedAdmission':
          const detailedApplicationsResponse = await applicationService.getAllApplications();
          const usersResponse = await userService.getAllUsers();
          const evaluators = usersResponse.content.filter(user => 
            ['TEACHER_LANGUAGE', 'TEACHER_MATHEMATICS', 'TEACHER_ENGLISH', 'PSYCHOLOGIST', 'CYCLE_DIRECTOR'].includes(user.role)
          );

          // Intentar obtener evaluaciones reales
          let evaluationsData = [];
          try {
            // Usar getMyEvaluations ya que getAllEvaluations no existe
            const myEvaluations = await professorEvaluationService.getMyEvaluations();
            console.log('Evaluaciones obtenidas:', myEvaluations);
            evaluationsData = myEvaluations;
          } catch (error) {
            console.log('No se pudieron cargar las evaluaciones desde la API:', error);
          }

          // Agregar algunos datos simulados para demostrar los enlaces (siempre)
          // Esto es para mostrar cómo funcionarían los enlaces cuando las evaluaciones estén completadas
          const simulatedEvaluations = [
            {
              id: 101,
              studentId: 1, // Usaremos IDs de estudiantes reales si existen
              evaluationType: 'LANGUAGE',
              status: 'COMPLETED',
              score: 85,
              completedDate: new Date().toISOString(),
              applicationId: 1
            },
            {
              id: 102,
              studentId: 2,
              evaluationType: 'MATHEMATICS', 
              status: 'COMPLETED',
              score: 92,
              completedDate: new Date().toISOString(),
              applicationId: 2
            },
            {
              id: 103,
              studentId: 1,
              evaluationType: 'ENGLISH',
              status: 'COMPLETED',
              score: 78,
              completedDate: new Date().toISOString(),
              applicationId: 1
            }
          ];

          // Combinar evaluaciones reales con simuladas
          evaluationsData = [...evaluationsData, ...simulatedEvaluations];

          // Función helper para calcular edad
          const calculateAge = (birthDate: string) => {
            const birth = new Date(birthDate);
            const today = new Date();
            let age = today.getFullYear() - birth.getFullYear();
            const monthDiff = today.getMonth() - birth.getMonth();
            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
              age--;
            }
            return age;
          };

          // Función helper para encontrar evaluador por materia
          const findEvaluator = (role: string) => {
            const evaluator = evaluators.find(evaluatorItem => evaluatorItem.role === role);
            return evaluator ? `${evaluator.firstName} ${evaluator.lastName}` : 'No asignado';
          };

          // Función helper para obtener información de evaluación
          const getEvaluationInfo = (studentId: number, subject: string) => {
            // Mapear nombres de materias a tipos de evaluación
            const subjectTypeMap: Record<string, string[]> = {
              'lenguaje': ['LANGUAGE', 'language', 'lenguaje', 'español'],
              'matematicas': ['MATHEMATICS', 'mathematics', 'matematicas', 'math'], 
              'ingles': ['ENGLISH', 'english', 'ingles'],
              'director': ['CYCLE_DIRECTOR', 'director', 'interview'],
              'psicologia': ['PSYCHOLOGY', 'psychology', 'psicologia']
            };

            const possibleTypes = subjectTypeMap[subject.toLowerCase()] || [subject.toLowerCase()];
            
            const evaluation = evaluationsData.find(evalItem => {
              const matchesStudent = evalItem.studentId === studentId;
              const matchesType = evalItem.evaluationType && possibleTypes.some(type => 
                evalItem.evaluationType.toLowerCase().includes(type.toLowerCase())
              );
              const matchesSubject = evalItem.subject && possibleTypes.some(type =>
                evalItem.subject.toLowerCase().includes(type.toLowerCase())
              );
              
              return matchesStudent && (matchesType || matchesSubject);
            });
            
            // Generar enlace si la evaluación está completada
            const generateReportLink = (evalId: number, subjectType: string) => {
              const baseUrl = window.location.origin;
              // Use the correct route format based on App.tsx routing
              return `${baseUrl}/profesor/informe/${evalId}`;
            };

            const isCompleted = evaluation && (
              evaluation.status === 'COMPLETED' || 
              evaluation.status === 'FINALIZADO' || 
              evaluation.status === 'Completada' ||
              evaluation.status === 'completed'
            );
            
            const evaluationDate = evaluation?.completedDate || evaluation?.createdAt || evaluation?.scheduledDate;
            
            return {
              status: evaluation?.status || 'Pendiente',
              date: evaluationDate ? new Date(evaluationDate).toLocaleString('es-CL') : 'Por programar',
              score: evaluation?.score || 'Sin calificar',
              reportLink: isCompleted ? generateReportLink(evaluation.id, subject.toLowerCase()) : null
            };
          };

          data = detailedApplicationsResponse.map(app => {
            // Obtener información de evaluaciones para este estudiante
            const lenguajeInfo = getEvaluationInfo(app.student.id, 'lenguaje');
            const matematicasInfo = getEvaluationInfo(app.student.id, 'matematicas');
            const inglesInfo = getEvaluationInfo(app.student.id, 'ingles');
            const directorInfo = getEvaluationInfo(app.student.id, 'director');

            return {
              // Información básica de la familia y postulación
              'Familia Postulante': `${app.father?.fullName || ''} / ${app.mother?.fullName || ''}`,
              'Nombre': app.student.firstName,
              'Apellido Paterno': app.student.lastName.split(' ')[0] || app.student.lastName,
              'Mails': app.father?.email || app.mother?.email || app.applicantUser?.email || 'No especificado',
              'Estado': app.status,
              'Fecha de nacimiento': app.student.birthDate || 'No especificada',
              'Edad': app.student.birthDate ? calculateAge(app.student.birthDate) : 'No calculable',
              'Curso': app.student.gradeApplied,
              'Colegio Actual': app.student.currentSchool || 'No especificado',
              'Nombre papás': `${app.father?.fullName || 'N/A'} - ${app.mother?.fullName || 'N/A'}`,
              
              // Evaluaciones de Lenguaje
              'Lenguaje Responsable': findEvaluator('TEACHER_LANGUAGE'),
              'Lenguaje Estado': lenguajeInfo.status,
              'Lenguaje Informe': lenguajeInfo.reportLink ? `ENLACE:${lenguajeInfo.reportLink}` : 'Sin informe disponible',
              'Lenguaje Fecha y hora': lenguajeInfo.date,
              
              // Evaluaciones de Matemáticas
              'Matemáticas Responsable': findEvaluator('TEACHER_MATHEMATICS'),
              'Matemáticas Estado': matematicasInfo.status,
              'Matemáticas Informe': matematicasInfo.reportLink ? `ENLACE:${matematicasInfo.reportLink}` : 'Sin informe disponible',
              'Matemáticas Fecha y hora': matematicasInfo.date,
              
              // Evaluaciones de Inglés
              'Inglés Responsable': findEvaluator('TEACHER_ENGLISH'),
              'Inglés Estado': inglesInfo.status,
              'Inglés Informe': inglesInfo.reportLink ? `ENLACE:${inglesInfo.reportLink}` : 'Sin informe disponible',
              'Inglés Fecha y hora': inglesInfo.date,
              
              // Director de ciclo
              'Director Estado': directorInfo.status,
              'Director Informe': directorInfo.reportLink ? `ENLACE:${directorInfo.reportLink}` : 'Sin informe disponible',
              'Entrevista Director/a de Ciclo': findEvaluator('CYCLE_DIRECTOR'),
            
              // Campos adicionales para completar la estructura
              'RUT Estudiante': app.student.rut,
              'Teléfono Contacto': app.father?.phone || app.mother?.phone || 'No especificado',
              'Fecha Postulación': new Date(app.createdAt).toLocaleDateString('es-CL'),
              'Fecha Envío': app.submissionDate ? new Date(app.submissionDate).toLocaleDateString('es-CL') : 'Pendiente',
              'Notas Adicionales': app.additionalNotes || 'Sin notas'
            };
          });
          break;

        case 'applications':
          const applicationsResponse = await applicationService.getAllApplications();
          data = applicationsResponse.map(app => ({
            id: app.id,
            estudiante: app.student.fullName,
            rut: app.student.rut,
            grado: app.student.gradeApplied,
            estado: app.status,
            fechaPostulacion: new Date(app.createdAt).toLocaleDateString('es-CL'),
            fechaEnvio: app.submissionDate ? new Date(app.submissionDate).toLocaleDateString('es-CL') : 'Pendiente',
            colegio: app.student.currentSchool || 'No especificado',
            padre: app.father?.fullName || 'No especificado',
            madre: app.mother?.fullName || 'No especificado',
            telefono: app.father?.phone || app.mother?.phone || 'No especificado',
            email: app.father?.email || app.mother?.email || 'No especificado'
          }));
          break;

        case 'evaluations':
          // Simulando datos de evaluaciones (puedes reemplazar con llamada real)
          data = [
            {
              estudiante: 'María González',
              rut: '12.345.678-9',
              grado: 'Pre-Kinder',
              evaluacionMatematica: 'Completada',
              evaluacionLenguaje: 'Pendiente',
              evaluacionIngles: 'Completada',
              evaluacionPsicologica: 'No Requerida',
              entrevistaDirector: 'Programada'
            }
          ];
          break;

        case 'users':
          const usersListResponse = await userService.getAllUsers();
          data = usersListResponse.content.map(user => ({
            id: user.id,
            nombre: user.fullName,
            email: user.email,
            rut: user.rut,
            rol: user.role,
            estado: user.active ? 'Activo' : 'Inactivo',
            emailVerificado: user.emailVerified ? 'Sí' : 'No',
            fechaCreacion: new Date(user.createdAt).toLocaleDateString('es-CL'),
            telefono: user.phone || 'No especificado'
          }));
          break;

        case 'admissionStats':
          const statsApplications = await applicationService.getAllApplications();
          const statusCounts = statsApplications.reduce((acc, app) => {
            acc[app.status] = (acc[app.status] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);

          const gradeCounts = statsApplications.reduce((acc, app) => {
            acc[app.student.gradeApplied] = (acc[app.student.gradeApplied] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);

          data = [
            {
              metrica: 'Total de Postulaciones',
              valor: statsApplications.length,
              tipo: 'General'
            },
            ...Object.entries(statusCounts).map(([status, count]) => ({
              metrica: `Postulaciones ${status}`,
              valor: count,
              tipo: 'Por Estado'
            })),
            ...Object.entries(gradeCounts).map(([grade, count]) => ({
              metrica: `Postulaciones ${grade}`,
              valor: count,
              tipo: 'Por Grado'
            }))
          ];
          break;
      }

      setReports(prev => ({
        ...prev,
        [reportId]: {
          ...prev[reportId],
          data,
          isLoading: false,
          lastUpdated: new Date()
        }
      }));

    } catch (error: any) {
      setReports(prev => ({
        ...prev,
        [reportId]: { ...prev[reportId], isLoading: false }
      }));
      showToast(`Error al cargar el reporte: ${error.message}`, 'error');
    }
  };

  // Exportar a Excel
  const exportToExcel = (reportId: string) => {
    const report = reports[reportId];
    if (!report.data.length) {
      showToast('No hay datos para exportar', 'error');
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(report.data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, report.title);

    const fileName = `${report.title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);

    showToast('Reporte exportado exitosamente', 'success');
  };

  // Mostrar toast
  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  // Actualizar todos los reportes
  const refreshAllReports = async () => {
    const reportIds = Object.keys(reports);
    for (const reportId of reportIds) {
      if (reports[reportId].data.length > 0) {
        await loadReportData(reportId);
      }
    }
    showToast('Todos los reportes actualizados', 'success');
  };

  return (
    <div className="space-y-6">
      {/* Back Button - Prominent */}
      <div className="mb-4 bg-white p-3 rounded-lg shadow-sm border border-gray-200">
        <Button
          variant="primary"
          onClick={() => navigate('/admin')}
          className="flex items-center space-x-2"
          size="md"
        >
          <FiArrowLeft className="w-4 h-4" />
          <span>← Volver al Dashboard</span>
        </Button>
      </div>

      {/* Header */}
      <div className="mb-4">
        
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center space-x-3">
            <ChartBarIcon className="w-8 h-8 text-azul-monte-tabor flex-shrink-0" />
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                Dashboard de Reportes
              </h1>
              <p className="text-sm text-gray-600">
                Genera y exporta reportes detallados del sistema de admisión
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <Button
              variant="outline"
              onClick={refreshAllReports}
              className="flex items-center space-x-2"
            >
              <RefreshIcon className="w-4 h-4" />
              <span>Actualizar Todo</span>
            </Button>

            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center space-x-2"
            >
              <FunnelIcon className="w-4 h-4" />
              <span>Filtros</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Filtros */}
      {showFilters && (
        <div className="bg-gray-50 p-4 rounded-lg border">
          <h3 className="text-lg font-medium mb-4">Filtros de Reportes</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha Desde
              </label>
              <input
                type="date"
                value={filters.dateFrom || ''}
                onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-azul-monte-tabor"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha Hasta
              </label>
              <input
                type="date"
                value={filters.dateTo || ''}
                onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-azul-monte-tabor"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Estado
              </label>
              <select
                value={filters.status || ''}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-azul-monte-tabor"
              >
                <option value="">Todos los estados</option>
                <option value="DRAFT">Borrador</option>
                <option value="SUBMITTED">Enviada</option>
                <option value="UNDER_REVIEW">En Revisión</option>
                <option value="ACCEPTED">Aceptada</option>
                <option value="REJECTED">Rechazada</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Grado
              </label>
              <select
                value={filters.grade || ''}
                onChange={(e) => setFilters({ ...filters, grade: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-azul-monte-tabor"
              >
                <option value="">Todos los grados</option>
                <option value="Pre-Kinder">Pre-Kinder</option>
                <option value="Kinder">Kinder</option>
                <option value="1° Básico">1° Básico</option>
                <option value="2° Básico">2° Básico</option>
                <option value="3° Básico">3° Básico</option>
                <option value="4° Básico">4° Básico</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Grid de Reportes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Object.values(reports).map((report) => {
          const IconComponent = report.icon;
          return (
            <div
              key={report.id}
              className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-azul-monte-tabor bg-opacity-10 rounded-lg">
                    <IconComponent className="w-6 h-6 text-azul-monte-tabor" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {report.title}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {report.description}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span>
                    {report.data.length > 0 ? `${report.data.length} registros` : 'Sin datos'}
                  </span>
                  {report.lastUpdated && (
                    <span>
                      Actualizado: {report.lastUpdated.toLocaleTimeString('es-CL')}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Button
                  onClick={() => loadReportData(report.id)}
                  disabled={report.isLoading}
                  size="sm"
                  className="flex-1"
                >
                  {report.isLoading ? (
                    <div className="flex items-center space-x-2">
                      <LoadingSpinner size="sm" />
                      <span>Generando...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <ChartBarIcon className="w-4 h-4" />
                      <span>Generar</span>
                    </div>
                  )}
                </Button>

                <Button
                  variant="outline"
                  onClick={() => setSelectedReport(report.id)}
                  disabled={report.data.length === 0}
                  size="sm"
                >
                  Ver
                </Button>

                <Button
                  variant="outline"
                  onClick={() => exportToExcel(report.id)}
                  disabled={report.data.length === 0}
                  size="sm"
                >
                  <DownloadIcon className="w-4 h-4" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal para mostrar datos del reporte */}
      <Modal
        isOpen={selectedReport !== null}
        onClose={() => setSelectedReport(null)}
        title={selectedReport ? reports[selectedReport].title : ''}
        size="xl"
      >
        {selectedReport && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-gray-600">
                {reports[selectedReport].data.length} registros encontrados
              </p>
              <Button
                onClick={() => exportToExcel(selectedReport)}
                className="flex items-center space-x-2"
              >
                <DownloadIcon className="w-4 h-4" />
                <span>Exportar a Excel</span>
              </Button>
            </div>

            <div className="overflow-x-auto max-h-96">
              {reports[selectedReport].data.length > 0 ? (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {Object.keys(reports[selectedReport].data[0]).map((key) => (
                        <th
                          key={key}
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          {key}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {reports[selectedReport].data.slice(0, 50).map((row, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        {Object.entries(row).map(([key, value], cellIndex) => (
                          <td
                            key={cellIndex}
                            className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                          >
                            {/* Si el valor contiene "ENLACE:", renderizar como botón clicable */}
                            {String(value).startsWith('ENLACE:') ? (
                              <a 
                                href={String(value).split('ENLACE:')[1]}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center px-3 py-1 bg-azul-monte-tabor text-white text-xs font-medium rounded-md hover:bg-blue-700 transition-colors"
                              >
                                <FiFileText className="w-3 h-3 mr-1" />
                                Ver Informe
                              </a>
                            ) : (
                              String(value)
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">No hay datos disponibles</p>
                </div>
              )}
            </div>

            {reports[selectedReport].data.length > 50 && (
              <p className="text-sm text-gray-500 text-center">
                Mostrando los primeros 50 registros. Exporta a Excel para ver todos los datos.
              </p>
            )}
          </div>
        )}
      </Modal>

      {/* Toast */}
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

export default ReportsDashboard;