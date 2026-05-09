/**
 * Cliente HTTP del MF para hablar con el BFF.
 *
 * Cambios respecto a la versión anterior (alineado con la guía de integración
 * BFF tras SECURITY_TOKENS.md):
 *
 *  1. `withCredentials: true` para que la cookie HttpOnly del refresh viaje en
 *     cada llamada a `/v1/auth/*` (NGINX enruta esta familia hacia el BFF).
 *  2. El access token se lee del `authStore` (memoria). Si todavía no hay
 *     sesión hidratada, se hace fallback a `localStorage` por compatibilidad
 *     transicional con flujos antiguos (Firebase `onAuthStateChanged`,
 *     handoff cross-origin vía `mf_token`).
 *  3. Refresh reactivo con cola: si llega un 401 con `TOKEN_EXPIRED` /
 *     `UNAUTHORIZED` en una request normal, una sola llamada a
 *     `/v1/auth/refresh` es disparada y todas las requests en vuelo se
 *     reintentan con el nuevo token.
 *  4. Códigos terminales (`SESSION_REVOKED`, `SESSION_EXPIRED`,
 *     `REFRESH_INVALID`, `SESSION_INVALIDATED`) limpian la sesión y
 *     redirigen al login con la `reason` adecuada.
 */

import axios from 'axios';
import { csrfService } from './csrfService';
import { getApiBaseUrl } from '../config/api.config';
import { auth } from '../src/lib/firebase';
import {
    getStorageKey,
    BASE_STORAGE_KEYS,
    authStore,
    createRefreshQueue,
    extractAuthErrorCode,
    isAccessExpired,
    isSessionTerminal,
    reasonFromCode,
    broadcastLogout,
} from '../../../packages/backend-sdk/src/index';

const api = axios.create({
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json',
    },
    // OBLIGATORIO: el BFF envía/recibe la cookie HttpOnly `admitia_refresh`.
    withCredentials: true,
});

const isPublicRoute = (url: string): boolean => {
    const publicSegments = [
        '/auth/login',
        '/auth/register',
        '/auth/refresh',
        '/auth/public-key',
        '/auth/csrf-token',
        '/email/',
        '/usuario-auth/',
        '/public/',
        '/applications/public/',
        '/documents/public/',
        '/schedules/public/',
        '/evaluations/public/',
        '/rut/',
    ];
    return publicSegments.some((segment) => url.includes(segment));
};

const isAuthEndpoint = (url: string): boolean =>
    url.includes('/auth/refresh') || url.includes('/auth/logout') || url.includes('/auth/login');

/**
 * Resuelve el access token siguiendo este orden:
 *   1. authStore (memoria) — fuente de verdad post-login.
 *   2. Firebase idToken — para flujos que aún dependen del SDK.
 *   3. localStorage (legacy) — sólo durante la transición.
 */
async function resolveAccessTokenForRequest(): Promise<string | null> {
    const inMemory = authStore.getValidAccessToken(0);
    if (inMemory) return inMemory;

    try {
        const currentUser = auth?.currentUser;
        if (currentUser) {
            const idToken = await currentUser.getIdToken();
            if (idToken) return idToken;
        }
    } catch {
        // ignore — caemos al legacy storage
    }

    return (
        localStorage.getItem(getStorageKey(BASE_STORAGE_KEYS.AUTH_TOKEN)) ||
        localStorage.getItem(getStorageKey(BASE_STORAGE_KEYS.PROFESSOR_TOKEN)) ||
        null
    );
}

// Cola compartida: garantiza un único POST /v1/auth/refresh aunque
// múltiples requests reciban 401 simultáneamente. NGINX enruta `/v1/auth/*`
// hacia el BFF; los nuevos endpoints `/api/auth/*` se incorporarán cuando el
// gateway los exponga.
const refreshQueue = createRefreshQueue({
    refresh: async () => {
        const baseUrl = getApiBaseUrl();
        const { data } = await axios.post(
            `${baseUrl}/v1/auth/refresh`,
            null,
            { withCredentials: true, headers: { Accept: 'application/json' } },
        );
        if (!data?.token || typeof data.expiresIn !== 'number') {
            throw new Error('Respuesta de refresh inválida');
        }
        authStore.updateAccessToken(data.token, data.expiresIn, data.user ?? undefined);
        return data.token as string;
    },
    onFailure: () => {
        authStore.clear();
    },
});

// Interceptor para agregar el token de autenticación y CSRF token
api.interceptors.request.use(
    async (config) => {
        const runtimeBaseURL = getApiBaseUrl();
        if (config.url && !config.url.startsWith('http')) {
            config.url = runtimeBaseURL + config.url;
        }

        const url = config.url || '';
        const isPublic = isPublicRoute(url);

        if (!isPublic) {
            const token = await resolveAccessTokenForRequest();
            if (token) {
                config.headers = config.headers ?? ({} as any);
                (config.headers as any).Authorization = `Bearer ${token}`;
            }
        }

        const method = (config.method || 'get').toUpperCase();
        const needsCsrf = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method);
        if (needsCsrf && !url.includes('/csrf-token')) {
            try {
                const csrfHeaders = await csrfService.getCsrfHeaders();
                config.headers = config.headers ?? ({} as any);
                (config.headers as any)['X-CSRF-Token'] = csrfHeaders['X-CSRF-Token'];
            } catch (error) {
                console.error('Failed to get CSRF token:', error);
            }
        }

        return config;
    },
    (error) => Promise.reject(error),
);

function redirectToLoginWithReason(reason: string): void {
    const currentPath = window.location.pathname;
    const isLoginPage = currentPath.includes('/login') || currentPath === '/';
    if (isLoginPage) return;
    setTimeout(() => {
        const target = currentPath.includes('/admin') || currentPath.includes('/profesor')
            ? `/admin/login?reason=${reason}`
            : `/login?reason=${reason}`;
        window.location.href = target;
    }, 50);
}

function clearLegacyStorage(): void {
    localStorage.removeItem(getStorageKey(BASE_STORAGE_KEYS.AUTH_TOKEN));
    localStorage.removeItem(getStorageKey(BASE_STORAGE_KEYS.AUTHENTICATED_USER));
    localStorage.removeItem(getStorageKey(BASE_STORAGE_KEYS.PROFESSOR_TOKEN));
    localStorage.removeItem(getStorageKey(BASE_STORAGE_KEYS.PROFESSOR_USER));
    localStorage.removeItem(getStorageKey(BASE_STORAGE_KEYS.CURRENT_PROFESSOR));
}

api.interceptors.response.use(
    (response) => {
        if (!response) {
            return Promise.reject(new Error('No se recibió respuesta del servidor'));
        }
        return response;
    },
    async (error) => {
        const original = error.config || {};
        const status: number | undefined = error.response?.status;
        const code = extractAuthErrorCode(error.response?.data);
        const url = String(original.url || '');

        // Códigos terminales: nunca reintentar, limpiar y redirigir.
        if (status === 401 && isSessionTerminal(code)) {
            authStore.clear();
            clearLegacyStorage();
            csrfService.clearToken();
            broadcastLogout(reasonFromCode(code));
            redirectToLoginWithReason(reasonFromCode(code));
            return Promise.reject(error);
        }

        // Refresh reactivo con cola para 401 por access expirado.
        if (
            isAccessExpired(status, code) &&
            !original._retry &&
            !isAuthEndpoint(url) &&
            !isPublicRoute(url)
        ) {
            original._retry = true;
            const newToken = await refreshQueue.run();
            if (!newToken) {
                authStore.clear();
                clearLegacyStorage();
                redirectToLoginWithReason('expired');
                return Promise.reject(error);
            }
            original.headers = original.headers ?? {};
            original.headers.Authorization = `Bearer ${newToken}`;
            return api.request(original);
        }

        if (status === 401) {
            authStore.clear();
            clearLegacyStorage();
            redirectToLoginWithReason('expired');
        }

        if (status === 403) {
            const errorMessage = String(
                error.response?.data?.error?.message || error.response?.data?.error || error.response?.data?.message || '',
            ).toLowerCase();
            if (errorMessage.includes('csrf') || errorMessage.includes('invalid token')) {
                csrfService.clearToken();
            }
        }

        return Promise.reject(error);
    },
);

export default api;

