/**
 * Componente de Callback OIDC
 * Maneja la respuesta de autenticación de Keycloak y completa el flujo de login
 */

import React, { useEffect, useState } from 'react';
import { useOidcAuth, useAuthError } from '../../hooks/useOidcAuth';

interface OidcCallbackProps {
  /**
   * URL de redirección después del callback exitoso
   */
  successRedirect?: string;
  
  /**
   * URL de redirección si el callback falla
   */
  errorRedirect?: string;
  
  /**
   * Callback cuando el proceso es exitoso
   */
  onSuccess?: (user: any) => void;
  
  /**
   * Callback cuando el proceso falla
   */
  onError?: (error: string) => void;
}

export const OidcCallback: React.FC<OidcCallbackProps> = ({
  successRedirect = '/dashboard',
  errorRedirect = '/login',
  onSuccess,
  onError,
}) => {
  const { isAuthenticated, user, isLoading } = useOidcAuth();
  const { currentError } = useAuthError();
  
  const [callbackStatus, setCallbackStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [processingMessage, setProcessingMessage] = useState('Procesando autenticación...');

  useEffect(() => {
    const processCallback = async () => {
      try {
        setProcessingMessage('Validando respuesta de autenticación...');
        
        // Verificar si hay parámetros de callback en la URL
        const urlParams = new URLSearchParams(window.location.search);
        const hasCode = urlParams.has('code');
        const hasState = urlParams.has('state');
        const hasError = urlParams.has('error');

        if (hasError) {
          const error = urlParams.get('error');
          const errorDescription = urlParams.get('error_description');
          const fullError = errorDescription || error || 'Error desconocido en la autenticación';
          
          console.error('❌ Error en callback OIDC:', fullError);
          throw new Error(fullError);
        }

        if (!hasCode || !hasState) {
          throw new Error('Parámetros de callback inválidos');
        }

        setProcessingMessage('Completando proceso de autenticación...');
        
        // El servicio OIDC maneja automáticamente el callback
        // Solo necesitamos esperar a que se complete
        let attempts = 0;
        const maxAttempts = 30; // 15 segundos máximo
        
        const waitForAuth = () => {
          attempts++;
          
          if (isAuthenticated && user) {
            console.log('✅ Callback OIDC completado exitosamente');
            setCallbackStatus('success');
            setProcessingMessage('Autenticación exitosa. Redirigiendo...');
            
            // Limpiar URL
            window.history.replaceState({}, document.title, window.location.pathname);
            
            // Ejecutar callbacks
            onSuccess?.(user);
            
            // Redirigir después de un breve delay
            setTimeout(() => {
              window.location.href = successRedirect;
            }, 2000);
            
            return;
          }
          
          if (currentError) {
            throw new Error(currentError);
          }
          
          if (attempts >= maxAttempts) {
            throw new Error('Tiempo de espera agotado procesando la autenticación');
          }
          
          // Continuar esperando
          setTimeout(waitForAuth, 500);
        };
        
        // Iniciar espera
        if (!isLoading) {
          waitForAuth();
        }

      } catch (error) {
        console.error('❌ Error procesando callback:', error);
        
        const errorMessage = error instanceof Error ? error.message : 'Error procesando autenticación';
        
        setCallbackStatus('error');
        setProcessingMessage(`Error: ${errorMessage}`);
        
        onError?.(errorMessage);
        
        // Redirigir al login después de mostrar el error
        setTimeout(() => {
          window.location.href = errorRedirect;
        }, 5000);
      }
    };

    // Solo procesar si no está cargando inicialmente
    if (!isLoading) {
      processCallback();
    }
  }, [isLoading, isAuthenticated, user, currentError, onSuccess, onError, successRedirect, errorRedirect]);

  // Componente de carga
  if (callbackStatus === 'processing') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <div className="text-center">
              {/* Logo */}
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  Colegio Monte Tabor y Nazaret
                </h2>
                <p className="mt-1 text-sm text-gray-600">
                  Sistema de Admisión
                </p>
              </div>

              {/* Spinner */}
              <div className="mb-6">
                <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto"></div>
              </div>

              {/* Mensaje */}
              <div className="space-y-2">
                <h3 className="text-lg font-medium text-gray-900">
                  Completando Autenticación
                </h3>
                <p className="text-sm text-gray-600">
                  {processingMessage}
                </p>
              </div>

              {/* Información adicional */}
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-blue-700">
                      Por favor, no cierres esta ventana ni navegues a otra página mientras se completa el proceso de autenticación.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Componente de éxito
  if (callbackStatus === 'success') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <div className="text-center">
              {/* Logo */}
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  Colegio Monte Tabor y Nazaret
                </h2>
                <p className="mt-1 text-sm text-gray-600">
                  Sistema de Admisión
                </p>
              </div>

              {/* Ícono de éxito */}
              <div className="mb-6">
                <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100">
                  <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>

              {/* Mensaje de éxito */}
              <div className="space-y-2">
                <h3 className="text-lg font-medium text-green-900">
                  ¡Autenticación Exitosa!
                </h3>
                <p className="text-sm text-gray-600">
                  {processingMessage}
                </p>
              </div>

              {/* Información del usuario */}
              {user && (
                <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-md">
                  <div className="text-sm text-green-800 space-y-1">
                    <p><strong>Bienvenido:</strong> {user.profile.name || user.profile.email}</p>
                    <p><strong>Email:</strong> {user.profile.email}</p>
                    {user.profile.roles && (
                      <p><strong>Rol:</strong> {user.profile.roles.join(', ')}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Contador de redirección */}
              <div className="mt-4">
                <p className="text-xs text-gray-500">
                  Serás redirigido automáticamente en unos segundos...
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Componente de error
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="text-center">
            {/* Logo */}
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                Colegio Monte Tabor y Nazaret
              </h2>
              <p className="mt-1 text-sm text-gray-600">
                Sistema de Admisión
              </p>
            </div>

            {/* Ícono de error */}
            <div className="mb-6">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100">
                <svg className="h-8 w-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
            </div>

            {/* Mensaje de error */}
            <div className="space-y-2">
              <h3 className="text-lg font-medium text-red-900">
                Error de Autenticación
              </h3>
              <p className="text-sm text-gray-600">
                {processingMessage}
              </p>
            </div>

            {/* Acciones */}
            <div className="mt-6 space-y-3">
              <button
                onClick={() => window.location.href = errorRedirect}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Intentar de Nuevo
              </button>

              <button
                onClick={() => window.location.href = '/'}
                className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Ir al Inicio
              </button>
            </div>

            {/* Información de soporte */}
            <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-md">
              <div className="text-xs text-gray-600 space-y-1">
                <p><strong>¿Necesitas ayuda?</strong></p>
                <p>Contacta a soporte técnico: jorge.gangale@mtn.cl</p>
                <p>Horario de atención: Lunes a Viernes, 8:00 - 18:00</p>
              </div>
            </div>

            {/* Auto-redirección */}
            <div className="mt-4">
              <p className="text-xs text-gray-500">
                Serás redirigido al login automáticamente en 5 segundos...
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OidcCallback;