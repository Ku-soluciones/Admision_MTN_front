import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, hasFirebaseConfig } from '../src/lib/firebase';
import { authService } from '../services/authService';
import api from '../services/api';
import { microfrontendUrls } from '../utils/microfrontendUrls';
import {
    getStorageKey,
    BASE_STORAGE_KEYS,
    authStore,
    useAuthStore,
    onCrossTabLogout,
    bootstrapAuth,
    cancelScheduledRefresh,
    scheduleRefresh,
    purgeLegacyAuthStorage,
} from '../../../packages/backend-sdk/src/index';

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
    /** Indica si la cuenta tiene `firebase_uid` enlazado en el BFF. */
    firebaseLinked: boolean;
    login: (email: string, password: string, role: string) => Promise<void>;
    register: (userData: any, role: string) => Promise<void>;
    logout: () => void;
    /** Re-ejecuta el linking explícito (Google/Email) para apoderados antiguos. */
    linkFirebaseAccount: () => Promise<void>;
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

// Limpieza de claves legacy y extracción de `mf_token` de la URL para handoff
// cross-origin. Se ejecuta una sola vez al cargar el módulo.
(function bootstrapStorageOnce() {
    purgeLegacyAuthStorage();
    try {
        const hash = window.location.hash; // "#/postulacion?mf_token=eyJ..."
        const queryStart = hash.indexOf('?');
        if (queryStart === -1) return;
        const params = new URLSearchParams(hash.slice(queryStart + 1));
        const mfToken = params.get('mf_token');
        if (!mfToken) return;
        // Mantenemos por ahora el token en localStorage para compatibilidad con
        // el handoff cross-origin existente. Si llega `mf_expires_in`, también
        // hidratamos el authStore para que el resto del flujo lo use.
        localStorage.setItem(getStorageKey(BASE_STORAGE_KEYS.AUTH_TOKEN), mfToken);
        const expiresIn = Number(params.get('mf_expires_in'));
        if (Number.isFinite(expiresIn) && expiresIn > 0) {
            authStore.setSession({ token: mfToken, expiresIn });
        }
        const cleanHash = hash.slice(0, queryStart);
        window.history.replaceState(null, '', window.location.pathname + window.location.search + cleanHash);
    } catch { /* no-op en SSR o entornos sin window */ }
})();

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const firebaseLinked = useAuthStore((s) => s.firebaseLinked);

    // 1. Rehidratación al montar: pedimos /v1/auth/refresh para recuperar la
    //    sesión si la cookie HttpOnly del refresh sigue viva. Cuando el BFF
    //    exponga /api/auth/refresh, basta con ajustar el orden.
    useEffect(() => {
        let cancelled = false;
        bootstrapAuth({
            refresh: async () => {
                try {
                    const res = await api.post('/v1/auth/refresh');
                    return res.data?.token ? res.data : null;
                } catch {
                    return null;
                }
            },
            onRefreshFailure: () => {
                authStore.clear();
            },
        }).then((ok) => {
            if (cancelled) return;
            if (ok) {
                const u = authStore.getState().user;
                if (u) {
                    const userData = buildUserFromBff(u);
                    setAdminCompat(userData, authStore.getState().accessToken ?? '', (u as any)?.subject);
                    setUser(userData);
                }
            }
        });
        return () => { cancelled = true; };
    }, []);

    // 2. Listener Firebase: mantiene compatibilidad con la persistencia
    //    por-origen del SDK y refresca el idToken si el access del BFF
    //    todavía no se entrega (transición sprint 0 → 1).
    useEffect(() => {
        if (!auth || !hasFirebaseConfig) {
            setIsLoading(false);
            return;
        }

        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                try {
                    // Si ya tenemos sesión BFF en memoria, no hace falta tocar
                    // localStorage ni pegarle a /v1/auth/check otra vez.
                    if (authStore.getValidAccessToken()) {
                        if (!user && authStore.getState().user) {
                            setUser(buildUserFromBff(authStore.getState().user));
                        }
                        setIsLoading(false);
                        return;
                    }

                    const idToken = await firebaseUser.getIdToken();
                    localStorage.setItem(getStorageKey(BASE_STORAGE_KEYS.AUTH_TOKEN), idToken);

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

                    // Pedimos perfil al BFF en /v1/auth/check (NGINX).
                    // El interceptor de api ya añade el Bearer; si no hay
                    // sesión válida, el BFF responde 400/401 silencioso.
                    const response = await api.get('/v1/auth/check');
                    if (response.data?.success && response.data?.user) {
                        const userData = buildUserFromBff(response.data.user);
                        localStorage.setItem(getStorageKey(BASE_STORAGE_KEYS.AUTHENTICATED_USER), JSON.stringify(userData));
                        // Para PROFESSOR_TOKEN preferimos el access JWT del BFF
                        // (authStore). Si todavía no llegó, caemos al idToken
                        // Firebase como compatibilidad.
                        const tokenForCompat = authStore.getValidAccessToken() || idToken;
                        setAdminCompat(userData, tokenForCompat, response.data.user?.subject);
                        if (typeof response.data.firebaseLinked === 'boolean') {
                            authStore.setFirebaseLinked(response.data.firebaseLinked);
                        }
                        setUser(userData);
                    }
                } catch {
                    localStorage.removeItem(getStorageKey(BASE_STORAGE_KEYS.AUTH_TOKEN));
                    localStorage.removeItem(getStorageKey(BASE_STORAGE_KEYS.AUTHENTICATED_USER));
                    setUser(null);
                }
            } else {
                // Firebase no tiene usuario en este origen. Si tenemos session
                // BFF activa (vía bootstrapAuth o handoff mf_token), la
                // mantenemos.
                if (authStore.getValidAccessToken()) {
                    setIsLoading(false);
                    return;
                }
                // Existe un token legacy en localStorage (handoff mf_token o
                // sesión previa antes del refactor). Intentamos validarlo de
                // forma silenciosa: el interceptor ya tolera 400 "No
                // autenticado" sin hacer ruido.
                const existingToken = localStorage.getItem(getStorageKey(BASE_STORAGE_KEYS.AUTH_TOKEN));
                if (existingToken) {
                    try {
                        const response = await api.get('/v1/auth/check');
                        if (response.data?.success && response.data?.user) {
                            const userData = buildUserFromBff(response.data.user);
                            localStorage.setItem(getStorageKey(BASE_STORAGE_KEYS.AUTHENTICATED_USER), JSON.stringify(userData));
                            const tokenForCompat = authStore.getValidAccessToken() || existingToken;
                            setAdminCompat(userData, tokenForCompat, response.data.user?.subject);
                            setUser(userData);
                            setIsLoading(false);
                            return;
                        }
                    } catch {
                        // token inválido o sin sesión — limpiamos en silencio
                    }
                }
                localStorage.removeItem(getStorageKey(BASE_STORAGE_KEYS.AUTH_TOKEN));
                localStorage.removeItem(getStorageKey(BASE_STORAGE_KEYS.AUTHENTICATED_USER));
                setUser(null);
            }
            setIsLoading(false);
        });
        return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // 3. Sincronización entre pestañas: si otra pestaña hace logout,
    //    cerramos también localmente.
    useEffect(() => {
        const off = onCrossTabLogout((reason) => {
            cancelScheduledRefresh();
            setUser(null);
            if (!window.location.pathname.includes('/login')) {
                window.location.assign(`${microfrontendUrls.home}?reason=${reason ?? 'other-tab'}`);
            }
        });
        return off;
    }, []);

    // 4. Suscripción al store: mantiene `user` sincronizado con `authStore.user`.
    useEffect(() => {
        return authStore.subscribe(() => {
            const stored = authStore.getState().user;
            if (stored && (!user || String(stored.id ?? '') !== user.id)) {
                setUser(buildUserFromBff(stored));
            } else if (!stored && user) {
                setUser(null);
            }
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);

    const login = async (email: string, password: string, _role: string) => {
        setIsLoading(true);
        try {
            const response = await authService.login({ email, password });

            const u = response.user;
            if (response.success && u) {
                const userData = buildUserFromBff(u);
                setAdminCompat(userData, response.token ?? '', (u as any)?.subject);
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

    const logout = useCallback(() => {
        cancelScheduledRefresh();
        // logout async pero no bloqueamos la UI: el server-side se limpia best-effort.
        void authService.logout();
        localStorage.removeItem(getStorageKey(BASE_STORAGE_KEYS.CURRENT_PROFESSOR));
        localStorage.removeItem(getStorageKey(BASE_STORAGE_KEYS.PROFESSOR_TOKEN));
        localStorage.removeItem(getStorageKey(BASE_STORAGE_KEYS.PROFESSOR_USER));
        localStorage.removeItem(getStorageKey(BASE_STORAGE_KEYS.APODERADO_TOKEN));
        localStorage.removeItem(getStorageKey(BASE_STORAGE_KEYS.APODERADO_USER));
        localStorage.removeItem(getStorageKey(BASE_STORAGE_KEYS.AUTH_TOKEN));
        localStorage.removeItem(getStorageKey(BASE_STORAGE_KEYS.AUTHENTICATED_USER));
        setUser(null);
        window.location.href = microfrontendUrls.home;
    }, []);

    const linkFirebaseAccount = useCallback(async () => {
        await authService.linkFirebaseAccount();
        // Tras el linking, refrescamos el access token para reflejar el cambio.
        try {
            const res = await api.post('/v1/auth/refresh');
            if (res.data?.token && res.data?.expiresIn) {
                authStore.updateAccessToken(res.data.token, res.data.expiresIn, res.data.user);
                scheduleRefresh(res.data.expiresIn);
            }
        } catch { /* el banner se ocultará igualmente porque firebaseLinked=true */ }
    }, []);

    const value: AuthContextType = {
        user,
        isAuthenticated: !!user,
        isLoading,
        firebaseLinked,
        login,
        register,
        logout,
        linkFirebaseAccount,
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
