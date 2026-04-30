import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface ProtectedApoderadoRouteProps {
    children: React.ReactNode;
}

const ProtectedApoderadoRoute: React.FC<ProtectedApoderadoRouteProps> = ({ children }) => {
    const { user, isAuthenticated } = useAuth();

    console.log('ProtectedApoderadoRoute: Check access -', { isAuthenticated, user: user ? { role: user.role, email: user.email } : null });

    if (!isAuthenticated || !user) {
        console.log('ProtectedApoderadoRoute: Not authenticated, redirecting to login');
        return <Navigate to="/apoderado/login" replace />;
    }

    if (user.role !== 'APODERADO') {
        console.log('ProtectedApoderadoRoute: Wrong role', user.role, '!== APODERADO, redirecting');
        return <Navigate to="/apoderado/login" replace />;
    }

    console.log('ProtectedApoderadoRoute: Access granted');
    return <>{children}</>;
};

export default ProtectedApoderadoRoute;