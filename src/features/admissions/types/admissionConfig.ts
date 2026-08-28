/* -------------------------------------------------------
 * Tipos para la configuración de admisión almacenada
 * en Vercel Edge Config.
 * ------------------------------------------------------- */

// ─── Calendario de Admisión ────────────────────────────

export interface AdmissionTimelineItem {
  id: string;
  period: string;
  title: string;
  description: string;
  highlight: boolean;
  position: 'left' | 'right';
  order: number;
}

export interface AdmissionHome {
  year: number;
  title: string;
  subtitle: string;
  timeline: AdmissionTimelineItem[];
}

// ─── Exámenes de Admisión ──────────────────────────────

export interface ExamDate {
  id: string;
  date: string;
  dayLabel: string;
  startTime: string;
  endTime: string;
  location: string;
}

export interface ExamProcessStep {
  id: string;
  stepNumber: number;
  phase: string | null;
  title: string;
  description: string;
  extraInfo: string | null;
  statusLabel: string | null;
  order: number;
}

export interface ExamProcess {
  title: string;
  subtitle: string;
  steps: ExamProcessStep[];
}

export interface AdmissionExam {
  id: string;
  name: string;
  description: string;
  durationLabel: string;
  durationMinutes: number;
  questions: number;
  minimumScore: number;
  minimumScoreLabel: string;
  availableDates: ExamDate[];
  process?: ExamProcess;
}

export interface AdmissionExams {
  title: string;
  importantInfo: string[];
  exams: AdmissionExam[];
}

// ─── Detalle de Exámenes por Nivel ─────────────────────

export interface ExamTopic {
  order: number;
  title: string;
  description: string;
}

export interface ExamLevelTopics {
  title: string;
  topics: ExamTopic[];
}

export interface ExamDetailDate {
  id: string;
  date: string;
  dayLabel: string;
  startTime: string;
  endTime: string;
  location: string;
  durationLabel: string;
  durationMinutes: number;
}

export interface ExamDetail {
  id: string;
  name: string;
  description: string;
  durationLabel: string;
  durationMinutes: number;
  questions: number;
  minimumScore: number;
  minimumScoreLabel: string;
  instructionsTitle: string;
  instructions: string[];
  levelSelector: {
    title: string;
    description: string;
  };
  topicsByLevel: Record<string, ExamLevelTopics>;
  examDatesTitle: string;
  examDatesDescription: string;
  availableDates: ExamDetailDate[];
}

export interface ExamDetailsConfig {
  examDetails: Record<string, ExamDetail>;
}

// ─── Contenedor de toda la config de admisión ──────────

export interface AdmissionConfig {
  admissionHome: AdmissionHome;
  admissionExams: AdmissionExams;
}
