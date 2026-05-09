/**
 * Email Service - Direct Email Sending with Templates
 * Based on BFF EMAIL_ENDPOINTS.md contract
 * 
 * This service provides direct email sending using the composer pattern
 * where the frontend sends the template identifier and data,
 * and the backend renders the HTML and sends via Resend.
 * 
 * Endpoints:
 * - POST /api/notifications/email - Send single email with template
 * - POST /api/notifications/email/bulk - Send bulk emails
 * - POST /api/email/send-test - Send test email
 * - POST /api/email/send-verification - Send verification code
 * - GET /api/email/config-status - Get email system status
 * - POST /api/email/verify-code - Verify email code
 */

import api from './api';
import {
  EmailTemplate,
  EmailPayload,
  DirectEmailPayload,
  BulkEmailPayload,
  EmailResponse,
  EmailSystemStatus,
  EmailVerificationPayload,
  EmailVerificationResponse,
  NotificationFilters,
  PaginatedNotifications,
  Notification,
  DefaultSubjects
} from '../types/email';

export interface SendEmailOptions {
  /** If true, don't throw on error, return error response */
  silent?: boolean;
  /** Timeout in ms (default: 30000) */
  timeout?: number;
}

class EmailService {
  private baseUrl = '/v1/notifications';
  private emailBaseUrl = '/v1/email';

  /**
   * Send email with template (Composer Pattern)
   * POST /api/notifications/email
   * 
   * This is the primary method for sending institutional emails.
   * The backend will:
   * 1. Validate the template against EmailTemplate enum
   * 2. Resolve the renderer from EmailTemplateRegistry
   * 3. Render HTML with data variables
   * 4. Send via Resend and persist to notifications table
   * 
   * @example
   * await emailService.sendTemplatedEmail({
   *   template: EmailTemplate.APPLICATION_RECEIVED,
   *   to: 'apoderado@ejemplo.cl',
   *   data: {
   *     studentName: 'Juan Pérez',
   *     applicationId: 123
   *   }
   * });
   */
  async sendTemplatedEmail(
    payload: EmailPayload,
    options: SendEmailOptions = {}
  ): Promise<EmailResponse> {
    try {
      // Validate template
      if (!payload.template) {
        throw new Error('Template is required');
      }

      // Use default subject if not provided
      const finalPayload = {
        ...payload,
        subject: payload.subject || DefaultSubjects[payload.template as EmailTemplate]
      };

      const response = await api.post(
        `${this.baseUrl}/email`,
        finalPayload,
        { timeout: options.timeout || 30000 }
      );

      return response.data;
    } catch (error: any) {
      
      const errorResponse: EmailResponse = {
        success: false,
        message: error.response?.data?.message || 
                 error.response?.data?.error || 
                 error.message || 
                 'Error enviando email'
      };

      if (!options.silent) {
        throw new Error(errorResponse.message);
      }

      return errorResponse;
    }
  }

  /**
   * Send direct email (legacy mode without template)
   * POST /api/notifications/email
   * 
   * Use this for custom emails where you provide the full subject and message.
   * The backend will still wrap it in the institutional layout.
   * 
   * @deprecated Prefer sendTemplatedEmail for institutional consistency
   */
  async sendDirectEmail(
    payload: DirectEmailPayload,
    options: SendEmailOptions = {}
  ): Promise<EmailResponse> {
    try {
      const response = await api.post(
        `${this.baseUrl}/email`,
        payload,
        { timeout: options.timeout || 30000 }
      );

      return response.data;
    } catch (error: any) {
      
      const errorResponse: EmailResponse = {
        success: false,
        message: error.response?.data?.message || 
                 error.response?.data?.error || 
                 error.message || 
                 'Error enviando email'
      };

      if (!options.silent) {
        throw new Error(errorResponse.message);
      }

      return errorResponse;
    }
  }

  /**
   * Send bulk emails with templates
   * POST /api/notifications/email/bulk
   * 
   * @example
   * await emailService.sendBulkEmails({
   *   recipients: [
   *     { template: EmailTemplate.STATUS_UPDATE, to: 'user1@test.cl', data: { newStatus: 'APPROVED' } },
   *     { template: EmailTemplate.STATUS_UPDATE, to: 'user2@test.cl', data: { newStatus: 'REJECTED' } }
   *   ]
   * });
   */
  async sendBulkEmails(
    payload: BulkEmailPayload,
    options: SendEmailOptions = {}
  ): Promise<EmailResponse> {
    try {
      const response = await api.post(
        `${this.baseUrl}/email/bulk`,
        payload,
        { timeout: options.timeout || 60000 } // Bulk may take longer
      );

      return response.data;
    } catch (error: any) {
      
      const errorResponse: EmailResponse = {
        success: false,
        message: error.response?.data?.message || 
                 error.response?.data?.error || 
                 error.message || 
                 'Error enviando emails en lote'
      };

      if (!options.silent) {
        throw new Error(errorResponse.message);
      }

      return errorResponse;
    }
  }

  /**
   * Send test email
   * POST /api/email/send-test
   * 
   * Sends a test email to verify the system is working.
   */
  async sendTestEmail(to: string): Promise<EmailResponse> {
    try {
      const response = await api.post(`${this.emailBaseUrl}/send-test`, { to });
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Error enviando email de prueba'
      };
    }
  }

  /**
   * Send verification code email
   * POST /api/email/send-verification
   * 
   * Generates and sends a verification code to the user's email.
   * The code is stored in the backend and can be verified with verifyCode().
   */
  async sendVerificationCode(email: string): Promise<EmailResponse> {
    try {
      const response = await api.post(`${this.emailBaseUrl}/send-verification`, { email });
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Error enviando código de verificación'
      };
    }
  }

  /**
   * Verify email code
   * POST /api/email/verify-code
   * 
   * Validates a verification code previously sent to the user.
   */
  async verifyCode(payload: EmailVerificationPayload): Promise<EmailVerificationResponse> {
    try {
      const response = await api.post(`${this.emailBaseUrl}/verify-code`, payload);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        valid: false,
        message: error.response?.data?.message || 'Error verificando código'
      };
    }
  }

  /**
   * Check if email exists
   * GET /api/email/check-exists?email={email}
   */
  async checkEmailExists(email: string): Promise<{ exists: boolean; userId?: number }> {
    try {
      const response = await api.get(`${this.emailBaseUrl}/check-exists`, {
        params: { email }
      });
      return response.data;
    } catch (error: any) {
      return { exists: false };
    }
  }

  /**
   * Get email system configuration status
   * GET /api/email/config-status
   * 
   * Returns the current email provider configuration.
   */
  async getConfigStatus(): Promise<EmailSystemStatus> {
    try {
      const response = await api.get(`${this.emailBaseUrl}/config-status`);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        config: {
          provider: 'unknown',
          mockMode: true,
          resendConfigured: false,
          from: ''
        },
        message: error.response?.data?.message || 'Error obteniendo configuración'
      };
    }
  }

  /**
   * List sent notifications/emails
   * GET /api/notifications
   * 
   * Retrieves the history of sent emails with pagination.
   */
  async getNotifications(
    filters?: NotificationFilters,
    page: number = 0,
    size: number = 20
  ): Promise<PaginatedNotifications> {
    try {
      const response = await api.get(`${this.baseUrl}`, {
        params: {
          ...filters,
          page,
          size
        }
      });
      return response.data;
    } catch (error: any) {
      return {
        content: [],
        totalElements: 0,
        totalPages: 0,
        number: page,
        size
      };
    }
  }

  /**
   * Get single notification detail
   * GET /api/notifications/{id}
   */
  async getNotification(id: number): Promise<Notification | null> {
    try {
      const response = await api.get(`${this.baseUrl}/${id}`);
      return response.data;
    } catch (error: any) {
      return null;
    }
  }

  /**
   * Delete notification
   * DELETE /api/notifications/{id}
   */
  async deleteNotification(id: number): Promise<boolean> {
    try {
      await api.delete(`${this.baseUrl}/${id}`);
      return true;
    } catch (error: any) {
      return false;
    }
  }

  // ===== Convenience Methods for Common Use Cases =====

  /**
   * Send welcome email to new user
   */
  async sendWelcomeEmail(to: string, userName: string): Promise<EmailResponse> {
    return this.sendTemplatedEmail({
      template: EmailTemplate.WELCOME,
      to,
      data: { userName }
    });
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(to: string, resetToken: string): Promise<EmailResponse> {
    return this.sendTemplatedEmail({
      template: EmailTemplate.PASSWORD_RESET,
      to,
      data: { resetToken }
    });
  }

  /**
   * Send password changed confirmation
   */
  async sendPasswordChangedEmail(to: string, userName: string): Promise<EmailResponse> {
    return this.sendTemplatedEmail({
      template: EmailTemplate.PASSWORD_CHANGED,
      to,
      data: { userName }
    });
  }

  /**
   * Send user invitation email
   */
  async sendUserInvitation(to: string, userName: string, inviteToken: string): Promise<EmailResponse> {
    return this.sendTemplatedEmail({
      template: EmailTemplate.USER_INVITATION,
      to,
      data: { userName, inviteToken }
    });
  }

  /**
   * Send application received confirmation
   */
  async sendApplicationReceived(to: string, studentName: string, applicationId: number): Promise<EmailResponse> {
    return this.sendTemplatedEmail({
      template: EmailTemplate.APPLICATION_RECEIVED,
      to,
      data: { studentName, applicationId },
      recipientType: 'APPLICATION',
      recipientId: applicationId
    });
  }

  /**
   * Send status update notification
   */
  async sendStatusUpdate(
    to: string,
    studentName: string,
    newStatus: string,
    applicationId: number
  ): Promise<EmailResponse> {
    return this.sendTemplatedEmail({
      template: EmailTemplate.STATUS_UPDATE,
      to,
      data: { studentName, newStatus },
      recipientType: 'APPLICATION',
      recipientId: applicationId
    });
  }

  /**
   * Send interview invitation
   */
  async sendInterviewInvitation(
    to: string,
    studentName: string,
    interviewData: {
      interviewDate: string;
      interviewTime: string;
      interviewLocation?: string;
      meetingLink?: string;
    },
    interviewId: number
  ): Promise<EmailResponse> {
    return this.sendTemplatedEmail({
      template: EmailTemplate.INTERVIEW_INVITATION,
      to,
      data: {
        studentName,
        ...interviewData
      },
      recipientType: 'INTERVIEW',
      recipientId: interviewId
    });
  }

  /**
   * Send interview rescheduled notification
   */
  async sendInterviewRescheduled(
    to: string,
    studentName: string,
    interviewData: {
      interviewDate: string;
      interviewTime: string;
    },
    interviewId: number
  ): Promise<EmailResponse> {
    return this.sendTemplatedEmail({
      template: EmailTemplate.INTERVIEW_RESCHEDULED,
      to,
      data: {
        studentName,
        ...interviewData
      },
      recipientType: 'INTERVIEW',
      recipientId: interviewId
    });
  }

  /**
   * Send interview cancelled notification
   */
  async sendInterviewCancelled(
    to: string,
    studentName: string,
    interviewId: number,
    reason?: string
  ): Promise<EmailResponse> {
    return this.sendTemplatedEmail({
      template: EmailTemplate.INTERVIEW_CANCELLED,
      to,
      data: {
        studentName,
        reason
      },
      recipientType: 'INTERVIEW',
      recipientId: interviewId
    });
  }
}

// Singleton instance
export const emailService = new EmailService();

export default emailService;
