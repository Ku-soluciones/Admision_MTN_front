/**
 * Componente de Logout OIDC con integración Keycloak
 * Maneja el cierre de sesión seguro y limpieza de estado
 */

import React, { useState } from 'react';
import { useOidcAuth, useAuthError } from '../../hooks/useOidcAuth';

interface OidcLogoutProps {
  /**
   * Callback cuando el logout es exitoso
   */
  onLogoutSuccess?: () => void;
  
  /**
   * Callback cuando el logout falla
   */
  onLogoutError?: (error: string) => void;
  
  /**
   * Mostrar modal de confirmación
   */
  showConfirmation?: boolean;
  
  /**
   * Texto del botón
   */
  buttonText?: string;
  
  /**
   * Clase CSS personalizada para el botón
   */
  buttonClassName?: string;
  
  /**
   * Mostrar como ícono solamente
   */
  iconOnly?: boolean;
}

export const OidcLogout: React.FC<OidcLogoutProps> = ({
  onLogoutSuccess,
  onLogoutError,
  showConfirmation = true,
  buttonText = 'Cerrar Sesión',
  buttonClassName,
  iconOnly = false,
}) => {
  const { logout, isLoading } = useOidcAuth();
  const { currentError } = useAuthError();
  
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      
      console.log('🚪 Cerrando sesión...');
      
      await logout();
      
      console.log('✅ Sesión cerrada exitosamente');
      onLogoutSuccess?.();
      
    } catch (error) {
      console.error('❌ Error cerrando sesión:', error);
      
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Error desconocido cerrando sesión';
      
      onLogoutError?.(errorMessage);
      
    } finally {
      setIsLoggingOut(false);
      setShowModal(false);
    }
  };

  const handleLogoutClick = () => {
    if (showConfirmation) {
      setShowModal(true);
    } else {
      handleLogout();
    }
  };

  // Clases por defecto para el botón
  const defaultButtonClassName = iconOnly
    ? 'inline-flex items-center p-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500'
    : 'inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500';

  const buttonClass = buttonClassName || defaultButtonClassName;

  return (
    <>
      {/* Botón de logout */}
      <button
        onClick={handleLogoutClick}
        disabled={isLoggingOut || isLoading}
        className={`${buttonClass} ${(isLoggingOut || isLoading) ? 'opacity-50 cursor-not-allowed' : ''}`}
        title={iconOnly ? buttonText : undefined}
      >
        {isLoggingOut ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
            {!iconOnly && 'Cerrando...'}
          </>
        ) : (
          <>
            {/* Ícono de logout */}
            <svg 
              className={iconOnly ? 'h-5 w-5' : 'h-4 w-4 mr-2'}
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" 
              />
            </svg>
            {!iconOnly && buttonText}
          </>
        )}
      </button>

      {/* Modal de confirmación */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50" onClick={() => setShowModal(false)}>
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white" onClick={(e) => e.stopPropagation()}>
            <div className="mt-3 text-center">
              {/* Ícono */}
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                <svg 
                  className="h-6 w-6 text-red-600" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" 
                  />
                </svg>
              </div>
              
              {/* Título */}
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Confirmar Cierre de Sesión
              </h3>
              
              {/* Mensaje */}
              <p className="text-sm text-gray-500 mb-4">
                ¿Estás seguro de que deseas cerrar tu sesión? 
                Serás redirigido a la página de login.
              </p>

              {/* Error si existe */}
              {currentError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-800">
                    {currentError}
                  </p>
                </div>
              )}
              
              {/* Botones */}
              <div className="flex space-x-3 justify-center">
                <button
                  onClick={() => setShowModal(false)}
                  disabled={isLoggingOut}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancelar
                </button>
                
                <button
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoggingOut ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Cerrando...
                    </div>
                  ) : (
                    'Cerrar Sesión'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

/**
 * Componente de logout simple (sin confirmación)
 */
export const SimpleLogout: React.FC<Omit<OidcLogoutProps, 'showConfirmation'>> = (props) => (
  <OidcLogout {...props} showConfirmation={false} />
);

/**
 * Componente de logout con ícono solamente
 */
export const IconLogout: React.FC<OidcLogoutProps> = (props) => (
  <OidcLogout 
    {...props} 
    iconOnly={true}
    buttonClassName="inline-flex items-center p-2 text-gray-400 hover:text-red-600 hover:bg-gray-100 rounded-md transition-colors duration-200"
  />
);

export default OidcLogout;