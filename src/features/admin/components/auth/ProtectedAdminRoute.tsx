import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { appUrls } from '../../utils/appUrls';

interface ProtectedAdminRouteProps {
    children: React.ReactNode;
}

const ProtectedAdminRoute: React.FC<ProtectedAdminRouteProps> = ({ children }) => {
    const { user, isAuthenticated, isLoading } = useAuth();
    const location = useLocation();
    
    if (isLoading) {
        return <div>Cargando...</div>;
    }
    
    if (!isAuthenticated || !user) {
        const requestedPath = `${location.pathname}${location.search}${location.hash}`;
        return <Navigate to={`/login?redirect=${encodeURIComponent(requestedPath)}`} replace />;
    }

    // Verificar que tenga permisos de admin
    if (user.role !== 'ADMIN') {
        window.location.replace(user.role === 'APODERADO'
            ? appUrls.guardianDashboard
            : appUrls.professorDashboard);
        return <div>Redirigiendo...</div>;
    }

    return <>{children}</>;
};

export default ProtectedAdminRoute;
