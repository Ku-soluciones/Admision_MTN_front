/**
 * TypeScript types for APPLICATIONS Service
 * Generated for MTN Admission System
 */

export interface ApplicationsResponse<T = any> {
  data: T;
  message?: string;
  success: boolean;
  timestamp: string;
}

export interface Application {
  id: number;
  studentId: number;
  fatherId?: number;
  motherId?: number;
  supporterId?: number;
  guardianId?: number;
  applicantUserId: number;
  status: 'PENDING' | 'UNDER_REVIEW' | 'DOCUMENTS_REQUESTED' | 'INTERVIEW_SCHEDULED' | 'EXAM_SCHEDULED' | 'APPROVED' | 'REJECTED' | 'WAITLIST' | 'ARCHIVED';
  submissionDate: string;
  createdAt: string;
  updatedAt: string;
  student?: Student;
  father?: Parent;
  mother?: Parent;
  supporter?: Supporter;
  guardian?: Guardian;
  evaluations?: any[]; // Will be typed when evaluations are imported
  interviews?: any[]; // Will be typed when interviews are imported  
  documents?: any[]; // Will be typed when files are imported
}

export interface Student {
  id: number;
  firstName: string;
  lastName: string;
  rut: string;
  birthDate: string;
  gradeApplying: string;
  currentSchool?: string;
  specialNeeds: boolean;
  specialNeedsDescription?: string;
  age?: number;
  targetSchool?: 'MONTE_TABOR' | 'NAZARET';
  isEmployeeChild?: boolean;
  employeeParentName?: string;
  isAlumniChild?: boolean;
  alumniParentYear?: number;
  isInclusionStudent?: boolean;
  inclusionType?: string;
  inclusionNotes?: string;
}

export interface Parent {
  id: number;
  fullName: string;
  rut: string;
  email: string;
  phone: string;
  address: string;
  occupation: string;
  relationship: 'FATHER' | 'MOTHER';
}

export interface Guardian {
  id: number;
  fullName: string;
  rut: string;
  email: string;
  phone: string;
  relationship: string;
  address?: string;
}

export interface Supporter {
  id: number;
  fullName: string;
  rut: string;
  email: string;
  phone: string;
  relationship: string;
  address?: string;
}

export interface CreateApplicationRequest {
  studentId: number;
  fatherId?: number;
  motherId?: number;
  supporterId?: number;
  guardianId?: number;
  applicantUserId: number;
}

export interface UpdateApplicationRequest {
  status?: Application['status'];
  notes?: string;
}

export interface ApplicationSearchParams {
  status?: Application['status'];
  gradeApplying?: string;
  targetSchool?: 'MONTE_TABOR' | 'NAZARET';
  submissionDateFrom?: string;
  submissionDateTo?: string;
  studentName?: string;
  specialCategory?: 'employee' | 'alumni' | 'inclusion' | 'regular';
  page?: number;
  size?: number;
  sort?: string;
  direction?: 'asc' | 'desc';
}

export interface ApplicationStatistics {
  totalApplications: number;
  pendingApplications: number;
  approvedApplications: number;
  rejectedApplications: number;
  interviewsScheduled: number;
  examsScheduled: number;
  averageProcessingDays: number;
}

export interface PaginatedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
  numberOfElements?: number;
  empty?: boolean;
}