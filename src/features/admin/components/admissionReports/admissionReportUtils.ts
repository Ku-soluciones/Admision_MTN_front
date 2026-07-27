import type { CourseApplicant } from '../../../../packages/shared-ui/src/src/api/dashboard.types';

const normalizeToken = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();

export const formatGradeLabel = (value?: string | null) => {
  if (!value) return 'Curso sin informar';

  const normalized = value.trim().replace(/_/g, ' ').replace(/\s+/g, ' ');
  const gradeMatch = normalized.match(/^(\d+)\s*(BASICO|BÁSICO|MEDIO)$/i);
  if (gradeMatch) {
    const [, number, level] = gradeMatch;
    return `${number}° ${normalizeToken(level) === 'basico' ? 'Básico' : 'Medio'}`;
  }

  const sectionMatch = normalized.match(/^(\d+)\s*([A-Z])$/i);
  if (sectionMatch) return `${sectionMatch[1]}° ${sectionMatch[2].toUpperCase()}`;

  if (normalizeToken(normalized) === 'prekinder') return 'Prekínder';
  if (normalizeToken(normalized) === 'kinder') return 'Kínder';

  return normalized
    .toLowerCase()
    .replace(/(^|\s)\p{L}/gu, (letter) => letter.toUpperCase());
};

export const formatGenderLabel = (value?: string | null, compact = false) => {
  if (value === 'MALE') return compact ? 'M' : 'Masculino';
  if (value === 'FEMALE') return compact ? 'F' : 'Femenino';
  return 'Sin información';
};

export const hasInvalidText = (value?: string | null) => {
  if (!value?.trim()) return true;
  const normalized = normalizeToken(value);
  return normalized.includes('undefined') || normalized.includes('null');
};

export const safeDisplayText = (value?: string | null, fallback = 'Sin información') =>
  hasInvalidText(value) ? fallback : value!.trim();

export const formatAdmissionDate = (value?: string | null, fallback = 'Sin información') => {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;

  return new Intl.DateTimeFormat('es-CL', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC'
  }).format(date);
};

export const isResolvedApplicant = (row: CourseApplicant) => {
  const token = normalizeToken(`${row.status} ${row.statusLabel}`);
  return ['approved', 'accepted', 'aceptado', 'rechazado', 'rejected', 'archiv', 'waitlist', 'lista de espera']
    .some((status) => token.includes(status));
};

export const requiresAction = (row: CourseApplicant) => !isResolvedApplicant(row);

export const hasDataQualityIssue = (row: CourseApplicant) =>
  !row.gender || hasInvalidText(row.cycleDirectorDecision);

export const statusTone = (status: string) => {
  const token = normalizeToken(status);
  if (token.includes('acept') || token.includes('approv')) {
    return { badge: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20', bar: 'bg-emerald-500' };
  }
  if (token.includes('rechaz') || token.includes('reject')) {
    return { badge: 'bg-rose-50 text-rose-700 ring-rose-600/20', bar: 'bg-rose-500' };
  }
  if (token.includes('revision') || token.includes('review')) {
    return { badge: 'bg-blue-50 text-blue-700 ring-blue-600/20', bar: 'bg-blue-500' };
  }
  if (token.includes('espera') || token.includes('wait')) {
    return { badge: 'bg-violet-50 text-violet-700 ring-violet-600/20', bar: 'bg-violet-500' };
  }
  if (token.includes('archiv')) {
    return { badge: 'bg-slate-100 text-slate-700 ring-slate-500/20', bar: 'bg-slate-500' };
  }
  return { badge: 'bg-amber-50 text-amber-800 ring-amber-600/20', bar: 'bg-amber-500' };
};
