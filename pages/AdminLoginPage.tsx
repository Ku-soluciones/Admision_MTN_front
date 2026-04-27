import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/AppContext';
import { EyeIcon, EyeOffIcon } from '../components/icons/Icons';

const AdminLoginPage: React.FC = () => {
    const [userType, setUserType] = useState<'familia' | 'admin'>('admin');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [step, setStep] = useState(1); // 1: Email, 2: Password
    const navigate = useNavigate();
    const { login, user, isAuthenticated } = useAuth();
    const { addNotification } = useNotifications();

    // Redirigir si ya está autenticado
    React.useEffect(() => {
        if (isAuthenticated && user) {
            if (user.role === 'ADMIN') {
                navigate('/admin');
            } else if (user.role === 'APODERADO') {
                navigate('/familia');
            } else {
                navigate('/profesor');
            }
        }
    }, [isAuthenticated, user, navigate]);

    const handleNextStep = (e: React.FormEvent) => {
        e.preventDefault();
        if (step === 1) {
            if (email) {
                setStep(2);
            } else {
                addNotification({
                    type: 'error',
                    title: 'Campo requerido',
                    message: 'Por favor ingrese un correo electrónico'
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
            await login(email, password, userType);

            if (userType === 'familia') {
                navigate('/familia');
            } else {
                navigate('/admin');
            }
        } catch (error: any) {
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

    const handleSwitchRole = () => {
        setEmail('');
        setPassword('');
        setStep(1);
        setUserType(userType === 'admin' ? 'familia' : 'admin');
    };

    const isAdmin = userType === 'admin';

    return (
        <div
            className="min-h-screen w-full flex items-center justify-center bg-white overflow-hidden relative"
        >
            {/* Sin decoración */}

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
                        <h1 className="text-2xl font-bold text-white text-center mb-2">
                            {step === 1 ? 'Iniciar Sesión' : 'Verificar Identidad'}
                        </h1>
                        <p className="text-white/90 text-sm text-center">
                            {isAdmin
                                ? 'Portal Administrativo del Colegio'
                                : 'Portal de Familias'}
                        </p>
                    </div>

                    {/* Contenido */}
                    <div className="px-8 py-8 space-y-6">
                        {/* Selector de rol */}
                        <div className="flex gap-3 p-1 bg-gray-100 rounded-lg">
                            <button
                                type="button"
                                onClick={handleSwitchRole}
                                className={`flex-1 py-2 px-4 rounded-md font-medium transition-all duration-200 ${
                                    !isAdmin
                                        ? 'bg-white text-azul-monte-tabor shadow-md'
                                        : 'text-gray-600 hover:text-gray-800'
                                }`}
                            >
                                Familia
                            </button>
                            <button
                                type="button"
                                onClick={handleSwitchRole}
                                className={`flex-1 py-2 px-4 rounded-md font-medium transition-all duration-200 ${
                                    isAdmin
                                        ? 'bg-azul-monte-tabor text-white shadow-md'
                                        : 'text-gray-600 hover:text-gray-800'
                                }`}
                            >
                                Administrador
                            </button>
                        </div>

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
                                            placeholder={isAdmin ? 'admin@mtn.cl' : 'familia@ejemplo.com'}
                                            className="w-full px-4 py-3 border-b-2 border-gray-300 focus:outline-none focus:border-azul-monte-tabor bg-transparent transition-colors text-base font-medium"
                                            required
                                            autoFocus
                                        />
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

                                    {/* Recordar y recuperar contraseña */}
                                    <div className="flex justify-between items-center text-sm">
                                        <label className="flex items-center gap-2 text-gray-700">
                                            <input type="checkbox" className="w-4 h-4 rounded border-gray-300" />
                                            <span>Mantener sesión abierta</span>
                                        </label>
                                        <a href="#" className="text-azul-monte-tabor hover:underline font-medium">
                                            ¿Olvidó contraseña?
                                        </a>
                                    </div>

                                    {/* Botón de login */}
                                    <button
                                        type="submit"
                                        disabled={isLoading}
                                        className="w-full bg-dorado-nazaret hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105 active:scale-95"
                                    >
                                        {isLoading ? 'Ingresando...' : 'Iniciar Sesión'}
                                    </button>
                                </div>
                            )}
                        </form>

                        {/* Mensaje de nueva cuenta para familia */}
                        {step === 1 && !isAdmin && (
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
                <div className="mt-6 text-center text-gray-600 text-sm">
                    <p>
                        {isAdmin
                            ? '¿Es familia? '
                            : '¿Es administrador? '}
                        <button
                            onClick={handleSwitchRole}
                            className="text-dorado-nazaret font-semibold hover:text-amber-600 transition-colors"
                        >
                            {isAdmin ? 'Acceda al portal familiar' : 'Ingrese aquí'}
                        </button>
                    </p>
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

export default AdminLoginPage;
