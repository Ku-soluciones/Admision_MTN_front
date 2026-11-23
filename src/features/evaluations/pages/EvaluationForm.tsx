import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getApiBaseUrl } from '../../admin/config/api.config';
import Card from '../../admin/components/ui/Card';
import Button from '../../admin/components/ui/Button';
import Input from '../../admissions/components/ui/Input';
import Badge from '../../admin/components/ui/Badge';
import TextArea from '../../admin/components/ui/TextArea';
import ConfirmDialog from '../../admissions/components/ui/ConfirmDialog';
import { FiSave, FiArrowLeft, FiCheckCircle, FiPaperclip, FiDownload, FiTrash2, FiUpload, FiClock, FiChevronDown, FiChevronRight, FiAlertTriangle } from 'react-icons/fi';
import { professorEvaluationService } from '../../admin/services/professorEvaluationService';
import { authStore, BASE_STORAGE_KEYS, getStorageKey } from '../../../packages/backend-sdk/src/index';
import { useAutoSave } from '../../../packages/shared-ui/src/hooks/useAutoSave';

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

function getAuthorizationHeaders(): HeadersInit {
  const token =
    authStore.getValidAccessToken() ||
    localStorage.getItem(getStorageKey(BASE_STORAGE_KEYS.PROFESSOR_TOKEN)) ||
    localStorage.getItem(getStorageKey(BASE_STORAGE_KEYS.AUTH_TOKEN)) ||
    localStorage.getItem(BASE_STORAGE_KEYS.PROFESSOR_TOKEN) ||
    localStorage.getItem(BASE_STORAGE_KEYS.AUTH_TOKEN);

  return token ? { Authorization: `Bearer ${token}` } : {};
}

const EvaluationForm: React.FC = () => {
  const { evaluationId } = useParams<{ evaluationId: string }>();
  const navigate = useNavigate();

  const [evaluation, setEvaluation] = useState<EvaluationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [deletingAttachment, setDeletingAttachment] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [confirmNoRecommend, setConfirmNoRecommend] = useState(false);

  // Collapsible sections
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    basicInfo: true,
    personal: true,
    academic: true,
    recommendation: true
  });

  const toggleSection = (section: string) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

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

  // Form data for auto-save
  const formData = {
    score, grade, observations, academicReadiness, behavioralAssessment,
    emotionalMaturity, socialSkills, motivationAssessment, familySupport,
    integrationPotential, strengths, areasForImprovement, recommendations,
    finalRecommendation
  };

  // Auto-guardado cada 30 segundos
  useAutoSave({
    key: `evaluation-form-${evaluationId}`,
    data: formData,
    interval: 30000,
    enabled: !loading
  });

  useEffect(() => {
    loadEvaluation();
    loadInterviewData();
    loadAttachments();
    loadStudentHistory();
  }, [evaluationId]);

  const loadInterviewData = async () => {
    if (!evaluationId) return;

    try {
      const response = await fetch(`${getApiBaseUrl()}/api/evaluations/${evaluationId}/interview`, {
        headers: getAuthorizationHeaders()
      });

      if (response.ok) {
        const data = await response.json();
        setHasInterview(data.hasInterview);
        setInterviewData(data.interview);
      }
    } catch (error) {
    }
  };

  const loadEvaluation = async () => {
    if (!evaluationId) return;

    try {
      setLoading(true);
      const data = await professorEvaluationService.getEvaluationById(parseInt(evaluationId));
      setEvaluation(data);
      const structured = data.interviewData || {};

      // Populate form fields
      setScore(data.score || '');
      setGrade(data.grade || '');
      setObservations(data.observations || '');

      // Populate qualitative observations
      setAcademicReadiness(structured.academicReadiness || '');
      setBehavioralAssessment(structured.behavioralAssessment || '');
      setEmotionalMaturity(structured.emotionalMaturity || '');
      setSocialSkills(structured.socialSkillsAssessment || '');
      setMotivationAssessment(structured.motivationAssessment || '');
      setFamilySupport(structured.familySupportAssessment || '');
      setIntegrationPotential(structured.integrationPotential || '');
      setStrengths(data.strengths || '');
      setAreasForImprovement(data.areasForImprovement || '');
      setRecommendations(data.recommendations || '');
      setFinalRecommendation(structured.finalRecommendation ?? null);

      setError(null);
    } catch (err: any) {
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
        strengths,
        areasForImprovement,
        recommendations,
        interviewData: {
          formType: 'GENERAL_EVALUATION', academicReadiness, behavioralAssessment,
          emotionalMaturity, socialSkillsAssessment: socialSkills, motivationAssessment,
          familySupportAssessment: familySupport, integrationPotential, finalRecommendation
        }
      };

      await professorEvaluationService.updateEvaluation(parseInt(evaluationId), updateData);

      setLastSaved(new Date());

      // Navigate back to dashboard
      navigate('/profesor/dashboard');
    } catch (err: any) {
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
        strengths,
        areasForImprovement,
        recommendations,
        interviewData: {
          formType: 'GENERAL_EVALUATION', academicReadiness, behavioralAssessment,
          emotionalMaturity, socialSkillsAssessment: socialSkills, motivationAssessment,
          familySupportAssessment: familySupport, integrationPotential, finalRecommendation
        }
      };

      await professorEvaluationService.updateEvaluation(parseInt(evaluationId), updateData);

      navigate('/profesor/dashboard');
    } catch (err: any) {
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
      const response = await fetch(`${getApiBaseUrl()}/api/evaluations/${evaluationId}/attachments`, {
        headers: getAuthorizationHeaders()
      });

      if (response.ok) {
        const data = await response.json();
        setAttachments(data.attachments || []);
      }
    } catch (error) {
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
      const response = await fetch(`${getApiBaseUrl()}/api/evaluations/${evaluationId}/attachments`, {
        method: 'POST',
        headers: getAuthorizationHeaders(),
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
      setError('Error al subir el archivo');
    } finally {
      setUploadingFile(false);
    }
  };

  // HU-6: Delete attachment
  const handleDeleteAttachment = (attachmentId: number) => {
    setConfirmDeleteId(attachmentId);
  };

  const performDeleteAttachment = async () => {
    if (confirmDeleteId == null) return;
    setDeletingAttachment(true);
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/evaluations/attachments/${confirmDeleteId}`, {
        method: 'DELETE',
        headers: getAuthorizationHeaders()
      });

      if (response.ok) {
        await loadAttachments();
      } else {
        setError('Error al eliminar el archivo');
      }
    } catch (error) {
      setError('Error al eliminar el archivo');
    } finally {
      setDeletingAttachment(false);
      setConfirmDeleteId(null);
    }
  };

  // HU-8: Load student evaluation history
  const loadStudentHistory = async () => {
    if (!evaluation?.application_id) return;

    const studentId = (evaluation as any)?.application?.student?.id;
    if (!studentId) return;

    try {
      setLoadingHistory(true);

      // Now get the history
      const historyResponse = await fetch(`${getApiBaseUrl()}/api/evaluations/student/${studentId}/history`, {
        headers: getAuthorizationHeaders()
      });

      if (historyResponse.ok) {
        const historyData = await historyResponse.json();
        setStudentHistory(historyData.evaluations || []);
      }
    } catch (error) {
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
            {lastSaved && (
              <p className="text-xs text-gris-piedra mt-1">
                Guardado {lastSaved.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
              </p>
            )}
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
              <span></span> Información de Entrevista Realizada
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
          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between cursor-pointer" onClick={() => toggleSection('basicInfo')}>
              <h2 className="text-xl font-bold text-azul-monte-tabor">
                Observaciones Cualitativas Detalladas
              </h2>
              {openSections.basicInfo ? <FiChevronDown /> : <FiChevronRight />}
            </div>
            <p className="text-sm text-gris-piedra">
              Estas observaciones son confidenciales y serán visibles solo para el comité de admisión
            </p>

            {openSections.basicInfo && (
              <>
                {/* Aspectos Personales */}
                <div className="border-t pt-4 mt-4">
                  <button
                    type="button"
                    onClick={() => toggleSection('personal')}
                    className="flex items-center gap-2 text-left w-full hover:bg-gray-50 p-2 -mx-2 rounded-lg transition-colors"
                  >
                    {openSections.personal ? <FiChevronDown className="text-azul-monte-tabor" /> : <FiChevronRight className="text-azul-monte-tabor" />}
                    <span className="font-semibold text-azul-monte-tabor">Aspectos Personales</span>
                  </button>

                  {openSections.personal && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3 pl-2">
                      <TextArea
                        label="Madurez Emocional"
                        value={emotionalMaturity}
                        onChange={(e) => setEmotionalMaturity(e.target.value)}
                        placeholder="Evalúe la madurez emocional del estudiante..."
                        rows={3}
                      />
                      <TextArea
                        label="Habilidades Sociales"
                        value={socialSkills}
                        onChange={(e) => setSocialSkills(e.target.value)}
                        placeholder="Describa las habilidades sociales y de integración..."
                        rows={3}
                      />
                      <TextArea
                        label="Motivación y Compromiso"
                        value={motivationAssessment}
                        onChange={(e) => setMotivationAssessment(e.target.value)}
                        placeholder="Evalúe la motivación e interés del estudiante..."
                        rows={3}
                      />
                      <TextArea
                        label="Apoyo Familiar"
                        value={familySupport}
                        onChange={(e) => setFamilySupport(e.target.value)}
                        placeholder="Evalúe el nivel de apoyo y compromiso familiar..."
                        rows={3}
                      />
                      <TextArea
                        label="Potencial de Integración"
                        value={integrationPotential}
                        onChange={(e) => setIntegrationPotential(e.target.value)}
                        placeholder="Evalúe el potencial del estudiante para integrarse a la comunidad educativa..."
                        rows={3}
                        className="sm:col-span-2"
                      />
                    </div>
                  )}
                </div>

                {/* Aspectos Académicos */}
                <div className="border-t pt-4 mt-4">
                  <button
                    type="button"
                    onClick={() => toggleSection('academic')}
                    className="flex items-center gap-2 text-left w-full hover:bg-gray-50 p-2 -mx-2 rounded-lg transition-colors"
                  >
                    {openSections.academic ? <FiChevronDown className="text-azul-monte-tabor" /> : <FiChevronRight className="text-azul-monte-tabor" />}
                    <span className="font-semibold text-azul-monte-tabor">Aspectos Académicos</span>
                  </button>

                  {openSections.academic && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3 pl-2">
                      <TextArea
                        label="Preparación Académica"
                        value={academicReadiness}
                        onChange={(e) => setAcademicReadiness(e.target.value)}
                        placeholder="Evalúe la preparación académica del estudiante..."
                        rows={3}
                      />
                      <TextArea
                        label="Evaluación Conductual"
                        value={behavioralAssessment}
                        onChange={(e) => setBehavioralAssessment(e.target.value)}
                        placeholder="Describa el comportamiento y actitud del estudiante..."
                        rows={3}
                      />
                      <TextArea
                        label="Fortalezas"
                        value={strengths}
                        onChange={(e) => setStrengths(e.target.value)}
                        placeholder="Describa las principales fortalezas del estudiante..."
                        rows={3}
                      />
                      <TextArea
                        label="Áreas de Mejora"
                        value={areasForImprovement}
                        onChange={(e) => setAreasForImprovement(e.target.value)}
                        placeholder="Identifique áreas específicas que requieren desarrollo..."
                        rows={3}
                      />
                    </div>
                  )}
                </div>

                {/* Recomendaciones */}
                <div className="border-t pt-4 mt-4">
                  <button
                    type="button"
                    onClick={() => toggleSection('recommendation')}
                    className="flex items-center gap-2 text-left w-full hover:bg-gray-50 p-2 -mx-2 rounded-lg transition-colors"
                  >
                    {openSections.recommendation ? <FiChevronDown className="text-azul-monte-tabor" /> : <FiChevronRight className="text-azul-monte-tabor" />}
                    <span className="font-semibold text-azul-monte-tabor">Recomendación</span>
                  </button>

                  {openSections.recommendation && (
                    <div className="space-y-4 mt-3 pl-2">
                      <TextArea
                        label="Recomendaciones para el Comité"
                        value={recommendations}
                        onChange={(e) => setRecommendations(e.target.value)}
                        placeholder="Proporcione recomendaciones específicas para la decisión de admisión..."
                        rows={4}
                      />

                      {/* Final Recommendation */}
                      <div>
                        <label className="block text-sm font-medium text-gris-piedra mb-3">
                          Recomendación Final
                        </label>
                        <div className="flex gap-4">
                          <label className="flex items-center gap-2 cursor-pointer p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex-1">
                            <input
                              type="radio"
                              name="finalRecommendation"
                              checked={finalRecommendation === true}
                              onChange={() => setFinalRecommendation(true)}
                              className="w-4 h-4 text-azul-monte-tabor focus:ring-azul-monte-tabor"
                            />
                            <span className="text-verde-esperanza font-medium">Recomendar Admisión</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer p-3 border border-red-200 rounded-lg hover:bg-red-50 transition-colors flex-1">
                            <input
                              type="radio"
                              name="finalRecommendation"
                              checked={finalRecommendation === false}
                              onChange={() => setConfirmNoRecommend(true)}
                              className="w-4 h-4 text-red-600 focus:ring-red-600"
                            />
                            <span className="text-red-600 font-medium">No Recomendar</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
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
                        href={`${getApiBaseUrl()}/api/evaluations/attachments/${attachment.id}/download`}
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

      <ConfirmDialog
        isOpen={confirmDeleteId !== null}
        title="Eliminar archivo"
        message="¿Está seguro de eliminar este archivo?"
        confirmText="Eliminar"
        cancelText="Cancelar"
        variant="danger"
        isLoading={deletingAttachment}
        onConfirm={performDeleteAttachment}
        onClose={() => setConfirmDeleteId(null)}
      />

      <ConfirmDialog
        isOpen={confirmNoRecommend}
        title="Confirmar No Recomendar"
        message="¿Está seguro de marcar esta evaluación como 'No Recomendar'? Esta acción indica que el estudiante no es recomendado para la admisión."
        confirmText="Confirmar"
        cancelText="Cancelar"
        variant="danger"
        icon={<FiAlertTriangle className="w-6 h-6 text-red-600" />}
        onConfirm={() => {
          setFinalRecommendation(false);
          setConfirmNoRecommend(false);
        }}
        onClose={() => setConfirmNoRecommend(false)}
      />
    </div>
  );
};

export default EvaluationForm;
