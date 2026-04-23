/**
 * Application Workflow Service - Gateway Integration
 * Handles complete application lifecycle through API Gateway
 */

import httpClient from './http';
import { Application, Student, Parent, Guardian, Supporter } from '../src/api/applications.types';

export interface ApplicationDraft {
  id?: number;
  studentData: Partial<Student>;
  fatherData?: Partial<Parent>;
  motherData?: Partial<Parent>;
  guardianData?: Partial<Guardian>;
  supporterData?: Partial<Supporter>;
  status: 'DRAFT';
  lastModified: string;
  completionPercentage: number;
  requiredDocuments: string[];
  uploadedDocuments: string[];
}

export interface ApplicationSubmission {
  applicationId: number;
  submissionDate: string;
  confirmationCode: string;
  requiredDocuments: DocumentRequirement[];
  nextSteps: string[];
}

export interface DocumentRequirement {
  type: 'BIRTH_CERTIFICATE' | 'ACADEMIC_RECORD' | 'PHOTO' | 'MEDICAL_CERTIFICATE' | 'PSYCHOLOGICAL_REPORT' | 'OTHER';
  name: string;
  description: string;
  required: boolean;
  uploaded: boolean;
  externalId?: string;
  uploadedAt?: string;
  validationStatus?: 'PENDING' | 'VALID' | 'INVALID';
  validationMessage?: string;
}

export interface ApplicationHistory {
  applicationId: number;
  transitions: ApplicationTransition[];
  currentStatus: Application['status'];
  timeline: TimelineEvent[];
}

export interface ApplicationTransition {
  id: string;
  fromStatus: Application['status'] | null;
  toStatus: Application['status'];
  timestamp: string;
  performedBy: {
    id: number;
    name: string;
    role: string;
  };
  reason?: string;
  notes?: string;
  automaticTransition: boolean;
}

export interface TimelineEvent {
  id: string;
  type: 'STATUS_CHANGE' | 'DOCUMENT_UPLOAD' | 'EVALUATION_ASSIGNED' | 'INTERVIEW_SCHEDULED' | 'NOTIFICATION_SENT' | 'NOTE_ADDED';
  title: string;
  description: string;
  timestamp: string;
  performedBy?: {
    name: string;
    role: string;
  };
  metadata?: Record<string, any>;
}

export interface ApplicationDocumentMetadata {
  applicationId: number;
  documentType: DocumentRequirement['type'];
  externalId: string;
  fileName: string;
  originalName: string;
  fileSize: number;
  mimeType: string;
  uploadedBy: number;
  notes?: string;
}

class ApplicationWorkflowService {
  private readonly basePath = '/v1/applications';

  /**
   * Create application draft
   * Allows families to save progress without submitting
   */
  async createDraft(studentData: Partial<Student>): Promise<ApplicationDraft> {
    const response = await httpClient.post<{ data: ApplicationDraft }>(
      this.basePath,
      {
        studentData,
        status: 'DRAFT'
      }
    );
    return response.data;
  }

  /**
   * Update application draft
   */
  async updateDraft(id: number, data: Partial<ApplicationDraft>): Promise<ApplicationDraft> {
    const response = await httpClient.put<{ data: ApplicationDraft }>(
      `${this.basePath}/${id}`,
      { ...data, status: 'DRAFT' }
    );
    return response.data;
  }

  /**
   * Submit application (draft → pending)
   * Validates completeness and triggers workflow
   */
  async submitApplication(id: number, finalData?: {
    parentalConsent: boolean;
    termsAccepted: boolean;
    privacyPolicyAccepted: boolean;
    submissionNotes?: string;
  }): Promise<ApplicationSubmission> {
    const response = await httpClient.post<{ data: ApplicationSubmission }>(
      `${this.basePath}/${id}/submit`,
      finalData
    );
    return response.data;
  }

  /**
   * Get application status with enriched data
   * Includes current status, next steps, and progress indicators
   */
  async getApplicationStatus(id: number): Promise<Application & {
    nextSteps: string[];
    estimatedTimeToComplete?: string;
    currentStageProgress: {
      stage: string;
      percentage: number;
      description: string;
    };
    assignedEvaluators: Array<{
      id: number;
      name: string;
      role: string;
      subject?: string;
      status: 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED';
    }>;
  }> {
    const response = await httpClient.get<{ 
      data: Application & {
        nextSteps: string[];
        estimatedTimeToComplete?: string;
        currentStageProgress: {
          stage: string;
          percentage: number;
          description: string;
        };
        assignedEvaluators: Array<{
          id: number;
          name: string;
          role: string;
          subject?: string;
          status: 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED';
        }>;
      }
    }>(`${this.basePath}/${id}`);
    return response.data;
  }

  /**
   * Get application history and transitions
   * Complete audit trail of status changes
   */
  async getApplicationHistory(id: number): Promise<ApplicationHistory> {
    const response = await httpClient.get<{ data: ApplicationHistory }>(
      `${this.basePath}/${id}/transitions`
    );
    return response.data;
  }

  /**
   * Get application timeline
   * User-friendly view of all application events
   */
  async getApplicationTimeline(id: number): Promise<TimelineEvent[]> {
    const response = await httpClient.get<{ data: TimelineEvent[] }>(
      `${this.basePath}/${id}/timeline`
    );
    return response.data;
  }

  /**
   * Add document metadata after upload to monolith
   * Links external document ID to application
   */
  async addDocumentMetadata(
    applicationId: number, 
    documentData: ApplicationDocumentMetadata
  ): Promise<DocumentRequirement> {
    const response = await httpClient.post<{ data: DocumentRequirement }>(
      `${this.basePath}/${applicationId}/documents`,
      documentData
    );
    return response.data;
  }

  /**
   * Get document requirements and status
   */
  async getDocumentRequirements(applicationId: number): Promise<DocumentRequirement[]> {
    const response = await httpClient.get<{ data: DocumentRequirement[] }>(
      `${this.basePath}/${applicationId}/documents`
    );
    return response.data;
  }

  /**
   * Remove document from application
   */
  async removeDocument(applicationId: number, documentId: string): Promise<void> {
    await httpClient.delete(
      `${this.basePath}/${applicationId}/documents/${documentId}`
    );
  }

  /**
   * Request document validation
   */
  async validateDocument(
    applicationId: number, 
    documentId: string
  ): Promise<{ validationStatus: string; message?: string }> {
    const response = await httpClient.post<{ 
      data: { validationStatus: string; message?: string }
    }>(
      `${this.basePath}/${applicationId}/documents/${documentId}/validate`
    );
    return response.data;
  }

  /**
   * Get application dashboard summary for families
   */
  async getFamilyDashboard(userId: number): Promise<{
    applications: Array<{
      id: number;
      studentName: string;
      gradeApplying: string;
      status: Application['status'];
      statusDescription: string;
      nextAction?: string;
      nextActionDueDate?: string;
      progressPercentage: number;
      lastUpdate: string;
    }>;
    notifications: Array<{
      id: string;
      type: 'INFO' | 'WARNING' | 'ACTION_REQUIRED';
      title: string;
      message: string;
      applicationId?: number;
      actionRequired: boolean;
      dueDate?: string;
      createdAt: string;
    }>;
    upcomingEvents: Array<{
      id: string;
      type: 'INTERVIEW' | 'EXAM' | 'DOCUMENT_DEADLINE' | 'DECISION_ANNOUNCEMENT';
      title: string;
      date: string;
      location?: string;
      applicationId: number;
      description: string;
    }>;
  }> {
    const response = await httpClient.get<{ 
      data: {
        applications: Array<{
          id: number;
          studentName: string;
          gradeApplying: string;
          status: Application['status'];
          statusDescription: string;
          nextAction?: string;
          nextActionDueDate?: string;
          progressPercentage: number;
          lastUpdate: string;
        }>;
        notifications: Array<{
          id: string;
          type: 'INFO' | 'WARNING' | 'ACTION_REQUIRED';
          title: string;
          message: string;
          applicationId?: number;
          actionRequired: boolean;
          dueDate?: string;
          createdAt: string;
        }>;
        upcomingEvents: Array<{
          id: string;
          type: 'INTERVIEW' | 'EXAM' | 'DOCUMENT_DEADLINE' | 'DECISION_ANNOUNCEMENT';
          title: string;
          date: string;
          location?: string;
          applicationId: number;
          description: string;
        }>;
      }
    }>(`/v1/users/${userId}/dashboard`);
    return response.data;
  }

  /**
   * Withdraw application (if allowed by status)
   */
  async withdrawApplication(
    applicationId: number, 
    reason: string
  ): Promise<Application> {
    const response = await httpClient.post<{ data: Application }>(
      `${this.basePath}/${applicationId}/withdraw`,
      { reason }
    );
    return response.data;
  }

  /**
   * Request application status explanation
   * Get detailed explanation of current status and next steps
   */
  async getStatusExplanation(applicationId: number): Promise<{
    currentStatus: {
      name: string;
      description: string;
      expectedDuration: string;
      possibleNextStates: string[];
    };
    nextSteps: Array<{
      step: string;
      description: string;
      estimatedDate?: string;
      responsible: 'FAMILY' | 'SCHOOL' | 'SYSTEM';
    }>;
    faqs: Array<{
      question: string;
      answer: string;
    }>;
  }> {
    const response = await httpClient.get<{ 
      data: {
        currentStatus: {
          name: string;
          description: string;
          expectedDuration: string;
          possibleNextStates: string[];
        };
        nextSteps: Array<{
          step: string;
          description: string;
          estimatedDate?: string;
          responsible: 'FAMILY' | 'SCHOOL' | 'SYSTEM';
        }>;
        faqs: Array<{
          question: string;
          answer: string;
        }>;
      }
    }>(
      `${this.basePath}/${applicationId}/status-explanation`
    );
    return response.data;
  }
}

// Export singleton instance
export const applicationWorkflowService = new ApplicationWorkflowService();
export default applicationWorkflowService;