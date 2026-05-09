import api from './api';

export interface Evaluator {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  active: boolean;
}

export interface Evaluation {
  id: number;
  evaluationType: string;
  status: string;
  score?: number;
  grade?: string;
  observations?: string;
  strengths?: string;
  areasForImprovement?: string;
  recommendations?: string;
  socialSkillsAssessment?: string;
  emotionalMaturity?: string;
  motivationAssessment?: string;
  familySupportAssessment?: string;
  academicReadiness?: string;
  behavioralAssessment?: string;
  integrationPotential?: string;
  finalRecommendation?: boolean;
  evaluationDate?: string;
  completionDate?: string;
  createdAt: string;
  updatedAt?: string;
  evaluator?: Evaluator;
  application?: {
    id: number;
    status: string;
    submissionDate: string;
    student: {
      firstName: string;
      lastName: string;
      rut: string;
      gradeApplied: string;
    };
  };
}

export interface EvaluationProgress {
  applicationId: number;
  totalEvaluations: number;
  completedEvaluations: number;
  completionPercentage: number;
  isComplete: boolean;
}

export interface EvaluationStatistics {
  totalEvaluations: number;
  statusBreakdown: Record<string, number>;
  typeBreakdown: Record<string, number>;
  averageScoresByType: Record<string, number>;
  evaluatorActivity: Record<string, number>;
  completionRate: number;
}

export interface BulkAssignmentRequest {
  applicationIds: number[];
}

export interface BulkAssignmentResult {
  totalApplications: number;
  successCount: number;
  failureCount: number;
  successful: string[];
  failed: string[];
  isComplete: boolean;
}

export const evaluatorService = {
  // Obtener evaluadores por rol
  async getEvaluatorsByRole(role: string): Promise<Evaluator[]> {
    try {
      const response = await api.get(`/v1/evaluations/evaluators/${role}`);
      return response.data;
    } catch (error) {
      console.error('Error getting evaluators by role:', error);
      throw error;
    }
  },

  // Obtener evaluadores por rol (endpoint público para desarrollo)
  async getEvaluatorsByRolePublic(role: string): Promise<Evaluator[]> {
    try {
      const response = await api.get(`/v1/evaluations/public/evaluators/${role}`);
      return response.data;
    } catch (error) {
      console.error('Error getting evaluators by role (public):', error);
      throw error;
    }
  },

  /**
   * CORREGIDO: Crear y asignar evaluación en dos pasos
   * Paso 1: Crear evaluación con POST /v1/evaluations
   * Paso 2: Asignar evaluación con POST /v1/evaluations/:id/assign
   *
   * NOTA: El endpoint anterior /v1/evaluations/assign/:applicationId/:evaluationType/:evaluatorId
   * NO EXISTE en el backend. Este método implementa el flujo correcto.
   */
  async assignSpecificEvaluation(
    applicationId: number,
    evaluationType: string,
    evaluatorId: number
  ): Promise<Evaluation> {
    try {
      console.log(`Creating evaluation for application ${applicationId}, type ${evaluationType}`);

      // Paso 1: Crear la evaluación
      const createResponse = await api.post('/v1/evaluations', {
        applicationId: Number(applicationId), // Asegurar que sea número
        evaluationType,
        score: 0, // Score inicial (requerido por el backend)
        maxScore: 100, // Score máximo (requerido por el backend)
        status: 'PENDING',
        strengths: '',
        areasForImprovement: '',
        observations: '',
        recommendations: ''
      });

      const createdEvaluation = createResponse.data.data;
      const evaluationId = createdEvaluation.id;

      console.log(`Evaluation created with ID: ${evaluationId}`);
      console.log(`Assigning to evaluator ${evaluatorId}...`);

      // Paso 2: Asignar al evaluador
      const assignResponse = await api.post(`/v1/evaluations/${evaluationId}/assign`, {
        evaluatorId,
        evaluationDate: new Date().toISOString().split('T')[0],
      });

      console.log('Evaluation assigned successfully');
      return assignResponse.data.data;
    } catch (error: any) {
      console.error('Error assigning specific evaluation:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      throw error;
    }
  },

  // Obtener evaluaciones de una aplicación
  async getEvaluationsByApplication(applicationId: number): Promise<Evaluation[]> {
    try {
      const response = await api.get(`/v1/evaluations/application/${applicationId}`);
      return response.data;
    } catch (error) {
      console.error('Error getting evaluations by application:', error);
      throw error;
    }
  },

  /**
   * CORREGIDO: Obtener evaluaciones por evaluador
   * Endpoint: GET /v1/evaluations/evaluator/:evaluatorId
   */
  async getEvaluationsByEvaluator(evaluatorId: number): Promise<Evaluation[]> {
    try {
      const response = await api.get(`/v1/evaluations/evaluator/${evaluatorId}`);
      return response.data.data;
    } catch (error) {
      console.error('Error getting evaluations by evaluator:', error);
      throw error;
    }
  },

  /**
   * CORREGIDO: Obtener evaluaciones pendientes por evaluador
   * Endpoint: GET /v1/evaluations/evaluator/:id/pending
   */
  async getPendingEvaluationsByEvaluator(evaluatorId: number): Promise<Evaluation[]> {
    try {
      const response = await api.get(`/v1/evaluations/evaluator/${evaluatorId}/pending`);
      return response.data.data;
    } catch (error) {
      console.error('Error getting pending evaluations by evaluator:', error);
      throw error;
    }
  },

  /**
   * CORREGIDO: Actualizar evaluación
   * Endpoint: PUT /v1/evaluations/:id
   */
  async updateEvaluation(evaluationId: number, evaluationData: Partial<Evaluation>): Promise<Evaluation> {
    try {
      const response = await api.put(`/v1/evaluations/${evaluationId}`, evaluationData);
      return response.data.data;
    } catch (error) {
      console.error('Error updating evaluation:', error);
      throw error;
    }
  },

  // Actualizar evaluación con nuevos tipos
  async updateEvaluationWithTypes(evaluationId: number, evaluationData: any): Promise<any> {
    try {
      const response = await api.put(`/v1/evaluations/${evaluationId}`, evaluationData);
      return response.data;
    } catch (error) {
      console.error('Error updating evaluation with types:', error);
      throw error;
    }
  },

  // Obtener evaluación por ID
  async getEvaluationById(evaluationId: number): Promise<Evaluation> {
    try {
      const response = await api.get(`/v1/evaluations/${evaluationId}`);
      return response.data.data;
    } catch (error) {
      console.error('Error getting evaluation by ID:', error);
      throw error;
    }
  },

  /**
   * CORREGIDO: Asignar evaluación existente a evaluador
   * Endpoint: POST /v1/evaluations/:id/assign
   * NOTA: Este reemplaza el antiguo reassignEvaluation
   */
  async assignEvaluation(
    evaluationId: number,
    evaluatorId: number,
    evaluationDate?: string
  ): Promise<Evaluation> {
    try {
      const response = await api.post(`/v1/evaluations/${evaluationId}/assign`, {
        evaluatorId,
        evaluationDate: evaluationDate || new Date().toISOString().split('T')[0],
      });
      return response.data.data;
    } catch (error) {
      console.error('Error assigning evaluation:', error);
      throw error;
    }
  },

  /**
   * CORREGIDO: Obtener estadísticas
   * Endpoint: GET /v1/evaluations/statistics
   */
  async getEvaluationStatistics(): Promise<EvaluationStatistics> {
    try {
      const response = await api.get('/v1/evaluations/statistics');
      return response.data.data;
    } catch (error) {
      console.error('Error getting evaluation statistics:', error);
      throw error;
    }
  },

  /**
   * NUEVO: Obtener todas las evaluaciones
   * Endpoint: GET /v1/evaluations
   */
  async getAllEvaluations(): Promise<Evaluation[]> {
    try {
      const response = await api.get('/v1/evaluations');
      return response.data.data;
    } catch (error) {
      console.error('Error getting all evaluations:', error);
      throw error;
    }
  },

  /**
   * NUEVO: Completar evaluación
   * Endpoint: POST /v1/evaluations/:id/complete
   */
  async completeEvaluation(
    evaluationId: number,
    data: {
      score?: number;
      recommendations?: string;
      observations?: string;
    }
  ): Promise<Evaluation> {
    try {
      const response = await api.post(`/v1/evaluations/${evaluationId}/complete`, data);
      return response.data.data;
    } catch (error) {
      console.error('Error completing evaluation:', error);
      throw error;
    }
  },

  /**
   * NUEVO: Cancelar evaluación
   * Endpoint: POST /v1/evaluations/:id/cancel
   */
  async cancelEvaluation(evaluationId: number, reason?: string): Promise<Evaluation> {
    try {
      const response = await api.post(`/v1/evaluations/${evaluationId}/cancel`, {
        reason
      });
      return response.data.data;
    } catch (error) {
      console.error('Error canceling evaluation:', error);
      throw error;
    }
  },

  /**
   * NUEVO: Reprogramar evaluación
   * Endpoint: POST /v1/evaluations/:id/reschedule
   */
  async rescheduleEvaluation(evaluationId: number, evaluationDate: string): Promise<Evaluation> {
    try {
      const response = await api.post(`/v1/evaluations/${evaluationId}/reschedule`, {
        evaluationDate
      });
      return response.data.data;
    } catch (error) {
      console.error('Error rescheduling evaluation:', error);
      throw error;
    }
  },
};

// Constantes para los tipos y estados
export const EVALUATION_TYPES = {
  LANGUAGE_EXAM: 'Examen de Lenguaje',
  MATHEMATICS_EXAM: 'Examen de Matemáticas',
  ENGLISH_EXAM: 'Examen de Inglés',
  CYCLE_DIRECTOR_REPORT: 'Informe Director de Ciclo',
  CYCLE_DIRECTOR_INTERVIEW: 'Entrevista Director/a de Ciclo',
  PSYCHOLOGICAL_INTERVIEW: 'Entrevista Psicológica'
} as const;

export const EVALUATION_STATUSES = {
  PENDING: 'Pendiente',
  IN_PROGRESS: 'En Progreso',
  COMPLETED: 'Completada',
  REVIEWED: 'Revisada',
  APPROVED: 'Aprobada'
} as const;

export const USER_ROLES = {
  TEACHER_LANGUAGE: 'Profesor de Lenguaje',
  TEACHER_MATHEMATICS: 'Profesor de Matemáticas',
  TEACHER_ENGLISH: 'Profesor de Inglés',
  CYCLE_DIRECTOR: 'Director/a de Ciclo',
  PSYCHOLOGIST: 'Psicólogo/a'
} as const;

// Mapeo de tipos de evaluación a roles requeridos
export const EVALUATION_TYPE_TO_ROLE = {
  LANGUAGE_EXAM: 'TEACHER_LANGUAGE',
  MATHEMATICS_EXAM: 'TEACHER_MATHEMATICS',
  ENGLISH_EXAM: 'TEACHER_ENGLISH',
  CYCLE_DIRECTOR_REPORT: 'CYCLE_DIRECTOR',
  CYCLE_DIRECTOR_INTERVIEW: 'CYCLE_DIRECTOR',
  PSYCHOLOGICAL_INTERVIEW: 'PSYCHOLOGIST'
} as const;
