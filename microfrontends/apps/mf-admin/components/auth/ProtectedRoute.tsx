/**
 * Sistema de Rutas Protegidas con RBAC
 * Integración completa con React Router y OIDC
 */

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useOidcAuth } from '../../hooks/useOidcAuth';
import { useRoleGuard } from './RoleGuard';

interface ProtectedRouteProps {
  children: React.ReactNode;
  /**
   * Rol requerido para acceder a la ruta
   */
  requiredRole?: string;
  /**
   * Múltiples roles permitidos (OR lógico)
   */
  allowedRoles?: string[];
  /**
   * Redirigir si no está autenticado
   */
  redirectTo?: string;
  /**
   * Redirigir si no tiene permisos
   */
  unauthorizedRedirect?: string;
  /**
   * Callback cuando se deniega el acceso
   */
  onAccessDenied?: (reason: 'unauthenticated' | 'unauthorized', userRoles: string[]) => void;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRole,
  allowedRoles,
  redirectTo = '/login',
  unauthorizedRedirect = '/unauthorized',
  onAccessDenied,
}) => {
  const { isAuthenticated, isLoading, roles } = useOidcAuth();
  const location = useLocation();

  // Mientras está cargando la autenticación
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verificando autenticación...</p>
        </div>
      </div>
    );
  }

  // Si no está autenticado
  if (!isAuthenticated) {
    onAccessDenied?.('unauthenticated', []);
    return (
      <Navigate 
        to={redirectTo} 
        state={{ from: location.pathname }} 
        replace 
      />
    );
  }

  // Verificar roles si están especificados
  if (requiredRole || allowedRoles) {
    const requiredRoles = requiredRole ? [requiredRole] : (allowedRoles || []);
    const hasAccess = requiredRoles.some(role => 
      roles.includes(role) || roles.includes(`ROLE_${role}`)
    );

    if (!hasAccess) {
      onAccessDenied?.('unauthorized', roles);
      return (
        <Navigate 
          to={unauthorizedRedirect} 
          state={{ 
            from: location.pathname,
            requiredRoles,
            userRoles: roles 
          }} 
          replace 
        />
      );
    }
  }

  return <>{children}</>;
};

/**
 * Ruta protegida para ADMIN
 */
export const AdminRoute: React.FC<Omit<ProtectedRouteProps, 'requiredRole'>> = (props) => (
  <ProtectedRoute {...props} requiredRole="ADMIN" />
);

/**
 * Ruta protegida para TEACHER (cualquier tipo)
 */
export const TeacherRoute: React.FC<Omit<ProtectedRouteProps, 'allowedRoles'>> = (props) => (
  <ProtectedRoute 
    {...props} 
    allowedRoles={['TEACHER', 'PSYCHOLOGIST', 'CYCLE_DIRECTOR', 'COORDINATOR']} 
  />
);

/**
 * Ruta protegida para CYCLE_DIRECTOR
 */
export const DirectorRoute: React.FC<Omit<ProtectedRouteProps, 'requiredRole'>> = (props) => (
  <ProtectedRoute {...props} requiredRole="CYCLE_DIRECTOR" />
);

/**
 * Ruta protegida para PSYCHOLOGIST
 */
export const PsychologistRoute: React.FC<Omit<ProtectedRouteProps, 'requiredRole'>> = (props) => (
  <ProtectedRoute {...props} requiredRole="PSYCHOLOGIST" />
);

/**
 * Ruta protegida para COORDINATOR
 */
export const CoordinatorRoute: React.FC<Omit<ProtectedRouteProps, 'requiredRole'>> = (props) => (
  <ProtectedRoute {...props} requiredRole="COORDINATOR" />
);

/**
 * Ruta protegida para APODERADO/Familias
 */
export const FamilyRoute: React.FC<Omit<ProtectedRouteProps, 'requiredRole'>> = (props) => (
  <ProtectedRoute {...props} requiredRole="APODERADO" />
);

/**
 * Ruta protegida para Personal (Admin + Profesores)
 */
export const StaffRoute: React.FC<Omit<ProtectedRouteProps, 'allowedRoles'>> = (props) => (
  <ProtectedRoute 
    {...props} 
    allowedRoles={['ADMIN', 'TEACHER', 'PSYCHOLOGIST', 'CYCLE_DIRECTOR', 'COORDINATOR']} 
  />
);

/**
 * Ruta protegida para Evaluadores
 */
export const EvaluatorRoute: React.FC<Omit<ProtectedRouteProps, 'allowedRoles'>> = (props) => (
  <ProtectedRoute 
    {...props} 
    allowedRoles={['TEACHER', 'PSYCHOLOGIST', 'CYCLE_DIRECTOR']} 
  />
);

/**
 * Página de acceso no autorizado
 */
interface UnauthorizedPageProps {
  title?: string;
  message?: string;
  showBackButton?: boolean;
  showLoginButton?: boolean;
}

export const UnauthorizedPage: React.FC<UnauthorizedPageProps> = ({
  title = 'Acceso No Autorizado',
  message = 'No tienes permisos para acceder a esta página.',
  showBackButton = true,
  showLoginButton = true,
}) => {
  const location = useLocation();
  const { user, roles } = useOidcAuth();
  const { getRoleDisplay } = useRoleGuard();
  
  const state = location.state as {
    from?: string;
    requiredRoles?: string[];
    userRoles?: string[];
  } | null;

  const handleGoBack = () => {
    window.history.back();
  };

  const handleLogin = () => {
    window.location.href = '/login';
  };

  const handleDashboard = () => {
    // Redirigir al dashboard apropiado según el rol
    if (roles.includes('ADMIN')) {
      window.location.href = '/admin';
    } else if (roles.includes('APODERADO')) {
      window.location.href = '/family';
    } else if (roles.some(r => ['TEACHER', 'PSYCHOLOGIST', 'CYCLE_DIRECTOR', 'COORDINATOR'].includes(r))) {
      window.location.href = '/professor';
    } else {
      window.location.href = '/dashboard';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="text-center">
            {/* Ícono de advertencia */}
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
              <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L5.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>

            {/* Título y mensaje */}
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {title}
            </h3>
            
            <p className="text-sm text-gray-500 mb-4">
              {message}
            </p>

            {/* Información de contexto */}
            <div className="bg-gray-50 border border-gray-200 rounded-md p-3 mb-6">
              <div className="text-xs text-gray-600 space-y-1">
                <p><strong>Usuario:</strong> {user?.profile?.email || 'No identificado'}</p>
                <p><strong>Roles actuales:</strong> {getRoleDisplay() || 'Ninguno'}</p>
                {state?.requiredRoles && (
                  <p><strong>Roles requeridos:</strong> {state.requiredRoles.join(' o ')}</p>
                )}
                {state?.from && (
                  <p><strong>Página solicitada:</strong> {state.from}</p>
                )}
              </div>
            </div>

            {/* Acciones */}
            <div className="space-y-3">
              {user && (
                <button
                  onClick={handleDashboard}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Ir a Mi Dashboard
                </button>
              )}
              
              {showBackButton && (
                <button
                  onClick={handleGoBack}
                  className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Volver Atrás
                </button>
              )}
              
              {showLoginButton && !user && (
                <button
                  onClick={handleLogin}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  Iniciar Sesión
                </button>
              )}
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="mt-6 text-center text-xs text-gray-500">
          <p>
            Para soporte técnico: jorge.gangale@mtn.cl
          </p>
          <p className="mt-1">
            Colegio Monte Tabor y Nazaret - Sistema de Admisión
          </p>
        </div>
      </div>
    </div>
  );
};

export default ProtectedRoute;