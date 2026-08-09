import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { ArrowRight, Clock3, GraduationCap, RefreshCw, School } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { prekinderApi, type PrekinderApplicationOption } from '../../prekinder/services/api';
import { appUrls } from '../../admin/utils/appUrls';
import { useProcessActiveGuard } from '../../../packages/shared-utils/src/hooks/useProcessActiveGuard';
import { useProcessActivePrekinder } from '../../../packages/shared-utils/src/hooks/useProcessActivePrekinder';

const LOGIN_REDIRECT = `/apoderado/login?redirect=${encodeURIComponent('/postulacion/elegir')}`;

const ApplicationTypeChooser = () => {
    const { isAuthenticated, isLoading: sessionLoading } = useAuth();
    const {
        isProcessActive: generalProcessActive,
        isLoading: generalProcessLoading,
        error: generalProcessError,
    } = useProcessActiveGuard();
    const {
        isProcessActive: prekinderProcessActive,
        isLoading: prekinderFlagLoading,
        error: prekinderFlagError,
    } = useProcessActivePrekinder();
    const [options, setOptions] = useState<PrekinderApplicationOption[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const loadAvailability = async () => {
        setLoading(true);
        setError('');
        try {
            setOptions(await prekinderApi.applicationOptions());
        } catch {
            setError('No pudimos confirmar la disponibilidad de Prekínder. Puedes continuar con otro curso o intentarlo nuevamente.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!isAuthenticated || prekinderFlagLoading) return;
        if (!prekinderProcessActive) {
            setOptions([]);
            setLoading(false);
            setError('');
            return;
        }
        void loadAvailability();
    }, [isAuthenticated, prekinderFlagLoading, prekinderProcessActive]);

    if (sessionLoading) {
        return (
            <div className="flex min-h-[55vh] items-center justify-center" role="status">
                <RefreshCw className="mr-3 animate-spin text-azul-monte-tabor motion-reduce:animate-none" size={22} />
                Verificando tu sesión
            </div>
        );
    }

    if (!isAuthenticated) return <Navigate to={LOGIN_REDIRECT} replace />;

    const activePrekinder = prekinderProcessActive ? options[0] : undefined;
    const prekinderAvailabilityLoading =
        prekinderFlagLoading || (prekinderProcessActive && loading);

    return (
        <div className="bg-gray-50 px-4 py-10 sm:px-6 sm:py-16">
            <section className="mx-auto max-w-5xl" aria-labelledby="application-choice-title">
                <div className="max-w-3xl">
                    <h1 id="application-choice-title" className="font-serif text-3xl font-bold text-azul-monte-tabor sm:text-4xl">
                        ¿A qué nivel quieres postular?
                    </h1>
                    <p className="mt-3 text-base leading-7 text-gris-piedra">
                        Cada alternativa tiene requisitos y calendario propios. Tu elección determina el formulario y proceso que verás a continuación.
                    </p>
                </div>

                {(error || prekinderFlagError || generalProcessError) && (
                    <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950" role="alert">
                        <span>
                            {error
                                || (prekinderFlagError && 'No pudimos consultar la activación de Prekínder.')
                                || 'No pudimos confirmar la disponibilidad de los otros cursos.'}
                        </span>
                        {error && (
                            <button
                                type="button"
                                onClick={() => void loadAvailability()}
                                className="min-h-11 font-bold underline underline-offset-4"
                            >
                                Reintentar
                            </button>
                        )}
                    </div>
                )}

                <section className="mt-8 grid overflow-hidden rounded-2xl border border-gray-200 bg-blanco-pureza md:grid-cols-2" aria-label="Tipos de postulación">
                    {activePrekinder ? (
                        <a
                            href={appUrls.prekinderApplication}
                            className="group flex min-h-72 flex-col p-6 transition-colors hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-azul-monte-tabor sm:p-8"
                        >
                            <School className="text-dorado-nazaret" size={34} aria-hidden="true" />
                            <h2 className="mt-6 font-serif text-2xl font-bold text-azul-monte-tabor">Prekínder</h2>
                            <p className="mt-2 text-sm leading-6 text-gris-piedra">
                                {activePrekinder.name}. Completarás la postulación por etapas y recibirás aquí las comunicaciones del proceso.
                            </p>
                            <span className="mt-auto flex min-h-11 items-center justify-between pt-6 text-sm font-bold text-azul-monte-tabor">
                                Comenzar postulación Prekínder
                                <ArrowRight className="transition-transform group-hover:translate-x-1" size={20} aria-hidden="true" />
                            </span>
                        </a>
                    ) : (
                        <div className="flex min-h-72 flex-col bg-gray-50 p-6 sm:p-8" aria-disabled="true">
                            {prekinderAvailabilityLoading ? (
                                <RefreshCw className="animate-spin text-azul-monte-tabor motion-reduce:animate-none" size={32} aria-hidden="true" />
                            ) : (
                                <Clock3 className="text-gris-piedra" size={34} aria-hidden="true" />
                            )}
                            <h2 className="mt-6 font-serif text-2xl font-bold text-azul-monte-tabor">Prekínder</h2>
                            <p className="mt-2 text-sm leading-6 text-gris-piedra">
                                {prekinderFlagLoading
                                    ? 'Estamos verificando si el proceso se encuentra habilitado.'
                                    : !prekinderProcessActive
                                        ? 'El proceso de Prekínder no se encuentra habilitado en este momento.'
                                        : loading
                                            ? 'Estamos verificando si existe una etapa disponible.'
                                            : 'En este momento no existe una etapa abierta para nuevas postulaciones.'}
                            </p>
                            <span className="mt-auto pt-6 text-sm font-bold text-gris-piedra">
                                {prekinderAvailabilityLoading ? 'Consultando disponibilidad' : 'Postulación no disponible'}
                            </span>
                        </div>
                    )}

                    {generalProcessActive ? (
                        <a
                            href={appUrls.admissions}
                            className="group flex min-h-72 flex-col border-t border-gray-200 p-6 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-azul-monte-tabor sm:p-8 md:border-l md:border-t-0"
                        >
                            <GraduationCap className="text-dorado-nazaret" size={36} aria-hidden="true" />
                            <h2 className="mt-6 font-serif text-2xl font-bold text-azul-monte-tabor">Otros cursos</h2>
                            <p className="mt-2 text-sm leading-6 text-gris-piedra">
                                Continúa con el formulario general para los demás niveles disponibles en el proceso de admisión.
                            </p>
                            <span className="mt-auto flex min-h-11 items-center justify-between pt-6 text-sm font-bold text-azul-monte-tabor">
                                Revisar cursos disponibles
                                <ArrowRight className="transition-transform group-hover:translate-x-1" size={20} aria-hidden="true" />
                            </span>
                        </a>
                    ) : (
                        <div className="flex min-h-72 flex-col border-t border-gray-200 bg-gray-50 p-6 sm:p-8 md:border-l md:border-t-0" aria-disabled="true">
                            {generalProcessLoading ? (
                                <RefreshCw className="animate-spin text-azul-monte-tabor motion-reduce:animate-none" size={32} aria-hidden="true" />
                            ) : (
                                <Clock3 className="text-gris-piedra" size={34} aria-hidden="true" />
                            )}
                            <h2 className="mt-6 font-serif text-2xl font-bold text-azul-monte-tabor">Otros cursos</h2>
                            <p className="mt-2 text-sm leading-6 text-gris-piedra">
                                {generalProcessLoading
                                    ? 'Estamos verificando el proceso general de admisión.'
                                    : 'En este momento el proceso general de admisión no está disponible.'}
                            </p>
                            <span className="mt-auto pt-6 text-sm font-bold text-gris-piedra">
                                {generalProcessLoading ? 'Consultando disponibilidad' : 'Postulación no disponible'}
                            </span>
                        </div>
                    )}
                </section>
            </section>
        </div>
    );
};

export default ApplicationTypeChooser;
