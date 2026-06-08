/**
 * TypeScript types for NOTIFICATIONS Service
 * Generated for MTN Admission System
 */

export interface NotificationsResponse<T = any> {
  data: T;
  message?: string;
  success: boolean;
  timestamp: string;
}

export interface Notification {
  id: number;
  userId: number;
  applicationId?: number;
  type: 'EMAIL' | 'SMS' | 'SYSTEM' | 'PUSH';
  category: 'VERIFICATION' | 'APPLICATION_STATUS' | 'INTERVIEW' | 'DOCUMENT' | 'ADMISSION_RESULT' | 'REMINDER' | 'SYSTEM_ALERT';
  subject: string;
  message: string;
  htmlContent?: string;
  status: 'PENDING' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED' | 'CANCELLED';
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  scheduledAt?: string;
  sentAt?: string;
  readAt?: string;
  failureReason?: string;
  retryCount: number;
  maxRetries: number;
  metadata?: NotificationMetadata;
  createdAt: string;
  updatedAt: string;
  user?: NotificationUser;
}

export interface NotificationUser {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role: string;
}

export interface NotificationMetadata {
  templateId?: string;
  variables?: Record<string, any>;
  correlationId?: string;
  sourceSystem?: string;
  campaignId?: string;
  trackingPixel?: boolean;
  attachments?: string[];
}

export interface CreateNotificationRequest {
  userId: number;
  applicationId?: number;
  type: Notification['type'];
  category: Notification['category'];
  subject: string;
  message: string;
  htmlContent?: string;
  priority?: Notification['priority'];
  scheduledAt?: string;
  metadata?: NotificationMetadata;
}

export interface UpdateNotificationRequest {
  subject?: string;
  message?: string;
  htmlContent?: string;
  status?: Notification['status'];
  priority?: Notification['priority'];
  scheduledAt?: string;
  metadata?: NotificationMetadata;
}

export interface NotificationSearchParams {
  userId?: number;
  applicationId?: number;
  type?: Notification['type'];
  category?: Notification['category'];
  status?: Notification['status'];
  priority?: Notification['priority'];
  scheduledDateFrom?: string;
  scheduledDateTo?: string;
  sentDateFrom?: string;
  sentDateTo?: string;
  subject?: string;
  page?: number;
  size?: number;
  sort?: string;
  direction?: 'asc' | 'desc';
}

export interface NotificationTemplate {
  id: string;
  name: string;
  description: string;
  category: Notification['category'];
  type: Notification['type'];
  subject: string;
  htmlContent: string;
  textContent: string;
  variables: TemplateVariable[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TemplateVariable {
  name: string;
  description: string;
  type: 'string' | 'number' | 'date' | 'boolean';
  required: boolean;
  defaultValue?: any;
}

export interface NotificationStatistics {
  totalNotifications: number;
  sentNotifications: number;
  pendingNotifications: number;
  failedNotifications: number;
  deliveryRate: number;
  openRate: number;
  notificationsByType: Record<string, number>;
  notificationsByCategory: Record<string, number>;
  notificationsByStatus: Record<string, number>;
}

export interface BulkNotificationRequest {
  userIds: number[];
  type: Notification['type'];
  category: Notification['category'];
  templateId?: string;
  subject: string;
  message: string;
  htmlContent?: string;
  priority?: Notification['priority'];
  scheduledAt?: string;
  metadata?: NotificationMetadata;
}