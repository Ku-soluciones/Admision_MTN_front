import api from './http';
import { User, CreateUserRequest, UpdateUserRequest, UserFilters, PagedResponse, UserStats } from '../types/user';

/**
 * Service for managing guardians (only APODERADO role)
 */
class GuardianService {
  private readonly BASE_URL = '/v1/users/guardians';

  /**
   * Get paginated list of guardians
   */
  async getGuardianUsers(filters: UserFilters): Promise<PagedResponse<User>> {
    const params = new URLSearchParams();

    if (filters.page !== undefined) params.append('page', filters.page.toString());
    if (filters.size !== undefined) params.append('size', filters.size.toString());
    if (filters.search) params.append('search', filters.search);
    if (filters.active !== undefined) params.append('active', filters.active.toString());

    const response = await api.get<PagedResponse<User>>(`${this.BASE_URL}?${params.toString()}`);
    return response;  // httpClient.get already unwraps response.data
  }

  /**
   * Get guardian user by ID
   */
  async getGuardianUserById(id: number): Promise<User> {
    const response = await api.get<{ success: boolean; data: User }>(`/v1/users/${id}`);
    return response.data.data;
  }

  /**
   * Create new guardian
   */
  async createGuardianUser(userData: CreateUserRequest): Promise<User> {
    // Ensure role is APODERADO
    if (userData.role !== 'APODERADO') {
      throw new Error('Use staffService to create staff members');
    }

    const response = await api.post<{ success: boolean; data: User }>('/v1/users', userData);
    return response.data.data;
  }

  /**
   * Update guardian
   */
  async updateGuardianUser(id: number, userData: UpdateUserRequest): Promise<User> {
    const response = await api.put<{ success: boolean; data: User }>(`/v1/users/${id}`, userData);
    return response.data.data;
  }

  /**
   * Delete guardian
   */
  async deleteGuardianUser(id: number): Promise<void> {
    await api.delete(`/v1/users/${id}`);
  }

  /**
   * Activate guardian
   */
  async activateGuardianUser(id: number): Promise<User> {
    const response = await api.put<{ success: boolean; data: User }>(`/v1/users/${id}/activate`);
    return response.data.data;
  }

  /**
   * Deactivate guardian
   */
  async deactivateGuardianUser(id: number): Promise<User> {
    const response = await api.put<{ success: boolean; data: User }>(`/v1/users/${id}/deactivate`);
    return response.data.data;
  }

  /**
   * Reset guardian password
   */
  async resetGuardianPassword(id: number): Promise<void> {
    await api.put(`/v1/users/${id}/reset-password`);
  }

  /**
   * Get guardian statistics
   */
  async getGuardianStats(): Promise<UserStats> {
    const response = await api.get<{ success: boolean; data: UserStats }>('/v1/users/stats');
    return response.data.data;
  }
}

export const guardianService = new GuardianService();
export default guardianService;
