export interface GradeAvailability {
  id?: number;
  gradeLevel: string;
  hasVacancy: boolean;
  updatedAt?: string;
  updatedBy?: string;
}

export interface GradeAvailabilityUpdate {
  gradeLevel: string;
  hasVacancy: boolean;
}

export interface GradeAvailabilityResponse {
  success: boolean;
  data: GradeAvailability[];
  message?: string;
}

export const GRADE_LEVELS = [
  { value: 'PREKINDER', label: 'Prekínder' },
  { value: 'KINDER', label: 'Kínder' },
  { value: '1_BASICO', label: '1° Básico' },
  { value: '2_BASICO', label: '2° Básico' },
  { value: '3_BASICO', label: '3° Básico' },
  { value: '4_BASICO', label: '4° Básico' },
  { value: '5_BASICO', label: '5° Básico' },
  { value: '6_BASICO', label: '6° Básico' },
  { value: '7_BASICO', label: '7° Básico' },
  { value: '8_BASICO', label: '8° Básico' },
  { value: '1_MEDIO', label: 'I Medio' },
  { value: '2_MEDIO', label: 'II Medio' },
  { value: '3_MEDIO', label: 'III Medio' },
  { value: '4_MEDIO', label: 'IV Medio' },
] as const;

export type GradeLevel = typeof GRADE_LEVELS[number]['value'];
