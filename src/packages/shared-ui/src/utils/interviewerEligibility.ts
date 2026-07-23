export interface InterviewerCandidate {
  id: number;
  name: string;
  role?: string;
}

export type InterviewerPair<T extends InterviewerCandidate = InterviewerCandidate> = [T, T];

export const FAMILY_INTERVIEWER_ROLES = ['INTERVIEWER', 'COORDINATOR'] as const;
export const CYCLE_INTERVIEWER_ROLES = ['CYCLE_DIRECTOR', 'PSYCHOLOGIST'] as const;

const FAMILY_ROLE_SET = new Set<string>(FAMILY_INTERVIEWER_ROLES);
const CYCLE_ROLE_SET = new Set<string>(CYCLE_INTERVIEWER_ROLES);

export const isFamilyInterviewer = (interviewer?: Pick<InterviewerCandidate, 'role'>): boolean => (
  Boolean(interviewer?.role && FAMILY_ROLE_SET.has(interviewer.role))
);

export const isCycleInterviewer = (interviewer?: Pick<InterviewerCandidate, 'role'>): boolean => (
  Boolean(interviewer?.role && CYCLE_ROLE_SET.has(interviewer.role))
);

export const buildFamilyInterviewerPairs = <T extends InterviewerCandidate>(interviewers: T[]): InterviewerPair<T>[] => {
  const eligibleInterviewers = interviewers.filter(isFamilyInterviewer);
  const pairs: InterviewerPair<T>[] = [];

  eligibleInterviewers.forEach((first, index) => {
    eligibleInterviewers.slice(index + 1).forEach(second => {
      if (first.id !== second.id) pairs.push([first, second]);
    });
  });

  return pairs;
};

export const countFamilyInterviewerPairs = (interviewers: InterviewerCandidate[]): number => {
  const eligibleCount = interviewers.filter(isFamilyInterviewer).length;
  return eligibleCount < 2 ? 0 : (eligibleCount * (eligibleCount - 1)) / 2;
};
