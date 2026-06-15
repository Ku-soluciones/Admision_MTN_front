import React from 'react';
import { Link } from 'react-router-dom';
import Card from '../../admin/components/ui/Card';
import Button from '../../admin/components/ui/Button';
import Badge from '../../admin/components/ui/Badge';
import { useAdmissionExams } from '../../admissions/hooks/useAdmissionConfig';
import { Clock, BookOpen, Users, Calendar, Calculator, Globe, AlertCircle } from 'lucide-react';

/* ────────────────────────────────────────────────────────
   Ícono por id de examen
   ──────────────────────────────────────────────────────── */
const getSubjectIcon = (subjectId: string) => {
    switch (subjectId) {
        case 'math':
            return <Calculator className="w-8 h-8 text-blue-600" />;
        case 'language':
            return <BookOpen className="w-8 h-8 text-green-600" />;
        case 'english':
            return <Globe className="w-8 h-8 text-purple-600" />;
        default:
            return <BookOpen className="w-8 h-8 text-gray-600" />;
    }
};

/* ────────────────────────────────────────────────────────
   Skeleton loader
   ──────────────────────────────────────────────────────── */
const ExamPortalSkeleton: React.FC = () => (
    <div className="animate-pulse">
        <div className="mb-8 p-6 rounded-xl bg-gray-100 space-y-2">
            <div className="h-4 bg-gray-200 rounded w-40" />
            <div className="h-3 bg-gray-200 rounded w-full" />
            <div className="h-3 bg-gray-200 rounded w-3/4" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 mb-12">
            {[1, 2, 3].map((i) => (
                <div key={i} className="p-6 rounded-xl bg-gray-100 space-y-4">
                    <div className="h-8 w-8 bg-gray-200 rounded-full mx-auto" />
                    <div className="h-5 bg-gray-200 rounded w-32 mx-auto" />
                    <div className="h-3 bg-gray-200 rounded w-full" />
                    <div className="space-y-2">
                        <div className="h-3 bg-gray-200 rounded w-full" />
                        <div className="h-3 bg-gray-200 rounded w-full" />
                        <div className="h-3 bg-gray-200 rounded w-full" />
                    </div>
                </div>
            ))}
        </div>
    </div>
);

const ExamPortal: React.FC = () => {
    const { data: examsConfig, isLoading, isError } = useAdmissionExams();

    /* Extraer el proceso de exámenes (viene en el primer examen que lo tenga) */
    const examProcess = examsConfig?.exams.find((e) => e.process)?.process ?? null;
    const processSteps = examProcess
        ? [...examProcess.steps].sort((a, b) => a.order - b.order)
        : [];

    return (
        <div className="bg-gray-50 min-h-screen py-8 sm:py-12">
            <div className="container mx-auto px-4 sm:px-6 max-w-6xl">
                {/* Header */}
                <div className="text-center mb-12">
                    <h1 className="text-2xl sm:text-4xl font-bold text-azul-monte-tabor mb-4 font-serif">
                        Portal de Exámenes de Admisión
                    </h1>
                    <p className="text-base sm:text-xl text-gris-piedra max-w-3xl mx-auto leading-relaxed">
                        Bienvenido al portal de exámenes de admisión. Aquí encontrarás toda la información
                        sobre las asignaturas a evaluar y fechas de exámenes.
                    </p>
                </div>

                {isLoading && <ExamPortalSkeleton />}

                {isError && (
                    <div className="flex items-center justify-center gap-2 text-red-600 mb-8">
                        <AlertCircle className="w-5 h-5" />
                        <span className="text-sm">No se pudo cargar la información de exámenes. Intenta recargar la página.</span>
                    </div>
                )}

                {examsConfig && (
                    <>
                        {/* Important Notice – desde Edge Config */}
                        {examsConfig.importantInfo.length > 0 && (
                            <Card className="mb-8 p-6 border-l-4 border-dorado-nazaret bg-amber-50">
                                <div className="flex items-start gap-4">
                                    <Calendar className="w-6 h-6 text-dorado-nazaret flex-shrink-0 mt-1" />
                                    <div>
                                        <h3 className="font-bold text-azul-monte-tabor mb-2">{examsConfig.title}</h3>
                                        <ul className="text-gris-piedra space-y-1 text-sm">
                                            {examsConfig.importantInfo.map((info, i) => (
                                                <li key={i}>• {info}</li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            </Card>
                        )}

                        {/* Subjects Grid – desde Edge Config */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 mb-12">
                            {examsConfig.exams.map((exam) => (
                                <Card key={exam.id} className="p-6 hover:shadow-xl transition-shadow duration-300">
                                    <div className="text-center mb-4">
                                        <div className="text-4xl mb-3">
                                            {getSubjectIcon(exam.id)}
                                        </div>
                                        <h2 className="text-2xl font-bold text-azul-monte-tabor mb-2">
                                            {exam.name}
                                        </h2>
                                        <p className="text-gris-piedra text-sm leading-relaxed">
                                            {exam.description}
                                        </p>
                                    </div>

                                    {/* Subject Stats */}
                                    <div className="space-y-3 mb-6">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Clock className="w-4 h-4 text-dorado-nazaret" />
                                                <span className="text-sm font-medium">Duración:</span>
                                            </div>
                                            <span className="text-sm text-gris-piedra">
                                                {exam.durationLabel}
                                            </span>
                                        </div>

                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <BookOpen className="w-4 h-4 text-dorado-nazaret" />
                                                <span className="text-sm font-medium">Preguntas:</span>
                                            </div>
                                            <span className="text-sm text-gris-piedra">
                                                {exam.questions}
                                            </span>
                                        </div>

                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Users className="w-4 h-4 text-dorado-nazaret" />
                                                <span className="text-sm font-medium">Puntaje mínimo:</span>
                                            </div>
                                            <Badge variant="info" size="sm">
                                                {exam.minimumScoreLabel}
                                            </Badge>
                                        </div>
                                    </div>

                                    {/* Available Dates */}
                                    {exam.availableDates.length > 0 && (
                                        <div className="mb-6">
                                            <h4 className="font-semibold text-azul-monte-tabor mb-2 text-sm">
                                                Fechas Disponibles:
                                            </h4>
                                            <div className="space-y-1">
                                                {exam.availableDates.slice(0, 2).map((schedule) => (
                                                    <div key={schedule.id} className="flex justify-between items-center text-xs bg-gray-50 p-2 rounded">
                                                        <span>{new Date(schedule.date + 'T00:00:00').toLocaleDateString('es-CL')}</span>
                                                        <span className="text-gris-piedra">
                                                            {schedule.startTime} - {schedule.endTime}
                                                        </span>
                                                    </div>
                                                ))}
                                                {exam.availableDates.length > 2 && (
                                                    <div className="text-xs text-gris-piedra text-center">
                                                        +{exam.availableDates.length - 2} fechas más
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Action Button */}
                                    <Link to={`/examenes/${exam.id}`}>
                                        <Button variant="primary" className="w-full">
                                            Ver Detalles del Examen
                                        </Button>
                                    </Link>
                                </Card>
                            ))}
                        </div>
                    </>
                )}

                {/* Process Timeline – desde Edge Config (campo process del primer examen) */}
                {examProcess && (
                    <div className="py-8 sm:py-12">
                        <div className="text-center mb-12">
                            <h2 className="text-xl sm:text-2xl font-bold text-azul-monte-tabor mb-3 font-serif">
                                {examProcess.title}
                            </h2>
                            <p className="text-dorado-nazaret font-medium">{examProcess.subtitle}</p>
                        </div>
                        {/* Desktop: alternating timeline */}
                        <div className="hidden sm:block relative max-w-3xl mx-auto">
                            <div className="absolute left-1/2 h-full w-0.5 bg-gray-300 transform -translate-x-1/2"></div>
                            {processSteps.map((step, index) => {
                                const label = step.phase ?? step.statusLabel ?? '';
                                const fullDescription = [step.description, step.extraInfo].filter(Boolean).join('. ');
                                return (
                                    <div key={step.id} className="flex items-center w-full mb-16">
                                        <div className="flex-1 pr-10 text-right">
                                            {index % 2 === 0 ? (
                                                <>
                                                    {label && <p className="text-xs font-bold uppercase tracking-wider mb-1 text-dorado-nazaret">{label}</p>}
                                                    <p className="font-bold text-base text-azul-monte-tabor">{step.title}</p>
                                                </>
                                            ) : (
                                                <p className="text-gris-piedra text-sm">{fullDescription}</p>
                                            )}
                                        </div>
                                        <div className="flex-shrink-0 z-10 w-6">
                                            <div className="w-6 h-6 rounded-full bg-dorado-nazaret flex items-center justify-center text-azul-monte-tabor font-bold text-xs">{step.stepNumber}</div>
                                        </div>
                                        <div className="flex-1 pl-10 text-left">
                                            {index % 2 === 0 ? (
                                                <p className="text-gris-piedra text-sm">{fullDescription}</p>
                                            ) : (
                                                <>
                                                    {label && <p className="text-xs font-bold uppercase tracking-wider mb-1 text-dorado-nazaret">{label}</p>}
                                                    <p className="font-bold text-base text-azul-monte-tabor">{step.title}</p>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        {/* Mobile: vertical steps */}
                        <div className="sm:hidden space-y-4 max-w-sm mx-auto">
                            {processSteps.map((step) => {
                                const label = step.phase ?? step.statusLabel ?? '';
                                const fullDescription = [step.description, step.extraInfo].filter(Boolean).join('. ');
                                return (
                                    <div key={step.id} className="flex items-start gap-4 p-4 rounded-lg border-l-4 border-dorado-nazaret bg-amber-50">
                                        <div className="w-6 h-6 rounded-full bg-dorado-nazaret flex items-center justify-center flex-shrink-0 text-azul-monte-tabor font-bold text-xs mt-0.5">{step.stepNumber}</div>
                                        <div>
                                            {label && <p className="text-xs font-bold uppercase tracking-wider mb-1 text-dorado-nazaret">{label}</p>}
                                            <p className="font-bold text-sm text-azul-monte-tabor mb-1">{step.title}</p>
                                            <p className="text-gris-piedra text-sm">{fullDescription}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ExamPortal;
