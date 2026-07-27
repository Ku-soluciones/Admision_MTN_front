
export enum ApplicationStatus {
    DRAFT = 'Borrador',
    SUBMITTED = 'En Revisión',
    INTERVIEW_SCHEDULED = 'Entrevista Agendada',
    ACCEPTED = 'Aceptado',
    REJECTED = 'Rechazado',
    WAITLIST = 'Lista de Espera'
}

export interface Document {
    id: string;
    name: string;
    status: 'pending' | 'submitted' | 'approved' | 'rejected';
    notes?: string;
}

export interface Applicant {
    id: string;
    firstName: string;
    lastName: string;
    birthDate: string;
    grade: string;
}

export interface Application {
    id: string;
    applicant: Applicant;
    status: ApplicationStatus;
    submissionDate: string;
    documents: Document[];
    interviewDate?: string;
}

export enum ExamStatus {
    NOT_STARTED = 'No Iniciado',
    SCHEDULED = 'Programado',
    IN_PROGRESS = 'En Progreso',
    COMPLETED = 'Completado',
    MISSED = 'No Asistió'
}

export interface ExamSchedule {
    id: string;
    date: string;
    startTime: string;
    endTime: string;
    location: string;
    maxCapacity: number;
    currentEnrollment: number;
}

export interface StudyMaterial {
    id: string;
    title: string;
    description: string;
    type: 'pdf' | 'video' | 'link' | 'document';
    url: string;
    downloadable: boolean;
}

export interface ExamSubject {
    id: string;
    name: string;
    description: string;
    duration: number; // in minutes
    totalQuestions: number;
    passingScore: number;
    instructions: string[];
    studyMaterials: StudyMaterial[];
    schedules: ExamSchedule[];
    topics: string[];
}

export interface StudentExam {
    id: string;
    studentId: string;
    subjectId: string;
    scheduleId: string;
    status: ExamStatus;
    score?: number;
    completedAt?: string;
    timeSpent?: number; // in minutes
    evaluation?: ExamEvaluation;
}

// UserRole se importa desde types/user.ts para evitar duplicaciones
// y mantener consistencia con el backend

// Enum para especialidades de psicólogos
export enum PsychologySpecialty {
    EDUCATIONAL = 'EDUCATIONAL',
    CLINICAL = 'CLINICAL', 
    DEVELOPMENTAL = 'DEVELOPMENTAL',
    COGNITIVE = 'COGNITIVE'
}

// Enum para niveles de kinder
export enum KinderLevel {
    PREKINDER = 'PREKINDER',
    KINDER = 'KINDER'
}

// Enum para tipos de personal de apoyo
export enum SupportStaffType {
    ADMINISTRATIVE = 'ADMINISTRATIVE',
    TECHNICAL = 'TECHNICAL',
    ACADEMIC_COORDINATOR = 'ACADEMIC_COORDINATOR',
    STUDENT_SERVICES = 'STUDENT_SERVICES',
    IT_SUPPORT = 'IT_SUPPORT'
}

// Interface base para todos los usuarios
export interface BaseUser {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    role: UserRole;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    phone?: string;
    profileImage?: string;
}

export interface Professor extends BaseUser {
    role: UserRole.PROFESSOR;
    subjects: string[]; // Solo Matemática, Lenguaje, Inglés
    assignedGrades: string[]; // Array of grade levels assigned (e.g., ['prekinder', 'kinder', '1basico'])
    department: string;
    isAdmin?: boolean; // Para permisos de administrador
    yearsOfExperience?: number;
    qualifications?: string[];
}

export interface KinderTeacher extends BaseUser {
    role: UserRole.KINDER_TEACHER;
    assignedLevel: 'prekinder' | 'kinder'; // Solo prekinder o kinder
    specializations?: string[]; // Ej: "Desarrollo Motor", "Lenguaje Inicial"
    yearsOfExperience?: number;
    qualifications?: string[];
}

export interface Psychologist extends BaseUser {
    role: UserRole.PSYCHOLOGIST;
    specialty: PsychologySpecialty;
    licenseNumber: string;
    assignedGrades: string[]; // Niveles que puede evaluar
    canConductInterviews: boolean;
    canPerformPsychologicalEvaluations: boolean;
    specializedAreas: string[]; // Areas específicas como "Dificultades de Aprendizaje", "Trastornos del Desarrollo"
}

export interface SupportStaff extends BaseUser {
    role: UserRole.SUPPORT_STAFF;
    staffType: SupportStaffType;
    department: string;
    responsibilities: string[];
    canAccessReports: boolean;
    canManageSchedules: boolean;
}

export interface ExamEvaluation {
    id: string;
    examId: string;
    professorId: string;
    evaluatedAt: string;
    
    // Calificación
    score: number; // Puntaje obtenido
    maxScore: number; // Puntaje máximo
    percentage: number; // Porcentaje
    grade: string; // Nota (1.0 - 7.0 o sistema de letras)
    
    // Evaluación cualitativa
    strengths: string[]; // Fortalezas
    weaknesses: string[]; // Debilidades
    examAdaptation: string; // Adecuación al examen
    behaviorObservations: string; // Comportamiento durante el examen
    generalComments: string; // Comentarios generales
    improvementAreas: string[]; // Elementos a mejorar
    
    // Evaluación por áreas específicas
    areaScores?: AreaScore[];
    
    // Recomendaciones
    recommendations: string;
    requiresFollowUp: boolean;
    followUpNotes?: string;
}

export interface AreaScore {
    area: string; // e.g., "Comprensión Lectora", "Álgebra", "Grammar"
    score: number;
    maxScore: number;
    percentage: number;
    comments?: string;
}

export enum EvaluationStatus {
    PENDING = 'Pendiente',
    IN_PROGRESS = 'En Evaluación',
    COMPLETED = 'Completada',
    REVIEWED = 'Revisada'
}

export interface StudentProfile {
    id: string;
    firstName: string;
    lastName: string;
    grade: string;
    birthDate: string;
    applicationId: string;
    examResults: StudentExam[];
    overallEvaluation?: string;
}

// Union type para todos los tipos de usuario
export type User = Professor | KinderTeacher | Psychologist | SupportStaff;

// Interface para formulario de creación de usuarios
export interface CreateUserRequest {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    role: UserRole;
    phone?: string;
    
    // Campos específicos para profesores (solo Matemática, Lenguaje, Inglés)
    subjects?: string[];
    assignedGrades?: string[];
    department?: string;
    yearsOfExperience?: number;
    qualifications?: string[];
    
    // Campos específicos para personal de kinder
    assignedLevel?: KinderLevel;
    specializations?: string[];
    
    // Campos específicos para psicólogos
    specialty?: PsychologySpecialty;
    licenseNumber?: string;
    canConductInterviews?: boolean;
    canPerformPsychologicalEvaluations?: boolean;
    specializedAreas?: string[];
    
    // Campos específicos para personal de apoyo
    staffType?: SupportStaffType;
    responsibilities?: string[];
    canAccessReports?: boolean;
    canManageSchedules?: boolean;
}

// Mapas para mostrar labels en español
export const PsychologySpecialtyLabels = {
    [PsychologySpecialty.EDUCATIONAL]: 'Psicología Educacional',
    [PsychologySpecialty.CLINICAL]: 'Psicología Clínica',
    [PsychologySpecialty.DEVELOPMENTAL]: 'Psicología del Desarrollo',
    [PsychologySpecialty.COGNITIVE]: 'Psicología Cognitiva'
};

export const SupportStaffTypeLabels = {
    [SupportStaffType.ADMINISTRATIVE]: 'Administrativo',
    [SupportStaffType.TECHNICAL]: 'Técnico',
    [SupportStaffType.ACADEMIC_COORDINATOR]: 'Coordinador Académico',
    [SupportStaffType.STUDENT_SERVICES]: 'Servicios Estudiantiles',
    [SupportStaffType.IT_SUPPORT]: 'Soporte TI'
};

export const KinderLevelLabels = {
    [KinderLevel.PREKINDER]: 'Pre-Kinder',
    [KinderLevel.KINDER]: 'Kinder'
};
