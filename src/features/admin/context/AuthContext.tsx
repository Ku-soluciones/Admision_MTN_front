/**
 * AuthContext (admin).
 *
 * Modo `waitForFirebase=true`: el hook espera a que AMBOS mecanismos
 * (bootstrap BFF + listener Firebase) terminen antes de bajar
 * `isLoading=false`. Sin esto, `ProtectedAdminRoute` puede redirigir
 * a /login antes de que Firebase pueda restaurar la sesión.
 *
 * Modo `clearStoreOnRefreshFailure=false`: no limpiamos el store si el
 * refresh falla, porque Firebase puede rehidratar después.
 *
 * Modo `legacyIdTokenExchange='sdk-helper'`: si hay un idToken legacy
 * persistido en AUTH_TOKEN, lo intercambia vía `exchangeFirebaseToken()`.
 *
 * Logout redirige a `appUrls.home`.
 *
 * Antes este archivo tenía 434 líneas; ahora ~145.
 */
import React, { createContext, useContext, useCallback } from 'react';
import { auth, hasFirebaseConfig } from '../src/lib/firebase';
import { authService } from '../services/authService';
import api from '../services/api';
import { appUrls } from '../utils/appUrls';
import {
  getStorageKey,
  BASE_STORAGE_KEYS,
  authStore,
  cancelScheduledRefresh,
  scheduleRefresh,
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
    // Admin: anti-race en F5. Replica el comportamiento de la doble
    // bandera `bootstrapDone + firebaseDone` del provider anterior.
    waitForFirebase: true,
    // Si el refresh falla, NO limpiamos: damos chance a Firebase de rehidratar.
    clearStoreOnRefreshFailure: false,
    // Si hay idToken legacy en AUTH_TOKEN, lo intercambia via SDK helper.
    legacyIdTokenExchange: 'sdk-helper',
    crossTabLogoutRedirectUrl: (reason) => `${appUrls.home}?reason=${reason}`,
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
    window.location.href = appUrls.home;
  }, [setUser]);

  const linkFirebaseAccount = useCallback(async () => {
    await authService.linkFirebaseAccount();
    try {
      const res = await api.post('/v1/auth/refresh');
      if (res.data?.token && res.data?.expiresIn) {
        authStore.updateAccessToken(res.data.token, res.data.expiresIn, res.data.user);
        scheduleRefresh(res.data.expiresIn);
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


