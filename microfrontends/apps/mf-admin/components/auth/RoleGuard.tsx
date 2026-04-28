/**
 * Role-Based Access Control Guards
 * Sistema de guardas por rol para el Sistema de Admisión MTN
 */

import React from 'react';
import { useOidcAuth } from '../../hooks/useOidcAuth';

interface RoleGuardProps {
  children: React.ReactNode;
  /**
   * Rol requerido para acceder
   */
  requiredRole?: string;
  /**
   * Múltiples roles permitidos (OR lógico)
   */
  allowedRoles?: string[];
  /**
   * Componente a mostrar si no tiene permisos
   */
  fallback?: React.ReactNode;
  /**
   * Callback cuando no tiene permisos
   */
  onAccessDenied?: (userRoles: string[], requiredRoles: string[]) => void;
  /**
   * Mostrar contenido parcial si no tiene permisos
   */
  showFallbackContent?: boolean;
}

export const RoleGuard: React.FC<RoleGuardProps> = ({
  children,
  requiredRole,
  allowedRoles,
  fallback,
  onAccessDenied,
  showFallbackContent = true,
}) => {
  const { roles, isAuthenticated, user } = useOidcAuth();
  
  // Si no está autenticado, no mostrar nada
  if (!isAuthenticated) {
    return null;
  }

  const requiredRoles = requiredRole ? [requiredRole] : (allowedRoles || []);
  const hasAccess = requiredRoles.length === 0 || requiredRoles.some(role => 
    roles.includes(role) || roles.includes(`ROLE_${role}`)
  );

  if (!hasAccess) {
    onAccessDenied?.(roles, requiredRoles);
    
    if (!showFallbackContent) {
      return null;
    }
    
    return fallback || (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-yellow-800">
              <strong>Acceso Restringido</strong>
            </p>
            <p className="text-xs text-yellow-700 mt-1">
              No tienes permisos para ver este contenido.
            </p>
            <p className="text-xs text-yellow-600 mt-1">
              Usuario: {user?.profile?.email} | 
              Roles: {roles.join(', ') || 'Ninguno'} | 
              Requerido: {requiredRoles.join(' o ')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

/**
 * Guarda específica para ADMIN
 */
export const AdminGuard: React.FC<Omit<RoleGuardProps, 'requiredRole'>> = (props) => (
  <RoleGuard {...props} requiredRole="ADMIN" />
);

/**
 * Guarda específica para TEACHER (cualquier tipo de profesor)
 */
export const TeacherGuard: React.FC<Omit<RoleGuardProps, 'allowedRoles'>> = (props) => (
  <RoleGuard 
    {...props} 
    allowedRoles={['TEACHER', 'PSYCHOLOGIST', 'CYCLE_DIRECTOR', 'COORDINATOR']} 
  />
);

/**
 * Guarda específica para CYCLE_DIRECTOR
 */
export const DirectorGuard: React.FC<Omit<RoleGuardProps, 'requiredRole'>> = (props) => (
  <RoleGuard {...props} requiredRole="CYCLE_DIRECTOR" />
);

/**
 * Guarda específica para PSYCHOLOGIST
 */
export const PsychologistGuard: React.FC<Omit<RoleGuardProps, 'requiredRole'>> = (props) => (
  <RoleGuard {...props} requiredRole="PSYCHOLOGIST" />
);

/**
 * Guarda específica para COORDINATOR
 */
export const CoordinatorGuard: React.FC<Omit<RoleGuardProps, 'requiredRole'>> = (props) => (
  <RoleGuard {...props} requiredRole="COORDINATOR" />
);

/**
 * Guarda específica para APODERADO/Familias
 */
export const FamilyGuard: React.FC<Omit<RoleGuardProps, 'requiredRole'>> = (props) => (
  <RoleGuard {...props} requiredRole="APODERADO" />
);

/**
 * Guarda para Personal (Admin + Profesores)
 */
export const StaffGuard: React.FC<Omit<RoleGuardProps, 'allowedRoles'>> = (props) => (
  <RoleGuard 
    {...props} 
    allowedRoles={['ADMIN', 'TEACHER', 'PSYCHOLOGIST', 'CYCLE_DIRECTOR', 'COORDINATOR']} 
  />
);

/**
 * Guarda para Evaluadores
 */
export const EvaluatorGuard: React.FC<Omit<RoleGuardProps, 'allowedRoles'>> = (props) => (
  <RoleGuard 
    {...props} 
    allowedRoles={['TEACHER', 'PSYCHOLOGIST', 'CYCLE_DIRECTOR']} 
  />
);

/**
 * Guarda condicional con función de verificación personalizada
 */
interface ConditionalGuardProps {
  children: React.ReactNode;
  condition: (user: any, roles: string[]) => boolean;
  fallback?: React.ReactNode;
  showFallbackContent?: boolean;
}

export const ConditionalGuard: React.FC<ConditionalGuardProps> = ({
  children,
  condition,
  fallback,
  showFallbackContent = true,
}) => {
  const { user, roles, isAuthenticated } = useOidcAuth();

  if (!isAuthenticated) {
    return null;
  }

  const hasAccess = condition(user, roles);

  if (!hasAccess) {
    if (!showFallbackContent) {
      return null;
    }
    
    return fallback || (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <p className="text-sm text-gray-600">
          No tienes permisos para acceder a este contenido.
        </p>
      </div>
    );
  }

  return <>{children}</>;
};

/**
 * Hook para verificar permisos programáticamente
 */
export const useRoleGuard = () => {
  const { roles, isAuthenticated, user } = useOidcAuth();

  const hasRole = (role: string): boolean => {
    return roles.includes(role) || roles.includes(`ROLE_${role}`);
  };

  const hasAnyRole = (roleList: string[]): boolean => {
    return roleList.some(role => hasRole(role));
  };

  const hasAllRoles = (roleList: string[]): boolean => {
    return roleList.every(role => hasRole(role));
  };

  const isAdmin = (): boolean => hasRole('ADMIN');
  const isTeacher = (): boolean => hasAnyRole(['TEACHER', 'PSYCHOLOGIST', 'CYCLE_DIRECTOR', 'COORDINATOR']);
  const isDirector = (): boolean => hasRole('CYCLE_DIRECTOR');
  const isPsychologist = (): boolean => hasRole('PSYCHOLOGIST');
  const isCoordinator = (): boolean => hasRole('COORDINATOR');
  const isFamily = (): boolean => hasRole('APODERADO');
  const isStaff = (): boolean => hasAnyRole(['ADMIN', 'TEACHER', 'PSYCHOLOGIST', 'CYCLE_DIRECTOR', 'COORDINATOR']);
  const isEvaluator = (): boolean => hasAnyRole(['TEACHER', 'PSYCHOLOGIST', 'CYCLE_DIRECTOR']);

  return {
    // Estado
    isAuthenticated,
    user,
    roles,
    
    // Verificación básica
    hasRole,
    hasAnyRole,
    hasAllRoles,
    
    // Verificaciones específicas
    isAdmin,
    isTeacher,
    isDirector,
    isPsychologist,
    isCoordinator,
    isFamily,
    isStaff,
    isEvaluator,
    
    // Utilidades
    canAccess: (requiredRoles: string[]) => hasAnyRole(requiredRoles),
    getRoleDisplay: () => {
      const roleLabels: Record<string, string> = {
        'ADMIN': 'Administrador',
        'TEACHER': 'Profesor',
        'PSYCHOLOGIST': 'Psicólogo',
        'CYCLE_DIRECTOR': 'Director de Ciclo',
        'COORDINATOR': 'Coordinador',
        'APODERADO': 'Apoderado',
      };
      
      return roles.map(role => roleLabels[role] || role).join(', ');
    },
  };
};

export default RoleGuard;