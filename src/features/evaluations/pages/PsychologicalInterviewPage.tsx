import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import PsychologicalInterviewForm from '../../../packages/shared-ui/src/components/evaluations/PsychologicalInterviewForm';
import { Evaluation, EvaluationStatus } from '../../../packages/shared-ui/src/types/evaluation';
import { professorEvaluationService } from '../../admin/services/professorEvaluationService';
import { useNotifications } from '../../admin/context/AppContext';

const PsychologicalInterviewPage: React.FC = () => {
  const { evaluationId } = useParams<{ evaluationId: string }>();
  const navigate = useNavigate();
  const { addNotification } = useNotifications();
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!evaluationId) return;
      try {
        setIsLoading(true);
        const loaded = await professorEvaluationService.getEvaluationById(Number(evaluationId));
        const structured = loaded.interviewData || {};
        setEvaluation({
          ...loaded,
          socialSkillsAssessment: structured.socialSkillsAssessment || '',
          emotionalMaturity: structured.emotionalMaturity || '',
          motivationAssessment: structured.motivationAssessment || '',
          familySupportAssessment: structured.familySupportAssessment || ''
        } as Evaluation);
        setError(null);
      } catch (loadError: any) {
        setError(loadError.message || 'No se pudo cargar la entrevista psicológica');
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [evaluationId]);

  const persist = async (data: Partial<Evaluation>, status: EvaluationStatus) => {
    if (!evaluationId || !evaluation) return;
    setIsSubmitting(true);
    try {
      const interviewData = {
        ...(evaluation.interviewData || {}),
        formType: 'PSYCHOLOGICAL_INTERVIEW',
        socialSkillsAssessment: data.socialSkillsAssessment || '',
        emotionalMaturity: data.emotionalMaturity || '',
        motivationAssessment: data.motivationAssessment || '',
        familySupportAssessment: data.familySupportAssessment || ''
      };
      const updated = await professorEvaluationService.updateEvaluation(Number(evaluationId), {
        observations: data.observations,
        strengths: data.strengths,
        areasForImprovement: data.areasForImprovement,
        recommendations: data.recommendations,
        interviewData,
        status
      });
      setEvaluation({ ...evaluation, ...data, ...updated, interviewData } as Evaluation);
      addNotification({
        type: 'success',
        title: status === EvaluationStatus.COMPLETED ? 'Entrevista completada' : 'Borrador guardado',
        message: 'Los datos de la entrevista psicológica fueron guardados correctamente'
      });
      if (status === EvaluationStatus.COMPLETED) navigate('/profesor');
    } catch (saveError: any) {
      addNotification({
        type: 'error',
        title: 'Error al guardar',
        message: saveError.message || 'No se pudo guardar la entrevista psicológica'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center text-gray-600">Cargando entrevista psicológica...</div>;
  }
  if (!evaluation || error) {
    return <div className="p-8 text-center text-red-600">{error || 'Entrevista no encontrada'}</div>;
  }

  return (
    <PsychologicalInterviewForm
      evaluation={evaluation}
      onSave={(data) => persist(data, EvaluationStatus.IN_PROGRESS)}
      onComplete={(data) => persist(data, EvaluationStatus.COMPLETED)}
      isSubmitting={isSubmitting}
    />
  );
};

export default PsychologicalInterviewPage;
