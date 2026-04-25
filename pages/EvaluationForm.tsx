import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getApiBaseUrl } from '../config/api.config';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Badge from '../components/ui/Badge';
import { FiSave, FiArrowLeft, FiCheckCircle, FiPaperclip, FiDownload, FiTrash2, FiUpload, FiClock } from 'react-icons/fi';
import { professorEvaluationService } from '../services/professorEvaluationService';

interface EvaluationData {
  id: number;
  application_id: number;
  evaluator_id: number;
  evaluation_type: string;
  score: number | null;
  grade: string;
  observations: string;
  status: string;
  student_name: string;
  student_grade: string;
  student_birthdate: string;
  current_school: string;
  evaluator_name: string;
  created_at: string;
  updated_at: string;
}

const EvaluationForm: React.FC = () => {
  const { evaluationId } = useParams<{ evaluationId: string }>();
  const navigate = useNavigate();

  const [evaluation, setEvaluation] = useState<EvaluationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [score, setScore] = useState<number | ''>('');
  const [grade, setGrade] = useState('');
  const [observations, setObservations] = useState('');

  // Qualitative observations (HU-4)
  const [academicReadiness, setAcademicReadiness] = useState('');
  const [behavioralAssessment, setBehavioralAssessment] = useState('');
  const [emotionalMaturity, setEmotionalMaturity] = useState('');
  const [socialSkills, setSocialSkills] = useState('');
  const [motivationAssessment, setMotivationAssessment] = useState('');
  const [familySupport, setFamilySupport] = useState('');
  const [integrationPotential, setIntegrationPotential] = useState('');
  const [strengths, setStrengths] = useState('');
  const [areasForImprovement, setAreasForImprovement] = useState('');
  const [recommendations, setRecommendations] = useState('');
  const [finalRecommendation, setFinalRecommendation] = useState<boolean | null>(null);

  // Student evaluation history (HU-8)
  const [studentHistory, setStudentHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Interview data (HU-5)
  const [interviewData, setInterviewData] = useState<any>(null);
  const [hasInterview, setHasInterview] = useState(false);

  // File attachments (HU-6)
  const [attachments, setAttachments] = useState<any[]>([]);
  const [loadingAttachments, setLoadingAttachments] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadEvaluation();
    loadInterviewData();
    loadAttachments();
    loadStudentHistory();
  }, [evaluationId]);

  const loadInterviewData = async () => {
    if (!evaluationId) return;

    try {
      const response = await fetch(`${getApiBaseUrl()}/v1/evaluations/${evaluationId}/interview`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('professor_token') || localStorage.getItem('auth_token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setHasInterview(data.hasInterview);
        setInterviewData(data.interview);
      }
    } catch (error) {
      console.error('Error loading interview data:', error);
    }
  };

  const loadEvaluation = async () => {
    if (!evaluationId) return;

    try {
      setLoading(true);
      const data = await professorEvaluationService.getEvaluationById(parseInt(evaluationId));
      setEvaluation(data);

      // Populate form fields
      setScore(data.score || '');
      setGrade(data.grade || '');
      setObservations(data.observations || '');

      // Populate qualitative observations
      setAcademicReadiness(data.academic_readiness || '');
      setBehavioralAssessment(data.behavioral_assessment || '');
      setEmotionalMaturity(data.emotional_maturity || '');
      setSocialSkills(data.social_skills_assessment || '');
      setMotivationAssessment(data.motivation_assessment || '');
      setFamilySupport(data.family_support_assessment || '');
      setIntegrationPotential(data.integration_potential || '');
      setStrengths(data.strengths || '');
      setAreasForImprovement(data.areas_for_improvement || '');
      setRecommendations(data.recommendations || '');
      setFinalRecommendation(data.final_recommendation);

      setError(null);
    } catch (err: any) {
      console.error('Error loading evaluation:', err);
      setError(err.message || 'Error al cargar la evaluación');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!evaluationId) return;

    // Validation
    if (!score || score < 0 || score > 100) {
      setError('El puntaje debe estar entre 0 y 100');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const updateData = {
        score: Number(score),
        grade,
        observations,
        status: 'COMPLETED',
        academic_readiness: academicReadiness,
        behavioral_assessment: behavioralAssessment,
        emotional_maturity: emotionalMaturity,
        social_skills_assessment: socialSkills,
        motivation_assessment: motivationAssessment,
        family_support_assessment: familySupport,
        integration_potential: integrationPotential,
        strengths,
        areas_for_improvement: areasForImprovement,
        recommendations,
        final_recommendation: finalRecommendation
      };

      await professorEvaluationService.updateEvaluation(parseInt(evaluationId), updateData);

      // Navigate back to dashboard
      navigate('/profesor/dashboard');
    } catch (err: any) {
      console.error('Error saving evaluation:', err);
      setError(err.message || 'Error al guardar la evaluación');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!evaluationId) return;

    try {
      setSaving(true);
      setError(null);

      const updateData = {
        score: score ? Number(score) : null,
        grade,
        observations,
        status: 'IN_PROGRESS',
        academic_readiness: academicReadiness,
        behavioral_assessment: behavioralAssessment,
        emotional_maturity: emotionalMaturity,
        social_skills_assessment: socialSkills,
        motivation_assessment: motivationAssessment,
        family_support_assessment: familySupport,
        integration_potential: integrationPotential,
        strengths,
        areas_for_improvement: areasForImprovement,
        recommendations,
        final_recommendation: finalRecommendation
      };

      await professorEvaluationService.updateEvaluation(parseInt(evaluationId), updateData);

      navigate('/profesor/dashboard');
    } catch (err: any) {
      console.error('Error saving draft:', err);
      setError(err.message || 'Error al guardar el borrador');
    } finally {
      setSaving(false);
    }
  };

  // HU-6: Load attachments
  const loadAttachments = async () => {
    if (!evaluationId) return;

    try {
      setLoadingAttachments(true);
      const response = await fetch(`${getApiBaseUrl()}/v1/evaluations/${evaluationId}/attachments`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('professor_token') || localStorage.getItem('auth_token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAttachments(data.attachments || []);
      }
    } catch (error) {
      console.error('Error loading attachments:', error);
    } finally {
      setLoadingAttachments(false);
    }
  };

  // HU-6: Upload attachment
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !evaluationId) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('description', 'Archivo adjunto a la evaluación');

    try {
      setUploadingFile(true);
      const response = await fetch(`${getApiBaseUrl()}/v1/evaluations/${evaluationId}/attachments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('professor_token') || localStorage.getItem('auth_token')}`
        },
        body: formData
      });

      if (response.ok) {
        await loadAttachments();
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Error al subir el archivo');
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      setError('Error al subir el archivo');
    } finally {
      setUploadingFile(false);
    }
  };

  // HU-6: Delete attachment
  const handleDeleteAttachment = async (attachmentId: number) => {
    if (!confirm('¿Está seguro de eliminar este archivo?')) return;

    try {
      const response = await fetch(`${getApiBaseUrl()}/v1/evaluations/attachments/${attachmentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('professor_token') || localStorage.getItem('auth_token')}`
        }
      });

      if (response.ok) {
        await loadAttachments();
      } else {
        setError('Error al eliminar el archivo');
      }
    } catch (error) {
      console.error('Error deleting attachment:', error);
      setError('Error al eliminar el archivo');
    }
  };

  // HU-8: Load student evaluation history
  const loadStudentHistory = async () => {
    if (!evaluation?.application_id) return;

    try {
      setLoadingHistory(true);

      // First get the student_id from the application
      const appResponse = await fetch(`${getApiBaseUrl()}/v1/applications/${evaluation.application_id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('professor_token') || localStorage.getItem('auth_token')}`
        }
      });

      if (appResponse.ok) {
        const appData = await appResponse.json();
        const studentId = appData.student_id;

        // Now get the history
        const historyResponse = await fetch(`${getApiBaseUrl()}/v1/evaluations/student/${studentId}/history`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('professor_token') || localStorage.getItem('auth_token')}`
          }
        });

        if (historyResponse.ok) {
          const historyData = await historyResponse.json();
          setStudentHistory(historyData.evaluations || []);
        }
      }
    } catch (error) {
      console.error('Error loading student history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const getEvaluationTypeLabel = (type: string) => {
    const labels: { [key: string]: string } = {
      'MATHEMATICS_EXAM': 'Examen de Matemáticas',
      'LANGUAGE_EXAM': 'Examen de Lenguaje',
      'ENGLISH_EXAM': 'Examen de Inglés',
      'PSYCHOLOGICAL_INTERVIEW': 'Entrevista Psicológica',
      'CYCLE_DIRECTOR_INTERVIEW': 'Entrevista Director de Ciclo',
      'CYCLE_DIRECTOR_REPORT': 'Informe Director de Ciclo'
    };
    return labels[type] || type;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <Card className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-azul-monte-tabor mx-auto mb-4"></div>
            <p className="text-gris-piedra">Cargando evaluación...</p>
          </Card>
        </div>
      </div>
    );
  }

  if (!evaluation) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <Card className="p-8 text-center">
            <p className="text-red-600 mb-4">No se pudo cargar la evaluación</p>
            <Button onClick={() => navigate('/profesor/dashboard')}>
              Volver al Dashboard
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <button
              onClick={() => navigate('/profesor/dashboard')}
              className="flex items-center gap-2 text-azul-monte-tabor hover:underline mb-2"
            >
              <FiArrowLeft /> Volver al Dashboard
            </button>
            <h1 className="text-3xl font-bold text-azul-monte-tabor">
              {getEvaluationTypeLabel(evaluation.evaluation_type)}
            </h1>
          </div>
          {evaluation.status === 'COMPLETED' && (
            <Badge variant="success" size="lg">
              <FiCheckCircle className="inline mr-1" />
              Completada
            </Badge>
          )}
        </div>

        {/* Student Info Card */}
        <Card className="p-6">
          <h2 className="text-xl font-bold text-azul-monte-tabor mb-4">
            Información del Estudiante
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gris-piedra">Nombre:</label>
              <p className="text-lg font-semibold">{evaluation.studentName || 'No disponible'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gris-piedra">Fecha de Nacimiento:</label>
              <p className="text-lg">
                {evaluation.studentBirthDate
                  ? new Date(evaluation.studentBirthDate).toLocaleDateString('es-CL')
                  : 'No disponible'}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gris-piedra">Edad:</label>
              <p className="text-lg">
                {evaluation.studentBirthDate
                  ? `${Math.floor((new Date().getTime() - new Date(evaluation.studentBirthDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000))} años`
                  : 'No disponible'}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gris-piedra">Colegio Actual:</label>
              <p className="text-lg">{evaluation.currentSchool || 'No disponible'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gris-piedra">Curso al que postula:</label>
              <p className="text-lg font-semibold">{evaluation.studentGrade || 'No disponible'}</p>
            </div>
            <div className="md:col-span-2 border-t pt-4 mt-2">
              <label className="text-sm font-medium text-gris-piedra">Profesor evaluador:</label>
              <p className="text-lg font-semibold">{evaluation.evaluatorName || 'No disponible'}</p>
            </div>
            <div className="md:col-span-2">
              <label className="text-sm font-medium text-gris-piedra">Asignatura:</label>
              <p className="text-lg">{evaluation.evaluatorSubject || 'No disponible'}</p>
            </div>
          </div>
        </Card>

        {/* Interview Data Section (HU-5) */}
        {hasInterview && interviewData && (
          <Card className="p-6 bg-blue-50 border-blue-200">
            <h2 className="text-xl font-bold text-azul-monte-tabor mb-4 flex items-center gap-2">
              <span>🎤</span> Información de Entrevista Realizada
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gris-piedra">Tipo de Entrevista</label>
                <p className="text-lg font-semibold">{interviewData.interview_type}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gris-piedra">Fecha</label>
                <p className="text-lg">{new Date(interviewData.scheduled_date).toLocaleDateString('es-CL')}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gris-piedra">Entrevistador</label>
                <p className="text-lg">{interviewData.interviewer_name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gris-piedra">Estado</label>
                <p className="text-lg font-semibold text-verde-esperanza">{interviewData.status}</p>
              </div>
              {interviewData.evaluation_notes && (
                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-gris-piedra">Notas de Evaluación</label>
                  <p className="text-base bg-white p-3 rounded border">{interviewData.evaluation_notes}</p>
                </div>
              )}
              {interviewData.recommendation && (
                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-gris-piedra">Recomendación de la Entrevista</label>
                  <p className="text-base bg-white p-3 rounded border">{interviewData.recommendation}</p>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Error Message */}
        {error && (
          <Card className="p-4 bg-red-50 border-red-200">
            <p className="text-red-600">{error}</p>
          </Card>
        )}

        {/* Evaluation Form */}
        <form onSubmit={handleSubmit}>
          <Card className="p-6 space-y-6">
            <h2 className="text-xl font-bold text-azul-monte-tabor mb-4">
              Registro de Calificación
            </h2>

            {/* Score Field */}
            <div>
              <label className="block text-sm font-medium text-gris-piedra mb-2">
                Puntaje <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                min="0"
                max="100"
                value={score}
                onChange={(e) => setScore(e.target.value ? Number(e.target.value) : '')}
                placeholder="Ingrese puntaje (0-100)"
                required
                className="max-w-xs"
              />
              <p className="text-sm text-gris-piedra mt-1">
                Escala de 0 a 100 puntos
              </p>
            </div>

            {/* Grade Field */}
            <div>
              <label className="block text-sm font-medium text-gris-piedra mb-2">
                Calificación Cualitativa
              </label>
              <select
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-azul-monte-tabor focus:border-transparent"
              >
                <option value="">Seleccione una calificación</option>
                <option value="EXCELENTE">Excelente</option>
                <option value="MUY_BUENO">Muy Bueno</option>
                <option value="BUENO">Bueno</option>
                <option value="SUFICIENTE">Suficiente</option>
                <option value="INSUFICIENTE">Insuficiente</option>
              </select>
            </div>

            {/* Observations Field */}
            <div>
              <label className="block text-sm font-medium text-gris-piedra mb-2">
                Observaciones Generales
              </label>
              <textarea
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                placeholder="Ingrese observaciones generales sobre el desempeño del estudiante..."
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-azul-monte-tabor focus:border-transparent resize-none"
              />
            </div>
          </Card>

          {/* Qualitative Observations Section (HU-4) */}
          <Card className="p-6 space-y-6">
            <h2 className="text-xl font-bold text-azul-monte-tabor mb-4">
              Observaciones Cualitativas Detalladas
            </h2>
            <p className="text-sm text-gris-piedra mb-4">
              Estas observaciones son confidenciales y serán visibles solo para el comité de admisión
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              {/* Academic Readiness */}
              <div>
                <label className="block text-sm font-medium text-gris-piedra mb-2">
                  Preparación Académica
                </label>
                <textarea
                  value={academicReadiness}
                  onChange={(e) => setAcademicReadiness(e.target.value)}
                  placeholder="Evalúe la preparación académica del estudiante..."
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-azul-monte-tabor focus:border-transparent resize-none"
                />
              </div>

              {/* Behavioral Assessment */}
              <div>
                <label className="block text-sm font-medium text-gris-piedra mb-2">
                  Evaluación Conductual
                </label>
                <textarea
                  value={behavioralAssessment}
                  onChange={(e) => setBehavioralAssessment(e.target.value)}
                  placeholder="Describa el comportamiento y actitud del estudiante..."
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-azul-monte-tabor focus:border-transparent resize-none"
                />
              </div>

              {/* Emotional Maturity */}
              <div>
                <label className="block text-sm font-medium text-gris-piedra mb-2">
                  Madurez Emocional
                </label>
                <textarea
                  value={emotionalMaturity}
                  onChange={(e) => setEmotionalMaturity(e.target.value)}
                  placeholder="Evalúe la madurez emocional del estudiante..."
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-azul-monte-tabor focus:border-transparent resize-none"
                />
              </div>

              {/* Social Skills */}
              <div>
                <label className="block text-sm font-medium text-gris-piedra mb-2">
                  Habilidades Sociales
                </label>
                <textarea
                  value={socialSkills}
                  onChange={(e) => setSocialSkills(e.target.value)}
                  placeholder="Describa las habilidades sociales y de integración..."
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-azul-monte-tabor focus:border-transparent resize-none"
                />
              </div>

              {/* Motivation Assessment */}
              <div>
                <label className="block text-sm font-medium text-gris-piedra mb-2">
                  Motivación y Compromiso
                </label>
                <textarea
                  value={motivationAssessment}
                  onChange={(e) => setMotivationAssessment(e.target.value)}
                  placeholder="Evalúe la motivación e interés del estudiante..."
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-azul-monte-tabor focus:border-transparent resize-none"
                />
              </div>

              {/* Family Support */}
              <div>
                <label className="block text-sm font-medium text-gris-piedra mb-2">
                  Apoyo Familiar
                </label>
                <textarea
                  value={familySupport}
                  onChange={(e) => setFamilySupport(e.target.value)}
                  placeholder="Evalúe el nivel de apoyo y compromiso familiar..."
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-azul-monte-tabor focus:border-transparent resize-none"
                />
              </div>
            </div>

            {/* Integration Potential */}
            <div>
              <label className="block text-sm font-medium text-gris-piedra mb-2">
                Potencial de Integración
              </label>
              <textarea
                value={integrationPotential}
                onChange={(e) => setIntegrationPotential(e.target.value)}
                placeholder="Evalúe el potencial del estudiante para integrarse a la comunidad educativa..."
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-azul-monte-tabor focus:border-transparent resize-none"
              />
            </div>

            {/* Strengths */}
            <div>
              <label className="block text-sm font-medium text-gris-piedra mb-2">
                Fortalezas
              </label>
              <textarea
                value={strengths}
                onChange={(e) => setStrengths(e.target.value)}
                placeholder="Describa las principales fortalezas del estudiante..."
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-azul-monte-tabor focus:border-transparent resize-none"
              />
            </div>

            {/* Areas for Improvement */}
            <div>
              <label className="block text-sm font-medium text-gris-piedra mb-2">
                Áreas de Mejora
              </label>
              <textarea
                value={areasForImprovement}
                onChange={(e) => setAreasForImprovement(e.target.value)}
                placeholder="Identifique áreas específicas que requieren desarrollo..."
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-azul-monte-tabor focus:border-transparent resize-none"
              />
            </div>

            {/* Recommendations */}
            <div>
              <label className="block text-sm font-medium text-gris-piedra mb-2">
                Recomendaciones para el Comité
              </label>
              <textarea
                value={recommendations}
                onChange={(e) => setRecommendations(e.target.value)}
                placeholder="Proporcione recomendaciones específicas para la decisión de admisión..."
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-azul-monte-tabor focus:border-transparent resize-none"
              />
            </div>

            {/* Final Recommendation */}
            <div>
              <label className="block text-sm font-medium text-gris-piedra mb-2">
                Recomendación Final
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="finalRecommendation"
                    checked={finalRecommendation === true}
                    onChange={() => setFinalRecommendation(true)}
                    className="w-4 h-4 text-azul-monte-tabor focus:ring-azul-monte-tabor"
                  />
                  <span className="text-verde-esperanza font-medium">Recomendar Admisión</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="finalRecommendation"
                    checked={finalRecommendation === false}
                    onChange={() => setFinalRecommendation(false)}
                    className="w-4 h-4 text-red-600 focus:ring-red-600"
                  />
                  <span className="text-red-600 font-medium">No Recomendar</span>
                </label>
              </div>
            </div>
          </Card>

          {/* HU-6: File Attachments Section */}
          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-azul-monte-tabor flex items-center gap-2">
                <FiPaperclip />
                Archivos Adjuntos
              </h2>
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={uploadingFile}
                    className="flex items-center gap-2"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {uploadingFile ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-azul-monte-tabor"></div>
                        Subiendo...
                      </>
                    ) : (
                      <>
                        <FiUpload />
                        Subir Archivo
                      </>
                    )}
                  </Button>
                </label>
              </div>
            </div>

            <p className="text-sm text-gris-piedra">
              Puede adjuntar pautas de entrevistas, informes complementarios u otros documentos relevantes (PDF, imágenes, Word).
            </p>

            {loadingAttachments ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-azul-monte-tabor mx-auto"></div>
              </div>
            ) : attachments.length === 0 ? (
              <div className="text-center py-8 text-gris-piedra bg-gray-50 rounded-lg">
                <FiPaperclip className="mx-auto h-12 w-12 mb-2 opacity-50" />
                <p>No hay archivos adjuntos</p>
              </div>
            ) : (
              <div className="space-y-2">
                {attachments.map((attachment) => (
                  <div
                    key={attachment.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <FiPaperclip className="text-azul-monte-tabor" />
                      <div className="flex-1">
                        <p className="font-medium text-sm">{attachment.original_name}</p>
                        <p className="text-xs text-gris-piedra">
                          {formatFileSize(attachment.file_size)} • {new Date(attachment.created_at).toLocaleDateString('es-CL')}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <a
                        href={`${getApiBaseUrl()}/v1/evaluations/attachments/${attachment.id}/download`}
                        download
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="flex items-center gap-1"
                        >
                          <FiDownload />
                          Descargar
                        </Button>
                      </a>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteAttachment(attachment.id)}
                        className="text-red-600 hover:text-red-700 flex items-center gap-1"
                      >
                        <FiTrash2 />
                        Eliminar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* HU-8: Student Evaluation History */}
          {studentHistory.length > 0 && (
            <Card className="p-6 space-y-4 bg-amber-50 border-amber-200">
              <h2 className="text-xl font-bold text-azul-monte-tabor flex items-center gap-2">
                <FiClock />
                Historial de Evaluaciones del Estudiante
              </h2>
              <p className="text-sm text-gris-piedra">
                Evaluaciones previas realizadas a este estudiante en años anteriores
              </p>

              {loadingHistory ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-azul-monte-tabor mx-auto"></div>
                </div>
              ) : (
                <div className="space-y-3">
                  {studentHistory
                    .filter(h => h.id !== evaluation?.id) // Exclude current evaluation
                    .map((hist) => (
                    <div
                      key={hist.id}
                      className="p-4 bg-white rounded-lg border border-amber-300"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                        <div>
                          <label className="text-xs font-medium text-gris-piedra">Tipo de Evaluación</label>
                          <p className="text-sm font-semibold">{getEvaluationTypeLabel(hist.evaluation_type)}</p>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gris-piedra">Año</label>
                          <p className="text-sm">{hist.application_year || 'N/A'}</p>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gris-piedra">Puntaje</label>
                          <p className="text-sm">{hist.score !== null ? `${hist.score}/100` : 'N/A'}</p>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gris-piedra">Estado</label>
                          <Badge variant={hist.status === 'COMPLETED' ? 'success' : 'warning'}>
                            {hist.status}
                          </Badge>
                        </div>
                      </div>
                      {hist.observations && (
                        <div className="mt-3 pt-3 border-t border-amber-200">
                          <label className="text-xs font-medium text-gris-piedra">Observaciones</label>
                          <p className="text-sm mt-1">{hist.observations}</p>
                        </div>
                      )}
                      <div className="mt-2 text-xs text-gris-piedra">
                        Evaluador: {hist.evaluator_name} • Fecha: {new Date(hist.created_at).toLocaleDateString('es-CL')}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}

          {/* Action Buttons */}
          <Card className="p-6">
            <div className="flex gap-4">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                disabled={saving}
                className="flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Guardando...
                  </>
                ) : (
                  <>
                    <FiCheckCircle />
                    Completar Evaluación
                  </>
                )}
              </Button>

              <Button
                type="button"
                variant="secondary"
                size="lg"
                onClick={handleSaveDraft}
                disabled={saving}
                className="flex items-center gap-2"
              >
                <FiSave />
                Guardar Borrador
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="lg"
                onClick={() => navigate('/profesor/dashboard')}
                disabled={saving}
              >
                Cancelar
              </Button>
            </div>
          </Card>
        </form>
      </div>
    </div>
  );
};

export default EvaluationForm;
