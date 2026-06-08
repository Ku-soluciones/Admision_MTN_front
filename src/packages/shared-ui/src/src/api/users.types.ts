/**
 * TypeScript types for USERS Service
 * Generated for MTN Admission System
 */

export interface UsersResponse<T = any> {
  data: T;
  message?: string;
  success: boolean;
  timestamp: string;
}

export interface User {
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
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserRequest {
  firstName: string;
  lastName: string;
  email: string;
  rut: string;
  phone?: string;
  role: User['role'];
  subject?: User['subject'];
  educationalLevel?: User['educationalLevel'];
  password?: string;
}

export interface UpdateUserRequest extends Partial<CreateUserRequest> {
  active?: boolean;
}

export interface UserSearchParams {
  query?: string;
  role?: User['role'];
  subject?: User['subject'];
  educationalLevel?: User['educationalLevel'];
  active?: boolean;
  emailVerified?: boolean;
  createdFrom?: string;
  createdTo?: string;
  page?: number;
  size?: number;
  sort?: string;
  direction?: 'asc' | 'desc';
}

export interface UserStatistics {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  usersByRole: Record<string, number>;
  activationRate: number;
}

export interface PaginatedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
  sort?: {
    empty: boolean;
    sorted: boolean;
    unsorted: boolean;
  };
}
