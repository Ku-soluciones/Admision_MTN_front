/**
 * TypeScript types for AUTH Service
 * Generated for MTN Admission System
 */

export interface AuthResponse<T = any> {
  data: T;
  message?: string;
  success: boolean;
  timestamp: string;
}

export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
  deviceInfo?: DeviceInfo;
}

export interface LoginResponse {
  token: string;
  refreshToken: string;
  user: AuthUser;
  expiresAt: string;
  refreshExpiresAt: string;
  permissions: string[];
  sessionId: string;
}

export interface AuthUser {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  rut: string;
  phone?: string;
  role: 'ADMIN' | 'TEACHER' | 'PSYCHOLOGIST' | 'CYCLE_DIRECTOR' | 'COORDINATOR' | 'APODERADO';
  subject?: 'GENERAL' | 'LANGUAGE' | 'MATHEMATICS' | 'ENGLISH' | 'ALL_SUBJECTS';
  educationalLevel?: 'PRESCHOOL' | 'BASIC' | 'HIGH_SCHOOL' | 'ALL_LEVELS';
  active: boolean;
  emailVerified: boolean;
  lastLoginAt?: string;
  profilePicture?: string;
  preferences?: UserPreferences;
}

export interface DeviceInfo {
  userAgent: string;
  platform: string;
  deviceType: 'DESKTOP' | 'MOBILE' | 'TABLET';
  ipAddress?: string;
  location?: string;
}

export interface UserPreferences {
  language: 'es' | 'en';
  timezone: string;
  theme: 'light' | 'dark' | 'auto';
  notifications: NotificationPreferences;
  dashboard?: DashboardPreferences;
}

export interface NotificationPreferences {
  email: boolean;
  sms: boolean;
  push: boolean;
  applicationUpdates: boolean;
  interviewReminders: boolean;
  systemAlerts: boolean;
}

export interface DashboardPreferences {
  defaultView: 'overview' | 'applications' | 'evaluations';
  itemsPerPage: number;
  showWelcomeMessage: boolean;
}

export interface RefreshTokenRequest {
  refreshToken: string;
  sessionId: string;
}

export interface RefreshTokenResponse {
  token: string;
  expiresAt: string;
  sessionId: string;
}

export interface RegisterRequest {
  firstName: string;
  lastName: string;
  email: string;
  rut: string;
  phone?: string;
  password: string;
  confirmPassword: string;
  acceptedTerms: boolean;
  acceptedPrivacyPolicy: boolean;
  deviceInfo?: DeviceInfo;
}

export interface RegisterResponse {
  userId: number;
  email: string;
  verificationRequired: boolean;
  message: string;
}

export interface EmailVerificationRequest {
  email: string;
  verificationCode: string;
}

export interface EmailVerificationResponse {
  verified: boolean;
  token?: string;
  user?: AuthUser;
}

export interface ResetPasswordRequest {
  email: string;
  deviceInfo?: DeviceInfo;
}

export interface ResetPasswordResponse {
  message: string;
  resetTokenSent: boolean;
  expiresAt: string;
}

export interface ConfirmResetPasswordRequest {
  email: string;
  resetToken: string;
  newPassword: string;
  confirmNewPassword: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}

export interface LogoutRequest {
  token?: string;
  refreshToken?: string;
  sessionId?: string;
  logoutAllDevices?: boolean;
}

export interface SessionInfo {
  sessionId: string;
  userId: number;
  deviceInfo: DeviceInfo;
  createdAt: string;
  lastActivityAt: string;
  expiresAt: string;
  isActive: boolean;
  isCurrent: boolean;
}

export interface AuthStatistics {
  totalUsers: number;
  activeUsers: number;
  verifiedUsers: number;
  loginsByRole: Record<string, number>;
  loginsByDay: Record<string, number>;
  averageSessionDuration: number;
  passwordResetRequests: number;
}

export interface PermissionCheck {
  permission: string;
  resource?: string;
  resourceId?: number;
}

export interface PermissionResult {
  hasPermission: boolean;
  reason?: string;
  requiredRole?: string;
  additionalInfo?: Record<string, any>;
}