/**
 * Email Services Export
 * 
 * Provides access to all email-related services.
 * Based on BFF EMAIL_ENDPOINTS.md contract with composer pattern.
 */

// Re-export all from types/email.ts
export * from '../types/email';

// Services
export { emailService } from './emailService';
export type { SendEmailOptions } from './emailService';

export { institutionalEmailService } from './institutionalEmailService';
export type { QueueStatistics, StatisticsResponse, EmailResponse as InstitutionalEmailResponse } from './institutionalEmailService';

export { emailTemplateService } from './emailTemplateService';
export type { 
  EmailTemplate as EmailTemplateEntity, 
  EmailTemplateResponse, 
  SingleTemplateResponse, 
  CreateTemplateRequest 
} from './emailTemplateService';

// Re-export notification service (push notifications)
export { notificationService, useNotifications } from './notificationService';
export type { PushNotification, NotificationAction } from './notificationService';

// Import services for convenience object
import { emailService } from './emailService';
import { institutionalEmailService } from './institutionalEmailService';

// Convenience exports for common use cases
export const email = {
  // Direct email service
  send: emailService.sendTemplatedEmail.bind(emailService),
  sendBulk: emailService.sendBulkEmails.bind(emailService),
  sendDirect: emailService.sendDirectEmail.bind(emailService),
  
  // Institutional emails
  institutional: {
    applicationReceived: institutionalEmailService.sendApplicationReceivedEmail.bind(institutionalEmailService),
    statusUpdate: institutionalEmailService.sendStatusUpdateEmail.bind(institutionalEmailService),
    interviewInvitation: institutionalEmailService.sendInterviewInvitationEmail.bind(institutionalEmailService),
    documentReminder: institutionalEmailService.sendDocumentReminderEmail.bind(institutionalEmailService),
    admissionResult: institutionalEmailService.sendAdmissionResultEmail.bind(institutionalEmailService),
    documentReview: institutionalEmailService.sendDocumentReviewEmail.bind(institutionalEmailService),
  },
  
  // Convenience methods
  welcome: emailService.sendWelcomeEmail.bind(emailService),
  passwordReset: emailService.sendPasswordResetEmail.bind(emailService),
  interviewInvitation: emailService.sendInterviewInvitation.bind(emailService),
  statusUpdate: emailService.sendStatusUpdate.bind(emailService),
  applicationReceived: emailService.sendApplicationReceived.bind(emailService),
  
  // System
  sendTest: emailService.sendTestEmail.bind(emailService),
  getConfig: emailService.getConfigStatus.bind(emailService),
  verifyCode: emailService.verifyCode.bind(emailService),
  sendVerification: emailService.sendVerificationCode.bind(emailService),
};

export default email;
