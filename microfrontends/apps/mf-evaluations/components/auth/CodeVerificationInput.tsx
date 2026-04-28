import React, { useState, useEffect, useRef } from 'react';
import Button from '../ui/Button';
import LoadingSpinner from '../ui/LoadingSpinner';
import {
  VerificationType,
  EmailVerificationUtils,
  CodeVerificationProps,
  EMAIL_VERIFICATION_CONSTANTS
} from '../../types/emailVerification';
import { emailVerificationService } from '../../services/emailVerificationService';
import { 
  CheckCircleIcon, 
  ExclamationTriangleIcon, 
  ArrowLeftIcon,
  ClockIcon
} from '../icons/Icons';

const CodeVerificationInput: React.FC<CodeVerificationProps> = ({
  email,
  type,
  onSuccess,
  onError,
  onResend,
  onBack,
  className = '',
  disabled = false
}) => {
  const [code, setCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(EMAIL_VERIFICATION_CONSTANTS.CODE_EXPIRY_MINUTES * 60);
  const [canResend, setCanResend] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  
  useEffect(() => {
    // Focus en el primer input
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }

    // Inicializar temporizadores
    const expiryTimer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(expiryTimer);
          setError('El código ha expirado. Solicita un nuevo código.');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Inicializar cooldown de reenvío
    const initialCooldown = emailVerificationService.getResendCooldownSeconds(email);
    if (initialCooldown > 0) {
      setResendCooldown(initialCooldown);
      const resendTimer = setInterval(() => {
        setResendCooldown(prev => {
          if (prev <= 1) {
            clearInterval(resendTimer);
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      setCanResend(true);
    }

    return () => {
      clearInterval(expiryTimer);
    };
  }, [email]);

  const handleCodeChange = (value: string, index: number) => {
    // Solo permitir números
    if (!/^\d*$/.test(value)) return;

    const newCode = code.split('');
    newCode[index] = value;
    
    const updatedCode = newCode.join('');
    setCode(updatedCode);
    setError(null);

    // Auto-focus al siguiente input
    if (value && index < EMAIL_VERIFICATION_CONSTANTS.CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-verificar cuando se complete el código
    if (updatedCode.length === EMAIL_VERIFICATION_CONSTANTS.CODE_LENGTH && !isVerifying) {
      handleVerifyCode(updatedCode);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    // Backspace: limpiar input actual y mover al anterior
    if (e.key === 'Backspace') {
      if (!code[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    }
    // Flecha izquierda/derecha para navegación
    else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    else if (e.key === 'ArrowRight' && index < EMAIL_VERIFICATION_CONSTANTS.CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
    // Enter para verificar
    else if (e.key === 'Enter' && code.length === EMAIL_VERIFICATION_CONSTANTS.CODE_LENGTH) {
      handleVerifyCode();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, EMAIL_VERIFICATION_CONSTANTS.CODE_LENGTH);
    
    if (pastedText.length > 0) {
      setCode(pastedText);
      setError(null);
      
      // Focus en el último input completado o el siguiente vacío
      const focusIndex = Math.min(pastedText.length - 1, EMAIL_VERIFICATION_CONSTANTS.CODE_LENGTH - 1);
      inputRefs.current[focusIndex]?.focus();
      
      // Auto-verificar si se pegó un código completo
      if (pastedText.length === EMAIL_VERIFICATION_CONSTANTS.CODE_LENGTH) {
        handleVerifyCode(pastedText);
      }
    }
  };

  const handleVerifyCode = async (codeToVerify?: string) => {
    const finalCode = codeToVerify || code;
    
    if (finalCode.length !== EMAIL_VERIFICATION_CONSTANTS.CODE_LENGTH) {
      setError(`El código debe tener ${EMAIL_VERIFICATION_CONSTANTS.CODE_LENGTH} dígitos`);
      return;
    }

    if (timeRemaining <= 0) {
      setError('El código ha expirado. Solicita un nuevo código.');
      return;
    }

    try {
      setIsVerifying(true);
      setError(null);

      const response = await emailVerificationService.verifyCode({
        email,
        code: finalCode
      });

      if (response.success && response.isValid) {
        onSuccess(email);
      } else {
        setError(response.message || 'Código incorrecto. Inténtalo nuevamente.');
      }

    } catch (error: any) {
      setError(error.message || 'Error al verificar el código');
      onError?.(error.message);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (!canResend || resendCooldown > 0) return;

    try {
      setCanResend(false);
      setResendCooldown(EMAIL_VERIFICATION_CONSTANTS.RESEND_COOLDOWN_SECONDS);
      setCode('');
      setError(null);
      setTimeRemaining(EMAIL_VERIFICATION_CONSTANTS.CODE_EXPIRY_MINUTES * 60);
      
      // Reiniciar cooldown
      const resendTimer = setInterval(() => {
        setResendCooldown(prev => {
          if (prev <= 1) {
            clearInterval(resendTimer);
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      // Focus en primer input
      if (inputRefs.current[0]) {
        inputRefs.current[0].focus();
      }

      onResend?.();

    } catch (error: any) {
      setError(error.message || 'Error al reenviar el código');
      setCanResend(true);
      setResendCooldown(0);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimeColor = (): string => {
    if (timeRemaining <= 60) return 'text-red-600';
    if (timeRemaining <= 180) return 'text-orange-600';
    return 'text-gray-600';
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="text-center space-y-2">
        <h3 className="text-lg font-semibold text-azul-monte-tabor">
          Verifica tu código
        </h3>
        <p className="text-gray-600">
          Hemos enviado un código de 6 dígitos a:
        </p>
        <p className="font-medium text-azul-monte-tabor">{email}</p>
      </div>

      {/* Contador de tiempo */}
      <div className="text-center">
        <div className={`inline-flex items-center gap-2 ${getTimeColor()}`}>
          <ClockIcon className="w-4 h-4" />
          <span className="text-sm font-medium">
            Expira en: {formatTime(timeRemaining)}
          </span>
        </div>
      </div>

      {/* Inputs del código */}
      <div className="space-y-4">
        <div className="flex justify-center space-x-2">
          {Array.from({ length: EMAIL_VERIFICATION_CONSTANTS.CODE_LENGTH }).map((_, index) => (
            <input
              key={index}
              ref={el => inputRefs.current[index] = el}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={1}
              value={code[index] || ''}
              onChange={(e) => handleCodeChange(e.target.value, index)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              onPaste={index === 0 ? handlePaste : undefined}
              className={`
                w-12 h-12 text-center text-xl font-mono font-bold border rounded-lg
                focus:outline-none focus:ring-2 focus:ring-azul-monte-tabor focus:border-transparent
                transition-colors
                ${error ? 'border-red-300 bg-red-50' : 'border-gray-300 bg-white hover:border-gray-400'}
                ${disabled || isVerifying ? 'opacity-50 cursor-not-allowed' : ''}
              `}
              disabled={disabled || isVerifying || timeRemaining <= 0}
            />
          ))}
        </div>

        {/* Estados de carga */}
        {isVerifying && (
          <div className="flex items-center justify-center gap-2 text-blue-600">
            <LoadingSpinner size="sm" />
            <span className="text-sm">Verificando código...</span>
          </div>
        )}
      </div>

      {/* Mensaje de error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Botones de acción */}
      <div className="space-y-3">
        {/* Botón de verificación manual */}
        {code.length === EMAIL_VERIFICATION_CONSTANTS.CODE_LENGTH && !isVerifying && (
          <Button
            onClick={() => handleVerifyCode()}
            disabled={disabled || timeRemaining <= 0}
            className="w-full"
          >
            <CheckCircleIcon className="w-5 h-5 mr-2" />
            Verificar Código
          </Button>
        )}

        {/* Botón de reenvío */}
        <Button
          variant="outline"
          onClick={handleResend}
          disabled={disabled || !canResend || resendCooldown > 0 || isVerifying}
          className="w-full"
        >
          {canResend && resendCooldown === 0 ? (
            'Reenviar Código'
          ) : (
            `Reenviar en ${resendCooldown}s`
          )}
        </Button>

        {/* Botón de retroceso */}
        {onBack && (
          <Button
            variant="outline"
            size="sm"
            onClick={onBack}
            disabled={disabled || isVerifying}
            className="w-full"
          >
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            Cambiar Email
          </Button>
        )}
      </div>

      {/* Instrucciones */}
      <div className="text-center text-sm text-gray-500 space-y-1">
        <p>¿No recibiste el código?</p>
        <p>Revisa tu carpeta de spam o correo no deseado</p>
      </div>
    </div>
  );
};

export default CodeVerificationInput;