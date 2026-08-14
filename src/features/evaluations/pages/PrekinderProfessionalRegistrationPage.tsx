import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserRoundCheck } from 'lucide-react';
import Input from '../../admissions/components/ui/Input';
import Button from '../../admin/components/ui/Button';
import { professorAuthService } from '../services/professorAuthService';
import { prekinderApi } from '../../prekinder/services/api';
import {
    BASE_STORAGE_KEYS,
    clearOtherSessions,
    getStorageKey,
} from '../../../packages/backend-sdk/src/index';
import { GRADE_LEVEL_LABELS } from '../../../packages/shared-utils/src/gradeLevels';

export default function PrekinderProfessionalRegistrationPage() {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    async function submit(event: React.FormEvent) {
        event.preventDefault();
        setError('');

        if (!email.trim() || !password) {
            setError('Ingresa tu email y una contraseña.');
            return;
        }
        if (password.length < 6) {
            setError('La contraseña debe tener al menos 6 caracteres.');
            return;
        }

        setSubmitting(true);
        try {
            const normalizedEmail = email.trim().toLowerCase();
            await prekinderApi.completeProfessionalRegistration({
                email: normalizedEmail,
                password,
            });

            clearOtherSessions('professor');
            const response = await professorAuthService.login({
                email: normalizedEmail,
                password,
            });
            const user = (response as any).user;
            if (!response.success || !response.token || !user) {
                throw new Error('El registro se completó, pero no pudimos iniciar tu sesión. Ingresa desde el portal de profesores.');
            }

            localStorage.setItem(getStorageKey(BASE_STORAGE_KEYS.CURRENT_PROFESSOR), JSON.stringify({
                id: user.id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                role: user.role,
                subject: user.subject ?? null,
                subjects: [],
                assignedGrades: [...GRADE_LEVEL_LABELS],
            }));
            navigate('/profesor?section=prekinder', { replace: true });
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : 'No fue posible completar tu registro.');
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-white px-4 py-12">
            <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-lg sm:p-8">
                <div className="text-center">
                    <div className="mx-auto grid h-14 w-14 place-items-center rounded-xl bg-blue-50 text-azul-monte-tabor">
                        <UserRoundCheck className="h-7 w-7" aria-hidden="true" />
                    </div>
                    <h1 className="mt-5 text-2xl font-bold text-azul-monte-tabor">Completar registro Prekínder</h1>
                    <p className="mt-2 text-sm leading-6 text-gray-600">
                        Usa el correo con que coordinación creó tu perfil profesional y define tu contraseña.
                    </p>
                </div>

                <form className="mt-7 space-y-5" onSubmit={submit}>
                    {error && (
                        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
                            {error}
                        </div>
                    )}

                    <Input
                        id="prekinder-registration-email"
                        label="Email"
                        type="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder="nombre@mtn.cl"
                        disabled={submitting}
                        isRequired
                    />
                    <Input
                        id="prekinder-registration-password"
                        label="Contraseña"
                        type="password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        placeholder="Mínimo 6 caracteres"
                        disabled={submitting}
                        minLength={6}
                        isRequired
                        showPasswordToggle
                    />

                    <Button
                        type="submit"
                        variant="secondary"
                        size="lg"
                        className="w-full bg-dorado-nazaret font-bold text-azul-monte-tabor hover:bg-opacity-90"
                        isLoading={submitting}
                        loadingText="Creando acceso..."
                    >
                        Crear acceso e ingresar
                    </Button>
                </form>

                <p className="mt-6 border-t border-gray-200 pt-5 text-center text-sm text-gray-600">
                    ¿Ya completaste tu registro?{' '}
                    <Link className="font-semibold text-azul-monte-tabor hover:underline" to="/profesor/login">
                        Iniciar sesión
                    </Link>
                </p>
            </div>
        </div>
    );
}
