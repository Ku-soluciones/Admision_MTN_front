import React, { useState, useCallback } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import LoadingSpinner from '../ui/LoadingSpinner';
import {
  VerificationType,
  VerificationStatus,
  VerificationState,
  EmailVerificationUtils,
  VERIFICATION_TYPE_LABELS,
  VERIFICATION_TYPE_DESCRIPTIONS,
  EMAIL_VERIFICATION_ERRORS,
  EMAIL_VERIFICATION_SUCCESS,
  EmailVerificationProps
} from '../../types/emailVerification';
import { emailVerificationService } from '../../services/emailVerificationService';
import { 
  EnvelopeIcon, 
  ExclamationTriangleIcon, 
  CheckCircleIcon, 
  ArrowLeftIcon,
  InformationCircleIcon
} from '../icons/Icons';

const EmailVerificationForm: React.FC<EmailVerificationProps> = ({
  type,
  initialEmail = '',
  onSuccess,
  onError,
  onBack,
  className = '',
  disabled = false
}) => {
  const [verificationState, setVerificationState] = useState<VerificationState>({
    status: VerificationStatus.IDLE,
    email: initialEmail,
    code: '',
    canResend: false,
    resendCooldown: 0
  });

  const updateVerificationState = useCallback((updates: Partial<VerificationState>) => {
    setVerificationState(prev => ({ ...prev, ...updates }));
  }, []);

  const handleEmailChange = (email: string) => {
    updateVerificationState({ 
      email: email.trim().toLowerCase(),
      error: undefined 
    });
  };

  const handleCodeChange = (rawCode: string) => {
    const sanitizedCode = EmailVerificationUtils.sanitizeCode(rawCode);
    updateVerificationState({ 
      code: sanitizedCode,
      error: undefined 
    });
  };

  const validateAndSendCode = async () => {
    const { email } = verificationState;
    
    // Validar email
    if (!EmailVerificationUtils.isValidEmail(email)) {
      updateVerificationState({
        error: EMAIL_VERIFICATION_ERRORS.INVALID_EMAIL,
        status: VerificationStatus.ERROR
      });
      onError?.(EMAIL_VERIFICATION_ERRORS.INVALID_EMAIL);
      return;
    }

    // Validar dominio si es para apoderados
    if (type === VerificationType.REGISTRATION && !emailVerificationService.isValidParentEmail(email)) {
      const error = 'Este email no es válido para registro de apoderados';
      updateVerificationState({
        error,
        status: VerificationStatus.ERROR
      });
      onError?.(error);
      return;
    }

    try {
      updateVerificationState({ status: VerificationStatus.SENDING });

      const response = await emailVerificationService.sendVerificationCode({
        email,
        type
      });

      if (response.success) {
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + (response.expiresInMinutes || 10));

        updateVerificationState({
          status: VerificationStatus.SENT,
          message: response.message,
          expiresAt,
          canResend: false,
          resendCooldown: 30
        });

        // Iniciar temporizador de cooldown
        startResendCooldown();
        
        // Almacenar información para UI
        emailVerificationService.storeVerificationInfo(email, expiresAt.toISOString());

      } else {
        updateVerificationState({
          status: VerificationStatus.ERROR,
          error: response.message
        });
        onError?.(response.message);
      }

    } catch (error: any) {
      const errorMessage = error.message || EMAIL_VERIFICATION_ERRORS.SEND_FAILED;
      updateVerificationState({
        status: VerificationStatus.ERROR,
        error: errorMessage
      });
      onError?.(errorMessage);
    }
  };

  const validateAndVerifyCode = async () => {
    const { email, code } = verificationState;

    // Validar código
    if (!EmailVerificationUtils.isValidCode(code)) {
      updateVerificationState({
        error: EMAIL_VERIFICATION_ERRORS.INVALID_CODE_FORMAT,
        status: VerificationStatus.ERROR
      });
      return;
    }

    try {
      updateVerificationState({ status: VerificationStatus.VERIFYING });

      const response = await emailVerificationService.verifyCode({
        email,
        code
      });

      if (response.success && response.isValid) {
        updateVerificationState({
          status: VerificationStatus.VERIFIED,
          message: EMAIL_VERIFICATION_SUCCESS.CODE_VERIFIED
        });

        // Limpiar datos almacenados
        emailVerificationService.clearStoredVerificationData(email);
        
        onSuccess(email);

      } else {
        updateVerificationState({
          status: VerificationStatus.ERROR,
          error: response.message
        });
      }

    } catch (error: any) {
      const errorMessage = error.message || EMAIL_VERIFICATION_ERRORS.VERIFY_FAILED;
      updateVerificationState({
        status: VerificationStatus.ERROR,
        error: errorMessage
      });
    }
  };

  const startResendCooldown = () => {
    const interval = setInterval(() => {
      setVerificationState(prev => {
        const newCooldown = prev.resendCooldown - 1;
        if (newCooldown <= 0) {
          clearInterval(interval);
          return { ...prev, canResend: true, resendCooldown: 0 };
        }
        return { ...prev, resendCooldown: newCooldown };
      });
    }, 1000);
  };

  const handleResendCode = async () => {
    if (!verificationState.canResend) return;
    
    updateVerificationState({ 
      code: '', 
      error: undefined,
      canResend: false,
      resendCooldown: 30
    });
    
    await validateAndSendCode();
  };

  const getStatusIcon = () => {
    switch (verificationState.status) {
      case VerificationStatus.SENDING:
      case VerificationStatus.VERIFYING:
        return <LoadingSpinner size="sm" />;
      case VerificationStatus.SENT:
        return <EnvelopeIcon className="w-5 h-5 text-blue-500" />;
      case VerificationStatus.VERIFIED:
        return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
      case VerificationStatus.ERROR:
        return <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />;
      default:
        return <EnvelopeIcon className="w-5 h-5 text-gray-400" />;
    }
  };

  const showCodeInput = [
    VerificationStatus.SENT,
    VerificationStatus.VERIFYING,
    VerificationStatus.ERROR
  ].includes(verificationState.status) && verificationState.status !== VerificationStatus.VERIFIED;

  const showEmailInput = !showCodeInput && verificationState.status !== VerificationStatus.VERIFIED;

  return (
    <div className={`space-y-6 ${className}`}>
      <Card className={`p-6 ${disabled ? 'opacity-50' : ''}`}>
        <div className="space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-3">
              {getStatusIcon()}
              <h2 className="text-xl font-semibold text-azul-monte-tabor">
                {VERIFICATION_TYPE_LABELS[type]}
              </h2>
            </div>
            <p className="text-gray-600">
              {VERIFICATION_TYPE_DESCRIPTIONS[type]}
            </p>
            
            {/* Estado actual */}
            <Badge variant={EmailVerificationUtils.getStatusColor(verificationState.status)}>
              {EmailVerificationUtils.getStatusMessage(verificationState.status, verificationState.email)}
            </Badge>
          </div>

          {/* Formulario de Email */}
          {showEmailInput && (
            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Correo Electrónico
                </label>
                <input
                  id="email"
                  type="email"
                  value={verificationState.email}
                  onChange={(e) => handleEmailChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-azul-monte-tabor focus:border-transparent"
                  placeholder="ejemplo@correo.com"
                  disabled={disabled || verificationState.status === VerificationStatus.SENDING}
                />
              </div>

              <Button
                onClick={validateAndSendCode}
                disabled={
                  disabled || 
                  !verificationState.email || 
                  verificationState.status === VerificationStatus.SENDING
                }
                className="w-full"
              >
                {verificationState.status === VerificationStatus.SENDING ? (
                  <>
                    <LoadingSpinner size="sm" />
                    <span className="ml-2">Enviando código...</span>
                  </>
                ) : (
                  'Enviar Código de Verificación'
                )}
              </Button>
            </div>
          )}

          {/* Formulario de Código */}
          {showCodeInput && (
            <div className="space-y-4">
              {/* Información del email */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <InformationCircleIcon className="w-5 h-5 text-blue-600" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium">Código enviado a:</p>
                    <p>{verificationState.email}</p>
                    {verificationState.expiresAt && (
                      <p className="text-blue-600 mt-1">
                        Expira en: {EmailVerificationUtils.formatTimeRemaining(verificationState.expiresAt)}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-2">
                  Código de Verificación (6 dígitos)
                </label>
                <input
                  id="code"
                  type="text"
                  value={EmailVerificationUtils.formatCodeDisplay(verificationState.code)}
                  onChange={(e) => handleCodeChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-azul-monte-tabor focus:border-transparent text-center text-lg font-mono tracking-widest"
                  placeholder="000-000"
                  maxLength={7} // 6 dígitos + 1 guión
                  disabled={disabled || verificationState.status === VerificationStatus.VERIFYING}
                />
              </div>

              <div className="flex space-x-3">
                <Button
                  variant="outline"
                  onClick={handleResendCode}
                  disabled={
                    disabled || 
                    !verificationState.canResend || 
                    verificationState.status === VerificationStatus.VERIFYING
                  }
                  className="flex-1"
                >
                  {verificationState.canResend ? (
                    'Reenviar Código'
                  ) : (
                    `Reenviar (${verificationState.resendCooldown}s)`
                  )}
                </Button>

                <Button
                  onClick={validateAndVerifyCode}
                  disabled={
                    disabled || 
                    verificationState.code.length !== 6 || 
                    verificationState.status === VerificationStatus.VERIFYING
                  }
                  className="flex-1"
                >
                  {verificationState.status === VerificationStatus.VERIFYING ? (
                    <>
                      <LoadingSpinner size="sm" />
                      <span className="ml-2">Verificando...</span>
                    </>
                  ) : (
                    'Verificar Código'
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Mensaje de error */}
          {verificationState.error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />
                <p className="text-red-700">{verificationState.error}</p>
              </div>
            </div>
          )}

          {/* Mensaje de éxito */}
          {verificationState.status === VerificationStatus.VERIFIED && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <CheckCircleIcon className="w-5 h-5 text-green-600" />
                <p className="text-green-700">
                  {verificationState.message || EMAIL_VERIFICATION_SUCCESS.CODE_VERIFIED}
                </p>
              </div>
            </div>
          )}

          {/* Botón de retroceso */}
          {onBack && (
            <div className="flex justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={onBack}
                disabled={disabled}
              >
                <ArrowLeftIcon className="w-4 h-4 mr-2" />
                Volver
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* Instrucciones adicionales */}
      <Card className="p-4 bg-gray-50">
        <div className="text-sm text-gray-600 space-y-2">
          <h4 className="font-medium text-gray-800">Instrucciones:</h4>
          <ul className="list-disc list-inside space-y-1">
            <li>Revisa tu bandeja de entrada y carpeta de spam</li>
            <li>El código expira en 10 minutos</li>
            <li>Puedes solicitar un nuevo código después de 30 segundos</li>
            {type === VerificationType.REGISTRATION && (
              <li>No uses emails institucionales (@mtn.cl) para registro de apoderados</li>
            )}
          </ul>
        </div>
      </Card>
    </div>
  );
};

export default EmailVerificationForm;