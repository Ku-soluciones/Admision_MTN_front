/**
 * Applications API Client - Typed SDK
 * Generated for MTN Admission System
 */

import httpClient from '../../services/http';
import { extractBffList, unwrapBffData } from './bffResponse';
import type {
  Application,
  CreateApplicationRequest,
  UpdateApplicationRequest,
  ApplicationSearchParams,
  ApplicationStatistics,
  PaginatedResponse
} from './applications.types';

export class ApplicationsClient {
  private readonly basePath = '/v1/applications';

  /**
   * Get all applications with optional filtering and pagination
   */
  async getApplications(params?: ApplicationSearchParams): Promise<PaginatedResponse<Application>> {
    const body = await httpClient.get(this.basePath, { params });
    return body as PaginatedResponse<Application>;
  }

  /**
   * Get public applications (for admin dashboard)
   */
  async getPublicApplications(params?: ApplicationSearchParams): Promise<Application[]> {
    const body = await httpClient.get(`${this.basePath}/public/all`, { params });
    return unwrapBffData<Application[]>(body);
  }

  /**
   * Get application by ID with full details
   */
  async getApplicationById(id: number): Promise<Application> {
    const body = await httpClient.get(`${this.basePath}/${id}`);
    return unwrapBffData<Application>(body);
  }

  /**
   * Create new application
   */
  async createApplication(applicationData: CreateApplicationRequest): Promise<Application> {
    const body = await httpClient.post(this.basePath, applicationData);
    return unwrapBffData<Application>(body);
  }

  /**
   * Update application status and details
   */
  async updateApplication(id: number, applicationData: UpdateApplicationRequest): Promise<Application> {
    const body = await httpClient.put(`${this.basePath}/${id}`, applicationData);
    return unwrapBffData<Application>(body);
  }

  /**
   * Archive application (admin only)
   */
  async archiveApplication(id: number): Promise<Application> {
    const body = await httpClient.put(`${this.basePath}/${id}/archive`);
    return unwrapBffData<Application>(body);
  }

  /**
   * Delete application (hard delete - admin only)
   */
  async deleteApplication(id: number): Promise<void> {
    await httpClient.delete<{ success: boolean }>(`${this.basePath}/${id}`);
  }

  /**
   * Get applications by status
   */
  async getApplicationsByStatus(
    status: Application['status'], 
    params?: Omit<ApplicationSearchParams, 'status'>
  ): Promise<Application[]> {
    const body = await httpClient.get(`${this.basePath}/status/${status}`, { params });
    return extractBffList<Application>(body);
  }

  /**
   * Get applications by user (for families)
   */
  async getUserApplications(userId: number): Promise<Application[]> {
    const body = await httpClient.get(`${this.basePath}/user/${userId}`);
    return unwrapBffData<Application[]>(body);
  }

  /**
   * Get application statistics (admin only)
   */
  async getApplicationStatistics(): Promise<ApplicationStatistics> {
    const body = await httpClient.get(`${this.basePath}/statistics`);
    return unwrapBffData<ApplicationStatistics>(body);
  }

  /**
   * Search applications by student name or RUT
   */
  async searchApplications(
    query: string, 
    params?: Omit<ApplicationSearchParams, 'studentName'>
  ): Promise<Application[]> {
    const body = await httpClient.get(`${this.basePath}/search`, { params: { query, ...params } });
    return unwrapBffData<Application[]>(body);
  }

  /**
   * Get applications requiring evaluation
   */
  async getApplicationsForEvaluation(evaluatorId: number): Promise<Application[]> {
    const body = await httpClient.get(`${this.basePath}/for-evaluation/${evaluatorId}`);
    return unwrapBffData<Application[]>(body);
  }

  /**
   * Get applications with special categories
   */
  async getSpecialCategoryApplications(category: 'employee' | 'alumni' | 'inclusion'): Promise<Application[]> {
    const body = await httpClient.get(`${this.basePath}/special-category/${category}`);
    return unwrapBffData<Application[]>(body);
  }

  /**
   * Export applications to CSV
   */
  async exportApplications(params?: ApplicationSearchParams): Promise<Blob> {
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
   * Bulk update application status
   */
  async bulkUpdateStatus(
    applicationIds: number[], 
    status: Application['status']
  ): Promise<Application[]> {
    const body = await httpClient.post(`${this.basePath}/bulk/update-status`, { applicationIds, status });
    return unwrapBffData<Application[]>(body);
  }

  /**
   * Get applications requiring documents
   */
  async getApplicationsRequiringDocuments(): Promise<Application[]> {
    const body = await httpClient.get(`${this.basePath}/requiring-documents`);
    return unwrapBffData<Application[]>(body);
  }

  /**
   * Get recent applications (last 7 days)
   */
  async getRecentApplications(days: number = 7): Promise<Application[]> {
    const body = await httpClient.get(`${this.basePath}/recent`, { params: { days } });
    return unwrapBffData<Application[]>(body);
  }
}

// Export singleton instance
export const applicationsClient = new ApplicationsClient();

// Export individual functions for convenience
export const {
  getApplications,
  getPublicApplications,
  getApplicationById,
  createApplication,
  updateApplication,
  archiveApplication,
  deleteApplication,
  getApplicationsByStatus,
  getUserApplications,
  getApplicationStatistics,
  searchApplications,
  getApplicationsForEvaluation,
  getSpecialCategoryApplications,
  exportApplications,
  bulkUpdateStatus,
  getApplicationsRequiringDocuments,
  getRecentApplications
} = applicationsClient;