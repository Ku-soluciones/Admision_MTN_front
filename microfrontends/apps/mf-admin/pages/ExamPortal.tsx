import React from 'react';
import { Link } from 'react-router-dom';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { examSubjects } from '../services/staticData';
import { Clock, BookOpen, Users, Calendar, Calculator, Globe } from 'lucide-react';

const ExamPortal: React.FC = () => {
    const getSubjectIcon = (subjectId: string) => {
        switch (subjectId) {
            case 'MATH':
                return <Calculator className="w-8 h-8 text-blue-600" />;
            case 'SPANISH':
                return <BookOpen className="w-8 h-8 text-green-600" />;
            case 'ENGLISH':
                return <Globe className="w-8 h-8 text-purple-600" />;
            default:
                return <BookOpen className="w-8 h-8 text-gray-600" />;
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

                {/* Important Notice */}
                <Card className="mb-8 p-6 border-l-4 border-dorado-nazaret bg-amber-50">
                    <div className="flex items-start gap-4">
                        <Calendar className="w-6 h-6 text-dorado-nazaret flex-shrink-0 mt-1" />
                        <div>
                            <h3 className="font-bold text-azul-monte-tabor mb-2">Información Importante</h3>
                            <ul className="text-gris-piedra space-y-1 text-sm">
                                <li>• Los exámenes tienen una duración de 1 hora y 20 minutos</li>
                                <li>• Es obligatorio rendir las tres asignaturas para completar el proceso</li>
                                <li>• Debes llegar 30 minutos antes de la hora programada</li>
                                <li>• Trae tu cédula de identidad y materiales básicos (lápiz, goma)</li>
                            </ul>
                        </div>
                    </div>
                </Card>

                {/* Subjects Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 mb-12">
                    {examSubjects.map((subject) => (
                        <Card key={subject.id} className="p-6 hover:shadow-xl transition-shadow duration-300">
                            <div className="text-center mb-4">
                                <div className="text-4xl mb-3">
                                    {getSubjectIcon(subject.id)}
                                </div>
                                <h2 className="text-2xl font-bold text-azul-monte-tabor mb-2">
                                    {subject.name}
                                </h2>
                                <p className="text-gris-piedra text-sm leading-relaxed">
                                    {subject.description}
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
                                        {formatDuration(subject.duration)}
                                    </span>
                                </div>
                                
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <BookOpen className="w-4 h-4 text-dorado-nazaret" />
                                        <span className="text-sm font-medium">Preguntas:</span>
                                    </div>
                                    <span className="text-sm text-gris-piedra">
                                        {subject.totalQuestions}
                                    </span>
                                </div>

                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Users className="w-4 h-4 text-dorado-nazaret" />
                                        <span className="text-sm font-medium">Puntaje mínimo:</span>
                                    </div>
                                    <Badge variant="info" size="sm">
                                        {subject.passingScore}%
                                    </Badge>
                                </div>
                            </div>

                            {/* Available Dates */}
                            <div className="mb-6">
                                <h4 className="font-semibold text-azul-monte-tabor mb-2 text-sm">
                                    Fechas Disponibles:
                                </h4>
                                <div className="space-y-1">
                                    {subject.schedules.slice(0, 2).map((schedule) => (
                                        <div key={schedule.id} className="flex justify-between items-center text-xs bg-gray-50 p-2 rounded">
                                            <span>{new Date(schedule.date).toLocaleDateString('es-CL')}</span>
                                            <span className="text-gris-piedra">
                                                {schedule.startTime} - {schedule.endTime}
                                            </span>
                                        </div>
                                    ))}
                                    {subject.schedules.length > 2 && (
                                        <div className="text-xs text-gris-piedra text-center">
                                            +{subject.schedules.length - 2} fechas más
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Action Button */}
                            <Link to={`/examenes/${subject.id.toLowerCase()}`}>
                                <Button variant="primary" className="w-full">
                                    Ver Detalles del Examen
                                </Button>
                            </Link>
                        </Card>
                    ))}
                </div>

                {/* Process Timeline */}
                <Card className="p-4 sm:p-8">
                    <h2 className="text-xl sm:text-2xl font-bold text-azul-monte-tabor text-center mb-6 sm:mb-8">
                        Proceso de Exámenes
                    </h2>
                    {/* Desktop: alternating timeline */}
                    <div className="hidden sm:block relative max-w-4xl mx-auto">
                        <div className="absolute left-1/2 h-full w-1 bg-azul-monte-tabor rounded-full transform -translate-x-1/2"></div>
                        {[
                            { step: 1, title: "Preparación", description: "Revisa los temas y requisitos para cada asignatura", date: "Previo al examen" },
                            { step: 2, title: "Confirmación de Horarios", description: "Confirma tu asistencia a los horarios asignados", date: "Fecha fija" },
                            { step: 3, title: "Rendir Exámenes", description: "Presenta los exámenes - 31 preguntas en 80 minutos", date: "Fecha programada" },
                            { step: 4, title: "Resultados", description: "Consulta tus resultados en el portal (puntaje mínimo 60%)", date: "Posterior al examen" }
                        ].map((item, index) => (
                            <div key={item.step} className={`flex items-center w-full mb-8 ${index % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
                                <div className={`w-5/12 ${index % 2 === 0 ? 'text-right pr-8' : 'text-left pl-8'}`}>
                                    <div className={`${index % 2 === 0 ? 'text-right' : 'text-left'}`}>
                                        <h3 className="font-bold text-azul-monte-tabor mb-1">Paso {item.step}: {item.title}</h3>
                                        <p className="text-gris-piedra text-sm mb-1">{item.description}</p>
                                        <p className="text-dorado-nazaret font-semibold text-sm">{item.date}</p>
                                    </div>
                                </div>
                                <div className="relative">
                                    <div className="w-8 h-8 rounded-full bg-dorado-nazaret flex items-center justify-center z-10 text-azul-monte-tabor font-bold text-sm">{item.step}</div>
                                </div>
                                <div className="w-5/12"></div>
                            </div>
                        ))}
                    </div>
                    {/* Mobile: vertical steps */}
                    <div className="sm:hidden space-y-3">
                        {[
                            { step: 1, title: "Preparación", description: "Revisa los temas y requisitos para cada asignatura", date: "Previo al examen" },
                            { step: 2, title: "Confirmación de Horarios", description: "Confirma tu asistencia a los horarios asignados", date: "Fecha fija" },
                            { step: 3, title: "Rendir Exámenes", description: "Presenta los exámenes - 31 preguntas en 80 minutos", date: "Fecha programada" },
                            { step: 4, title: "Resultados", description: "Consulta tus resultados en el portal (puntaje mínimo 60%)", date: "Posterior al examen" }
                        ].map((item) => (
                            <div key={item.step} className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                                <div className="w-8 h-8 rounded-full bg-dorado-nazaret flex items-center justify-center flex-shrink-0 text-azul-monte-tabor font-bold text-sm">{item.step}</div>
                                <div>
                                    <h3 className="font-bold text-azul-monte-tabor text-sm">{item.title}</h3>
                                    <p className="text-gris-piedra text-xs mt-1">{item.description}</p>
                                    <p className="text-dorado-nazaret font-semibold text-xs mt-1">{item.date}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default ExamPortal;