import api from './api';
import {
  EmailVerificationRequest,
  EmailVerificationResponse,
  VerifyCodeRequest,
  VerifyCodeResponse,
  CheckEmailResponse,
  VerificationType,
  EmailVerification,
  EMAIL_VERIFICATION_CONSTANTS
} from '../types/emailVerification';

class EmailVerificationService {

  // ============= MÉTODOS PRINCIPALES =============

  /**
   * Enviar código de verificación por email
   */
  async sendVerificationCode(request: EmailVerificationRequest): Promise<EmailVerificationResponse> {
    try {
      console.log('Enviando código de verificación:', request);

      const response = await api.post('/v1/email/send-verification', request);
      
      console.log('Código enviado exitosamente');
      console.log('Response structure:', response.data);
      
      // Backend devuelve: { success: true, data: {...}, timestamp }
      // Extraer el contenido de data si existe, sino usar response.data directamente
      const responseData = response.data?.data || response.data;
      
      return {
        success: responseData.success !== false,
        message: responseData.message || 'Código enviado exitosamente',
        ...responseData
      };

    } catch (error: any) {
      console.error('Error enviando código de verificación:', error);
      console.error('Error response data:', error.response?.data);

      // Extraer mensaje de error desde diferentes estructuras posibles
      let errorMessage = 'Error al enviar el código de verificación';

      if (error.response?.data) {
        // Backend puede devolver: { success: false, error: { code: 'EMAIL_008', message: '...' } }
        // O también: { success: false, data: { message: '...' } }
        errorMessage = error.response.data.error?.message ||
                      error.response.data.data?.message ||
                      error.response.data.message ||
                      error.message ||
                      errorMessage;
      } else {
        errorMessage = error.message || errorMessage;
      }

      return {
        success: false,
        message: errorMessage
      };
    }
  }

  /**
   * Verificar código de verificación
   */
  async verifyCode(request: VerifyCodeRequest): Promise<VerifyCodeResponse> {
    try {
      console.log('Verificando código:', { email: request.email, code: '***' });

      const response = await api.post('/v1/email/verify-code', request);
      
      console.log('Código verificado exitosamente');
      console.log('Response structure:', response.data);
      
      // Backend devuelve: { success: true, data: { isValid, verified, email }, timestamp }
      // Extraer el contenido de data si existe
      const responseData = response.data?.data || response.data;
      
      return {
        success: responseData.success !== false,
        message: responseData.message || 'Código verificado exitosamente',
        isValid: responseData.isValid || responseData.verified || false
      };

    } catch (error: any) {
      console.error('Error verificando código:', error);
      console.error('Error response:', error.response?.data);
      
      const errorData = error.response?.data?.error || error.response?.data;
      const errorMessage = errorData?.message || 
                          error.message || 
                          'Error al verificar el código';

      return {
        success: false,
        message: errorMessage,
        isValid: false
      };
    }
  }

  /**
   * Verificar si un email ya existe en el sistema
   */
  async checkEmailExists(email: string): Promise<any> {
    try {
      console.log('🔎 Verificando si email existe:', email);

      const response = await api.get('/v1/email/check-exists', {
        params: { email }
      });

      return response.data;

    } catch (error: any) {
      console.error('Error verificando email (backend may be down):', error);
      // Return null to indicate check failed rather than false
      return null;
    }
  }

  /**
   * Verificar si un RUT ya existe en el sistema
   */
  async checkRutExists(rut: string): Promise<any> {
    try {
      console.log('🔎 Verificando si RUT existe:', rut);

      const response = await api.get('/v1/users/check-rut', {
        params: { rut }
      });

      return response.data;

    } catch (error: any) {
      console.error('Error verificando RUT (backend may be down):', error);
      // Return null to indicate check failed rather than false
      return null;
    }
  }

  /**
   * Obtener último código para desarrollo (solo desarrollo)
   */
  async getLastCodeForDevelopment(email: string): Promise<string | null> {
    try {
      console.warn('🚧 Obteniendo código para desarrollo:', email);

      const response = await api.get('/v1/email/get-last-code', {
        params: { email }
      });
      
      // Extraer solo el código de la respuesta
      const responseText = response.data as string;
      const codeMatch = responseText.match(/: (\d{6})/);
      
      return codeMatch ? codeMatch[1] : null;

    } catch (error: any) {
      console.error('Error obteniendo código para desarrollo:', error);
      return null;
    }
  }

  // ============= MÉTODOS DE CONVENIENCIA =============

  /**
   * Enviar código de verificación para registro
   */
  async sendRegistrationCode(email: string): Promise<EmailVerificationResponse> {
    return this.sendVerificationCode({
      email,
      type: VerificationType.REGISTRATION
    });
  }

  /**
   * Enviar código de verificación para recuperar contraseña
   */
  async sendPasswordResetCode(email: string): Promise<EmailVerificationResponse> {
    return this.sendVerificationCode({
      email,
      type: VerificationType.PASSWORD_RESET
    });
  }

  /**
   * Verificar código de registro
   */
  async verifyRegistrationCode(email: string, code: string): Promise<VerifyCodeResponse> {
    return this.verifyCode({ email, code });
  }

  /**
   * Verificar código de recuperación de contraseña
   */
  async verifyPasswordResetCode(email: string, code: string): Promise<VerifyCodeResponse> {
    return this.verifyCode({ email, code });
  }

  // ============= UTILIDADES DE VALIDACIÓN =============

  /**
   * Validar formato de email básico
   */
  isValidEmailFormat(email: string): boolean {
    if (!email || typeof email !== 'string') return false;
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  }

  /**
   * Validar email antes de enviar
   */
  validateEmailForSending(email: string): { isValid: boolean; error?: string } {
    if (!email || email.trim() === '') {
      return {
        isValid: false,
        error: 'El email es obligatorio'
      };
    }

    if (!this.isValidEmailFormat(email)) {
      return {
        isValid: false,
        error: 'El formato del email no es válido'
      };
    }

    return { isValid: true };
  }

  /**
   * Validar código antes de verificar
   */
  validateCodeForVerification(code: string): { isValid: boolean; error?: string } {
    if (!code || code.trim() === '') {
      return {
        isValid: false,
        error: 'El código de verificación es obligatorio'
      };
    }

    const sanitizedCode = code.replace(/\D/g, '');
    if (sanitizedCode.length !== EMAIL_VERIFICATION_CONSTANTS.CODE_LENGTH) {
      return {
        isValid: false,
        error: `El código debe tener ${EMAIL_VERIFICATION_CONSTANTS.CODE_LENGTH} dígitos`
      };
    }

    return { isValid: true };
  }

  /**
   * Validar si el email pertenece a un dominio permitido para apoderados
   */
  isValidParentEmail(email: string): boolean {
    if (!this.validateEmailForSending(email).isValid) {
      return false;
    }

    // Dominios no permitidos para apoderados (institucionales)
    // NOTA: @mtn.cl permitido temporalmente para pruebas
    const institutionalDomains: string[] = [];
    const emailLower = email.toLowerCase();

    return !institutionalDomains.some(domain => emailLower.includes(domain));
  }

  /**
   * Validar si el email es institucional (para profesores/admin)
   */
  isInstitutionalEmail(email: string): boolean {
    if (!this.validateEmailForSending(email).isValid) {
      return false;
    }
    
    return email.toLowerCase().includes('@mtn.cl');
  }

  // ============= UTILIDADES DE ESTADO =============

  /**
   * Obtener cooldown de reenvío para un email
   */
  getResendCooldownSeconds(email: string): number {
    const key = `resend_cooldown_${email}`;
    const stored = localStorage.getItem(key);
    
    if (!stored) return 0;
    
    const storedTime = parseInt(stored);
    const now = Date.now();
    const elapsed = Math.floor((now - storedTime) / 1000);
    
    const remainingCooldown = EMAIL_VERIFICATION_CONSTANTS.RESEND_COOLDOWN_SECONDS - elapsed;
    return Math.max(0, remainingCooldown);
  }

  /**
   * Almacenar información de verificación para UI
   */
  storeVerificationInfo(email: string, expiresAt: string): void {
    localStorage.setItem(`verification_${email}`, JSON.stringify({
      email,
      expiresAt,
      sentAt: new Date().toISOString()
    }));
    
    // Almacenar tiempo de último envío para cooldown
    localStorage.setItem(`resend_cooldown_${email}`, Date.now().toString());
  }

  /**
   * Limpiar datos de verificación almacenados
   */
  clearStoredVerificationData(email: string): void {
    localStorage.removeItem(`verification_${email}`);
    localStorage.removeItem(`resend_cooldown_${email}`);
  }

  /**
   * Obtener información de verificación almacenada
   */
  getStoredVerificationInfo(email: string): { email: string; expiresAt: string; sentAt: string } | null {
    const stored = localStorage.getItem(`verification_${email}`);
    return stored ? JSON.parse(stored) : null;
  }

  // ============= SIMULACIÓN PARA DESARROLLO =============

  /**
   * Simular envío de código (para desarrollo sin backend)
   */
  async mockSendVerificationCode(request: EmailVerificationRequest): Promise<EmailVerificationResponse> {
    console.log('Mock: Simulando envío de código', request);
    
    // Simular delay de red
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Simular algunos casos de error
    if (request.email === 'error@test.com') {
      return {
        success: false,
        message: 'Error simulado: Email no válido'
      };
    }

    return {
      success: true,
      message: `Código enviado a ${request.email}`,
      expiresInMinutes: EMAIL_VERIFICATION_CONSTANTS.CODE_EXPIRY_MINUTES
    };
  }

  /**
   * Simular verificación de código (para desarrollo sin backend)
   */
  async mockVerifyCode(request: VerifyCodeRequest): Promise<VerifyCodeResponse> {
    console.log('Mock: Simulando verificación de código', {
      email: request.email, 
      code: '***' 
    });
    
    // Simular delay de red
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Código mock válido
    const validCodes = ['123456', '000000'];
    
    if (validCodes.includes(request.code)) {
      return {
        success: true,
        message: 'Código verificado exitosamente',
        isValid: true
      };
    }

    return {
      success: false,
      message: 'Código de verificación incorrecto',
      isValid: false
    };
  }
}

export const emailVerificationService = new EmailVerificationService();