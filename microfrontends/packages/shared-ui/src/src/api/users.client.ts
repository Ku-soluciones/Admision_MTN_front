/**
 * Users API Client - Typed SDK
 * Generated for MTN Admission System
 */

import httpClient from '../../services/http';
import type {
  User,
  CreateUserRequest,
  UpdateUserRequest,
  UserSearchParams,
  UserStatistics,
  PaginatedResponse
} from './users.types';

export class UsersClient {
  private readonly basePath = '/v1/users';

  /**
   * Get all users with optional filtering and pagination
   */
  async getUsers(params?: UserSearchParams): Promise<PaginatedResponse<User>> {
    const response = await httpClient.get(
      this.basePath,
      { params }
    );
    return response.data as PaginatedResponse<User>;
  }

  /**
   * Get user by ID
   */
  async getUserById(id: number): Promise<User> {
    const response = await httpClient.get(
      `${this.basePath}/${id}`
    );
    return response.data as User;
  }

  /**
   * Create new user (admin only)
   */
  async createUser(userData: CreateUserRequest): Promise<User> {
    const response = await httpClient.post<{ success: boolean; data: User }>(
      this.basePath,
      userData
    );
    return (response.data as any).data;
  }

  /**
   * Update existing user
   */
  async updateUser(id: number, userData: UpdateUserRequest): Promise<User> {
    const response = await httpClient.put<{ success: boolean; data: User }>(
      `${this.basePath}/${id}`,
      userData
    );
    return (response.data as any).data;
  }

  /**
   * Delete user (soft delete)
   */
  async deleteUser(id: number): Promise<void> {
    await httpClient.delete<{ success: boolean }>(`${this.basePath}/${id}`);
  }

  /**
   * Activate/deactivate user
   */
  async toggleUserStatus(id: number, active: boolean): Promise<User> {
    const response = await httpClient.patch<{ success: boolean; data: User }>(
      `${this.basePath}/${id}/status`,
      { active }
    );
    return (response.data as any).data;
  }

  /**
   * Reset user password (admin only)
   */
  async resetUserPassword(id: number): Promise<{ temporaryPassword: string }> {
    const response = await httpClient.post<{ success: boolean; data: { temporaryPassword: string } }>(
      `${this.basePath}/${id}/reset-password`
    );
    return (response.data as any).data;
  }

  /**
   * Get user statistics (admin only)
   */
  async getUserStatistics(): Promise<UserStatistics> {
    const response = await httpClient.get<{ success: boolean; data: UserStatistics }>(
      `${this.basePath}/statistics`
    );
    return (response.data as any).data;
  }

  /**
   * Get users by role
   */
  async getUsersByRole(role: User['role'], params?: Omit<UserSearchParams, 'role'>): Promise<User[]> {
    const response = await httpClient.get<{ success: boolean; data: User[] }>(
      `${this.basePath}/by-role/${role}`,
      { params }
    );
    return (response.data as any).data;
  }

  /**
   * Get evaluators (teachers, psychologists, directors)
   */
  async getEvaluators(params?: {
    subject?: User['subject'];
    educationalLevel?: User['educationalLevel'];
    activeOnly?: boolean;
  }): Promise<User[]> {
    const response = await httpClient.get<{ success: boolean; data: User[] }>(
      `${this.basePath}/evaluators`,
      { params }
    );
    return (response.data as any).data;
  }

  /**
   * Search users by query
   */
  async searchUsers(query: string, params?: Omit<UserSearchParams, 'query'>): Promise<User[]> {
    const response = await httpClient.get<{ success: boolean; data: User[] }>(
      `${this.basePath}/search`,
      { params: { query, ...params } }
    );
    return (response.data as any).data;
  }

  /**
   * Verify user email
   */
  async verifyUserEmail(id: number): Promise<void> {
    await httpClient.post<{ success: boolean }>(
      `${this.basePath}/${id}/verify-email`
    );
  }

  /**
   * Update user preferences
   */
  async updateUserPreferences(id: number, preferences: any): Promise<User> {
    const response = await httpClient.patch<{ success: boolean; data: User }>(
      `${this.basePath}/${id}/preferences`,
      preferences
    );
    return (response.data as any).data;
  }
}

// Export singleton instance
export const usersClient = new UsersClient();

// Export individual functions for convenience
export const {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  toggleUserStatus,
  resetUserPassword,
  getUserStatistics,
  getUsersByRole,
  getEvaluators,
  searchUsers,
  verifyUserEmail,
  updateUserPreferences
} = usersClient;