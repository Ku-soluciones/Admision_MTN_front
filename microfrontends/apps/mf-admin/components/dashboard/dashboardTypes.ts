import {
  InterviewMode,
  InterviewStatus,
  InterviewType,
  InterviewerInfo,
  WeeklyOverviewAvailableSlot,
  WeeklyOverviewScheduledInterview
} from '../../types/interview';

export type CommandCenterViewMode = 'day' | 'week' | '2weeks' | 'month';

export interface SelectedSlot {
  date: string;
  time: string;
  availableInterviewers: InterviewerInfo[];
}

export interface QuickScheduleData {
  date: string;
  time: string;
  interviewer1Id: number;
  interviewer2Id: number;
  applicationId: number;
  type: InterviewType;
  mode: InterviewMode;
  location?: string;
}

export interface TimelineCellData {
  scheduled?: WeeklyOverviewScheduledInterview;
  available?: WeeklyOverviewAvailableSlot;
}

export const VIEW_LABELS: Record<CommandCenterViewMode, string> = {
  day: 'Dia',
  week: 'Semana',
  '2weeks': '2 Sem',
  month: 'Mes'
};

export const STATUS_STYLES: Record<string, string> = {
  [InterviewStatus.SCHEDULED]: 'bg-blue-100 border-blue-500 text-blue-900 shadow-sm',
  [InterviewStatus.CONFIRMED]: 'bg-cyan-100 border-cyan-500 text-cyan-900 shadow-sm',
  [InterviewStatus.COMPLETED]: 'bg-emerald-100 border-emerald-500 text-emerald-900 shadow-sm',
  [InterviewStatus.CANCELLED]: 'bg-red-100 border-red-500 text-red-900 opacity-60 line-through',
  [InterviewStatus.NO_SHOW]: 'bg-amber-100 border-amber-500 text-amber-900'
};

export const formatRole = (role: string): string => {
  const labels: Record<string, string> = {
    CYCLE_DIRECTOR: 'Dir. Ciclo',
    PSYCHOLOGIST: 'Psicologo',
    COORDINATOR: 'Coordinador',
    ENTREVISTADOR: 'Entrevistador'
  };
  return labels[role] || role.replace(/_/g, ' ');
};

export const getInterviewerInitials = (name: string): string => {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map(part => part[0]?.toUpperCase() || '').join('');
};

export const getPairLabel = (interviewers: InterviewerInfo[]): string => (
  interviewers.slice(0, 2).map(interviewer => interviewer.name.split(' ')[0]).join(' + ')
);
