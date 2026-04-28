/**
 * Password Management Service
 *
 * Provides methods for:
 * - Self-service password change (all users)
 * - Admin password reset (admin only)
 */

import apiClient from './http';

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface ResetPasswordRequest {
  newPassword: string;
}

export interface PasswordResponse {
  success: boolean;
  message: string;
  errorCode?: string;
  error?: string;
  details?: any;
}

/**
 * Change current user's password
 * Requires current password validation
 */
export const changePassword = async (data: ChangePasswordRequest): Promise<PasswordResponse> => {
  try {
    const response = await apiClient.put<PasswordResponse>('/v1/auth/change-password', data);
    return response.data;
  } catch (error: any) {
    if (error.response?.data) {
      return error.response.data;
    }
    return {
      success: false,
      message: 'Error al cambiar la contraseña',
      error: error.message
    };
  }
};

/**
 * Admin: Reset any user's password
 * Only accessible by ADMIN role
 */
export const resetUserPassword = async (
  userId: number,
  data: ResetPasswordRequest
): Promise<PasswordResponse> => {
  try {
    const response = await apiClient.put<PasswordResponse>(
      `/v1/users/${userId}/reset-password`,
      data
    );
    return response.data;
  } catch (error: any) {
    if (error.response?.data) {
      return error.response.data;
    }
    return {
      success: false,
      message: 'Error al restablecer la contraseña',
      error: error.message
    };
  }
};

/**
 * Validate password strength
 * Returns error message if invalid, null if valid
 */
export const validatePassword = (password: string): string | null => {
  if (!password) {
    return 'La contraseña es requerida';
  }

  if (password.length < 6) {
    return 'La contraseña debe tener al menos 6 caracteres';
  }

  // Optional: Add more validation rules
  // if (!/[A-Z]/.test(password)) {
  //   return 'La contraseña debe contener al menos una letra mayúscula';
  // }

  // if (!/[a-z]/.test(password)) {
  //   return 'La contraseña debe contener al menos una letra minúscula';
  // }

  // if (!/[0-9]/.test(password)) {
  //   return 'La contraseña debe contener al menos un número';
  // }

  return null;
};

/**
 * Check if two passwords match
 */
export const passwordsMatch = (password: string, confirmPassword: string): boolean => {
  return password === confirmPassword;
};

/**
 * Get user-friendly error message from error code
 */
export const getErrorMessage = (errorCode?: string): string => {
  const errorMessages: Record<string, string> = {
    // Self-service errors
    'PWD_001': 'Se requiere contraseña actual y nueva contraseña',
    'PWD_002': 'La nueva contraseña debe tener al menos 6 caracteres',
    'PWD_003': 'La nueva contraseña debe ser diferente a la actual',
    'PWD_004': 'Usuario no encontrado',
    'PWD_005': 'La contraseña actual es incorrecta',
    'PWD_006': 'Error al cambiar la contraseña',

    // Admin errors
    'PWD_ADMIN_001': 'Solo los administradores pueden resetear contraseñas',
    'PWD_ADMIN_002': 'Se requiere nueva contraseña',
    'PWD_ADMIN_003': 'La nueva contraseña debe tener al menos 6 caracteres',
    'PWD_ADMIN_004': 'Usuario no encontrado',
    'PWD_ADMIN_005': 'Error al restablecer la contraseña'
  };

  return errorMessages[errorCode || ''] || 'Error desconocido';
};

export default {
  changePassword,
  resetUserPassword,
  validatePassword,
  passwordsMatch,
  getErrorMessage
};
