// Tipos para gestión de entrevistas - Sistema de Admisión MTN

// Enum de estados de entrevista
export enum InterviewStatus {
  PENDING = 'PENDING',           // Pendiente (creada pero sin programar)
  SCHEDULED = 'SCHEDULED',       // Programada/Agendada (fecha y hora asignadas)
  CONFIRMED = 'CONFIRMED',       // Confirmada (familia confirmó asistencia)
  IN_PROGRESS = 'IN_PROGRESS',   // En progreso
  COMPLETED = 'COMPLETED',       // Realizada/Completada
  CANCELLED = 'CANCELLED',       // Cancelada
  NO_SHOW = 'NO_SHOW',          // No se presentaron
  RESCHEDULED = 'RESCHEDULED'    // Reprogramada
}

// Enum de tipos de entrevista
export enum InterviewType {
  FAMILY = 'FAMILY',
  CYCLE_DIRECTOR = 'CYCLE_DIRECTOR'
}

// Enum de modalidad de entrevista
export enum InterviewMode {
  IN_PERSON = 'IN_PERSON',
  VIRTUAL = 'VIRTUAL',
  HYBRID = 'HYBRID'
}

// Enum de resultado de entrevista
export enum InterviewResult {
  POSITIVE = 'POSITIVE',
  NEUTRAL = 'NEUTRAL',
  NEGATIVE = 'NEGATIVE',
  PENDING_REVIEW = 'PENDING_REVIEW',
  REQUIRES_FOLLOW_UP = 'REQUIRES_FOLLOW_UP'
}

// Labels para la UI
export const INTERVIEW_STATUS_LABELS: Record<InterviewStatus, string> = {
  [InterviewStatus.PENDING]: 'Pendiente',
  [InterviewStatus.SCHEDULED]: 'Agendada',
  [InterviewStatus.CONFIRMED]: 'Confirmada',
  [InterviewStatus.IN_PROGRESS]: 'En Progreso',
  [InterviewStatus.COMPLETED]: 'Realizada',
  [InterviewStatus.CANCELLED]: 'Cancelada',
  [InterviewStatus.NO_SHOW]: 'No Asistió',
  [InterviewStatus.RESCHEDULED]: 'Reprogramada'
};

export const INTERVIEW_TYPE_LABELS: Record<InterviewType, string> = {
  [InterviewType.FAMILY]: 'Familiar',
  [InterviewType.CYCLE_DIRECTOR]: 'Director de Ciclo'
};

export const INTERVIEW_MODE_LABELS: Record<InterviewMode, string> = {
  [InterviewMode.IN_PERSON]: 'Presencial',
  [InterviewMode.VIRTUAL]: 'Virtual',
  [InterviewMode.HYBRID]: 'Híbrida'
};

export const INTERVIEW_RESULT_LABELS: Record<InterviewResult, string> = {
  [InterviewResult.POSITIVE]: 'Positivo',
  [InterviewResult.NEUTRAL]: 'Neutro',
  [InterviewResult.NEGATIVE]: 'Negativo',
  [InterviewResult.PENDING_REVIEW]: 'Pendiente de Revisión',
  [InterviewResult.REQUIRES_FOLLOW_UP]: 'Requiere Seguimiento'
};

// Interface principal de Entrevista
export interface Interview {
  id: number;
  applicationId: number;
  interviewerId: number;
  interviewerName: string;
  secondInterviewerId?: number; // Segundo entrevistador (requerido para entrevistas familiares)
  secondInterviewerName?: string;
  studentName: string;
  parentNames: string;
  gradeApplied: string;
  status: InterviewStatus;
  type: InterviewType;
  mode: InterviewMode;
  scheduledDate: string;
  scheduledTime: string;
  fullScheduledDateTime?: string; // Fecha/hora completa ISO para display
  duration: number; // en minutos
  location?: string;
  virtualMeetingLink?: string;
  notes?: string;
  preparation?: string;
  result?: InterviewResult;
  score?: number;
  recommendations?: string;
  followUpRequired: boolean;
  followUpNotes?: string;
  createdAt: string;
  updatedAt?: string;
  completedAt?: string;
}

// DTOs para requests
export interface CreateInterviewRequest {
  applicationId: number;
  interviewerId: number;
  secondInterviewerId?: number; // Segundo entrevistador (requerido para FAMILY)
  type: InterviewType;
  mode: InterviewMode;
  scheduledDate: string;
  scheduledTime: string;
  duration: number;
  location?: string;
  virtualMeetingLink?: string;
  notes?: string;
  preparation?: string;
  status?: InterviewStatus; // Estado inicial - por defecto será SCHEDULED al programar
}

export interface UpdateInterviewRequest {
  interviewerId?: number;
  secondInterviewerId?: number; // Segundo entrevistador (requerido para FAMILY)
  status?: InterviewStatus;
  type?: InterviewType;
  mode?: InterviewMode;
  scheduledDate?: string;
  scheduledTime?: string;
  duration?: number;
  location?: string;
  virtualMeetingLink?: string;
  notes?: string;
  preparation?: string;
  result?: InterviewResult;
  score?: number;
  recommendations?: string;
  followUpRequired?: boolean;
  followUpNotes?: string;
}

export interface CompleteInterviewRequest {
  result: InterviewResult;
  score?: number;
  recommendations: string;
  followUpRequired: boolean;
  followUpNotes?: string;
}

// Interface para filtros de búsqueda
export interface InterviewFilters {
  search?: string;
  status?: InterviewStatus;
  type?: InterviewType;
  mode?: InterviewMode;
  interviewerId?: number;
  dateFrom?: string;
  dateTo?: string;
  result?: InterviewResult;
  gradeLevel?: string;
  page?: number;
  size?: number;
  sort?: string;
}

// Interface para respuesta paginada
export interface PagedInterviewResponse {
  content: Interview[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
  first: boolean;
  last: boolean;
  numberOfElements: number;
  empty: boolean;
}

// Interface para estadísticas de entrevistas
export interface InterviewStats {
  totalInterviews: number;
  scheduledInterviews: number;
  completedInterviews: number;
  cancelledInterviews: number;
  noShowInterviews: number;
  pendingInterviews: number;
  positiveResults: number;
  neutralResults: number;
  negativeResults: number;
  pendingReviewResults: number;
  requiresFollowUpResults: number;
  averageScore: number;
  completionRate: number;
  cancellationRate: number;
  successRate: number;
  statusDistribution: Record<string, number>;
  typeDistribution: Record<string, number>;
  modeDistribution: Record<string, number>;
  resultDistribution: Record<string, number>;
  monthlyTrends: Record<string, number>;
  followUpRequired: number;
  upcomingInterviews: number;
  overdueInterviews: number;
  averageDuration: number;
  popularTimeSlots: string[];
  interviewerPerformance: Array<{
    interviewerId: number;
    interviewerName: string;
    totalInterviews: number;
    completedInterviews: number;
    averageScore: number;
    completionRate: number;
  }>;
}

// Interface para calendario de entrevistas
export interface InterviewCalendarEvent {
  id: number;
  title: string;
  start: string;
  end: string;
  status: InterviewStatus;
  type: InterviewType;
  mode: InterviewMode;
  studentName: string;
  interviewerName: string;
  location?: string;
  className?: string;
}

// Interface para slots de tiempo disponibles
export interface AvailableTimeSlot {
  date: string;
  time: string;
  available: boolean;
  duration: number;
  interviewerId: number;
  interviewerName: string;
}

// Interface para notificaciones de entrevistas
export interface InterviewNotification {
  id: number;
  interviewId: number;
  type: 'REMINDER' | 'CONFIRMATION' | 'CANCELLATION' | 'RESCHEDULE';
  title: string;
  message: string;
  scheduledFor: string;
  sent: boolean;
  sentAt?: string;
  recipients: string[];
}

// Estados para formularios
export enum InterviewFormMode {
  CREATE = 'CREATE',
  EDIT = 'EDIT',
  VIEW = 'VIEW',
  COMPLETE = 'COMPLETE'
}

// Props para componentes
export interface InterviewTableProps {
  interviews: Interview[];
  isLoading?: boolean;
  onEdit: (interview: Interview) => void;
  onComplete: (interview: Interview) => void;
  onCancel: (interview: Interview) => void;
  onReschedule: (interview: Interview) => void;
  onView: (interview: Interview) => void;
  onSendNotification?: (interview: Interview, type: 'scheduled' | 'confirmed' | 'reminder') => void;
  onSendReminder?: (interview: Interview) => void;
  onRefreshDashboard?: () => void; // Callback to refresh parent dashboard data
  className?: string;
}

export interface InterviewFormProps {
  interview?: Interview;
  mode: InterviewFormMode;
  onSubmit: (data: CreateInterviewRequest | UpdateInterviewRequest | CompleteInterviewRequest) => void;
  onCancel: () => void;
  onEdit?: (interview: Interview) => void;
  isSubmitting?: boolean;
  className?: string;
}

export interface InterviewCalendarProps {
  interviews: Interview[];
  onSelectEvent: (interview: Interview) => void;
  onSelectSlot: (slotInfo: { start: Date; end: Date }) => void;
  onEventDrop?: (interview: Interview, newDate: Date) => void;
  className?: string;
}

export interface InterviewStatsProps {
  stats: InterviewStats;
  isLoading?: boolean;
  className?: string;
}

// Utilidades para entrevistas
export const InterviewUtils = {
  // Obtener color del estado
  getStatusColor: (status: InterviewStatus): 'primary' | 'success' | 'warning' | 'error' | 'info' => {
    switch (status) {
      case InterviewStatus.PENDING:
        return 'warning';
      case InterviewStatus.SCHEDULED:
        return 'info';
      case InterviewStatus.CONFIRMED:
        return 'primary';
      case InterviewStatus.IN_PROGRESS:
        return 'warning';
      case InterviewStatus.COMPLETED:
        return 'success';
      case InterviewStatus.CANCELLED:
      case InterviewStatus.NO_SHOW:
        return 'error';
      case InterviewStatus.RESCHEDULED:
        return 'warning';
      default:
        return 'info';
    }
  },

  // Validar transiciones de estado válidas
  canTransitionTo: (currentStatus: InterviewStatus, newStatus: InterviewStatus): boolean => {
    const validTransitions: Record<InterviewStatus, InterviewStatus[]> = {
      [InterviewStatus.PENDING]: [InterviewStatus.SCHEDULED, InterviewStatus.CANCELLED],
      [InterviewStatus.SCHEDULED]: [
        InterviewStatus.CONFIRMED, 
        InterviewStatus.CANCELLED, 
        InterviewStatus.RESCHEDULED,
        InterviewStatus.NO_SHOW,
        InterviewStatus.IN_PROGRESS
      ],
      [InterviewStatus.CONFIRMED]: [
        InterviewStatus.IN_PROGRESS, 
        InterviewStatus.CANCELLED, 
        InterviewStatus.RESCHEDULED,
        InterviewStatus.NO_SHOW
      ],
      [InterviewStatus.IN_PROGRESS]: [InterviewStatus.COMPLETED, InterviewStatus.CANCELLED],
      [InterviewStatus.COMPLETED]: [], // Estado final
      [InterviewStatus.CANCELLED]: [InterviewStatus.SCHEDULED], // Puede reagendarse
      [InterviewStatus.NO_SHOW]: [InterviewStatus.RESCHEDULED], // Puede reprogramarse
      [InterviewStatus.RESCHEDULED]: [InterviewStatus.SCHEDULED] // Vuelve a programada
    };

    return validTransitions[currentStatus]?.includes(newStatus) || false;
  },

  // Obtener próximas transiciones válidas
  getValidTransitions: (currentStatus: InterviewStatus): InterviewStatus[] => {
    const validTransitions: Record<InterviewStatus, InterviewStatus[]> = {
      [InterviewStatus.PENDING]: [InterviewStatus.SCHEDULED],
      [InterviewStatus.SCHEDULED]: [InterviewStatus.CONFIRMED, InterviewStatus.CANCELLED, InterviewStatus.RESCHEDULED],
      [InterviewStatus.CONFIRMED]: [InterviewStatus.IN_PROGRESS, InterviewStatus.CANCELLED, InterviewStatus.NO_SHOW],
      [InterviewStatus.IN_PROGRESS]: [InterviewStatus.COMPLETED],
      [InterviewStatus.COMPLETED]: [],
      [InterviewStatus.CANCELLED]: [InterviewStatus.SCHEDULED],
      [InterviewStatus.NO_SHOW]: [InterviewStatus.RESCHEDULED],
      [InterviewStatus.RESCHEDULED]: [InterviewStatus.SCHEDULED]
    };

    return validTransitions[currentStatus] || [];
  },

  // Obtener color del resultado
  getResultColor: (result: InterviewResult): 'success' | 'warning' | 'error' | 'info' => {
    switch (result) {
      case InterviewResult.POSITIVE:
        return 'success';
      case InterviewResult.NEUTRAL:
        return 'info';
      case InterviewResult.NEGATIVE:
        return 'error';
      case InterviewResult.PENDING_REVIEW:
      case InterviewResult.REQUIRES_FOLLOW_UP:
        return 'warning';
      default:
        return 'info';
    }
  },

  // Formatear fecha y hora
  formatDateTime: (date: string, time: string): string => {
    const dateObj = new Date(`${date}T${time}`);
    return dateObj.toLocaleString('es-CL', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  },

  // Obtener duración formateada
  formatDuration: (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours > 0) {
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }
    return `${mins}m`;
  },

  // Verificar si una entrevista está próxima (próximas 24 horas)
  isUpcoming: (date: string, time: string): boolean => {
    const interviewDateTime = new Date(`${date}T${time}`);
    const now = new Date();
    const diffHours = (interviewDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    return diffHours >= 0 && diffHours <= 24;
  },

  // Verificar si una entrevista está vencida
  isOverdue: (date: string, time: string, status: InterviewStatus): boolean => {
    if (status === InterviewStatus.COMPLETED || status === InterviewStatus.CANCELLED) {
      return false;
    }
    const interviewDateTime = new Date(`${date}T${time}`);
    return interviewDateTime < new Date();
  },

  // Obtener el siguiente estado posible
  getNextPossibleStatuses: (currentStatus: InterviewStatus): InterviewStatus[] => {
    switch (currentStatus) {
      case InterviewStatus.SCHEDULED:
        return [InterviewStatus.CONFIRMED, InterviewStatus.CANCELLED, InterviewStatus.RESCHEDULED];
      case InterviewStatus.CONFIRMED:
        return [InterviewStatus.IN_PROGRESS, InterviewStatus.CANCELLED, InterviewStatus.NO_SHOW, InterviewStatus.RESCHEDULED];
      case InterviewStatus.IN_PROGRESS:
        return [InterviewStatus.COMPLETED, InterviewStatus.CANCELLED];
      case InterviewStatus.RESCHEDULED:
        return [InterviewStatus.SCHEDULED, InterviewStatus.CANCELLED];
      default:
        return [];
    }
  },

  // Validar datos de entrevista
  validateInterviewData: (data: CreateInterviewRequest | UpdateInterviewRequest): string[] => {
    const errors: string[] = [];

    if ('scheduledDate' in data && data.scheduledDate) {
      const interviewDate = new Date(data.scheduledDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (interviewDate < today) {
        errors.push('La fecha de entrevista no puede ser anterior a hoy');
      }
    }

    if ('duration' in data && data.duration !== undefined) {
      if (data.duration < 15 || data.duration > 180) {
        errors.push('La duración debe estar entre 15 y 180 minutos');
      }
    }

    if ('virtualMeetingLink' in data && data.mode === InterviewMode.VIRTUAL && !data.virtualMeetingLink) {
      errors.push('El enlace de reunión virtual es requerido para entrevistas virtuales');
    }

    if ('location' in data && data.mode === InterviewMode.IN_PERSON && !data.location) {
      errors.push('La ubicación es requerida para entrevistas presenciales');
    }

    return errors;
  },

  // Generar título para evento de calendario
  getCalendarEventTitle: (interview: Interview): string => {
    return `${interview.studentName} - ${INTERVIEW_TYPE_LABELS[interview.type]}`;
  },

  // Obtener descripción completa de entrevista
  getFullDescription: (interview: Interview): string => {
    const parts = [
      `Estudiante: ${interview.studentName}`,
      `Tipo: ${INTERVIEW_TYPE_LABELS[interview.type]}`,
      `Modalidad: ${INTERVIEW_MODE_LABELS[interview.mode]}`,
      `Entrevistador: ${interview.interviewerName}`,
      `Duración: ${InterviewUtils.formatDuration(interview.duration)}`
    ];

    if (interview.location) {
      parts.push(`Lugar: ${interview.location}`);
    }

    if (interview.virtualMeetingLink) {
      parts.push(`Enlace: ${interview.virtualMeetingLink}`);
    }

    return parts.join('\n');
  }
};

// Constantes para validación
export const INTERVIEW_VALIDATION = {
  DURATION: {
    MIN: 15,
    MAX: 180,
    DEFAULT: 30
  },
  NOTES: {
    MAX_LENGTH: 1000
  },
  RECOMMENDATIONS: {
    MAX_LENGTH: 2000
  },
  SCORE: {
    MIN: 1,
    MAX: 10
  }
};

// Constantes para configuración
export const INTERVIEW_CONFIG = {
  DEFAULT_TIME_SLOTS: [
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '14:00', '14:30', '15:00', '15:30', '16:00', '16:30'
  ],
  REMINDER_HOURS: [24, 2], // Recordatorios a 24h y 2h antes
  COLORS: {
    [InterviewStatus.SCHEDULED]: '#3B82F6',
    [InterviewStatus.CONFIRMED]: '#10B981',
    [InterviewStatus.IN_PROGRESS]: '#F59E0B',
    [InterviewStatus.COMPLETED]: '#059669',
    [InterviewStatus.CANCELLED]: '#EF4444',
    [InterviewStatus.NO_SHOW]: '#DC2626',
    [InterviewStatus.RESCHEDULED]: '#F97316'
  }
};