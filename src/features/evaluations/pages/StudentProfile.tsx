import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { 
    ArrowLeftIcon, 
    UserIcon, 
    BookOpenIcon,
    CheckCircleIcon,
    ClockIcon,
    FileTextIcon
} from '../components/icons/Icons';
import { 
    mockStudentProfiles, 
    mockStudentExams, 
    mockProfessors 
} from '../services/staticData';
import { ExamStatus } from '../types';

const StudentProfile: React.FC = () => {
    const { studentId } = useParams<{ studentId: string }>();
    const navigate = useNavigate();
    
    // Obtener profesor actual del localStorage
    const [currentProfessor] = useState(() => {
        const storedProfessor = localStorage.getItem('currentProfessor');
        return storedProfessor ? JSON.parse(storedProfessor) : null;
    });

    const student = mockStudentProfiles.find(s => s.id === studentId);
    const studentExams = mockStudentExams.filter(exam => 
        exam.studentId === studentId && 
        currentProfessor.subjects.includes(exam.subjectId)
    );

    if (!student) {
        return (
            <div className="bg-gray-50 min-h-screen py-12">
                <div className="container mx-auto px-6 text-center">
                    <h1 className="text-2xl font-bold text-azul-monte-tabor mb-4">
                        Estudiante no encontrado
                    </h1>
                    <Button variant="primary" onClick={() => navigate('/profesor')}>
                        Volver al Dashboard
                    </Button>
                </div>
            </div>
        );
    }

    const getSubjectName = (subjectId: string) => {
        const names: { [key: string]: string } = {
            'MATH': 'Matemática',
            'SPANISH': 'Lenguaje',
            'ENGLISH': 'Inglés'
        };
        return names[subjectId] || subjectId;
    };

    const getStatusBadge = (status: ExamStatus) => {
        switch (status) {
            case ExamStatus.COMPLETED:
                return <Badge variant="success">Completado</Badge>;
            case ExamStatus.IN_PROGRESS:
                return <Badge variant="warning">En Progreso</Badge>;
            case ExamStatus.SCHEDULED:
                return <Badge variant="info">Programado</Badge>;
            default:
                return <Badge variant="neutral">{status}</Badge>;
        }
    };

    const getGradeBadge = (percentage: number) => {
        if (percentage >= 85) return <Badge variant="success">Excelente</Badge>;
        if (percentage >= 70) return <Badge variant="info">Bueno</Badge>;
        if (percentage >= 60) return <Badge variant="warning">Suficiente</Badge>;
        return <Badge variant="error">Insuficiente</Badge>;
    };

    const averageScore = studentExams.length > 0 ? 
        studentExams.reduce((sum, exam) => sum + (exam.evaluation?.percentage || 0), 0) / studentExams.length : 0;

    return (
        <div className="bg-gray-50 min-h-screen py-8">
            <div className="container mx-auto px-4 sm:px-6 max-w-6xl">
                {/* Header */}
                <div className="mb-6">
                    <button 
                        onClick={() => navigate('/profesor')}
                        className="inline-flex items-center text-azul-monte-tabor hover:text-blue-800 transition-colors mb-4"
                    >
                        <ArrowLeftIcon className="w-4 h-4 mr-2" />
                        Volver al Dashboard
                    </button>
                    
                    <Card className="p-4 sm:p-6 bg-gradient-to-r from-azul-monte-tabor to-blue-700 text-blanco-pureza">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                            <div className="bg-blanco-pureza bg-opacity-20 p-4 rounded-full self-start sm:self-auto">
                                <UserIcon className="w-10 h-10 sm:w-12 sm:h-12 text-blanco-pureza" />
                            </div>
                            <div className="flex-1">
                                <h1 className="text-2xl sm:text-3xl font-bold mb-2">
                                    {student.firstName} {student.lastName}
                                </h1>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 text-blue-100">
                                    <p><strong>Nivel:</strong> {student.grade}</p>
                                    <p><strong>Fecha de Nacimiento:</strong> {new Date(student.birthDate).toLocaleDateString('es-CL')}</p>
                                    <p><strong>ID Postulación:</strong> {student.applicationId}</p>
                                </div>
                            </div>
                            <div className="sm:text-right">
                                <div className="text-3xl font-bold text-dorado-nazaret">
                                    {Math.round(averageScore)}%
                                </div>
                                <div className="text-blue-100 text-sm">Promedio General</div>
                            </div>
                        </div>
                    </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Columna Principal */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Resumen de Exámenes */}
                        <Card className="p-6">
                            <h2 className="text-xl font-bold text-azul-monte-tabor mb-4 flex items-center gap-2">
                                <BookOpenIcon className="w-5 h-5" />
                                Exámenes Rendidos
                            </h2>
                            
                            <div className="space-y-4">
                                {studentExams.map((exam) => (
                                    <div key={exam.id} className="border border-gray-200 rounded-lg p-4">
                                        <div className="flex items-center justify-between mb-3">
                                            <div>
                                                <h3 className="font-semibold text-azul-monte-tabor">
                                                    {getSubjectName(exam.subjectId)}
                                                </h3>
                                                <p className="text-sm text-gris-piedra">
                                                    {exam.completedAt ? 
                                                        `Completado: ${new Date(exam.completedAt).toLocaleDateString('es-CL')}` :
                                                        'Sin completar'
                                                    }
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                {getStatusBadge(exam.status)}
                                                {exam.evaluation && getGradeBadge(exam.evaluation.percentage)}
                                            </div>
                                        </div>

                                        {exam.evaluation ? (
                                            <div className="bg-gray-50 rounded-lg p-4">
                                                <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-4">
                                                    <div>
                                                        <span className="text-sm text-gris-piedra">Puntaje:</span>
                                                        <div className="font-semibold">
                                                            {exam.evaluation.score}/{exam.evaluation.maxScore}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <span className="text-sm text-gris-piedra">Porcentaje:</span>
                                                        <div className="font-semibold text-azul-monte-tabor">
                                                            {exam.evaluation.percentage}%
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <span className="text-sm text-gris-piedra">Nota:</span>
                                                        <div className="font-semibold text-dorado-nazaret">
                                                            {exam.evaluation.grade}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Evaluación por Áreas */}
                                                {exam.evaluation.areaScores && exam.evaluation.areaScores.length > 0 && (
                                                    <div className="mb-4">
                                                        <h4 className="font-semibold text-azul-monte-tabor mb-2">
                                                            Evaluación por Áreas:
                                                        </h4>
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                            {exam.evaluation.areaScores.map((area, index) => (
                                                                <div key={index} className="flex justify-between items-center bg-white p-2 rounded">
                                                                    <span className="text-sm">{area.area}</span>
                                                                    <Badge variant={area.percentage >= 70 ? 'success' : area.percentage >= 50 ? 'warning' : 'error'} size="sm">
                                                                        {area.percentage}%
                                                                    </Badge>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Comentarios Principales */}
                                                <div className="space-y-3">
                                                    <div>
                                                        <h4 className="font-semibold text-azul-monte-tabor mb-1">
                                                            Fortalezas:
                                                        </h4>
                                                        <ul className="text-sm text-gris-piedra space-y-1">
                                                            {exam.evaluation.strengths.map((strength, index) => (
                                                                <li key={index} className="flex items-start gap-2">
                                                                    <CheckCircleIcon className="w-4 h-4 text-verde-esperanza flex-shrink-0 mt-0.5" />
                                                                    {strength}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>

                                                    <div>
                                                        <h4 className="font-semibold text-azul-monte-tabor mb-1">
                                                            Áreas a Mejorar:
                                                        </h4>
                                                        <ul className="text-sm text-gris-piedra space-y-1">
                                                            {exam.evaluation.weaknesses.map((weakness, index) => (
                                                                <li key={index} className="flex items-start gap-2">
                                                                    <ClockIcon className="w-4 h-4 text-dorado-nazaret flex-shrink-0 mt-0.5" />
                                                                    {weakness}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            exam.status === ExamStatus.COMPLETED && (
                                                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-sm text-yellow-800">
                                                            Pendiente de evaluación
                                                        </span>
                                                        <Button 
                                                            size="sm" 
                                                            variant="primary"
                                                            onClick={() => navigate(`/profesor/informe/${exam.id}`)}
                                                        >
                                                            Crear Informe
                                                        </Button>
                                                    </div>
                                                </div>
                                            )
                                        )}
                                    </div>
                                ))}

                                {studentExams.length === 0 && (
                                    <p className="text-gris-piedra text-center py-4">
                                        No hay exámenes registrados para este estudiante en tus asignaturas.
                                    </p>
                                )}
                            </div>
                        </Card>
                    </div>

                    {/* Columna Lateral */}
                    <div className="space-y-6">
                        {/* Estadísticas Generales */}
                        <Card className="p-6">
                            <h3 className="text-lg font-bold text-azul-monte-tabor mb-4">
                                Estadísticas Generales
                            </h3>
                            <div className="space-y-4">
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-azul-monte-tabor">
                                        {studentExams.length}
                                    </div>
                                    <div className="text-sm text-gris-piedra">Exámenes Totales</div>
                                </div>
                                
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-verde-esperanza">
                                        {studentExams.filter(e => e.evaluation).length}
                                    </div>
                                    <div className="text-sm text-gris-piedra">Evaluados</div>
                                </div>
                                
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-dorado-nazaret">
                                        {Math.round(averageScore)}%
                                    </div>
                                    <div className="text-sm text-gris-piedra">Promedio</div>
                                </div>
                            </div>
                        </Card>

                        {/* Evaluación General */}
                        {student.overallEvaluation && (
                            <Card className="p-6">
                                <h3 className="text-lg font-bold text-azul-monte-tabor mb-3 flex items-center gap-2">
                                    <FileTextIcon className="w-5 h-5" />
                                    Evaluación General
                                </h3>
                                <p className="text-gris-piedra text-sm">
                                    {student.overallEvaluation}
                                </p>
                            </Card>
                        )}

                        {/* Acciones Rápidas */}
                        <Card className="p-6">
                            <h3 className="text-lg font-bold text-azul-monte-tabor mb-4">
                                Acciones Rápidas
                            </h3>
                            <div className="space-y-3">
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="w-full"
                                    onClick={() => window.print()}
                                >
                                    Imprimir Perfil
                                </Button>
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="w-full"
                                    onClick={() => navigate(`/profesor/reporte/${student.id}`)}
                                >
                                    Generar Reporte
                                </Button>
                            </div>
                        </Card>

                        {/* Seguimiento */}
                        <Card className="p-6">
                            <h3 className="text-lg font-bold text-azul-monte-tabor mb-3">
                                Seguimiento
                            </h3>
                            <div className="space-y-2">
                                {studentExams.some(e => e.evaluation?.requiresFollowUp) ? (
                                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                                        <p className="text-sm text-yellow-800 font-medium">
                                            Requiere seguimiento adicional
                                        </p>
                                        <p className="text-xs text-yellow-700 mt-1">
                                            Revisar notas de seguimiento en las evaluaciones.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                                        <p className="text-sm text-green-800">
                                            No requiere seguimiento especial
                                        </p>
                                    </div>
                                )}
                            </div>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StudentProfile;