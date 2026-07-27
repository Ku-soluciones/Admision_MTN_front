/**
 * Email Integration Contract - Based on BFF EMAIL_ENDPOINTS.md
 * @see /admitia-bff/EMAIL_ENDPOINTS.md
 */

/**
 * Enum EmailTemplate - Templates disponibles en el BFF
 * Valores case-insensitive
 */
export enum EmailTemplate {
  // AUTH
  WELCOME = 'WELCOME',
  EMAIL_VERIFICATION = 'EMAIL_VERIFICATION',
  PASSWORD_RESET = 'PASSWORD_RESET',
  PASSWORD_CHANGED = 'PASSWORD_CHANGED',
  USER_INVITATION = 'USER_INVITATION',

  // APPLICATION
  APPLICATION_RECEIVED = 'APPLICATION_RECEIVED',
  DOCUMENT_REVIEW = 'DOCUMENT_REVIEW',
  DOCUMENT_REMINDER = 'DOCUMENT_REMINDER',
  STATUS_UPDATE = 'STATUS_UPDATE',
  ADMISSION_RESULT = 'ADMISSION_RESULT',

  // INTERVIEW
  INTERVIEW_INVITATION = 'INTERVIEW_INVITATION',
  INTERVIEW_RESCHEDULED = 'INTERVIEW_RESCHEDULED',
  INTERVIEW_CANCELLED = 'INTERVIEW_CANCELLED',
  INTERVIEW_SUMMARY = 'INTERVIEW_SUMMARY',

  // EVALUATION
  EVALUATION_ASSIGNMENT = 'EVALUATION_ASSIGNMENT',
  EVALUATION_COMPLETED = 'EVALUATION_COMPLETED',
  EVALUATION_RESCHEDULED = 'EVALUATION_RESCHEDULED',
  EVALUATION_CANCELLED = 'EVALUATION_CANCELLED',

  // SYSTEM
  GENERIC = 'GENERIC',
  TEST = 'TEST'
}

/**
 * Payload base para envío de email con template
 * Usado en POST /api/notifications/email
 */
export interface EmailPayload {
  /** Template obligatorio - identifica la plantilla a usar */
  template: EmailTemplate | string;

  /** Destinatario del correo */
  to: string;

  /** Datos/variables que necesita el template */
  data?: Record<string, any>;

  /** Override del subject (opcional) */
  subject?: string;

  /** Para trazabilidad - tipo de recipiente */
  recipientType?: 'APPLICATION' | 'USER' | 'INTERVIEW' | 'EVALUATION';

  /** Para trazabilidad - ID del recipiente */
  recipientId?: number | string;
}

/**
 * Payload para envío de email arbitrario (legacy/directo)
 * POST /api/notifications/email (sin template)
 */
export interface DirectEmailPayload {
  to: string;
  subject: string;
  message: string;
  type?: string;
}

/**
 * Payload para envío bulk de emails
 * POST /api/notifications/email/bulk
 */
export interface BulkEmailPayload {
  recipients: EmailPayload[] | DirectEmailPayload[];
}

/**
 * Respuesta del servicio de email
 */
export interface EmailResponse {
  success: boolean;
  message: string;
  queueId?: string;
  notificationId?: number;
}

/**
 * Interfaz para emails institucionales
 * Usada por los endpoints /api/institutional-emails/*
 */
export interface InstitutionalEmailPayload {
  /** Template según enum EmailTemplate */
  template: EmailTemplate | string;

  /** Datos específicos según el tipo de email */
  data?: {
    newStatus?: string;
    pendingDocuments?: string;
    result?: string;
    message?: string;
    approvedDocuments?: string[];
    rejectedDocuments?: string[];
    allApproved?: boolean;
    [key: string]: any;
  };

  /** Override del subject */
  subject?: string;
}

/**
 * Variables de template por categoría
 */
export interface TemplateVariables {
  // Base
  studentName?: string;
  studentFirstName?: string;
  studentLastName?: string;
  gradeApplied?: string;
  applicantName?: string;
  applicantEmail?: string;
  collegeName?: string;
  collegePhone?: string;
  collegeEmail?: string;
  currentDate?: string;
  currentYear?: string;

  // Interview
  parentNames?: string;
  interviewType?: string;
  interviewMode?: string;
  interviewDate?: string;
  interviewTime?: string;
  interviewDuration?: string;
  interviewLocation?: string;
  interviewerName?: string;
  meetingLink?: string;
  interviewNotes?: string;

  // Admission
  admissionResult?: string;
  additionalInfo?: string;
  rejectionReason?: string;

  // Auth
  code?: string;
  resetToken?: string;
  inviteToken?: string;
  userName?: string;

  // Evaluation
  evaluatorName?: string;
  evaluationType?: string;
  evaluationDate?: string;
}

/**
 * Configuración de email del backend
 */
export interface EmailConfig {
  provider: 'resend' | 'ses' | 'javamail' | string;
  mockMode: boolean;
  resendConfigured: boolean;
  from: string;
  replyTo?: string;
}

/**
 * Estado del sistema de emails
 */
export interface EmailSystemStatus {
  success: boolean;
  config: EmailConfig;
  message?: string;
}

/**
 * Verificación de código de email
 */
export interface EmailVerificationPayload {
  email: string;
  code: string;
}

/**
 * Respuesta de verificación de código
 */
export interface EmailVerificationResponse {
  success: boolean;
  valid: boolean;
  message?: string;
}

/**
 * Filtros para listado de notificaciones
 */
export interface NotificationFilters {
  type?: 'EMAIL' | 'SMS' | 'PUSH';
  status?: 'PENDING' | 'SENT' | 'FAILED' | 'DELIVERED';
  startDate?: string;
  endDate?: string;
  recipientType?: string;
  recipientId?: number;
}

/**
 * Notificación persistida
 */
export interface Notification {
  id: number;
  type: 'EMAIL' | 'SMS' | 'PUSH';
  status: 'PENDING' | 'SENT' | 'FAILED' | 'DELIVERED';
  recipientType?: string;
  recipientId?: number;
  to: string;
  subject?: string;
  template?: EmailTemplate | string;
  createdAt: string;
  sentAt?: string;
  errorMessage?: string;
}

/**
 * Paginación de notificaciones
 */
export interface PaginatedNotifications {
  content: Notification[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

/**
 * Legacy support - mapeo de tipos antiguos a templates
 * @deprecated Usar EmailTemplate directamente
 */
export const TypeToTemplateMap: Record<string, EmailTemplate> = {
  'application-received': EmailTemplate.APPLICATION_RECEIVED,
  'status-update': EmailTemplate.STATUS_UPDATE,
  'document-reminder': EmailTemplate.DOCUMENT_REMINDER,
  'document-review': EmailTemplate.DOCUMENT_REVIEW,
  'admission-result': EmailTemplate.ADMISSION_RESULT,
  'interview-invitation': EmailTemplate.INTERVIEW_INVITATION,
  'interview-rescheduled': EmailTemplate.INTERVIEW_RESCHEDULED,
  'interview-cancelled': EmailTemplate.INTERVIEW_CANCELLED,
  'interview-summary': EmailTemplate.INTERVIEW_SUMMARY,
  'evaluation-assignment': EmailTemplate.EVALUATION_ASSIGNMENT,
  'welcome': EmailTemplate.WELCOME,
  'email-verification': EmailTemplate.EMAIL_VERIFICATION,
  'password-reset': EmailTemplate.PASSWORD_RESET,
  'password-changed': EmailTemplate.PASSWORD_CHANGED,
  'user-invitation': EmailTemplate.USER_INVITATION,
  'generic': EmailTemplate.GENERIC,
  'test': EmailTemplate.TEST
};

/**
 * Helper para convertir type legacy a template
 * @param type - Tipo legacy (ej. 'application-received')
 * @returns EmailTemplate correspondiente o GENERIC si no existe
 */
export function legacyTypeToTemplate(type: string): EmailTemplate {
  const normalized = type.toLowerCase().replace(/_/g, '-');
  return TypeToTemplateMap[normalized] || TypeToTemplateMap[type] || EmailTemplate.GENERIC;
}

/**
 * Verificar si un valor es un template válido
 */
export function isValidEmailTemplate(value: string): value is EmailTemplate {
  return Object.values(EmailTemplate).includes(value as EmailTemplate);
}

/**
 * Default subjects por template (fallback si el backend no provee)
 */
export const DefaultSubjects: Record<EmailTemplate, string> = {
  [EmailTemplate.WELCOME]: 'Bienvenido al Sistema de Admisión MTN',
  [EmailTemplate.EMAIL_VERIFICATION]: 'Verificación de Email',
  [EmailTemplate.PASSWORD_RESET]: 'Restablecimiento de Contraseña',
  [EmailTemplate.PASSWORD_CHANGED]: 'Confirmación de Cambio de Contraseña',
  [EmailTemplate.USER_INVITATION]: 'Invitación al Sistema',
  [EmailTemplate.APPLICATION_RECEIVED]: 'Postulación Recibida',
  [EmailTemplate.DOCUMENT_REVIEW]: 'Revisión de Documentos',
  [EmailTemplate.DOCUMENT_REMINDER]: 'Recordatorio de Documentos Pendientes',
  [EmailTemplate.STATUS_UPDATE]: 'Actualización de Estado',
  [EmailTemplate.ADMISSION_RESULT]: 'Resultado del Proceso de Admisión',
  [EmailTemplate.INTERVIEW_INVITATION]: 'Invitación a Entrevista',
  [EmailTemplate.INTERVIEW_RESCHEDULED]: 'Entrevista Reprogramada',
  [EmailTemplate.INTERVIEW_CANCELLED]: 'Entrevista Cancelada',
  [EmailTemplate.INTERVIEW_SUMMARY]: 'Resumen de Entrevista',
  [EmailTemplate.EVALUATION_ASSIGNMENT]: 'Asignación de Evaluación',
  [EmailTemplate.EVALUATION_COMPLETED]: 'Evaluación Completada',
  [EmailTemplate.EVALUATION_RESCHEDULED]: 'Evaluación Reprogramada',
  [EmailTemplate.EVALUATION_CANCELLED]: 'Evaluación Cancelada',
  [EmailTemplate.GENERIC]: 'Notificación del Sistema',
  [EmailTemplate.TEST]: 'Email de Prueba'
};

/**
 * Descripciones de templates para UI
 */
export const TemplateDescriptions: Record<EmailTemplate, string> = {
  [EmailTemplate.WELCOME]: 'Email de bienvenida para nuevos usuarios',
  [EmailTemplate.EMAIL_VERIFICATION]: 'Email con código de verificación',
  [EmailTemplate.PASSWORD_RESET]: 'Email con link para restablecer contraseña',
  [EmailTemplate.PASSWORD_CHANGED]: 'Confirmación de cambio de contraseña',
  [EmailTemplate.USER_INVITATION]: 'Invitación a establecer contraseña',
  [EmailTemplate.APPLICATION_RECEIVED]: 'Confirmación de postulación recibida',
  [EmailTemplate.DOCUMENT_REVIEW]: 'Notificación sobre revisión de documentos',
  [EmailTemplate.DOCUMENT_REMINDER]: 'Recordatorio de documentos pendientes',
  [EmailTemplate.STATUS_UPDATE]: 'Actualización de estado de postulación',
  [EmailTemplate.ADMISSION_RESULT]: 'Resultado final del proceso de admisión',
  [EmailTemplate.INTERVIEW_INVITATION]: 'Invitación a entrevista familiar',
  [EmailTemplate.INTERVIEW_RESCHEDULED]: 'Notificación de reprogramación',
  [EmailTemplate.INTERVIEW_CANCELLED]: 'Notificación de cancelación',
  [EmailTemplate.INTERVIEW_SUMMARY]: 'Resumen de entrevista completada',
  [EmailTemplate.EVALUATION_ASSIGNMENT]: 'Asignación de evaluación a profesor',
  [EmailTemplate.EVALUATION_COMPLETED]: 'Notificación de evaluación completada',
  [EmailTemplate.EVALUATION_RESCHEDULED]: 'Notificación de reprogramación',
  [EmailTemplate.EVALUATION_CANCELLED]: 'Notificación de cancelación',
  [EmailTemplate.GENERIC]: 'Email genérico institucional',
  [EmailTemplate.TEST]: 'Email de prueba del sistema'
};

/**
 * Categorías de templates para agrupar en UI
 */
export const TemplateCategories = {
  AUTH: [EmailTemplate.WELCOME, EmailTemplate.EMAIL_VERIFICATION, EmailTemplate.PASSWORD_RESET, EmailTemplate.PASSWORD_CHANGED, EmailTemplate.USER_INVITATION],
  APPLICATION: [EmailTemplate.APPLICATION_RECEIVED, EmailTemplate.DOCUMENT_REVIEW, EmailTemplate.DOCUMENT_REMINDER, EmailTemplate.STATUS_UPDATE, EmailTemplate.ADMISSION_RESULT],
  INTERVIEW: [EmailTemplate.INTERVIEW_INVITATION, EmailTemplate.INTERVIEW_RESCHEDULED, EmailTemplate.INTERVIEW_CANCELLED, EmailTemplate.INTERVIEW_SUMMARY],
  EVALUATION: [EmailTemplate.EVALUATION_ASSIGNMENT, EmailTemplate.EVALUATION_COMPLETED, EmailTemplate.EVALUATION_RESCHEDULED, EmailTemplate.EVALUATION_CANCELLED],
  SYSTEM: [EmailTemplate.GENERIC, EmailTemplate.TEST]
} as const;

/**
 * Lista completa de templates disponibles
 */
export const ALL_TEMPLATES = Object.values(EmailTemplate);

/**
 * Templates que requieren datos específicos
 */
export const TemplatesRequiringData: Record<EmailTemplate, string[]> = {
  [EmailTemplate.WELCOME]: ['userName'],
  [EmailTemplate.EMAIL_VERIFICATION]: ['code'],
  [EmailTemplate.PASSWORD_RESET]: ['resetToken'],
  [EmailTemplate.PASSWORD_CHANGED]: ['userName'],
  [EmailTemplate.USER_INVITATION]: ['inviteToken', 'userName'],
  [EmailTemplate.APPLICATION_RECEIVED]: ['studentName', 'applicationId'],
  [EmailTemplate.DOCUMENT_REVIEW]: ['approvedDocuments', 'rejectedDocuments'],
  [EmailTemplate.DOCUMENT_REMINDER]: ['pendingDocuments'],
  [EmailTemplate.STATUS_UPDATE]: ['newStatus', 'studentName'],
  [EmailTemplate.ADMISSION_RESULT]: ['result', 'studentName'],
  [EmailTemplate.INTERVIEW_INVITATION]: ['studentName', 'interviewDate', 'interviewTime'],
  [EmailTemplate.INTERVIEW_RESCHEDULED]: ['studentName', 'interviewDate', 'interviewTime'],
  [EmailTemplate.INTERVIEW_CANCELLED]: ['studentName'],
  [EmailTemplate.INTERVIEW_SUMMARY]: ['studentName', 'interviewNotes'],
  [EmailTemplate.EVALUATION_ASSIGNMENT]: ['evaluatorName', 'evaluationType'],
  [EmailTemplate.EVALUATION_COMPLETED]: ['evaluationType'],
  [EmailTemplate.EVALUATION_RESCHEDULED]: ['evaluationType', 'evaluationDate'],
  [EmailTemplate.EVALUATION_CANCELLED]: ['evaluationType'],
  [EmailTemplate.GENERIC]: [],
  [EmailTemplate.TEST]: []
};
