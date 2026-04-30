import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/AppContext';
import { microfrontendUrls } from '../utils/microfrontendUrls';

const AdminLogin: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { login } = useAuth();
    const { addNotification } = useNotifications();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const redirectTo = searchParams.get('redirect') || '/admin';

    const handleLogin = async (event: React.FormEvent) => {
        event.preventDefault();
        setError('');

        if (!email || !password) {
            const msg = 'Por favor complete todos los campos';
            setError(msg);
            addNotification({ type: 'error', title: 'Campos requeridos', message: msg });
            return;
        }

        setIsLoading(true);
        try {
            await login(email, password, 'ADMIN');

            const storedUser = JSON.parse(localStorage.getItem('authenticated_user') || 'null');
            if (!storedUser || storedUser.role !== 'ADMIN') {
                localStorage.removeItem('auth_token');
                localStorage.removeItem('authenticated_user');

                if (storedUser?.role === 'APODERADO') {
                    window.location.href = microfrontendUrls.guardianDashboard;
                    return;
                }

                window.location.href = microfrontendUrls.professorDashboard;
                return;
            }

            navigate(redirectTo, { replace: true });
        } catch (err: any) {
            const msg = err.message || 'Credenciales inválidas. Verifique su email y contraseña.';
            setError(msg);
            addNotification({ type: 'error', title: 'Error al iniciar sesión', message: msg });
        } finally {
            setIsLoading(false);
        }
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
                            Portal Administrador
                        </h2>
                        <p className="mt-2 text-lg text-azul-monte-tabor font-light">
                            Accede a la consola de administración
                        </p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-6 mt-8">
                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                                {error}
                            </div>
                        )}

                        <Input
                            id="admin-email"
                            label="Correo Electrónico"
                            type="email"
                            placeholder="admin@mtn.cl"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            isRequired
                        />

                        <Input
                            id="admin-password"
                            label="Contraseña"
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
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
                    </form>
                </Card>
            </div>
        </div>
    );
};

export default AdminLogin;
