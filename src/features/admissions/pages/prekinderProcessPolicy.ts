export type PrekinderAcademicOption = {
  academicYear: number;
  ageReferenceDate?: string | null;
};

export type PrekinderWindowOption = PrekinderAcademicOption & {
  processId: string;
  opensAt: string;
  closesAt: string;
};

export function resolvePrekinderAcademicContext(option: PrekinderAcademicOption) {
  return {
    applicationYear: String(option.academicYear),
    ageReferenceDate: option.ageReferenceDate || `${option.academicYear}-03-31`,
  };
}

export function normalizePrekinderDraftYear<T extends Record<string, unknown>>(
  data: T,
  academicYear: number,
): T & { applicationYear: string } {
  return { ...data, applicationYear: String(academicYear) };
}

export function resolveApplicationYearForFlow(
  isPrekinder: boolean,
  prekinderAcademicYear: number | undefined,
  generalApplicationYear: string,
): string {
  if (!isPrekinder) return generalApplicationYear;
  return prekinderAcademicYear == null ? '' : String(prekinderAcademicYear);
}

export function selectAvailablePrekinderOptions<T extends PrekinderWindowOption>(
  options: T[],
  now = new Date(),
): T[] {
  const instant = now.getTime();
  return options.filter((option) => {
    const opensAt = new Date(option.opensAt).getTime();
    const closesAt = new Date(option.closesAt).getTime();
    return Boolean(option.processId)
      && Number.isInteger(option.academicYear)
      && Number.isFinite(opensAt)
      && Number.isFinite(closesAt)
      && opensAt <= instant
      && instant <= closesAt;
  });
}
