import axios from 'axios';
import { csrfService } from './csrfService';
import { getApiBaseUrl } from '../config/api.config';
import { auth } from '../src/lib/firebase';

// Configuración base de axios - Using nginx gateway for microservices
// NO baseURL here - will be set in request interceptor for runtime detection
const api = axios.create({
    // baseURL will be set dynamically in the interceptor below
    timeout: 30000, // Aumentado a 30 segundos para consultas complejas
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true, // Required for CSRF cookie to be sent
});

// Función para verificar si es una ruta pública que no requiere autenticación
const isPublicRoute = (url: string): boolean => {
    // Match against path segments (works with both /v1/ and /api/ prefixes)
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
        '/rut/'
    ];

    return publicSegments.some(segment => url.includes(segment));
};

// Interceptor para agregar el token de autenticación y CSRF token
api.interceptors.request.use(
    async (config) => {
        // CRITICAL: Set baseURL at runtime for each request
        let runtimeBaseURL = getApiBaseUrl();

        // Build full URL if config.url is relative
        if (config.url && !config.url.startsWith('http')) {
            config.url = runtimeBaseURL + config.url;
        }

        const url = config.url || '';
        const isPublic = isPublicRoute(url);

        console.log(`api.ts - Runtime baseURL: ${runtimeBaseURL}`);
        console.log(`API Request: ${url} - Is Public: ${isPublic}`);

        // Add auth token if not a public route
        if (!isPublic) {
            const currentUser = auth.currentUser;
            if (currentUser) {
                try {
                    const idToken = await currentUser.getIdToken();
                    config.headers.Authorization = `Bearer ${idToken}`;
                } catch {
                    const token = localStorage.getItem('auth_token');
                    if (token) config.headers.Authorization = `Bearer ${token}`;
                }
            } else {
                const token = localStorage.getItem('auth_token') || localStorage.getItem('professor_token');
                if (token) config.headers.Authorization = `Bearer ${token}`;
            }
        }

        // Add CSRF token for POST, PUT, DELETE, PATCH requests
        const method = (config.method || 'get').toUpperCase();
        const needsCsrf = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method);

        // console.log(`CSRF Check - Method: ${method}, NeedsCsrf: ${needsCsrf}, URL: ${url}`);

        // Skip CSRF token for CSRF token endpoint itself
        if (needsCsrf && !url.includes('/csrf-token')) {
            // console.log(`Attempting to get CSRF token for ${method} request...`);
            try {
                const csrfHeaders = await csrfService.getCsrfHeaders();
                // console.log(`CSRF headers received:`, csrfHeaders);
                config.headers['X-CSRF-Token'] = csrfHeaders['X-CSRF-Token'];
                // console.log(`Added CSRF token to ${method} request`);
            } catch (error) {
                console.error('Failed to get CSRF token:', error);
                console.error('Error details:', error);
                // Continue without CSRF token - backend will reject the request
            }
        } else {
            // console.log(`Skipping CSRF token - needsCsrf: ${needsCsrf}, isCSRFEndpoint: ${url.includes('/csrf-token')}`);
        }

        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Interceptor para manejar errores
api.interceptors.response.use(
    (response) => {
        // DEFENSIVE: Validate response exists before returning
        if (!response) {
            console.error('api.ts interceptor: response is undefined');
            return Promise.reject(new Error('No se recibió respuesta del servidor'));
        }
        return response;
    },
    (error) => {
        console.error('API Error:', error);

        if (error.response) {
            // El servidor respondió con un código de estado fuera del rango 2xx
            // DEFENSIVE: Validate error.response.data exists before accessing
            console.error('Error response:', error.response?.data || 'No response data');
            console.error('Error status:', error.response.status);
            console.error('Error headers:', error.response.headers);
            console.error('Request data:', error.config?.data || 'No request data');
            
            // Si es 401, limpiar la sesión correspondiente y redirigir
            if (error.response.status === 401) {
                console.warn('JWT token expired or invalid - cleaning session');

                // Limpiar token de usuario regular
                localStorage.removeItem('auth_token');
                localStorage.removeItem('authenticated_user');

                // Limpiar token de profesor
                localStorage.removeItem('professor_token');
                localStorage.removeItem('professor_user');
                localStorage.removeItem('currentProfessor');

                // Solo redirigir si no estamos ya en una página de login o si no es una ruta pública
                const currentPath = window.location.hash || window.location.pathname;
                const isLoginPage = currentPath.includes('/login') || currentPath === '/';
                const requestUrl = error.config?.url || '';
                const isPublicRoute = requestUrl.includes('/public/') ||
                                     requestUrl.includes('/v1/auth/login') ||
                                     requestUrl.includes('/v1/auth/register');

                if (!isLoginPage && !isPublicRoute) {
                    console.warn('Redirecting to login due to expired token');
                    // Usar setTimeout para evitar problemas con el contexto de React
                    setTimeout(() => {
                        window.location.href = '/#/login';
                    }, 100);
                }
            }

            // Si es 403, puede ser un CSRF token inválido
            if (error.response.status === 403) {
                // DEFENSIVE: Use optional chaining for error.response.data
                const errorMessage = String(error.response?.data?.error || error.response?.data?.message || '');
                if (errorMessage.toLowerCase().includes('csrf') || errorMessage.toLowerCase().includes('invalid token')) {
                    console.warn('CSRF token invalid or missing - clearing token');
                    csrfService.clearToken();
                    // El próximo request automáticamente obtendrá un nuevo token
                }
            }
        } else if (error.request) {
            // La petición fue hecha pero no se recibió respuesta
            console.error('No response received:', error.request);
        } else {
            // Algo pasó al configurar la petición
            console.error('Request setup error:', error.message);
        }
        
        return Promise.reject(error);
    }
);

export default api; 