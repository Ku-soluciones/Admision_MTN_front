import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFormValidation } from '../hooks/useFormValidation';
import { useNotifications } from '../context/AppContext';
import { professorAuthService } from '../services/professorAuthService';
import { useAuth } from '../context/AuthContext';

const ProfessorLoginPage: React.FC = () => {
    const navigate = useNavigate();
    const { addNotification } = useNotifications();
    const { login: loginWithAuth } = useAuth();
    const [isLoggingIn, setIsLoggingIn] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [step, setStep] = useState(1); // 1: Email, 2: Password

    const validationConfig = {
        email: {
            required: true,
            email: true,
            custom: (value: string) => {
                if (!value.includes('@mtn.cl')) {
                    return 'Debe usar un email institucional (@mtn.cl)';
                }
                return null;
            }
        },
        password: { required: true, minLength: 6 }
    };

    const { data, errors, updateField, touchField, validateForm } = useFormValidation(
        validationConfig,
        { email: '', password: '' }
    );

    const handleNextStep = (e: React.FormEvent) => {
        e.preventDefault();
        if (step === 1) {
            if (data.email && !errors.email) {
                setStep(2);
            } else {
                touchField('email');
                addNotification({
                    type: 'error',
                    title: 'Email inválido',
                    message: errors.email || 'Por favor ingrese un email institucional válido (@mtn.cl)'
                });
            }
        } else {
            handleLogin();
        }
    };

    const handleBack = () => {
        setStep(1);
    };

    const handleLogin = async () => {
        if (!validateForm()) {
            addNotification({
                type: 'error',
                title: 'Error de validación',
                message: 'Por favor completa todos los campos correctamente'
            });
            return;
        }

        setIsLoggingIn(true);

        try {
            console.log('🔐 Iniciando login para profesor:', data.email);

            const response = await professorAuthService.login({
                email: data.email,
                password: data.password
            });

            if (response.success && response.token) {
                if (response.role && professorAuthService.isProfessorRole(response.role)) {

                    if (response.role === 'ADMIN') {
                        console.log('🔑 Usuario admin detectado, registrando en AuthContext principal...');
                        await loginWithAuth(data.email, data.password, 'ADMIN');
                    }

                    localStorage.setItem('currentProfessor', JSON.stringify({
                        id: response.id || 26,
                        firstName: response.firstName || '',
                        lastName: response.lastName || '',
                        email: response.email || '',
                        subject: response.subject || null,
                        subjects: getSubjectsByRole(response.role),
                        assignedGrades: ['prekinder', 'kinder', '1basico', '2basico', '3basico', '4basico', '5basico', '6basico', '7basico', '8basico', '1medio', '2medio', '3medio', '4medio'],
                        isAdmin: response.role === 'ADMIN'
                    }));

                    addNotification({
                        type: 'success',
                        title: 'Bienvenido/a',
                        message: `Hola ${response.firstName} ${response.lastName}`
                    });

                    console.log('✅ Login exitoso, redirigiendo al dashboard...');

                    if (response.role === 'ADMIN') {
                        console.log('🔑 Usuario admin detectado, redirigiendo al panel de administración...');
                        navigate('/admin');
                    } else {
                        console.log('👨‍🏫 Usuario profesor detectado, redirigiendo al dashboard de profesor...');
                        navigate('/profesor');
                    }

                } else {
                    addNotification({
                        type: 'error',
                        title: 'Acceso denegado',
                        message: 'Este portal es solo para profesores y personal del colegio'
                    });
                }
            } else {
                addNotification({
                    type: 'error',
                    title: 'Error de autenticación',
                    message: response.message || 'Error al iniciar sesión'
                });
            }
        } catch (error: any) {
            console.error('❌ Error en login:', error);
            addNotification({
                type: 'error',
                title: 'Error del sistema',
                message: error.message || 'No se pudo procesar el login. Intenta nuevamente.'
            });
        } finally {
            setIsLoggingIn(false);
        }
    };

    const getSubjectsByRole = (role: string): string[] => {
        switch (role) {
            case 'ADMIN':
                return ['MATH', 'SPANISH', 'ENGLISH', 'SCIENCE', 'HISTORY', 'PSYCHOLOGY'];
            case 'TEACHER_EARLY_CYCLE':
                return ['MATH', 'SPANISH'];
            case 'TEACHER_LANGUAGE_BASIC':
                return ['SPANISH'];
            case 'TEACHER_MATHEMATICS_BASIC':
                return ['MATH'];
            case 'TEACHER_ENGLISH_BASIC':
                return ['ENGLISH'];
            case 'TEACHER_SCIENCE_BASIC':
                return ['SCIENCE'];
            case 'TEACHER_HISTORY_BASIC':
                return ['HISTORY'];
            case 'TEACHER_LANGUAGE_HIGH':
                return ['SPANISH'];
            case 'TEACHER_MATHEMATICS_HIGH':
                return ['MATH'];
            case 'TEACHER_ENGLISH_HIGH':
                return ['ENGLISH'];
            case 'TEACHER_SCIENCE_HIGH':
                return ['SCIENCE'];
            case 'TEACHER_HISTORY_HIGH':
                return ['HISTORY'];
            case 'COORDINATOR_LANGUAGE':
                return ['SPANISH'];
            case 'COORDINATOR_MATHEMATICS':
                return ['MATH'];
            case 'COORDINATOR_ENGLISH':
                return ['ENGLISH'];
            case 'COORDINATOR_SCIENCE':
                return ['SCIENCE'];
            case 'COORDINATOR_HISTORY':
                return ['HISTORY'];
            case 'CYCLE_DIRECTOR':
                return ['MATH', 'SPANISH', 'ENGLISH', 'SCIENCE', 'HISTORY'];
            case 'PSYCHOLOGIST':
                return ['PSYCHOLOGY'];
            case 'INTERVIEWER':
                return ['PSYCHOLOGY'];
            case 'TEACHER_MATHEMATICS':
                return ['MATH'];
            case 'TEACHER_LANGUAGE':
                return ['SPANISH'];
            case 'TEACHER_ENGLISH':
                return ['ENGLISH'];
            default:
                return [];
        }
    };

    return (
        <div
            className="min-h-screen w-full flex items-center justify-center bg-white overflow-hidden relative"
        >
            {/* Sin decoración azul */}

            {/* Contenedor principal */}
            <div className="w-full max-w-md z-10 px-4">
                {/* Tarjeta de login */}
                <div className="bg-white rounded-2xl shadow-xl overflow-hidden animate-fade-in border border-gray-200">

                    {/* Encabezado blanco */}
                    <div className="bg-white px-8 py-8">
                        <div className="flex justify-center mb-4">
                            <img
                                src="/images/logoMTN.png"
                                alt="Logo Colegio"
                                className="h-14 object-contain drop-shadow-lg"
                                style={{ filter: 'drop-shadow(0 2px 8px rgba(30,64,175,0.15))' }}
                            />
                        </div>
                        <h1 className="text-2xl font-bold text-azul-monte-tabor text-center mb-2">
                            {step === 1 ? 'Portal de Profesores' : 'Verificar Identidad'}
                        </h1>
                        <p className="text-azul-monte-tabor/70 text-sm text-center">
                            Sistema de Evaluación de Admisión
                        </p>
                    </div>

                    {/* Contenido */}
                    <div className="px-8 py-8 space-y-6">
                        <form onSubmit={handleNextStep} className="space-y-6">
                            {step === 1 ? (
                                <div className="space-y-4 animate-slide-in">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-800 mb-2">
                                            Email Institucional
                                        </label>
                                        <input
                                            type="email"
                                            value={data.email}
                                            onChange={(e) => updateField('email', e.target.value)}
                                            onBlur={() => touchField('email')}
                                            placeholder="nombre@mtn.cl"
                                            className="w-full px-4 py-3 border-b-2 border-gray-300 focus:outline-none focus:border-azul-monte-tabor bg-transparent transition-colors text-base font-medium"
                                            required
                                            autoFocus
                                        />
                                        {errors.email && (
                                            <p className="text-red-500 text-xs mt-2">{errors.email}</p>
                                        )}
                                    </div>

                                    <div className="pt-4">
                                        <button
                                            type="submit"
                                            className="w-full bg-dorado-nazaret hover:bg-amber-600 text-white py-3 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105 active:scale-95"
                                        >
                                            Siguiente
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4 animate-slide-in">
                                    {/* Botón atrás y email */}
                                    <div className="flex items-center gap-3 pb-4 border-b border-gray-200">
                                        <button
                                            type="button"
                                            onClick={handleBack}
                                            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                                            title="Volver"
                                        >
                                            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                            </svg>
                                        </button>
                                        <div>
                                            <p className="text-xs text-gray-600">Continuando como:</p>
                                            <p className="text-sm font-semibold text-gray-800">{data.email}</p>
                                        </div>
                                    </div>

                                    {/* Campo de contraseña */}
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-800 mb-2">
                                            Contraseña
                                        </label>
                                        <div className="relative">
                                            <input
                                                type={showPassword ? 'text' : 'password'}
                                                value={data.password}
                                                onChange={(e) => updateField('password', e.target.value)}
                                                onBlur={() => touchField('password')}
                                                placeholder="Ingrese su contraseña"
                                                className="w-full px-4 py-3 border-b-2 border-gray-300 focus:outline-none focus:border-azul-monte-tabor bg-transparent transition-colors text-base font-medium pr-12"
                                                required
                                                autoFocus
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-0 top-1/2 -translate-y-1/2 p-2 text-gray-600 hover:text-azul-monte-tabor transition-colors"
                                            >
                                                {showPassword ? (
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-4.803m5.596-3.856a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    </svg>
                                                ) : (
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                    </svg>
                                                )}
                                            </button>
                                        </div>
                                        {errors.password && (
                                            <p className="text-red-500 text-xs mt-2">{errors.password}</p>
                                        )}
                                    </div>

                                    {/* Botón de login */}
                                    <button
                                        type="submit"
                                        disabled={isLoggingIn}
                                        className="w-full bg-dorado-nazaret hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105 active:scale-95"
                                    >
                                        {isLoggingIn ? 'Verificando...' : 'Iniciar Sesión'}
                                    </button>
                                </div>
                            )}
                        </form>
                    </div>
                </div>

                {/* Footer */}
                <div className="mt-6 text-center text-gray-600 text-sm">
                    <button
                        onClick={() => navigate('/')}
                        className="text-azul-monte-tabor font-semibold hover:text-azul-monte-tabor/80 transition-colors"
                    >
                        ← Volver al Portal Principal
                    </button>
                </div>
            </div>

            {/* Estilos de animación */}
            <style>{`
                @keyframes fade-in {
                    from {
                        opacity: 0;
                        transform: scale(0.95);
                    }
                    to {
                        opacity: 1;
                        transform: scale(1);
                    }
                }

                @keyframes slide-in {
                    from {
                        opacity: 0;
                        transform: translateY(10px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                @keyframes subtle-zoom {
                    0% {
                        transform: scale(1);
                    }
                    100% {
                        transform: scale(1.05);
                    }
                }

                .animate-fade-in {
                    animation: fade-in 0.5s ease-out;
                }

                .animate-slide-in {
                    animation: slide-in 0.3s ease-out;
                }

                .animate-bg-shift {
                    animation: subtle-zoom 20s ease-in-out infinite alternate;
                }
            `}</style>
        </div>
    );
};

export default ProfessorLoginPage;