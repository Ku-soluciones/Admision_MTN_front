/**
 * Componente de Login OIDC con integración Keycloak
 * Sistema de autenticación para el Colegio Monte Tabor y Nazaret
 */

import React, { useState, useEffect } from 'react';
import { useOidcAuth, useAuthRedirect, useAuthError } from '../../hooks/useOidcAuth';

interface OidcLoginProps {
  /**
   * Tipo de login (admin o user)
   */
  loginType?: 'admin' | 'user';
  
  /**
   * URL de redirección después del login exitoso
   */
  redirectPath?: string;
  
  /**
   * Título personalizado para el componente
   */
  title?: string;
  
  /**
   * Mostrar opciones de login dual
   */
  showDualLogin?: boolean;
  
  /**
   * Callback cuando el login es exitoso
   */
  onLoginSuccess?: (user: any) => void;
  
  /**
   * Callback cuando el login falla
   */
  onLoginError?: (error: string) => void;
}

export const OidcLogin: React.FC<OidcLoginProps> = ({
  loginType,
  redirectPath = '/dashboard',
  title = 'Iniciar Sesión - Sistema de Admisión MTN',
  showDualLogin = false,
  onLoginSuccess,
  onLoginError,
}) => {
  const {
    isAuthenticated,
    isLoading,
    login,
    user,
    error,
  } = useOidcAuth();
  
  const { redirectIfAuthenticated } = useAuthRedirect();
  const { currentError, clearError } = useAuthError();
  
  const [selectedLoginType, setSelectedLoginType] = useState<'admin' | 'user'>(
    loginType || 'user'
  );
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Redirigir si ya está autenticado
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      redirectIfAuthenticated(redirectPath);
      onLoginSuccess?.(user);
    }
  }, [isAuthenticated, isLoading, redirectIfAuthenticated, redirectPath, onLoginSuccess, user]);

  // Manejar errores
  useEffect(() => {
    if (currentError) {
      onLoginError?.(currentError);
      setIsLoggingIn(false);
    }
  }, [currentError, onLoginError]);

  const handleLogin = async () => {
    try {
      setIsLoggingIn(true);
      clearError();
      
      console.log(`🔐 Iniciando login como ${selectedLoginType}...`);
      
      await login(selectedLoginType);
      
      // El manejo del éxito se realiza en el useEffect de isAuthenticated
    } catch (error) {
      console.error('❌ Error en login:', error);
      setIsLoggingIn(false);
      
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Error desconocido en el login';
      
      onLoginError?.(errorMessage);
    }
  };

  const getLoginTypeLabel = (type: 'admin' | 'user'): string => {
    return type === 'admin' 
      ? 'Administrador / Personal' 
      : 'Apoderados / Familias';
  };

  const getLoginTypeDescription = (type: 'admin' | 'user'): string => {
    return type === 'admin'
      ? 'Acceso para administradores, profesores, coordinadores y directivos'
      : 'Acceso para familias y apoderados del proceso de admisión';
  };

  // Si está cargando la autenticación inicial
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verificando autenticación...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Logo y Título */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900">
            Colegio Monte Tabor y Nazaret
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Sistema de Admisión
          </p>
        </div>

        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <h3 className="text-xl font-semibold text-gray-900 mb-6 text-center">
            {title}
          </h3>

          {/* Selector de tipo de login */}
          {showDualLogin && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Selecciona tu tipo de acceso:
              </label>
              
              <div className="space-y-3">
                {(['admin', 'user'] as const).map((type) => (
                  <div key={type} className="relative">
                    <label className="flex items-start cursor-pointer">
                      <input
                        type="radio"
                        name="loginType"
                        value={type}
                        checked={selectedLoginType === type}
                        onChange={(e) => setSelectedLoginType(e.target.value as 'admin' | 'user')}
                        className="mt-1 h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                        disabled={isLoggingIn}
                      />
                      <div className="ml-3">
                        <div className="text-sm font-medium text-gray-900">
                          {getLoginTypeLabel(type)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {getLoginTypeDescription(type)}
                        </div>
                      </div>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Información del tipo de login seleccionado */}
          {!showDualLogin && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-blue-700">
                    <strong>{getLoginTypeLabel(selectedLoginType)}</strong>
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    {getLoginTypeDescription(selectedLoginType)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Mensaje de error */}
          {currentError && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-800">
                    <strong>Error de autenticación</strong>
                  </p>
                  <p className="text-xs text-red-700 mt-1">
                    {currentError}
                  </p>
                </div>
              </div>
              
              <button
                onClick={clearError}
                className="mt-2 text-xs text-red-600 hover:text-red-800 underline"
              >
                Cerrar
              </button>
            </div>
          )}

          {/* Botón de login */}
          <div>
            <button
              onClick={handleLogin}
              disabled={isLoggingIn}
              className={`
                w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white
                ${isLoggingIn
                  ? 'bg-gray-400 cursor-not-allowed'
                  : selectedLoginType === 'admin'
                    ? 'bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500'
                    : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                }
                transition duration-150 ease-in-out
              `}
            >
              {isLoggingIn ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Iniciando sesión...
                </div>
              ) : (
                `Ingresar como ${getLoginTypeLabel(selectedLoginType)}`
              )}
            </button>
          </div>

          {/* Información adicional */}
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">
                  Información importante
                </span>
              </div>
            </div>

            <div className="mt-4 text-xs text-gray-600 space-y-2">
              <p>
                • Este sistema utiliza autenticación segura con Keycloak
              </p>
              <p>
                • Serás redirigido a la plataforma de autenticación oficial
              </p>
              <p>
                • Para soporte técnico, contacta a: jorge.gangale@mtn.cl
              </p>
              {selectedLoginType === 'user' && (
                <p>
                  • Si no tienes cuenta, puedes registrarte en el proceso de admisión
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-8 text-center text-xs text-gray-500">
        <p>
          © 2024 Colegio Monte Tabor y Nazaret - Sistema de Admisión
        </p>
        <p className="mt-1">
          Zona horaria: America/Santiago
        </p>
      </div>
    </div>
  );
};

export default OidcLogin;