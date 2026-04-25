import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/AppContext';

const ApoderadoLogin: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [step, setStep] = useState(1); // 1: Email, 2: Password
    const navigate = useNavigate();
    const { login } = useAuth();
    const { addNotification } = useNotifications();
    const [searchParams] = useSearchParams();
    const redirectTo = searchParams.get('redirect') || '/familia';

    const handleNextStep = (e: React.FormEvent) => {
        e.preventDefault();
        if (step === 1) {
            if (email && email.includes('@')) {
                setStep(2);
            } else {
                addNotification({
                    type: 'error',
                    title: 'Email inválido',
                    message: 'Por favor ingrese un email válido'
                });
            }
        } else {
            handleLogin();
        }
    };

    const handleBack = () => {
        setStep(1);
        setPassword('');
    };

    const handleLogin = async () => {
        setIsLoading(true);
        try {
            console.log('🔐 Iniciando login para apoderado:', email);

            await login(email, password, 'apoderado');

            addNotification({
                type: 'success',
                title: 'Bienvenido/a',
                message: 'Sesión iniciada correctamente'
            });

            console.log('✅ Login exitoso, redirigiendo a:', redirectTo);
            navigate(redirectTo);
        } catch (error: any) {
            console.error('❌ Error en login:', error);
            addNotification({
                type: 'error',
                title: 'Error de autenticación',
                message: error.message || 'Credenciales inválidas'
            });
            setStep(1);
            setPassword('');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div
            className="min-h-screen w-full flex items-center justify-center bg-cover bg-center bg-no-repeat overflow-hidden relative animate-bg-shift"
            style={{
                backgroundImage: `linear-gradient(135deg, rgba(30, 64, 175, 0.8) 0%, rgba(15, 32, 87, 0.8) 100%), url('/images/colegio.png')`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundAttachment: 'fixed',
                animation: 'subtle-zoom 20s ease-in-out infinite alternate',
            }}
        >
            {/* Decoración de esquinas */}
            <div className="absolute top-0 left-0 w-72 h-72 bg-gradient-to-br from-blue-400/10 to-transparent rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-tl from-azul-monte-tabor/10 to-transparent rounded-full blur-3xl"></div>

            {/* Contenedor principal */}
            <div className="w-full max-w-md z-10 px-4">
                {/* Tarjeta de login */}
                <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl overflow-hidden animate-fade-in border border-white/20">

                    {/* Encabezado con gradiente */}
                    <div className="bg-gradient-to-r from-azul-monte-tabor to-azul-monte-tabor/80 px-8 py-8">
                        <div className="flex justify-center mb-4">
                            <img
                                src="/images/logoMTN.png"
                                alt="Logo Colegio"
                                className="h-14 object-contain drop-shadow-lg"
                                style={{ filter: 'drop-shadow(0 2px 8px rgba(255,255,255,0.4))' }}
                            />
                        </div>
                        <h1 className="text-2xl font-bold text-white text-center mb-2">
                            {step === 1 ? 'Portal de Familias' : 'Verificar Identidad'}
                        </h1>
                        <p className="text-white/90 text-sm text-center">
                            Acceso para Apoderados
                        </p>
                    </div>

                    {/* Contenido */}
                    <div className="px-8 py-8 space-y-6">
                        <form onSubmit={handleNextStep} className="space-y-6">
                            {step === 1 ? (
                                <div className="space-y-4 animate-slide-in">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-800 mb-2">
                                            Correo Electrónico
                                        </label>
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="apoderado@ejemplo.com"
                                            className="w-full px-4 py-3 border-b-2 border-gray-300 focus:outline-none focus:border-azul-monte-tabor bg-transparent transition-colors text-base font-medium"
                                            required
                                            autoFocus
                                        />
                                    </div>

                                    <div className="pt-4">
                                        <button
                                            type="submit"
                                            className="w-full bg-gradient-to-r from-azul-monte-tabor to-azul-monte-tabor/80 hover:from-azul-monte-tabor/90 hover:to-azul-monte-tabor text-white py-3 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105 active:scale-95"
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
                                            <p className="text-sm font-semibold text-gray-800">{email}</p>
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
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
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
                                    </div>

                                    {/* Botón de login */}
                                    <button
                                        type="submit"
                                        disabled={isLoading}
                                        className="w-full bg-gradient-to-r from-azul-monte-tabor to-azul-monte-tabor/80 hover:from-azul-monte-tabor/90 hover:to-azul-monte-tabor disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105 active:scale-95"
                                    >
                                        {isLoading ? 'Ingresando...' : 'Iniciar Sesión'}
                                    </button>
                                </div>
                            )}
                        </form>

                        {/* Mensaje para nueva cuenta */}
                        {step === 1 && (
                            <div className="text-center text-sm text-gray-700">
                                ¿Primera vez?{' '}
                                <Link to="/postulacion" className="font-semibold text-azul-monte-tabor hover:underline">
                                    Inicie su postulación
                                </Link>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="mt-6 text-center text-white/80 text-sm">
                    <Link
                        to="/"
                        className="text-white font-semibold hover:text-blue-200 transition-colors"
                    >
                        ← Volver al Portal Principal
                    </Link>
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

export default ApoderadoLogin;
