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

const PROCESS_LABELS: Record<string, string> = {
  FAMILY_INTERVIEW: 'Entrevista familiar',
  CYCLE_DIRECTOR_INTERVIEW: 'Entrevista con dirección de ciclo',
  CYCLE_DIRECTOR_REPORT: 'Informe de dirección de ciclo',
  PSYCHOLOGICAL_INTERVIEW: 'Entrevista psicológica',
  ENGLISH_EXAM: 'Examen de Inglés',
  MATHEMATICS_EXAM: 'Examen de Matemática',
  LANGUAGE_EXAM: 'Examen de Lenguaje',
  FAMILY: 'Entrevista familiar',
  CYCLE_DIRECTOR: 'Dirección de ciclo',
  PSYCHOLOGICAL: 'Entrevista psicológica'
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendiente',
  SCHEDULED: 'Agendada',
  CONFIRMED: 'Confirmada',
  IN_PROGRESS: 'En progreso',
  COMPLETED: 'Completada',
  CANCELLED: 'Cancelada',
  APPROVED: 'Aprobada',
  REJECTED: 'Rechazada'
};

const humanizeCode = (value: string): string => {
  const normalized = value.trim().replace(/[_-]+/g, ' ').toLocaleLowerCase('es-CL');
  return normalized ? normalized.charAt(0).toLocaleUpperCase('es-CL') + normalized.slice(1) : '';
};

export const formatProcessLabel = (value: unknown, fallback: string): string => {
  const code = nonEmptyText(value);
  if (!code) return fallback;
  return PROCESS_LABELS[code.toUpperCase()] || humanizeCode(code);
};

export const formatProcessStatus = (value: unknown): string => {
  const code = nonEmptyText(value);
  if (!code) return 'Sin estado';
  return STATUS_LABELS[code.toUpperCase()] || humanizeCode(code);
};
