/**
 * Evaluation Workflow Service - Teachers/Psychologists Gateway Integration
 * Handles evaluation assignment, scoring, and completion through API Gateway
 */

import httpClient from './http';
import { Evaluation, EvaluationSearchParams } from '../src/api/evaluations.types';

export interface EvaluatorWorkload {
  evaluatorId: number;
  evaluatorName: string;
  role: 'TEACHER' | 'PSYCHOLOGIST' | 'CYCLE_DIRECTOR';
  subject?: string;
  educationalLevel?: string;
  assignedEvaluations: {
    pending: number;
    inProgress: number;
    completed: number;
    total: number;
  };
  availability: {
    status: 'AVAILABLE' | 'BUSY' | 'OVERLOADED' | 'UNAVAILABLE';
    maxCapacity: number;
    currentLoad: number;
    loadPercentage: number;
  };
  schedule?: {
    availableDays: string[];
    availableHours: { start: string; end: string };
    timezone: string;
  };
}

export interface EvaluationAssignment {
  evaluationId: number;
  applicationId: number;
  studentInfo: {
    firstName: string;
    lastName: string;
    age: number;
    gradeApplying: string;
    currentSchool?: string;
    specialNeeds: boolean;
    specialNeedsDescription?: string;
  };
  evaluationType: Evaluation['type'];
  subject?: string;
  educationalLevel?: string;
  assignedAt: string;
  dueDate?: string;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  instructions?: string;
  attachments?: Array<{
    id: string;
    name: string;
    type: string;
    downloadUrl: string;
  }>;
}

export interface EvaluationScoring {
  evaluationId: number;
  scores: Record<string, {
    value: number;
    maxValue: number;
    weight?: number;
    notes?: string;
  }>;
  overallScore: number;
  maxOverallScore: number;
  percentage: number;
  rubricScores?: Record<string, {
    criterion: string;
    score: number;
    maxScore: number;
    feedback: string;
  }>;
  recommendations: string;
  strengths: string[];
  areasForImprovement: string[];
  additionalNotes?: string;
}

export interface EvaluationTemplate {
  id: string;
  name: string;
  type: Evaluation['type'];
  subject?: string;
  educationalLevel?: string;
  description: string;
  scoringCriteria: Array<{
    id: string;
    name: string;
    description: string;
    maxPoints: number;
    weight: number;
    rubric?: Array<{
      level: string;
      points: number;
      description: string;
    }>;
  }>;
  instructions: string;
  estimatedDuration: number; // minutes
  isActive: boolean;
}

class EvaluationWorkflowService {
  private readonly basePath = '/v1/evaluations';

  /**
   * Get evaluations assigned to current evaluator
   * Supports filtering by status, type, and date ranges
   */
  async getAssignedEvaluations(
    params?: EvaluationSearchParams & {
      evaluatorId?: number; // If not provided, uses current user
      includeStudentInfo?: boolean;
    }
  ): Promise<EvaluationAssignment[]> {
    const response = await httpClient.get<{ data: EvaluationAssignment[] }>(
      this.basePath,
      { params: { ...params, status: params?.status || 'ASSIGNED' } }
    );
    return response.data;
  }

  /**
   * Start evaluation (ASSIGNED → IN_PROGRESS)
   * Records start time and creates evaluation session
   */
  async startEvaluation(
    evaluationId: number,
    data?: {
      startNotes?: string;
      estimatedDuration?: number;
      location?: string;
      sessionType?: 'REMOTE' | 'IN_PERSON' | 'HYBRID';
    }
  ): Promise<Evaluation> {
    const response = await httpClient.post<{ data: Evaluation }>(
      `${this.basePath}/${evaluationId}/start`,
      {
        startedAt: new Date().toISOString(),
        ...data
      }
    );
    return response.data;
  }

  /**
   * Submit evaluation scores
   * Supports partial scoring for multi-session evaluations
   */
  async submitScores(
    evaluationId: number,
    scoring: EvaluationScoring,
    options?: {
      isPartialSubmission?: boolean;
      saveAsDraft?: boolean;
      scheduleContinuation?: {
        date: string;
        notes: string;
      };
    }
  ): Promise<Evaluation> {
    const response = await httpClient.post<{ data: Evaluation }>(
      `${this.basePath}/${evaluationId}/scores`,
      {
        ...scoring,
        submissionType: options?.saveAsDraft ? 'DRAFT' : 
                       options?.isPartialSubmission ? 'PARTIAL' : 'FINAL',
        submittedAt: new Date().toISOString(),
        continuationSchedule: options?.scheduleContinuation
      }
    );
    return response.data;
  }

  /**
   * Complete evaluation (IN_PROGRESS → COMPLETED)
   * Finalizes scoring and triggers next workflow steps
   */
  async completeEvaluation(
    evaluationId: number,
    finalData: {
      finalScore: number;
      maxScore: number;
      finalRecommendations: string;
      evaluationSummary: string;
      nextStepRecommendations?: string[];
      flagForReview?: boolean;
      reviewReason?: string;
    }
  ): Promise<Evaluation & {
    nextSteps: string[];
    notificationsSent: string[];
  }> {
    const response = await httpClient.post<{ 
      data: Evaluation & {
        nextSteps: string[];
        notificationsSent: string[];
      }
    }>(
      `${this.basePath}/${evaluationId}/complete`,
      {
        ...finalData,
        completedAt: new Date().toISOString(),
        status: 'COMPLETED'
      }
    );
    return response.data;
  }

  /**
   * Get evaluation template for specific type/subject/level
   */
  async getEvaluationTemplate(
    type: Evaluation['type'],
    filters?: {
      subject?: string;
      educationalLevel?: string;
      version?: string;
    }
  ): Promise<EvaluationTemplate> {
    const response = await httpClient.get<{ data: EvaluationTemplate }>(
      `${this.basePath}/templates`,
      {
        params: {
          type,
          ...filters
        }
      }
    );
    return response.data;
  }

  /**
   * Get evaluator workload and availability
   */
  async getEvaluatorWorkload(evaluatorId?: number): Promise<EvaluatorWorkload> {
    const response = await httpClient.get<{ data: EvaluatorWorkload }>(
      `/v1/users/${evaluatorId || 'me'}/workload`
    );
    return response.data;
  }

  /**
   * Request evaluation reassignment (if overloaded or unavailable)
   */
  async requestReassignment(
    evaluationId: number,
    reason: 'OVERLOADED' | 'UNAVAILABLE' | 'CONFLICT_OF_INTEREST' | 'SPECIALIZATION_MISMATCH' | 'OTHER',
    notes?: string
  ): Promise<{
    reassignmentRequestId: string;
    estimatedReassignmentTime: string;
    alternativeEvaluators: Array<{
      id: number;
      name: string;
      availability: string;
      specialization: string;
    }>;
  }> {
    const response = await httpClient.post<{ 
      data: {
        reassignmentRequestId: string;
        estimatedReassignmentTime: string;
        alternativeEvaluators: Array<{
          id: number;
          name: string;
          availability: string;
          specialization: string;
        }>;
      }
    }>(
      `${this.basePath}/${evaluationId}/request-reassignment`,
      {
        reason,
        notes,
        requestedAt: new Date().toISOString()
      }
    );
    return response.data;
  }

  /**
   * Get evaluation history and previous scores for student
   * Helps evaluators understand student's progress
   */
  async getStudentEvaluationHistory(
    studentRut: string,
    options?: {
      includeOtherSchools?: boolean;
      yearRange?: { from: number; to: number };
      evaluationType?: Evaluation['type'];
    }
  ): Promise<Array<{
    evaluationId: number;
    date: string;
    type: Evaluation['type'];
    subject?: string;
    score: number;
    maxScore: number;
    percentage: number;
    evaluator: string;
    school: string;
    recommendations: string;
    keyFindings: string[];
  }>> {
    const response = await httpClient.get<{ 
      data: Array<{
        evaluationId: number;
        date: string;
        type: Evaluation['type'];
        subject?: string;
        score: number;
        maxScore: number;
        percentage: number;
        evaluator: string;
        school: string;
        recommendations: string;
        keyFindings: string[];
      }>
    }>(
      `/v1/students/rut/${studentRut}/evaluation-history`,
      { params: options }
    );
    return response.data;
  }

  /**
   * Save evaluation as draft (for multi-session evaluations)
   */
  async saveDraft(
    evaluationId: number,
    draftData: {
      partialScores?: Record<string, number>;
      notes?: string;
      observedBehaviors?: string[];
      concernsOrFlags?: string[];
      nextSessionPlan?: string;
    }
  ): Promise<{ draftId: string; lastSaved: string }> {
    const response = await httpClient.post<{ 
      data: { draftId: string; lastSaved: string }
    }>(
      `${this.basePath}/${evaluationId}/draft`,
      {
        ...draftData,
        savedAt: new Date().toISOString()
      }
    );
    return response.data;
  }

  /**
   * Load draft data for evaluation
   */
  async loadDraft(evaluationId: number): Promise<{
    draftId: string;
    partialScores?: Record<string, number>;
    notes?: string;
    observedBehaviors?: string[];
    concernsOrFlags?: string[];
    nextSessionPlan?: string;
    lastSaved: string;
  } | null> {
    try {
      const response = await httpClient.get<{ 
        data: {
          draftId: string;
          partialScores?: Record<string, number>;
          notes?: string;
          observedBehaviors?: string[];
          concernsOrFlags?: string[];
          nextSessionPlan?: string;
          lastSaved: string;
        }
      }>(`${this.basePath}/${evaluationId}/draft`);
      return response.data;
    } catch (error: any) {
      if (error.status === 404) {
        return null; // No draft exists
      }
      throw error;
    }
  }

  /**
   * Get evaluation guidelines and resources
   */
  async getEvaluationGuidelines(
    type: Evaluation['type'],
    subject?: string,
    educationalLevel?: string
  ): Promise<{
    guidelines: {
      title: string;
      content: string;
      version: string;
      lastUpdated: string;
    };
    resources: Array<{
      title: string;
      type: 'PDF' | 'VIDEO' | 'LINK' | 'DOCUMENT';
      url: string;
      description: string;
    }>;
    bestPractices: Array<{
      category: string;
      tips: string[];
    }>;
    commonChallenges: Array<{
      challenge: string;
      solutions: string[];
    }>;
  }> {
    const response = await httpClient.get<{ 
      data: {
        guidelines: {
          title: string;
          content: string;
          version: string;
          lastUpdated: string;
        };
        resources: Array<{
          title: string;
          type: 'PDF' | 'VIDEO' | 'LINK' | 'DOCUMENT';
          url: string;
          description: string;
        }>;
        bestPractices: Array<{
          category: string;
          tips: string[];
        }>;
        commonChallenges: Array<{
          challenge: string;
          solutions: string[];
        }>;
      }
    }>(
      `${this.basePath}/guidelines`,
      {
        params: {
          type,
          subject,
          educationalLevel
        }
      }
    );
    return response.data;
  }

  /**
   * Generate evaluation report (PDF)
   */
  async generateEvaluationReport(
    evaluationId: number,
    options?: {
      includeStudentPhoto?: boolean;
      includeRecommendations?: boolean;
      includeScoreBreakdown?: boolean;
      reportTemplate?: 'STANDARD' | 'DETAILED' | 'SUMMARY';
      language?: 'es' | 'en';
    }
  ): Promise<{ reportUrl: string; reportId: string; expiresAt: string }> {
    const response = await httpClient.post<{ 
      data: { reportUrl: string; reportId: string; expiresAt: string }
    }>(
      `${this.basePath}/${evaluationId}/report`,
      {
        options: {
          includeStudentPhoto: true,
          includeRecommendations: true,
          includeScoreBreakdown: true,
          reportTemplate: 'STANDARD',
          language: 'es',
          ...options
        },
        generatedAt: new Date().toISOString()
      }
    );
    return response.data;
  }
}

// Export singleton instance
export const evaluationWorkflowService = new EvaluationWorkflowService();
export default evaluationWorkflowService;