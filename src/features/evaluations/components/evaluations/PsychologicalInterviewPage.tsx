import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import PsychologicalInterviewForm from '../../../../packages/shared-ui/src/components/evaluations/PsychologicalInterviewForm';
import { Evaluation, EvaluationStatus, EvaluationType } from '../../../../packages/shared-ui/src/types/evaluation';
import api from '../../../admin/services/api';
import Button from '../../../admin/components/ui/Button';
import Card from '../../../admin/components/ui/Card';
import { useNotifications } from '../../../admin/context/AppContext';

type PsychologicalEvaluation = Evaluation & Record<string, unknown>;

const PsychologicalInterviewPage: React.FC = () => {
  const { evaluationId } = useParams<{ evaluationId: string }>();
  const navigate = useNavigate();
  const { addNotification } = useNotifications();
  const [evaluation, setEvaluation] = useState<PsychologicalEvaluation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const loadEvaluation = async () => {
      if (!evaluationId || !/^\d+$/.test(evaluationId)) {
        setLoadError('La evaluación solicitada no es válida.');
        setIsLoading(false);
        return;
      }

      try {
        const response = await api.get(`/api/evaluations/${evaluationId}`);
        const raw = response.data?.data || response.data;
        const evaluationType = raw.evaluationType || raw.type;
        if (evaluationType !== EvaluationType.PSYCHOLOGICAL_INTERVIEW) {
          throw new Error('La evaluación seleccionada no corresponde a una entrevista psicológica.');
        }

        if (active) {
          setEvaluation({
            ...raw,
            ...(raw.interviewData || {}),
            evaluationType,
            application: raw.application,
          } as PsychologicalEvaluation);
        }
      } catch (error) {
        if (active) {
          setLoadError(error instanceof Error ? error.message : 'No se pudo cargar la entrevista psicológica.');
        }
      } finally {
        if (active) setIsLoading(false);
      }
    };

    loadEvaluation();
    return () => {
      active = false;
    };
  }, [evaluationId]);

  const persist = async (data: Partial<Evaluation>, complete: boolean) => {
    if (!evaluationId) return;
    setIsSubmitting(true);
    try {
      const payload = {
        ...data,
        interviewData: data,
        status: complete ? EvaluationStatus.COMPLETED : EvaluationStatus.IN_PROGRESS,
      };
      const response = complete
        ? await api.post(`/api/evaluations/${evaluationId}/complete`, payload)
        : await api.put(`/api/evaluations/${evaluationId}`, payload);
      const saved = response.data?.data || response.data;

      setEvaluation(current => current ? ({ ...current, ...data, ...saved } as PsychologicalEvaluation) : current);
      addNotification({
        type: 'success',
        title: complete ? 'Entrevista completada' : 'Borrador guardado',
        message: complete
          ? 'La entrevista psicológica se guardó correctamente.'
          : 'Los avances quedaron guardados.',
      });
      if (complete) navigate('/profesor');
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'No se pudo guardar',
        message: error instanceof Error ? error.message : 'Intenta nuevamente.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl p-6" role="status">
        <div className="h-48 animate-pulse rounded-xl bg-gray-100" />
      </div>
    );
  }

  if (loadError || !evaluation) {
    return (
      <div className="mx-auto max-w-2xl p-6">
        <Card className="space-y-4 p-6">
          <h1 className="text-xl font-bold text-azul-monte-tabor">No se pudo abrir la entrevista</h1>
          <p className="text-gray-600">{loadError || 'No encontramos los datos de esta evaluación.'}</p>
          <Button variant="outline" onClick={() => navigate('/profesor')}>Volver al portal</Button>
        </Card>
      </div>
    );
  }

  return (
    <main className="mx-auto w-full max-w-5xl p-4 sm:p-6">
      <div className="mb-4">
        <Button variant="outline" onClick={() => navigate('/profesor')}>← Volver a mis entrevistas</Button>
      </div>
      <PsychologicalInterviewForm
        evaluation={evaluation}
        onSave={data => persist(data, false)}
        onComplete={data => persist(data, true)}
        isSubmitting={isSubmitting}
      />
    </main>
  );
};

export default PsychologicalInterviewPage;
