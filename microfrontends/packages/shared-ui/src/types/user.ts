// Tipos para gestión de usuarios - sistema simplificado con roles + niveles + asignaturas

// Enum de roles básicos (debe coincidir exactamente con backend)
export enum UserRole {
  APODERADO = 'APODERADO',
  ADMIN = 'ADMIN',
  TEACHER = 'TEACHER',
  COORDINATOR = 'COORDINATOR',
  PSYCHOLOGIST = 'PSYCHOLOGIST',
  INTERVIEWER = 'INTERVIEWER',
  CYCLE_DIRECTOR = 'CYCLE_DIRECTOR'
}

// Enum de niveles educativos
export enum EducationalLevel {
  PRESCHOOL = 'PRESCHOOL',
  BASIC = 'BASIC',
  HIGH_SCHOOL = 'HIGH_SCHOOL',
  ALL_LEVELS = 'ALL_LEVELS'
}

// Enum de asignaturas
export enum Subject {
  GENERAL = 'GENERAL',
  LANGUAGE = 'LANGUAGE',
  MATHEMATICS = 'MATHEMATICS',
  ENGLISH = 'ENGLISH',
  ALL_SUBJECTS = 'ALL_SUBJECTS'
}

// Labels para la UI - Roles
export const USER_ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.APODERADO]: 'Apoderado',
  [UserRole.ADMIN]: 'Administrador',
  [UserRole.TEACHER]: 'Profesor',
  [UserRole.COORDINATOR]: 'Coordinador',
  [UserRole.PSYCHOLOGIST]: 'Psicólogo/a',
  [UserRole.INTERVIEWER]: 'Entrevistador/a',
  [UserRole.CYCLE_DIRECTOR]: 'Director de Ciclo'
};

// Labels para la UI - Niveles Educativos
export const EDUCATIONAL_LEVEL_LABELS: Record<EducationalLevel, string> = {
  [EducationalLevel.PRESCHOOL]: 'Prebásica (Kinder - 2° Básico)',
  [EducationalLevel.BASIC]: 'Básica (3° - 8° Básico)',
  [EducationalLevel.HIGH_SCHOOL]: 'Media (I° - IV° Medio)',
  [EducationalLevel.ALL_LEVELS]: 'Todos los Niveles'
};

// Labels para la UI - Asignaturas (en español)
export const SUBJECT_LABELS: Record<Subject, string> = {
  [Subject.GENERAL]: 'Educación General (Prebásica)',
  [Subject.LANGUAGE]: 'Lenguaje',
  [Subject.MATHEMATICS]: 'Matemática',
  [Subject.ENGLISH]: 'Inglés',
  [Subject.ALL_SUBJECTS]: 'Todas las Asignaturas'
};

// Interface principal de Usuario
export interface User {
  id: number;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  rut: string;
  phone?: string;
  role: UserRole;
  roleDisplayName: string;
  educationalLevel?: EducationalLevel;
  educationalLevelDisplayName?: string;
  subject?: Subject;
  subjectDisplayName?: string;
  emailVerified: boolean;
  active: boolean;
  createdAt: string;
  updatedAt?: string;
}

// DTOs para requests
export interface CreateUserRequest {
  firstName: string;
  lastName: string;
  email: string;
  rut: string;
  phone?: string;
  role: UserRole;
  educationalLevel?: EducationalLevel;
  subject?: Subject;
  password?: string;
  sendWelcomeEmail?: boolean;
}

export interface UpdateUserRequest {
  firstName: string;
  lastName: string;
  email: string;
  rut: string;
  phone?: string;
  role?: UserRole;
  educationalLevel?: EducationalLevel;
  subject?: Subject;
  active?: boolean;
  emailVerified?: boolean;
}

// Interface para filtros de búsqueda
export interface UserFilters {
  search?: string;
  role?: UserRole;
  educationalLevel?: EducationalLevel;
  subject?: Subject;
  active?: boolean;
  page?: number;
  size?: number;
  sort?: string;
}

// Interface para respuesta paginada
export interface PagedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
  first: boolean;
  last: boolean;
  numberOfElements: number;
  empty: boolean;
}

// Interface para estadísticas de usuarios
export interface UserStats {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  verifiedUsers: number;
  unverifiedUsers: number;
  roleStats: Record<string, number>;
}

// Estados para formularios
export enum UserFormMode {
  CREATE = 'CREATE',
  EDIT = 'EDIT',
  VIEW = 'VIEW'
}

// Interface para el estado del componente de gestión
export interface UserManagementState {
  users: User[];
  selectedUser: User | null;
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;
  filters: UserFilters;
  pagination: {
    page: number;
    size: number;
    total: number;
    totalPages: number;
  };
  stats: UserStats | null;
}

// Props para componentes
export interface UserTableProps {
  users: User[];
  isLoading?: boolean;
  onEdit: (user: User) => void;
  onDelete: (user: User) => void;
  onToggleStatus: (user: User) => void;
  onResetPassword: (user: User) => void;
  className?: string;
}

export interface UserFormProps {
  user?: User;
  mode: UserFormMode;
  onSubmit: (data: CreateUserRequest | UpdateUserRequest) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
  className?: string;
}

export interface UserFiltersProps {
  filters: UserFilters;
  onChange: (filters: UserFilters) => void;
  onReset: () => void;
  className?: string;
}

export interface UserStatsProps {
  stats: UserStats;
  isLoading?: boolean;
  className?: string;
}

// Utilidades para usuarios
export const UserUtils = {
  // Obtener roles que requieren nivel educativo
  getRolesThatRequireLevel: (): UserRole[] => [
    UserRole.TEACHER,
    UserRole.COORDINATOR
  ],

  // Obtener roles que requieren asignatura
  getRolesThatRequireSubject: (): UserRole[] => [
    UserRole.TEACHER,
    UserRole.COORDINATOR
  ],

  // Verificar si un rol requiere nivel educativo
  requiresEducationalLevel: (role: UserRole): boolean => {
    return UserUtils.getRolesThatRequireLevel().includes(role);
  },

  // Verificar si un rol requiere asignatura
  requiresSubject: (role: UserRole): boolean => {
    return UserUtils.getRolesThatRequireSubject().includes(role);
  },

  // Obtener asignaturas válidas para un nivel
  getSubjectsForLevel: (level: EducationalLevel): Subject[] => {
    switch (level) {
      case EducationalLevel.PRESCHOOL:
        return [Subject.GENERAL];
      case EducationalLevel.BASIC:
      case EducationalLevel.HIGH_SCHOOL:
        return [Subject.LANGUAGE, Subject.MATHEMATICS, Subject.ENGLISH];
      case EducationalLevel.ALL_LEVELS:
        return [Subject.ALL_SUBJECTS];
      default:
        return [];
    }
  },

  // Obtener roles de evaluadores
  getEvaluatorRoles: (): UserRole[] => [
    UserRole.TEACHER,
    UserRole.COORDINATOR,
    UserRole.PSYCHOLOGIST,
    UserRole.INTERVIEWER,
    UserRole.CYCLE_DIRECTOR
  ],

  // Obtener roles administrativos
  getAdminRoles: (): UserRole[] => [
    UserRole.ADMIN
  ],

  // Obtener todos los roles del sistema (excepto apoderado)
  getSystemRoles: (): UserRole[] => [
    UserRole.ADMIN,
    UserRole.TEACHER,
    UserRole.COORDINATOR,
    UserRole.PSYCHOLOGIST,
    UserRole.INTERVIEWER,
    UserRole.CYCLE_DIRECTOR
  ],

  // Verificar si un rol es de evaluador
  isEvaluatorRole: (role: UserRole): boolean => {
    return UserUtils.getEvaluatorRoles().includes(role);
  },

  // Verificar si un rol es administrativo
  isAdminRole: (role: UserRole): boolean => {
    return UserUtils.getAdminRoles().includes(role);
  },

  // Generar nombre completo del usuario con su especialización
  getFullUserDescription: (user: User): string => {
    let description = `${user.fullName} - ${user.roleDisplayName}`;
    
    if (user.educationalLevel && user.educationalLevelDisplayName) {
      description += ` (${user.educationalLevelDisplayName})`;
    }
    
    if (user.subject && user.subjectDisplayName) {
      description += ` - ${user.subjectDisplayName}`;
    }
    
    return description;
  },

  // Generar nombre completo básico
  getFullName: (user: User | CreateUserRequest | UpdateUserRequest): string => {
    return `${user.firstName} ${user.lastName}`;
  },

  // Obtener color del badge según rol
  getRoleColor: (role: UserRole): 'primary' | 'success' | 'warning' | 'error' | 'info' => {
    switch (role) {
      case UserRole.ADMIN:
        return 'error';
      case UserRole.CYCLE_DIRECTOR:
        return 'primary';
      case UserRole.PSYCHOLOGIST:
        return 'warning';
      case UserRole.INTERVIEWER:
        return 'warning';
      case UserRole.COORDINATOR:
        return 'primary';
      case UserRole.TEACHER:
        return 'info';
      case UserRole.APODERADO:
        return 'success';
      default:
        return 'info';
    }
  },

  // Obtener color del estado
  getStatusColor: (active: boolean): 'success' | 'error' => {
    return active ? 'success' : 'error';
  },

  // Formatear fecha de creación
  formatCreatedAt: (createdAt: string): string => {
    return new Date(createdAt).toLocaleDateString('es-CL', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  },

  // Validar RUT básico (formato chileno)
  validateRut: (rut: string): boolean => {
    const rutRegex = /^[0-9]+-[0-9kK]$/;
    return rutRegex.test(rut.trim());
  },

  // Formatear RUT con guión
  formatRut: (rut: string): string => {
    const cleanRut = rut.replace(/[^0-9kK]/g, '');
    if (cleanRut.length >= 2) {
      const body = cleanRut.slice(0, -1);
      const verifier = cleanRut.slice(-1);
      return `${body}-${verifier}`;
    }
    return cleanRut;
  },

  // Obtener categoría de un rol para la UI
  getRoleCategory: (role: UserRole): string => {
    switch (role) {
      case UserRole.ADMIN:
        return 'Administración';
      case UserRole.TEACHER:
        return 'Docentes';
      case UserRole.COORDINATOR:
        return 'Coordinación';
      case UserRole.PSYCHOLOGIST:
        return 'Psicología';
      case UserRole.INTERVIEWER:
        return 'Psicología';
      case UserRole.CYCLE_DIRECTOR:
        return 'Dirección';
      case UserRole.APODERADO:
        return 'Familia';
      default:
        return 'Otros';
    }
  },

  // Validar que la combinación role + level + subject sea válida
  validateRoleCombination: (role: UserRole, level?: EducationalLevel, subject?: Subject): string[] => {
    const errors: string[] = [];

    // Verificar si el rol requiere nivel educativo
    if (UserUtils.requiresEducationalLevel(role) && !level) {
      errors.push('Este rol requiere seleccionar un nivel educativo');
    }

    // Verificar si el rol requiere asignatura
    if (UserUtils.requiresSubject(role) && !subject) {
      errors.push('Este rol requiere seleccionar una asignatura');
    }

    // Verificar si la asignatura es válida para el nivel
    if (level && subject) {
      const validSubjects = UserUtils.getSubjectsForLevel(level);
      if (validSubjects.length > 0 && !validSubjects.includes(subject)) {
        errors.push('La asignatura seleccionada no es válida para el nivel educativo');
      }
    }

    // Verificar que roles que no requieren nivel/asignatura no los tengan
    if (!UserUtils.requiresEducationalLevel(role) && level) {
      errors.push('Este rol no debe tener nivel educativo asignado');
    }

    if (!UserUtils.requiresSubject(role) && subject) {
      errors.push('Este rol no debe tener asignatura asignada');
    }

    return errors;
  }
};

// Constantes para validación
export const USER_VALIDATION = {
  FIRST_NAME: {
    MIN_LENGTH: 2,
    MAX_LENGTH: 50
  },
  LAST_NAME: {
    MIN_LENGTH: 2,
    MAX_LENGTH: 50
  },
  PASSWORD: {
    MIN_LENGTH: 8,
    MAX_LENGTH: 100
  },
  RUT: {
    PATTERN: /^[0-9]+-[0-9kK]$/
  },
  EMAIL: {
    PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  }
};

// Mensajes de error para validación
export const USER_VALIDATION_ERRORS = {
  REQUIRED_FIELD: 'Este campo es obligatorio',
  INVALID_EMAIL: 'El formato del email no es válido',
  INVALID_RUT: 'El formato del RUT no es válido (ej: 12345678-9)',
  FIRST_NAME_LENGTH: `El nombre debe tener entre ${USER_VALIDATION.FIRST_NAME.MIN_LENGTH} y ${USER_VALIDATION.FIRST_NAME.MAX_LENGTH} caracteres`,
  LAST_NAME_LENGTH: `El apellido debe tener entre ${USER_VALIDATION.LAST_NAME.MIN_LENGTH} y ${USER_VALIDATION.LAST_NAME.MAX_LENGTH} caracteres`,
  PASSWORD_LENGTH: `La contraseña debe tener al menos ${USER_VALIDATION.PASSWORD.MIN_LENGTH} caracteres`,
  EMAIL_EXISTS: 'Ya existe un usuario con este email',
  RUT_EXISTS: 'Ya existe un usuario con este RUT',
  INVALID_ROLE_COMBINATION: 'La combinación de rol, nivel y asignatura no es válida'
} as const;