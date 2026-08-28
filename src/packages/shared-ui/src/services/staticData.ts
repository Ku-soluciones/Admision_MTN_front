// Datos estáticos necesarios para el sistema - reemplazo temporal de archivos mock eliminados

import { GRADE_LEVEL_OPTIONS, toBackendGradeLevel } from '../../../shared-utils/src/gradeLevels';

export interface ExamSubject {
  id: string;
  name: string;
  description: string;
  educationalLevel: string[];
  timeLimit: number; // en minutos
  totalQuestions: number;
}

export interface EducationalLevel {
  id: string;
  name: string;
  description: string;
  grades: string[];
}

export interface ProfessorData {
  id: number;
  name: string;
  email: string;
  role: string;
  subject?: string;
  educationalLevel?: string;
}

// Datos estáticos de niveles educacionales
export const educationalLevels: EducationalLevel[] = [
  {
    id: 'PRESCHOOL',
    name: 'Preescolar',
    description: 'Educación Preescolar',
    grades: ['Prekínder', 'Kínder']
  },
  {
    id: 'BASIC',
    name: 'Educación Básica',
    description: 'Educación Básica',
    grades: ['1 Básico', '2 Básico', '3 Básico', '4 Básico', '5 Básico', '6 Básico', '7 Básico', '8 Básico']
  },
  {
    id: 'HIGH_SCHOOL',
    name: 'Educación Media',
    description: 'Educación Media',
    grades: ['1 Medio', '2 Medio', '3 Medio', '4 Medio']
  }
];

// Para compatibilidad con ApplicationForm (formato value/label)
export const educationalLevelsForForm = GRADE_LEVEL_OPTIONS;

// Datos estáticos de materias de examen
export const examSubjects: any[] = [
  {
    id: 'MATH',
    name: 'Matemática',
    description: 'Evaluación de conocimientos matemáticos básicos',
    educationalLevel: ['BASIC', 'HIGH_SCHOOL'],
    duration: 80,
    totalQuestions: 31,
    passingScore: 60,
    instructions: [
      'Presentarse 30 minutos antes del examen',
      'Traer lápiz y goma',
      'No se permite el uso de celulares',
      'El examen tiene una duración máxima de 80 minutos'
    ],
    schedules: [
      { id: '1', date: '2025-08-15', startTime: '09:00', endTime: '10:20', location: 'Sala A-101' }
    ],
  },
  {
    id: 'SPANISH',
    name: 'Lenguaje',
    description: 'Evaluación de comprensión lectora y expresión escrita',
    educationalLevel: ['BASIC', 'HIGH_SCHOOL'],
    duration: 80,
    totalQuestions: 31,
    passingScore: 60,
    instructions: [
      'Presentarse 30 minutos antes del examen',
      'Traer lápiz y goma',
      'Se evaluará comprensión lectora y redacción',
      'El examen tiene una duración máxima de 80 minutos'
    ],
    schedules: [
      { id: '4', date: '2025-08-16', startTime: '11:00', endTime: '12:20', location: 'Sala C-301' }
    ]
  },
  {
    id: 'ENGLISH',
    name: 'Inglés',
    description: 'Evaluación de conocimientos del idioma inglés',
    educationalLevel: ['BASIC', 'HIGH_SCHOOL'],
    duration: 80,
    totalQuestions: 31,
    passingScore: 60,
    instructions: [
      'Presentarse 30 minutos antes del examen',
      'Traer diccionario inglés-español',
      'Se evaluará gramática y vocabulario',
      'El examen tiene una duración máxima de 80 minutos'
    ],
    schedules: [
      { id: '7', date: '2025-08-17', startTime: '14:00', endTime: '15:20', location: 'Lab. Idiomas 1' }
    ]
  }
];

// Función helper para obtener topics por nivel
export const getTopicsByLevel = (subjectId: string, level: string) => {
  // Determinar categoría del nivel
  const backendLevel = toBackendGradeLevel(level);
  const isBasic = backendLevel.includes('_BASICO') || backendLevel === 'PRE_KINDER' || backendLevel === 'KINDER';
  const isMedia = backendLevel.includes('_MEDIO');
  
  switch (subjectId) {
    case 'MATH':
      if (isBasic) {
        return [
          'Operaciones básicas (suma, resta, multiplicación, división)',
          'Geometría elemental',
          'Fracciones y decimales',
          'Resolución de problemas',
          'Patrones numéricos'
        ];
      } else if (isMedia) {
        return [
          'Álgebra',
          'Geometría avanzada',
          'Trigonometría',
          'Estadística y probabilidades',
          'Funciones matemáticas'
        ];
      }
      return [];
      
    case 'SPANISH':
      if (isBasic) {
        return [
          'Comprensión lectora básica',
          'Gramática elemental',
          'Ortografía',
          'Vocabulario',
          'Redacción simple'
        ];
      } else if (isMedia) {
        return [
          'Literatura chilena y universal',
          'Análisis de textos complejos',
          'Ensayos argumentativos',
          'Gramática avanzada',
          'Figuras literarias'
        ];
      }
      return [];
      
    case 'ENGLISH':
      if (isBasic) {
        return [
          'Vocabulario básico',
          'Verbos simples',
          'Oraciones simples',
          'Comprensión auditiva básica',
          'Conversaciones cotidianas'
        ];
      } else if (isMedia) {
        return [
          'Gramática avanzada',
          'Comprensión de textos',
          'Writing skills',
          'Listening comprehension',
          'Conversación fluida'
        ];
      }
      return [];
      
    default:
      return [];
  }
};

// Datos básicos de profesores para el sistema
export const staticProfessorData: ProfessorData[] = [
  {
    id: 1,
    name: 'Ana Rivera',
    email: 'ana.rivera@mtn.cl',
    role: 'TEACHER',
    subject: 'LANGUAGE',
    educationalLevel: 'BASIC'
  },
  {
    id: 2,
    name: 'Carlos Morales',
    email: 'carlos.morales@mtn.cl',
    role: 'CYCLE_DIRECTOR',
    educationalLevel: 'ALL_LEVELS'
  },
  {
    id: 3,
    name: 'Elena Castro',
    email: 'elena.castro@mtn.cl',
    role: 'PSYCHOLOGIST',
    educationalLevel: 'ALL_LEVELS'
  }
];

// Mock data para componentes que aún no están conectados al backend
export const mockStudentProfiles = [
  {
    id: '1',
    name: 'Juan Pérez',
    grade: '5 Básico',
    age: 11,
    rut: '12345678-9',
    status: 'ACTIVE'
  },
  {
    id: '2', 
    name: 'María González',
    grade: '3 Medio',
    age: 16,
    rut: '87654321-0',
    status: 'ACTIVE'
  }
];

export const mockStudentExams = [
  {
    id: '1',
    studentId: '1',
    subject: 'MATHEMATICS',
    score: 85,
    status: 'COMPLETED',
    date: '2024-08-15'
  },
  {
    id: '2',
    studentId: '1',
    subject: 'LANGUAGE',
    score: 92,
    status: 'COMPLETED', 
    date: '2024-08-16'
  }
];

export const mockProfessors = staticProfessorData;

// Funciones helper para professor dashboard
export const getPendingExamsByProfessor = (professorId: number) => {
  return mockStudentExams.filter(exam => 
    exam.status === 'PENDING' || exam.status === 'IN_PROGRESS'
  );
};

export const getProfessorStats = (professorId: number) => {
  const exams = mockStudentExams;
  return {
    totalExams: exams.length,
    completedExams: exams.filter(e => e.status === 'COMPLETED').length,
    pendingExams: exams.filter(e => e.status === 'PENDING').length,
    inProgressExams: exams.filter(e => e.status === 'IN_PROGRESS').length
  };
};
