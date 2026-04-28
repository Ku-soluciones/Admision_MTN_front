/**
 * Advanced Search API Types
 * Sistema de Admisión MTN - Búsqueda Avanzada
 */

export interface AdvancedSearchParams {
  // General search
  search?: string;
  studentName?: string;
  studentRut?: string;

  // Status filters
  status?: string | string[]; // comma-separated or array

  // Grade and school
  gradeApplied?: string;
  academicYear?: number;
  schoolApplied?: 'MONTE_TABOR' | 'NAZARET';

  // Document filters
  documentsComplete?: boolean;

  // Special needs
  hasSpecialNeeds?: boolean;

  // Parent filters
  parentName?: string;
  parentEmail?: string;

  // Evaluation filters
  evaluationStatus?: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  minScore?: number;
  maxScore?: number;

  // Date range filters
  submissionDateFrom?: string; // ISO date
  submissionDateTo?: string; // ISO date
  interviewDateFrom?: string; // ISO date
  interviewDateTo?: string; // ISO date

  // Sorting
  sortBy?: 'created_at' | 'submission_date' | 'student_first_name' | 'status' | 'grade_applied';
  sortOrder?: 'ASC' | 'DESC';

  // Pagination
  page?: number;
  limit?: number;
}

export interface SearchResult {
  id: number;
  status: string;
  submission_date: string | null;
  application_year: number;
  student_first_name: string;
  student_paternal_last_name: string;
  student_maternal_last_name: string;
  student_rut: string;
  grade_applied: string;
  has_special_needs: boolean;
  father_name: string | null;
  mother_name: string | null;
  document_count: number;
  avg_evaluation_score: number | null;
}

export interface SearchResponse {
  results: SearchResult[];
  totalCount: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface SavedSearch {
  id: string;
  name: string;
  filters: AdvancedSearchParams;
  createdAt: string;
  lastUsed: string;
  useCount: number;
}

export interface SearchFilterOptions {
  statuses: Array<{ value: string; label: string; count?: number }>;
  grades: Array<{ value: string; label: string; count?: number }>;
  academicYears: Array<{ value: number; label: string; count?: number }>;
  schools: Array<{ value: string; label: string }>;
  evaluationStatuses: Array<{ value: string; label: string }>;
}
