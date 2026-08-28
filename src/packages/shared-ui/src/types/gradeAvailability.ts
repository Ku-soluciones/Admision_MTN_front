import { GRADE_LEVEL_OPTIONS } from '../../../shared-utils/src/gradeLevels';

export interface GradeAvailability {
  id?: number;
  gradeLevel: string;
  hasVacancyM: boolean;
  hasVacancyF: boolean;
  updatedAt?: string;
  updatedBy?: string;
}

export interface GradeAvailabilityUpdate {
  gradeLevel: string;
  hasVacancyM: boolean;
  hasVacancyF: boolean;
}

export interface GradeAvailabilityResponse {
  success: boolean;
  data: GradeAvailability[];
  message?: string;
}

export const GRADE_LEVELS = GRADE_LEVEL_OPTIONS;

export type GradeLevel = typeof GRADE_LEVELS[number]['value'];
