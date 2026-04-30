import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Professor } from '../types';

interface ProfessorContextType {
    currentProfessor: Professor | null;
    isAuthenticated: boolean;
    login: (professor: Professor) => void;
    logout: () => void;
}

const ProfessorContext = createContext<ProfessorContextType | undefined>(undefined);

interface ProfessorProviderProps {
    children: ReactNode;
}

export const ProfessorProvider: React.FC<ProfessorProviderProps> = ({ children }) => {
    const [currentProfessor, setCurrentProfessor] = useState<Professor | null>(null);

    useEffect(() => {
        // Verificar si hay un profesor logueado en localStorage
        const storedProfessor = localStorage.getItem('currentProfessor');
        if (storedProfessor) {
            try {
                const professorData = JSON.parse(storedProfessor);
                setCurrentProfessor(professorData);
            } catch (error) {
                console.error('Error parsing stored professor data:', error);
                localStorage.removeItem('currentProfessor');
            }
        }
    }, []);

    const login = (professor: Professor) => {
        const professorData = {
            id: professor.id,
            firstName: professor.firstName,
            lastName: professor.lastName,
            email: professor.email,
            subjects: professor.subjects,
            assignedGrades: professor.assignedGrades,
            department: professor.department,
            isActive: professor.isActive
        };
        
        setCurrentProfessor(professorData as Professor);
        localStorage.setItem('currentProfessor', JSON.stringify(professorData));
    };

    const logout = () => {
        setCurrentProfessor(null);
        localStorage.removeItem('currentProfessor');
    };

    const value: ProfessorContextType = {
        currentProfessor,
        isAuthenticated: !!currentProfessor,
        login,
        logout
    };

    return (
        <ProfessorContext.Provider value={value}>
            {children}
        </ProfessorContext.Provider>
    );
};

export const useProfessor = (): ProfessorContextType => {
    const context = useContext(ProfessorContext);
    if (context === undefined) {
        throw new Error('useProfessor must be used within a ProfessorProvider');
    }
    return context;
};