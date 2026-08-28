/**
 * User Profile Service - Gateway Integration
 * Handles user profile management through API Gateway
 */

import api from './api';
import { User } from '../src/api/users.types';

export interface UserProfile extends User {
  address?: string;
  profession?: string;
  permissions: string[];
  lastLoginAt?: string;
  sessionInfo?: {
    sessionId: string;
    expiresAt: string;
    deviceInfo: {
      userAgent: string;
      platform: string;
      ipAddress?: string;
    };
  };
  preferences?: {
    language: 'es' | 'en';
    timezone: string;
    theme: 'light' | 'dark' | 'auto';
    notifications: {
      email: boolean;
      sms: boolean;
      push: boolean;
    };
  };
}

export interface UpdateProfileRequest {
  firstName?: string;
  lastName?: string;
  phone?: string;
  address?: string;
  profession?: string;
  preferences?: UserProfile['preferences'];
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

class ProfileService {
  private readonly basePath = '/v1/users';

  /**
   * Get current user profile with roles from token
   * Gateway extracts roles from JWT automatically
   */
  async getCurrentUser(): Promise<UserProfile> {
    const response = await api.get<{ success: boolean; user: UserProfile }>(`${this.basePath}/me`);
    return response.data.user;
  }

  /**
   * Update current user profile
   */
  async updateProfile(data: UpdateProfileRequest): Promise<UserProfile> {
    const response = await api.put<{ data: UserProfile }>(
      `${this.basePath}/me`,
      data
    );
    return response.data;
  }

  /**
   * Change user password
   */
  async changePassword(data: ChangePasswordRequest): Promise<void> {
    await api.post<{ success: boolean }>(
      `${this.basePath}/me/change-password`,
      data
    );
  }

  /**
   * Upload profile picture
   */
  async uploadProfilePicture(file: File): Promise<{ profilePictureUrl: string }> {
    const formData = new FormData();
    formData.append('profilePicture', file);

    const response = await api.post<{ data: { profilePictureUrl: string } }>(
      `${this.basePath}/me/profile-picture`,
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
   * Get user permissions (extracted from token)
   */
  async getPermissions(): Promise<string[]> {
    const response = await api.get<{ data: string[] }>(
      `${this.basePath}/me/permissions`
    );
    return response.data;
  }

  /**
   * Update user preferences
   */
  async updatePreferences(preferences: UserProfile['preferences']): Promise<UserProfile> {
    const response = await api.patch<{ data: UserProfile }>(
      `${this.basePath}/me/preferences`,
      { preferences }
    );
    return response.data;
  }

  /**
   * Get user activity log
   */
  async getActivityLog(params?: {
    from?: string;
    to?: string;
    limit?: number;
  }): Promise<Array<{
    id: string;
    action: string;
    timestamp: string;
    details: Record<string, any>;
    ipAddress: string;
    userAgent: string;
  }>> {
    const response = await api.get<{
      data: Array<{
        id: string;
        action: string;
        timestamp: string;
        details: Record<string, any>;
        ipAddress: string;
        userAgent: string;
      }>
    }>(
      `${this.basePath}/me/activity`,
      { params }
    );
    return response.data;
  }

  /**
   * Get user sessions (for security management)
   */
  async getSessions(): Promise<Array<{
    sessionId: string;
    deviceInfo: {
      userAgent: string;
      platform: string;
      location?: string;
    };
    lastActivity: string;
    isCurrentSession: boolean;
    expiresAt: string;
  }>> {
    const response = await api.get<{
      data: Array<{
        sessionId: string;
        deviceInfo: {
          userAgent: string;
          platform: string;
          location?: string;
        };
        lastActivity: string;
        isCurrentSession: boolean;
        expiresAt: string;
      }>
    }>(`${this.basePath}/me/sessions`);
    return response.data;
  }

  /**
   * Revoke a specific session
   */
  async revokeSession(sessionId: string): Promise<void> {
    await api.delete(`${this.basePath}/me/sessions/${sessionId}`);
  }

  /**
   * Revoke all sessions except current
   */
  async revokeAllOtherSessions(): Promise<void> {
    await api.post(`${this.basePath}/me/sessions/revoke-others`);
  }

  /**
   * Enable/disable two-factor authentication
   */
  async setupTwoFactor(): Promise<{
    qrCodeUrl: string;
    backupCodes: string[];
    secret: string;
  }> {
    const response = await api.post<{
      data: {
        qrCodeUrl: string;
        backupCodes: string[];
        secret: string;
      }
    }>(`${this.basePath}/me/2fa/setup`);
    return response.data;
  }

  /**
   * Verify and enable two-factor authentication
   */
  async enableTwoFactor(token: string): Promise<{ backupCodes: string[] }> {
    const response = await api.post<{ data: { backupCodes: string[] } }>(
      `${this.basePath}/me/2fa/enable`,
      { token }
    );
    return response.data;
  }

  /**
   * Disable two-factor authentication
   */
  async disableTwoFactor(password: string): Promise<void> {
    await api.post(`${this.basePath}/me/2fa/disable`, { password });
  }
}

// Export singleton instance
export const profileService = new ProfileService();
export default profileService;