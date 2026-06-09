/**
 * useHeaderAuthState — fuente única para los Headers globales.
 *
 * Reemplaza las lecturas directas a `localStorage` (incluido el flag
 * spoofable `currentProfessor.isAdmin`) por el `authStore` en memoria.
 *
 * Sigue habiendo un fallback a `localStorage` SOLO durante la ventana de
 * hidratación (F5 antes de que `bootstrapAuth` rellene el store). Apenas
 * el store tiene `accessToken`, su `user.role` es la única fuente de
 * verdad y `localStorage` se ignora.
 *
 * El listener `storage` se mantiene para que la pestaña vea cambios
 * hechos por otras pestañas al localStorage (compatibilidad con flujos
 * legacy). El `authStore.subscribe` cubre los cambios in-memory.
 */
import { useEffect, useState } from 'react';
import { useAuthStore, getStorageKey, BASE_STORAGE_KEYS } from '../../../backend-sdk/src/index';

export interface HeaderAuthState {
  /** Token (cualquier fuente) presente. Habilita opciones "logout" / oculta CTAs. */
  isAnyUserLoggedIn: boolean;
  /** Usuario con rol STAFF (≠ APODERADO y ≠ ADMIN). */
  isProfessorLoggedIn: boolean;
  /** Usuario con rol ADMIN — fuente canónica: `authStore.user.role`. */
  isAdmin: boolean;
}

interface LegacySnapshot {
  hasAnyToken: boolean;
  hasProfessorToken: boolean;
  isAdmin: boolean;
}

function readLegacySnapshot(): LegacySnapshot {
  if (typeof window === 'undefined' || !window.localStorage) {
    return { hasAnyToken: false, hasProfessorToken: false, isAdmin: false };
  }
  try {
    const currentProfessor = localStorage.getItem(getStorageKey(BASE_STORAGE_KEYS.CURRENT_PROFESSOR));
    const authToken = localStorage.getItem(getStorageKey(BASE_STORAGE_KEYS.AUTH_TOKEN));
    const professorToken = localStorage.getItem(getStorageKey(BASE_STORAGE_KEYS.PROFESSOR_TOKEN));
    const apoderadoToken = localStorage.getItem(getStorageKey(BASE_STORAGE_KEYS.APODERADO_TOKEN));

    let isAdmin = false;
    if ((authToken || professorToken) && currentProfessor) {
      try {
        const data = JSON.parse(currentProfessor);
        // Defensa: preferimos `role === 'ADMIN'` sobre el flag booleano
        // `isAdmin` (más fácil de spoofear). Si ambos coinciden, ok.
        isAdmin = data?.role === 'ADMIN' || data?.isAdmin === true;
      } catch {
        isAdmin = false;
      }
    }

    return {
      hasAnyToken: Boolean(authToken || professorToken || apoderadoToken),
      hasProfessorToken: Boolean(professorToken && currentProfessor),
      isAdmin,
    };
  } catch {
    return { hasAnyToken: false, hasProfessorToken: false, isAdmin: false };
  }
}

const STAFF_NON_ADMIN_ROLES = new Set([
  'TEACHER',
  'COORDINATOR',
  'CYCLE_DIRECTOR',
  'PSYCHOLOGIST',
  'TEACHER_LANGUAGE',
  'TEACHER_MATHEMATICS',
  'TEACHER_ENGLISH',
  'TEACHER_SCIENCE',
  'TEACHER_HISTORY',
  'TEACHER_LANGUAGE_BASIC',
  'TEACHER_MATHEMATICS_BASIC',
  'TEACHER_ENGLISH_BASIC',
  'TEACHER_SCIENCE_BASIC',
  'TEACHER_HISTORY_BASIC',
  'TEACHER_LANGUAGE_HIGH',
  'TEACHER_MATHEMATICS_HIGH',
  'TEACHER_ENGLISH_HIGH',
  'TEACHER_SCIENCE_HIGH',
  'TEACHER_HISTORY_HIGH',
  'TEACHER_EARLY_CYCLE',
  'COORDINATOR_LANGUAGE',
  'COORDINATOR_MATHEMATICS',
  'COORDINATOR_ENGLISH',
  'COORDINATOR_SCIENCE',
  'COORDINATOR_HISTORY',
  'INTERVIEWER',
]);

export function useHeaderAuthState(): HeaderAuthState {
  const storeUser = useAuthStore((s) => s.user);
  const storeToken = useAuthStore((s) => s.accessToken);
  const [legacy, setLegacy] = useState<LegacySnapshot>(() => readLegacySnapshot());

  useEffect(() => {
    const refresh = () => setLegacy(readLegacySnapshot());
    window.addEventListener('storage', refresh);
    // Resync una vez al montar por si localStorage cambió antes del listener.
    refresh();
    return () => window.removeEventListener('storage', refresh);
  }, []);

  const hasStoreSession = Boolean(storeToken);
  const role = (storeUser?.role as string | undefined) ?? '';

  // Canónica: si hay sesión en memoria, ignoramos localStorage.
  // Fallback: durante el F5 (store vacío) leemos localStorage para
  // evitar flash de UI sin permisos. Apenas el bootstrap hidrata el
  // store, la fuente canónica gana.
  return {
    isAnyUserLoggedIn: hasStoreSession || legacy.hasAnyToken,
    isProfessorLoggedIn: hasStoreSession
      ? STAFF_NON_ADMIN_ROLES.has(role)
      : legacy.hasProfessorToken,
    isAdmin: hasStoreSession
      ? role === 'ADMIN'
      : legacy.isAdmin,
  };
}

