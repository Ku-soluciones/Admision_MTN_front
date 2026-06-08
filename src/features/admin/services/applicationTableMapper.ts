/**
 * Adapta postulaciones del BFF (y formato compatible con el ex–Node) al modelo de tablas admin.
 * El listado del BFF expone student.*, guardian.*, status enum JPA; el front legacy esperaba
 * shape similar a Application.toJSON() del application-service Node.
 */

/** Estados del BFF → etiquetas usadas en ApplicationsDataTable (subset legacy). */
export function mapBffApplicationStatusToTable(
  status: string | undefined
): 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'INTERVIEW_SCHEDULED' | 'ACCEPTED' | 'REJECTED' | 'WAITLIST' {
  const s = (status || '').toUpperCase();
  switch (s) {
    case 'PENDING':
    case 'SUBMITTED':
      return 'SUBMITTED';
    case 'UNDER_REVIEW':
    case 'DOCUMENTS_REQUESTED':
    case 'PENDING_DOCUMENTS':
    case 'INCOMPLETE':
    case 'EXAM_SCHEDULED':
      return 'UNDER_REVIEW';
    case 'INTERVIEW_SCHEDULED':
      return 'INTERVIEW_SCHEDULED';
    case 'APPROVED':
      return 'ACCEPTED';
    case 'REJECTED':
      return 'REJECTED';
    case 'WAITLIST':
      return 'WAITLIST';
    case 'ARCHIVED':
      return 'REJECTED';
    default:
      return 'UNDER_REVIEW';
  }
}

export function buildStudentDisplayName(student: Record<string, unknown> | null | undefined): string {
  if (!student) return 'Sin nombre';
  const full = String(student.fullName || '').trim();
  if (full) return full;
  const first = String(student.firstName || '').trim();
  const last = String(student.lastName || '').trim();
  if (last) return `${first} ${last}`.trim() || last;
  const p = String(student.paternalLastName || '').trim();
  const m = String(student.maternalLastName || '').trim();
  const combined = [first, p, m].filter(Boolean).join(' ').trim();
  return combined || 'Sin nombre';
}

/** Grado: BFF usa gradeApplying / gradeApplied / grade (misma columna grade_applied). */
export function buildGradeDisplay(student: Record<string, unknown> | null | undefined): string {
  const raw = String(
    student?.gradeApplying || student?.gradeApplied || student?.grade || ''
  ).trim();
  if (!raw) return '—';
  return raw
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function buildGuardianContact(app: Record<string, unknown>): {
  parentName: string;
  parentEmail: string;
  parentPhone: string;
} {
  const guardian = (app.guardian || null) as Record<string, string> | null;
  const father = (app.father || null) as Record<string, string> | null;
  const mother = (app.mother || null) as Record<string, string> | null;

  const gName = guardian?.fullName?.trim();
  const fName = father?.fullName?.trim();
  const mName = mother?.fullName?.trim();

  const parentName = gName || fName || mName || 'No especificado';
  const parentEmail =
    guardian?.email || father?.email || mother?.email || 'No especificado';
  const parentPhone =
    guardian?.phone || father?.phone || mother?.phone || 'No especificado';

  return { parentName, parentEmail, parentPhone };
}
