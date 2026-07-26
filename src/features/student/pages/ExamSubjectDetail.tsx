import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useExamDetail } from '../../admissions/hooks/useAdmissionConfig';
import {
    ArrowLeft,
    Clock,
    BookOpen,
    Calendar,
    CheckCircle,
    Calculator,
    Globe,
    AlertCircle,
} from 'lucide-react';

/* ────────────────────────────────────────────────────────
   Ícono por id de examen
   ──────────────────────────────────────────────────────── */
const getSubjectIcon = (id: string) => {
    switch (id) {
        case 'math':
            return <Calculator className="h-6 w-6" aria-hidden="true" />;
        case 'language':
            return <BookOpen className="h-6 w-6" aria-hidden="true" />;
        case 'english':
            return <Globe className="h-6 w-6" aria-hidden="true" />;
        default:
            return <BookOpen className="h-6 w-6" aria-hidden="true" />;
    }
};

/* ────────────────────────────────────────────────────────
   Mapeo de niveles para el selector
   ──────────────────────────────────────────────────────── */
const LEVEL_OPTIONS = [
    { value: 'prekinder', label: 'Prekínder', category: 'Preescolar' },
    { value: 'kinder', label: 'Kínder', category: 'Preescolar' },
    { value: '1-basico', label: '1° Básico', category: 'Básica' },
    { value: '2-basico', label: '2° Básico', category: 'Básica' },
    { value: '3-basico', label: '3° Básico', category: 'Básica' },
    { value: '4-basico', label: '4° Básico', category: 'Básica' },
    { value: '5-basico', label: '5° Básico', category: 'Básica' },
    { value: '6-basico', label: '6° Básico', category: 'Básica' },
    { value: '7-basico', label: '7° Básico', category: 'Básica' },
    { value: '8-basico', label: '8° Básico', category: 'Básica' },
    { value: '1-medio', label: '1° Medio', category: 'Media' },
    { value: '2-medio', label: '2° Medio', category: 'Media' },
    { value: '3-medio', label: '3° Medio', category: 'Media' },
    { value: '4-medio', label: '4° Medio', category: 'Media' },
];

/* ────────────────────────────────────────────────────────
   Skeleton loader
   ──────────────────────────────────────────────────────── */
const DetailSkeleton: React.FC = () => (
    <div className="animate-pulse space-y-8 max-w-4xl mx-auto">
        <div className="bg-white rounded-xl p-8 space-y-4">
            <div className="h-16 w-16 bg-gray-200 rounded-full mx-auto" />
            <div className="h-6 bg-gray-200 rounded w-48 mx-auto" />
            <div className="h-4 bg-gray-200 rounded w-96 mx-auto" />
            <div className="grid grid-cols-3 gap-6">
                {[1, 2, 3].map(i => <div key={i} className="h-20 bg-gray-100 rounded-lg" />)}
            </div>
        </div>
        <div className="bg-white rounded-xl p-6 space-y-3">
            <div className="h-5 bg-gray-200 rounded w-40" />
            {[1, 2, 3, 4].map(i => <div key={i} className="h-4 bg-gray-200 rounded w-full" />)}
        </div>
    </div>
);

const ExamSubjectDetail: React.FC = () => {
    const { subjectId } = useParams<{ subjectId: string }>();
    const [selectedLevel, setSelectedLevel] = useState<string | null>(null);

    const { data: exam, isLoading, isError } = useExamDetail(subjectId);

    /* ── Loading ── */
    if (isLoading) {
        return (
            <div className="bg-gray-50 min-h-screen py-8 sm:py-12">
                <div className="container mx-auto px-4 sm:px-6 max-w-4xl">
                    <DetailSkeleton />
                </div>
            </div>
        );
    }

    /* ── Error ── */
    if (isError) {
        return (
            <div className="bg-gray-50 min-h-screen py-12">
                <div className="container mx-auto px-6 text-center">
                    <div className="flex items-center justify-center gap-2 text-red-600 mb-4">
                        <AlertCircle className="w-6 h-6" />
                        <span>No se pudo cargar la información del examen.</span>
                    </div>
                    <Link to="/examenes" className="inline-flex min-h-11 items-center justify-center rounded-lg bg-azul-monte-tabor px-4 py-2 text-sm font-semibold text-blanco-pureza transition-colors hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-azul-monte-tabor focus:ring-offset-2">
                        Volver al Portal de Exámenes
                    </Link>
                </div>
            </div>
        );
    }

    /* ── No encontrado ── */
    if (!exam) {
        return (
            <div className="bg-gray-50 min-h-screen py-12">
                <div className="container mx-auto px-6 text-center">
                    <h1 className="text-2xl font-bold text-azul-monte-tabor mb-4">
                        Asignatura no encontrada
                    </h1>
                    <Link to="/examenes" className="inline-flex min-h-11 items-center justify-center rounded-lg bg-azul-monte-tabor px-4 py-2 text-sm font-semibold text-blanco-pureza transition-colors hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-azul-monte-tabor focus:ring-offset-2">
                        Volver al Portal de Exámenes
                    </Link>
                </div>
            </div>
        );
    }

    /* Datos derivados */
    const levelTopics = selectedLevel ? exam.topicsByLevel[selectedLevel] : undefined;
    const topics = levelTopics
        ? [...levelTopics.topics].sort((a, b) => a.order - b.order)
        : [];
    const levelGroups = ['Preescolar', 'Básica', 'Media'];

    return (
        <div className="min-h-screen bg-gray-50 py-8 sm:py-12">
            <div className="container mx-auto max-w-4xl px-4 sm:px-6">
                {/* Breadcrumb */}
                <div className="mb-7">
                    <Link
                        to="/examenes"
                        className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-azul-monte-tabor transition-colors hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-azul-monte-tabor focus:ring-offset-2"
                    >
                        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                        Volver a exámenes
                    </Link>
                </div>

                {/* Subject Header */}
                <header className="border-b border-gray-200 pb-8">
                    <div className="flex items-start gap-4">
                        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-50 text-azul-monte-tabor">
                            {getSubjectIcon(exam.id)}
                        </span>
                        <div>
                            <h1 className="text-balance text-3xl font-bold text-azul-monte-tabor sm:text-4xl">
                                {exam.name}
                            </h1>
                            <p className="mt-2 max-w-2xl text-base leading-relaxed text-gris-piedra sm:text-lg">
                                {exam.description}
                            </p>
                        </div>
                    </div>

                    {/* Subject Stats */}
                    <dl className="mt-7 grid gap-5 border-t border-gray-200 pt-5 sm:grid-cols-3">
                        <div>
                            <dt className="text-sm text-gris-piedra">Duración</dt>
                            <dd className="mt-1 flex items-center gap-2 font-semibold text-azul-monte-tabor">
                                <Clock className="h-4 w-4 text-dorado-nazaret" aria-hidden="true" />
                                {exam.durationLabel}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-sm text-gris-piedra">Preguntas</dt>
                            <dd className="mt-1 flex items-center gap-2 font-semibold text-azul-monte-tabor">
                                <BookOpen className="h-4 w-4 text-dorado-nazaret" aria-hidden="true" />
                                {exam.questions}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-sm text-gris-piedra">Puntaje mínimo</dt>
                            <dd className="mt-1 flex items-center gap-2 font-semibold text-azul-monte-tabor">
                                <CheckCircle className="h-4 w-4 text-dorado-nazaret" aria-hidden="true" />
                                {exam.minimumScoreLabel}
                            </dd>
                        </div>
                    </dl>
                </header>

                {/* Instructions */}
                <section className="border-b border-gray-200 py-8" aria-labelledby="instructions-title">
                    <h2 id="instructions-title" className="text-xl font-bold text-azul-monte-tabor">
                        {exam.instructionsTitle}
                    </h2>
                    <ul className="mt-4 space-y-3">
                        {exam.instructions.map((instruction, index) => (
                            <li key={index} className="flex items-start gap-3">
                                <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-verde-esperanza" aria-hidden="true" />
                                <span className="leading-relaxed text-gris-piedra">{instruction}</span>
                            </li>
                        ))}
                    </ul>
                </section>

                {/* Level Selector */}
                <section className="border-b border-gray-200 py-8" aria-labelledby="level-selector-title">
                    <h2 id="level-selector-title" className="text-xl font-bold text-azul-monte-tabor">
                        {exam.levelSelector.title}
                    </h2>
                    <p className="mt-2 max-w-2xl leading-relaxed text-gris-piedra">
                        {exam.levelSelector.description}
                    </p>
                    <div className="mt-6 space-y-6">
                        {levelGroups.map((group) => (
                            <section key={group} aria-labelledby={`level-group-${group}`}>
                                <h3 id={`level-group-${group}`} className="text-sm font-semibold text-azul-monte-tabor">{group}</h3>
                                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4" role="group" aria-labelledby={`level-group-${group}`}>
                                    {LEVEL_OPTIONS.filter((level) => level.category === group).map((level) => (
                                        <button
                                            key={level.value}
                                            type="button"
                                            onClick={() => setSelectedLevel(level.value)}
                                            aria-pressed={selectedLevel === level.value}
                                            className={`min-h-11 rounded-lg border px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-azul-monte-tabor focus:ring-offset-2 ${
                                                selectedLevel === level.value
                                                    ? 'border-azul-monte-tabor bg-blue-50 font-semibold text-azul-monte-tabor'
                                                    : 'border-gray-200 bg-blanco-pureza text-gris-piedra hover:border-azul-monte-tabor hover:text-azul-monte-tabor'
                                            }`}
                                        >
                                            {level.label}
                                        </button>
                                    ))}
                                </div>
                            </section>
                        ))}
                    </div>
                </section>

                {/* Topics */}
                <section className="border-b border-gray-200 py-8" aria-labelledby="topics-title">
                    <h2 id="topics-title" className="text-xl font-bold text-azul-monte-tabor">
                        {levelTopics?.title ?? 'Temas a evaluar'}
                    </h2>
                    {selectedLevel ? (
                        topics.length > 0 ? (
                            <ol className="mt-5 space-y-4">
                                {topics.map((topic) => (
                                    <li key={topic.order} className="grid gap-2 sm:grid-cols-[2rem_minmax(0,1fr)]">
                                        <span className="font-serif text-xl font-bold text-dorado-nazaret">{topic.order}</span>
                                        <div>
                                            <h3 className="font-semibold text-azul-monte-tabor">{topic.title}</h3>
                                            <p className="mt-1 text-sm leading-relaxed text-gris-piedra">{topic.description}</p>
                                        </div>
                                    </li>
                                ))}
                            </ol>
                        ) : (
                            <p className="mt-4 text-sm leading-relaxed text-gris-piedra">
                                Los temas para este nivel se publicarán próximamente.
                            </p>
                        )
                    ) : (
                        <p className="mt-4 text-sm leading-relaxed text-gris-piedra">
                            Selecciona un nivel para revisar los temas que se evaluarán.
                        </p>
                    )}
                </section>

                {/* Exam Schedule */}
                <section className="py-8" aria-labelledby="schedule-title">
                    <h2 id="schedule-title" className="text-xl font-bold text-azul-monte-tabor">
                        {exam.examDatesTitle}
                    </h2>
                    <p className="mt-2 leading-relaxed text-gris-piedra">
                        {exam.examDatesDescription}
                    </p>

                    <div className="mt-5 divide-y divide-gray-200 border-y border-gray-200">
                        {exam.availableDates.map((schedule) => (
                            <div key={schedule.id} className="grid gap-2 py-5 sm:grid-cols-[minmax(0,1fr)_10rem] sm:items-center">
                                <div>
                                    <div className="flex items-center gap-2 font-semibold text-azul-monte-tabor">
                                        <Calendar className="h-5 w-5 text-dorado-nazaret" aria-hidden="true" />
                                        {schedule.dayLabel}
                                    </div>
                                    <p className="mt-2 flex items-center gap-2 text-sm text-gris-piedra">
                                        <Clock className="h-4 w-4 text-dorado-nazaret" aria-hidden="true" />
                                        {schedule.startTime} – {schedule.endTime}
                                    </p>
                                </div>
                                <p className="text-sm text-gris-piedra">Duración: {schedule.durationLabel}</p>
                            </div>
                        ))}
                    </div>
                </section>
            </div>
        </div>
    );
};

export default ExamSubjectDetail;
