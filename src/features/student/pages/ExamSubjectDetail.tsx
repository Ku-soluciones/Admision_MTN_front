import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import Card from '../../admin/components/ui/Card';
import Button from '../../admin/components/ui/Button';
import Badge from '../../admin/components/ui/Badge';
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
            return <Calculator className="w-16 h-16 text-blue-600" />;
        case 'language':
            return <BookOpen className="w-16 h-16 text-green-600" />;
        case 'english':
            return <Globe className="w-16 h-16 text-purple-600" />;
        default:
            return <BookOpen className="w-16 h-16 text-gray-600" />;
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
    const [selectedLevel, setSelectedLevel] = useState<string>('1-basico');

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
                    <Link to="/examenes">
                        <Button variant="primary">Volver al Portal de Exámenes</Button>
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
                    <Link to="/examenes">
                        <Button variant="primary">Volver al Portal de Exámenes</Button>
                    </Link>
                </div>
            </div>
        );
    }

    /* Datos derivados */
    const levelTopics = exam.topicsByLevel[selectedLevel];
    const topics = levelTopics
        ? [...levelTopics.topics].sort((a, b) => a.order - b.order)
        : [];

    return (
        <div className="bg-gray-50 min-h-screen py-8 sm:py-12">
            <div className="container mx-auto px-4 sm:px-6 max-w-4xl">
                {/* Breadcrumb */}
                <div className="mb-6">
                    <Link
                        to="/examenes"
                        className="inline-flex items-center text-azul-monte-tabor hover:text-blue-800 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Volver al Portal de Exámenes
                    </Link>
                </div>

                {/* Subject Header */}
                <Card className="p-4 sm:p-8 mb-8">
                    <div className="text-center mb-6">
                        <div className="mb-4 flex justify-center">
                            {getSubjectIcon(exam.id)}
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-azul-monte-tabor mb-3">
                            {exam.name}
                        </h1>
                        <p className="text-gris-piedra text-lg leading-relaxed max-w-2xl mx-auto">
                            {exam.description}
                        </p>
                    </div>

                    {/* Subject Stats */}
                    <div className="grid grid-cols-3 gap-3 sm:gap-6 text-center">
                        <div className="bg-blue-50 p-4 rounded-lg">
                            <Clock className="w-8 h-8 text-azul-monte-tabor mx-auto mb-2" />
                            <div className="font-bold text-azul-monte-tabor">
                                {exam.durationLabel}
                            </div>
                            <div className="text-sm text-gris-piedra">Duración</div>
                        </div>
                        <div className="bg-yellow-50 p-4 rounded-lg">
                            <BookOpen className="w-8 h-8 text-dorado-nazaret mx-auto mb-2" />
                            <div className="font-bold text-dorado-nazaret">
                                {exam.questions}
                            </div>
                            <div className="text-sm text-gris-piedra">Preguntas</div>
                        </div>
                        <div className="bg-green-50 p-4 rounded-lg">
                            <CheckCircle className="w-8 h-8 text-verde-esperanza mx-auto mb-2" />
                            <div className="font-bold text-verde-esperanza">
                                {exam.minimumScoreLabel}
                            </div>
                            <div className="text-sm text-gris-piedra">Puntaje mínimo</div>
                        </div>
                    </div>
                </Card>

                {/* Instructions */}
                <Card className="p-6 mb-8">
                    <h2 className="text-xl font-bold text-azul-monte-tabor mb-4">
                        {exam.instructionsTitle}
                    </h2>
                    <ul className="space-y-2">
                        {exam.instructions.map((instruction, index) => (
                            <li key={index} className="flex items-start gap-3">
                                <CheckCircle className="w-5 h-5 text-verde-esperanza flex-shrink-0 mt-0.5" />
                                <span className="text-gris-piedra">{instruction}</span>
                            </li>
                        ))}
                    </ul>
                </Card>

                {/* Level Selector */}
                <Card className="p-6 mb-8">
                    <h2 className="text-xl font-bold text-azul-monte-tabor mb-4">
                        {exam.levelSelector.title}
                    </h2>
                    <p className="text-gris-piedra mb-4">
                        {exam.levelSelector.description}
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
                        {LEVEL_OPTIONS.map((level) => (
                            <button
                                key={level.value}
                                onClick={() => setSelectedLevel(level.value)}
                                className={`p-3 rounded-lg border-2 transition-all text-sm ${
                                    selectedLevel === level.value
                                        ? 'border-azul-monte-tabor bg-blue-50 text-azul-monte-tabor font-semibold'
                                        : 'border-gray-200 hover:border-azul-monte-tabor hover:bg-gray-50'
                                }`}
                            >
                                <div className="text-center">
                                    <div className="font-medium">{level.label}</div>
                                    <div className="text-xs text-gris-piedra">{level.category}</div>
                                </div>
                            </button>
                        ))}
                    </div>
                </Card>

                {/* Topics */}
                <Card className="p-6 mb-8">
                    <h2 className="text-xl font-bold text-azul-monte-tabor mb-4">
                        {levelTopics?.title ?? `Temas a Evaluar - ${LEVEL_OPTIONS.find(l => l.value === selectedLevel)?.label}`}
                    </h2>
                    {topics.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {topics.map((topic) => (
                                <div key={topic.order} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                                    <Badge variant="info" size="sm">
                                        {topic.order}
                                    </Badge>
                                    <div>
                                        <div className="font-medium text-azul-monte-tabor text-sm">{topic.title}</div>
                                        <div className="text-xs text-gris-piedra mt-0.5">{topic.description}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-gris-piedra text-sm italic">
                            Los temas para este nivel se publicarán próximamente.
                        </p>
                    )}
                </Card>

                {/* Exam Schedule */}
                <Card className="p-6">
                    <h2 className="text-xl font-bold text-azul-monte-tabor mb-4">
                        {exam.examDatesTitle}
                    </h2>
                    <p className="text-gris-piedra mb-6">
                        {exam.examDatesDescription}
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {exam.availableDates.map((schedule) => (
                            <div
                                key={schedule.id}
                                className="border border-azul-monte-tabor rounded-lg p-4 bg-blue-50"
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <Calendar className="w-5 h-5 text-azul-monte-tabor" />
                                        <span className="font-semibold text-azul-monte-tabor">
                                            {schedule.dayLabel}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <Clock className="w-4 h-4 text-dorado-nazaret" />
                                        <span className="font-medium text-dorado-nazaret">
                                            {schedule.startTime} - {schedule.endTime}
                                        </span>
                                    </div>
                                </div>
                                <div className="mb-2">
                                    <span className="text-sm text-gris-piedra"><strong>Lugar:</strong> {schedule.location}</span>
                                </div>
                                <div>
                                    <span className="text-sm text-gris-piedra"><strong>Duración:</strong> {schedule.durationLabel}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>

            </div>
        </div>
    );
};

export default ExamSubjectDetail;
