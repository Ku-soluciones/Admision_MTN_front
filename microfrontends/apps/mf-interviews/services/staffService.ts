import api from './http';
import { User, CreateUserRequest, UpdateUserRequest, UserFilters, PagedResponse, UserStats } from '../types/user';

/**
 * Service for managing school staff (excludes guardians/apoderados)
 * Handles ADMIN, TEACHER, COORDINATOR, PSYCHOLOGIST, CYCLE_DIRECTOR roles
 */
class StaffService {
  private readonly BASE_URL = '/v1/users/staff';

  /**
   * Get paginated list of staff members
   */
  async getStaffUsers(filters: UserFilters): Promise<PagedResponse<User>> {
    const params = new URLSearchParams();

    if (filters.page !== undefined) params.append('page', filters.page.toString());
    if (filters.size !== undefined) params.append('size', filters.size.toString());
    if (filters.search) params.append('search', filters.search);
    if (filters.role) params.append('role', filters.role);
    if (filters.active !== undefined) params.append('active', filters.active.toString());

    const response = await api.get<PagedResponse<User>>(`${this.BASE_URL}?${params.toString()}`);
    return response;  // httpClient.get already unwraps response.data
  }

  /**
   * Get staff user by ID
   */
  async getStaffUserById(id: number): Promise<User> {
    const response = await api.get<{ success: boolean; data: User }>(`/v1/users/${id}`);
    return response.data.data;
  }

  /**
   * Create new staff member
   */
  async createStaffUser(userData: CreateUserRequest): Promise<User> {
    // Ensure role is not APODERADO
    if (userData.role === 'APODERADO') {
      throw new Error('Use guardianService to create guardians');
    }

    const response = await api.post<{ success: boolean; data: User }>('/v1/users', userData);
    return response.data.data;
  }

  /**
   * Update staff member
   */
  async updateStaffUser(id: number, userData: UpdateUserRequest): Promise<User> {
    const response = await api.put<{ success: boolean; data: User }>(`/v1/users/${id}`, userData);
    return response.data.data;
  }

  /**
   * Delete staff member
   */
  async deleteStaffUser(id: number): Promise<void> {
    try {
      await api.delete(`/v1/users/${id}`);
    } catch (error: any) {
      // Preservar el código de estado del error para que el componente pueda detectar 409
      // El httpClient lanza HttpError con la propiedad 'status'
      throw error;
    }
  }

  /**
   * Activate staff member
   */
  async activateStaffUser(id: number): Promise<User> {
    const response = await api.put<{ success: boolean; data: User }>(`/v1/users/${id}/activate`);
    return response.data.data;
  }

  /**
   * Deactivate staff member
   */
  async deactivateStaffUser(id: number): Promise<User> {
    const response = await api.put<{ success: boolean; data: User }>(`/v1/users/${id}/deactivate`);
    return response.data.data;
  }

  /**
   * Reset staff member password
   */
  async resetStaffPassword(id: number): Promise<void> {
    await api.put(`/v1/users/${id}/reset-password`);
  }

  /**
   * Get staff statistics
   */
  async getStaffStats(): Promise<UserStats> {
    const response = await api.get<{ success: boolean; data: UserStats }>('/v1/users/stats');
    return response.data.data;
  }

  /**
   * Get available roles for staff
   */
  async getStaffRoles(): Promise<string[]> {
    const response = await api.get<{ success: boolean; data: string[] }>('/v1/users/roles');
    // Filter out APODERADO role
    return response.data.data.filter(role => role !== 'APODERADO');
  }
}

export const staffService = new StaffService();
export default staffService;
