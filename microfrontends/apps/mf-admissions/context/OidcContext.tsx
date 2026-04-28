/**
 * OIDC Context - Estado global de autenticación para el Sistema de Admisión MTN
 * Integración con Keycloak y manejo de roles RBAC
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { oidcService, type MTNUser, type AuthState } from '../services/oidcService';

interface OidcContextType {
  // Estado de autenticación
  authState: AuthState;
  
  // Acciones de autenticación
  login: (role?: 'admin' | 'user') => Promise<void>;
  logout: () => Promise<void>;
  renewToken: () => Promise<MTNUser | null>;
  
  // Utilidades de autorización
  hasRole: (role: string) => boolean;
  hasAnyRole: (roles: string[]) => boolean;
  getAccessToken: () => string | null;
  
  // Información específica de Chile
  getChileanUserInfo: () => {
    rut?: string;
    maskedRut?: string;
    phone?: string;
    maskedPhone?: string;
    timezone: string;
    locale: string;
  };
}

const OidcContext = createContext<OidcContextType | undefined>(undefined);

interface OidcProviderProps {
  children: React.ReactNode;
}

export const OidcProvider: React.FC<OidcProviderProps> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
    roles: [],
    permissions: [],
  });

  const [isInitialized, setIsInitialized] = useState(false);

  // Listener para cambios de estado de autenticación
  const handleAuthStateChange = useCallback((newState: AuthState) => {
    console.log('🔄 Estado de autenticación actualizado:', {
      isAuthenticated: newState.isAuthenticated,
      roles: newState.roles,
      user: newState.user?.profile?.email,
    });
    
    setAuthState(newState);
  }, []);

  // Inicialización del servicio OIDC
  useEffect(() => {
    let isMounted = true;

    const initializeOidc = async () => {
      try {
        console.log('🚀 Inicializando servicio OIDC...');
        
        // Agregar listener para cambios de estado
        oidcService.addAuthStateListener(handleAuthStateChange);
        
        // Verificar si hay un usuario ya autenticado
        const currentUser = oidcService.getCurrentUser();
        const isAuth = oidcService.isAuthenticated();
        
        if (isMounted) {
          const initialState: AuthState = {
            user: currentUser,
            isAuthenticated: isAuth,
            isLoading: false,
            error: null,
            roles: oidcService.getUserRoles(),
            permissions: [], // TODO: Implementar permisos si es necesario
          };
          
          setAuthState(initialState);
          setIsInitialized(true);
          
          console.log('✅ OIDC inicializado correctamente:', {
            isAuthenticated: isAuth,
            user: currentUser?.profile?.email,
            roles: oidcService.getUserRoles(),
          });
        }
      } catch (error) {
        console.error('❌ Error inicializando OIDC:', error);
        
        if (isMounted) {
          setAuthState({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: error instanceof Error ? error.message : 'Error de inicialización',
            roles: [],
            permissions: [],
          });
          setIsInitialized(true);
        }
      }
    };

    initializeOidc();

    // Cleanup
    return () => {
      isMounted = false;
      oidcService.removeAuthStateListener(handleAuthStateChange);
    };
  }, [handleAuthStateChange]);

  // Manejar callback de autenticación en la URL
  useEffect(() => {
    if (!isInitialized) return;

    const handleAuthCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const hasAuthCallback = urlParams.has('code') && urlParams.has('state');

      if (hasAuthCallback) {
        console.log('🔄 Procesando callback de autenticación...');
        
        setAuthState(prev => ({ ...prev, isLoading: true }));
        
        try {
          const user = await oidcService.handleCallback();
          console.log('✅ Callback de autenticación exitoso:', user?.profile?.email);
          
          // Limpiar parámetros de la URL
          window.history.replaceState({}, document.title, window.location.pathname);
        } catch (error) {
          console.error('❌ Error en callback de autenticación:', error);
          
          setAuthState(prev => ({
            ...prev,
            isLoading: false,
            error: error instanceof Error ? error.message : 'Error de autenticación',
          }));
        }
      }
    };

    handleAuthCallback();
  }, [isInitialized]);

  // Acciones de autenticación
  const login = useCallback(async (role?: 'admin' | 'user') => {
    try {
      console.log(`🔐 Iniciando login${role ? ` como ${role}` : ''}...`);
      
      setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
      
      await oidcService.login(role);
    } catch (error) {
      console.error('❌ Error en login:', error);
      
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Error de login',
      }));
      
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      console.log('🚪 Cerrando sesión...');
      
      setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
      
      await oidcService.logout();
    } catch (error) {
      console.error('❌ Error en logout:', error);
      
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Error de logout',
      }));
      
      throw error;
    }
  }, []);

  const renewToken = useCallback(async () => {
    try {
      console.log('🔄 Renovando token...');
      
      const user = await oidcService.renewToken();
      
      if (user) {
        console.log('✅ Token renovado exitosamente');
      } else {
        console.warn('⚠️ No se pudo renovar el token');
      }
      
      return user;
    } catch (error) {
      console.error('❌ Error renovando token:', error);
      return null;
    }
  }, []);

  // Utilidades de autorización
  const hasRole = useCallback((role: string): boolean => {
    return oidcService.hasRole(role);
  }, []);

  const hasAnyRole = useCallback((roles: string[]): boolean => {
    return oidcService.hasAnyRole(roles);
  }, []);

  const getAccessToken = useCallback((): string | null => {
    return oidcService.getAccessToken();
  }, []);

  const getChileanUserInfo = useCallback(() => {
    return oidcService.getChileanUserInfo();
  }, []);

  // Valor del contexto
  const contextValue: OidcContextType = {
    authState,
    login,
    logout,
    renewToken,
    hasRole,
    hasAnyRole,
    getAccessToken,
    getChileanUserInfo,
  };

  return (
    <OidcContext.Provider value={contextValue}>
      {children}
    </OidcContext.Provider>
  );
};

// Hook personalizado para usar el contexto
export const useOidc = (): OidcContextType => {
  const context = useContext(OidcContext);
  
  if (context === undefined) {
    throw new Error('useOidc debe ser usado dentro de un OidcProvider');
  }
  
  return context;
};

// Hook de conveniencia para verificar autenticación
export const useAuth = () => {
  const { authState, login, logout } = useOidc();
  
  return {
    isAuthenticated: authState.isAuthenticated,
    isLoading: authState.isLoading,
    user: authState.user,
    error: authState.error,
    roles: authState.roles,
    login,
    logout,
  };
};

// Hook de conveniencia para verificar roles
export const useAuthRole = (requiredRole: string) => {
  const { hasRole, authState } = useOidc();
  
  return {
    hasRole: hasRole(requiredRole),
    isAuthenticated: authState.isAuthenticated,
    isLoading: authState.isLoading,
  };
};

// Hook de conveniencia para verificar múltiples roles
export const useAuthRoles = (requiredRoles: string[]) => {
  const { hasAnyRole, authState } = useOidc();
  
  return {
    hasAnyRole: hasAnyRole(requiredRoles),
    isAuthenticated: authState.isAuthenticated,
    isLoading: authState.isLoading,
  };
};

export default OidcProvider;