/**
 * Notification Template Service - Admin Gateway Integration
 * Handles email/SMS template management through API Gateway
 */

import httpClient from './http';
import { NotificationTemplate, TemplateVariable } from '../src/api/notifications.types';

export interface EmailTemplate {
  id: string;
  name: string;
  description: string;
  category: 'VERIFICATION' | 'APPLICATION_STATUS' | 'INTERVIEW' | 'DOCUMENT' | 'ADMISSION_RESULT' | 'REMINDER' | 'SYSTEM_ALERT' | 'CUSTOM';
  type: 'EMAIL' | 'SMS' | 'PUSH' | 'SYSTEM';
  subject: string;
  htmlContent: string;
  textContent: string;
  variables: TemplateVariable[];
  isActive: boolean;
  isSystem: boolean;
  version: string;
  language: 'es' | 'en' | 'both';
  schoolBranding: {
    includeLogo: boolean;
    useSchoolColors: boolean;
    footerTemplate: string;
    headerTemplate?: string;
  };
  scheduling: {
    canSchedule: boolean;
    defaultSchedulingOffset?: number; // minutes
    maxSchedulingAdvance?: number; // hours
  };
  approval: {
    requiresApproval: boolean;
    approvedBy?: string;
    approvedAt?: string;
    approvalNotes?: string;
  };
  usage: {
    timesUsed: number;
    lastUsed?: string;
    successRate: number;
  };
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface TemplatePreview {
  templateId: string;
  previewHtml: string;
  previewText: string;
  previewSubject: string;
  sampleData: Record<string, any>;
  renderingWarnings?: Array<{
    type: 'MISSING_VARIABLE' | 'INVALID_SYNTAX' | 'DEPRECATED_VARIABLE' | 'FORMATTING_ISSUE';
    message: string;
    suggestion?: string;
  }>;
}

export interface BulkNotificationRequest {
  templateId: string;
  recipients: Array<{
    email: string;
    phone?: string;
    userId?: number;
    applicationId?: number;
    variables: Record<string, any>;
  }>;
  scheduledAt?: string;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  batchSize?: number;
  delayBetweenBatches?: number; // seconds
  trackingOptions: {
    trackOpens: boolean;
    trackClicks: boolean;
    trackDelivery: boolean;
  };
  notes?: string;
}

export interface NotificationCampaign {
  id: string;
  name: string;
  description: string;
  templateId: string;
  status: 'DRAFT' | 'SCHEDULED' | 'SENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  totalRecipients: number;
  successfulDeliveries: number;
  failedDeliveries: number;
  openRate?: number;
  clickRate?: number;
  scheduledAt?: string;
  startedAt?: string;
  completedAt?: string;
  estimatedDuration?: string;
  createdBy: string;
  createdAt: string;
}

class NotificationTemplateService {
  private readonly basePath = '/v1/notifications/admin/templates';
  private readonly campaignPath = '/v1/notifications/admin/campaigns';

  /**
   * Get all notification templates
   */
  async getTemplates(params?: {
    category?: EmailTemplate['category'];
    type?: EmailTemplate['type'];
    language?: 'es' | 'en';
    isActive?: boolean;
    search?: string;
    page?: number;
    size?: number;
  }): Promise<{
    templates: EmailTemplate[];
    totalElements: number;
    totalPages: number;
  }> {
    const response = await httpClient.get<{ 
      data: {
        templates: EmailTemplate[];
        totalElements: number;
        totalPages: number;
      }
    }>(
      this.basePath,
      { params }
    );
    return response.data;
  }

  /**
   * Get template by ID
   */
  async getTemplate(templateId: string): Promise<EmailTemplate> {
    const response = await httpClient.get<{ data: EmailTemplate }>(
      `${this.basePath}/${templateId}`
    );
    return response.data;
  }

  /**
   * Create new template
   */
  async createTemplate(templateData: Omit<EmailTemplate, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'usage'>): Promise<EmailTemplate> {
    const response = await httpClient.post<{ data: EmailTemplate }>(
      this.basePath,
      {
        ...templateData,
        createdAt: new Date().toISOString()
      }
    );
    return response.data;
  }

  /**
   * Update existing template
   */
  async updateTemplate(
    templateId: string, 
    templateData: Partial<Omit<EmailTemplate, 'id' | 'createdAt' | 'createdBy' | 'usage'>>
  ): Promise<EmailTemplate> {
    const response = await httpClient.put<{ data: EmailTemplate }>(
      `${this.basePath}/${templateId}`,
      {
        ...templateData,
        updatedAt: new Date().toISOString()
      }
    );
    return response.data;
  }

  /**
   * Delete template
   */
  async deleteTemplate(templateId: string): Promise<void> {
    await httpClient.delete(`${this.basePath}/${templateId}`);
  }

  /**
   * Clone existing template
   */
  async cloneTemplate(
    templateId: string, 
    newName: string,
    modifications?: Partial<Pick<EmailTemplate, 'subject' | 'htmlContent' | 'textContent' | 'variables'>>
  ): Promise<EmailTemplate> {
    const response = await httpClient.post<{ data: EmailTemplate }>(
      `${this.basePath}/${templateId}/clone`,
      {
        name: newName,
        modifications
      }
    );
    return response.data;
  }

  /**
   * Preview template with sample data
   */
  async previewTemplate(
    templateId: string,
    sampleVariables?: Record<string, any>
  ): Promise<TemplatePreview> {
    const response = await httpClient.post<{ data: TemplatePreview }>(
      `${this.basePath}/${templateId}/preview`,
      {
        sampleData: sampleVariables || this.getDefaultSampleData()
      }
    );
    return response.data;
  }

  /**
   * Test template by sending to specific email
   */
  async sendTestEmail(
    templateId: string,
    testData: {
      recipientEmail: string;
      sampleVariables?: Record<string, any>;
      notes?: string;
    }
  ): Promise<{
    testId: string;
    status: 'SENT' | 'FAILED';
    messageId?: string;
    errorMessage?: string;
  }> {
    const response = await httpClient.post<{ 
      data: {
        testId: string;
        status: 'SENT' | 'FAILED';
        messageId?: string;
        errorMessage?: string;
      }
    }>(
      `${this.basePath}/${templateId}/test`,
      {
        ...testData,
        sampleVariables: testData.sampleVariables || this.getDefaultSampleData(),
        sentAt: new Date().toISOString()
      }
    );
    return response.data;
  }

  /**
   * Validate template syntax and variables
   */
  async validateTemplate(templateData: {
    subject: string;
    htmlContent: string;
    textContent: string;
    variables: TemplateVariable[];
  }): Promise<{
    isValid: boolean;
    errors: Array<{
      type: 'SYNTAX_ERROR' | 'MISSING_VARIABLE' | 'INVALID_VARIABLE' | 'CIRCULAR_REFERENCE';
      field: 'subject' | 'htmlContent' | 'textContent' | 'variables';
      message: string;
      line?: number;
      column?: number;
    }>;
    warnings: Array<{
      type: 'DEPRECATED_SYNTAX' | 'PERFORMANCE_CONCERN' | 'ACCESSIBILITY_ISSUE';
      message: string;
      suggestion: string;
    }>;
    suggestions: string[];
  }> {
    const response = await httpClient.post<{ 
      data: {
        isValid: boolean;
        errors: Array<{
          type: 'SYNTAX_ERROR' | 'MISSING_VARIABLE' | 'INVALID_VARIABLE' | 'CIRCULAR_REFERENCE';
          field: 'subject' | 'htmlContent' | 'textContent' | 'variables';
          message: string;
          line?: number;
          column?: number;
        }>;
        warnings: Array<{
          type: 'DEPRECATED_SYNTAX' | 'PERFORMANCE_CONCERN' | 'ACCESSIBILITY_ISSUE';
          message: string;
          suggestion: string;
        }>;
        suggestions: string[];
      }
    }>(
      `${this.basePath}/validate`,
      templateData
    );
    return response.data;
  }

  /**
   * Create and send bulk notification campaign
   */
  async createCampaign(campaignData: {
    name: string;
    description?: string;
    bulkRequest: BulkNotificationRequest;
  }): Promise<NotificationCampaign> {
    const response = await httpClient.post<{ data: NotificationCampaign }>(
      this.campaignPath,
      {
        ...campaignData,
        createdAt: new Date().toISOString()
      }
    );
    return response.data;
  }

  /**
   * Get campaign status and metrics
   */
  async getCampaign(campaignId: string): Promise<NotificationCampaign> {
    const response = await httpClient.get<{ data: NotificationCampaign }>(
      `${this.campaignPath}/${campaignId}`
    );
    return response.data;
  }

  /**
   * Get all campaigns with filtering
   */
  async getCampaigns(params?: {
    status?: NotificationCampaign['status'];
    templateId?: string;
    dateFrom?: string;
    dateTo?: string;
    createdBy?: string;
    page?: number;
    size?: number;
  }): Promise<{
    campaigns: NotificationCampaign[];
    totalElements: number;
    totalPages: number;
  }> {
    const response = await httpClient.get<{ 
      data: {
        campaigns: NotificationCampaign[];
        totalElements: number;
        totalPages: number;
      }
    }>(
      this.campaignPath,
      { params }
    );
    return response.data;
  }

  /**
   * Cancel running campaign
   */
  async cancelCampaign(campaignId: string, reason?: string): Promise<NotificationCampaign> {
    const response = await httpClient.post<{ data: NotificationCampaign }>(
      `${this.campaignPath}/${campaignId}/cancel`,
      {
        reason,
        cancelledAt: new Date().toISOString()
      }
    );
    return response.data;
  }

  /**
   * Get template usage statistics
   */
  async getTemplateStats(templateId: string, dateRange?: {
    from: string;
    to: string;
  }): Promise<{
    usage: {
      totalSent: number;
      successRate: number;
      openRate: number;
      clickRate: number;
      unsubscribeRate: number;
    };
    timeline: Array<{
      date: string;
      sent: number;
      delivered: number;
      opened: number;
      clicked: number;
    }>;
    topRecipientDomains: Array<{
      domain: string;
      count: number;
      successRate: number;
    }>;
    errorAnalysis: Array<{
      errorType: string;
      count: number;
      percentage: number;
    }>;
  }> {
    const response = await httpClient.get<{ 
      data: {
        usage: {
          totalSent: number;
          successRate: number;
          openRate: number;
          clickRate: number;
          unsubscribeRate: number;
        };
        timeline: Array<{
          date: string;
          sent: number;
          delivered: number;
          opened: number;
          clicked: number;
        }>;
        topRecipientDomains: Array<{
          domain: string;
          count: number;
          successRate: number;
        }>;
        errorAnalysis: Array<{
          errorType: string;
          count: number;
          percentage: number;
        }>;
      }
    }>(
      `${this.basePath}/${templateId}/stats`,
      { params: dateRange }
    );
    return response.data;
  }

  /**
   * Import templates from file (JSON/CSV)
   */
  async importTemplates(
    file: File,
    options?: {
      overwriteExisting: boolean;
      validateOnly: boolean;
      defaultCategory?: EmailTemplate['category'];
    }
  ): Promise<{
    importId: string;
    imported: number;
    skipped: number;
    errors: Array<{
      row: number;
      field: string;
      message: string;
    }>;
    warnings: string[];
  }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('options', JSON.stringify(options));

    const response = await httpClient.post<{ 
      data: {
        importId: string;
        imported: number;
        skipped: number;
        errors: Array<{
          row: number;
          field: string;
          message: string;
        }>;
        warnings: string[];
      }
    }>(
      `${this.basePath}/import`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      }
    );
    return response.data;
  }

  /**
   * Export templates to file
   */
  async exportTemplates(
    templateIds?: string[],
    format: 'JSON' | 'CSV' | 'XLSX' = 'JSON'
  ): Promise<Blob> {
    const response = await httpClient.post(
      `${this.basePath}/export`,
      {
        templateIds,
        format,
        exportedAt: new Date().toISOString()
      },
      {
        headers: {
          'Accept': format === 'JSON' ? 'application/json' : 
                    format === 'CSV' ? 'text/csv' : 
                    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        },
        responseType: 'blob'
      }
    );
    return response as unknown as Blob;
  }

  /**
   * Get available template variables by category
   */
  async getAvailableVariables(category: EmailTemplate['category']): Promise<{
    systemVariables: TemplateVariable[];
    applicationVariables: TemplateVariable[];
    userVariables: TemplateVariable[];
    customVariables: TemplateVariable[];
  }> {
    const response = await httpClient.get<{ 
      data: {
        systemVariables: TemplateVariable[];
        applicationVariables: TemplateVariable[];
        userVariables: TemplateVariable[];
        customVariables: TemplateVariable[];
      }
    }>(
      `${this.basePath}/variables`,
      { params: { category } }
    );
    return response.data;
  }

  /**
   * Get default sample data for template preview
   */
  private getDefaultSampleData(): Record<string, any> {
    return {
      // User variables
      'user.firstName': 'María',
      'user.lastName': 'González',
      'user.email': 'maria.gonzalez@example.com',
      
      // Student variables
      'student.firstName': 'Joaquín',
      'student.lastName': 'González',
      'student.age': 6,
      'student.gradeApplying': '1° Básico',
      
      // System variables
      'system.schoolName': 'Colegio Monte Tabor y Nazaret',
      'system.currentDate': new Date().toLocaleDateString('es-CL'),
      'system.currentYear': new Date().getFullYear(),
      'system.contactEmail': 'admision@mtn.cl',
      'system.contactPhone': '+56-2-XXXX-XXXX',
      
      // Application variables
      'application.id': 'APP-2025-001234',
      'application.status': 'En Revisión',
      'application.submissionDate': '15 de Enero, 2025',
      'application.confirmationCode': 'MTN2025ABC123'
    };
  }
}

// Export singleton instance
export const notificationTemplateService = new NotificationTemplateService();
export default notificationTemplateService;