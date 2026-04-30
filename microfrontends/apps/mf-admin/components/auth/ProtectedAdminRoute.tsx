import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { microfrontendUrls } from '../../utils/microfrontendUrls';

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
        window.location.replace(user.role === 'APODERADO'
            ? microfrontendUrls.guardianDashboard
            : microfrontendUrls.professorDashboard);
        return <div>Redirigiendo...</div>;
    }

    return <>{children}</>;
};

export default ProtectedAdminRoute;
