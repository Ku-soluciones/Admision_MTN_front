import React from 'react';
import { Navigate } from 'react-router-dom';
import { getStorageKey, BASE_STORAGE_KEYS } from '../../../../packages/backend-sdk/src/index';

const STAFF_ROLES = new Set([
    'TEACHER', 'COORDINATOR', 'CYCLE_DIRECTOR', 'PSYCHOLOGIST', 'INTERVIEWER',
    'TEACHER_EARLY_CYCLE',
    'TEACHER_LANGUAGE_BASIC', 'TEACHER_MATHEMATICS_BASIC', 'TEACHER_ENGLISH_BASIC',
    'TEACHER_SCIENCE_BASIC', 'TEACHER_HISTORY_BASIC',
    'TEACHER_LANGUAGE_HIGH', 'TEACHER_MATHEMATICS_HIGH', 'TEACHER_ENGLISH_HIGH',
    'TEACHER_SCIENCE_HIGH', 'TEACHER_HISTORY_HIGH',
    'COORDINATOR_LANGUAGE', 'COORDINATOR_MATHEMATICS', 'COORDINATOR_ENGLISH',
    'COORDINATOR_SCIENCE', 'COORDINATOR_HISTORY',
    'TEACHER_LANGUAGE', 'TEACHER_MATHEMATICS', 'TEACHER_ENGLISH',
]);

interface ProtectedProfessorRouteProps {
    children: React.ReactNode;
}

const ProtectedProfessorRoute: React.FC<ProtectedProfessorRouteProps> = ({ children }) => {
    const storageKey = getStorageKey(BASE_STORAGE_KEYS.CURRENT_PROFESSOR);
    const raw = localStorage.getItem(storageKey) || localStorage.getItem('currentProfessor');

    if (!raw) {
        return <Navigate to="/profesor/login" replace />;
    }

    try {
        const professorData = JSON.parse(raw);
        const isValid =
            professorData.id &&
            professorData.email &&
            professorData.role &&
            STAFF_ROLES.has(professorData.role);

        if (!isValid) {
            localStorage.removeItem(storageKey);
            localStorage.removeItem('currentProfessor');
            return <Navigate to="/profesor/login" replace />;
        }
    } catch {
        localStorage.removeItem(storageKey);
        localStorage.removeItem('currentProfessor');
        return <Navigate to="/profesor/login" replace />;
    }

    return <>{children}</>;
};

export default ProtectedProfessorRoute;