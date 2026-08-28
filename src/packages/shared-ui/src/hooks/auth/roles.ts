/**
 * STAFF_ROLES — set canónico de roles que pertenecen al portal de profesores
 * (incluye coordinadores, directores de ciclo, psicólogos e entrevistadores,
 * y los roles legacy que aún emite el BFF).
 *
 * Mantener sincronizado con `professorAuthService.isProfessorRole()` del
 * `features/admin/services` (y sus 3 copias). En la próxima iteración
 * unificaremos también ese servicio.
 *
 * Notar que ADMIN NO está en este set: los admins tienen su propio portal
 * (`/admin`) y su propio guard `ProtectedAdminRoute`.
 */
export const STAFF_ROLES: ReadonlySet<string> = new Set<string>([
  // Roles backend actuales
  'TEACHER',
  'COORDINATOR',
  'CYCLE_DIRECTOR',
  'PSYCHOLOGIST',
  'INTERVIEWER',
  // Ciclo inicial
  'TEACHER_EARLY_CYCLE',
  // Profesores básica
  'TEACHER_LANGUAGE_BASIC',
  'TEACHER_MATHEMATICS_BASIC',
  'TEACHER_ENGLISH_BASIC',
  'TEACHER_SCIENCE_BASIC',
  'TEACHER_HISTORY_BASIC',
  // Profesores media
  'TEACHER_LANGUAGE_HIGH',
  'TEACHER_MATHEMATICS_HIGH',
  'TEACHER_ENGLISH_HIGH',
  'TEACHER_SCIENCE_HIGH',
  'TEACHER_HISTORY_HIGH',
  // Coordinadores por área
  'COORDINATOR_LANGUAGE',
  'COORDINATOR_MATHEMATICS',
  'COORDINATOR_ENGLISH',
  'COORDINATOR_SCIENCE',
  'COORDINATOR_HISTORY',
  // Legacy
  'TEACHER_LANGUAGE',
  'TEACHER_MATHEMATICS',
  'TEACHER_ENGLISH',
]);

export function isStaffRole(role: string | null | undefined): boolean {
  return typeof role === 'string' && STAFF_ROLES.has(role);
}
