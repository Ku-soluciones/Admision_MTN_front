import React, { useState, useEffect } from 'react';
import { useNotifications } from '../../context/AppContext';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import { 
  evaluationService
} from '../../services/evaluationService';
import {
  Evaluation,
  EvaluationType,
  EvaluationStatus,
  EVALUATION_TYPE_LABELS,
  EVALUATION_STATUS_LABELS
} from '../../types/evaluation';
import { Application } from '../../services/applicationService';
import AcademicEvaluationForm from '../evaluations/AcademicEvaluationForm';
import PsychologicalInterviewForm from '../evaluations/PsychologicalInterviewForm';
import CycleDirectorForm from '../evaluations/CycleDirectorForm';
import {
  FileText,
  Eye,
  Download,
  Printer,
  Calculator,
  BookOpen,
  Globe,
  User,
  ClipboardList,
  RefreshCw
} from 'lucide-react';

interface EvaluationReportsProps {
  applications: Application[];
  onRefresh: () => void;
}

interface EvaluationWithDetails extends Evaluation {
  applicationDetails?: {
    studentName: string;
    rut: string;
    gradeApplied: string;
  };
}

const EvaluationReports: React.FC<EvaluationReportsProps> = ({
  applications,
  onRefresh
}) => {
  const [evaluations, setEvaluations] = useState<EvaluationWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedEvaluation, setSelectedEvaluation] = useState<EvaluationWithDetails | null>(null);
  const [showFormModal, setShowFormModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 5;
  
  const [filters, setFilters] = useState({
    type: 'all',
    status: 'all',
    search: ''
  });

  useEffect(() => { setCurrentPage(1); }, [filters]);

  const { addNotification } = useNotifications();

  useEffect(() => {
    loadEvaluations();
  }, [applications]);

  const loadEvaluations = async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      
      // Simulamos evaluaciones con datos mock para desarrollo
      const mockEvaluations: EvaluationWithDetails[] = [
        {
          id: 1,
          evaluationType: EvaluationType.LANGUAGE_EXAM,
          status: EvaluationStatus.COMPLETED,
          score: 85,
          grade: 'B+',
          observations: 'El estudiante demuestra buen dominio del lenguaje escrito y comprensión lectora.',
          strengths: 'Excelente vocabulario y capacidad de análisis de textos.',
          areasForImprovement: 'Mejorar la expresión oral y participación en discusiones.',
          recommendations: 'Fomentar la participación en debates y presentaciones orales.',
          evaluationDate: '2025-08-15',
          completionDate: '2025-08-15',
          createdAt: '2025-08-15T10:00:00',
          updatedAt: '2025-08-15T15:30:00',
          evaluator: {
            id: 1,
            firstName: 'María',
            lastName: 'González',
            email: 'maria.gonzalez@mtn.cl',
            role: 'TEACHER_LANGUAGE'
          },
          applicationDetails: {
            studentName: 'Juan Carlos Gangale González',
            rut: '12345678-9',
            gradeApplied: '3° Básico'
          }
        },
        {
          id: 2,
          evaluationType: EvaluationType.MATHEMATICS_EXAM,
          status: EvaluationStatus.IN_PROGRESS,
          evaluationDate: '2025-08-16',
          createdAt: '2025-08-16T09:00:00',
          updatedAt: '2025-08-16T09:00:00',
          evaluator: {
            id: 2,
            firstName: 'Pedro',
            lastName: 'Rodríguez',
            email: 'pedro.rodriguez@mtn.cl',
            role: 'TEACHER_MATHEMATICS'
          },
          applicationDetails: {
            studentName: 'Ana Sofía González López',
            rut: '87654321-0',
            gradeApplied: '4° Básico'
          }
        },
        {
          id: 3,
          evaluationType: EvaluationType.PSYCHOLOGICAL_INTERVIEW,
          status: EvaluationStatus.COMPLETED,
          observations: 'Estudiante con buen desarrollo socioemocional y alta motivación.',
          socialSkillsAssessment: 'Demuestra habilidades sociales apropiadas para su edad.',
          emotionalMaturity: 'Nivel de madurez emocional acorde a su desarrollo.',
          motivationAssessment: 'Alta motivación intrínseca hacia el aprendizaje.',
          familySupportAssessment: 'Familia muy comprometida con el proceso educativo.',
          strengths: 'Resiliencia, adaptabilidad y buenas relaciones interpersonales.',
          areasForImprovement: 'Trabajar en la tolerancia a la frustración en tareas complejas.',
          recommendations: 'Continuar con el apoyo familiar y considerar actividades extracurriculares.',
          evaluationDate: '2025-08-17',
          completionDate: '2025-08-17',
          createdAt: '2025-08-17T14:00:00',
          updatedAt: '2025-08-17T16:45:00',
          evaluator: {
            id: 3,
            firstName: 'Ana',
            lastName: 'López',
            email: 'ana.lopez@mtn.cl',
            role: 'PSYCHOLOGIST'
          },
          applicationDetails: {
            studentName: 'Diego Muñoz Rivera',
            rut: '19876543-2',
            gradeApplied: '5° Básico'
          }
        }
      ];
      
      if (isManualRefresh) {
        await new Promise(resolve => setTimeout(resolve, 600));
      }
      setEvaluations(mockEvaluations);
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Error al cargar las evaluaciones'
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const getTypeIcon = (type: EvaluationType) => {
    switch (type) {
      case EvaluationType.LANGUAGE_EXAM:
        return <BookOpen className="w-5 h-5" />;
      case EvaluationType.MATHEMATICS_EXAM:
        return <Calculator className="w-5 h-5" />;
      case EvaluationType.ENGLISH_EXAM:
        return <Globe className="w-5 h-5" />;
      case EvaluationType.PSYCHOLOGICAL_INTERVIEW:
        return <User className="w-5 h-5" />;
      case EvaluationType.CYCLE_DIRECTOR_INTERVIEW:
      case EvaluationType.CYCLE_DIRECTOR_REPORT:
        return <ClipboardList className="w-5 h-5" />;
      default:
        return <FileText className="w-5 h-5" />;
    }
  };

  const getStatusColor = (status: EvaluationStatus) => {
    switch (status) {
      case EvaluationStatus.PENDING:        return 'bg-yellow-100 text-yellow-800';
      case EvaluationStatus.IN_PROGRESS:   return 'bg-blue-100 text-blue-800';
      case EvaluationStatus.COMPLETED:     return 'bg-green-100 text-green-800';
      case EvaluationStatus.REVIEWED:      return 'bg-purple-100 text-purple-800';
      case EvaluationStatus.APPROVED:      return 'bg-green-100 text-green-800';
      default:                             return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusBadgeClass = (status: EvaluationStatus) => {
    switch (status) {
      case EvaluationStatus.PENDING:        return 'bg-amber-50 text-amber-800 ring-amber-600/20';
      case EvaluationStatus.IN_PROGRESS:   return 'bg-blue-50 text-blue-800 ring-blue-600/20';
      case EvaluationStatus.COMPLETED:     return 'bg-emerald-50 text-emerald-800 ring-emerald-600/20';
      case EvaluationStatus.REVIEWED:      return 'bg-violet-50 text-violet-800 ring-violet-600/20';
      case EvaluationStatus.APPROVED:      return 'bg-emerald-50 text-emerald-800 ring-emerald-600/20';
      default:                             return 'bg-slate-100 text-slate-700 ring-slate-500/20';
    }
  };

  const filteredEvaluations = evaluations.filter(evaluation => {
    const matchesType = filters.type === 'all' || evaluation.evaluationType === filters.type;
    const matchesStatus = filters.status === 'all' || evaluation.status === filters.status;
    const matchesSearch = filters.search === '' || 
      evaluation.applicationDetails?.studentName.toLowerCase().includes(filters.search.toLowerCase()) ||
      evaluation.applicationDetails?.rut.includes(filters.search) ||
      evaluation.evaluator?.firstName.toLowerCase().includes(filters.search.toLowerCase()) ||
      evaluation.evaluator?.lastName.toLowerCase().includes(filters.search.toLowerCase());
    
    return matchesType && matchesStatus && matchesSearch;
  });

  const handleViewEvaluation = (evaluation: EvaluationWithDetails) => {
    setSelectedEvaluation(evaluation);
    setShowReportModal(true);
  };

  const handleEditEvaluation = (evaluation: EvaluationWithDetails) => {
    setSelectedEvaluation(evaluation);
    setShowFormModal(true);
  };

  const handleSaveEvaluation = async (data: Partial<Evaluation>) => {
    if (!selectedEvaluation) return;

    try {
      setIsSubmitting(true);
      // Simular guardado
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Actualizar el estado local
      setEvaluations(prev => 
        prev.map(evaluation => 
          evaluation.id === selectedEvaluation.id 
            ? { ...evaluation, ...data, status: EvaluationStatus.IN_PROGRESS }
            : evaluation
        )
      );

      addNotification({
        type: 'success',
        title: 'Éxito',
        message: 'Evaluación guardada correctamente'
      });
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Error al guardar la evaluación'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCompleteEvaluation = async (data: Partial<Evaluation>) => {
    if (!selectedEvaluation) return;

    try {
      setIsSubmitting(true);
      // Simular completado
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Actualizar el estado local
      setEvaluations(prev => 
        prev.map(evaluation => 
          evaluation.id === selectedEvaluation.id 
            ? { ...evaluation, ...data, status: EvaluationStatus.COMPLETED, completionDate: new Date().toISOString() }
            : evaluation
        )
      );

      setShowFormModal(false);
      addNotification({
        type: 'success',
        title: 'Éxito',
        message: 'Evaluación completada exitosamente'
      });
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Error al completar la evaluación'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const generateReport = (evaluation: EvaluationWithDetails) => {
    // Simular generación de reporte PDF
    const reportContent = `
      REPORTE DE EVALUACIÓN
      =====================
      
      Estudiante: ${evaluation.applicationDetails?.studentName}
      RUT: ${evaluation.applicationDetails?.rut}
      Curso: ${evaluation.applicationDetails?.gradeApplied}
      
      Tipo de Evaluación: ${EVALUATION_TYPE_LABELS[evaluation.evaluationType]}
      Estado: ${EVALUATION_STATUS_LABELS[evaluation.status]}
      Evaluador: ${evaluation.evaluator?.firstName} ${evaluation.evaluator?.lastName}

      ${evaluation.score ? `Puntaje: ${evaluation.score}/${evaluation.maxScore || 100}` : ''}
      ${evaluation.grade ? `Calificación: ${evaluation.grade}` : ''}
      
      Observaciones:
      ${evaluation.observations || 'Sin observaciones'}
      
      Fortalezas:
      ${evaluation.strengths || 'Sin fortalezas registradas'}
      
      Áreas de Mejora:
      ${evaluation.areasForImprovement || 'Sin áreas de mejora registradas'}
      
      Recomendaciones:
      ${evaluation.recommendations || 'Sin recomendaciones'}
    `;

    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = `reporte_evaluacion_${evaluation.id}.txt`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

    addNotification({
      type: 'success',
      title: 'Reporte Generado',
      message: 'El reporte se ha descargado exitosamente'
    });
  };

  const renderEvaluationForm = () => {
    if (!selectedEvaluation) return null;

    switch (selectedEvaluation.evaluationType) {
      case EvaluationType.LANGUAGE_EXAM:
      case EvaluationType.MATHEMATICS_EXAM:
      case EvaluationType.ENGLISH_EXAM:
        return (
          <AcademicEvaluationForm
            evaluation={selectedEvaluation}
            onSave={handleSaveEvaluation}
            onComplete={handleCompleteEvaluation}
            isSubmitting={isSubmitting}
          />
        );
      case EvaluationType.PSYCHOLOGICAL_INTERVIEW:
        return (
          <PsychologicalInterviewForm
            evaluation={selectedEvaluation}
            onSave={handleSaveEvaluation}
            onComplete={handleCompleteEvaluation}
            isSubmitting={isSubmitting}
          />
        );
      case EvaluationType.CYCLE_DIRECTOR_INTERVIEW:
      case EvaluationType.CYCLE_DIRECTOR_REPORT:
        return (
          <CycleDirectorForm
            evaluation={selectedEvaluation}
            onSave={handleSaveEvaluation}
            onComplete={handleCompleteEvaluation}
            isSubmitting={isSubmitting}
          />
        );
      default:
        return <div>Tipo de evaluación no reconocido</div>;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3" role="status" aria-label="Cargando reportes">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-2xl border border-slate-200 bg-white" />
        ))}
      </div>
    );
  }

  const totalPages = Math.ceil(filteredEvaluations.length / PAGE_SIZE);
  const safeCurrentPage = Math.min(currentPage, totalPages || 1);
  const pagedEvaluations = filteredEvaluations.slice(
    (safeCurrentPage - 1) * PAGE_SIZE,
    safeCurrentPage * PAGE_SIZE
  );

  return (
    <div className="space-y-5">
      {/* Filtros inline */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-44 flex-1">
          <label className="mb-1.5 block text-xs font-medium text-slate-500">Tipo de evaluación</label>
          <select
            value={filters.type}
            onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
            className="min-h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-800 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
          >
            <option value="all">Todos los tipos</option>
            {Object.entries(EVALUATION_TYPE_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>

        <div className="min-w-40 flex-1">
          <label className="mb-1.5 block text-xs font-medium text-slate-500">Estado</label>
          <select
            value={filters.status}
            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
            className="min-h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-800 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
          >
            <option value="all">Todos los estados</option>
            {Object.entries(EVALUATION_STATUS_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>

        <div className="min-w-56 flex-[2]">
          <label className="mb-1.5 block text-xs font-medium text-slate-500">Buscar</label>
          <input
            type="search"
            placeholder="Estudiante, RUT o evaluador..."
            value={filters.search}
            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            className="min-h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
          />
        </div>

        <button
          type="button"
          onClick={() => loadEvaluations(true)}
          disabled={isRefreshing}
          className="inline-flex min-h-10 items-center gap-2 self-end rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin motion-reduce:animate-none' : ''}`} />
          Actualizar
        </button>
      </div>

      {/* Lista de evaluaciones */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {/* Cabecera de tabla */}
        <div className="hidden grid-cols-[2fr_2fr_2fr_1.5fr_auto] border-b border-slate-200 bg-slate-50 px-5 py-3 md:grid">
          <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Evaluación</span>
          <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Estudiante</span>
          <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Evaluador</span>
          <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Fechas</span>
          <span className="text-xs font-bold uppercase tracking-wide text-slate-500 text-right">Acciones</span>
        </div>

        {pagedEvaluations.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <FileText className="mx-auto mb-3 h-10 w-10 text-slate-300" />
            <p className="text-sm text-slate-500">No se encontraron evaluaciones con los filtros seleccionados.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {pagedEvaluations.map((evaluation) => {
              const statusBadge = getStatusBadgeClass(evaluation.status);
              return (
                <div key={evaluation.id} className="grid grid-cols-1 gap-y-3 px-5 py-4 hover:bg-slate-50 md:grid-cols-[2fr_2fr_2fr_1.5fr_auto] md:items-center md:gap-y-0">
                  {/* Tipo + badge */}
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                      {getTypeIcon(evaluation.evaluationType)}
                    </span>
                    <div className="min-w-0">
                      <span className="block text-sm font-semibold text-slate-950 leading-tight">
                        {EVALUATION_TYPE_LABELS[evaluation.evaluationType]}
                      </span>
                      <span className={`mt-0.5 inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${statusBadge}`}>
                        {EVALUATION_STATUS_LABELS[evaluation.status]}
                      </span>
                      {evaluation.score != null && (
                        <span className="ml-2 text-xs font-bold text-slate-700">{evaluation.score}/100{evaluation.grade && <span className="ml-1 text-emerald-700">{evaluation.grade}</span>}</span>
                      )}
                    </div>
                  </div>

                  {/* Estudiante */}
                  <div className="text-sm md:px-4">
                    <span className="block font-semibold text-slate-900">
                      {evaluation.applicationDetails?.studentName}
                    </span>
                    <span className="block text-slate-500">
                      {evaluation.applicationDetails?.rut} · {evaluation.applicationDetails?.gradeApplied}
                    </span>
                  </div>

                  {/* Evaluador */}
                  <div className="text-sm md:px-4">
                    <span className="block font-semibold text-slate-900">
                      {evaluation.evaluator?.firstName} {evaluation.evaluator?.lastName}
                    </span>
                    <span className="block text-slate-500">{evaluation.evaluator?.email}</span>
                  </div>

                  {/* Fechas */}
                  <div className="text-xs text-slate-600 md:px-4">
                    <span className="block">Creada: {new Date(evaluation.createdAt).toLocaleDateString('es-CL')}</span>
                    {evaluation.completionDate && (
                      <span className="block text-emerald-700">Completada: {new Date(evaluation.completionDate).toLocaleDateString('es-CL')}</span>
                    )}
                  </div>

                  {/* Acciones */}
                  <div className="flex items-center gap-2 md:justify-end">
                    <button
                      type="button"
                      onClick={() => handleViewEvaluation(evaluation)}
                      className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    >
                      <Eye className="h-4 w-4" />
                      Ver reporte
                    </button>

                    {evaluation.status === EvaluationStatus.COMPLETED ? (
                      <button
                        type="button"
                        onClick={() => generateReport(evaluation)}
                        className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-sm font-semibold text-white hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                      >
                        <Download className="h-4 w-4" />
                        Descargar
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleEditEvaluation(evaluation)}
                        className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-amber-500 px-3 text-sm font-semibold text-white hover:bg-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-200"
                      >
                        <FileText className="h-4 w-4" />
                        {evaluation.status === EvaluationStatus.PENDING ? 'Iniciar' : 'Continuar'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Paginación */}
        {totalPages > 1 && (
          <nav className="flex items-center justify-between border-t border-slate-200 px-5 py-3" aria-label="Paginación">
            <span className="text-sm text-slate-600">
              {(safeCurrentPage - 1) * PAGE_SIZE + 1}–{Math.min(safeCurrentPage * PAGE_SIZE, filteredEvaluations.length)} de {filteredEvaluations.length}
            </span>
            <div className="flex items-center gap-1">
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={safeCurrentPage === 1} className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-slate-300 px-3 text-sm font-semibold text-slate-700 disabled:opacity-40 hover:bg-slate-50">
                Anterior
              </button>
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={safeCurrentPage === totalPages} className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-slate-300 px-3 text-sm font-semibold text-slate-700 disabled:opacity-40 hover:bg-slate-50">
                Siguiente
              </button>
            </div>
          </nav>
        )}
      </section>

      {/* Evaluation Form Modal */}
      <Modal
        isOpen={showFormModal}
        onClose={() => setShowFormModal(false)}
        title={`${selectedEvaluation ? EVALUATION_TYPE_LABELS[selectedEvaluation.evaluationType] : 'Evaluación'} - ${selectedEvaluation?.applicationDetails?.studentName}`}
        size="xl"
      >
        {renderEvaluationForm()}
      </Modal>

      {/* Report View Modal */}
      <Modal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        title={`Reporte - ${selectedEvaluation ? EVALUATION_TYPE_LABELS[selectedEvaluation.evaluationType] : 'Evaluación'}`}
        size="lg"
      >
        {selectedEvaluation && (
          <div className="space-y-6">
            <div className="border-b pb-4">
              <h3 className="text-xl font-bold text-azul-monte-tabor mb-2">
                {selectedEvaluation.applicationDetails?.studentName}
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gris-piedra">RUT:</span> {selectedEvaluation.applicationDetails?.rut}
                </div>
                <div>
                  <span className="font-medium text-gris-piedra">Curso:</span> {selectedEvaluation.applicationDetails?.gradeApplied}
                </div>
                <div>
                  <span className="font-medium text-gris-piedra">Evaluador:</span> {selectedEvaluation.evaluator?.firstName} {selectedEvaluation.evaluator?.lastName}
                </div>
                <div>
                  <span className="font-medium text-gris-piedra">Estado:</span> {EVALUATION_STATUS_LABELS[selectedEvaluation.status]}
                </div>
              </div>
            </div>

            {selectedEvaluation.score && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Calificación</h4>
                <div className="flex justify-between items-center">
                  <span>Puntaje: {selectedEvaluation.score}/{selectedEvaluation.maxScore || 100}</span>
                  {selectedEvaluation.grade && <span>Nota: {selectedEvaluation.grade}</span>}
                </div>
              </div>
            )}

            {selectedEvaluation.observations && (
              <div>
                <h4 className="font-semibold mb-2">Observaciones</h4>
                <p className="text-gris-piedra">{selectedEvaluation.observations}</p>
              </div>
            )}

            {selectedEvaluation.strengths && (
              <div>
                <h4 className="font-semibold mb-2">Fortalezas</h4>
                <p className="text-green-600">{selectedEvaluation.strengths}</p>
              </div>
            )}

            {selectedEvaluation.areasForImprovement && (
              <div>
                <h4 className="font-semibold mb-2">Áreas de Mejora</h4>
                <p className="text-orange-600">{selectedEvaluation.areasForImprovement}</p>
              </div>
            )}

            {selectedEvaluation.recommendations && (
              <div>
                <h4 className="font-semibold mb-2">Recomendaciones</h4>
                <p className="text-blue-600">{selectedEvaluation.recommendations}</p>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => generateReport(selectedEvaluation)}
              >
                <Download className="w-4 h-4 mr-2" />
                Descargar PDF
              </Button>
              <Button
                variant="primary"
                onClick={() => setShowReportModal(false)}
              >
                Cerrar
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default EvaluationReports;