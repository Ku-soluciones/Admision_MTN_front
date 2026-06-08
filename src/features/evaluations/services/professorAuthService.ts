import api from './api';
import { getStorageKey, BASE_STORAGE_KEYS, authStore, scheduleRefresh, broadcastLogin } from '../../../packages/backend-sdk/src/index';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth as firebaseAuth } from '../src/lib/firebase';
// RSA encryption removed - credentials sent over HTTPS only
// import encryptionService from './encryptionService';

export interface ProfessorLoginRequest {
    email: string;
    password: string;
}

export interface ProfessorAuthResponse {
    success: boolean;
    message: string;
    token?: string;
    id?: number;
    email?: string;
    firstName?: string;
    lastName?: string;
    role?: string;
    subject?: string;
}

export interface ProfessorUser {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
    subject?: string;
    active: boolean;
    emailVerified: boolean;
}

class ProfessorAuthService {

    async login(request: ProfessorLoginRequest): Promise<ProfessorAuthResponse> {
        // Estrategia híbrida:
        //  1) Intentar primero el flujo Firebase (idéntico al portal apoderado).
        //     Esto cubre a los usuarios creados desde el panel admin que tienen
        //     password='FIREBASE_MANAGED' en BD (las credenciales viven solo
        //     en Firebase Auth).
        //  2) Si Firebase falla por usuario inexistente / no migrado, caer al
        //     login legacy con bcrypt en BD (compatibilidad con cuentas
        //     antiguas que aún no se migran a Firebase).
        // Si Firebase no está configurado en este entorno, vamos directo al legacy.
        if (!firebaseAuth) {
            return this.legacyLogin(request);
        }
        try {
            const credential = await signInWithEmailAndPassword(firebaseAuth, request.email, request.password);
            const idToken = await credential.user.getIdToken();
            const response = await api.post('/v1/auth/firebase-login', {
                idToken,
                portalType: 'STAFF',
            });
            this.persistSession(response.data);
            return response.data;
        } catch (firebaseError: any) {
            const fbCode = firebaseError?.code;
            // Errores de credenciales reales en Firebase: no probamos legacy
            // (evita ataques de enumeración y mensajes confusos).
            if (fbCode === 'auth/wrong-password' || fbCode === 'auth/invalid-credential') {
                throw new Error('Credenciales inválidas');
            }
            if (fbCode === 'auth/too-many-requests') {
                throw new Error('Demasiados intentos. Intenta más tarde.');
            }
            // Solo caemos al legacy si el usuario no existe en Firebase
            // (cuentas previas a la migración a Firebase Auth).
            const shouldFallback = fbCode === 'auth/user-not-found'
                || fbCode === 'auth/network-request-failed'
                || !fbCode; // error no-Firebase (BFF down, etc.)
            if (!shouldFallback) {
                throw new Error(firebaseError?.message || 'Error al iniciar sesión');
            }
            return this.legacyLogin(request);
        }
    }

    private async legacyLogin(request: ProfessorLoginRequest): Promise<ProfessorAuthResponse> {
        try {
            const response = await api.post('/v1/auth/login', { ...request, portalType: 'STAFF' });
            this.persistSession(response.data);
            return response.data;
        } catch (error: any) {
            if (error.response?.status === 401) {
                throw new Error('Credenciales inválidas');
            } else if (error.response?.status === 403) {
                throw new Error(error.response?.data?.error?.message || 'Su cuenta no tiene acceso al portal de profesores. Use el portal correspondiente a su rol.');
            } else if (error.response?.status === 400) {
                throw new Error(error.response?.data?.error?.message || 'Credenciales inválidas');
            } else if (error.response?.status === 500) {
                throw new Error('Error del servidor');
            }
            throw new Error('Error al iniciar sesión');
        }
    }

    private persistSession(data: any): void {
        if (!data?.token) return;
        localStorage.setItem(getStorageKey(BASE_STORAGE_KEYS.PROFESSOR_TOKEN), data.token);
        const u = data.user;
        localStorage.setItem(getStorageKey(BASE_STORAGE_KEYS.PROFESSOR_USER), JSON.stringify({
            email: u?.email || data.email,
            firstName: u?.firstName || data.firstName,
            lastName: u?.lastName || data.lastName,
            role: u?.role || data.role,
            subject: u?.subject || data.subject,
        }));
        if (typeof data.expiresIn === 'number') {
            authStore.setSession({
                token: data.token,
                expiresIn: data.expiresIn,
                absoluteSessionSeconds: data.absoluteSessionSeconds,
                user: data.user,
                firebaseLinked: data.firebaseLinked,
                sessionId: data.sessionId ?? null,
                permissions: data.permissions ?? [],
            });
            scheduleRefresh(data.expiresIn, {
                refresh: async () => {
                    const r = await api.post('/v1/auth/refresh');
                    const rd = r.data || {};
                    return rd.token && typeof rd.expiresIn === 'number'
                        ? { token: rd.token, expiresIn: rd.expiresIn, user: rd.user, firebaseLinked: rd.firebaseLinked }
                        : null;
                },
                onFailure: () => { authStore.clear(); },
            });
            broadcastLogin(data.token, data.expiresIn, data.user, data.firebaseLinked);
        }
    }
    
    async getCurrentProfessor(): Promise<ProfessorUser | null> {
        try {
            // Preferimos el access token del authStore (memoria, BFF). El
            // PROFESSOR_TOKEN legacy se mantiene como fallback durante la
            // transición; NO usamos el idToken Firebase aquí porque
            // /v1/users/me espera el JWT del BFF.
            const accessToken = authStore.getValidAccessToken();
            const legacyToken = localStorage.getItem(getStorageKey(BASE_STORAGE_KEYS.PROFESSOR_TOKEN));
            const token = accessToken || legacyToken;
            if (!token) {
                return null;
            }

            // El interceptor de `api` ya agrega el Authorization header
            // automáticamente y maneja el refresh reactivo en 401.
            const response = await api.get('/v1/users/me');
            return response.data.user || response.data;

        } catch (error: any) {
            const status = error?.response?.status;
            // 400/401/403 sin sesión válida es esperable durante la primera
            // carga o cuando la sesión venció. Devolvemos null en silencio.
            if (status === 400 || status === 401 || status === 403) {
                return null;
            }
            return null;
        }
    }
    
    isAuthenticated(): boolean {
        if (authStore.getValidAccessToken()) return true;
        const token = localStorage.getItem(getStorageKey(BASE_STORAGE_KEYS.PROFESSOR_TOKEN));
        return !!token;
    }
    
    getStoredProfessor() {
        const stored = localStorage.getItem(getStorageKey(BASE_STORAGE_KEYS.PROFESSOR_USER));
        return stored ? JSON.parse(stored) : null;
    }
    
    async logout() {
        try { await api.post('/v1/auth/logout'); } catch { /* idempotente */ }
        authStore.clear();
        localStorage.removeItem(getStorageKey(BASE_STORAGE_KEYS.PROFESSOR_TOKEN));
        localStorage.removeItem(getStorageKey(BASE_STORAGE_KEYS.PROFESSOR_USER));
        localStorage.removeItem(getStorageKey(BASE_STORAGE_KEYS.CURRENT_PROFESSOR));
    }
    
    // Método para verificar si el usuario es un profesor válido
    isProfessorRole(role: string): boolean {
        const professorRoles = [
            // Roles del backend (actuales)
            'TEACHER',
            'COORDINATOR',
            'CYCLE_DIRECTOR',
            'PSYCHOLOGIST',
            'INTERVIEWER',

            // Profesores por ciclo (legacy/específicos)
            'TEACHER_EARLY_CYCLE',

            // Profesores básica (3° a 7°)
            'TEACHER_LANGUAGE_BASIC',
            'TEACHER_MATHEMATICS_BASIC',
            'TEACHER_ENGLISH_BASIC',
            'TEACHER_SCIENCE_BASIC',
            'TEACHER_HISTORY_BASIC',

            // Profesores media (8° a IV)
            'TEACHER_LANGUAGE_HIGH',
            'TEACHER_MATHEMATICS_HIGH',
            'TEACHER_ENGLISH_HIGH',
            'TEACHER_SCIENCE_HIGH',
            'TEACHER_HISTORY_HIGH',

            // Coordinadores específicos
            'COORDINATOR_LANGUAGE',
            'COORDINATOR_MATHEMATICS',
            'COORDINATOR_ENGLISH',
            'COORDINATOR_SCIENCE',
            'COORDINATOR_HISTORY',

            // Legacy roles (compatibilidad)
            'TEACHER_LANGUAGE',
            'TEACHER_MATHEMATICS',
            'TEACHER_ENGLISH'
        ];
        return professorRoles.includes(role);
    }
}

export const professorAuthService = new ProfessorAuthService();
