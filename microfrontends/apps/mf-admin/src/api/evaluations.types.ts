/**
 * TypeScript types for EVALUATIONS Service
 * Generated for MTN Admission System
 */

export interface EvaluationsResponse<T = any> {
  data: T;
  message?: string;
  success: boolean;
  timestamp: string;
}

export interface Evaluation {
  id: number;
  applicationId: number;
  evaluatorId: number;
  type: 'ACADEMIC' | 'PSYCHOLOGICAL' | 'INTERVIEW' | 'DIRECTOR_INTERVIEW';
  subject?: 'MATHEMATICS' | 'LANGUAGE' | 'ENGLISH' | 'GENERAL' | 'ALL_SUBJECTS';
  educationalLevel?: 'PRESCHOOL' | 'BASIC' | 'HIGH_SCHOOL' | 'ALL_LEVELS';
  score?: number;
  maxScore?: number;
  percentage?: number;
  comments?: string;
  recommendations?: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'RESCHEDULED';
  scheduledDate?: string;
  completedDate?: string;
  createdAt: string;
  updatedAt: string;
  evaluator?: EvaluatorInfo;
  application?: EvaluationApplicationInfo;
}

export interface EvaluatorInfo {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: 'TEACHER' | 'PSYCHOLOGIST' | 'CYCLE_DIRECTOR' | 'COORDINATOR';
  subject?: string;
  educationalLevel?: string;
}

export interface EvaluationApplicationInfo {
  id: number;
  studentName: string;
  gradeApplying: string;
  status: string;
}

export interface CreateEvaluationRequest {
  applicationId: number;
  evaluatorId: number;
  type: Evaluation['type'];
  subject?: Evaluation['subject'];
  educationalLevel?: Evaluation['educationalLevel'];
  scheduledDate?: string;
  comments?: string;
}

export interface UpdateEvaluationRequest {
  score?: number;
  maxScore?: number;
  comments?: string;
  recommendations?: string;
  status?: Evaluation['status'];
  scheduledDate?: string;
  completedDate?: string;
}

export interface EvaluationSearchParams {
  type?: Evaluation['type'];
  subject?: Evaluation['subject'];
  educationalLevel?: Evaluation['educationalLevel'];
  status?: Evaluation['status'];
  evaluatorId?: number;
  applicationId?: number;
  scheduledDateFrom?: string;
  scheduledDateTo?: string;
  completedDateFrom?: string;
  completedDateTo?: string;
  minScore?: number;
  maxScore?: number;
  page?: number;
  size?: number;
  sort?: string;
  direction?: 'asc' | 'desc';
}

export interface EvaluationStatistics {
  totalEvaluations: number;
  completedEvaluations: number;
  pendingEvaluations: number;
  inProgressEvaluations: number;
  averageScore: number;
  averageCompletionDays: number;
  evaluationsByType: Record<string, number>;
  evaluationsBySubject: Record<string, number>;
}

export interface EvaluatorAssignment {
  evaluatorId: number;
  evaluatorName: string;
  specialization: string;
  currentWorkload: number;
  maxCapacity: number;
  availabilityScore: number;
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