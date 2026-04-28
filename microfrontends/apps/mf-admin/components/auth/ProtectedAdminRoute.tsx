import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface ProtectedAdminRouteProps {
    children: React.ReactNode;
}

const ProtectedAdminRoute: React.FC<ProtectedAdminRouteProps> = ({ children }) => {
    const { user, isAuthenticated, isLoading } = useAuth();
    
    if (isLoading) {
        return <div>Cargando...</div>;
    }
    
    if (!isAuthenticated || !user) {
        // Redirigir al login si no hay usuario autenticado
        return <Navigate to="/login" replace />;
    }

    // Verificar que tenga permisos de admin
    if (user.role !== 'ADMIN') {
        // Si no es admin, redirigir según su rol
        if (user.role === 'APODERADO') {
            return <Navigate to="/familia" replace />;
        } else {
            return <Navigate to="/profesor" replace />;
        }
    }

    return <>{children}</>;
};

export default ProtectedAdminRoute;