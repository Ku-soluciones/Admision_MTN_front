/**
 * Applications API Client - Typed SDK
 * Generated for MTN Admission System
 */

import httpClient from '../../services/http';
import type {
  Application,
  CreateApplicationRequest,
  UpdateApplicationRequest,
  ApplicationSearchParams,
  ApplicationStatistics,
  PaginatedResponse
} from './applications.types';

export class ApplicationsClient {
  private readonly basePath = '/api/applications';

  /**
   * Get all applications with optional filtering and pagination
   */
  async getApplications(params?: ApplicationSearchParams): Promise<PaginatedResponse<Application>> {
    const response = await httpClient.get(
      this.basePath,
      { params }
    );
    return response.data as PaginatedResponse<Application>;
  }

  /**
   * Get public applications (for admin dashboard)
   */
  async getPublicApplications(params?: ApplicationSearchParams): Promise<Application[]> {
    const response = await httpClient.get<{ success: boolean; data: Application[] }>(
      `${this.basePath}/public/all`,
      { params }
    );
    return (response.data as any).data;
  }

  /**
   * Get application by ID with full details
   */
  async getApplicationById(id: number): Promise<Application> {
    const response = await httpClient.get(
      `${this.basePath}/${id}`
    );
    return response.data as Application;
  }

  /**
   * Create new application
   */
  async createApplication(applicationData: CreateApplicationRequest): Promise<Application> {
    const response = await httpClient.post<{ success: boolean; data: Application }>(
      this.basePath,
      applicationData
    );
    return (response.data as any).data;
  }

  /**
   * Update application status and details
   */
  async updateApplication(id: number, applicationData: UpdateApplicationRequest): Promise<Application> {
    const response = await httpClient.put<{ success: boolean; data: Application }>(
      `${this.basePath}/${id}`,
      applicationData
    );
    return (response.data as any).data;
  }

  /**
   * Archive application (admin only)
   */
  async archiveApplication(id: number): Promise<Application> {
    const response = await httpClient.put<{ success: boolean; data: Application }>(
      `${this.basePath}/${id}/archive`
    );
    return (response.data as any).data;
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
    const response = await httpClient.get(
      `${this.basePath}/status/${status}`,
      { params }
    );
    return (response.data?.content || response.data?.data || []) as Application[];
  }

  /**
   * Get applications by user (for families)
   */
  async getUserApplications(userId: number): Promise<Application[]> {
    const response = await httpClient.get<{ success: boolean; data: Application[] }>(
      `${this.basePath}/user/${userId}`
    );
    return (response.data as any).data;
  }

  /**
   * Get application statistics (admin only)
   */
  async getApplicationStatistics(): Promise<ApplicationStatistics> {
    const response = await httpClient.get<{ success: boolean; data: ApplicationStatistics }>(
      `${this.basePath}/statistics`
    );
    return (response.data as any).data;
  }

  /**
   * Search applications by student name or RUT
   */
  async searchApplications(
    query: string, 
    params?: Omit<ApplicationSearchParams, 'studentName'>
  ): Promise<Application[]> {
    const response = await httpClient.get<{ success: boolean; data: Application[] }>(
      `${this.basePath}/search`,
      { params: { query, ...params } }
    );
    return (response.data as any).data;
  }

  /**
   * Get applications requiring evaluation
   */
  async getApplicationsForEvaluation(evaluatorId: number): Promise<Application[]> {
    const response = await httpClient.get<{ success: boolean; data: Application[] }>(
      `${this.basePath}/for-evaluation/${evaluatorId}`
    );
    return (response.data as any).data;
  }

  /**
   * Get applications with special categories
   */
  async getSpecialCategoryApplications(category: 'employee' | 'alumni' | 'inclusion'): Promise<Application[]> {
    const response = await httpClient.get<{ success: boolean; data: Application[] }>(
      `${this.basePath}/special-category/${category}`
    );
    return (response.data as any).data;
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
    const response = await httpClient.post<{ success: boolean; data: Application[] }>(
      `${this.basePath}/bulk/update-status`,
      { applicationIds, status }
    );
    return (response.data as any).data;
  }

  /**
   * Get applications requiring documents
   */
  async getApplicationsRequiringDocuments(): Promise<Application[]> {
    const response = await httpClient.get<{ success: boolean; data: Application[] }>(
      `${this.basePath}/requiring-documents`
    );
    return (response.data as any).data;
  }

  /**
   * Get recent applications (last 7 days)
   */
  async getRecentApplications(days: number = 7): Promise<Application[]> {
    const response = await httpClient.get<{ success: boolean; data: Application[] }>(
      `${this.basePath}/recent`,
      { params: { days } }
    );
    return (response.data as any).data;
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