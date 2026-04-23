import api from './api';
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
} from 'firebase/auth';
import { auth } from '../src/lib/firebase';

export interface LoginRequest {
    email: string;
    password: string;
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
}

export interface AuthResponse {
    success: boolean;
    message?: string;
    user?: AuthUser;
    // Legacy fields kept for backward compatibility
    token?: string;
    email?: string;
    firstName?: string;
    lastName?: string;
    role?: string;
    id?: number;
    subject?: string;
    applicationId?: number;
}

class AuthService {

    async login(request: LoginRequest): Promise<AuthResponse> {
        try {
            // 1. Authenticate with Firebase
            const credential = await signInWithEmailAndPassword(auth, request.email, request.password);
            const idToken = await credential.user.getIdToken();

            // 2. Send idToken to BFF to get user data (roles, profile, etc.)
            const response = await api.post('/v1/auth/firebase-login', { idToken });
            const data = response.data;

            // 3. Store the Firebase idToken for immediate use until interceptor takes over
            localStorage.setItem('auth_token', idToken);

            return {
                success: true,
                token: idToken,
                user: data.user,
            };
        } catch (error: any) {
            // Firebase error codes
            const code = error?.code;
            if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
                throw new Error('Credenciales inválidas');
            }
            if (code === 'auth/too-many-requests') {
                throw new Error('Demasiados intentos. Intenta más tarde.');
            }
            // BFF error
            if (error.response?.status === 400) {
                throw new Error(error.response?.data?.error?.message || 'Datos de login inválidos');
            }
            throw new Error(error.message || 'Error al iniciar sesión');
        }
    }

    async register(request: RegisterRequest): Promise<AuthResponse> {
        try {
            // 1. Create user in Firebase
            const credential = await createUserWithEmailAndPassword(auth, request.email, request.password);
            const idToken = await credential.user.getIdToken();

            // 2. Register in BFF with additional profile data
            const response = await api.post('/v1/auth/firebase-register', {
                idToken,
                firstName: request.firstName,
                lastName: request.lastName,
                rut: request.rut,
                phone: request.phone,
            });
            const data = response.data;

            localStorage.setItem('auth_token', idToken);

            return {
                success: true,
                token: idToken,
                user: data.user,
            };
        } catch (error: any) {
            const code = error?.code;
            if (code === 'auth/email-already-in-use') {
                throw new Error('Ya existe un usuario con este email');
            }
            if (code === 'auth/weak-password') {
                throw new Error('La contraseña debe tener al menos 6 caracteres');
            }
            if (error.response?.status === 400) {
                throw new Error(error.response?.data?.error?.message || 'Datos de registro inválidos');
            }
            throw new Error(error.message || 'Error al crear la cuenta');
        }
    }

    async checkEmailExists(email: string): Promise<boolean> {
        try {
            const response = await api.get(`/v1/auth/check-email?email=${encodeURIComponent(email)}`);
            return response.data;
        } catch (error: any) {
            return false;
        }
    }

    async logout() {
        try {
            await signOut(auth);
        } catch (e) {
            // Ignore Firebase signOut errors
        }
        localStorage.removeItem('auth_token');
        localStorage.removeItem('authenticated_user');
    }
}

export const authService = new AuthService();
