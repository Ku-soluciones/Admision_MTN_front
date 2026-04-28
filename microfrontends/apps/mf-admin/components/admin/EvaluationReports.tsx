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
  ClipboardList
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

  const loadEvaluations = async () => {
    try {
      setIsLoading(true);
      
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
      
      setEvaluations(mockEvaluations);
    } catch (error) {
      console.error('Error loading evaluations:', error);
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Error al cargar las evaluaciones'
      });
    } finally {
      setIsLoading(false);
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
      case EvaluationStatus.PENDING:
        return 'bg-yellow-100 text-yellow-800';
      case EvaluationStatus.IN_PROGRESS:
        return 'bg-blue-100 text-blue-800';
      case EvaluationStatus.COMPLETED:
        return 'bg-green-100 text-green-800';
      case EvaluationStatus.REVIEWED:
        return 'bg-purple-100 text-purple-800';
      case EvaluationStatus.APPROVED:
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
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
      <Card className="p-8 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-azul-monte-tabor mx-auto mb-4"></div>
        <p className="text-gris-piedra">Cargando reportes de evaluación...</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-6 bg-gradient-to-r from-azul-monte-tabor to-blue-600 text-white">
        <div className="flex flex-wrap justify-between items-start gap-3">
          <div>
            <h2 className="text-2xl font-bold mb-2">
              📊 Reportes de Evaluaciones
            </h2>
            <p className="text-blue-100">
              Visualiza y gestiona los informes de evaluación completos
            </p>
          </div>
          <Button 
            variant="outline" 
            onClick={loadEvaluations}
            className="text-white border-white hover:bg-white hover:text-azul-monte-tabor"
          >
            🔄 Actualizar
          </Button>
        </div>
      </Card>

      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gris-piedra mb-2">
              Tipo de Evaluación
            </label>
            <select
              value={filters.type}
              onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-azul-monte-tabor focus:border-azul-monte-tabor"
            >
              <option value="all">Todos los tipos</option>
              {Object.entries(EVALUATION_TYPE_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gris-piedra mb-2">
              Estado
            </label>
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-azul-monte-tabor focus:border-azul-monte-tabor"
            >
              <option value="all">Todos los estados</option>
              {Object.entries(EVALUATION_STATUS_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gris-piedra mb-2">
              Buscar
            </label>
            <input
              type="text"
              placeholder="Buscar por estudiante, RUT o evaluador..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-azul-monte-tabor focus:border-azul-monte-tabor"
            />
          </div>
        </div>
      </Card>

      {/* Paginación y lista */}
      {(() => {
        const totalPages = Math.ceil(filteredEvaluations.length / PAGE_SIZE);
        const safeCurrentPage = Math.min(currentPage, totalPages || 1);
        const pagedEvaluations = filteredEvaluations.slice(
          (safeCurrentPage - 1) * PAGE_SIZE,
          safeCurrentPage * PAGE_SIZE
        );
        return (
          <>
            {filteredEvaluations.length > PAGE_SIZE && (
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-gray-600">
                <span>Mostrando {(safeCurrentPage - 1) * PAGE_SIZE + 1}–{Math.min(safeCurrentPage * PAGE_SIZE, filteredEvaluations.length)} de {filteredEvaluations.length} registros</span>
                <div className="flex items-center gap-1">
                  <button onClick={() => setCurrentPage(1)} disabled={safeCurrentPage === 1} className="px-2 py-1 rounded border disabled:opacity-40 hover:bg-gray-100">«</button>
                  <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={safeCurrentPage === 1} className="px-2 py-1 rounded border disabled:opacity-40 hover:bg-gray-100">‹</button>
                  <span className="px-3 py-1 rounded border bg-azul-monte-tabor text-white">{safeCurrentPage} / {totalPages}</span>
                  <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={safeCurrentPage === totalPages} className="px-2 py-1 rounded border disabled:opacity-40 hover:bg-gray-100">›</button>
                  <button onClick={() => setCurrentPage(totalPages)} disabled={safeCurrentPage === totalPages} className="px-2 py-1 rounded border disabled:opacity-40 hover:bg-gray-100">»</button>
                </div>
              </div>
            )}
            <div className="grid gap-4">
              {pagedEvaluations.map((evaluation) => (
          <Card key={evaluation.id} className="p-6">
            <div className="flex flex-wrap justify-between items-start gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  {getTypeIcon(evaluation.evaluationType)}
                  <h3 className="text-lg font-semibold text-azul-monte-tabor">
                    {EVALUATION_TYPE_LABELS[evaluation.evaluationType]}
                  </h3>
                  <Badge className={getStatusColor(evaluation.status)} size="sm">
                    {EVALUATION_STATUS_LABELS[evaluation.status]}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="font-medium text-gris-piedra">Estudiante</p>
                    <p className="text-azul-monte-tabor font-semibold">
                      {evaluation.applicationDetails?.studentName}
                    </p>
                    <p className="text-gris-piedra">
                      {evaluation.applicationDetails?.rut} - {evaluation.applicationDetails?.gradeApplied}
                    </p>
                  </div>

                  <div>
                    <p className="font-medium text-gris-piedra">Evaluador</p>
                    <p className="text-azul-monte-tabor font-semibold">
                      {evaluation.evaluator?.firstName} {evaluation.evaluator?.lastName}
                    </p>
                    <p className="text-gris-piedra">{evaluation.evaluator?.email}</p>
                  </div>

                  <div>
                    <p className="font-medium text-gris-piedra">Fechas</p>
                    <p className="text-azul-monte-tabor">
                      Creada: {new Date(evaluation.createdAt).toLocaleDateString()}
                    </p>
                    {evaluation.completionDate && (
                      <p className="text-green-600">
                        Completada: {new Date(evaluation.completionDate).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>

                {evaluation.score && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gris-piedra">Puntaje</span>
                      <span className="text-2xl font-bold text-azul-monte-tabor">
                        {evaluation.score}/100
                      </span>
                    </div>
                    {evaluation.grade && (
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-sm font-medium text-gris-piedra">Calificación</span>
                        <span className="text-lg font-semibold text-green-600">
                          {evaluation.grade}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2 ml-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleViewEvaluation(evaluation)}
                >
                  <Eye className="w-4 h-4 mr-1" />
                  Ver Reporte
                </Button>
                
                {evaluation.status !== EvaluationStatus.COMPLETED && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleEditEvaluation(evaluation)}
                  >
                    <FileText className="w-4 h-4 mr-1" />
                    {evaluation.status === EvaluationStatus.PENDING ? 'Iniciar' : 'Continuar'}
                  </Button>
                )}

                {evaluation.status === EvaluationStatus.COMPLETED && (
                  <Button
                    variant="success"
                    size="sm"
                    onClick={() => generateReport(evaluation)}
                  >
                    <Download className="w-4 h-4 mr-1" />
                    Descargar
                  </Button>
                )}
              </div>
            </div>
          </Card>
        ))}

            {filteredEvaluations.length === 0 && (
              <Card className="p-8 text-center">
                <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gris-piedra">No se encontraron evaluaciones que coincidan con los filtros</p>
              </Card>
            )}
            </div>
          </>
        );
      })()}

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