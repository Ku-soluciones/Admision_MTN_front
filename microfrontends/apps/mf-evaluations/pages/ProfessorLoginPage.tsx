import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { useFormValidation } from '../hooks/useFormValidation';
import { useNotifications } from '../context/AppContext';
import { professorAuthService } from '../services/professorAuthService';
import { microfrontendUrls } from '../utils/microfrontendUrls';
import { getStorageKey, BASE_STORAGE_KEYS, clearOtherSessions } from '../../../packages/backend-sdk/src/index';

const ProfessorLoginPage: React.FC = () => {
    const navigate = useNavigate();
    const { addNotification } = useNotifications();
    const [isLoggingIn, setIsLoggingIn] = useState(false);
    const [loginError, setLoginError] = useState<string | null>(null);

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

    const handleLogin = async () => {
        setLoginError(null);

        if (!validateForm()) {
            const msg = 'Por favor completa todos los campos correctamente';
            setLoginError(msg);
            addNotification({ type: 'error', title: 'Error de validación', message: msg });
            return;
        }

        setIsLoggingIn(true);

        try {
            console.log('Iniciando login para profesor:', data.email);

            clearOtherSessions('professor');

            // Usar el servicio de autenticación real
            const response = await professorAuthService.login({
                email: data.email,
                password: data.password
            });

            // Normalizar: BFF retorna datos en response.user, fallback a campos planos legacy
            const u = (response as any).user;
            const respRole      = u?.role      || (response as any).role      || '';
            const respFirstName = u?.firstName || (response as any).firstName || '';
            const respLastName  = u?.lastName  || (response as any).lastName  || '';
            const respEmail     = u?.email     || (response as any).email     || '';
            const respId        = u?.id        || (response as any).id        || 0;
            const respSubject   = u?.subject   || (response as any).subject   || null;

            if (response.success && response.token) {
                // Verificar que el rol sea de profesor (ADMIN excluido: tiene su propio portal)
                if (respRole && professorAuthService.isProfessorRole(respRole)) {

                    localStorage.setItem(getStorageKey(BASE_STORAGE_KEYS.CURRENT_PROFESSOR), JSON.stringify({
                        id: respId,
                        firstName: respFirstName,
                        lastName: respLastName,
                        email: respEmail,
                        role: respRole,
                        subject: respSubject,
                        subjects: getSubjectsByRole(respRole),
                        assignedGrades: ['prekinder', 'kinder', '1basico', '2basico', '3basico', '4basico', '5basico', '6basico', '7basico', '8basico', '1medio', '2medio', '3medio', '4medio'],
                    }));

                    addNotification({
                        type: 'success',
                        title: 'Bienvenido/a',
                        message: `Hola ${respFirstName} ${respLastName}`
                    });

                    navigate('/profesor');
                    
                } else {
                    const msg = 'Su cuenta no tiene acceso a este portal. Contacte al administrador.';
                    setLoginError(msg);
                    addNotification({ type: 'error', title: 'Acceso denegado', message: msg });
                }
            } else {
                const msg = response.message || 'Credenciales inválidas. Verifique su email y contraseña.';
                setLoginError(msg);
                addNotification({ type: 'error', title: 'Error de autenticación', message: msg });
            }
        } catch (error: any) {
            console.error('Error en login:', error);
            const msg = error.message || 'No se pudo iniciar sesión. Intente nuevamente.';
            setLoginError(msg);
            addNotification({ type: 'error', title: 'Error al iniciar sesión', message: msg });
        } finally {
            setIsLoggingIn(false);
        }
    };

    // Función para obtener las asignaturas según el rol
    const getSubjectsByRole = (role: string): string[] => {
        switch (role) {
            // Profesores ciclo inicial (pueden evaluar todo en su ciclo)
            case 'TEACHER_EARLY_CYCLE':
                return ['MATH', 'SPANISH'];
            
            // Profesores básica por asignatura
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
            
            // Profesores media por asignatura
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
            
            // Coordinadores (acceso a su área en todos los niveles)
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
            
            // Especialistas
            case 'CYCLE_DIRECTOR':
                return ['MATH', 'SPANISH', 'ENGLISH', 'SCIENCE', 'HISTORY'];
            case 'PSYCHOLOGIST':
                return ['PSYCHOLOGY'];
            case 'INTERVIEWER':
                return ['PSYCHOLOGY']; // Los entrevistadores trabajan principalmente con evaluaciones psicológicas y entrevistas familiares

            // Legacy roles
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
        <div className="min-h-screen bg-white flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8">
                <Card className="p-5 sm:p-8">
                    {/* Header */}
                    <div className="text-center">
                        <div className="flex justify-center mb-8">
                            <img src="/images/logoMTN.png" alt="Logo Monte Tabor y Nazaret" className="h-24" />
                        </div>
                        <h2 className="text-3xl sm:text-4xl font-bold text-azul-monte-tabor">
                            Portal de Profesores
                        </h2>
                        <p className="mt-2 text-lg text-azul-monte-tabor font-light">
                            Accede al sistema de evaluación
                        </p>
                    </div>

                    {/* Formulario de Login */}
                    <form onSubmit={(e) => { e.preventDefault(); handleLogin(); }} className="space-y-6 mt-8">
                        {loginError && (
                            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                                {loginError}
                            </div>
                        )}

                        <Input
                            id="email"
                            label="Email Institucional"
                            type="email"
                            placeholder="nombre@mtn.cl"
                            value={data.email}
                            onChange={(e) => updateField('email', e.target.value)}
                            onBlur={() => touchField('email')}
                            error={errors.email}
                            isRequired
                        />

                        <Input
                            id="password"
                            label="Contraseña"
                            type="password"
                            placeholder="••••••••"
                            value={data.password}
                            onChange={(e) => updateField('password', e.target.value)}
                            onBlur={() => touchField('password')}
                            error={errors.password}
                            isRequired
                            showPasswordToggle
                        />

                        <Button
                            type="submit"
                            variant="secondary"
                            size="lg"
                            isLoading={isLoggingIn}
                            loadingText="Verificando..."
                            className="w-full bg-dorado-nazaret hover:bg-opacity-90 text-azul-monte-tabor font-bold"
                        >
                            Iniciar Sesión
                        </Button>

                        <div className="text-center pt-6 border-t border-gray-200">
                            <a
                                href={microfrontendUrls.home}
                                className="text-azul-monte-tabor hover:underline text-sm font-semibold"
                            >
                                ← Volver al inicio
                            </a>
                        </div>
                    </form>
                </Card>

                {/* Información adicional */}
                <div className="text-center text-sm text-gris-piedra">
                    <p>¿Problemas para acceder? <a href="mailto:admisiones@mtn.cl" className="text-azul-monte-tabor hover:underline font-semibold">admisiones@mtn.cl</a></p>
                </div>
            </div>
        </div>
    );
};

export default ProfessorLoginPage;
