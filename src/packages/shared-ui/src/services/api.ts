/**
 * Cliente HTTP para hablar con el BFF.
 *
 * Cambios respecto a la versión anterior (alineado con la guía de integración
 * BFF tras SECURITY_TOKENS.md):
 *
 *  1. `withCredentials: true` para que la cookie HttpOnly del refresh viaje en
 *     cada llamada a `/api/auth/*` (NGINX enruta esta familia hacia el BFF).
 *  2. El access token se lee del `authStore` (memoria). Si todavía no hay
 *     sesión hidratada, se hace fallback a `localStorage` por compatibilidad
 *     transicional con flujos antiguos de Firebase `onAuthStateChanged`.
 *  3. Refresh reactivo con cola: si llega un 401 con `TOKEN_EXPIRED` /
 *     `UNAUTHORIZED` en una request normal, una sola llamada a
 *     `/api/auth/refresh` es disparada y todas las requests en vuelo se
 *     reintentan con el nuevo token.
 *  4. Códigos terminales (`SESSION_REVOKED`, `SESSION_EXPIRED`,
 *     `REFRESH_INVALID`, `SESSION_INVALIDATED`) limpian la sesión y
 *     redirigen al login con la `reason` adecuada.
 */

import axios from 'axios';
import { csrfService } from './csrfService';
import { getApiBaseUrl } from '../config/api.config';
import {
    normalizeGradeLevelsForBackend,
    normalizeGradeLevelsForDisplay,
} from '../../../shared-utils/src/gradeLevels';
import {
    getStorageKey,
    BASE_STORAGE_KEYS,
    authStore,
    runSharedRefresh,
    extractAuthErrorCode,
    isAccessExpired,
    isSessionTerminal,
    reasonFromCode,
    broadcastLogout,
    emitAuthEvent,
    clearRefreshTokenFallback,
} from '../../../backend-sdk/src/index';

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
        '/auth/firebase-login',
        '/auth/firebase-register',
        '/auth/refresh',
        '/auth/public-key',
        '/auth/csrf-token',
        '/auth/check-email',
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
    url.includes('/auth/refresh')
    || url.includes('/auth/logout')
    || url.includes('/auth/login')
    || url.includes('/auth/register')
    || url.includes('/auth/firebase-login')
    || url.includes('/auth/firebase-register');

/**
 * Endpoints "sonda" que se llaman para descubrir si hay sesión activa. Si
 * fallan con 400/401/403 NO debemos redirigir al login — el caller decidirá
 * qué hacer (típicamente `null` y mostrar pantalla de login).
 */
const isProbeEndpoint = (url: string): boolean =>
    url.includes('/auth/check') || url.endsWith('/users/me') || url.includes('/users/me?');

/** El BFF responde 400 con `code: BAD_REQUEST` y `message: "No autenticado"`
 *  cuando se llama a un endpoint protegido sin Bearer válido. Lo tratamos
 *  como "no hay sesión" (silencioso) en lugar de error real. */
const isUnauthenticatedBadRequest = (status: number | undefined, code: string | undefined, msg: string): boolean => {
    if (status !== 400) return false;
    if (code !== 'BAD_REQUEST') return false;
    return /no\s*autenticad/i.test(msg);
};

/**
 * Resuelve el access token siguiendo este orden:
 *   1. authStore (memoria) — fuente de verdad post-login.
 *   2. localStorage (legacy AUTH_TOKEN / PROFESSOR_TOKEN) — para flujos en
 *      transición que aún escriben directamente en localStorage.
 *
 * IMPORTANTE: NUNCA usamos `auth.currentUser.getIdToken()` aquí. El idToken
 * Firebase tiene `auth_time` con la fecha del primer login del SDK, que el
 * BFF rechaza si supera 8h (`FirebaseAuthenticationFilter`). El idToken
 * Firebase sólo se manda explícitamente al body de `/auth/firebase-login`
 * y `/auth/firebase-register`; nunca como Bearer en requests genéricas.
 */
async function resolveAccessTokenForRequest(): Promise<string | null> {
    const inMemory = authStore.getValidAccessToken(0);
    if (inMemory) return inMemory;


    return (
        localStorage.getItem(getStorageKey(BASE_STORAGE_KEYS.AUTH_TOKEN)) ||
        localStorage.getItem(getStorageKey(BASE_STORAGE_KEYS.PROFESSOR_TOKEN)) ||
        null
    );
}

// Cola compartida: el refresh proactivo (timer) y el reactivo (interceptor)
// usan la misma instancia para garantizar que NUNCA haya dos POST
// /api/auth/refresh simultáneos. Eso evita que el backend detecte "reuso" del
// refresh token y revoque la sesión.
const refreshQueue = {
    run: runSharedRefresh,
};

// Interceptor para agregar el token de autenticación y CSRF token
api.interceptors.request.use(
    async (config) => {
        const prekinderCode = String(config.url || '').includes('grade-availability')
            ? 'PREKINDER' as const
            : 'PRE_KINDER' as const;
        config.data = normalizeGradeLevelsForBackend(config.data, { prekinderCode });
        config.params = normalizeGradeLevelsForBackend(config.params, { prekinderCode });

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
            }
        }

        return config;
    },
    (error) => Promise.reject(error),
);

function redirectToLoginWithReason(reason: string): void {
    const hashRoute = window.location.hash?.replace(/^#/, '');
    const currentPath = hashRoute || window.location.pathname;
    const isLoginPage = currentPath.includes('/login') || currentPath === '/';
    if (isLoginPage) return;
    emitAuthEvent({ type: 'expired', route: currentPath });
    // Bump a 100ms para dar margen al AuthNavigationBridge (suscrito al
    // bus de eventos) a ejecutar la navegación SPA. Si el bridge la maneja,
    // marca `window.__authNavHandled = true` y abortamos el reload duro.
    // Si no hay bridge (e.g. fallo de hidratación de React), el fallback
    // `window.location.href` sigue funcionando como safety net.
    setTimeout(() => {
        if ((window as any).__authNavHandled) {
            (window as any).__authNavHandled = false;
            return;
        }
        const target = currentPath.includes('/profesor')
            ? `/profesor/login?reason=${reason}`
            : currentPath.includes('/admin')
            ? `/admin/login?reason=${reason}`
            : `/login?reason=${reason}`;
        window.location.href = target;
    }, 100);
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
        response.data = normalizeGradeLevelsForDisplay(response.data);
        return response;
    },
    async (error) => {
        const original = error.config || {};
        const status: number | undefined = error.response?.status;
        const code = extractAuthErrorCode(error.response?.data);
        const url = String(original.url || '');
        const message = String(
            error.response?.data?.error?.message
            || error.response?.data?.message
            || '',
        );
        const emptyForbidden =
            status === 403 &&
            (error.response?.data == null || error.response?.data === '');
        const probe = isProbeEndpoint(url);
        // Los endpoints de auth (refresh, logout, login) son sondas implícitas:
        // un 401 en ellos significa "no hay sesión activa", no "tu sesión expiró".
        // NO debemos redirigir ni limpiar storage agresivamente cuando estos
        // fallan, porque el AuthContext (bootstrapAuth, onAuthStateChanged) ya
        // está manejando la rehidratación y puede recuperar la sesión por otra vía.
        const isAuthProbe = isAuthEndpoint(url);

        // 400 "No autenticado" en endpoints sonda: no es un error real,
        // es la forma del BFF de decir "no hay sesión". Devolvemos el error
        // tal cual (sin redirigir, sin limpiar) para que el caller maneje
        // el null silenciosamente.
        if (isUnauthenticatedBadRequest(status, code as any, message)) {
            return Promise.reject(error);
        }

        if (status === 403 && (code === 'PASSWORD_CHANGE_REQUIRED' || code === 'TEMPORARY_PASSWORD_EXPIRED')) {
            authStore.patchUser({
                mustChangePassword: true,
                temporaryPasswordExpired: code === 'TEMPORARY_PASSWORD_EXPIRED',
            });
            return Promise.reject(error);
        }

        // Códigos terminales: nunca reintentar, limpiar y redirigir.
        // Excepción: si el endpoint que falló es uno de auth (refresh/logout/login),
        // el AuthContext lo manejará — no redirigimos NI emitimos eventos
        // desde aquí. Sólo limpiamos el estado local en silencio.
        if (status === 401 && isSessionTerminal(code)) {
            authStore.clear();
            clearRefreshTokenFallback();
            clearLegacyStorage();
            csrfService.clearToken();
            // Sólo notificamos (bridge SPA-nav + otras pestañas) cuando
            // efectivamente vamos a redirigir. Para auth-probes o endpoints
            // sonda, un 401 terminal significa "no había sesión", no "se
            // perdió la sesión" — no debemos navegar ni propagar a otras
            // pestañas que pueden tener sesiones legítimas independientes.
            if (!probe && !isAuthProbe) {
                emitAuthEvent({ type: 'terminal', code, status });
                broadcastLogout(reasonFromCode(code));
                redirectToLoginWithReason(reasonFromCode(code));
            }
            return Promise.reject(error);
        }

        // Refresh reactivo con cola para 401 por access expirado.
        // Compatibilidad: Spring Security anterior devolvía 403 sin body cuando
        // un Bearer válido ya no tenía active_session; ese caso es recuperable
        // con refresh igual que un 401 UNAUTHORIZED.
        if (
            (isAccessExpired(status, code) || emptyForbidden) &&
            !original._retry &&
            !isAuthEndpoint(url) &&
            !isPublicRoute(url)
        ) {
            original._retry = true;
            const newToken = await refreshQueue.run();
            if (!newToken) {
                authStore.clear();
                clearRefreshTokenFallback();
                clearLegacyStorage();
                if (!probe && !isAuthProbe) {
                    // emit + redirect (idem que arriba: sólo cuando vamos
                    // efectivamente a navegar al login).
                    redirectToLoginWithReason('expired');
                }
                return Promise.reject(error);
            }
            original.headers = original.headers ?? {};
            original.headers.Authorization = `Bearer ${newToken.token}`;
            return api.request(original);
        }

        if (status === 401) {
            // No redirigimos ni limpiamos si el 401 vino de un endpoint de auth
            // (refresh/login/logout): es información sobre la sesión, no un error
            // que invalide la sesión actual. El AuthContext decide qué hacer.
            if (!isAuthProbe) {
                authStore.clear();
                clearRefreshTokenFallback();
                clearLegacyStorage();
                if (!probe) redirectToLoginWithReason('expired');
            }
        }

        if (status === 403) {
            const errorMessage = message.toLowerCase();
            if (errorMessage.includes('csrf') || errorMessage.includes('invalid token')) {
                csrfService.clearToken();
            }
        }

        return Promise.reject(error);
    },
);

export default api;
