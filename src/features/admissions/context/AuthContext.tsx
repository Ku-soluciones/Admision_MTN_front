/**
 * AuthContext (admissions) — portal público de postulación.
 *
 * Particularidades:
 *   - `?fresh=1` en la URL: descarta toda persistencia (Firebase IndexedDB,
 *     localStorage, store) y fuerza login limpio. Detectado en una IIFE
 *     antes de que React monte, para que el módulo de Firebase no
 *     restaure sesión vieja por su `onAuthStateChanged` automático.
 *   - `legacyIdTokenExchange='firebase-login'`: intercambio directo del
 *     idToken legacy vía `/api/auth/firebase-login` (manteniendo el
 *     comportamiento previo).
 *   - Logout y cross-tab redirigen a `/apoderado-login`.
 *
 * Antes este archivo tenía 518 líneas; ahora ~190 (incluyendo IIFE de
 * detección fresh y `wipeLocalAuthArtifacts`).
 */
import React, { createContext, useContext, useCallback } from 'react';
import { auth, hasFirebaseConfig } from '../../admin/src/lib/firebase';
import { authService } from '../../admin/services/authService';
import api from '../../admin/services/api';
import {
  getStorageKey,
  BASE_STORAGE_KEYS,
  authStore,
  cancelScheduledRefresh,
  scheduleRefresh,
  runSharedRefresh,
} from '../../../packages/backend-sdk/src/index';
import {
  useAuthBootstrap,
  purgeLegacyAuthStorage,
} from '../../../packages/shared-ui/src/hooks/auth/useAuthBootstrap';
import {
  buildUserFromBff,
  setAdminCompat,
} from '../../../packages/shared-ui/src/hooks/auth/helpers';
import type {
  AuthContextType,
  AuthProviderProps,
  AuthUser,
} from '../../../packages/shared-ui/src/hooks/auth/types';

// Detecta si la navegación pidió explícitamente una sesión "fresca". Esto
// ocurre cuando el usuario presiona "Iniciar Postulación" desde el home
// estando deslogueado y queremos garantizar que NO se reutilice ninguna
// sesión Firebase / BFF persistente del origen de admisiones.
//
// Bandera soportada: `fresh=1` tanto en la query string como dentro del
// hash (`#/postulacion?fresh=1`). Se limpia de la URL tras procesarla.
let __freshSessionRequested = false;
(function detectFreshSessionRequest() {
  try {
    if (typeof window === 'undefined') return;
    const stripFrom = (str: string): { stripped: string; isFresh: boolean } => {
      const qIdx = str.indexOf('?');
      if (qIdx === -1) return { stripped: str, isFresh: false };
      const params = new URLSearchParams(str.slice(qIdx + 1));
      const isFresh = params.get('fresh') === '1';
      if (!isFresh) return { stripped: str, isFresh: false };
      params.delete('fresh');
      const remaining = params.toString();
      return { stripped: str.slice(0, qIdx) + (remaining ? '?' + remaining : ''), isFresh: true };
    };
    const { stripped: newSearch, isFresh: freshInSearch } = stripFrom(window.location.search);
    const { stripped: newHash, isFresh: freshInHash } = stripFrom(window.location.hash);
    if (freshInSearch || freshInHash) {
      __freshSessionRequested = true;
      window.history.replaceState(null, '', window.location.pathname + newSearch + newHash);
    }
  } catch { /* no-op */ }
})();

/** Indica si el módulo se cargó con la bandera `?fresh=1` en la URL. */
export const wasFreshSessionRequested = (): boolean => __freshSessionRequested;

// Limpieza síncrona de toda persistencia local (auth tokens, claves legacy,
// store en memoria). NO toca IndexedDB de Firebase — eso se hace de forma
// asíncrona dentro del hook cuando recibe el evento `onAuthStateChanged`.
const wipeLocalAuthArtifacts = (): void => {
  try {
    Object.values(BASE_STORAGE_KEYS).forEach((key) => {
      try { localStorage.removeItem(getStorageKey(key)); } catch { /* no-op */ }
    });
    ['authToken', 'auth_token', 'currentUser', 'professor_token', 'professor_user', 'currentProfessor']
      .forEach((k) => { try { localStorage.removeItem(k); } catch { /* no-op */ } });
    try { sessionStorage.clear(); } catch { /* no-op */ }
  } catch { /* no-op */ }
};

// IIFE al cargar el módulo: si fresh, wipe; si no, purga legacy estándar.
(function bootstrapStorageOnce() {
  if (__freshSessionRequested) {
    wipeLocalAuthArtifacts();
    try { authStore.clear(); } catch { /* no-op */ }
    return;
  }
  purgeLegacyAuthStorage();
})();

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const { user, setUser, isLoading, setIsLoading, firebaseLinked } = useAuthBootstrap({
    api,
    firebaseAuth: auth,
    hasFirebaseConfig,
    respectFreshSession: true,
    isFreshSessionRequested: wasFreshSessionRequested,
    legacyIdTokenExchange: 'firebase-login',
    crossTabLogoutRedirectUrl: (reason) => `/apoderado-login?reason=${reason}`,
  });

  const login = async (email: string, password: string, _role: string) => {
    setIsLoading(true);
    try {
      const response = await authService.login({ email, password });
      const u = response.user;
      if (response.success && u) {
        const userData = buildUserFromBff(u);
        setAdminCompat(userData, response.token ?? '', (u as any)?.subject);
        localStorage.setItem(
          getStorageKey(BASE_STORAGE_KEYS.AUTHENTICATED_USER),
          JSON.stringify(userData),
        );
        setUser(userData);
      } else {
        throw new Error(response.message || 'Error en la autenticación');
      }
    } catch (error: any) {
      throw new Error(error.message || 'Error en la autenticación');
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData: any, _role: string) => {
    setIsLoading(true);
    try {
      const response = await authService.register({
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
        password: userData.password,
        rut: userData.rut,
        phone: userData.phone,
      });
      const u = response.user;
      if (response.success && u) {
        const newUser: AuthUser = {
          ...buildUserFromBff(u),
          phone: userData.phone,
          rut: userData.rut,
        };
        localStorage.setItem(
          getStorageKey(BASE_STORAGE_KEYS.AUTHENTICATED_USER),
          JSON.stringify(newUser),
        );
        setUser(newUser);
      } else {
        throw new Error(response.message || 'Error al crear la cuenta');
      }
    } catch (error: any) {
      throw new Error(error.message || 'Error al crear la cuenta');
    } finally {
      setIsLoading(false);
    }
  };

  const logout = useCallback(() => {
    cancelScheduledRefresh();
    void authService.logout();
    [
      BASE_STORAGE_KEYS.CURRENT_PROFESSOR,
      BASE_STORAGE_KEYS.PROFESSOR_TOKEN,
      BASE_STORAGE_KEYS.PROFESSOR_USER,
      BASE_STORAGE_KEYS.APODERADO_TOKEN,
      BASE_STORAGE_KEYS.APODERADO_USER,
      BASE_STORAGE_KEYS.AUTH_TOKEN,
      BASE_STORAGE_KEYS.AUTHENTICATED_USER,
    ].forEach((k) => { try { localStorage.removeItem(getStorageKey(k)); } catch { /* no-op */ } });
    setUser(null);
    window.location.href = '/apoderado-login';
  }, [setUser]);

  const linkFirebaseAccount = useCallback(async () => {
    await authService.linkFirebaseAccount();
    try {
      const result = await runSharedRefresh();
      if (result) {
        authStore.updateAccessToken(result.token, result.expiresIn, result.user);
        scheduleRefresh(result.expiresIn);
      }
    } catch { /* el banner se ocultará porque firebaseLinked=true */ }
  }, []);

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    firebaseLinked,
    login,
    register,
    logout,
    linkFirebaseAccount,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (ctx === undefined) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return ctx;
};

