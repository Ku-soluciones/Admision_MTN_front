import React, { useState, useEffect, useCallback } from 'react';
import Input from './Input';
import Button from './Button';
import { useEmailVerification } from '../../hooks/useEmailVerification';

interface EmailVerificationProps {
    email: string;
    onEmailChange: (email: string) => void;
    onVerificationComplete: (isVerified: boolean) => void;
    rut?: string;  // RUT para validación previa
    isRequired?: boolean;
    placeholder?: string;
    className?: string;
}

const EmailVerification: React.FC<EmailVerificationProps> = ({
    email,
    onEmailChange,
    onVerificationComplete,
    rut,
    isRequired = true,
    placeholder = "correo@ejemplo.com",
    className = ""
}) => {
    const [verificationCode, setVerificationCode] = useState('');
    const [emailTouched, setEmailTouched] = useState(false);
    const [lastNotifiedStatus, setLastNotifiedStatus] = useState<boolean | null>(null);
    
    const {
        isLoading,
        verificationSent,
        verificationError,
        isCodeValid,
        timeRemaining,
        timeRemainingMinutes,
        canResend,
        sendVerificationCode,
        verifyCode,
        resendCode,
        reset,
        validateEmailFormat,
        validateParentEmail
    } = useEmailVerification();

    // Notificar al componente padre cuando se complete la verificación - solo una vez por cambio
    const notifyVerificationComplete = useCallback((isVerified: boolean) => {
        if (lastNotifiedStatus !== isVerified) {
            setLastNotifiedStatus(isVerified);
            onVerificationComplete(isVerified);
        }
    }, [onVerificationComplete, lastNotifiedStatus]);

    useEffect(() => {
        const currentStatus = isCodeValid === true;
        notifyVerificationComplete(currentStatus);
    }, [isCodeValid, notifyVerificationComplete]);

    // Validaciones del email
    const getEmailError = (): string => {
        if (!emailTouched || !email) return '';

        if (!validateEmailFormat(email)) {
            return 'Formato de email inválido';
        }

        // NOTA: Validación de email institucional deshabilitada temporalmente para pruebas
        // if (!validateParentEmail(email)) {
        //     return 'No puede usar un email institucional (@mtn.cl) para registro de apoderado';
        // }

        return '';
    };

    const emailError = getEmailError();
    const isEmailValid = email && !emailError;

    // Manejar envío de código
    const handleSendCode = async () => {
        if (!isEmailValid) return;

        try {
            await sendVerificationCode(email, 'registration', rut);
        } catch (error) {
            // El error ya se maneja en el hook
        }
    };

    // Manejar verificación de código
    const handleVerifyCode = async () => {
        if (!verificationCode || verificationCode.length !== 6) {
            return;
        }
        
        try {
            await verifyCode(email, verificationCode);
        } catch (error) {
            // El error ya se maneja en el hook
        }
    };

    // Manejar reenvío
    const handleResend = async () => {
        try {
            await resendCode(email);
        } catch (error) {
            // El error ya se maneja en el hook
        }
    };

    // Reiniciar cuando cambie el email
    const handleEmailChange = (newEmail: string) => {
        onEmailChange(newEmail);
        if (verificationSent) {
            reset();
            setVerificationCode('');
            setLastNotifiedStatus(null);
        }
    };

    return (
        <div className={`space-y-4 ${className}`}>
            {/* Campo de email */}
            <div className="relative">
                <Input
                    id="email-verification"
                    label="Correo Electrónico"
                    type="email"
                    placeholder={placeholder}
                    value={email}
                    onChange={(e) => handleEmailChange(e.target.value)}
                    onBlur={() => setEmailTouched(true)}
                    error={emailError}
                    isRequired={isRequired}
                    disabled={verificationSent}
                />
                
                {/* Estado de verificación */}
                {isCodeValid === true && (
                    <div className="absolute right-3 top-9 text-green-500">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                    </div>
                )}
            </div>

            {/* Botón para enviar código */}
            {!verificationSent && isEmailValid && (
                <Button
                    type="button"
                    variant="outline"
                    onClick={handleSendCode}
                    isLoading={isLoading}
                    loadingText="Enviando código..."
                    className="w-full"
                >
                    Enviar Código de Verificación
                </Button>
            )}

            {/* Sección de verificación de código */}
            {verificationSent && (
                <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="text-sm text-blue-800">
                        <p className="font-medium">📧 Código enviado a {email}</p>
                        <p>Ingrese el código de 6 dígitos que recibió por correo electrónico.</p>
                    </div>

                    {/* Campo para código */}
                    <Input
                        id="verification-code"
                        label="Código de Verificación"
                        placeholder="123456"
                        value={verificationCode}
                        onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                            setVerificationCode(value);
                        }}
                        maxLength={6}
                        className="text-center text-lg tracking-widest"
                        isRequired
                    />

                    {/* Botón verificar */}
                    <Button
                        type="button"
                        variant="primary"
                        onClick={handleVerifyCode}
                        isLoading={isLoading}
                        loadingText="Verificando..."
                        disabled={verificationCode.length !== 6}
                        className="w-full"
                    >
                        Verificar Código
                    </Button>

                    {/* Reenviar código */}
                    <div className="text-center text-sm">
                        {timeRemaining > 0 ? (
                            <span className="text-gray-500">
                                Puede reenviar en {timeRemainingMinutes} minuto{timeRemainingMinutes !== 1 ? 's' : ''}
                            </span>
                        ) : (
                            <button
                                type="button"
                                onClick={handleResend}
                                disabled={isLoading}
                                className="text-blue-600 hover:text-blue-800 hover:underline disabled:opacity-50"
                            >
                                ¿No recibió el código? Reenviar
                            </button>
                        )}
                    </div>

                    {/* Cambiar email */}
                    <div className="text-center">
                        <button
                            type="button"
                            onClick={() => {
                                reset();
                                setVerificationCode('');
                                setEmailTouched(false);
                                setLastNotifiedStatus(null);
                            }}
                            className="text-sm text-gray-600 hover:text-gray-800 hover:underline"
                        >
                            Cambiar email
                        </button>
                    </div>
                </div>
            )}

            {/* Errores */}
            {verificationError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-700">{verificationError}</p>
                </div>
            )}

            {/* Estado de verificación exitosa */}
            {isCodeValid === true && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-700 font-medium">
                        ✅ Email verificado exitosamente
                    </p>
                </div>
            )}

            {/* Información adicional */}
            {!verificationSent && (
                <div className="text-xs text-gray-500">
                    <p>• Se enviará un código de verificación de 6 dígitos</p>
                    <p>• El código expira en 15 minutos</p>
                    {/* NOTA: Restricción de emails institucionales deshabilitada temporalmente para pruebas */}
                    {/* <p>• No use emails institucionales (@mtn.cl)</p> */}
                </div>
            )}
        </div>
    );
};

export default EmailVerification;