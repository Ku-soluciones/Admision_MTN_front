export type PrekinderBackendCode = 'PREKINDER' | 'PRE_KINDER';

export interface BackendGradeLevelOptions {
  prekinderCode?: PrekinderBackendCode;
}

export const GRADE_LEVEL_OPTIONS = [
  { value: 'Prekínder', label: 'Prekínder', category: 'Preescolar' },
  { value: 'Kínder', label: 'Kínder', category: 'Preescolar' },
  { value: '1 Básico', label: '1 Básico', category: 'Básica' },
  { value: '2 Básico', label: '2 Básico', category: 'Básica' },
  { value: '3 Básico', label: '3 Básico', category: 'Básica' },
  { value: '4 Básico', label: '4 Básico', category: 'Básica' },
  { value: '5 Básico', label: '5 Básico', category: 'Básica' },
  { value: '6 Básico', label: '6 Básico', category: 'Básica' },
  { value: '7 Básico', label: '7 Básico', category: 'Básica' },
  { value: '8 Básico', label: '8 Básico', category: 'Básica' },
  { value: '1 Medio', label: '1 Medio', category: 'Media' },
  { value: '2 Medio', label: '2 Medio', category: 'Media' },
  { value: '3 Medio', label: '3 Medio', category: 'Media' },
  { value: '4 Medio', label: '4 Medio', category: 'Media' },
] as const;

export const GRADE_LEVEL_LABELS = GRADE_LEVEL_OPTIONS.map(level => level.label);

const GRADE_FIELD_KEYS = new Set([
  'grade',
  'gradeapplied',
  'grade_applied',
  'gradeapplying',
  'grade_applying',
  'gradeappliedfor',
  'gradelevel',
  'grade_level',
  'studentgrade',
  'student_grade',
  'cursopostulado',
  'curso_postulado',
  'assignedlevel',
  'entrancegrade',
  'recommendedgrade',
]);

const GRADE_COLLECTION_KEYS = new Set([
  'grades',
  'assignedgrades',
  'gradelevels',
  'eligiblegrades',
  'applicablegrades',
  'gradecatalog',
]);

const ROMAN_MEDIA_LEVELS: Record<string, number> = {
  IMEDIO: 1,
  IIMEDIO: 2,
  IIIMEDIO: 3,
  IVMEDIO: 4,
};

const normalizeGradeToken = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[°º._\s-]/g, '')
    .toUpperCase();

const parseCanonicalGrade = (value: string): { label: string; backendCode: string } | null => {
  const token = normalizeGradeToken(value);

  if (token === 'PREKINDER' || token === 'PK') {
    return { label: 'Prekínder', backendCode: 'PRE_KINDER' };
  }

  if (token === 'KINDER' || token === 'K') {
    return { label: 'Kínder', backendCode: 'KINDER' };
  }

  const basicMatch = token.match(/^([1-8])BASICO$/);
  if (basicMatch) {
    return { label: `${basicMatch[1]} Básico`, backendCode: `${basicMatch[1]}_BASICO` };
  }

  const numericMediaMatch = token.match(/^([1-4])MEDIO$/);
  if (numericMediaMatch) {
    return { label: `${numericMediaMatch[1]} Medio`, backendCode: `${numericMediaMatch[1]}_MEDIO` };
  }

  const romanMediaLevel = ROMAN_MEDIA_LEVELS[token];
  if (romanMediaLevel) {
    return { label: `${romanMediaLevel} Medio`, backendCode: `${romanMediaLevel}_MEDIO` };
  }

  return null;
};

export function formatGradeLevel(value?: string | null, fallback = 'Sin nivel'): string {
  if (!value?.trim()) return fallback;

  const trimmedValue = value.trim();
  const canonicalGrade = parseCanonicalGrade(trimmedValue);
  if (canonicalGrade) return canonicalGrade.label;

  const sectionMatch = trimmedValue.match(/^(\d+)\s*[°º]?\s*([A-Z])$/i);
  if (sectionMatch) return `${sectionMatch[1]} ${sectionMatch[2].toUpperCase()}`;

  return trimmedValue.replace(/_/g, ' ').replace(/\s+/g, ' ');
}

export function toBackendGradeLevel(
  value?: string | null,
  options: BackendGradeLevelOptions = {},
): string {
  if (!value?.trim()) return '';

  const trimmedValue = value.trim();
  const canonicalGrade = parseCanonicalGrade(trimmedValue);
  if (!canonicalGrade) return trimmedValue;

  if (canonicalGrade.backendCode === 'PRE_KINDER') {
    return options.prekinderCode || 'PRE_KINDER';
  }

  return canonicalGrade.backendCode;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object') return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

type GradeConverter = (value: string) => string;

function transformGradeCollection(value: unknown, convert: GradeConverter): unknown {
  if (!Array.isArray(value)) return transformGradeFields(value, convert);

  return value.map(item => {
    if (typeof item === 'string') return convert(item);
    if (!isPlainRecord(item)) return item;

    return Object.fromEntries(Object.entries(item).map(([key, nestedValue]) => {
      const normalizedKey = key.toLowerCase();
      if (typeof nestedValue === 'string' && ['code', 'label', 'value'].includes(normalizedKey)) {
        return [key, convert(nestedValue)];
      }
      return [key, transformGradeFields(nestedValue, convert)];
    }));
  });
}

function transformGradeFields(value: unknown, convert: GradeConverter): unknown {
  if (Array.isArray(value)) {
    return value.map(item => transformGradeFields(item, convert));
  }

  if (!isPlainRecord(value)) return value;

  return Object.fromEntries(Object.entries(value).map(([key, nestedValue]) => {
    const normalizedKey = key.toLowerCase();

    if (typeof nestedValue === 'string' && GRADE_FIELD_KEYS.has(normalizedKey)) {
      return [key, convert(nestedValue)];
    }

    if (GRADE_COLLECTION_KEYS.has(normalizedKey)) {
      return [key, transformGradeCollection(nestedValue, convert)];
    }

    return [key, transformGradeFields(nestedValue, convert)];
  }));
}

export function normalizeGradeLevelsForDisplay<T>(payload: T): T {
  return transformGradeFields(payload, value => formatGradeLevel(value, value)) as T;
}

export function normalizeGradeLevelsForBackend<T>(
  payload: T,
  options: BackendGradeLevelOptions = {},
): T {
  return transformGradeFields(payload, value => toBackendGradeLevel(value, options)) as T;
}
