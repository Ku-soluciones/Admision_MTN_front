/**
 * TypeScript types for INTERVIEWS Service
 * Generated for MTN Admission System
 */

export interface InterviewsResponse<T = any> {
  data: T;
  message?: string;
  success: boolean;
  timestamp: string;
}

export interface Interview {
  id: number;
  applicationId: number;
  interviewerId: number;
  scheduledDate: string;
  location: string;
  type: 'FAMILY' | 'STUDENT' | 'BOTH' | 'DIRECTOR';
  status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'RESCHEDULED' | 'NO_SHOW';
  duration?: number;
  notes?: string;
  recommendations?: string;
  score?: number;
  maxScore?: number;
  attendees?: string[];
  createdAt: string;
  updatedAt: string;
  interviewer?: InterviewerInfo;
  application?: ApplicationBasicInfo;
}

export interface InterviewerInfo {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: 'CYCLE_DIRECTOR' | 'PSYCHOLOGIST' | 'COORDINATOR' | 'ADMIN';
  specialization?: string;
}

export interface ApplicationBasicInfo {
  id: number;
  studentName: string;
  parentNames: string[];
  gradeApplying: string;
  status: string;
  contactEmail: string;
  contactPhone: string;
}

export interface ScheduleInterviewRequest {
  applicationId: number;
  interviewerId: number;
  scheduledDate: string;
  location: string;
  type: Interview['type'];
  duration?: number;
  notes?: string;
}

export interface UpdateInterviewRequest {
  scheduledDate?: string;
  location?: string;
  status?: Interview['status'];
  duration?: number;
  notes?: string;
  recommendations?: string;
  score?: number;
  maxScore?: number;
  attendees?: string[];
}

export interface InterviewSearchParams {
  type?: Interview['type'];
  status?: Interview['status'];
  interviewerId?: number;
  applicationId?: number;
  scheduledDateFrom?: string;
  scheduledDateTo?: string;
  location?: string;
  studentName?: string;
  gradeApplying?: string;
  page?: number;
  size?: number;
  sort?: string;
  direction?: 'asc' | 'desc';
}

export interface InterviewStatistics {
  totalInterviews: number;
  scheduledInterviews: number;
  completedInterviews: number;
  cancelledInterviews: number;
  noShowInterviews: number;
  averageScore: number;
  averageDuration: number;
  interviewsByType: Record<string, number>;
  interviewsByLocation: Record<string, number>;
}

export interface InterviewSlot {
  date: string;
  time: string;
  duration: number;
  location: string;
  interviewerId: number;
  interviewerName: string;
  available: boolean;
}

export interface InterviewNotification {
  recipientEmail: string;
  recipientName: string;
  type: 'SCHEDULED' | 'REMINDER' | 'RESCHEDULED' | 'CANCELLED';
  templateId?: string;
  customMessage?: string;
  includeCalendarEvent: boolean;
}