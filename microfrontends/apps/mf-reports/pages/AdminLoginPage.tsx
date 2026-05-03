
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/AppContext';

const LoginPage: React.FC = () => {
    const [userType, setUserType] = useState<'familia' | 'admin'>('familia');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [loginError, setLoginError] = useState<string | null>(null);
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

    return (
        <div className="min-h-[calc(100vh-250px)] flex items-center justify-center bg-gray-50 p-4">
            <div className="max-w-md w-full">
                <div className="flex justify-center mb-6">
                     <Link to="/" className="flex items-center gap-3">
                        <img src="/images/logoMTN.png" alt="Logo Colegio Monte Tabor y Nazaret" className="h-14" />
                    </Link>
                </div>
                <Card className="p-5 sm:p-8 shadow-2xl">
                    <div className="flex justify-center mb-6 gap-4">
                        <button
                            className={`px-4 py-2 rounded-lg font-bold border transition-colors duration-200 ${userType === 'familia' ? 'bg-dorado-nazaret text-azul-monte-tabor border-dorado-nazaret' : 'bg-white text-gris-piedra border-gray-300'}`}
                            onClick={() => setUserType('familia')}
                        >
                            Familia
                        </button>
                        <button
                            className={`px-4 py-2 rounded-lg font-bold border transition-colors duration-200 ${userType === 'admin' ? 'bg-azul-monte-tabor text-blanco-pureza border-azul-monte-tabor' : 'bg-white text-gris-piedra border-gray-300'}`}
                            onClick={() => setUserType('admin')}
                        >
                            Administrador
                        </button>
                    </div>
                    <h1 className="text-2xl font-bold text-azul-monte-tabor text-center mb-1">
                        {userType === 'familia' ? 'Portal de Familias' : 'Acceso Administrativo'}
                    </h1>
                    <p className="text-center text-gris-piedra mb-6">
                        {userType === 'familia' ? 'Bienvenido/a. Ingrese para ver el estado de su postulación.' : 'Ingrese sus credenciales para continuar.'}
                    </p>
                    <form className="space-y-6" onSubmit={async (e) => {
                        e.preventDefault();
                        setIsLoading(true);
                        setLoginError(null);
                        
                        try {
                            const portalRole = userType === 'admin' ? 'ADMIN' : 'APODERADO';
                            await login(email, password, portalRole);

                            if (userType === 'familia') {
                                navigate('/familia');
                            } else {
                                navigate('/admin');
                            }
                        } catch (error: any) {
                            const msg = error.message || 'Credenciales inválidas. Verifique su email y contraseña.';
                            setLoginError(msg);
                            addNotification({
                                type: 'error',
                                title: 'Error de autenticación',
                                message: msg
                            });
                        } finally {
                            setIsLoading(false);
                        }
                    }}>
                        <Input
                            id="email"
                            label="Correo Electrónico"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder={userType === 'familia' ? 'familia@ejemplo.com' : 'admin@mtn.cl'}
                            isRequired
                        />
                        <Input
                            id="password"
                            label="Contraseña"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            isRequired
                            showPasswordToggle
                        />
                        <div className="text-right">
                            <a href="#" className="text-sm text-azul-monte-tabor hover:underline">¿Olvidó su contraseña?</a>
                        </div>
                        {loginError && (
                            <div className="flex items-start gap-2 bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded-lg text-sm">
                                <span className="mt-0.5 shrink-0"></span>
                                <span>{loginError}</span>
                            </div>
                        )}
                        <Button 
                            type="submit" 
                            size="lg" 
                            variant={userType === 'familia' ? 'primary' : 'secondary'} 
                            className="w-full"
                            isLoading={isLoading}
                            loadingText="Ingresando..."
                        >
                            Ingresar
                        </Button>
                    </form>
                    {userType === 'familia' && (
                        <div className="mt-6 text-center text-sm text-gris-piedra">
                            <p>
                                ¿Primera vez aquí?{' '}
                                <Link to="/postulacion" className="font-semibold text-azul-monte-tabor hover:underline">
                                    Inicie su postulación para crear una cuenta.
                                </Link>
                            </p>
                        </div>
                    )}
                </Card>
                <p className="text-center mt-6 text-sm text-gris-piedra">
                    {userType === 'familia' ? (
                        <>
                            ¿Es administrador?{' '}
                            <button className="font-semibold text-azul-monte-tabor hover:underline" onClick={() => setUserType('admin')}>
                                Ingrese aquí
                            </button>
                        </>
                    ) : (
                        <>
                    ¿Es usted una familia?{' '}
                            <button className="font-semibold text-azul-monte-tabor hover:underline" onClick={() => setUserType('familia')}>
                        Acceda al portal familiar
                            </button>
                        </>
                    )}
                </p>
            </div>
        </div>
    );
};

export default LoginPage;