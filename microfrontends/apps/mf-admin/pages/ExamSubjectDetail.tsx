import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { examSubjects, getTopicsByLevel, educationalLevelsForForm } from '../services/staticData';
import { 
    ArrowLeft, 
    Clock, 
    BookOpen, 
    Calendar,
    CheckCircle,
    Calculator,
    Globe
} from 'lucide-react';

const ExamSubjectDetail: React.FC = () => {
    const { subjectId } = useParams<{ subjectId: string }>();
    const [selectedLevel, setSelectedLevel] = useState<string>('1basico');

    const subject = examSubjects.find(s => s.id.toLowerCase() === subjectId?.toLowerCase());

    if (!subject) {
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

    const getSubjectIcon = (subjectId: string) => {
        switch (subjectId) {
            case 'MATH':
                return <Calculator className="w-16 h-16 text-blue-600" />;
            case 'SPANISH':
                return <BookOpen className="w-16 h-16 text-green-600" />;
            case 'ENGLISH':
                return <Globe className="w-16 h-16 text-purple-600" />;
            default:
                return <BookOpen className="w-16 h-16 text-gray-600" />;
        }
    };

    const formatDuration = (minutes: number) => {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        if (hours > 0) {
            return `${hours}h ${mins}min`;
        }
        return `${mins} minutos`;
    };


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
                            {getSubjectIcon(subject.id)}
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-azul-monte-tabor mb-3">
                            {subject.name}
                        </h1>
                        <p className="text-gris-piedra text-lg leading-relaxed max-w-2xl mx-auto">
                            {subject.description}
                        </p>
                    </div>

                    {/* Subject Stats */}
                    <div className="grid grid-cols-3 gap-3 sm:gap-6 text-center">
                        <div className="bg-blue-50 p-4 rounded-lg">
                            <Clock className="w-8 h-8 text-azul-monte-tabor mx-auto mb-2" />
                            <div className="font-bold text-azul-monte-tabor">
                                {formatDuration(subject.duration)}
                            </div>
                            <div className="text-sm text-gris-piedra">Duración</div>
                        </div>
                        <div className="bg-yellow-50 p-4 rounded-lg">
                            <BookOpen className="w-8 h-8 text-dorado-nazaret mx-auto mb-2" />
                            <div className="font-bold text-dorado-nazaret">
                                {subject.totalQuestions}
                            </div>
                            <div className="text-sm text-gris-piedra">Preguntas</div>
                        </div>
                        <div className="bg-green-50 p-4 rounded-lg">
                            <CheckCircle className="w-8 h-8 text-verde-esperanza mx-auto mb-2" />
                            <div className="font-bold text-verde-esperanza">
                                {subject.passingScore}%
                            </div>
                            <div className="text-sm text-gris-piedra">Puntaje mínimo</div>
                        </div>
                    </div>
                </Card>

                {/* Instructions */}
                <Card className="p-6 mb-8">
                    <h2 className="text-xl font-bold text-azul-monte-tabor mb-4">
                        Instrucciones del Examen
                    </h2>
                    <ul className="space-y-2">
                        {subject.instructions.map((instruction, index) => (
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
                        Selecciona tu Nivel Educativo
                    </h2>
                    <p className="text-gris-piedra mb-4">
                        Los temas del examen se adaptan según tu nivel educativo actual.
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
                        {educationalLevelsForForm.map((level) => (
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
                        Temas a Evaluar - {educationalLevelsForForm.find(l => l.value === selectedLevel)?.label}
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {getTopicsByLevel(subject.id, selectedLevel).map((topic, index) => (
                            <div key={index} className="flex items-center gap-2">
                                <Badge variant="info" size="sm">
                                    {index + 1}
                                </Badge>
                                <span className="text-gris-piedra">{topic}</span>
                            </div>
                        ))}
                    </div>
                </Card>


                {/* Exam Schedule */}
                <Card className="p-6">
                    <h2 className="text-xl font-bold text-azul-monte-tabor mb-4">
                        Fecha de Examen
                    </h2>
                    <p className="text-gris-piedra mb-6">
                        Fechas y horarios programados para el examen de {subject.name}.
                    </p>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {subject.schedules.map((schedule) => (
                            <div 
                                key={schedule.id} 
                                className="border border-azul-monte-tabor rounded-lg p-4 bg-blue-50"
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <Calendar className="w-5 h-5 text-azul-monte-tabor" />
                                        <span className="font-semibold text-azul-monte-tabor">
                                            {new Date(schedule.date).toLocaleDateString('es-CL', {
                                                weekday: 'long',
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric'
                                            })}
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
                                    <span className="text-sm text-gris-piedra"><strong>Duración:</strong> {formatDuration(subject.duration)}</span>
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