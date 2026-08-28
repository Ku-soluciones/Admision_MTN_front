import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { appUrls } from '../../../admin/utils/appUrls';

interface ProtectedAdminRouteProps {
    children: React.ReactNode;
}

const ProtectedAdminRoute: React.FC<ProtectedAdminRouteProps> = ({ children }) => {
    const { user, isAuthenticated, isLoading } = useAuth();

    if (isLoading) {
        return <div>Cargando...</div>;
    }

    if (!isAuthenticated || !user) {
        return <Navigate to="/login" replace />;
    }

    if (user.role !== 'ADMIN') {
        window.location.replace(user.role === 'APODERADO'
            ? appUrls.guardianDashboard
            : appUrls.professorDashboard);
        return <div>Redirigiendo...</div>;
    }

    return <>{children}</>;
};

export default ProtectedAdminRoute;