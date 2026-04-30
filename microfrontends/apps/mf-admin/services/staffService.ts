import api from './http';
import publicApi from './api';
import {
  User,
  CreateUserRequest,
  UpdateUserRequest,
  UserFilters,
  PagedResponse,
  UserStats,
  USER_ROLE_LABELS,
  EDUCATIONAL_LEVEL_LABELS,
  SUBJECT_LABELS,
} from '../types/user';

/**
 * Service for managing school staff (excludes guardians/apoderados)
 * Handles ADMIN, TEACHER, COORDINATOR, PSYCHOLOGIST, CYCLE_DIRECTOR roles
 */
class StaffService {
  private readonly BASE_URL = '/v1/users/staff';
  private readonly PUBLIC_STAFF_URL = '/v1/users/public/school-staff';

  private normalizeStaffUser(user: any): User {
    const role = user.role as User['role'];
    const educationalLevel = user.educationalLevel as User['educationalLevel'];
    const subject = user.subject as User['subject'];

    return {
      ...user,
      fullName: user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim(),
      rut: user.rut || '',
      role,
      roleDisplayName: user.roleDisplayName || USER_ROLE_LABELS[role] || user.role || '',
      educationalLevel,
      educationalLevelDisplayName: user.educationalLevelDisplayName || (educationalLevel ? EDUCATIONAL_LEVEL_LABELS[educationalLevel] : undefined),
      subject,
      subjectDisplayName: user.subjectDisplayName || (subject ? SUBJECT_LABELS[subject] : undefined),
      emailVerified: Boolean(user.emailVerified),
      active: user.active !== false,
      createdAt: user.createdAt || new Date().toISOString(),
    };
  }

  private toPagedResponse(users: User[], filters: UserFilters): PagedResponse<User> {
    const page = filters.page ?? 0;
    const size = filters.size ?? (users.length || 1);
    const start = page * size;
    const content = users.slice(start, start + size);
    const totalPages = Math.max(1, Math.ceil(users.length / size));

    return {
      content,
      totalElements: users.length,
      totalPages,
      number: page,
      size,
      first: page === 0,
      last: page >= totalPages - 1,
      numberOfElements: content.length,
      empty: content.length === 0,
    };
  }

  private applyFilters(users: User[], filters: UserFilters): User[] {
    const search = filters.search?.trim().toLowerCase();

    return users.filter((user) => {
      if (filters.role && user.role !== filters.role) return false;
      if (filters.active !== undefined && user.active !== filters.active) return false;
      if (search) {
        const haystack = `${user.fullName} ${user.firstName} ${user.lastName} ${user.email} ${user.rut}`.toLowerCase();
        if (!haystack.includes(search)) return false;
      }
      return true;
    });
  }

  /**
   * Get paginated list of staff members
   */
  async getStaffUsers(filters: UserFilters): Promise<PagedResponse<User>> {
    const response = await publicApi.get(this.PUBLIC_STAFF_URL);
    const rawUsers = response.data?.content || response.data?.data || [];
    const users = this.applyFilters(rawUsers.map((user: any) => this.normalizeStaffUser(user)), filters);
    return this.toPagedResponse(users, filters);
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
    const response = await this.getStaffUsers({ page: 0, size: 10000 });
    const users = response.content;
    const roleStats = users.reduce<Record<string, number>>((acc, user) => {
      acc[user.role] = (acc[user.role] || 0) + 1;
      return acc;
    }, {});

    return {
      totalUsers: users.length,
      activeUsers: users.filter((user) => user.active).length,
      inactiveUsers: users.filter((user) => !user.active).length,
      verifiedUsers: users.filter((user) => user.emailVerified).length,
      unverifiedUsers: users.filter((user) => !user.emailVerified).length,
      roleStats,
    };
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
