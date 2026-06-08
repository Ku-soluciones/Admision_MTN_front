// User Management Components
export { default as UserManagement } from './UserManagement';
export { default as StaffManagement } from './StaffManagement';
export { default as GuardianManagement } from './GuardianManagement';
export { default as UserForm } from './UserForm';
export { default as UserTable } from './UserTable';
export { default as UserFilters } from './UserFilters';
export { default as UserStats } from './UserStats';

// Re-export types for convenience
export type {
  User,
  CreateUserRequest,
  UpdateUserRequest,
  UserFilters,
  UserStats,
  UserRole,
  UserFormMode,
  UserTableProps,
  UserFormProps,
  UserFiltersProps,
  UserStatsProps,
  UserManagementState,
  PagedResponse
} from '../../types/user';