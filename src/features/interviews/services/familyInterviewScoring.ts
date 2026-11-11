const GRADE_ALIASES: Record<string, string> = {
  PREKINDER: 'PRE_KINDER',
  I_MEDIO: '1_MEDIO',
  II_MEDIO: '2_MEDIO',
  III_MEDIO: '3_MEDIO',
  IV_MEDIO: '4_MEDIO',
};

export function normalizeInterviewGrade(grade?: string): string {
  const normalized = String(grade || '').trim().toUpperCase().replaceAll(' ', '_');
  return GRADE_ALIASES[normalized] || normalized;
}

export function filterTemplateForGrade(template: any, grade?: string): any {
  const normalizedGrade = normalizeInterviewGrade(grade);
  const range = Object.values(template.gradeRanges || {}).find((candidate: any) =>
    candidate.grades?.map(normalizeInterviewGrade).includes(normalizedGrade),
  ) as any;
  const applicableQuestionIds = new Set(range?.applicableQuestions || []);

  const sections = Object.fromEntries(
    Object.entries(template.sections || {}).map(([sectionKey, section]: [string, any]) => [
      sectionKey,
      {
        ...section,
        questions: Object.fromEntries(
          Object.entries(section.questions || {}).filter(([, question]: [string, any]) =>
            applicableQuestionIds.size === 0 || applicableQuestionIds.has(question.id),
          ),
        ),
      },
    ]),
  );

  return { ...template, sections };
}

export function checklistResponseValue(checked: boolean, score: number): number {
  return checked ? score : 0;
}

export function calculateFamilyInterviewScores(interviewData: any, template?: any) {
  let sectionScore = 0;
  let observationScore = 0;

  for (const [sectionKey, sectionResponses] of Object.entries(interviewData || {})) {
    if (sectionKey === 'observations' || !sectionResponses || typeof sectionResponses !== 'object') continue;
    const applicableQuestions = template?.sections?.[sectionKey]?.questions;
    const allowedKeys = applicableQuestions ? new Set(Object.keys(applicableQuestions)) : null;

    for (const [questionKey, response] of Object.entries(sectionResponses as Record<string, any>)) {
      if (allowedKeys && !allowedKeys.has(questionKey)) continue;
      if (response && typeof response.score === 'number') sectionScore += response.score;
    }
  }

  const observations = interviewData?.observations;
  if (observations?.checklist) {
    for (const value of Object.values(observations.checklist)) {
      if (typeof value === 'number') observationScore += value;
      else if (value === true) observationScore += 1;
    }
  }
  if (typeof observations?.overallOpinion?.score === 'number') {
    observationScore += observations.overallOpinion.score;
  }

  return { sectionScore, observationScore };
}

export function calculateFamilyInterviewPercentage(interviewData: any, template?: any): number {
  const { sectionScore, observationScore } = calculateFamilyInterviewScores(interviewData, template);
  return Math.round(Math.min(100, Math.max(0, (sectionScore / 20) * 90 + (observationScore / 11) * 10)));
}
