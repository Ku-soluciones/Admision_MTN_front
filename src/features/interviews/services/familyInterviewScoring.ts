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
