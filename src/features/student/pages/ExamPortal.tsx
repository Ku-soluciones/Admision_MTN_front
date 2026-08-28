import React from 'react';
import { Link } from 'react-router-dom';
import { useAdmissionExams } from '../../admissions/hooks/useAdmissionConfig';
import { AlertCircle, ArrowRight, BookOpen, Calendar, Clock, FileText, RefreshCw } from 'lucide-react';

/* ────────────────────────────────────────────────────────
   Ícono por id de examen
   ──────────────────────────────────────────────────────── */
const getSubjectIcon = (subjectId: string) => {
    switch (subjectId) {
        case 'math':
            return <FileText className="w-5 h-5" aria-hidden="true" />;
        case 'language':
            return <BookOpen className="w-5 h-5" aria-hidden="true" />;
        default:
            return <FileText className="w-5 h-5" aria-hidden="true" />;
    }
};

/* ────────────────────────────────────────────────────────
   Skeleton loader
   ──────────────────────────────────────────────────────── */
const ExamPortalSkeleton: React.FC = () => (
    <div className="animate-pulse border-y border-gray-200">
        {[1, 2, 3].map((item) => (
            <div key={item} className="grid gap-4 py-6 sm:grid-cols-[minmax(0,1fr)_11rem_10rem] sm:items-center">
                <div className="space-y-3">
                    <div className="h-5 w-40 rounded bg-gray-200" />
                    <div className="h-3 max-w-xl rounded bg-gray-100" />
                </div>
                <div className="h-4 w-32 rounded bg-gray-200" />
                <div className="h-10 rounded bg-gray-200" />
            </div>
        ))}
    </div>
);

const ExamPortal: React.FC = () => {
    const { data: examsConfig, isLoading, isError, isFetching, refetch } = useAdmissionExams();

    /* Extraer el proceso de exámenes (viene en el primer examen que lo tenga) */
    const examProcess = examsConfig?.exams.find((exam) => exam.process)?.process ?? null;
    const processSteps = examProcess
        ? [...examProcess.steps].sort((a, b) => a.order - b.order)
        : [];

    return (
        <div className="min-h-screen bg-gray-50 py-8 sm:py-12">
            <div className="container mx-auto max-w-5xl px-4 sm:px-6">
                {/* Header */}
                <header className="mb-10 max-w-3xl">
                    <h1 className="mb-4 text-balance font-serif text-3xl font-bold text-azul-monte-tabor sm:text-4xl">
                        Portal de Exámenes de Admisión
                    </h1>
                    <p className="max-w-2xl text-base leading-relaxed text-gris-piedra sm:text-lg">
                        Consulta las asignaturas, fechas y requisitos para preparar tu proceso de admisión.
                    </p>
                </header>

                {isLoading && <ExamPortalSkeleton />}

                {isError && !examsConfig && (
                    <div className="max-w-2xl border border-red-200 bg-white p-5" role="alert">
                        <div className="flex items-start gap-3">
                            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rojo-sagrado" aria-hidden="true" />
                            <div>
                                <h2 className="font-semibold text-azul-monte-tabor">No pudimos cargar los exámenes</h2>
                                <p className="mt-1 text-sm leading-relaxed text-gris-piedra">
                                    Revisa tu conexión e inténtalo nuevamente. Si el problema continúa, contacta al equipo de admisión.
                                </p>
                                <button
                                    type="button"
                                    onClick={() => void refetch()}
                                    disabled={isFetching}
                                    className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-lg bg-azul-monte-tabor px-4 py-2 text-sm font-semibold text-blanco-pureza transition-colors duration-150 hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-azul-monte-tabor focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-gray-500"
                                >
                                    <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin motion-reduce:animate-none' : ''}`} aria-hidden="true" />
                                    {isFetching ? 'Reintentando…' : 'Reintentar'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {examsConfig && (
                    <>
                        {/* Important Notice – desde Edge Config */}
                        {examsConfig.importantInfo.length > 0 && (
                            <section className="mb-10 border-y border-amber-200 bg-amber-50 px-5 py-5 sm:px-6" aria-labelledby="exam-notice-title">
                                <div className="flex items-start gap-3">
                                    <Calendar className="mt-0.5 h-5 w-5 shrink-0 text-dorado-nazaret" aria-hidden="true" />
                                    <div>
                                        <h2 id="exam-notice-title" className="font-semibold text-azul-monte-tabor">{examsConfig.title}</h2>
                                        <ul className="mt-2 space-y-1 text-sm leading-relaxed text-gris-piedra">
                                            {examsConfig.importantInfo.map((info, index) => (
                                                <li key={index}>{info}</li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            </section>
                        )}

                        {/* Subjects Grid – desde Edge Config */}
                        <section aria-labelledby="exam-list-title">
                            <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                                <h2 id="exam-list-title" className="text-balance text-xl font-bold text-azul-monte-tabor">Próximos exámenes</h2>
                                <p className="text-sm text-gris-piedra">Fechas, horarios y contenidos por asignatura.</p>
                            </div>
                            <div className="border-y border-gray-200">
                                {examsConfig.exams.length > 0 ? examsConfig.exams.map((exam) => (
                                    <article key={exam.id} className="grid gap-5 py-6 sm:grid-cols-[minmax(0,1fr)_12rem_10.5rem] sm:items-center">
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-3">
                                                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-azul-monte-tabor">
                                                    {getSubjectIcon(exam.id)}
                                                </span>
                                                <h3 className="text-balance text-lg font-bold text-azul-monte-tabor">{exam.name}</h3>
                                            </div>
                                            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-gris-piedra">{exam.description}</p>
                                            {/* Subject Stats */}
                                            <p className="mt-3 text-sm text-gris-piedra">
                                                {exam.durationLabel} · {exam.questions} preguntas · Puntaje mínimo {exam.minimumScoreLabel}
                                            </p>
                                        </div>

                                        {/* Available Dates */}
                                        <div className="border-l-0 border-gray-200 sm:border-l sm:pl-5">
                                            {exam.availableDates.length > 0 ? (
                                                <>
                                                    <p className="text-sm font-semibold text-gris-piedra">Próxima fecha</p>
                                                    <p className="mt-1 text-sm font-semibold text-azul-monte-tabor">{exam.availableDates[0].dayLabel}</p>
                                                    <p className="mt-1 flex items-center gap-2 text-sm text-gris-piedra">
                                                        <Clock className="h-4 w-4 text-dorado-nazaret" aria-hidden="true" />
                                                        {exam.availableDates[0].startTime} – {exam.availableDates[0].endTime}
                                                    </p>
                                                    {exam.availableDates.length > 1 && <p className="mt-2 text-sm text-gris-piedra">+{exam.availableDates.length - 1} fecha{exam.availableDates.length > 2 ? 's' : ''} disponible{exam.availableDates.length > 2 ? 's' : ''}</p>}
                                                </>
                                            ) : (
                                                <p className="text-sm text-gris-piedra">Fechas por confirmar</p>
                                            )}
                                        </div>

                                        {/* Action Button */}
                                        <Link
                                            to={`/examenes/${exam.id}`}
                                            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-azul-monte-tabor px-4 py-2 text-sm font-semibold text-azul-monte-tabor transition-colors duration-150 hover:bg-azul-monte-tabor hover:text-blanco-pureza focus:outline-none focus:ring-2 focus:ring-azul-monte-tabor focus:ring-offset-2 active:bg-blue-800 active:text-blanco-pureza"
                                        >
                                            Ver contenido
                                            <ArrowRight className="h-4 w-4" aria-hidden="true" />
                                        </Link>
                                    </article>
                                )) : (
                                    <p className="py-8 text-sm leading-relaxed text-gris-piedra">
                                        Aún no hay exámenes publicados. Vuelve a revisar este portal próximamente.
                                    </p>
                                )}
                            </div>
                        </section>
                    </>
                )}

                {/* Process Timeline – desde Edge Config (campo process del primer examen) */}
                {examProcess && (
                    <section className="mt-14 max-w-3xl" aria-labelledby="process-title">
                        <div className="mb-6">
                            <h2 id="process-title" className="text-xl font-bold text-azul-monte-tabor">{examProcess.title}</h2>
                            <p className="mt-2 text-sm leading-relaxed text-gris-piedra">{examProcess.subtitle}</p>
                        </div>
                        {/* Desktop: alternating timeline */}
                        <ol className="border-t border-gray-200">
                            {processSteps.map((step) => {
                                const label = step.phase ?? step.statusLabel;
                                const fullDescription = [step.description, step.extraInfo].filter(Boolean).join('. ');
                                return (
                                    <li key={step.id} className="grid gap-3 border-b border-gray-200 py-5 sm:grid-cols-[3rem_minmax(0,1fr)]">
                                        <span className="font-serif text-2xl font-bold text-dorado-nazaret">{step.stepNumber}</span>
                                        <div>
                                            {label && <p className="text-sm font-semibold text-dorado-nazaret">{label}</p>}
                                            <h3 className="mt-1 font-semibold text-azul-monte-tabor">{step.title}</h3>
                                            <p className="mt-1 text-sm leading-relaxed text-gris-piedra">{fullDescription}</p>
                                        </div>
                                    </li>
                                );
                            })}
                        </ol>
                        {/* Mobile: vertical steps */}
                    </section>
                )}
            </div>
        </div>
    );
};

export default ExamPortal;
