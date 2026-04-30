import api from './api';
import { 
  Evaluation, 
  AcademicEvaluation, 
  PsychologicalEvaluation, 
  CycleDirectorEvaluation,
  UpdateEvaluationRequest,
  EvaluationType,
  EvaluationStatus
} from '../types/evaluation';

export const evaluationApiService = {
  // Obtener evaluación por ID con tipos específicos
  async getEvaluationById(evaluationId: number): Promise<Evaluation> {
    try {
      const response = await api.get(`/evaluations/${evaluationId}`);
      return response.data;
    } catch (error) {
      console.error('Error getting evaluation by ID:', error);
      throw error;
    }
  },

  // Actualizar evaluación con los nuevos tipos
  async updateEvaluation(evaluationId: number, data: UpdateEvaluationRequest): Promise<Evaluation> {
    try {
      // Preparar los datos según el backend
      const updateData = {
        status: data.status,
        score: data.score,
        grade: data.grade,
        observations: data.observations,
        strengths: data.strengths,
        areasForImprovement: data.areasForImprovement,
        recommendations: data.recommendations,
        
        // Campos específicos para evaluación psicológica
        socialSkillsAssessment: data.socialSkillsAssessment,
        emotionalMaturity: data.emotionalMaturity,
        motivationAssessment: data.motivationAssessment,
        familySupportAssessment: data.familySupportAssessment,
        
        // Campos específicos para director de ciclo
        academicReadiness: data.academicReadiness,
        behavioralAssessment: data.behavioralAssessment,
        integrationPotential: data.integrationPotential,
        finalRecommendation: data.finalRecommendation,
        
        // Fechas
        evaluationDate: data.evaluationDate,
        completionDate: data.completionDate
      };

      // Filtrar campos undefined
      const filteredData = Object.fromEntries(
        Object.entries(updateData).filter(([_, value]) => value !== undefined)
      );

      const response = await api.put(`/evaluations/${evaluationId}`, filteredData);
      return response.data;
    } catch (error) {
      console.error('Error updating evaluation:', error);
      throw error;
    }
  },

  // Obtener evaluaciones del evaluador actual
  async getMyEvaluations(): Promise<Evaluation[]> {
    try {
      const response = await api.get('/evaluations/my-evaluations');
      return response.data;
    } catch (error) {
      console.error('Error getting my evaluations:', error);
      throw error;
    }
  },

  // Obtener evaluaciones pendientes del evaluador actual
  async getMyPendingEvaluations(): Promise<Evaluation[]> {
    try {
      const response = await api.get('/evaluations/my-pending');
      return response.data;
    } catch (error) {
      console.error('Error getting my pending evaluations:', error);
      throw error;
    }
  },

  // Obtener evaluaciones por aplicación
  async getEvaluationsByApplication(applicationId: number): Promise<Evaluation[]> {
    try {
      const response = await api.get(`/evaluations/application/${applicationId}`);
      return response.data;
    } catch (error) {
      console.error('Error getting evaluations by application:', error);
      throw error;
    }
  },

  // Funciones auxiliares para determinar el tipo específico de evaluación
  isAcademicEvaluation(evaluation: Evaluation): evaluation is AcademicEvaluation {
    return [
      EvaluationType.LANGUAGE_EXAM,
      EvaluationType.MATHEMATICS_EXAM,
      EvaluationType.ENGLISH_EXAM
    ].includes(evaluation.evaluationType);
  },

  isPsychologicalEvaluation(evaluation: Evaluation): evaluation is PsychologicalEvaluation {
    return evaluation.evaluationType === EvaluationType.PSYCHOLOGICAL_INTERVIEW;
  },

  isCycleDirectorEvaluation(evaluation: Evaluation): evaluation is CycleDirectorEvaluation {
    return [
      EvaluationType.CYCLE_DIRECTOR_REPORT,
      EvaluationType.CYCLE_DIRECTOR_INTERVIEW
    ].includes(evaluation.evaluationType);
  },

  // Validar si el usuario actual puede editar la evaluación
  canEditEvaluation(evaluation: Evaluation, currentUserId?: number): boolean {
    // Solo el evaluador asignado puede editar su evaluación
    if (!currentUserId || !evaluation.evaluator) {
      return false;
    }
    
    return evaluation.evaluator.id === currentUserId && 
           evaluation.status !== EvaluationStatus.COMPLETED &&
           evaluation.status !== EvaluationStatus.APPROVED;
  },

  // Obtener el componente de formulario apropiado para el tipo de evaluación
  getFormComponentName(evaluationType: EvaluationType): string {
    switch (evaluationType) {
      case EvaluationType.LANGUAGE_EXAM:
      case EvaluationType.MATHEMATICS_EXAM:
      case EvaluationType.ENGLISH_EXAM:
        return 'AcademicEvaluationForm';
      case EvaluationType.PSYCHOLOGICAL_INTERVIEW:
        return 'PsychologicalInterviewForm';
      case EvaluationType.CYCLE_DIRECTOR_REPORT:
      case EvaluationType.CYCLE_DIRECTOR_INTERVIEW:
        return 'CycleDirectorForm';
      default:
        return 'GenericEvaluationForm';
    }
  },

  // Obtener estadísticas de evaluaciones
  async getEvaluationStatistics(): Promise<any> {
    try {
      const response = await api.get('/evaluations/statistics');
      return response.data;
    } catch (error) {
      console.error('Error getting evaluation statistics:', error);
      // Intentar endpoint público como fallback
      try {
        const fallbackResponse = await api.get('/evaluations/public/statistics');
        return fallbackResponse.data;
      } catch (fallbackError) {
        console.error('Error with fallback statistics:', fallbackError);
        throw error;
      }
    }
  },

  // Crear mock data para desarrollo
  createMockEvaluation(type: EvaluationType, applicationId: number): Partial<Evaluation> {
    const baseEvaluation = {
      id: Math.floor(Math.random() * 1000),
      evaluationType: type,
      status: EvaluationStatus.PENDING,
      createdAt: new Date().toISOString(),
      application: {
        id: applicationId,
        status: 'SUBMITTED',
        submissionDate: new Date().toISOString(),
        student: {
          firstName: 'Estudiante',
          lastName: 'de Prueba',
          rut: '12345678-9',
          gradeApplied: '3° Básico'
        }
      },
      evaluator: {
        id: 1,
        firstName: 'Evaluador',
        lastName: 'de Prueba',
        email: 'evaluador@mtn.cl',
        role: 'TEACHER_LANGUAGE'
      }
    };

    return baseEvaluation;
  }
};

export default evaluationApiService;