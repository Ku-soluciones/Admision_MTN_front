import React, { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Input from '../components/ui/Input';
import RutInput from '../components/ui/RutInput';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import EmailVerification from '../components/ui/EmailVerification';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/AppContext';
import { microfrontendUrls } from '../utils/microfrontendUrls';
import {
    validatePassword,
    passwordsMatch,
    evaluatePasswordStrength,
} from '../../../packages/shared-ui/src/services/passwordService';

// Bloquear copiar / pegar / cortar / arrastrar en campos de contraseña
const blockClipboardProps = {
    onCopy: (e: React.ClipboardEvent<HTMLInputElement>) => e.preventDefault(),
    onPaste: (e: React.ClipboardEvent<HTMLInputElement>) => e.preventDefault(),
    onCut: (e: React.ClipboardEvent<HTMLInputElement>) => e.preventDefault(),
    onDrop: (e: React.DragEvent<HTMLInputElement>) => e.preventDefault(),
    onDragStart: (e: React.DragEvent<HTMLInputElement>) => e.preventDefault(),
};

/* Indicador de fortaleza segmentado + checklist (mismo patrón que ChangePasswordModal) */
const PasswordStrengthMeter: React.FC<{ password: string }> = ({ password }) => {
    const strength = useMemo(() => evaluatePasswordStrength(password), [password]);
    const levels = ['weak', 'fair', 'good', 'strong'] as const;
    const activeIndex = levels.indexOf(strength.level as typeof levels[number]);

    const palette = {
        weak:   { bar: 'bg-red-500',     text: 'text-red-600',     ring: 'bg-red-50',     label: 'Débil' },
        fair:   { bar: 'bg-orange-500',  text: 'text-orange-600',  ring: 'bg-orange-50',  label: 'Regular' },
        good:   { bar: 'bg-yellow-500',  text: 'text-yellow-700',  ring: 'bg-yellow-50',  label: 'Buena' },
        strong: { bar: 'bg-emerald-500', text: 'text-emerald-700', ring: 'bg-emerald-50', label: 'Muy segura' },
    } as const;
    const current = palette[(strength.level as keyof typeof palette) || 'weak'];

    const requirements: Array<{ key: string; label: string; ok: boolean }> = [
        { key: 'len',  label: 'Al menos 6 caracteres', ok: password.length >= 6 },
        { key: 'upp',  label: 'Una letra mayúscula',    ok: /[A-Z]/.test(password) },
        { key: 'low',  label: 'Una letra minúscula',    ok: /[a-z]/.test(password) },
        { key: 'num',  label: 'Un número',              ok: /[0-9]/.test(password) },
        { key: 'spec', label: 'Un carácter especial',   ok: /[^A-Za-z0-9]/.test(password) },
    ];

    return (
        <div className="mt-2 space-y-3">
            <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-500">Nivel de seguridad</span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${current.ring} ${current.text}`}>
                    {current.label}
                </span>
            </div>
            <div
                className="flex gap-1.5"
                role="progressbar"
                aria-valuenow={activeIndex + 1}
                aria-valuemin={0}
                aria-valuemax={4}
                aria-label="Fortaleza de la contraseña"
            >
                {levels.map((_, i) => (
                    <div
                        key={i}
                        className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                            i <= activeIndex ? current.bar : 'bg-gray-200'
                        }`}
                    />
                ))}
            </div>
            <ul className="grid grid-cols-2 gap-x-3 gap-y-1.5 pt-1">
                {requirements.map((r) => (
                    <li
                        key={r.key}
                        className={`flex items-center gap-1.5 text-xs transition-colors ${
                            r.ok ? 'text-emerald-600' : 'text-gray-500'
                        }`}
                    >
                        <span
                            className={`inline-flex items-center justify-center w-4 h-4 rounded-full transition-all duration-200 ${
                                r.ok ? 'bg-emerald-100' : 'bg-gray-100'
                            }`}
                            aria-hidden="true"
                        >
                            {r.ok ? (
                                <svg className="w-2.5 h-2.5 text-emerald-600" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                            ) : (
                                <span className="w-1 h-1 rounded-full bg-gray-400" />
                            )}
                        </span>
                        <span>{r.label}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
};

const ApoderadoLogin: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [showRegister, setShowRegister] = useState(
        new URLSearchParams(window.location.search).get('register') === '1'
    );
    const [isEmailVerified, setIsEmailVerified] = useState(false);
    const [registerStep, setRegisterStep] = useState<1 | 2>(1);

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
            await login(email, password, 'apoderado');

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

    const canContinueStep1 =
        registerData.firstName.trim().length > 0 &&
        registerData.lastName.trim().length > 0 &&
        registerData.rut.trim().length > 0 &&
        registerData.email.trim().length > 0 &&
        isEmailVerified;

    const handleContinueStep1 = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!registerData.firstName.trim() || !registerData.lastName.trim()) {
            setError('Por favor ingrese su nombre y apellidos');
            return;
        }
        if (!registerData.rut.trim()) {
            setError('Por favor ingrese su RUT');
            return;
        }
        if (!registerData.email.trim()) {
            setError('Por favor ingrese su correo electrónico');
            return;
        }
        if (!isEmailVerified) {
            setError('Debe verificar su correo electrónico con el código OTP antes de continuar');
            return;
        }

        setRegisterStep(2);
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

        // Validaciones de contraseña (mismas reglas que ChangePasswordModal)
        const passwordError = validatePassword(registerData.password);
        if (passwordError) {
            setError(passwordError);
            addNotification({ type: 'error', title: 'Contraseña inválida', message: passwordError });
            setIsLoading(false);
            return;
        }

        if (!passwordsMatch(registerData.password, registerData.confirmPassword)) {
            setError('Las contraseñas no coinciden');
            setIsLoading(false);
            return;
        }

        try {
            await register(registerData, 'apoderado');
            // Tras registro exitoso, redirigir al login del apoderado
            // para que pueda iniciar sesión y acceder a su dashboard
            window.location.href = microfrontendUrls.guardianLogin;
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

    // Estado en vivo de coincidencia de contraseñas
    const confirmState: 'default' | 'success' | 'error' = useMemo(() => {
        if (!registerData.confirmPassword) return 'default';
        return registerData.confirmPassword === registerData.password ? 'success' : 'error';
    }, [registerData.confirmPassword, registerData.password]);

    const confirmHelpText =
        confirmState === 'success' ? '✓ Las contraseñas coinciden' :
        confirmState === 'error'   ? 'Las contraseñas no coinciden' :
        undefined;

    // ¿Cumple la contraseña todos los requisitos?
    const passwordIsValid = useMemo(
        () => validatePassword(registerData.password) === null,
        [registerData.password]
    );

    const canSubmitRegister =
        isEmailVerified &&
        !isLoading &&
        passwordIsValid &&
        registerData.password === registerData.confirmPassword &&
        registerData.confirmPassword.length > 0;

    return (
        <div className="min-h-screen bg-white flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8">
                <Card className="p-5 sm:p-8">
                    {/* Header */}
                    <div className="text-center">
                        <div className="flex justify-center mb-8">
                            <img src="/images/logoMTN.png" alt="Logo Monte Tabor y Nazaret" className="h-24" />
                        </div>
                        <h2 className="text-3xl sm:text-4xl font-bold text-azul-monte-tabor">
                            {showRegister ? 'Crear Cuenta para Postular' : 'Portal de Familias'}
                        </h2>
                        <p className="mt-2 text-lg text-azul-monte-tabor font-light">
                            {showRegister
                                ? (registerStep === 1
                                    ? 'Paso 1 de 2: Verifica tu identidad y correo'
                                    : 'Paso 2 de 2: Datos de contacto y contraseña')
                                : 'Inicia sesión para acceder a tu portal'
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
                                variant="secondary"
                                size="lg"
                                isLoading={isLoading}
                                loadingText="Iniciando sesión..."
                                className="w-full bg-dorado-nazaret hover:bg-opacity-90 text-azul-monte-tabor font-bold"
                            >
                                Iniciar Sesión
                            </Button>

                            <div className="text-center pt-6 border-t border-gray-200">
                                <button
                                    type="button"
                                    onClick={() => setShowRegister(true)}
                                    className="text-azul-monte-tabor hover:underline text-sm font-semibold"
                                >
                                    ¿Primera vez? Crear cuenta para postular
                                </button>
                            </div>
                        </form>
                    ) : (
                        // Formulario de Registro (dividido en 2 pasos)
                        <div className="mt-8">
                            {/* Indicador de pasos: alineado con los campos del formulario */}
                            <div className="mb-6" aria-label="Progreso de registro">
                                <div className="flex items-center w-full">
                                    {/* Paso 1 */}
                                    <div className="flex items-center gap-2 shrink-0">
                                        <div
                                            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                                                registerStep >= 1
                                                    ? 'bg-azul-monte-tabor text-white'
                                                    : 'bg-gray-200 text-gray-500'
                                            }`}
                                            aria-current={registerStep === 1 ? 'step' : undefined}
                                        >
                                            {registerStep > 1 ? (
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                </svg>
                                            ) : (
                                                '1'
                                            )}
                                        </div>
                                        <span className={`text-xs font-medium ${registerStep >= 1 ? 'text-azul-monte-tabor' : 'text-gray-500'}`}>
                                            Datos personales
                                        </span>
                                    </div>

                                    {/* Conector flexible */}
                                    <div className={`flex-1 h-0.5 mx-3 transition-colors ${registerStep > 1 ? 'bg-azul-monte-tabor' : 'bg-gray-200'}`} />

                                    {/* Paso 2 */}
                                    <div className="flex items-center gap-2 shrink-0">
                                        <div
                                            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                                                registerStep >= 2
                                                    ? 'bg-azul-monte-tabor text-white'
                                                    : 'bg-gray-200 text-gray-500'
                                            }`}
                                            aria-current={registerStep === 2 ? 'step' : undefined}
                                        >
                                            2
                                        </div>
                                        <span className={`text-xs font-medium ${registerStep >= 2 ? 'text-azul-monte-tabor' : 'text-gray-500'}`}>
                                            Contacto y contraseña
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {registerStep === 1 ? (
                                // PASO 1: Datos personales + verificación de email
                                <form
                                    onSubmit={handleContinueStep1}
                                    className="space-y-6"
                                    autoComplete="off"
                                >
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
                                            autoComplete="off"
                                        />
                                        <Input
                                            id="lastName"
                                            label="Apellidos"
                                            placeholder="Pérez González"
                                            value={registerData.lastName}
                                            onChange={(e) => updateRegisterField('lastName', e.target.value)}
                                            isRequired
                                            autoComplete="off"
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

                                    {/* Botón Continuar: oculto hasta que OTP esté validado, con entrada sutil */}
                                    <div
                                        aria-hidden={!isEmailVerified}
                                        className={`overflow-hidden transition-all duration-500 ease-out ${
                                            isEmailVerified
                                                ? 'max-h-24 opacity-100 translate-y-0'
                                                : 'max-h-0 opacity-0 -translate-y-1 pointer-events-none'
                                        }`}
                                    >
                                        <Button
                                            type="submit"
                                            variant="primary"
                                            disabled={!canContinueStep1}
                                            className="w-full"
                                            tabIndex={isEmailVerified ? 0 : -1}
                                        >
                                            Continuar →
                                        </Button>
                                    </div>
                                </form>
                            ) : (
                                // PASO 2: Teléfono y contraseña
                                <form
                                    onSubmit={handleRegister}
                                    className="space-y-6"
                                    autoComplete="off"
                                >
                                    {error && (
                                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                                            {error}
                                        </div>
                                    )}

                                    {/* Resumen de datos del paso 1 (solo lectura) */}
                                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs text-gray-600 space-y-1">
                                        <div><span className="font-semibold text-gray-700">Nombre:</span> {registerData.firstName} {registerData.lastName}</div>
                                        <div><span className="font-semibold text-gray-700">RUT:</span> {registerData.rut}</div>
                                        <div className="flex items-center gap-1">
                                            <span className="font-semibold text-gray-700">Email:</span> {registerData.email}
                                            <span className="inline-flex items-center gap-0.5 text-emerald-600 ml-1">
                                                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                </svg>
                                                verificado
                                            </span>
                                        </div>
                                    </div>

                                    <Input
                                        id="phone"
                                        label="Teléfono"
                                        type="tel"
                                        placeholder="+569 1234 5678"
                                        value={registerData.phone}
                                        onChange={(e) => updateRegisterField('phone', e.target.value)}
                                        isRequired
                                        autoComplete="off"
                                    />

                                    <div>
                                        <Input
                                            id="password-register"
                                            label="Contraseña"
                                            type="password"
                                            placeholder="••••••••"
                                            value={registerData.password}
                                            onChange={(e) => updateRegisterField('password', e.target.value)}
                                            isRequired
                                            showPasswordToggle
                                            autoComplete="new-password"
                                            {...blockClipboardProps}
                                        />
                                        {registerData.password && (
                                            <PasswordStrengthMeter password={registerData.password} />
                                        )}
                                    </div>

                                    <Input
                                        id="confirmPassword"
                                        label="Confirmar Contraseña"
                                        type="password"
                                        placeholder="••••••••"
                                        value={registerData.confirmPassword}
                                        onChange={(e) => updateRegisterField('confirmPassword', e.target.value)}
                                        isRequired
                                        showPasswordToggle
                                        autoComplete="new-password"
                                        {...blockClipboardProps}
                                        error={confirmState === 'error' ? confirmHelpText : undefined}
                                        helpText={confirmState === 'success' ? confirmHelpText : undefined}
                                    />

                                    <div className="flex gap-4">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => {
                                                setRegisterStep(1);
                                                setError('');
                                            }}
                                            disabled={isLoading}
                                            className="flex-1"
                                        >
                                            ← Atrás
                                        </Button>
                                        <Button
                                            type="submit"
                                            variant="primary"
                                            isLoading={isLoading}
                                            loadingText="Creando cuenta..."
                                            disabled={!canSubmitRegister || registerData.phone.trim().length === 0}
                                            className="flex-1"
                                        >
                                            Crear Cuenta
                                        </Button>
                                    </div>
                                </form>
                            )}
                        </div>
                    )}

                    {/* Volver al inicio */}
                    <div className="mt-6 pt-6 border-t border-gray-200 text-center">
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
