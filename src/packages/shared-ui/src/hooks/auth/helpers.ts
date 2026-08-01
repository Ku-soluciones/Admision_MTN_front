/**
 * Helpers puros para los `AuthContext` de cada feature.
 *
 * Tres funciones que estaban duplicadas exactas en 4 archivos:
 *   - `mapBackendRole(role)` — normaliza el role del BFF al union User['role'].
 *   - `buildUserFromBff(u)`  — construye un `AuthUser` a partir del payload BFF.
 *   - `setAdminCompat(user, token, subject?)` — escribe las claves legacy
 *     `currentProfessor`, `professor_token`, `professor_user` cuando el role
 *     es ADMIN. Necesario hasta que migremos los `Protected*Route` legacy y
 *     `passwordService`/`ChangePasswordModal` para que lean del `authStore`.
 */
import { getStorageKey, BASE_STORAGE_KEYS } from '../../../../backend-sdk/src/index';
import { GRADE_LEVEL_LABELS } from '../../../../shared-utils/src/gradeLevels';
import type { AuthUser, UserRole } from './types';

const ROLE_MAP: Record<string, UserRole> = {
  ADMIN: 'ADMIN',
  APODERADO: 'APODERADO',
  TEACHER: 'TEACHER',
  COORDINATOR: 'COORDINATOR',
  CYCLE_DIRECTOR: 'CYCLE_DIRECTOR',
  PSYCHOLOGIST: 'PSYCHOLOGIST',
  TEACHER_LANGUAGE: 'TEACHER_LANGUAGE',
  TEACHER_MATHEMATICS: 'TEACHER_MATHEMATICS',
  TEACHER_ENGLISH: 'TEACHER_ENGLISH',
};

export function mapBackendRole(backendRole: string | undefined | null): UserRole {
  if (!backendRole) return 'TEACHER';
  return ROLE_MAP[backendRole] ?? 'TEACHER';
}

export function buildUserFromBff(u: any): AuthUser {
  return {
    id: String(u?.id ?? ''),
    email: u?.email ?? '',
    firstName: u?.firstName ?? '',
    lastName: u?.lastName ?? '',
    role: mapBackendRole(u?.role),
    phone: u?.phone,
    rut: u?.rut,
    mustChangePassword: Boolean(u?.mustChangePassword),
    temporaryPasswordExpiresAt: u?.temporaryPasswordExpiresAt ?? null,
  };
}

export function setAdminCompat(user: AuthUser, token: string, subject?: string): void {
  if (user.role !== 'ADMIN') return;
  try {
    localStorage.setItem(getStorageKey(BASE_STORAGE_KEYS.CURRENT_PROFESSOR), JSON.stringify({
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      subject: subject ?? 'ALL_SUBJECTS',
      subjects: ['MATH', 'SPANISH', 'ENGLISH', 'PSYCHOLOGY'],
      assignedGrades: [...GRADE_LEVEL_LABELS],
      isAdmin: true,
    }));
    localStorage.setItem(getStorageKey(BASE_STORAGE_KEYS.PROFESSOR_TOKEN), token);
    localStorage.setItem(getStorageKey(BASE_STORAGE_KEYS.PROFESSOR_USER), JSON.stringify({
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
    }));
  } catch { /* no-op: localStorage puede fallar en algunos navegadores */ }
}
