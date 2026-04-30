import React from 'react';
import { Navigate } from 'react-router-dom';

interface ProtectedProfessorRouteProps {
    children: React.ReactNode;
}

const ProtectedProfessorRoute: React.FC<ProtectedProfessorRouteProps> = ({ children }) => {
    // Verificar si hay un profesor logueado
    const currentProfessor = localStorage.getItem('currentProfessor');
    
    if (!currentProfessor) {
        // Redirigir al login si no hay profesor autenticado
        return <Navigate to="/profesor/login" replace />;
    }

    try {
        // Verificar que los datos del profesor sean válidos
        const professorData = JSON.parse(currentProfessor);
        if (!professorData.id || !professorData.email) {
            localStorage.removeItem('currentProfessor');
            return <Navigate to="/profesor/login" replace />;
        }
    } catch (error) {
        // Datos corruptos, limpiar y redirigir
        localStorage.removeItem('currentProfessor');
        return <Navigate to="/profesor/login" replace />;
    }

    return <>{children}</>;
};

export default ProtectedProfessorRoute;