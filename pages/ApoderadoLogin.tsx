import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Input from '../components/ui/Input';
import RutInput from '../components/ui/RutInput';
import Button from '../components/ui/Button';
import EmailVerification from '../components/ui/EmailVerification';
import { useAuth } from '../context/AuthContext';

const ApoderadoLogin: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [showRegister, setShowRegister] = useState(false);
    const [isEmailVerified, setIsEmailVerified] = useState(false);

    // Campos para registro
    const [registerData, setRegisterData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        confirmPassword: '',
        phone: '',
        rut: ''
    });

    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { login, register } = useAuth();

    const redirectTo = searchParams.get('redirect') || '/dashboard-apoderado';

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            // Simulando autenticación
            if (email && password) {
                console.log('🔐 ApoderadoLogin: Attempting login with:', { email, password: password.length + ' chars' });
                await login(email, password, 'apoderado');
                console.log('✅ ApoderadoLogin: Login successful, navigating to:', redirectTo);
                navigate(redirectTo);
            } else {
                console.warn('⚠️ ApoderadoLogin: Missing email or password');
                setError('Por favor complete todos los campos');
            }
        } catch (err) {
            console.error('❌ ApoderadoLogin: Login failed:', err);
            setError('Credenciales inválidas. Verifique su email y contraseña.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        // Validar verificación de email
        if (!isEmailVerified) {
            setError('Debe verificar su dirección de correo electrónico antes de continuar');
            setIsLoading(false);
            return;
        }

        // Validaciones
        if (registerData.password !== registerData.confirmPassword) {
            setError('Las contraseñas no coinciden');
            setIsLoading(false);
            return;
        }

        if (registerData.password.length < 6) {
            setError('La contraseña debe tener al menos 6 caracteres');
            setIsLoading(false);
            return;
        }

        try {
            await register(registerData, 'apoderado');
            // Para usuarios nuevos registrados, redirigir al formulario de postulación
            navigate('/postulacion');
        } catch (err) {
            setError('Error al crear la cuenta. Intente nuevamente.');
        } finally {
            setIsLoading(false);
        }
    };

    const updateRegisterField = (field: string, value: string) => {
        setRegisterData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-white overflow-hidden relative">
            {/* Contenedor principal */}
            <div className="w-full max-w-md z-10 px-4">
                {/* Tarjeta de login/registro */}
                <div className="bg-white rounded-2xl shadow-xl overflow-hidden animate-fade-in border border-gray-200">

                    {/* Encabezado */}
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
                            {showRegister ? 'Crear Cuenta para Postular' : 'Portal de Familias'}
                        </h1>
                        <p className="text-azul-monte-tabor/70 text-sm text-center">
                            {showRegister
                                ? 'Cree su cuenta para iniciar el proceso de postulación'
                                : 'Inicia sesión para acceder a tu portal'
                            }
                        </p>
                    </div>

                    {/* Contenido */}
                    <div className="px-8 py-8 space-y-6">
                        {!showRegister ? (
                            // Formulario de Login
                            <form onSubmit={handleLogin} className="space-y-6 animate-slide-in">
                                {error && (
                                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                                        {error}
                                    </div>
                                )}

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
                                        disabled={isLoading}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-800 mb-2">
                                        Contraseña
                                    </label>
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        className="w-full px-4 py-3 border-b-2 border-gray-300 focus:outline-none focus:border-azul-monte-tabor bg-transparent transition-colors text-base font-medium"
                                        required
                                        disabled={isLoading}
                                    />
                                </div>

                                <Button
                                    type="submit"
                                    variant="primary"
                                    size="lg"
                                    isLoading={isLoading}
                                    loadingText="Iniciando sesión..."
                                    className="w-full !bg-dorado-nazaret hover:!bg-amber-600 !text-white mt-6"
                                >
                                    Iniciar Sesión
                                </Button>

                                <div className="text-center text-sm text-gray-600 pt-4 border-t border-gray-200">
                                    <button
                                        type="button"
                                        onClick={() => setShowRegister(true)}
                                        className="text-azul-monte-tabor font-semibold hover:underline"
                                    >
                                        ¿Primera vez? Crear cuenta para postular
                                    </button>
                                </div>
                            </form>
                        ) : (
                            // Formulario de Registro
                            <form onSubmit={handleRegister} className="space-y-4 animate-slide-in">
                                {error && (
                                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                                        {error}
                                    </div>
                                )}

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <Input
                                        id="firstName"
                                        label="Nombres"
                                        type="text"
                                        placeholder="Juan Carlos"
                                        value={registerData.firstName}
                                        onChange={(e) => updateRegisterField('firstName', e.target.value)}
                                        required
                                    />
                                    <Input
                                        id="lastName"
                                        label="Apellidos"
                                        type="text"
                                        placeholder="Pérez González"
                                        value={registerData.lastName}
                                        onChange={(e) => updateRegisterField('lastName', e.target.value)}
                                        required
                                    />
                                </div>

                                <RutInput
                                    name="rut"
                                    label="RUT"
                                    placeholder="12.345.678-9"
                                    value={registerData.rut}
                                    onChange={(value) => updateRegisterField('rut', value)}
                                    required
                                />

                                <EmailVerification
                                    email={registerData.email}
                                    rut={registerData.rut}
                                    onEmailChange={(email) => updateRegisterField('email', email)}
                                    onVerificationComplete={setIsEmailVerified}
                                    placeholder="apoderado@ejemplo.com"
                                    isRequired
                                />

                                <Input
                                    id="phone"
                                    label="Teléfono"
                                    type="tel"
                                    placeholder="+569 1234 5678"
                                    value={registerData.phone}
                                    onChange={(e) => updateRegisterField('phone', e.target.value)}
                                    required
                                />

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <Input
                                        id="password"
                                        label="Contraseña"
                                        type="password"
                                        placeholder="••••••••"
                                        value={registerData.password}
                                        onChange={(e) => updateRegisterField('password', e.target.value)}
                                        required
                                    />
                                    <Input
                                        id="confirmPassword"
                                        label="Confirmar Contraseña"
                                        type="password"
                                        placeholder="••••••••"
                                        value={registerData.confirmPassword}
                                        onChange={(e) => updateRegisterField('confirmPassword', e.target.value)}
                                        required
                                    />
                                </div>

                                <div className="flex gap-4 pt-4">
                                    <Button
                                        type="button"
                                        variant="primary"
                                        onClick={() => setShowRegister(false)}
                                        className="flex-1 !bg-dorado-nazaret hover:!bg-amber-600 !text-white"
                                    >
                                        Volver al Login
                                    </Button>
                                    <Button
                                        type="submit"
                                        variant="primary"
                                        isLoading={isLoading}
                                        loadingText="Creando cuenta..."
                                        disabled={!isEmailVerified || isLoading}
                                        className={`flex-1 !text-white ${
                                            isEmailVerified
                                                ? '!bg-dorado-nazaret hover:!bg-amber-600'
                                                : '!bg-gray-400 cursor-not-allowed hover:!bg-gray-400'
                                        }`}
                                    >
                                        {isEmailVerified ? 'Crear Cuenta' : 'Verificar Email Primero'}
                                    </Button>
                                </div>
                            </form>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="px-8 py-6 border-t border-gray-200 text-center">
                        <Link
                            to="/"
                            className="text-azul-monte-tabor hover:underline text-sm"
                        >
                            ← Volver al inicio
                        </Link>
                    </div>
                </div>

                {/* Información adicional */}
                <div className="mt-6 text-center text-sm text-gray-600">
                    <p>¿Problemas para acceder? <a href="mailto:admisiones@mtn.cl" className="text-azul-monte-tabor hover:underline">admisiones@mtn.cl</a></p>
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

                .animate-fade-in {
                    animation: fade-in 0.5s ease-out;
                }

                .animate-slide-in {
                    animation: slide-in 0.3s ease-out;
                }
            `}</style>
        </div>
    );
};

export default ApoderadoLogin;
