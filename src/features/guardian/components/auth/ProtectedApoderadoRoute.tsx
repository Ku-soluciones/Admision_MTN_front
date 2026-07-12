import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../../coordinator/context/AuthContext';

interface ProtectedApoderadoRouteProps {
    children: React.ReactNode;
}

const ProtectedApoderadoRoute: React.FC<ProtectedApoderadoRouteProps> = ({ children }) => {
    const { user, isAuthenticated, isLoading } = useAuth();

    if (isLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-white">
                <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-azul-monte-tabor" />
            </div>
        );
    }

    if (!isAuthenticated || !user) {
        return <Navigate to="/apoderado/login" replace />;
    }

    if (user.role !== 'APODERADO') {
        return <Navigate to="/apoderado/login" replace />;
    }

    return <>{children}</>;
};

export default ProtectedApoderadoRoute;
