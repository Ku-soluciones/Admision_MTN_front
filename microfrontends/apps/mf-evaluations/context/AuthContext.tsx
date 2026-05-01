import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, hasFirebaseConfig } from '../src/lib/firebase';
import { authService } from '../services/authService';
import api from '../services/api';
import { getStorageKey, BASE_STORAGE_KEYS } from '../../../packages/backend-sdk/src/index';

interface User {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: 'APODERADO' | 'ADMIN' | 'TEACHER' | 'COORDINATOR' | 'CYCLE_DIRECTOR' | 'PSYCHOLOGIST' | 'TEACHER_LANGUAGE' | 'TEACHER_MATHEMATICS' | 'TEACHER_ENGLISH';
    phone?: string;
    rut?: string;
    applicationId?: number;
}

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (email: string, password: string, role: string) => Promise<void>;
    register: (userData: any, role: string) => Promise<void>;
    logout: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
    children: ReactNode;
}

const mapBackendRole = (backendRole: string): User['role'] => {
    switch (backendRole) {
        case 'ADMIN': return 'ADMIN';
        case 'APODERADO': return 'APODERADO';
        case 'TEACHER': return 'TEACHER';
        case 'COORDINATOR': return 'COORDINATOR';
        case 'CYCLE_DIRECTOR': return 'CYCLE_DIRECTOR';
        case 'PSYCHOLOGIST': return 'PSYCHOLOGIST';
        case 'TEACHER_LANGUAGE': return 'TEACHER_LANGUAGE';
        case 'TEACHER_MATHEMATICS': return 'TEACHER_MATHEMATICS';
        case 'TEACHER_ENGLISH': return 'TEACHER_ENGLISH';
        default: return 'TEACHER';
    }
};

const buildUserFromBff = (u: any): User => ({
    id: String(u?.id ?? ''),
    email: u?.email ?? '',
    firstName: u?.firstName ?? '',
    lastName: u?.lastName ?? '',
    role: mapBackendRole(u?.role ?? 'TEACHER'),
    phone: u?.phone,
    rut: u?.rut,
});

const setAdminCompat = (user: User, token: string, subject?: string) => {
    if (user.role === 'ADMIN') {
        localStorage.setItem(getStorageKey(BASE_STORAGE_KEYS.CURRENT_PROFESSOR), JSON.stringify({
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            subject: subject ?? 'ALL_SUBJECTS',
            subjects: ['MATH', 'SPANISH', 'ENGLISH', 'PSYCHOLOGY'],
            assignedGrades: ['prekinder', 'kinder', '1basico', '2basico', '3basico', '4basico', '5basico', '6basico', '7basico', '8basico', '1medio', '2medio', '3medio', '4medio'],
            isAdmin: true,
        }));
        localStorage.setItem(getStorageKey(BASE_STORAGE_KEYS.PROFESSOR_TOKEN), token);
        localStorage.setItem(getStorageKey(BASE_STORAGE_KEYS.PROFESSOR_USER), JSON.stringify({
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
        }));
    }
};

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Listen to Firebase auth state changes for automatic session restore
    useEffect(() => {
        if (!auth || !hasFirebaseConfig) {
            setIsLoading(false);
            return;
        }

        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                // Firebase user is signed in — get fresh idToken and fetch profile from BFF
                try {
                    const idToken = await firebaseUser.getIdToken();
                    localStorage.setItem(getStorageKey(BASE_STORAGE_KEYS.AUTH_TOKEN), idToken);

                    // Check if we already have cached user data
                    const cached = localStorage.getItem(getStorageKey(BASE_STORAGE_KEYS.AUTHENTICATED_USER));
                    if (cached) {
                        try {
                            setUser(JSON.parse(cached));
                            setIsLoading(false);
                            return;
                        } catch {
                            localStorage.removeItem(getStorageKey(BASE_STORAGE_KEYS.AUTHENTICATED_USER));
                        }
                    }

                    // Fetch user profile from BFF
                    const response = await api.get('/v1/auth/check');
                    if (response.data?.success && response.data?.user) {
                        const userData = buildUserFromBff(response.data.user);
                        localStorage.setItem(getStorageKey(BASE_STORAGE_KEYS.AUTHENTICATED_USER), JSON.stringify(userData));
                        setAdminCompat(userData, idToken, response.data.user?.subject);
                        setUser(userData);
                    }
                } catch {
                    // BFF call failed — clear state
                    localStorage.removeItem(getStorageKey(BASE_STORAGE_KEYS.AUTH_TOKEN));
                    localStorage.removeItem(getStorageKey(BASE_STORAGE_KEYS.AUTHENTICATED_USER));
                    setUser(null);
                }
            } else {
                // No Firebase user — clear everything
                localStorage.removeItem(getStorageKey(BASE_STORAGE_KEYS.AUTH_TOKEN));
                localStorage.removeItem(getStorageKey(BASE_STORAGE_KEYS.AUTHENTICATED_USER));
                setUser(null);
            }
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const login = async (email: string, password: string, _role: string) => {
        setIsLoading(true);
        try {
            const response = await authService.login({ email, password });

            const u = response.user;
            if (response.success && u) {
                const userData = buildUserFromBff(u);
                setAdminCompat(userData, response.token ?? '', u?.subject);
                localStorage.setItem(getStorageKey(BASE_STORAGE_KEYS.AUTHENTICATED_USER), JSON.stringify(userData));
                setUser(userData);
            } else {
                throw new Error(response.message || 'Error en la autenticación');
            }
        } catch (error: any) {
            throw new Error(error.message || 'Error en la autenticación');
        } finally {
            setIsLoading(false);
        }
    };

    const register = async (userData: any, _role: string) => {
        setIsLoading(true);
        try {
            const response = await authService.register({
                firstName: userData.firstName,
                lastName: userData.lastName,
                email: userData.email,
                password: userData.password,
                rut: userData.rut,
                phone: userData.phone,
            });

            const u = response.user;
            if (response.success && u) {
                const newUser = buildUserFromBff(u);
                newUser.phone = userData.phone;
                newUser.rut = userData.rut;
                localStorage.setItem(getStorageKey(BASE_STORAGE_KEYS.AUTHENTICATED_USER), JSON.stringify(newUser));
                setUser(newUser);
            } else {
                throw new Error(response.message || 'Error al crear la cuenta');
            }
        } catch (error: any) {
            throw new Error(error.message || 'Error al crear la cuenta');
        } finally {
            setIsLoading(false);
        }
    };

    const logout = () => {
        authService.logout();
        localStorage.removeItem(getStorageKey(BASE_STORAGE_KEYS.CURRENT_PROFESSOR));
        localStorage.removeItem(getStorageKey(BASE_STORAGE_KEYS.PROFESSOR_TOKEN));
        localStorage.removeItem(getStorageKey(BASE_STORAGE_KEYS.PROFESSOR_USER));
        localStorage.removeItem(getStorageKey(BASE_STORAGE_KEYS.APODERADO_TOKEN));
        localStorage.removeItem(getStorageKey(BASE_STORAGE_KEYS.APODERADO_USER));
        localStorage.removeItem(getStorageKey(BASE_STORAGE_KEYS.AUTH_TOKEN));
        localStorage.removeItem(getStorageKey(BASE_STORAGE_KEYS.AUTHENTICATED_USER));
        setUser(null);
        window.location.href = '/#/profesor/login';
    };

    const value: AuthContextType = {
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth debe ser usado dentro de un AuthProvider');
    }
    return context;
};
