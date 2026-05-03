import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Input from '../components/ui/Input';
import RutInput from '../components/ui/RutInput';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import EmailVerification from '../components/ui/EmailVerification';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/AppContext';
import { microfrontendUrls } from '../utils/microfrontendUrls';

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
    const { addNotification } = useNotifications();
    
    const redirectTo = searchParams.get('redirect') || '/dashboard-apoderado';

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        if (!email || !password) {
            const msg = 'Por favor complete todos los campos';
            setError(msg);
            addNotification({ type: 'error', title: 'Campos requeridos', message: msg });
            setIsLoading(false);
            return;
        }

        try {
            await login(email, password, 'APODERADO');

            // Verificar que el rol sea APODERADO
            const storedUser = JSON.parse(localStorage.getItem('authenticated_user') || 'null');
            if (storedUser && storedUser.role !== 'APODERADO') {
                const msg = 'Esta cuenta no corresponde a un apoderado. Use el portal de profesores.';
                setError(msg);
                addNotification({ type: 'error', title: 'Acceso denegado', message: msg });
                localStorage.removeItem('auth_token');
                localStorage.removeItem('authenticated_user');
                setIsLoading(false);
                return;
            }

            navigate(redirectTo);
        } catch (err: any) {
            const msg = err.message || 'Credenciales inválidas. Verifique su email y contraseña.';
            setError(msg);
            addNotification({ type: 'error', title: 'Error al iniciar sesión', message: msg });
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
            await register(registerData, 'APODERADO');
            // Para usuarios nuevos registrados, redirigir al formulario de postulación
            // no al dashboard directamente
            navigate('/postulacion');
        } catch (err: any) {
            const msg = err.message || 'Error al crear la cuenta. Intente nuevamente.';
            setError(msg);
            addNotification({ type: 'error', title: 'Error al registrarse', message: msg });
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
        <div className="min-h-screen bg-white flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8">
                <Card className="p-5 sm:p-8">
                    <div className="text-center">
                        <div className="flex justify-center mb-8">
                            <img src="/images/logoMTN.png" alt="Logo Monte Tabor y Nazaret" className="h-24" />
                        </div>
                        <h2 className="text-3xl sm:text-4xl font-bold text-azul-monte-tabor">
                            {showRegister ? 'Crear Cuenta' : 'Acceso de Apoderados'}
                        </h2>
                        <p className="mt-2 text-lg text-azul-monte-tabor font-light">
                            {showRegister
                                ? 'Para iniciar la postulación'
                                : 'Ingrese a su cuenta para postular'
                            }
                        </p>
                    </div>

                    {!showRegister ? (
                        // Formulario de Login
                        <form onSubmit={handleLogin} className="space-y-6 mt-8">
                            {error && (
                                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                                    {error}
                                </div>
                            )}

                            <Input
                                id="email"
                                label="Correo Electrónico"
                                type="email"
                                placeholder="apoderado@ejemplo.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                isRequired
                            />

                            <Input
                                id="password"
                                label="Contraseña"
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                isRequired
                                showPasswordToggle
                            />

                            <Button
                                type="submit"
                                variant="primary"
                                size="lg"
                                isLoading={isLoading}
                                loadingText="Iniciando sesión..."
                                className="w-full"
                            >
                                Iniciar Sesión
                            </Button>

                            <div className="text-center">
                                <button
                                    type="button"
                                    onClick={() => setShowRegister(true)}
                                    className="text-azul-monte-tabor hover:underline"
                                >
                                    ¿Primera vez? Crear cuenta para postular
                                </button>
                            </div>
                        </form>
                    ) : (
                        // Formulario de Registro
                        <form onSubmit={handleRegister} className="space-y-4">
                            {error && (
                                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                                    {error}
                                </div>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <Input
                                    id="firstName"
                                    label="Nombres"
                                    placeholder="Juan Carlos"
                                    value={registerData.firstName}
                                    onChange={(e) => updateRegisterField('firstName', e.target.value)}
                                    isRequired
                                />
                                <Input
                                    id="lastName"
                                    label="Apellidos"
                                    placeholder="Pérez González"
                                    value={registerData.lastName}
                                    onChange={(e) => updateRegisterField('lastName', e.target.value)}
                                    isRequired
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
                                isRequired
                            />

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <Input
                                    id="password-register"
                                    label="Contraseña"
                                    type="password"
                                    placeholder="••••••••"
                                    value={registerData.password}
                                    onChange={(e) => updateRegisterField('password', e.target.value)}
                                    isRequired
                                    showPasswordToggle
                                />
                                <Input
                                    id="confirmPassword"
                                    label="Confirmar Contraseña"
                                    type="password"
                                    placeholder="••••••••"
                                    value={registerData.confirmPassword}
                                    onChange={(e) => updateRegisterField('confirmPassword', e.target.value)}
                                    isRequired
                                    showPasswordToggle
                                />
                            </div>

                            <div className="flex gap-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setShowRegister(false)}
                                    className="flex-1"
                                >
                                    Volver al Login
                                </Button>
                                <Button
                                    type="submit"
                                    variant="primary"
                                    isLoading={isLoading}
                                    loadingText="Creando cuenta..."
                                    disabled={!isEmailVerified || isLoading}
                                    className="flex-1"
                                >
                                    {isEmailVerified ? 'Crear Cuenta' : 'Verificar Email Primero'}
                                </Button>
                            </div>
                        </form>
                    )}

                    <div className="text-center pt-6 border-t border-gray-200">
                        <a
                            href={microfrontendUrls.home}
                            className="text-azul-monte-tabor hover:underline text-sm font-semibold"
                        >
                            ← Volver al inicio
                        </a>
                    </div>
                </Card>

                {/* Información adicional */}
                <div className="text-center text-sm text-gris-piedra">
                    <p>¿Problemas para acceder? <a href="mailto:admisiones@mtn.cl" className="text-azul-monte-tabor hover:underline font-semibold">admisiones@mtn.cl</a></p>
                </div>
            </div>
        </div>
    );
};

export default ApoderadoLogin;