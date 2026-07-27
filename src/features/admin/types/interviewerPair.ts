export interface InterviewerPairMember {
  id: number;
  name: string;
  role: 'CYCLE_DIRECTOR' | 'PSYCHOLOGIST';
  active: boolean;
  activePairId?: number | null;
}

export interface GradeOption {
  code: string;
  label: string;
}

export interface InterviewerPair {
  id: number;
  cycleDirector: InterviewerPairMember;
  psychologist: InterviewerPairMember;
  grades: string[];
  active: boolean;
  revision: number;
  supersedesPairId?: number | null;
  createdAt?: string;
  archivedAt?: string | null;
}

export interface InterviewerPairOptions {
  cycleDirectors: InterviewerPairMember[];
  psychologists: InterviewerPairMember[];
  grades: GradeOption[];
}

export interface EligiblePairsResult {
  applicationId: number;
  grade: string | null;
  eligiblePairs: InterviewerPair[];
  count: number;
  reasonCode: string | null;
  reason: string | null;
}
