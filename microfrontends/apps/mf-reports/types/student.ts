/**
 * Student Types
 * Tipos relacionados con estudiantes en el sistema de admisión
 */

export enum GradeLevel {
  PRE_KINDER = 'PRE_KINDER',
  KINDER = 'KINDER',
  PRIMERO_BASICO = '1_BASICO',
  SEGUNDO_BASICO = '2_BASICO',
  TERCERO_BASICO = '3_BASICO',
  CUARTO_BASICO = '4_BASICO',
  QUINTO_BASICO = '5_BASICO',
  SEXTO_BASICO = '6_BASICO',
  SEPTIMO_BASICO = '7_BASICO',
  OCTAVO_BASICO = '8_BASICO',
  PRIMERO_MEDIO = '1_MEDIO',
  SEGUNDO_MEDIO = '2_MEDIO',
  TERCERO_MEDIO = '3_MEDIO',
  CUARTO_MEDIO = '4_MEDIO'
}

export enum AdmissionPreference {
  NONE = 'NONE',
  SIBLING = 'SIBLING',
  ALUMNI = 'ALUMNI',
  STAFF = 'STAFF',
  COMMUNITY = 'COMMUNITY'
}

export interface Student {
  id: number;
  firstName: string;
  paternalLastName: string;
  maternalLastName?: string;
  fullName: string;
  rut?: string;
  birthDate?: string;
  age?: number;
  gradeApplied?: GradeLevel;
  currentSchool?: string;
  previousSchools?: string[];
  address?: string;
  email?: string;
  phone?: string;
  pais?: string;
  region?: string;
  comuna?: string;
  admissionPreference?: AdmissionPreference;
  medicalConditions?: string;
  specialNeeds?: string;
  additionalNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateStudentRequest {
  firstName: string;
  paternalLastName: string;
  maternalLastName?: string;
  rut?: string;
  birthDate?: string;
  gradeApplied?: GradeLevel;
  currentSchool?: string;
  previousSchools?: string[];
  address?: string;
  email?: string;
  phone?: string;
  pais?: string;
  region?: string;
  comuna?: string;
  admissionPreference?: AdmissionPreference;
  medicalConditions?: string;
  specialNeeds?: string;
  additionalNotes?: string;
}

export interface UpdateStudentRequest {
  firstName?: string;
  paternalLastName?: string;
  maternalLastName?: string;
  rut?: string;
  birthDate?: string;
  gradeApplied?: GradeLevel;
  currentSchool?: string;
  previousSchools?: string[];
  address?: string;
  email?: string;
  phone?: string;
  pais?: string;
  region?: string;
  comuna?: string;
  admissionPreference?: AdmissionPreference;
  medicalConditions?: string;
  specialNeeds?: string;
  additionalNotes?: string;
}

export interface StudentFilters {
  page?: number;
  limit?: number;
  grade?: GradeLevel;
  search?: string;
  admissionPreference?: AdmissionPreference;
}

export interface StudentsResponse {
  students: Student[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface StudentStatistics {
  grade: string;
  count: number;
  averageAge?: number;
}

export interface ValidateRutRequest {
  rut: string;
}

export interface ValidateRutResponse {
  isValid: boolean;
  formatted?: string;
}
