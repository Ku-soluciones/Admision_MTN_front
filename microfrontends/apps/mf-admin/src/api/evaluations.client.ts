/**
 * Evaluations API Client - Typed SDK
 * Generated for MTN Admission System
 */

import httpClient from '../../services/http';
import { evaluationsToPaginated, unwrapBffData } from './bffResponse';
import type {
  Evaluation,
  CreateEvaluationRequest,
  UpdateEvaluationRequest,
  EvaluationSearchParams,
  EvaluationStatistics,
  EvaluatorAssignment,
  PaginatedResponse
} from './evaluations.types';

export class EvaluationsClient {
  private readonly basePath = '/v1/evaluations';

  /**
   * Get all evaluations with optional filtering and pagination
   */
  async getEvaluations(params?: EvaluationSearchParams): Promise<PaginatedResponse<Evaluation>> {
    const body = (await httpClient.get(this.basePath, { params })) as Record<string, unknown>;
    if (Array.isArray(body.content) || Array.isArray(body.data)) {
      return evaluationsToPaginated<Evaluation>(body);
    }
    return body as PaginatedResponse<Evaluation>;
  }

  /**
   * Get evaluation by ID
   */
  async getEvaluationById(id: number): Promise<Evaluation> {
    const body = await httpClient.get(`${this.basePath}/${id}`);
    return unwrapBffData<Evaluation>(body);
  }

  /**
   * Create new evaluation
   */
  async createEvaluation(evaluationData: CreateEvaluationRequest): Promise<Evaluation> {
    const body = await httpClient.post(this.basePath, evaluationData);
    return unwrapBffData<Evaluation>(body);
  }

  /**
   * Update evaluation with scores and comments
   */
  async updateEvaluation(id: number, evaluationData: UpdateEvaluationRequest): Promise<Evaluation> {
    const body = await httpClient.put(`${this.basePath}/${id}`, evaluationData);
    return unwrapBffData<Evaluation>(body);
  }

  /**
   * Delete evaluation
   */
  async deleteEvaluation(id: number): Promise<void> {
    await httpClient.delete<{ success: boolean }>(`${this.basePath}/${id}`);
  }

  /**
   * Complete evaluation with final score
   */
  async completeEvaluation(
    id: number, 
    data: { score: number; maxScore: number; comments?: string; recommendations?: string }
  ): Promise<Evaluation> {
    const body = await httpClient.post(`${this.basePath}/${id}/complete`, data);
    return unwrapBffData<Evaluation>(body);
  }

  /**
   * Get evaluations by application
   */
  async getEvaluationsByApplication(applicationId: number): Promise<Evaluation[]> {
    const body = await httpClient.get(`${this.basePath}/application/${applicationId}`);
    return unwrapBffData<Evaluation[]>(body);
  }

  /**
   * Get evaluations assigned to evaluator
   */
  async getEvaluationsByEvaluator(
    evaluatorId: number, 
    params?: Omit<EvaluationSearchParams, 'evaluatorId'>
  ): Promise<Evaluation[]> {
    const body = await httpClient.get(`${this.basePath}/evaluator/${evaluatorId}`, { params });
    return unwrapBffData<Evaluation[]>(body);
  }

  /**
   * Get evaluations by type (ACADEMIC, PSYCHOLOGICAL, etc.)
   */
  async getEvaluationsByType(
    type: Evaluation['type'],
    params?: Omit<EvaluationSearchParams, 'type'>
  ): Promise<Evaluation[]> {
    const body = await httpClient.get(`${this.basePath}/type/${type}`, { params });
    return unwrapBffData<Evaluation[]>(body);
  }

  /**
   * Get evaluations by subject and educational level
   */
  async getEvaluationsBySubject(
    subject: Evaluation['subject'],
    educationalLevel?: Evaluation['educationalLevel']
  ): Promise<Evaluation[]> {
    const body = await httpClient.get(`${this.basePath}/subject/${subject}`, { params: { educationalLevel } });
    return unwrapBffData<Evaluation[]>(body);
  }

  /**
   * Get pending evaluations for evaluator
   */
  async getPendingEvaluations(evaluatorId: number): Promise<Evaluation[]> {
    const body = await httpClient.get(`${this.basePath}/evaluator/${evaluatorId}/pending`);
    return unwrapBffData<Evaluation[]>(body);
  }

  /**
   * Get completed evaluations for evaluator
   */
  async getCompletedEvaluations(evaluatorId: number): Promise<Evaluation[]> {
    const body = await httpClient.get(`${this.basePath}/evaluator/${evaluatorId}/completed`);
    return unwrapBffData<Evaluation[]>(body);
  }

  /**
   * Get evaluation statistics
   */
  async getEvaluationStatistics(): Promise<EvaluationStatistics> {
    const body = await httpClient.get(`${this.basePath}/statistics`);
    return unwrapBffData<EvaluationStatistics>(body);
  }

  /**
   * Get evaluator workload and assignments
   */
  async getEvaluatorAssignments(): Promise<EvaluatorAssignment[]> {
    const body = await httpClient.get(`${this.basePath}/assignments`);
    return unwrapBffData<EvaluatorAssignment[]>(body);
  }

  /**
   * Assign evaluation to evaluator
   */
  async assignEvaluator(evaluationId: number, evaluatorId: number): Promise<Evaluation> {
    const body = await httpClient.post(`${this.basePath}/${evaluationId}/assign`, { evaluatorId });
    return unwrapBffData<Evaluation>(body);
  }

  /**
   * Reschedule evaluation
   */
  async rescheduleEvaluation(id: number, newDate: string): Promise<Evaluation> {
    const body = await httpClient.post(`${this.basePath}/${id}/reschedule`, { scheduledDate: newDate });
    return unwrapBffData<Evaluation>(body);
  }

  /**
   * Cancel evaluation
   */
  async cancelEvaluation(id: number, reason?: string): Promise<Evaluation> {
    const body = await httpClient.post(`${this.basePath}/${id}/cancel`, { reason });
    return unwrapBffData<Evaluation>(body);
  }

  /**
   * Export evaluations to CSV
   */
  async exportEvaluations(params?: EvaluationSearchParams): Promise<Blob> {
    const response = await httpClient.get(
      `${this.basePath}/export`,
      { 
        params,
        headers: { 'Accept': 'text/csv' },
        responseType: 'blob'
      }
    );
    return response as unknown as Blob;
  }

  /**
   * Bulk assign evaluations
   */
  async bulkAssignEvaluations(
    evaluationIds: number[], 
    evaluatorId: number
  ): Promise<Evaluation[]> {
    const body = await httpClient.post(`${this.basePath}/bulk/assign`, { evaluationIds, evaluatorId });
    return unwrapBffData<Evaluation[]>(body);
  }
}

// Export singleton instance
export const evaluationsClient = new EvaluationsClient();

// Export individual functions for convenience
export const {
  getEvaluations,
  getEvaluationById,
  createEvaluation,
  updateEvaluation,
  deleteEvaluation,
  completeEvaluation,
  getEvaluationsByApplication,
  getEvaluationsByEvaluator,
  getEvaluationsByType,
  getEvaluationsBySubject,
  getPendingEvaluations,
  getCompletedEvaluations,
  getEvaluationStatistics,
  getEvaluatorAssignments,
  assignEvaluator,
  rescheduleEvaluation,
  cancelEvaluation,
  exportEvaluations,
  bulkAssignEvaluations
} = evaluationsClient;