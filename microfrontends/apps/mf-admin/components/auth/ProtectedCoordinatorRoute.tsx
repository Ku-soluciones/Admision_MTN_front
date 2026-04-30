/**
 * Protected Coordinator Route Component
 * Protege las rutas del coordinador/administrador
 */

import React, { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';

interface ProtectedCoordinatorRouteProps {
  children: ReactNode;
}

const ProtectedCoordinatorRoute: React.FC<ProtectedCoordinatorRouteProps> = ({ children }) => {
  // Verificar autenticación - revisar múltiples posibles tokens
  const authToken = localStorage.getItem('auth_token');
  const adminToken = localStorage.getItem('admin_token');
  const professorToken = localStorage.getItem('professor_token');

  // Verificar múltiples ubicaciones de usuario en localStorage
  const userStr = localStorage.getItem('authenticated_user') ||
                  localStorage.getItem('user') ||
                  localStorage.getItem('professor_user');

  // Si hay un token de autenticación
  const isAuthenticated = !!(authToken || adminToken || professorToken);

  // Verificar si el usuario tiene rol de ADMIN o COORDINATOR
  let hasPermission = false;
  if (userStr) {
    try {
      const user = JSON.parse(userStr);
      const allowedRoles = ['ADMIN', 'COORDINATOR', 'CYCLE_DIRECTOR'];
      hasPermission = allowedRoles.includes(user.role?.toUpperCase());
    } catch (e) {
      console.error('Error parsing user from localStorage:', e);
    }
  }

  // Si no está autenticado, redirigir al login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Si está autenticado pero no tiene permisos, redirigir a página de no autorizado
  if (!hasPermission) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8 text-center">
          <svg
            className="mx-auto h-12 w-12 text-red-500 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Acceso No Autorizado</h2>
          <p className="text-gray-600 mb-6">
            No tienes permisos para acceder a esta sección.
            <br />
            Solo los coordinadores y administradores pueden acceder.
          </p>
          <div className="flex flex-col space-y-3">
            <button
              onClick={() => window.history.back()}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
            >
              Volver Atrás
            </button>
            <a
              href="/#/admin"
              className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
            >
              Ir al Dashboard Principal
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Si todo está bien, renderizar los children
  return <>{children}</>;
};

export default ProtectedCoordinatorRoute;
