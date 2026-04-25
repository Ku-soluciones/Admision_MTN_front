import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import EmailVerification from '../components/ui/EmailVerification';
import { useNotifications } from '../context/AppContext';

const ApoderadoLogin: React.FC = () => {
    const [email, setEmail] = useState('');
    const [isEmailVerified, setIsEmailVerified] = useState(false);
    const navigate = useNavigate();
    const { addNotification } = useNotifications();
    const [searchParams] = useSearchParams();
    const redirectTo = searchParams.get('redirect') || '/postulacion';

    const handleEmailChange = (newEmail: string) => {
        setEmail(newEmail);
        setIsEmailVerified(false);
    };

    const handleVerificationComplete = (isVerified: boolean) => {
        setIsEmailVerified(isVerified);

        if (isVerified) {
            addNotification({
                type: 'success',
                title: 'Email Verificado',
                message: 'Tu email ha sido verificado correctamente. Accediendo al formulario...'
            });

            // Guardar email en localStorage para referencia
            localStorage.setItem('apoderado_email', email);

            // Redirigir después de 2 segundos
            setTimeout(() => {
                console.log('✅ Email verificado, redirigiendo a:', redirectTo);
                navigate(redirectTo);
            }, 2000);
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
                            Portal de Familias
                        </h1>
                        <p className="text-white/90 text-sm text-center">
                            Verifica tu email para continuar con la postulación
                        </p>
                    </div>

                    {/* Contenido */}
                    <div className="px-8 py-8 space-y-6">
                        {!isEmailVerified ? (
                            <div className="space-y-6 animate-slide-in">
                                <div className="text-center text-sm text-gray-700">
                                    <p className="mb-4">Ingresa tu correo electrónico para verificarlo</p>
                                </div>

                                <EmailVerification
                                    email={email}
                                    onEmailChange={handleEmailChange}
                                    onVerificationComplete={handleVerificationComplete}
                                    placeholder="tu.correo@ejemplo.com"
                                    isRequired={true}
                                />
                            </div>
                        ) : (
                            <div className="space-y-4 animate-slide-in text-center">
                                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                                    <p className="text-green-700 font-semibold">
                                        ✅ Email Verificado
                                    </p>
                                    <p className="text-green-600 text-sm mt-2">
                                        Redirigiendo al formulario de postulación...
                                    </p>
                                </div>
                                <div className="flex justify-center">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-azul-monte-tabor"></div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="mt-6 text-center text-white/80 text-sm">
                    <button
                        onClick={() => navigate('/')}
                        className="text-white font-semibold hover:text-blue-200 transition-colors"
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

export default ApoderadoLogin;
