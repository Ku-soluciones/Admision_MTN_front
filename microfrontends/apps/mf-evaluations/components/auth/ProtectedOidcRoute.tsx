/**
 * Componentes de Rutas Protegidas con OIDC y RBAC
 * Sistema de control de acceso basado en roles para el Sistema de Admisión MTN
 */

import React from 'react';
import { useOidcAuth, useRoleCheck, useMultiRoleCheck, useAuthRedirect } from '../../hooks/useOidcAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  /**
   * Rol requerido para acceder a la ruta
   */
  requiredRole?: string;
  /**
   * Múltiples roles permitidos (OR lógico)
   */
  requiredRoles?: string[];
  /**
   * URL de redirección si no está autenticado
   */
  redirectTo?: string;
  /**
   * Componente a mostrar mientras carga
   */
  loadingComponent?: React.ReactNode;
  /**
   * Componente a mostrar si no tiene permisos
   */
  unauthorizedComponent?: React.ReactNode;
  /**
   * Callback cuando no tiene permisos
   */
  onUnauthorized?: () => void;
  /**
   * Permitir acceso si no está autenticado (para rutas públicas con contenido condicional)
   */
  allowUnauthenticated?: boolean;
}

/**
 * Componente base de ruta protegida
 */
export const ProtectedOidcRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRole,
  requiredRoles,
  redirectTo = '/login',
  loadingComponent,
  unauthorizedComponent,
  onUnauthorized,
  allowUnauthenticated = false,
}) => {
  const { isAuthenticated, isLoading, user } = useOidcAuth();
  const { redirectIfNotAuthenticated } = useAuthRedirect();
  
  // Usar hook apropiado según los props
  const roleCheck = requiredRole 
    ? useRoleCheck(requiredRole)
    : requiredRoles 
    ? useMultiRoleCheck(requiredRoles)
    : null;

  // Componente de carga por defecto
  const DefaultLoadingComponent = () => (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Verificando permisos...</p>
      </div>
    </div>
  );

  // Componente de no autorizado por defecto
  const DefaultUnauthorizedComponent = () => (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center max-w-md mx-auto">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
          <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L5.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Acceso No Autorizado
        </h3>
        
        <p className="text-sm text-gray-500 mb-4">
          No tienes permisos para acceder a esta sección del sistema.
        </p>
        
        <div className="text-xs text-gray-400 space-y-1">
          <p>Usuario: {user?.profile?.email || 'No autenticado'}</p>
          <p>Roles actuales: {user ? JSON.stringify(roleCheck?.hasRequiredRole || roleCheck?.hasAnyRequiredRole || false) : 'Ninguno'}</p>
          <p>Rol requerido: {requiredRole || requiredRoles?.join(', ') || 'Autenticación'}</p>
        </div>
        
        <div className="mt-6 space-x-3">
          <button
            onClick={() => window.location.href = '/dashboard'}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Ir al Dashboard
          </button>
          
          <button
            onClick={() => window.location.href = '/login'}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cambiar Usuario
          </button>
        </div>
      </div>
    </div>
  );

  // Si está cargando
  if (isLoading || (roleCheck && roleCheck.isLoading)) {
    return <>{loadingComponent || <DefaultLoadingComponent />}</>;
  }

  // Si no está autenticado
  if (!isAuthenticated) {
    if (allowUnauthenticated) {
      return <>{children}</>;
    }
    
    // Redirigir al login si no está autenticado
    redirectIfNotAuthenticated(redirectTo);
    return <DefaultLoadingComponent />;
  }

  // Si requiere rol específico y no lo tiene
  if (roleCheck && !roleCheck.canAccess) {
    onUnauthorized?.();
    return <>{unauthorizedComponent || <DefaultUnauthorizedComponent />}</>;
  }

  // Usuario autenticado y con permisos
  return <>{children}</>;
};

/**
 * Ruta protegida para Administradores
 */
export const AdminProtectedRoute: React.FC<Omit<ProtectedRouteProps, 'requiredRole'>> = (props) => (
  <ProtectedOidcRoute {...props} requiredRole="ADMIN" />
);

/**
 * Ruta protegida para Profesores (cualquier tipo)
 */
export const TeacherProtectedRoute: React.FC<Omit<ProtectedRouteProps, 'requiredRoles'>> = (props) => (
  <ProtectedOidcRoute 
    {...props} 
    requiredRoles={['TEACHER', 'PSYCHOLOGIST', 'CYCLE_DIRECTOR', 'COORDINATOR']} 
  />
);

/**
 * Ruta protegida para Directivos (Director de Ciclo)
 */
export const DirectorProtectedRoute: React.FC<Omit<ProtectedRouteProps, 'requiredRole'>> = (props) => (
  <ProtectedOidcRoute {...props} requiredRole="CYCLE_DIRECTOR" />
);

/**
 * Ruta protegida para Psicólogos
 */
export const PsychologistProtectedRoute: React.FC<Omit<ProtectedRouteProps, 'requiredRole'>> = (props) => (
  <ProtectedOidcRoute {...props} requiredRole="PSYCHOLOGIST" />
);

/**
 * Ruta protegida para Coordinadores
 */
export const CoordinatorProtectedRoute: React.FC<Omit<ProtectedRouteProps, 'requiredRole'>> = (props) => (
  <ProtectedOidcRoute {...props} requiredRole="COORDINATOR" />
);

/**
 * Ruta protegida para Apoderados/Familias
 */
export const FamilyProtectedRoute: React.FC<Omit<ProtectedRouteProps, 'requiredRole'>> = (props) => (
  <ProtectedOidcRoute {...props} requiredRole="APODERADO" />
);

/**
 * Ruta protegida para Personal (Admin + Profesores)
 */
export const StaffProtectedRoute: React.FC<Omit<ProtectedRouteProps, 'requiredRoles'>> = (props) => (
  <ProtectedOidcRoute 
    {...props} 
    requiredRoles={['ADMIN', 'TEACHER', 'PSYCHOLOGIST', 'CYCLE_DIRECTOR', 'COORDINATOR']} 
  />
);

/**
 * Ruta protegida para Evaluadores (Profesores + Psicólogos + Directores)
 */
export const EvaluatorProtectedRoute: React.FC<Omit<ProtectedRouteProps, 'requiredRoles'>> = (props) => (
  <ProtectedOidcRoute 
    {...props} 
    requiredRoles={['TEACHER', 'PSYCHOLOGIST', 'CYCLE_DIRECTOR']} 
  />
);

/**
 * Higher Order Component para proteger componentes
 */
export const withOidcAuth = <P extends object>(
  Component: React.ComponentType<P>,
  options: Omit<ProtectedRouteProps, 'children'> = {}
) => {
  const ProtectedComponent: React.FC<P> = (props) => (
    <ProtectedOidcRoute {...options}>
      <Component {...props} />
    </ProtectedOidcRoute>
  );

  ProtectedComponent.displayName = `withOidcAuth(${Component.displayName || Component.name})`;
  
  return ProtectedComponent;
};

/**
 * HOC específicos por rol
 */
export const withAdminAuth = <P extends object>(Component: React.ComponentType<P>) =>
  withOidcAuth(Component, { requiredRole: 'ADMIN' });

export const withTeacherAuth = <P extends object>(Component: React.ComponentType<P>) =>
  withOidcAuth(Component, { requiredRoles: ['TEACHER', 'PSYCHOLOGIST', 'CYCLE_DIRECTOR', 'COORDINATOR'] });

export const withFamilyAuth = <P extends object>(Component: React.ComponentType<P>) =>
  withOidcAuth(Component, { requiredRole: 'APODERADO' });

export const withStaffAuth = <P extends object>(Component: React.ComponentType<P>) =>
  withOidcAuth(Component, { requiredRoles: ['ADMIN', 'TEACHER', 'PSYCHOLOGIST', 'CYCLE_DIRECTOR', 'COORDINATOR'] });

/**
 * Componente de información de usuario autenticado
 */
export const AuthUserInfo: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { user, isAuthenticated, roles } = useOidcAuth();

  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <div className={`bg-green-50 border border-green-200 rounded-md p-3 ${className}`}>
      <div className="flex">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="ml-3">
          <p className="text-sm font-medium text-green-800">
            Sesión Activa
          </p>
          <div className="text-xs text-green-700 mt-1 space-y-1">
            <p>Usuario: {user.profile.name || user.profile.email}</p>
            <p>Roles: {roles.join(', ')}</p>
            <p>Email: {user.profile.email}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProtectedOidcRoute;