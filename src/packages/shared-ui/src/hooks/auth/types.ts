/**
 * Tipos compartidos para los `AuthContext` de cada feature.
 *
 * Antes había 4 copias idénticas de `User` / `AuthContextType` repartidas
 * por `features/admin`, `features/admissions`, `features/student` y
 * `packages/shared-ui`. Ahora viven aquí; cada context se importa desde
 * este módulo para evitar drift de tipos.
 */
import type { ReactNode } from 'react';

export type UserRole =
  | 'APODERADO'
  | 'ADMIN'
  | 'TEACHER'
  | 'COORDINATOR'
  | 'CYCLE_DIRECTOR'
  | 'PSYCHOLOGIST'
  | 'TEACHER_LANGUAGE'
  | 'TEACHER_MATHEMATICS'
  | 'TEACHER_ENGLISH';

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  phone?: string;
  rut?: string;
  applicationId?: number;
  mustChangePassword?: boolean;
  temporaryPasswordExpiresAt?: string | null;
}

export interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  /** Indica si la cuenta tiene `firebase_uid` enlazado en el BFF. */
  firebaseLinked: boolean;
  login: (email: string, password: string, role: string) => Promise<void>;
  register: (userData: any, role: string) => Promise<void>;
  logout: () => void;
  /** Re-ejecuta el linking explícito (Google/Email) para apoderados antiguos. */
  linkFirebaseAccount: () => Promise<void>;
}

export interface AuthProviderProps {
  children: ReactNode;
  portalType?: 'ADMIN' | 'STAFF' | 'GUARDIAN';
}
