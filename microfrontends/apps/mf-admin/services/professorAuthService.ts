import api from './api';
import { getStorageKey, BASE_STORAGE_KEYS } from '../../../packages/backend-sdk/src/index';
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
        try {
            console.log('Intentando login de profesor:', request.email);

            // Send credentials directly over HTTPS (no RSA encryption)
            console.log('[Professor Auth] Sending credentials over HTTPS');
            const response = await api.post('/v1/auth/login', { ...request, portalType: 'STAFF' });
            const data = response.data;

            console.log('Login exitoso para profesor:', data);

            // Guardar token en localStorage
            if (data.token) {
                localStorage.setItem(getStorageKey(BASE_STORAGE_KEYS.PROFESSOR_TOKEN), data.token);
                const u = data.user;
                localStorage.setItem(getStorageKey(BASE_STORAGE_KEYS.PROFESSOR_USER), JSON.stringify({
                    email: u?.email || data.email,
                    firstName: u?.firstName || data.firstName,
                    lastName: u?.lastName || data.lastName,
                    role: u?.role || data.role,
                    subject: u?.subject || data.subject
                }));
            }

            return data;
            
        } catch (error: any) {
            console.error('Error en login de profesor:', error);
            
            if (error.response?.status === 401) {
                throw new Error('Credenciales inválidas');
            } else if (error.response?.status === 403) {
                throw new Error(error.response?.data?.error?.message || 'Su cuenta no tiene acceso al portal de profesores. Use el portal correspondiente a su rol.');
            } else if (error.response?.status === 400) {
                throw new Error(error.response?.data?.error?.message || 'Datos de login inválidos');
            } else if (error.response?.status === 500) {
                throw new Error('Error del servidor');
            }
            
            throw new Error('Error al iniciar sesión');
        }
    }
    
    async getCurrentProfessor(): Promise<ProfessorUser | null> {
        try {
            const token = localStorage.getItem(getStorageKey(BASE_STORAGE_KEYS.PROFESSOR_TOKEN));
            if (!token) {
                return null;
            }

            // Configurar el token en el header
            const config = {
                headers: { Authorization: `Bearer ${token}` }
            };

            const response = await api.get('/v1/users/me', config);
            // El backend retorna { success: true, user: {...} }
            return response.data.user || response.data;

        } catch (error: any) {
            console.error('Error obteniendo profesor actual:', error);
            // Si hay error de autenticación, limpiar datos
            if (error.response?.status === 401) {
                this.logout();
            }
            return null;
        }
    }
    
    isAuthenticated(): boolean {
        const token = localStorage.getItem(getStorageKey(BASE_STORAGE_KEYS.PROFESSOR_TOKEN));
        return !!token;
    }
    
    getStoredProfessor() {
        const stored = localStorage.getItem(getStorageKey(BASE_STORAGE_KEYS.PROFESSOR_USER));
        return stored ? JSON.parse(stored) : null;
    }
    
    logout() {
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
