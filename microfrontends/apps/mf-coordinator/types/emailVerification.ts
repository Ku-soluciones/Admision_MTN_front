// Tipos para verificación de email - correspondientes con backend

// Enum de tipos de verificación (debe coincidir exactamente con backend)
export enum VerificationType {
  REGISTRATION = 'REGISTRATION',
  PASSWORD_RESET = 'PASSWORD_RESET'
}

// Interface para EmailVerification entity
export interface EmailVerification {
  id: number;
  email: string;
  code: string;
  type: VerificationType;
  expiresAt: string;
  createdAt: string;
  used: boolean;
  usedAt?: string;
}

// DTOs para requests
export interface EmailVerificationRequest {
  email: string;
  type: VerificationType;
  rut?: string;          // Opcional - para validar antes de enviar código
  firstName?: string;    // Opcional - para personalizar email
  lastName?: string;     // Opcional - para personalizar email
}

export interface VerifyCodeRequest {
  email: string;
  code: string;
}

// DTOs para responses
export interface EmailVerificationResponse {
  success: boolean;
  message: string;
  expiresInMinutes?: number;
}

export interface VerifyCodeResponse {
  success: boolean;
  message: string;
  isValid: boolean;
}

export interface CheckEmailResponse {
  exists: boolean;
}

// Labels para la UI
export const VERIFICATION_TYPE_LABELS: Record<VerificationType, string> = {
  [VerificationType.REGISTRATION]: 'Verificación de Registro',
  [VerificationType.PASSWORD_RESET]: 'Recuperación de Contraseña'
};

export const VERIFICATION_TYPE_DESCRIPTIONS: Record<VerificationType, string> = {
  [VerificationType.REGISTRATION]: 'Código para verificar tu email y completar el registro',
  [VerificationType.PASSWORD_RESET]: 'Código para restablecer tu contraseña de forma segura'
};

// Estados de verificación para UI
export enum VerificationStatus {
  IDLE = 'IDLE',
  SENDING = 'SENDING',
  SENT = 'SENT',
  VERIFYING = 'VERIFYING',
  VERIFIED = 'VERIFIED',
  ERROR = 'ERROR',
  EXPIRED = 'EXPIRED'
}

export const VERIFICATION_STATUS_LABELS: Record<VerificationStatus, string> = {
  [VerificationStatus.IDLE]: 'Sin verificar',
  [VerificationStatus.SENDING]: 'Enviando código...',
  [VerificationStatus.SENT]: 'Código enviado',
  [VerificationStatus.VERIFYING]: 'Verificando...',
  [VerificationStatus.VERIFIED]: 'Verificado',
  [VerificationStatus.ERROR]: 'Error',
  [VerificationStatus.EXPIRED]: 'Código expirado'
};

// Interface para el estado del componente de verificación
export interface VerificationState {
  status: VerificationStatus;
  email: string;
  code: string;
  expiresAt?: Date;
  error?: string;
  message?: string;
  canResend: boolean;
  resendCooldown: number;
}

// Constantes para validación
export const EMAIL_VERIFICATION_CONSTANTS = {
  CODE_LENGTH: 6,
  CODE_EXPIRY_MINUTES: 10,
  RESEND_COOLDOWN_SECONDS: 30,
  MAX_ATTEMPTS: 5
};

// Utilidades para email verification
export const EmailVerificationUtils = {
  // Validar email
  isValidEmail: (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  // Validar código
  isValidCode: (code: string): boolean => {
    const codeRegex = /^[0-9]{6}$/;
    return codeRegex.test(code);
  },

  // Formatear código para display (XXX-XXX)
  formatCodeDisplay: (code: string): string => {
    if (code.length >= 3) {
      return `${code.slice(0, 3)}-${code.slice(3)}`;
    }
    return code;
  },

  // Sanitizar código (solo números)
  sanitizeCode: (input: string): string => {
    return input.replace(/\D/g, '').slice(0, EMAIL_VERIFICATION_CONSTANTS.CODE_LENGTH);
  },

  // Verificar si el código está expirado
  isCodeExpired: (expiresAt: string | Date): boolean => {
    const expiryDate = typeof expiresAt === 'string' ? new Date(expiresAt) : expiresAt;
    return new Date() > expiryDate;
  },

  // Calcular tiempo restante para expiración
  getTimeToExpiry: (expiresAt: string | Date): {
    minutes: number;
    seconds: number;
    isExpired: boolean;
  } => {
    const expiryDate = typeof expiresAt === 'string' ? new Date(expiresAt) : expiresAt;
    const now = new Date();
    const diff = expiryDate.getTime() - now.getTime();

    if (diff <= 0) {
      return { minutes: 0, seconds: 0, isExpired: true };
    }

    const minutes = Math.floor(diff / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    return { minutes, seconds, isExpired: false };
  },

  // Formatear tiempo restante para mostrar
  formatTimeRemaining: (expiresAt: string | Date): string => {
    const { minutes, seconds, isExpired } = EmailVerificationUtils.getTimeToExpiry(expiresAt);
    
    if (isExpired) return 'Expirado';
    
    if (minutes > 0) {
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
    
    return `${seconds}s`;
  },

  // Obtener color del badge según estado
  getStatusColor: (status: VerificationStatus): 'primary' | 'success' | 'warning' | 'error' | 'info' => {
    switch (status) {
      case VerificationStatus.IDLE:
        return 'info';
      case VerificationStatus.SENDING:
      case VerificationStatus.VERIFYING:
        return 'primary';
      case VerificationStatus.SENT:
        return 'warning';
      case VerificationStatus.VERIFIED:
        return 'success';
      case VerificationStatus.ERROR:
      case VerificationStatus.EXPIRED:
        return 'error';
      default:
        return 'info';
    }
  },

  // Generar mensaje de estado
  getStatusMessage: (status: VerificationStatus, email?: string): string => {
    switch (status) {
      case VerificationStatus.IDLE:
        return 'Ingresa tu email para verificar';
      case VerificationStatus.SENDING:
        return 'Enviando código de verificación...';
      case VerificationStatus.SENT:
        return `Código enviado a ${email || 'tu email'}`;
      case VerificationStatus.VERIFYING:
        return 'Verificando código...';
      case VerificationStatus.VERIFIED:
        return '¡Email verificado exitosamente!';
      case VerificationStatus.ERROR:
        return 'Error en la verificación';
      case VerificationStatus.EXPIRED:
        return 'El código ha expirado';
      default:
        return '';
    }
  }
};

// Mensajes de error comunes
export const EMAIL_VERIFICATION_ERRORS = {
  INVALID_EMAIL: 'El formato del email no es válido',
  EMAIL_REQUIRED: 'El email es obligatorio',
  CODE_REQUIRED: 'El código de verificación es obligatorio',
  INVALID_CODE_FORMAT: 'El código debe tener 6 dígitos',
  CODE_EXPIRED: 'El código de verificación ha expirado',
  CODE_INVALID: 'El código de verificación no es válido',
  MAX_ATTEMPTS_EXCEEDED: 'Has excedido el número máximo de intentos',
  EMAIL_NOT_FOUND: 'No se encontró el email',
  NETWORK_ERROR: 'Error de conexión. Intenta nuevamente',
  SEND_FAILED: 'No se pudo enviar el código. Intenta nuevamente',
  VERIFY_FAILED: 'No se pudo verificar el código. Intenta nuevamente'
} as const;

// Mensajes de éxito
export const EMAIL_VERIFICATION_SUCCESS = {
  CODE_SENT: 'Código enviado exitosamente',
  CODE_VERIFIED: 'Email verificado exitosamente',
  CODE_RESENT: 'Nuevo código enviado'
} as const;

// Interface para componente de verificación completo
export interface EmailVerificationFormData {
  email: string;
  code: string;
  type: VerificationType;
}

// Props para componentes de verificación
export interface EmailVerificationProps {
  type: VerificationType;
  initialEmail?: string;
  onSuccess: (email: string) => void;
  onError?: (error: string) => void;
  onBack?: () => void;
  className?: string;
  disabled?: boolean;
}

export interface CodeVerificationProps {
  email: string;
  type: VerificationType;
  onSuccess: (email: string) => void;
  onError?: (error: string) => void;
  onResend?: () => void;
  onBack?: () => void;
  className?: string;
  disabled?: boolean;
}