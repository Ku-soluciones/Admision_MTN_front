/**
 * Custom Hooks para Autenticación OIDC
 * Hooks especializados para diferentes casos de uso de autenticación
 */

import { useCallback, useEffect, useState } from 'react';
import { useOidc } from '../context/OidcContext';
import type { MTNUser } from '../services/oidcService';

/**
 * Hook para manejo completo de autenticación
 */
export const useOidcAuth = () => {
  const oidc = useOidc();
  
  const loginAsAdmin = useCallback(() => oidc.login('admin'), [oidc]);
  const loginAsUser = useCallback(() => oidc.login('user'), [oidc]);
  
  return {
    // Estado
    ...oidc.authState,
    
    // Acciones básicas
    login: oidc.login,
    logout: oidc.logout,
    renewToken: oidc.renewToken,
    
    // Acciones específicas
    loginAsAdmin,
    loginAsUser,
    
    // Utilidades
    hasRole: oidc.hasRole,
    hasAnyRole: oidc.hasAnyRole,
    getAccessToken: oidc.getAccessToken,
    getChileanUserInfo: oidc.getChileanUserInfo,
  };
};

/**
 * Hook para verificación de rol específico
 */
export const useRoleCheck = (requiredRole: string) => {
  const { hasRole, authState } = useOidc();
  
  return {
    hasRequiredRole: hasRole(requiredRole),
    isAuthenticated: authState.isAuthenticated,
    isLoading: authState.isLoading,
    canAccess: authState.isAuthenticated && hasRole(requiredRole),
  };
};

/**
 * Hook para verificación de múltiples roles (OR)
 */
export const useMultiRoleCheck = (requiredRoles: string[]) => {
  const { hasAnyRole, authState } = useOidc();
  
  return {
    hasAnyRequiredRole: hasAnyRole(requiredRoles),
    isAuthenticated: authState.isAuthenticated,
    isLoading: authState.isLoading,
    canAccess: authState.isAuthenticated && hasAnyRole(requiredRoles),
  };
};

/**
 * Hook para manejo de token automático
 */
export const useTokenManager = () => {
  const { getAccessToken, renewToken, authState } = useOidc();
  const [tokenRenewalAttempts, setTokenRenewalAttempts] = useState(0);
  
  // Auto-renovación de token cuando está próximo a expirar
  useEffect(() => {
    if (!authState.isAuthenticated || !authState.user) return;
    
    const checkTokenExpiry = () => {
      const user = authState.user;
      if (!user?.expires_at) return;
      
      const expiresAt = user.expires_at * 1000; // Convertir a milliseconds
      const now = Date.now();
      const timeUntilExpiry = expiresAt - now;
      const fiveMinutes = 5 * 60 * 1000;
      
      // Si el token expira en menos de 5 minutos, intentar renovar
      if (timeUntilExpiry <= fiveMinutes && tokenRenewalAttempts < 3) {
        console.log('⏰ Token próximo a expirar, renovando automáticamente...');
        
        renewToken()
          .then((newUser) => {
            if (newUser) {
              console.log('✅ Token renovado automáticamente');
              setTokenRenewalAttempts(0);
            } else {
              console.warn('⚠️ No se pudo renovar el token automáticamente');
              setTokenRenewalAttempts(prev => prev + 1);
            }
          })
          .catch((error) => {
            console.error('❌ Error renovando token automáticamente:', error);
            setTokenRenewalAttempts(prev => prev + 1);
          });
      }
    };
    
    // Verificar cada minuto
    const interval = setInterval(checkTokenExpiry, 60000);
    
    // Verificar inmediatamente
    checkTokenExpiry();
    
    return () => clearInterval(interval);
  }, [authState.isAuthenticated, authState.user, renewToken, tokenRenewalAttempts]);
  
  // Obtener token con renovación automática si es necesario
  const getValidToken = useCallback(async (): Promise<string | null> => {
    const currentToken = getAccessToken();
    
    if (!currentToken) {
      console.warn('⚠️ No hay token disponible');
      return null;
    }
    
    if (!authState.user?.expires_at) {
      return currentToken;
    }
    
    const expiresAt = authState.user.expires_at * 1000;
    const now = Date.now();
    const oneMinute = 60 * 1000;
    
    // Si el token expira en menos de 1 minuto, renovar
    if (expiresAt - now <= oneMinute) {
      console.log('🔄 Token expirando pronto, renovando...');
      
      try {
        const newUser = await renewToken();
        return newUser ? getAccessToken() : null;
      } catch (error) {
        console.error('❌ Error renovando token:', error);
        return null;
      }
    }
    
    return currentToken;
  }, [getAccessToken, authState.user, renewToken]);
  
  return {
    getAccessToken,
    getValidToken,
    renewToken,
    tokenRenewalAttempts,
  };
};

/**
 * Hook para información del usuario específica de Chile
 */
export const useChileanUserInfo = () => {
  const { authState, getChileanUserInfo } = useOidc();
  const [chileanInfo, setChileanInfo] = useState(() => getChileanUserInfo());
  
  useEffect(() => {
    setChileanInfo(getChileanUserInfo());
  }, [authState.user, getChileanUserInfo]);
  
  return {
    chileanInfo,
    user: authState.user,
    isAuthenticated: authState.isAuthenticated,
  };
};

/**
 * Hook para manejo de errores de autenticación
 */
export const useAuthError = () => {
  const { authState } = useOidc();
  const [lastError, setLastError] = useState<string | null>(null);
  const [errorHistory, setErrorHistory] = useState<Array<{
    error: string;
    timestamp: Date;
  }>>([]);
  
  useEffect(() => {
    if (authState.error && authState.error !== lastError) {
      setLastError(authState.error);
      setErrorHistory(prev => [
        ...prev.slice(-4), // Mantener solo los últimos 5 errores
        {
          error: authState.error!,
          timestamp: new Date(),
        }
      ]);
    }
  }, [authState.error, lastError]);
  
  const clearError = useCallback(() => {
    setLastError(null);
  }, []);
  
  const clearErrorHistory = useCallback(() => {
    setErrorHistory([]);
  }, []);
  
  return {
    currentError: authState.error,
    lastError,
    errorHistory,
    hasError: !!authState.error,
    clearError,
    clearErrorHistory,
  };
};

/**
 * Hook para redirecciones basadas en autenticación
 */
export const useAuthRedirect = () => {
  const { authState } = useOidc();
  
  const redirectIfNotAuthenticated = useCallback((fallbackPath: string = '/login') => {
    if (!authState.isLoading && !authState.isAuthenticated) {
      console.log('🔄 Usuario no autenticado, redirigiendo a:', fallbackPath);
      window.location.href = fallbackPath;
    }
  }, [authState.isAuthenticated, authState.isLoading]);
  
  const redirectIfAuthenticated = useCallback((fallbackPath: string = '/dashboard') => {
    if (!authState.isLoading && authState.isAuthenticated) {
      console.log('🔄 Usuario ya autenticado, redirigiendo a:', fallbackPath);
      window.location.href = fallbackPath;
    }
  }, [authState.isAuthenticated, authState.isLoading]);
  
  return {
    redirectIfNotAuthenticated,
    redirectIfAuthenticated,
    isLoading: authState.isLoading,
    isAuthenticated: authState.isAuthenticated,
  };
};

/**
 * Hook para persistencia de estado de autenticación
 */
export const useAuthPersistence = () => {
  const { authState } = useOidc();
  
  // Guardar estado en localStorage para recuperación
  useEffect(() => {
    if (authState.isAuthenticated && authState.user) {
      const persistedState = {
        isAuthenticated: true,
        email: authState.user.profile.email,
        roles: authState.roles,
        lastLogin: new Date().toISOString(),
      };
      
      localStorage.setItem('mtn_auth_state', JSON.stringify(persistedState));
    } else {
      localStorage.removeItem('mtn_auth_state');
    }
  }, [authState.isAuthenticated, authState.user, authState.roles]);
  
  const getPersistedState = useCallback(() => {
    try {
      const stored = localStorage.getItem('mtn_auth_state');
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('❌ Error leyendo estado persistido:', error);
      return null;
    }
  }, []);
  
  const clearPersistedState = useCallback(() => {
    localStorage.removeItem('mtn_auth_state');
  }, []);
  
  return {
    getPersistedState,
    clearPersistedState,
  };
};

export default useOidcAuth;