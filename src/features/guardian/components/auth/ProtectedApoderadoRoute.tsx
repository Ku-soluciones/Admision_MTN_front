import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getStorageKey, BASE_STORAGE_KEYS } from '../../../../packages/backend-sdk/src/index';

interface ProtectedApoderadoRouteProps {
    children: React.ReactNode;
}

const ProtectedApoderadoRoute: React.FC<ProtectedApoderadoRouteProps> = ({ children }) => {
    const { user, isAuthenticated, isLoading } = useAuth();

    if (isLoading) {
        const cached = localStorage.getItem(getStorageKey(BASE_STORAGE_KEYS.AUTHENTICATED_USER));
        if (cached) {
            try {
                const parsed = JSON.parse(cached);
                if (parsed?.role === 'APODERADO') {
                    return <>{children}</>;
                }
            } catch {
                // cache malformado — mostrar spinner
            }
        }
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