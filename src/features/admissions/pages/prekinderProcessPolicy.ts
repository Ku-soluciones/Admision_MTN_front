export type PrekinderAcademicOption = {
  academicYear: number;
  ageReferenceDate?: string | null;
};

export type PrekinderWindowOption = PrekinderAcademicOption & {
  processId: string;
  opensAt: string;
  closesAt: string;
};

export function formatDateInTimeZone(
  date = new Date(),
  timeZone = 'America/Santiago',
): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

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
): T[] {
  // application-options ya contiene únicamente las etapas habilitadas por el
  // backend. El navegador no debe reinterpretar su vigencia con su propio reloj.
  return options.filter((option) => Boolean(option.processId) && Number.isInteger(option.academicYear));
}

export function pickPrekinderOption<T extends PrekinderWindowOption>(options: T[]): T | null {
  return [...options].sort((left, right) => {
    const yearDifference = right.academicYear - left.academicYear;
    if (yearDifference !== 0) return yearDifference;

    const openingDifference = Date.parse(right.opensAt) - Date.parse(left.opensAt);
    if (Number.isFinite(openingDifference) && openingDifference !== 0) return openingDifference;

    return left.processId.localeCompare(right.processId);
  })[0] ?? null;
}
