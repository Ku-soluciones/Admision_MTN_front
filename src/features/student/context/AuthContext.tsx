/**
 * AuthContext (student) — portal de estudiantes / exámenes.
 *
 * `legacyIdTokenExchange='sdk-helper'` (igual que admin).
 * Logout y cross-tab redirigen a `/#/examenes`.
 *
 * Antes este archivo tenía 412 líneas; ahora ~140.
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

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Limpieza de claves históricas al cargar el módulo.
(function bootstrapStorageOnce() { purgeLegacyAuthStorage(); })();

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const { user, setUser, isLoading, setIsLoading, firebaseLinked } = useAuthBootstrap({
    api,
    firebaseAuth: auth,
    hasFirebaseConfig,
    legacyIdTokenExchange: 'sdk-helper',
    crossTabLogoutRedirectUrl: (reason) => `/#/examenes?reason=${reason}`,
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
    window.location.href = '/#/examenes';
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

