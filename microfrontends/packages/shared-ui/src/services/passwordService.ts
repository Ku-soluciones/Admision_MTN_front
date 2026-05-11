/**
 * Password Service - Firebase Auth Integration
 *
 * Cambio de contraseña usando Firebase Authentication.
 * El BFF no administra contraseñas; todo se maneja en Firebase Auth.
 */

import {
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  signInWithEmailAndPassword,
  AuthError
} from 'firebase/auth';
import { auth, hasFirebaseConfig } from '../src/lib/firebase';
import { authStore } from '../../../backend-sdk/src/auth/store';

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface ChangePasswordResponse {
  success: boolean;
  error?: string;
  errorCode?: string;
}

/**
 * Cambia la contraseña del usuario usando Firebase Auth.
 * Requiere reautenticación con la contraseña actual por seguridad.
 */
export async function changePassword(
  request: ChangePasswordRequest & { email?: string }
): Promise<ChangePasswordResponse> {
  try {
    // Verificar que Firebase esté configurado
    console.log('[PasswordService] Firebase config status:', hasFirebaseConfig);
    console.log('[PasswordService] Auth instance:', auth ? 'exists' : 'null');

    if (!hasFirebaseConfig || !auth) {
      console.error('[PasswordService] Firebase not configured');
      return {
        success: false,
        error: 'Firebase no está configurado correctamente. Contacte al administrador.',
        errorCode: 'FIREBASE_NOT_CONFIGURED'
      };
    }

    let user = auth.currentUser;
    let userEmail = user?.email;

    console.log('[PasswordService] Current Firebase user:', user ? 'exists' : 'null');
    console.log('[PasswordService] User email from Firebase:', userEmail || 'null');
    console.log('[PasswordService] Email from request:', request.email || 'null');

    // Si no hay usuario autenticado en Firebase, intentar obtener email
    if (!user || !userEmail) {
      // PRIORIDAD 1: Email del request (desde el modal que lee authStore)
      if (request.email) {
        userEmail = request.email;
        console.log('[PasswordService] Using email from request:', userEmail);
      } 
      
      // PRIORIDAD 2: Email del authStore (fuente de verdad)
      if (!userEmail) {
        const state = authStore.getState();
        if (state.user?.email) {
          userEmail = state.user.email;
          console.log('[PasswordService] Using email from authStore:', userEmail);
        }
      }
      
      // PRIORIDAD 3 (fallback): Buscar en localStorage
      if (!userEmail) {
        console.warn('[PasswordService] No email from request or authStore, trying localStorage...');
        const possibleKeys = [
          'admitia_auth_user',
          'admitia_current_professor',
          'authenticated_user',
          'currentProfessor',
          'professor_user',
          'authenticated_user__development',
          'authenticated_user__staging',
          'authenticated_user__production',
          'currentProfessor__development',
          'currentProfessor__staging',
          'currentProfessor__production',
        ];

        for (const key of possibleKeys) {
          try {
            const userData = localStorage.getItem(key);
            if (userData) {
              const parsed = JSON.parse(userData);
              if (parsed.email) {
                console.log('[PasswordService] Found email in localStorage key:', key, parsed.email);
                userEmail = parsed.email;
                break;
              }
            }
          } catch {
            // ignore and try next key
          }
        }
      }

      console.log('[PasswordService] Final userEmail:', userEmail);

      if (!userEmail) {
        console.error('[PasswordService] No user email found');
        return {
          success: false,
          error: 'No se pudo determinar el email del usuario. Por favor inicia sesión nuevamente.',
          errorCode: 'NOT_AUTHENTICATED'
        };
      }

      // Intentar autenticar en Firebase con el email y contraseña actual
      console.log('[PasswordService] Attempting Firebase signInWithEmailAndPassword...');
      try {
        const credential = await signInWithEmailAndPassword(auth, userEmail, request.currentPassword);
        user = credential.user;
        console.log('[PasswordService] Firebase signIn successful');
      } catch (signInError: any) {
        console.error('[PasswordService] Firebase signIn error:', signInError.code, signInError.message);
        const errorCode = signInError?.code || '';
        const errorMessage = signInError?.message || '';
        // Manejar códigos de error de Firebase Auth
        if (errorCode === 'auth/wrong-password' || 
            errorCode === 'auth/invalid-credential' ||
            errorCode === 'auth/invalid-login-credentials' ||
            errorMessage.includes('INVALID_LOGIN_CREDENTIALS')) {
          return {
            success: false,
            error: 'La contraseña actual es incorrecta. Verifica que estás ingresando la misma contraseña que usas para iniciar sesión en el sistema.',
            errorCode: 'WRONG_PASSWORD'
          };
        }
        // Si el usuario no existe en Firebase
        if (errorCode === 'auth/user-not-found' || errorMessage.includes('EMAIL_NOT_FOUND')) {
          return {
            success: false,
            error: 'El usuario no está registrado en el sistema de autenticación. Contacte al administrador.',
            errorCode: 'USER_NOT_FOUND'
          };
        }
        throw signInError;
      }
    }

    // Si tenemos usuario pero no está recién autenticado, reautenticar
    if (user && user.email) {
      try {
        const credential = EmailAuthProvider.credential(
          user.email,
          request.currentPassword
        );
        await reauthenticateWithCredential(user, credential);
      } catch (reauthError: any) {
        const errorCode = reauthError?.code || '';
        if (errorCode === 'auth/wrong-password' || errorCode === 'auth/invalid-credential') {
          return {
            success: false,
            error: 'La contraseña actual es incorrecta',
            errorCode: 'WRONG_PASSWORD'
          };
        }
        throw reauthError;
      }
    }

    // Cambiar la contraseña en Firebase Auth
    if (!user) {
      console.error('[PasswordService] No user after authentication');
      return {
        success: false,
        error: 'Error de autenticación. Por favor inicia sesión nuevamente.',
        errorCode: 'NOT_AUTHENTICATED'
      };
    }

    console.log('[PasswordService] Attempting to update password...');
    await updatePassword(user, request.newPassword);
    console.log('[PasswordService] Password updated successfully');

    return { success: true };
  } catch (error: any) {
    const errorCode = error?.code || '';
    const errorMessage = error?.message || 'Error desconocido';

    console.error('[PasswordService] Error changing password:', errorCode, errorMessage);
    console.error('[PasswordService] Full error:', error);

    // Mapear errores de Firebase a códigos internos
    if (errorCode === 'auth/requires-recent-login') {
      return {
        success: false,
        error: 'Por seguridad, debes cerrar sesión y volver a iniciar sesión antes de cambiar tu contraseña',
        errorCode: 'REQUIRES_RECENT_LOGIN'
      };
    }

    if (errorCode === 'auth/weak-password') {
      return {
        success: false,
        error: 'La nueva contraseña es demasiado débil. Debe tener al menos 6 caracteres',
        errorCode: 'WEAK_PASSWORD'
      };
    }

    if (errorCode === 'auth/invalid-credential' || errorCode === 'INVALID_LOGIN_CREDENTIALS') {
      return {
        success: false,
        error: 'La contraseña actual es incorrecta',
        errorCode: 'WRONG_PASSWORD'
      };
    }

    return {
      success: false,
      error: 'Error al cambiar la contraseña. Por favor intenta nuevamente.',
      errorCode: 'UNKNOWN_ERROR'
    };
  }
}

export interface PasswordStrength {
  score: number; // 0-100
  level: 'weak' | 'fair' | 'good' | 'strong';
  label: string;
  color: string;
}

/**
 * Evalúa la fortaleza de la contraseña y retorna un score detallado
 */
export function evaluatePasswordStrength(password: string): PasswordStrength {
  if (!password) {
    return { score: 0, level: 'weak', label: 'Muy débil', color: 'bg-red-500' };
  }

  let score = 0;
  let checks = {
    length: password.length >= 8,
    minLength: password.length >= 6,
    lowercase: /[a-z]/.test(password),
    uppercase: /[A-Z]/.test(password),
    numbers: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };

  // Puntuación base por longitud
  if (checks.minLength) score += 10;
  if (checks.length) score += 15;
  if (password.length >= 12) score += 10;

  // Puntuación por caracteres
  if (checks.lowercase) score += 15;
  if (checks.uppercase) score += 15;
  if (checks.numbers) score += 15;
  if (checks.special) score += 20;

  // Determinar nivel
  let level: PasswordStrength['level'];
  let label: string;
  let color: string;

  if (score < 25) {
    level = 'weak';
    label = 'Muy débil';
    color = 'bg-red-500';
  } else if (score < 50) {
    level = 'fair';
    label = 'Débil';
    color = 'bg-orange-500';
  } else if (score < 75) {
    level = 'good';
    label = 'Buena';
    color = 'bg-yellow-500';
  } else {
    level = 'strong';
    label = 'Muy segura';
    color = 'bg-green-500';
  }

  return { score, level, label, color };
}

/**
 * Valida la fortaleza de la contraseña
 */
export function validatePassword(password: string): string | null {
  if (!password || password.length < 6) {
    return 'La contraseña debe tener al menos 6 caracteres';
  }
  return null;
}

/**
 * Verifica que dos contraseñas coincidan
 */
export function passwordsMatch(password1: string, password2: string): boolean {
  return password1 === password2;
}

/**
 * Obtiene el mensaje de error legible para el usuario
 */
export function getErrorMessage(errorCode: string): string {
  const messages: Record<string, string> = {
    'NOT_AUTHENTICATED': 'No hay sesión activa. Por favor inicia sesión nuevamente.',
    'WRONG_PASSWORD': 'La contraseña actual es incorrecta. Verifica que estás ingresando la misma contraseña que usas para iniciar sesión en el sistema.',
    'USER_NOT_FOUND': 'El usuario no está registrado en el sistema de autenticación. Contacte al administrador.',
    'FIREBASE_NOT_CONFIGURED': 'Error de configuración del sistema. Contacte al administrador.',
    'REQUIRES_RECENT_LOGIN': 'Por seguridad, debes cerrar sesión y volver a iniciar sesión antes de cambiar tu contraseña',
    'WEAK_PASSWORD': 'La nueva contraseña es demasiado débil',
    'UNKNOWN_ERROR': 'Error al cambiar la contraseña. Por favor intenta nuevamente.'
  };

  return messages[errorCode] || 'Error al cambiar la contraseña';
}
