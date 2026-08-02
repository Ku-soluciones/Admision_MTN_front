type UnknownRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const nonEmptyText = (value: unknown): string | null => {
  if (typeof value === 'string') {
    const normalized = value.trim();
    return normalized || null;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }

  return null;
};

export const formatPersonDisplayName = (
  value: unknown,
  fallback = 'Sin asignar'
): string => {
  const directText = nonEmptyText(value);
  if (directText) return directText;
  if (!isRecord(value)) return fallback;

  for (const key of ['fullName', 'name', 'displayName', 'interviewerName', 'evaluatorName']) {
    const candidate = nonEmptyText(value[key]);
    if (candidate) return candidate;
  }

  const firstName = nonEmptyText(value.firstName);
  const paternalLastName = nonEmptyText(value.paternalLastName);
  const lastName = paternalLastName || nonEmptyText(value.lastName);
  const maternalLastName = nonEmptyText(value.maternalLastName);
  const fullName = [firstName, lastName, maternalLastName].filter(Boolean).join(' ');

  return fullName || nonEmptyText(value.email) || fallback;
};

export const formatDisplayValue = (value: unknown, fallback = '—'): string => {
  const directText = nonEmptyText(value);
  if (directText) return directText;
  if (isRecord(value)) return formatPersonDisplayName(value, fallback);
  return fallback;
};

export const hasDisplayValue = (value: unknown): boolean =>
  nonEmptyText(value) !== null;
