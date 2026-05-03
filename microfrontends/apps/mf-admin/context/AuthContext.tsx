import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, hasFirebaseConfig } from '../src/lib/firebase';
import { authService } from '../services/authService';
import api from '../services/api';
import { getStorageKey, BASE_STORAGE_KEYS } from '../../../packages/backend-sdk/src/index';
import { microfrontendUrls } from '../utils/microfrontendUrls';

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

    // Fallback: Restore session from localStorage if available (for non-Firebase auth methods)
    useEffect(() => {
        if (user !== null) {
            // User already loaded, skip
            return;
        }

        const tryRestoreFromStorage = () => {
            try {
                console.log('[AuthContext] Attempting to restore from storage');
                console.log('[AuthContext] Available cookies:', document.cookie);

                // Try localStorage first (environment-aware key)
                let cached =
                    localStorage.getItem(getStorageKey(BASE_STORAGE_KEYS.AUTHENTICATED_USER)) ||
                    localStorage.getItem(BASE_STORAGE_KEYS.AUTHENTICATED_USER);

                // If not found in localStorage, try cookies (for cross-origin redirects)
                if (!cached) {
                    console.log('[AuthContext] Not in localStorage, checking cookies...');
                    const cookieValue = document.cookie
                        .split('; ')
                        .find(row => row.startsWith('auth_user='))
                        ?.split('=')[1];

                    if (cookieValue) {
                        cached = decodeURIComponent(cookieValue);
                        console.log('[AuthContext] Found user in cookies');
                    } else {
                        console.log('[AuthContext] No auth_user cookie found. Available:', document.cookie);
                    }
                }

                console.log('[AuthContext] Cached user data:', cached ? 'found' : 'not found');
                if (cached) {
                    const userData = JSON.parse(cached);
                    if (userData?.role !== 'ADMIN') {
                        console.log('[AuthContext] Cached user is not ADMIN, clearing session');
                        localStorage.removeItem(getStorageKey(BASE_STORAGE_KEYS.AUTHENTICATED_USER));
                        localStorage.removeItem(BASE_STORAGE_KEYS.AUTHENTICATED_USER);
                        document.cookie = 'auth_user=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;';
                        return false;
                    }
                    console.log('[AuthContext] Restoring user from storage:', userData);
                    setUser(userData);
                    setIsLoading(false);
                    return true;
                }
            } catch (error) {
                console.log('[AuthContext] Fallback restoration failed:', error);
                // Fallback failed, continue to Firebase check
            }
            return false;
        };

        // Try storage restore FIRST, regardless of Firebase config
        // This ensures non-Firebase sessions (like from professorAuthService) work immediately
        const restored = tryRestoreFromStorage();

        if (restored) {
            console.log('[AuthContext] Successfully restored from storage');
            return;
        }

        // Only continue to Firebase check if storage restore failed
        if (!auth || !hasFirebaseConfig) {
            console.log('[AuthContext] No Firebase config, not waiting for Firebase auth');
            setIsLoading(false);
            return;
        }
    }, []);

    // Listen to Firebase auth state changes for automatic session restore
    useEffect(() => {
        // Skip Firebase entirely if user already authenticated from storage
        if (user !== null) {
            console.log('[AuthContext] User already authenticated, skipping Firebase listener');
            return;
        }

        if (!auth || !hasFirebaseConfig) {
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
                            const cachedUser = JSON.parse(cached);
                            if (cachedUser?.role !== 'ADMIN') {
                                localStorage.removeItem(getStorageKey(BASE_STORAGE_KEYS.AUTHENTICATED_USER));
                            } else {
                                setUser(cachedUser);
                                setIsLoading(false);
                                return;
                            }
                        } catch {
                            localStorage.removeItem(getStorageKey(BASE_STORAGE_KEYS.AUTHENTICATED_USER));
                        }
                    }

                    // Fetch user profile from BFF
                    const response = await api.get('/v1/auth/check');
                    if (response.data?.success && response.data?.user) {
                        const userData = buildUserFromBff(response.data.user);
                        if (userData.role === 'ADMIN') {
                            localStorage.setItem(getStorageKey(BASE_STORAGE_KEYS.AUTHENTICATED_USER), JSON.stringify(userData));
                            setAdminCompat(userData, idToken, response.data.user?.subject);
                            setUser(userData);
                        } else {
                            localStorage.removeItem(getStorageKey(BASE_STORAGE_KEYS.AUTH_TOKEN));
                        }
                    }
                } catch {
                    // BFF call failed — clear state
                    localStorage.removeItem(getStorageKey(BASE_STORAGE_KEYS.AUTH_TOKEN));
                    localStorage.removeItem(getStorageKey(BASE_STORAGE_KEYS.AUTHENTICATED_USER));
                    setUser(null);
                }
            } else {
                localStorage.removeItem(getStorageKey(BASE_STORAGE_KEYS.AUTH_TOKEN));
                localStorage.removeItem(getStorageKey(BASE_STORAGE_KEYS.AUTHENTICATED_USER));
                setUser(null);
            }
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, [user]);

    const login = async (email: string, password: string, _role: string) => {
        setIsLoading(true);
        try {
            const response = await authService.login({ email, password });

            const u = response.user;
            if (response.success && u) {
                const userData = buildUserFromBff(u);

                if (userData.role !== 'ADMIN') {
                    localStorage.removeItem(getStorageKey(BASE_STORAGE_KEYS.AUTH_TOKEN));
                    throw new Error('Su cuenta no tiene acceso al panel de administración. Use el portal correspondiente a su rol.');
                }

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
        // Also clear cookies for cross-port sessions
        document.cookie = 'auth_user=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;';
        document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;';
        setUser(null);
        window.location.href = microfrontendUrls.home;
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
