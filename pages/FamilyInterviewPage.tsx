import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { FiArrowLeft, FiCheckCircle } from 'react-icons/fi';
import { professorEvaluationService } from '../services/professorEvaluationService';
import { familyInterviewService } from '../services/familyInterviewService';
import FamilyInterviewForm, { FamilyInterviewData } from '../components/FamilyInterviewForm';
import ParentQuestionnaireModal from '../components/interviews/ParentQuestionnaireModal';

interface EvaluationData {
  id: number;
  applicationId: number;
  evaluatorId: number;
  evaluationType: string;
  status: string;
  studentName: string;
  studentGrade: string;
  studentBirthDate?: string;
  currentSchool?: string;
  observations?: string;
  createdAt: string;
  updatedAt: string;
  evaluator?: {
    firstName: string;
    lastName: string;
    subject?: string;
  };
  father?: {
    name: string;
    email?: string;
    phone?: string;
  };
  mother?: {
    name: string;
    email?: string;
    phone?: string;
  };
}

const FamilyInterviewPage: React.FC = () => {
  const { evaluationId } = useParams<{ evaluationId: string }>();
  const navigate = useNavigate();

  const [evaluation, setEvaluation] = useState<EvaluationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [interviewData, setInterviewData] = useState<FamilyInterviewData | null>(null);
  const [showQuestionnaireModal, setShowQuestionnaireModal] = useState(false);

  useEffect(() => {
    loadEvaluation();
  }, [evaluationId]);

  const loadEvaluation = async () => {
    if (!evaluationId) return;

    try {
      setLoading(true);
      const data = await professorEvaluationService.getEvaluationById(parseInt(evaluationId));
      console.log('Evaluation data received:', data);
      console.log('Father data:', data.father);
      console.log('Mother data:', data.mother);
      console.log('Evaluator data:', data.evaluator);
      setEvaluation(data as any);

      // Si ya existe data, cargarla en el formulario
      if (data.observations) {
        try {
          const parsed = JSON.parse(data.observations);
          setInterviewData(parsed);
        } catch (e) {
          // Si no es JSON, es una evaluación nueva
          setInterviewData(null);
        }
      }

      setError(null);
    } catch (err: any) {
      console.error('Error loading evaluation:', err);
      setError(err.message || 'Error al cargar la evaluación');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (data: FamilyInterviewData) => {
    if (!evaluationId) return;

    try {
      setSaving(true);
      setError(null);

      console.log('Saving family interview data:', data);

      // Use the correct endpoint: PUT /api/evaluations/:id/family-interview-data
      // This endpoint expects { interviewData: {...} } and has INTERVIEWER role permission
      const result = await familyInterviewService.saveInterviewData(
        parseInt(evaluationId),
        data
      );

      console.log('Interview data saved successfully:', result);

      // Navigate back to dashboard
      navigate('/profesor');
    } catch (err: any) {
      console.error('Error saving family interview:', err);
      setError(err.message || 'Error al guardar la entrevista familiar');
      throw err; // Re-throw para que el formulario lo maneje
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDraft = async (data: FamilyInterviewData) => {
    if (!evaluationId) return;

    try {
      setSaving(true);
      setError(null);

      const updateData = {
        observations: JSON.stringify(data),
        score: data.grandTotal || 0,
        status: 'IN_PROGRESS'
      };

      await professorEvaluationService.updateEvaluation(parseInt(evaluationId), updateData);

      navigate('/profesor');
    } catch (err: any) {
      console.error('Error saving draft:', err);
      setError(err.message || 'Error al guardar el borrador');
      throw err;
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-6xl mx-auto">
          <Card className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-azul-monte-tabor mx-auto mb-4"></div>
            <p className="text-gris-piedra">Cargando entrevista familiar...</p>
          </Card>
        </div>
      </div>
    );
  }

  if (!evaluation) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-6xl mx-auto">
          <Card className="p-8 text-center">
            <p className="text-red-600 mb-4">No se pudo cargar la evaluación</p>
            <Button onClick={() => navigate('/profesor')}>
              Volver al Dashboard
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <button
              onClick={() => navigate('/profesor')}
              className="flex items-center gap-2 text-azul-monte-tabor hover:underline mb-2"
            >
              <FiArrowLeft /> Volver al Dashboard
            </button>
            <h1 className="text-2xl sm:text-3xl font-bold text-azul-monte-tabor">
              Entrevista Familiar
            </h1>
          </div>
          {evaluation.status === 'COMPLETED' && (
            <Badge variant="success" size="lg">
              <FiCheckCircle className="inline mr-1" />
              Completada
            </Badge>
          )}
        </div>

        {/* Interviewer Info Card */}
        <Card className="p-6">
          <h2 className="text-xl font-bold text-azul-monte-tabor mb-4">
            Entrevistador
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gris-piedra">Nombre del Entrevistador</label>
              <p className="text-lg font-semibold">
                {evaluation.evaluator?.firstName} {evaluation.evaluator?.lastName}
              </p>
            </div>
            {evaluation.evaluator?.subject && (
              <div>
                <label className="text-sm font-medium text-gris-piedra">Área</label>
                <p className="text-lg">{evaluation.evaluator.subject}</p>
              </div>
            )}
          </div>
        </Card>

        {/* Student Info Card */}
        <Card className="p-6">
          <h2 className="text-xl font-bold text-azul-monte-tabor mb-4">
            Información del Estudiante
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gris-piedra">Nombre Completo</label>
              <p className="text-lg font-semibold">{evaluation.studentName}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gris-piedra">Curso Postulado</label>
              <p className="text-lg font-semibold">{evaluation.studentGrade}</p>
            </div>
            {evaluation.currentSchool && (
              <div>
                <label className="text-sm font-medium text-gris-piedra">Colegio Actual</label>
                <p className="text-lg">{evaluation.currentSchool}</p>
              </div>
            )}
            {evaluation.studentBirthDate && (
              <div>
                <label className="text-sm font-medium text-gris-piedra">Fecha de Nacimiento</label>
                <p className="text-lg">
                  {new Date(evaluation.studentBirthDate).toLocaleDateString('es-CL')}
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* Parent Info Card */}
        <Card className="p-6">
          <h2 className="text-xl font-bold text-azul-monte-tabor mb-4">
            Información de los Padres
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Father */}
            <div className="space-y-3">
              <h3 className="font-semibold text-azul-monte-tabor">Padre</h3>
              <div>
                <label className="text-sm font-medium text-gris-piedra">Nombre</label>
                <p className="text-lg">{evaluation.father?.name || 'No registrado'}</p>
              </div>
              {evaluation.father?.email && (
                <div>
                  <label className="text-sm font-medium text-gris-piedra">Email</label>
                  <p className="text-lg">{evaluation.father.email}</p>
                </div>
              )}
              {evaluation.father?.phone && (
                <div>
                  <label className="text-sm font-medium text-gris-piedra">Teléfono</label>
                  <p className="text-lg">{evaluation.father.phone}</p>
                </div>
              )}
            </div>

            {/* Mother */}
            <div className="space-y-3">
              <h3 className="font-semibold text-azul-monte-tabor">Madre</h3>
              <div>
                <label className="text-sm font-medium text-gris-piedra">Nombre</label>
                <p className="text-lg">{evaluation.mother?.name || 'No registrado'}</p>
              </div>
              {evaluation.mother?.email && (
                <div>
                  <label className="text-sm font-medium text-gris-piedra">Email</label>
                  <p className="text-lg">{evaluation.mother.email}</p>
                </div>
              )}
              {evaluation.mother?.phone && (
                <div>
                  <label className="text-sm font-medium text-gris-piedra">Teléfono</label>
                  <p className="text-lg">{evaluation.mother.phone}</p>
                </div>
              )}
            </div>
          </div>

          {/* Cuestionario de Padres Button */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-semibold text-azul-monte-tabor mb-2">
              Cuestionario de los Padres
            </h4>
            <p className="text-sm text-gris-piedra mb-3">
              Revisa las respuestas del cuestionario complementario completado por los padres.
            </p>
            <button
              onClick={() => setShowQuestionnaireModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-azul-monte-tabor text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <span>Ver Cuestionario de Padres</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </button>
          </div>
        </Card>

        {/* Error Message */}
        {error && (
          <Card className="p-4 bg-red-50 border-red-200">
            <p className="text-red-600">{error}</p>
          </Card>
        )}

        {/* Family Interview Form */}
        <FamilyInterviewForm
          evaluation={evaluation}
          initialData={interviewData || undefined}
          onSave={handleSave}
          onSaveDraft={handleSaveDraft}
          onCancel={() => navigate('/profesor')}
          disabled={saving}
          readonly={evaluation.status === 'COMPLETED'}
        />

        {/* Parent Questionnaire Modal */}
        <ParentQuestionnaireModal
          isOpen={showQuestionnaireModal}
          onClose={() => setShowQuestionnaireModal(false)}
          applicationId={evaluation.applicationId}
        />
      </div>
    </div>
  );
};

export default FamilyInterviewPage;
