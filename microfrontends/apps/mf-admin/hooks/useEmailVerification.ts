import { useState, useCallback } from 'react';
import { emailVerificationService, EmailVerificationResponse, VerifyCodeResponse } from '../services/emailVerificationService';

export interface EmailVerificationState {
    isLoading: boolean;
    verificationSent: boolean;
    verificationToken: string | null;
    verificationError: string | null;
    isCodeValid: boolean | null;
    timeRemaining: number; // segundos hasta poder reenviar
}

export const useEmailVerification = () => {
    const [state, setState] = useState<EmailVerificationState>({
        isLoading: false,
        verificationSent: false,
        verificationToken: null,
        verificationError: null,
        isCodeValid: null,
        timeRemaining: 0
    });

    // Enviar código de verificación
    const sendVerificationCode = useCallback(async (
        email: string,
        type: 'registration' | 'password_reset' | 'account_confirmation' = 'registration',
        rut?: string,
        firstName?: string,
        lastName?: string
    ) => {
        setState(prev => ({ ...prev, isLoading: true, verificationError: null }));

        try {
            // Validar formato de email
            if (!emailVerificationService.isValidEmailFormat(email)) {
                throw new Error('Formato de email inválido');
            }

            // Validar que no sea email institucional para registro de apoderados
            // NOTA: Validación deshabilitada temporalmente para pruebas con @mtn.cl
            // if (type === 'registration' && emailVerificationService.isInstitutionalEmail(email)) {
            //     throw new Error('No puede usar un email institucional para registro de apoderado');
            // }

            // Convertir tipo a enum apropiado
            let verificationType;
            switch (type) {
                case 'registration':
                case 'account_confirmation':
                    verificationType = 'REGISTRATION';
                    break;
                case 'password_reset':
                    verificationType = 'PASSWORD_RESET';
                    break;
                default:
                    verificationType = 'REGISTRATION';
            }

            console.log('🔄 useEmailVerification: Enviando código con datos:', { email, rut, firstName, lastName });

            // Enviar código usando el API real - EL BACKEND VALIDARÁ EMAIL Y RUT
            const response = await emailVerificationService.sendVerificationCode({
                email,
                type: verificationType as any,
                rut: rut,
                firstName: firstName,
                lastName: lastName
            });

            console.log('✅ useEmailVerification: Respuesta recibida:', response);

            // Si la respuesta indica fallo, lanzar error
            if (!response.success) {
                throw new Error(response.message || 'Error al enviar código de verificación');
            }

            setState(prev => ({
                ...prev,
                isLoading: false,
                verificationSent: true,
                verificationToken: response.verificationToken || null,
                timeRemaining: (response.expiresIn || 15) * 60 // convertir a segundos
            }));

            // Iniciar countdown para reenvío
            startResendCountdown((response.expiresIn || 15) * 60);

            return response;
        } catch (error: any) {
            console.error('❌ useEmailVerification: Error capturado:', error);
            const errorMessage = error.message || 'Error al enviar código de verificación';
            console.log('🔴 useEmailVerification: Estableciendo verificationError:', errorMessage);

            setState(prev => ({
                ...prev,
                isLoading: false,
                verificationError: errorMessage
            }));
            throw error;
        }
    }, []);

    // Verificar código
    const verifyCode = useCallback(async (email: string, code: string) => {
        setState(prev => ({ ...prev, isLoading: true, verificationError: null }));
        
        try {
            // Verificar código usando el API real
            const response = await emailVerificationService.verifyCode({
                email,
                code: code
            });

            setState(prev => ({
                ...prev,
                isLoading: false,
                isCodeValid: response.isValid
            }));

            if (!response.isValid) {
                throw new Error('Código de verificación inválido o expirado');
            }

            return response;
        } catch (error: any) {
            setState(prev => ({
                ...prev,
                isLoading: false,
                verificationError: error.message || 'Error al verificar código',
                isCodeValid: false
            }));
            throw error;
        }
    }, []);

    // Reenviar código
    const resendCode = useCallback(async (email: string) => {
        if (state.timeRemaining > 0) {
            throw new Error(`Debe esperar ${Math.ceil(state.timeRemaining / 60)} minutos para reenviar`);
        }

        setState(prev => ({ ...prev, isLoading: true, verificationError: null }));
        
        try {
            // Para reenviar, simplemente enviamos un nuevo código
            const response = await emailVerificationService.sendVerificationCode({ 
                email, 
                type: 'REGISTRATION' 
            });

            setState(prev => ({
                ...prev,
                isLoading: false,
                timeRemaining: (response.expiresIn || 15) * 60
            }));

            // Reiniciar countdown
            startResendCountdown((response.expiresIn || 15) * 60);

            return response;
        } catch (error: any) {
            setState(prev => ({
                ...prev,
                isLoading: false,
                verificationError: error.message || 'Error al reenviar código'
            }));
            throw error;
        }
    }, [state.timeRemaining]);

    // Countdown para reenvío
    const startResendCountdown = useCallback((seconds: number) => {
        let timeLeft = seconds;
        
        const interval = setInterval(() => {
            timeLeft -= 1;
            setState(prev => ({ ...prev, timeRemaining: timeLeft }));
            
            if (timeLeft <= 0) {
                clearInterval(interval);
            }
        }, 1000);
    }, []);

    // Resetear estado
    const reset = useCallback(() => {
        setState({
            isLoading: false,
            verificationSent: false,
            verificationToken: null,
            verificationError: null,
            isCodeValid: null,
            timeRemaining: 0
        });
    }, []);

    // Verificar formato de email
    const validateEmailFormat = useCallback((email: string) => {
        return emailVerificationService.isValidEmailFormat(email);
    }, []);

    // Verificar si es email válido para apoderados
    const validateParentEmail = useCallback((email: string) => {
        return emailVerificationService.isValidParentEmail(email);
    }, []);

    return {
        ...state,
        sendVerificationCode,
        verifyCode,
        resendCode,
        reset,
        validateEmailFormat,
        validateParentEmail,
        canResend: state.timeRemaining <= 0,
        timeRemainingMinutes: Math.ceil(state.timeRemaining / 60)
    };
};