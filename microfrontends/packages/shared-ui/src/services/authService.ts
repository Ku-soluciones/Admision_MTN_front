/**
 * authService — capa de auth del MF apoderado.
 *
 * Adaptado al nuevo contrato del BFF (ver guía de integración tras
 * SECURITY_TOKENS.md y FIX_FIREBASE_UID_LINKING.md):
 *  - El BFF devuelve { token, expiresIn, refreshToken (cookie HttpOnly),
 *    refreshExpiresIn, absoluteSessionSeconds, firebaseLinked, user, … }.
 *  - El access token vive sólo en memoria (`authStore`). El refresh viaja
 *    por cookie HttpOnly.
 *  - El login con email/password puede entregar también `firebaseIdToken`
 *    para que el BFF enlace `firebase_uid` en el mismo flujo.
 */

import api from './api';
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    GoogleAuthProvider,
    signInWithPopup,
    type Auth as FirebaseAuthInstance,
} from 'firebase/auth';
import { auth as firebaseAuth } from '../src/lib/firebase';
import {
    getStorageKey,
    BASE_STORAGE_KEYS,
    authStore,
    scheduleRefresh,
    cancelScheduledRefresh,
    broadcastLogin,
    broadcastLogout,
} from '../../../backend-sdk/src/index';

// El módulo Firebase exporta `auth` como `Auth | null` (el null aparece si
// falta la config). Para los flujos que requieren Firebase, lo afirmamos
// como no-null; el primer error en runtime será explícito si falta config.
const auth = firebaseAuth as FirebaseAuthInstance;

export interface LoginRequest {
    email: string;
    password: string;
    /** ADMIN | STAFF | GUARDIAN — restringe el login al portal correcto. */
    portalType?: 'ADMIN' | 'STAFF' | 'GUARDIAN';
}

export interface RegisterRequest {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    rut: string;
    phone?: string;
}

export interface AuthUser {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    rut: string | null;
    phone: string | null;
    role: string;
    subject?: string;
    educationalLevel?: string | null;
    active: boolean;
    emailVerified: boolean;
    lastLoginAt?: string;
    preferences?: Record<string, any>;
    // Index signature para compatibilizar con `AuthSessionUser` del SDK.
    [key: string]: unknown;
}

export interface AuthResponse {
    success: boolean;
    message?: string;
    user?: AuthUser;
    /** Access token (15 min). Sólo en memoria. */
    token?: string;
    expiresIn?: number;
    absoluteSessionSeconds?: number;
    firebaseLinked?: boolean;
    sessionId?: string | null;
    permissions?: string[];
    // Campos legacy mantenidos por compatibilidad:
    email?: string;
    firstName?: string;
    lastName?: string;
    role?: string;
    id?: number;
    subject?: string;
    applicationId?: number;
}

/**
 * Endpoints de auth.
 *
 * NGINX expone `/v1/auth/*` (legacy en el sentido del roadmap, pero ACTIVO en
 * staging y prod). Los `/api/auth/*` son los nuevos endpoints planificados
 * tras SECURITY_TOKENS.md y se habilitarán cuando el gateway los enrute.
 *
 * Por eso usamos `/v1/auth/*` como ruta primaria y `/api/auth/*` como upgrade
 * opcional. `tryNewApiFirst` se puede activar por env (`VITE_AUTH_TRY_NEW_API`)
 * cuando el BFF los exponga; mientras esté en false (default), evitamos el 404
 * ruidoso en cada login.
 */
const ENDPOINTS = {
    login: '/v1/auth/login',
    firebaseLogin: '/v1/auth/firebase-login',
    register: '/v1/auth/register',
    firebaseRegister: '/v1/auth/firebase-register',
    refresh: '/v1/auth/refresh',
    logout: '/v1/auth/logout',
    check: '/v1/auth/check',
    firebaseLink: '/v1/auth/firebase/link',
    firebaseSendVerification: '/v1/auth/firebase/send-verification-email',
    checkEmail: '/v1/auth/check-email',
} as const;

const NEW_API = {
    login: '/api/auth/login',
    firebaseLogin: '/api/auth/firebase-login',
    register: '/api/auth/register',
    firebaseRegister: '/api/auth/firebase-register',
    refresh: '/api/auth/refresh',
    logout: '/api/auth/logout',
    check: '/api/auth/check',
    firebaseLink: '/api/auth/firebase/link',
    firebaseSendVerification: '/api/auth/firebase/send-verification-email',
    checkEmail: '/api/auth/check-email',
} as const;

function shouldTryNewApi(): boolean {
    try {
        const meta: any = (Function('return import.meta')() as any) ?? {};
        return String(meta?.env?.VITE_AUTH_TRY_NEW_API ?? '').toLowerCase() === 'true';
    } catch {
        return false;
    }
}

/**
 * Llama al endpoint primario (`/v1/...`); si está habilitado por env,
 * intenta primero el nuevo (`/api/...`) y cae al primario en 404/405.
 */
async function postAuth<T = any>(endpointKey: keyof typeof ENDPOINTS, body: any): Promise<T> {
    if (shouldTryNewApi()) {
        try {
            const res = await api.post(NEW_API[endpointKey], body);
            return res.data as T;
        } catch (error: any) {
            const status = error?.response?.status;
            if (status !== 404 && status !== 405) throw error;
            // Fallback a /v1/...
        }
    }
    const res = await api.post(ENDPOINTS[endpointKey], body);
    return res.data as T;
}

function adoptSession(data: AuthResponse): void {
    if (!data?.token || typeof data.expiresIn !== 'number') return;
    authStore.setSession({
        token: data.token,
        expiresIn: data.expiresIn,
        absoluteSessionSeconds: data.absoluteSessionSeconds,
        user: data.user,
        firebaseLinked: data.firebaseLinked,
        sessionId: data.sessionId ?? null,
        permissions: data.permissions ?? [],
    });

    // Programar refresh proactivo.
    scheduleRefresh(data.expiresIn, {
        refresh: async () => {
            const res = await api.post(ENDPOINTS.refresh);
            const r = res.data || {};
            return r.token && typeof r.expiresIn === 'number'
                ? { token: r.token, expiresIn: r.expiresIn, user: r.user, firebaseLinked: r.firebaseLinked }
                : null;
        },
        onFailure: () => {
            authStore.clear();
        },
    });

    broadcastLogin(data.token, data.expiresIn, data.user, data.firebaseLinked);
}

class AuthService {

    async login(request: LoginRequest): Promise<AuthResponse> {
        try {
            // 1. Autenticar en Firebase (mantenemos el flujo previo: el SDK
            //    maneja persistencia de sesión por-origen y nos da un idToken
            //    fresco para que el BFF enlace `firebase_uid` si aún no lo está).
            const credential = await signInWithEmailAndPassword(auth, request.email, request.password);
            const idToken = await credential.user.getIdToken();

            // 2. Llamar al BFF. El nuevo contrato acepta `firebaseIdToken` como
            //    parte del body para enlazar/validar el UID en el mismo paso.
            //    Por defecto va a `/v1/auth/firebase-login` (NGINX); si el
            //    flag VITE_AUTH_TRY_NEW_API=true se intenta primero
            //    `/api/auth/firebase-login`.
            const data = await postAuth<AuthResponse>(
                'firebaseLogin',
                { idToken, portalType: request.portalType ?? 'GUARDIAN' },
            );

            // 3. Si el BFF respondió con el nuevo contrato (token + expiresIn),
            //    adoptamos la sesión en memoria. Si no, fallback al idToken
            //    Firebase (compatibilidad con sprint 0).
            if (data?.token && typeof data.expiresIn === 'number') {
                adoptSession(data);
            } else {
                // Fallback transicional: persistir el idToken en localStorage
                // como lo hacía la versión anterior. Será removido cuando el
                // BFF entregue siempre el nuevo contrato.
                localStorage.setItem(getStorageKey(BASE_STORAGE_KEYS.AUTH_TOKEN), idToken);
            }

            return {
                success: true,
                token: data?.token ?? idToken,
                expiresIn: data?.expiresIn,
                user: data?.user,
                firebaseLinked: data?.firebaseLinked,
                absoluteSessionSeconds: data?.absoluteSessionSeconds,
                sessionId: data?.sessionId,
                permissions: data?.permissions,
            };
        } catch (error: any) {
            const code = error?.code;
            if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
                throw new Error('Credenciales inválidas');
            }
            if (code === 'auth/too-many-requests') {
                throw new Error('Demasiados intentos. Intenta más tarde.');
            }
            const status = error?.response?.status;
            const bffMessage = error?.response?.data?.error?.message || error?.response?.data?.message;
            if (status === 400) throw new Error(bffMessage || 'Datos de login inválidos');
            if (status === 403) throw new Error(bffMessage || 'Acceso restringido');
            if (status === 423) throw new Error(bffMessage || 'Cuenta bloqueada temporalmente. Intente más tarde.');
            if (status === 429) {
                const retry = error?.response?.headers?.['retry-after'];
                throw new Error(`Demasiados intentos.${retry ? ` Reintente en ${retry} s.` : ''}`);
            }
            throw new Error(bffMessage || error.message || 'Error al iniciar sesión');
        }
    }

    /**
     * Login con Google a través de Firebase. Devuelve un idToken al BFF que
     * crea/enlaza la cuenta automáticamente.
     */
    async loginWithGoogle(): Promise<AuthResponse> {
        const cred = await signInWithPopup(auth, new GoogleAuthProvider());
        const idToken = await cred.user.getIdToken(true);
        const data = await postAuth<AuthResponse>('firebaseLogin', { idToken });
        if (data?.token && typeof data.expiresIn === 'number') {
            adoptSession({ ...data, firebaseLinked: data.firebaseLinked ?? true });
        }
        return { ...data, success: true };
    }

    async register(request: RegisterRequest): Promise<AuthResponse> {
        try {
            // 1. Crear el usuario en Firebase. NO enviamos `sendEmailVerification` aquí
            //    porque ese correo sale del dominio por defecto de Firebase. En su lugar,
            //    despachamos nosotros el correo desde nuestra casilla (Resend) DESPUÉS
            //    de crear la cuenta en el BFF para no colisionar con el alta.
            const credential = await createUserWithEmailAndPassword(auth, request.email, request.password);
            const idToken = await credential.user.getIdToken();

            // 2. Registrar en el BFF — `firebaseIdToken` permite que el BFF
            //    enlace `firebase_uid` de inmediato (FIX_FIREBASE_UID_LINKING.md).
            const data = await postAuth<AuthResponse>(
                'firebaseRegister',
                {
                    idToken,
                    firstName: request.firstName,
                    lastName: request.lastName,
                    rut: request.rut,
                    phone: request.phone,
                },
            );

            if (data?.token && typeof data.expiresIn === 'number') {
                adoptSession(data);
            } else {
                localStorage.setItem(getStorageKey(BASE_STORAGE_KEYS.AUTH_TOKEN), idToken);
            }

            // 3. Recién aquí pedimos al BFF que envíe el correo de verificación
            //    DESDE NUESTRA CASILLA institucional. Es best-effort: si falla,
            //    no rompemos el registro (el usuario puede solicitarlo de nuevo).
            try {
                const verificationPath = shouldTryNewApi()
                    ? NEW_API.firebaseSendVerification
                    : ENDPOINTS.firebaseSendVerification;
                await api.post(verificationPath, {
                    idToken,
                    email: request.email,
                    firstName: request.firstName,
                    lastName: request.lastName,
                });
            } catch (verifyErr) {
                // No bloquear el registro si el envío del correo institucional falla.
                // eslint-disable-next-line no-console
                console.warn('[Auth] No se pudo enviar el correo de verificación institucional:', verifyErr);
            }

            return {
                success: true,
                token: data?.token ?? idToken,
                expiresIn: data?.expiresIn,
                user: data?.user,
                firebaseLinked: data?.firebaseLinked,
            };
        } catch (error: any) {
            const code = error?.code;
            if (code === 'auth/email-already-in-use') throw new Error('Ya existe un usuario con este email');
            if (code === 'auth/weak-password') throw new Error('La contraseña debe tener al menos 6 caracteres');
            const status = error?.response?.status;
            const bffMessage = error?.response?.data?.error?.message || error?.response?.data?.message;
            if (status === 400) throw new Error(bffMessage || 'Datos de registro inválidos');
            if (status === 409) throw new Error(bffMessage || 'El email ya está registrado.');
            throw new Error(bffMessage || error.message || 'Error al crear la cuenta');
        }
    }

    /**
     * Linking explícito de cuentas históricas (sin firebase_uid). Tras el
     * sign-in con Google/Email vía Firebase, llama al BFF para asociar el UID.
     */
    async linkFirebaseAccount(): Promise<void> {
        const cred = await signInWithPopup(auth, new GoogleAuthProvider());
        const idToken = await cred.user.getIdToken(true);
        await api.post(ENDPOINTS.firebaseLink, { idToken });
        authStore.setFirebaseLinked(true);
    }

    async checkEmailExists(email: string): Promise<boolean> {
        const tryUrl = async (path: string): Promise<boolean | null> => {
            try {
                const response = await api.get(`${path}?email=${encodeURIComponent(email)}`);
                return Boolean(response.data?.exists ?? response.data);
            } catch (err: any) {
                if (err?.response?.status === 404 || err?.response?.status === 405) return null;
                return false;
            }
        };
        if (shouldTryNewApi()) {
            const r = await tryUrl(NEW_API.checkEmail);
            if (r !== null) return r;
        }
        const r = await tryUrl(ENDPOINTS.checkEmail);
        return r ?? false;
    }

    async logout(): Promise<void> {
        cancelScheduledRefresh();
        try {
            // El BFF revoca el refresh server-side y borra la cookie HttpOnly.
            await api.post(ENDPOINTS.logout);
        } catch {
            // idempotente: si falla la llamada server-side, igual limpiamos client-side
        }
        try { await signOut(auth); } catch { /* no-op */ }

        authStore.clear();
        localStorage.removeItem(getStorageKey(BASE_STORAGE_KEYS.AUTH_TOKEN));
        localStorage.removeItem(getStorageKey(BASE_STORAGE_KEYS.AUTHENTICATED_USER));
        broadcastLogout('user');
    }
}

export const authService = new AuthService();

// Best-effort logout cuando la pestaña se cierra. Usa sendBeacon para no
// bloquear el unload. La cookie HttpOnly + Authorization header viajan
// automáticamente porque sendBeacon respeta cookies same-site del request.
if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
        try {
            const url = (import.meta as any).env?.VITE_API_BASE_URL
                ? `${(import.meta as any).env.VITE_API_BASE_URL}${ENDPOINTS.logout}`
                : ENDPOINTS.logout;
            navigator.sendBeacon?.(url);
        } catch { /* no-op */ }
    });
}
