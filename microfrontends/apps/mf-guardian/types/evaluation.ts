// Tipos específicos para evaluaciones - correspondientes con la entidad backend

export interface BaseEvaluation {
  id: number;
  evaluationType: EvaluationType;
  status: EvaluationStatus;
  evaluationDate?: string;
  completionDate?: string;
  createdAt: string;
  updatedAt?: string;
  
  // Campos básicos para todas las evaluaciones
  observations?: string;
  strengths?: string;
  areasForImprovement?: string;
  recommendations?: string;
  
  // Relaciones
  evaluator?: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  };
  
  application?: {
    id: number;
    status: string;
    submissionDate: string;
    student: {
      firstName: string;
      lastName: string;
      rut: string;
      gradeApplied: string;
    };
  };
}

// Evaluación Académica (Lenguaje, Matemáticas, Inglés)
export interface AcademicEvaluation extends BaseEvaluation {
  evaluationType:
    | EvaluationType.LANGUAGE_EXAM
    | EvaluationType.MATHEMATICS_EXAM
    | EvaluationType.ENGLISH_EXAM;

  // Campos específicos para evaluaciones académicas
  score?: number; // 0-100
  grade?: string; // A, B, C, D, F
}

// Tipo unión para todas las evaluaciones
export type Evaluation = AcademicEvaluation;

// Enums que corresponden exactamente con el backend
export enum EvaluationType {
  LANGUAGE_EXAM = 'LANGUAGE_EXAM',
  MATHEMATICS_EXAM = 'MATHEMATICS_EXAM',
  ENGLISH_EXAM = 'ENGLISH_EXAM',
  PSYCHOLOGICAL_INTERVIEW = 'PSYCHOLOGICAL_INTERVIEW',
  CYCLE_DIRECTOR_INTERVIEW = 'CYCLE_DIRECTOR_INTERVIEW',
  CYCLE_DIRECTOR_REPORT = 'CYCLE_DIRECTOR_REPORT',
  FAMILY_INTERVIEW = 'FAMILY_INTERVIEW'
}

export enum EvaluationStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  REVIEWED = 'REVIEWED',
  APPROVED = 'APPROVED'
}

// Labels para mostrar en la UI (en español)
export const EVALUATION_TYPE_LABELS: Record<EvaluationType, string> = {
  [EvaluationType.LANGUAGE_EXAM]: 'Examen de Lenguaje',
  [EvaluationType.MATHEMATICS_EXAM]: 'Examen de Matemática',
  [EvaluationType.ENGLISH_EXAM]: 'Examen de Inglés',
  [EvaluationType.PSYCHOLOGICAL_INTERVIEW]: 'Entrevista Psicológica',
  [EvaluationType.CYCLE_DIRECTOR_INTERVIEW]: 'Entrevista Director de Ciclo',
  [EvaluationType.CYCLE_DIRECTOR_REPORT]: 'Informe Director de Ciclo',
  [EvaluationType.FAMILY_INTERVIEW]: 'Entrevista Familiar'
};

export const EVALUATION_STATUS_LABELS: Record<EvaluationStatus, string> = {
  [EvaluationStatus.PENDING]: 'Pendiente',
  [EvaluationStatus.IN_PROGRESS]: 'En Progreso',
  [EvaluationStatus.COMPLETED]: 'Completada',
  [EvaluationStatus.REVIEWED]: 'Revisada',
  [EvaluationStatus.APPROVED]: 'Aprobada'
};

// Mapeo de tipos de evaluación a roles requeridos
export const EVALUATION_TYPE_TO_ROLE: Record<EvaluationType, string> = {
  [EvaluationType.LANGUAGE_EXAM]: 'TEACHER_LANGUAGE',
  [EvaluationType.MATHEMATICS_EXAM]: 'TEACHER_MATHEMATICS',
  [EvaluationType.ENGLISH_EXAM]: 'TEACHER_ENGLISH'
};

// Campos requeridos por tipo de evaluación
export const REQUIRED_FIELDS_BY_TYPE: Record<EvaluationType, string[]> = {
  [EvaluationType.LANGUAGE_EXAM]: ['score', 'grade', 'observations', 'strengths', 'areasForImprovement'],
  [EvaluationType.MATHEMATICS_EXAM]: ['score', 'grade', 'observations', 'strengths', 'areasForImprovement'],
  [EvaluationType.ENGLISH_EXAM]: ['score', 'grade', 'observations', 'strengths', 'areasForImprovement']
};

// Función para determinar el tipo específico de evaluación
export function isAcademicEvaluation(evaluation: Evaluation): evaluation is AcademicEvaluation {
  return [
    EvaluationType.LANGUAGE_EXAM,
    EvaluationType.MATHEMATICS_EXAM,
    EvaluationType.ENGLISH_EXAM
  ].includes(evaluation.evaluationType);
}

// Interface para crear nueva evaluación
export interface CreateEvaluationRequest {
  applicationId: number;
  evaluationType: EvaluationType;
  evaluatorId: number;
}

// Interface para actualizar evaluación
export interface UpdateEvaluationRequest {
  status?: EvaluationStatus;
  score?: number;
  grade?: string;
  observations?: string;
  strengths?: string;
  areasForImprovement?: string;
  recommendations?: string;
  evaluationDate?: string;
  completionDate?: string;
}

// Enums para programación de evaluaciones
export enum ScheduleType {
  GENERIC = 'GENERIC',
  INDIVIDUAL = 'INDIVIDUAL',
  GROUP = 'GROUP',
  MAKEUP = 'MAKEUP'
}

export enum ScheduleStatus {
  SCHEDULED = 'SCHEDULED',
  CONFIRMED = 'CONFIRMED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  RESCHEDULED = 'RESCHEDULED',
  NO_SHOW = 'NO_SHOW'
}

// Labels para programación
export const SCHEDULE_TYPE_LABELS: Record<ScheduleType, string> = {
  [ScheduleType.GENERIC]: 'Programación Genérica',
  [ScheduleType.INDIVIDUAL]: 'Programación Individual',
  [ScheduleType.GROUP]: 'Programación Grupal',
  [ScheduleType.MAKEUP]: 'Evaluación de Reposición'
};

export const SCHEDULE_STATUS_LABELS: Record<ScheduleStatus, string> = {
  [ScheduleStatus.SCHEDULED]: 'Programada',
  [ScheduleStatus.CONFIRMED]: 'Confirmada',
  [ScheduleStatus.COMPLETED]: 'Completada',
  [ScheduleStatus.CANCELLED]: 'Cancelada',
  [ScheduleStatus.RESCHEDULED]: 'Reprogramada',
  [ScheduleStatus.NO_SHOW]: 'No asistió'
};

// Interface para programación de evaluaciones
export interface EvaluationSchedule {
  id: number;
  evaluationType: EvaluationType;
  gradeLevel?: string;
  subject?: string;
  
  // Relaciones
  application?: {
    id: number;
    student: {
      firstName: string;
      lastName: string;
      gradeApplied: string;
    };
  };
  evaluator: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
  };
  
  // Programación
  scheduledDate: string;
  durationMinutes: number;
  location?: string;
  meetingLink?: string;
  instructions?: string;
  
  // Tipo y estado
  scheduleType: ScheduleType;
  status: ScheduleStatus;
  
  // Confirmación
  requiresConfirmation: boolean;
  confirmationDeadline?: string;
  confirmedAt?: string;
  confirmedBy?: {
    id: number;
    firstName: string;
    lastName: string;
  };
  
  // Información adicional
  attendeesRequired?: string;
  preparationMaterials?: string;
  
  // Fechas de sistema
  createdAt: string;
  updatedAt: string;
}

// DTOs para requests de programación
export interface CreateGenericScheduleRequest {
  evaluationType: EvaluationType;
  gradeLevel: string;
  subject?: string;
  evaluatorId: number;
  scheduledDate: string;
  durationMinutes: number;
  location?: string;
  instructions?: string;
}

export interface CreateIndividualScheduleRequest {
  applicationId: number;
  evaluationType: EvaluationType;
  evaluatorId: number;
  scheduledDate: string;
  durationMinutes: number;
  location?: string;
  instructions?: string;
  requiresConfirmation: boolean;
  attendeesRequired?: string;
}

export interface RescheduleRequest {
  newDate: string;
  reason: string;
}

// Interfaces para responses
export interface ScheduleResponse {
  success: boolean;
  message: string;
  schedule?: EvaluationSchedule;
}

export interface ScheduleListResponse {
  success: boolean;
  schedules: EvaluationSchedule[];
}

// Utilidades para programación de evaluaciones
export const ScheduleUtils = {
  // Verificar si es un examen académico
  isAcademicExam: (evaluationType: EvaluationType): boolean => {
    return [
      EvaluationType.LANGUAGE_EXAM,
      EvaluationType.MATHEMATICS_EXAM,
      EvaluationType.ENGLISH_EXAM
    ].includes(evaluationType);
  },

  // Obtener color del badge por tipo
  getEvaluationTypeColor: (evaluationType: EvaluationType): 'primary' | 'success' | 'warning' | 'error' | 'info' => {
    // Todas las evaluaciones académicas usan primary
    return 'primary';
  },

  // Obtener color del badge por estado
  getStatusColor: (status: ScheduleStatus): 'primary' | 'success' | 'warning' | 'error' | 'info' => {
    switch (status) {
      case ScheduleStatus.SCHEDULED:
        return 'primary';
      case ScheduleStatus.CONFIRMED:
        return 'info';
      case ScheduleStatus.COMPLETED:
        return 'success';
      case ScheduleStatus.CANCELLED:
      case ScheduleStatus.NO_SHOW:
        return 'error';
      case ScheduleStatus.RESCHEDULED:
        return 'warning';
      default:
        return 'info';
    }
  },

  // Formatear duración
  formatDuration: (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  },

  // Verificar si requiere confirmación
  requiresConfirmation: (schedule: EvaluationSchedule): boolean => {
    return schedule.requiresConfirmation && !schedule.confirmedAt;
  },

  // Verificar si está vencida la confirmación
  isConfirmationOverdue: (schedule: EvaluationSchedule): boolean => {
    if (!schedule.requiresConfirmation || schedule.confirmedAt) return false;
    if (!schedule.confirmationDeadline) return false;
    
    return new Date() > new Date(schedule.confirmationDeadline);
  },

  // Obtener tiempo restante para confirmar
  getTimeToConfirm: (schedule: EvaluationSchedule): string | null => {
    if (!schedule.requiresConfirmation || schedule.confirmedAt || !schedule.confirmationDeadline) {
      return null;
    }

    const now = new Date();
    const deadline = new Date(schedule.confirmationDeadline);
    const diff = deadline.getTime() - now.getTime();

    if (diff <= 0) return 'Vencido';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) return `${days} día(s)`;
    if (hours > 0) return `${hours} hora(s)`;
    return 'Menos de 1 hora';
  },

  // Agrupar horarios por fecha
  groupSchedulesByDate: (schedules: EvaluationSchedule[]): Record<string, EvaluationSchedule[]> => {
    return schedules.reduce((groups, schedule) => {
      const date = new Date(schedule.scheduledDate).toISOString().split('T')[0];
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(schedule);
      return groups;
    }, {} as Record<string, EvaluationSchedule[]>);
  },

  // Verificar conflictos de horario
  hasTimeConflict: (schedule1: EvaluationSchedule, schedule2: EvaluationSchedule): boolean => {
    const start1 = new Date(schedule1.scheduledDate);
    const end1 = new Date(start1.getTime() + schedule1.durationMinutes * 60000);
    
    const start2 = new Date(schedule2.scheduledDate);
    const end2 = new Date(start2.getTime() + schedule2.durationMinutes * 60000);

    return start1 < end2 && start2 < end1;
  }
};

// Constantes para programación
export const SCHEDULE_CONSTANTS = {
  MIN_DURATION_MINUTES: 30,
  MAX_DURATION_MINUTES: 180,
  DEFAULT_EXAM_DURATION: 90,
  DEFAULT_INTERVIEW_DURATION: 60,
  CONFIRMATION_DAYS_AHEAD: 2
};

// Constantes para validación
export const GRADE_OPTIONS = ['A', 'B', 'C', 'D', 'F'] as const;
export const MIN_SCORE = 0;
export const MAX_SCORE = 100;

// Utilidades para validación
export const ValidationRules = {
  score: (value: number) => value >= MIN_SCORE && value <= MAX_SCORE,
  grade: (value: string) => GRADE_OPTIONS.includes(value as any),
  requiredText: (value: string) => value && value.trim().length > 0,
  optionalText: (value?: string) => !value || value.trim().length > 0,
  durationMinutes: (value: number) => value >= SCHEDULE_CONSTANTS.MIN_DURATION_MINUTES && value <= SCHEDULE_CONSTANTS.MAX_DURATION_MINUTES
};

// Mensajes para la UI
export const EVALUATION_MESSAGES = {
  SCHEDULE_CREATED: 'Programación creada exitosamente',
  SCHEDULE_UPDATED: 'Programación actualizada exitosamente',
  SCHEDULE_CONFIRMED: 'Cita confirmada exitosamente',
  SCHEDULE_CANCELLED: 'Cita cancelada exitosamente',
  SCHEDULE_COMPLETED: 'Cita marcada como completada',
  CONFIRMATION_REQUIRED: 'Esta cita requiere confirmación',
  CONFIRMATION_OVERDUE: 'El plazo de confirmación ha vencido',
  TIME_CONFLICT: 'Existe un conflicto de horario',
  INVALID_DURATION: 'La duración debe estar entre 30 y 180 minutos'
} as const;