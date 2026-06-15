import React from 'react';
import Button from '../../admin/components/ui/Button';
import { FileText, Users, CheckCircle, AlertCircle } from 'lucide-react';
import { appUrls } from '../../admin/utils/appUrls';
import { useAdmissionHome } from '../hooks/useAdmissionConfig';
import type { AdmissionTimelineItem } from '../types/admissionConfig';

/* ────────────────────────────────────────────────────────
   Helpers para el timeline
   ──────────────────────────────────────────────────────── */

/** Determina el "status visual" de un ítem del timeline */
function resolveTimelineStatus(item: AdmissionTimelineItem, index: number, _total: number) {
    if (item.highlight) return index === 0 ? 'active' : 'upcoming';
    return 'future';
}

/* ────────────────────────────────────────────────────────
   Skeleton loaders
   ──────────────────────────────────────────────────────── */
const TimelineSkeleton: React.FC = () => (
    <div className="animate-pulse space-y-8 max-w-3xl mx-auto">
        {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-4">
                <div className="flex-1 space-y-2">
                    <div className="h-3 bg-gray-200 rounded w-32" />
                    <div className="h-4 bg-gray-200 rounded w-48" />
                    <div className="h-3 bg-gray-200 rounded w-full" />
                </div>
            </div>
        ))}
    </div>
);

/* ────────────────────────────────────────────────────────
   Componente principal
   ──────────────────────────────────────────────────────── */
const HomePage: React.FC = () => {
    const { data: homeConfig, isLoading: homeLoading, isError: homeError } = useAdmissionHome();

    const admissionSteps = [
        { title: 'Registro y Postulación', description: 'Complete el formulario en línea con los datos del postulante y la familia.', icon: <FileText className="w-12 h-12 text-dorado-nazaret" /> },
        { title: 'Entrevistas Familiares', description: 'Agende y asista a una entrevista con nuestro equipo de admisiones.', icon: <Users className="w-12 h-12 text-dorado-nazaret" /> },
        { title: 'Publicación de Resultados', description: 'Consulte los resultados del proceso de admisión en las fechas publicadas.', icon: <CheckCircle className="w-12 h-12 text-dorado-nazaret" /> },
    ];

    /* Timeline ordenado por "order" */
    const timeline = homeConfig
        ? [...homeConfig.timeline].sort((a, b) => a.order - b.order)
        : [];

    return (
        <div className="bg-blanco-pureza">
            {/* Hero Section */}
            <section className="relative text-blanco-pureza py-[7.5rem] sm:py-48 text-center bg-cover bg-center" style={{ backgroundImage: `url('https://ik.imagekit.io/11mmsqbe5/mtn-admisiones/colegio.png?updatedAt=1780848172602')` }}>
                <div className="absolute inset-0 bg-azul-monte-tabor" style={{ opacity: 0.85, filter: 'brightness(0.75)' }}></div>
                <div className="relative container mx-auto px-4 sm:px-6">
                    <h1 className="text-3xl sm:text-5xl md:text-6xl font-black font-serif mb-4 animate-fade-in-down">Formando líderes con espíritu de servicio</h1>
                    <p className="text-base sm:text-xl text-gray-200 mb-8 max-w-3xl mx-auto">Únanse a una comunidad educativa comprometida con la excelencia académica y formación católica</p>
                    <div className="flex justify-center">
                        <a href={appUrls.guardianRegister}>
                            <Button size="lg" variant="primary" className="!text-blanco-pureza">
                                Iniciar postulación
                            </Button>
                        </a>
                    </div>
                </div>
            </section>

            {/* Steps Section */}
            <section className="py-12 sm:py-20 bg-gray-50">
                <div className="container mx-auto px-4 sm:px-6">
                    <h2 className="text-2xl sm:text-4xl font-bold text-azul-monte-tabor mb-4 font-serif text-center">Proceso de Admisión</h2>
                    <p className="text-gris-piedra mb-12 max-w-2xl mx-auto text-center">Un camino claro y guiado para formar parte de nuestra comunidad educativa.</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
                        {admissionSteps.map((step, index) => (
                            <div
                                key={index}
                                className="bg-blanco-pureza p-8 rounded-2xl border border-gray-200 text-center"
                                style={{
                                    transition: 'transform 200ms cubic-bezier(0.23,1,0.32,1), box-shadow 200ms cubic-bezier(0.23,1,0.32,1)',
                                    animation: `mtn-fade-in 280ms ease-out ${index * 60}ms both`,
                                }}
                                onMouseEnter={(e) => { if (window.matchMedia('(hover:hover)').matches) { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-3px)'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 24px rgba(0,0,0,0.09)'; } }}
                                onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.transform = ''; (e.currentTarget as HTMLDivElement).style.boxShadow = ''; }}
                            >
                                <div className="flex justify-center mb-4">{step.icon}</div>
                                <h3 className="text-lg font-bold text-azul-monte-tabor mb-3">{step.title}</h3>
                                <p className="text-gris-piedra text-sm">{step.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Exam Portal CTA – sencillo, sin detalle de exámenes */}
            <section className="py-12 sm:py-20 bg-gray-100">
                <div className="container mx-auto px-4 sm:px-6 text-center">
                    <h2 className="text-2xl sm:text-4xl font-bold text-azul-monte-tabor mb-4 font-serif">Portal de Exámenes de Admisión</h2>
                    <p className="text-gris-piedra mb-8 max-w-3xl mx-auto text-base sm:text-lg">
                        Una vez completada tu postulación, podrás acceder al portal de exámenes para programar
                        y rendir las evaluaciones de Matemática, Lenguaje e Inglés.
                    </p>
                    <a href={appUrls.studentExams}>
                        <Button size="lg" variant="secondary">
                            Conocer Portal de Exámenes
                        </Button>
                    </a>
                </div>
            </section>

            {/* Timeline Section – datos desde Edge Config */}
            <section className="py-12 sm:py-20 bg-gray-50">
                <div className="container mx-auto px-4 sm:px-6">
                    <div className="text-center mb-12 sm:mb-16">
                        <h2 className="text-2xl sm:text-4xl font-bold text-azul-monte-tabor mb-3 font-serif">
                            {homeConfig?.title ?? 'Calendario de Admisión'}
                        </h2>
                        <p className="text-dorado-nazaret font-medium">
                            {homeConfig?.subtitle ?? 'Fechas clave e hitos importantes para tu postulación'}
                        </p>
                    </div>

                    {homeLoading && <TimelineSkeleton />}

                    {homeError && (
                        <div className="flex items-center justify-center gap-2 text-red-600">
                            <AlertCircle className="w-5 h-5" />
                            <span className="text-sm">No se pudo cargar el calendario de admisión.</span>
                        </div>
                    )}

                    {homeConfig && timeline.length > 0 && (
                        <>
                            {/* Desktop: alternating timeline */}
                            <div className="hidden sm:block relative max-w-3xl mx-auto">
                                <div className="absolute left-1/2 h-full w-0.5 bg-gray-300 transform -translate-x-1/2"></div>
                                {timeline.map((item, index) => {
                                    const status = resolveTimelineStatus(item, index, timeline.length);
                                    const isCurrent = index === 0 && item.highlight;
                                    return (
                                        <div key={item.id} className="flex items-center w-full mb-16">
                                            <div className="flex-1 pr-10 text-right">
                                                {index % 2 === 0 ? (
                                                    <>
                                                        <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${status === 'future' ? 'text-gray-400' : 'text-dorado-nazaret'}`}>{item.period}</p>
                                                        <p className={`font-bold text-base ${status === 'future' ? 'text-gray-400' : 'text-azul-monte-tabor'}`}>{item.title}</p>
                                                    </>
                                                ) : (
                                                    <p className="text-gris-piedra text-sm">{item.description}</p>
                                                )}
                                            </div>
                                            <div className="flex-shrink-0 z-10 w-3">
                                                <div className={`w-3 h-3 rounded-full ${isCurrent ? 'bg-dorado-nazaret' : status === 'future' ? 'bg-gray-300' : 'bg-azul-monte-tabor'}`}></div>
                                            </div>
                                            <div className="flex-1 pl-10 text-left">
                                                {index % 2 === 0 ? (
                                                    <p className="text-gris-piedra text-sm">{item.description}</p>
                                                ) : (
                                                    <>
                                                        <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${status === 'future' ? 'text-gray-400' : 'text-dorado-nazaret'}`}>{item.period}</p>
                                                        <p className={`font-bold text-base ${status === 'future' ? 'text-gray-400' : 'text-azul-monte-tabor'}`}>{item.title}</p>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            {/* Mobile: vertical list */}
                            <div className="sm:hidden space-y-4 max-w-sm mx-auto">
                                {timeline.map((item, index) => {
                                    const status = resolveTimelineStatus(item, index, timeline.length);
                                    const isCurrent = index === 0 && item.highlight;
                                    return (
                                        <div key={item.id} className={`flex items-start gap-4 p-4 rounded-lg border-l-4 ${isCurrent ? 'border-dorado-nazaret bg-amber-50' : status === 'future' ? 'border-gray-300 bg-gray-100' : 'border-azul-monte-tabor bg-blanco-pureza'}`}>
                                            <div className={`w-3 h-3 rounded-full mt-1 flex-shrink-0 ${isCurrent ? 'bg-dorado-nazaret' : status === 'future' ? 'bg-gray-300' : 'bg-azul-monte-tabor'}`}></div>
                                            <div>
                                                <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${status === 'future' ? 'text-gray-400' : 'text-dorado-nazaret'}`}>{item.period}</p>
                                                <p className={`font-bold text-sm mb-1 ${status === 'future' ? 'text-gray-400' : 'text-azul-monte-tabor'}`}>{item.title}</p>
                                                <p className="text-gris-piedra text-sm">{item.description}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </div>
            </section>

            {/* Sección de Contacto */}
            <section className="py-12 sm:py-16 bg-blanco-pureza border-t border-gray-200">
                <div className="container mx-auto px-4 sm:px-6 text-center">
                    <h2 className="text-2xl sm:text-3xl font-bold text-azul-monte-tabor mb-4 font-serif">¿Tienes Preguntas?</h2>
                    <p className="text-gris-piedra text-lg mb-8 max-w-2xl mx-auto">
                        Nuestro equipo está aquí para ayudarte en todo el proceso de admisión
                    </p>
                    <div className="flex justify-center">
                        <a href={`mailto:${import.meta.env.VITE_ADMISSIONS_EMAIL}?subject=Consulta%20proceso%20de%20admisi%C3%B3n`}>
                            <Button variant="secondary" size="lg">
                                Contactar Admisión
                            </Button>
                        </a>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default HomePage;
