import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Table from '../components/ui/Table';
import { 
    DashboardIcon, 
    FileTextIcon, 
    UsersIcon, 
    BookOpenIcon,
    CheckCircleIcon,
    ClockIcon,
    BarChartIcon
} from '../components/icons/Icons';
import { 
    mockProfessors, 
    getPendingExamsByProfessor, 
    getProfessorStats,
    mockStudentExams,
    mockStudentProfiles
} from '../services/staticData';
import { ExamStatus, StudentExam, StudentProfile } from '../types';
import { Link, useNavigate } from 'react-router-dom';
import { professorEvaluationService, ProfessorEvaluation, ProfessorEvaluationStats } from '../services/professorEvaluationService';
import { professorAuthService } from '../services/professorAuthService';
import { EvaluationStatus, EvaluationType } from '../types/evaluation';
import { FiRefreshCw, FiBarChart2, FiCalendar, FiEye } from 'react-icons/fi';
import WeeklyCalendar from '../components/schedule/WeeklyCalendar';
import ChangePasswordButton from '../src/components/common/ChangePasswordButton';
import {
    Interview,
    InterviewStatus,
    InterviewType,
    INTERVIEW_STATUS_LABELS,
    INTERVIEW_TYPE_LABELS
} from '../types/interview';
import { interviewService } from '../services/interviewService';
import { UserRole, USER_ROLE_LABELS } from '../types/user';
import api from '../services/api';

const baseSections = [
    { key: 'dashboard', label: 'Dashboard General', icon: DashboardIcon },
    { key: 'entrevistas', label: 'Mis Entrevistas', icon: UsersIcon },
    { key: 'estudiantes', label: 'Mis Estudiantes', icon: UsersIcon },
    { key: 'horarios', label: 'Mis Horarios', icon: ClockIcon },
    { key: 'reportes', label: 'Reportes y Estadísticas', icon: FileTextIcon },
    { key: 'configuracion', label: 'Configuración', icon: BookOpenIcon }
];

const ProfessorDashboard: React.FC = () => {
    const navigate = useNavigate();

    // Obtener profesor actual del localStorage
    const [currentProfessor, setCurrentProfessor] = useState(() => {
        const storedProfessor = localStorage.getItem('currentProfessor');
        const parsed = storedProfessor ? JSON.parse(storedProfessor) : null;
        return parsed;
    });

    // Determinar sección inicial según el rol
    const getInitialSection = () => {
        if (currentProfessor?.role === 'CYCLE_DIRECTOR' || currentProfessor?.role === 'PSYCHOLOGIST') {
            return 'entrevistas'; // Directores de ciclo y psicólogos ven entrevistas por defecto
        }
        return 'evaluaciones'; // Profesores ven evaluaciones por defecto
    };

    const [activeSection, setActiveSection] = useState(getInitialSection());
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    // Usar useRef para estabilizar la referencia y evitar re-renders infinitos
    const currentProfessorRef = useRef(currentProfessor);
    currentProfessorRef.current = currentProfessor;

    // Estado para las evaluaciones reales
    const [evaluations, setEvaluations] = useState<ProfessorEvaluation[]>([]);
    const [evaluationStats, setEvaluationStats] = useState<ProfessorEvaluationStats>({
        total: 0,
        pending: 0,
        inProgress: 0,
        completed: 0,
        averageScore: 0
    });
    const [isLoading, setIsLoading] = useState(true);

    // Estado para las entrevistas
    const [interviews, setInterviews] = useState<Interview[]>([]);

    // Estado para forzar recarga de datos (cache busting)
    const [refreshKey, setRefreshKey] = useState(0);

    // Callback para refrescar dashboard desde componentes hijos
    const handleRefreshDashboard = useCallback(() => {
        console.log('Dashboard refresh triggered by child component');
        setRefreshKey(prev => prev + 1);
    }, []);

    // Estado para el tab activo en la sección de evaluaciones
    const [activeEvaluationTab, setActiveEvaluationTab] = useState<'academicas' | 'psicologicas' | 'familiares'>('psicologicas');

    // Estado para el tab activo en la sección de entrevistas
    const [activeInterviewTab, setActiveInterviewTab] = useState<'familiares' | 'director_ciclo' | 'informes'>('familiares');

    // Determinar tab inicial basado en las evaluaciones disponibles
    useEffect(() => {
        let isMounted = true;

        if (evaluations.length > 0 && isMounted) {
            const hasPsychologicalEvaluations = evaluations.some(e =>
                ['PSYCHOLOGICAL_INTERVIEW', 'CYCLE_DIRECTOR_INTERVIEW', 'CYCLE_DIRECTOR_REPORT'].includes(e.evaluationType)
            );
            const hasFamilyEvaluations = evaluations.some(e => e.evaluationType === 'FAMILY_INTERVIEW');
            const hasAcademicEvaluations = evaluations.some(e =>
                ['MATHEMATICS_EXAM', 'LANGUAGE_EXAM', 'ENGLISH_EXAM'].includes(e.evaluationType)
            );

            // Establecer tab inicial según disponibilidad
            if (hasPsychologicalEvaluations) {
                setActiveEvaluationTab('psicologicas');
            } else if (hasFamilyEvaluations) {
                setActiveEvaluationTab('familiares');
            } else if (hasAcademicEvaluations) {
                setActiveEvaluationTab('academicas');
            }
        }

        // Cleanup function
        return () => {
            isMounted = false;
        };
    }, [evaluations]); // Solo cuando cambien las evaluaciones

    // Cargar evaluaciones del profesor - SOLO UNA VEZ al montar
    // Cargar datos actualizados del profesor desde el backend
    useEffect(() => {
        let isMounted = true;
        let abortController = new AbortController();

        const updateProfessorData = async () => {
            try {
                const professorData = await professorAuthService.getCurrentProfessor();

                if (professorData && isMounted) {
                    // Actualizar localStorage con los datos frescos del backend
                    const updatedProfessor = {
                        ...currentProfessor,
                        id: professorData.id,
                        subject: professorData.subject,
                        firstName: professorData.firstName,
                        lastName: professorData.lastName,
                        email: professorData.email,
                        role: professorData.role
                    };
                    localStorage.setItem('currentProfessor', JSON.stringify(updatedProfessor));
                    setCurrentProfessor(updatedProfessor);
                } else if (!professorData) {
                    console.warn('getCurrentProfessor() retornó null');
                }
            } catch (error) {
                if (!abortController.signal.aborted) {
                    console.error('Error actualizando datos del profesor:', error);
                }
            }
        };

        updateProfessorData();

        // Cleanup function
        return () => {
            isMounted = false;
            abortController.abort();
        };
    }, []); // Solo al montar el componente

    useEffect(() => {
        let isMounted = true;
        let abortController = new AbortController();

        const loadEvaluations = async () => {
            if (!currentProfessor) {
                return;
            }

            try {
                if (isMounted) setIsLoading(true);

                const [evaluationsData, statsData, interviewsData] = await Promise.all([
                    professorEvaluationService.getMyEvaluations(),
                    professorEvaluationService.getMyEvaluationStats(),
                    interviewService.getInterviewsByInterviewer(currentProfessor.id)
                ]);

                if (isMounted) {
                    setEvaluations(evaluationsData);
                    setEvaluationStats(statsData);
                    setInterviews(interviewsData);
                    console.log('Loaded interviews for professor:', interviewsData.length);
                    console.log('👤 Professor ID:', currentProfessor.id);
                    console.log('Interview details:', interviewsData);
                }

            } catch (error: any) {
                if (!abortController.signal.aborted) {
                    console.error('Error cargando evaluaciones:', error);

                    // Si no hay evaluaciones asignadas, mostrar estado vacío
                    if (error.message.includes('No se encontraron evaluaciones') && isMounted) {
                        setEvaluations([]);
                        setEvaluationStats({
                            total: 0,
                            pending: 0,
                            inProgress: 0,
                            completed: 0,
                            averageScore: 0
                        });
                    } else {
                        // Para otros errores, mostrar notificación
                        console.error('Error específico:', error.message);
                    }
                }
            } finally {
                if (isMounted) setIsLoading(false);
            }
        };

        loadEvaluations();

        // Cleanup function
        return () => {
            isMounted = false;
            abortController.abort();
        };
    }, [refreshKey]); // Re-ejecuta cuando refreshKey cambia (force refresh)


    // Datos mock para compatibilidad (se pueden eliminar después)
    const stats = useMemo(() => {
        return getProfessorStats(currentProfessor?.id);
    }, [currentProfessor?.id]);

    const pendingExams = useMemo(() => {
        return getPendingExamsByProfessor(currentProfessor?.id);
    }, [currentProfessor?.id]);

    const handleLogout = () => {
        localStorage.removeItem('currentProfessor');
        navigate('/profesor/login');
    };

    // Determinar si mostrar sección de administrador
    const sections = currentProfessor?.isAdmin 
        ? [...baseSections, { key: 'admin', label: 'Panel Administrador', icon: UsersIcon }]
        : baseSections;

    const getSubjectName = (subjectId: string) => {
        const names: { [key: string]: string } = {
            'MATHEMATICS': 'Matemática',
            'MATH': 'Matemática',
            'LANGUAGE': 'Lenguaje y Comunicación',
            'SPANISH': 'Lenguaje',
            'ENGLISH': 'Inglés',
            'GENERAL': 'General',
            'ALL_SUBJECTS': 'Todas las Asignaturas'
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

    const getEvaluationStatusBadge = (status: EvaluationStatus) => {
        switch (status) {
            case EvaluationStatus.COMPLETED:
                return <Badge variant="success">Completada</Badge>;
            case EvaluationStatus.IN_PROGRESS:
                return <Badge variant="warning">En Progreso</Badge>;
            case EvaluationStatus.PENDING:
                return <Badge variant="info">Pendiente</Badge>;
            default:
                return <Badge variant="neutral">{status}</Badge>;
        }
    };

    const getEvaluationTypeLabel = (type: EvaluationType) => {
        const labels: { [key in EvaluationType]: string} = {
            [EvaluationType.MATHEMATICS_EXAM]: 'Examen de Matemáticas',
            [EvaluationType.LANGUAGE_EXAM]: 'Examen de Lenguaje',
            [EvaluationType.ENGLISH_EXAM]: 'Examen de Inglés',
            [EvaluationType.PSYCHOLOGICAL_INTERVIEW]: 'Entrevista Psicológica',
            [EvaluationType.CYCLE_DIRECTOR_INTERVIEW]: 'Entrevista Director de Ciclo',
            [EvaluationType.CYCLE_DIRECTOR_REPORT]: 'Informe Director de Ciclo',
            [EvaluationType.FAMILY_INTERVIEW]: 'Entrevista Familiar'
        };
        return labels[type] || type;
    };

    const renderDashboard = () => (
        <div className="space-y-6">
            {/* Welcome Card */}
            <Card className="p-6 bg-gradient-to-r from-azul-monte-tabor to-blue-700 text-blanco-pureza">
                <h1 className="text-2xl font-bold mb-2">
                    Bienvenido/a, {currentProfessor?.firstName} {currentProfessor?.lastName}
                </h1>
                <p className="text-blue-100">
                    Profesor/a de {currentProfessor?.subject ? getSubjectName(currentProfessor.subject) : 'Asignatura no especificada'}
                </p>
                <p className="text-blue-100 text-sm mt-1">
                    Rol: {currentProfessor?.role ? USER_ROLE_LABELS[currentProfessor.role as UserRole] : 'No especificado'}
                </p>
            </Card>

            {/* Stats Grid - Usando datos reales */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="p-6 text-center">
                    <FileTextIcon className="w-8 h-8 text-azul-monte-tabor mx-auto mb-3" />
                    <div className="text-2xl font-bold text-azul-monte-tabor">{evaluationStats.total}</div>
                    <div className="text-sm text-gris-piedra">Total Evaluaciones</div>
                </Card>
                
                <Card className="p-6 text-center">
                    <CheckCircleIcon className="w-8 h-8 text-verde-esperanza mx-auto mb-3" />
                    <div className="text-2xl font-bold text-verde-esperanza">{evaluationStats.completed}</div>
                    <div className="text-sm text-gris-piedra">Completadas</div>
                </Card>
                
                <Card className="p-6 text-center">
                    <ClockIcon className="w-8 h-8 text-dorado-nazaret mx-auto mb-3" />
                    <div className="text-2xl font-bold text-dorado-nazaret">{evaluationStats.pending + evaluationStats.inProgress}</div>
                    <div className="text-sm text-gris-piedra">Pendientes</div>
                </Card>
                
                <Card className="p-6 text-center">
                    <UsersIcon className="w-8 h-8 text-azul-monte-tabor mx-auto mb-3" />
                    <div className="text-2xl font-bold text-azul-monte-tabor">{evaluationStats.averageScore}%</div>
                    <div className="text-sm text-gris-piedra">Promedio General</div>
                </Card>
            </div>

            {/* Evaluaciones Recientes */}
            <Card className="p-6">
                <h2 className="text-xl font-bold text-azul-monte-tabor mb-4">
                    Evaluaciones Recientes
                </h2>
                {isLoading ? (
                    <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-azul-monte-tabor mx-auto"></div>
                        <p className="text-gris-piedra mt-2">Cargando evaluaciones...</p>
                    </div>
                ) : evaluations.length === 0 ? (
                    <p className="text-gris-piedra text-center py-4">No hay evaluaciones asignadas</p>
                ) : (
                    <div className="space-y-3">
                        {evaluations.slice(0, 5).map((evaluation) => (
                            <div key={evaluation.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                                <div>
                                    <p className="font-semibold text-azul-monte-tabor">{evaluation.studentName}</p>
                                    <p className="text-sm text-gris-piedra">
                                        {getEvaluationTypeLabel(evaluation.evaluationType)} - {evaluation.studentGrade}
                                    </p>
                                </div>
                                <div>
                                    {getEvaluationStatusBadge(evaluation.status)}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Card>
        </div>
    );

    const renderEvaluaciones = () => {
        // Filtrar evaluaciones por tipo
        const academicEvaluations = evaluations.filter(e =>
            ['MATHEMATICS_EXAM', 'LANGUAGE_EXAM', 'ENGLISH_EXAM'].includes(e.evaluationType)
        );

        const psychologicalEvaluations = evaluations.filter(e =>
            ['PSYCHOLOGICAL_INTERVIEW', 'CYCLE_DIRECTOR_INTERVIEW', 'CYCLE_DIRECTOR_REPORT'].includes(e.evaluationType)
        );

        const familyEvaluations = evaluations.filter(e =>
            e.evaluationType === 'FAMILY_INTERVIEW'
        );

        // Determinar qué tabs mostrar según qué evaluaciones tiene el usuario
        const hasAcademicEvaluations = academicEvaluations.length > 0;
        const hasPsychologicalEvaluations = psychologicalEvaluations.length > 0;
        const hasFamilyEvaluations = familyEvaluations.length > 0;

        // Determinar qué evaluaciones mostrar según la pestaña activa
        const currentEvaluations =
            activeEvaluationTab === 'academicas' ? academicEvaluations :
            activeEvaluationTab === 'psicologicas' ? psychologicalEvaluations :
            familyEvaluations;

        // Columnas simplificadas para entrevistas/informes
        const simpleColumns = [
            {
                key: 'student' as keyof ProfessorEvaluation,
                header: 'Nombre Estudiante',
                render: (value: any, evaluation: ProfessorEvaluation) => (
                    <p className="font-semibold">{evaluation.studentName}</p>
                )
            },
            {
                key: 'studentRut' as keyof ProfessorEvaluation,
                header: 'RUT',
                render: (value: any, evaluation: ProfessorEvaluation) => (
                    <p className="text-sm">{evaluation.studentRut || '-'}</p>
                )
            },
            {
                key: 'status' as keyof ProfessorEvaluation,
                header: 'Estado',
                render: (status: EvaluationStatus) => getEvaluationStatusBadge(status)
            }
        ];

        // Columnas completas para exámenes académicos
        const baseColumns = [
            {
                key: 'student' as keyof ProfessorEvaluation,
                header: 'Estudiante',
                render: (value: any, evaluation: ProfessorEvaluation) => (
                    <div>
                        <p className="font-semibold">{evaluation.studentName}</p>
                        <p className="text-sm text-gris-piedra">{evaluation.studentGrade}</p>
                    </div>
                )
            },
            {
                key: 'evaluationType' as keyof ProfessorEvaluation,
                header: 'Tipo de Evaluación',
                render: (type: EvaluationType) => getEvaluationTypeLabel(type)
            },
            {
                key: 'scheduledDate' as keyof ProfessorEvaluation,
                header: 'Fecha Programada',
                render: (date: string) => date ? new Date(date).toLocaleDateString('es-CL') : '-'
            },
            {
                key: 'status' as keyof ProfessorEvaluation,
                header: 'Estado',
                render: (status: EvaluationStatus) => getEvaluationStatusBadge(status)
            }
        ];

        // Columna de porcentaje solo para exámenes académicos
        const scoreColumn = {
            key: 'score' as keyof ProfessorEvaluation,
            header: 'Porcentaje',
            render: (score: number, evaluation: ProfessorEvaluation) => {
                if (!score) return '-';
                const maxScore = evaluation.maxScore || 100;
                const percentage = Math.round((score / maxScore) * 100);
                return `${percentage}%`;
            }
        };

        // Columna de acciones
        const actionsColumn = {
            key: 'actions' as keyof ProfessorEvaluation,
            header: 'Acciones',
            render: (value: any, evaluation: ProfessorEvaluation) => (
                <Button
                    size="sm"
                    variant="primary"
                    onClick={() => navigate(
                        evaluation.evaluationType === 'CYCLE_DIRECTOR_INTERVIEW'
                            ? `/cycle-director-interview/${evaluation.id}`
                            : evaluation.evaluationType === 'PSYCHOLOGICAL_INTERVIEW'
                            ? `/psychological-interview/${evaluation.id}`
                            : evaluation.evaluationType === 'CYCLE_DIRECTOR_REPORT'
                            ? `/profesor/informe-director/${evaluation.id}`
                            : evaluation.evaluationType === 'FAMILY_INTERVIEW'
                            ? `/profesor/entrevista-familiar/${evaluation.id}`
                            : `/profesor/informe/${evaluation.id}`
                    )}
                >
                    {evaluation.evaluationType === 'CYCLE_DIRECTOR_INTERVIEW'
                        ? (evaluation.status === EvaluationStatus.COMPLETED ? "Ver Entrevista" : "Crear Entrevista")
                        : evaluation.evaluationType === 'PSYCHOLOGICAL_INTERVIEW'
                        ? (evaluation.status === EvaluationStatus.COMPLETED ? "Ver Entrevista" : "Crear Entrevista")
                        : evaluation.evaluationType === 'CYCLE_DIRECTOR_REPORT'
                        ? (evaluation.status === EvaluationStatus.COMPLETED ? "Ver Informe" : "Completar Informe")
                        : evaluation.evaluationType === 'FAMILY_INTERVIEW'
                        ? (evaluation.status === EvaluationStatus.COMPLETED ? "Ver Entrevista" : "Crear Entrevista")
                        : (evaluation.status === EvaluationStatus.COMPLETED ? "Ver Informe" : "Completar Informe")}
                </Button>
            )
        };

        // Determinar qué columnas mostrar según el tab activo
        const evaluationColumns = activeEvaluationTab === 'academicas'
            ? [...baseColumns, scoreColumn, actionsColumn]  // Exámenes académicos: info completa
            : [...simpleColumns, actionsColumn];             // Entrevistas/informes: solo nombre, RUT, estado

        return (
            <Card className="p-6">
                <h2 className="text-xl font-bold text-azul-monte-tabor mb-4">
                    Mis Evaluaciones Asignadas ({evaluations.length})
                </h2>

                {/* Tabs de filtrado - Solo mostrar tabs con evaluaciones */}
                {(hasAcademicEvaluations || hasPsychologicalEvaluations || hasFamilyEvaluations) && (
                    <div className="flex gap-2 mb-6 border-b border-gray-200 pb-2">
                        {hasAcademicEvaluations && (
                            <button
                                onClick={() => setActiveEvaluationTab('academicas')}
                                className={`px-4 py-2 font-semibold rounded-t-lg transition-colors ${
                                    activeEvaluationTab === 'academicas'
                                        ? 'bg-azul-monte-tabor text-blanco-pureza'
                                        : 'bg-gray-100 text-gris-piedra hover:bg-gray-200'
                                }`}
                            >
                                Exámenes Académicos
                                <Badge variant="info" className="ml-2">{academicEvaluations.length}</Badge>
                            </button>
                        )}
                        {hasPsychologicalEvaluations && (
                            <button
                                onClick={() => setActiveEvaluationTab('psicologicas')}
                                className={`px-4 py-2 font-semibold rounded-t-lg transition-colors ${
                                    activeEvaluationTab === 'psicologicas'
                                        ? 'bg-azul-monte-tabor text-blanco-pureza'
                                        : 'bg-gray-100 text-gris-piedra hover:bg-gray-200'
                                }`}
                            >
                                Entrevistas Psicológicas/Director
                                <Badge variant="info" className="ml-2">{psychologicalEvaluations.length}</Badge>
                            </button>
                        )}
                        {hasFamilyEvaluations && (
                            <button
                                onClick={() => setActiveEvaluationTab('familiares')}
                                className={`px-4 py-2 font-semibold rounded-t-lg transition-colors ${
                                    activeEvaluationTab === 'familiares'
                                        ? 'bg-azul-monte-tabor text-blanco-pureza'
                                        : 'bg-gray-100 text-gris-piedra hover:bg-gray-200'
                                }`}
                            >
                                Entrevistas Familiares
                                <Badge variant="info" className="ml-2">{familyEvaluations.length}</Badge>
                            </button>
                        )}
                    </div>
                )}

                {isLoading ? (
                    <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-azul-monte-tabor mx-auto"></div>
                        <p className="text-gris-piedra mt-2">Cargando evaluaciones...</p>
                    </div>
                ) : (
                    <Table
                        data={currentEvaluations}
                        columns={evaluationColumns}
                        emptyMessage={`No hay evaluaciones ${
                            activeEvaluationTab === 'academicas' ? 'académicas' :
                            activeEvaluationTab === 'psicologicas' ? 'psicológicas/director' :
                            'familiares'
                        } asignadas`}
                    />
                )}
            </Card>
        );
    };

    // Helper function to check if an interview has a completed evaluation
    const isInterviewCompleted = (interview: Interview): boolean => {
        // Map interview type to expected evaluation type
        const expectedEvalType =
            interview.type === 'CYCLE_DIRECTOR' ? 'CYCLE_DIRECTOR_INTERVIEW' :
            interview.type === 'FAMILY' ? 'FAMILY_INTERVIEW' :
            'PSYCHOLOGICAL_INTERVIEW';

        // Search for matching evaluation
        const matchingEval = evaluations.find(e =>
            e.applicationId === interview.applicationId &&
            e.evaluationType === expectedEvalType
        );

        // Return true only if evaluation exists AND is COMPLETED
        return matchingEval?.status === 'COMPLETED';
    };

    const renderEntrevistas = () => {
        // Separate interviews by status
        const upcomingInterviews = interviews.filter(
            i => i.status === InterviewStatus.SCHEDULED || i.status === InterviewStatus.CONFIRMED
        ).sort((a, b) => {
            const dateA = new Date(`${a.scheduledDate}T${a.scheduledTime}`);
            const dateB = new Date(`${b.scheduledDate}T${b.scheduledTime}`);
            return dateA.getTime() - dateB.getTime();
        });

        // Use helper function to check if evaluation is completed
        const completedInterviews = interviews.filter(
            i => isInterviewCompleted(i)
        ).sort((a, b) => {
            const dateA = new Date(`${a.scheduledDate}T${a.scheduledTime}`);
            const dateB = new Date(`${b.scheduledDate}T${b.scheduledTime}`);
            return dateB.getTime() - dateA.getTime(); // Most recent first
        });

        // DEBUG: Log interview counts
        console.log('DEBUG - Interview counts:');
        console.log(`  Total interviews loaded: ${interviews.length}`);
        console.log(`  Completed interviews (with COMPLETED evaluation): ${completedInterviews.length}`);
        console.log(`  Family interviews in completedInterviews: ${completedInterviews.filter(i => i.type === 'FAMILY').length}`);
        console.log(`  CYCLE_DIRECTOR interviews in completedInterviews: ${completedInterviews.filter(i => i.type === 'CYCLE_DIRECTOR').length}`);

        const getStatusColor = (status: InterviewStatus): 'success' | 'warning' | 'info' | 'error' => {
            switch (status) {
                case InterviewStatus.COMPLETED:
                    return 'success';
                case InterviewStatus.SCHEDULED:
                case InterviewStatus.CONFIRMED:
                    return 'info';
                case InterviewStatus.CANCELLED:
                    return 'error';
                default:
                    return 'warning';
            }
        };

        // Filtrar entrevistas por tipo
        const familyInterviews = interviews.filter(i => i.type === 'FAMILY');
        const directorInterviews = interviews.filter(i => i.type === 'CYCLE_DIRECTOR');

        return (
            <div className="space-y-6">
                <Card className="p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold text-azul-monte-tabor flex items-center">
                            <FiCalendar className="mr-2" />
                            Mis Entrevistas e Informes
                        </h2>
                        {/* Botón de recarga manual */}
                        <Button
                            onClick={() => {
                                console.log('Manual refresh triggered - incrementing refreshKey');
                                setRefreshKey(prev => prev + 1);
                            }}
                            variant="outline"
                            size="sm"
                            className="flex items-center gap-2"
                            disabled={isLoading}
                        >
                            <FiRefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                            Actualizar
                        </Button>
                    </div>

                    {isLoading ? (
                        <div className="text-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-azul-monte-tabor mx-auto"></div>
                            <p className="text-gris-piedra mt-4">Cargando...</p>
                        </div>
                    ) : (
                        <>
                            {/* Tabs de navegación */}
                            <div className="border-b border-gray-200 mb-6">
                                <nav className="flex space-x-8">
                                    <button
                                        onClick={() => setActiveInterviewTab('familiares')}
                                        className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                                            activeInterviewTab === 'familiares'
                                                ? 'border-azul-monte-tabor text-azul-monte-tabor'
                                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                        }`}
                                    >
                                        Entrevistas Familiares ({familyInterviews.length})
                                    </button>
                                    <button
                                        onClick={() => setActiveInterviewTab('director_ciclo')}
                                        className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                                            activeInterviewTab === 'director_ciclo'
                                                ? 'border-azul-monte-tabor text-azul-monte-tabor'
                                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                        }`}
                                    >
                                        🎓 Entrevistas Director de Ciclo ({directorInterviews.length})
                                    </button>
                                    {/* Solo mostrar Informes Finales para Directores de Ciclo */}
                                    {currentProfessor?.role === 'CYCLE_DIRECTOR' && (
                                        <button
                                            onClick={() => setActiveInterviewTab('informes')}
                                            className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                                                activeInterviewTab === 'informes'
                                                    ? 'border-azul-monte-tabor text-azul-monte-tabor'
                                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                            }`}
                                        >
                                            Informes Finales
                                        </button>
                                    )}
                                </nav>
                            </div>

                            {/* Contenido según tab activo */}
                            {activeInterviewTab === 'informes' && currentProfessor?.role === 'CYCLE_DIRECTOR' ? (
                                <div className="space-y-6">
                                    {/* Informes Finales - CYCLE_DIRECTOR_REPORT */}
                                    <div>
                                        <h3 className="text-lg font-semibold text-azul-monte-tabor mb-4 flex items-center">
                                            <FileTextIcon className="w-5 h-5 mr-2" />
                                            Informes Finales de Director de Ciclo
                                        </h3>
                                        <p className="text-sm text-gray-600 mb-4">
                                            Crear informes integrales basados en los 3 exámenes académicos (Lenguaje, Matemática, Inglés)
                                        </p>

                                        {/* Filtrar evaluaciones de tipo CYCLE_DIRECTOR_REPORT */}
                                        {(() => {
                                            const directorReports = evaluations.filter(e => e.evaluationType === 'CYCLE_DIRECTOR_REPORT');

                                            return directorReports.length === 0 ? (
                                                <div className="text-center py-8 bg-gray-50 border border-gray-200 rounded-lg">
                                                    <FileTextIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                                    <p className="text-sm text-gray-500">No hay informes finales asignados actualmente</p>
                                                </div>
                                            ) : (
                                                <div className="space-y-3">
                                                    {directorReports.map(report => (
                                                        <div key={report.id} className="border border-gray-200 bg-white rounded-lg p-4 hover:shadow-md transition-shadow">
                                                            <div className="flex items-center justify-between">
                                                                <div className="flex-1">
                                                                    <h4 className="font-bold text-azul-monte-tabor">
                                                                        {report.studentName}
                                                                    </h4>
                                                                    <p className="text-sm text-gris-piedra">
                                                                        Aplicación #{report.applicationId}
                                                                    </p>
                                                                    <div className="text-xs text-gray-600 mt-1">
                                                                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                                                            report.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                                                                            report.status === 'IN_PROGRESS' ? 'bg-yellow-100 text-yellow-800' :
                                                                            'bg-blue-100 text-blue-800'
                                                                        }`}>
                                                                            {report.status === 'COMPLETED' ? 'Completado' :
                                                                             report.status === 'IN_PROGRESS' ? 'En Progreso' :
                                                                             'Pendiente'}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center space-x-2">
                                                                    <button
                                                                        onClick={() => navigate(`/profesor/informe-director/${report.id}`)}
                                                                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                                                                            report.status === 'COMPLETED'
                                                                                ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                                                : 'bg-azul-monte-tabor text-white hover:bg-blue-700'
                                                                        }`}
                                                                    >
                                                                        {report.status === 'COMPLETED' ? 'Ver Informe' : 'Completar Informe'}
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            );
                                        })()}
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-6">
                            {/* Upcoming Interviews - Filtradas por tab activo */}
                            <div>
                                <h3 className="text-lg font-semibold text-azul-monte-tabor mb-4 flex items-center">
                                    <ClockIcon className="w-5 h-5 mr-2" />
                                    {activeInterviewTab === 'familiares' ? 'Entrevistas Familiares' : 'Entrevistas Director de Ciclo'} Programadas ({upcomingInterviews.filter(i => i.type === (activeInterviewTab === 'familiares' ? 'FAMILY' : 'CYCLE_DIRECTOR')).length})
                                </h3>
                                {upcomingInterviews.filter(i => i.type === (activeInterviewTab === 'familiares' ? 'FAMILY' : 'CYCLE_DIRECTOR')).length === 0 ? (
                                    <div className="text-center py-4 bg-blue-50 border border-blue-200 rounded-lg">
                                        <p className="text-sm text-blue-600">No hay entrevistas programadas próximamente</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {upcomingInterviews.filter(i => i.type === (activeInterviewTab === 'familiares' ? 'FAMILY' : 'CYCLE_DIRECTOR')).map(interview => (
                                            <div key={interview.id} className="border border-blue-200 bg-blue-50 rounded-lg p-4">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex-1">
                                                        <h4 className="font-bold text-azul-monte-tabor">
                                                            {interview.studentName}
                                                        </h4>
                                                        <p className="text-sm text-gris-piedra">
                                                            Tipo: {INTERVIEW_TYPE_LABELS[interview.type as InterviewType] || interview.type}
                                                        </p>
                                                        <div className="text-xs text-gray-600 mt-1 space-y-1">
                                                            <div>{(() => {
                                                                // Parse date in local timezone to avoid offset issues
                                                                const [year, month, day] = interview.scheduledDate.split('-');
                                                                const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                                                                return date.toLocaleDateString('es-CL', {
                                                                    weekday: 'long',
                                                                    day: 'numeric',
                                                                    month: 'long',
                                                                    year: 'numeric'
                                                                });
                                                            })()}</div>
                                                            <div> {interview.scheduledTime} ({interview.duration} min)</div>
                                                            {interview.location && <div>{interview.location}</div>}
                                                            {/* Show both interviewers if there's a second one, otherwise just show the main interviewer */}
                                                            {interview.secondInterviewerName ? (
                                                                <div>Entrevistadores: {interview.interviewerName} y {interview.secondInterviewerName}</div>
                                                            ) : (
                                                                <div>Entrevistador: {interview.interviewerName}</div>
                                                            )}
                                                            {interview.notes && (
                                                                <div className="mt-2 pt-2 border-t border-gray-200">
                                                                    <div className="font-medium text-gray-700">Notas/Enlaces:</div>
                                                                    <div className="text-gray-600 whitespace-pre-wrap break-words">
                                                                        {interview.notes}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-col items-end gap-2">
                                                        <Badge variant={getStatusColor(interview.status)} size="sm">
                                                            {INTERVIEW_STATUS_LABELS[interview.status]}
                                                        </Badge>
                                                        <div className="flex gap-2 mt-2">
                                                            <Button
                                                                variant="primary"
                                                                size="sm"
                                                                onClick={async () => {
                                                                    console.log('Realizar entrevista:', interview.id);
                                                                    console.log('Application ID:', interview.applicationId);

                                                                    // Buscar evaluación existente
                                                                    try {
                                                                        const evals = await professorEvaluationService.getMyEvaluations();
                                                                        console.log('Total evaluaciones cargadas:', evals.length);
                                                                        console.log('Buscando evaluación para application_id:', interview.applicationId);
                                                                        console.log('Tipo de entrevista:', interview.type);

                                                                        // Determinar qué tipo de evaluación buscar según el tipo de entrevista
                                                                        const expectedEvalType =
                                                                            interview.type === 'CYCLE_DIRECTOR' ? 'CYCLE_DIRECTOR_INTERVIEW' :
                                                                            interview.type === 'FAMILY' ? 'FAMILY_INTERVIEW' :
                                                                            'PSYCHOLOGICAL_INTERVIEW';

                                                                        console.log('Buscando evaluación de tipo:', expectedEvalType);

                                                                        // Buscar evaluación que coincida con applicationId y tipo
                                                                        const matchingEval = evals.find(e => {
                                                                            const matches = e.applicationId === interview.applicationId && e.evaluationType === expectedEvalType;
                                                                            if (e.applicationId === interview.applicationId) {
                                                                                console.log(`  - Evaluación ${e.id}: applicationId=${e.applicationId}, type=${e.evaluationType}, matches=${matches}`);
                                                                            }
                                                                            return matches;
                                                                        });

                                                                        if (matchingEval) {
                                                                            console.log('Evaluación encontrada:', matchingEval.id);
                                                                            console.log('Tipo de evaluación encontrada:', matchingEval.evaluationType);

                                                                            // Navegar al formulario correspondiente según el tipo de evaluación
                                                                            if (matchingEval.evaluationType === 'CYCLE_DIRECTOR_INTERVIEW') {
                                                                                console.log('Navegando a formulario de Director de Ciclo');
                                                                                navigate(`/cycle-director-interview/${matchingEval.id}`);
                                                                            } else if (matchingEval.evaluationType === 'PSYCHOLOGICAL_INTERVIEW') {
                                                                                console.log('Navegando a formulario Psicológico');
                                                                                navigate(`/psychological-interview/${matchingEval.id}`);
                                                                            } else if (matchingEval.evaluationType === 'FAMILY_INTERVIEW') {
                                                                                console.log('Navegando a formulario de Entrevista Familiar');
                                                                                navigate(`/profesor/entrevista-familiar/${matchingEval.id}`);
                                                                            } else {
                                                                                console.warn('Tipo de evaluación no reconocido:', matchingEval.evaluationType);
                                                                                alert(`Tipo de evaluación no soportado: ${matchingEval.evaluationType}`);
                                                                            }
                                                                        } else {
                                                                            console.warn('No se encontró evaluación existente para esta entrevista');
                                                                            alert(
                                                                                `Esta entrevista aún no tiene una evaluación asignada.\n\n` +
                                                                                `Por favor, contacta al administrador para que te asigne esta evaluación.`
                                                                            );
                                                                        }
                                                                    } catch (error) {
                                                                        console.error('Error buscando evaluación:', error);
                                                                        alert('Error al buscar la evaluación asociada');
                                                                    }
                                                                }}
                                                            >
                                                                {isInterviewCompleted(interview) ? 'Modificar' : 'Realizar'}
                                                            </Button>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => {
                                                                    // TODO: Navigate to interview details modal
                                                                    console.log('Ver detalles:', interview.id);
                                                                    alert(`Detalles de entrevista:\n\nEstudiante: ${interview.studentName}\nFecha: ${interview.scheduledDate}\nHora: ${interview.scheduledTime}\nTipo: ${INTERVIEW_TYPE_LABELS[interview.type as InterviewType]}`);
                                                                }}
                                                            >
                                                                Ver
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Completed Interviews - Filtradas por tab activo */}
                            <div>
                                <h3 className="text-lg font-semibold text-azul-monte-tabor mb-4 flex items-center">
                                    <CheckCircleIcon className="w-5 h-5 mr-2 text-green-600" />
                                    {activeInterviewTab === 'familiares' ? 'Entrevistas Familiares' : 'Entrevistas Director de Ciclo'} Realizadas ({completedInterviews.filter(i => i.type === (activeInterviewTab === 'familiares' ? 'FAMILY' : 'CYCLE_DIRECTOR')).length})
                                </h3>
                                {completedInterviews.filter(i => i.type === (activeInterviewTab === 'familiares' ? 'FAMILY' : 'CYCLE_DIRECTOR')).length === 0 ? (
                                    <div className="text-center py-4 bg-green-50 border border-green-200 rounded-lg">
                                        <p className="text-sm text-green-600">Aún no has completado ninguna entrevista de este tipo</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {completedInterviews.filter(i => i.type === (activeInterviewTab === 'familiares' ? 'FAMILY' : 'CYCLE_DIRECTOR')).map(interview => (
                                            <div key={interview.id} className="border border-green-200 bg-green-50 rounded-lg p-4">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex-1">
                                                        <h4 className="font-bold text-azul-monte-tabor">
                                                            {interview.studentName}
                                                        </h4>
                                                        <p className="text-sm text-gris-piedra">
                                                            Tipo: {INTERVIEW_TYPE_LABELS[interview.type as InterviewType] || interview.type}
                                                        </p>
                                                        <div className="text-xs text-gray-600 mt-1">
                                                            Realizada el {new Date(interview.scheduledDate).toLocaleDateString('es-CL')} a las {interview.scheduledTime}
                                                        </div>
                                                        {interview.secondInterviewerName && (
                                                            <div className="text-xs text-gray-600">Con: {interview.secondInterviewerName}</div>
                                                        )}
                                                    </div>
                                                    <div className="flex flex-col items-end gap-2">
                                                        <Badge variant="success" size="sm">
                                                            Realizada
                                                        </Badge>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={async () => {
                                                                console.log('Ver resultados:', interview.id);
                                                                console.log('Application ID:', interview.applicationId);

                                                                try {
                                                                    const evals = await professorEvaluationService.getMyEvaluations();

                                                                    // Determinar qué tipo de evaluación buscar según el tipo de entrevista
                                                                    const expectedEvalType =
                                                                        interview.type === 'CYCLE_DIRECTOR' ? 'CYCLE_DIRECTOR_INTERVIEW' :
                                                                        interview.type === 'FAMILY' ? 'FAMILY_INTERVIEW' :
                                                                        'PSYCHOLOGICAL_INTERVIEW';

                                                                    const matchingEval = evals.find(e =>
                                                                        e.applicationId === interview.applicationId &&
                                                                        e.evaluationType === expectedEvalType
                                                                    );

                                                                    if (matchingEval) {
                                                                        console.log('Evaluación encontrada para ver resultados:', matchingEval.id);
                                                                        console.log('Tipo:', matchingEval.evaluationType);

                                                                        // Navegar al formulario correspondiente según el tipo de evaluación
                                                                        if (matchingEval.evaluationType === 'CYCLE_DIRECTOR_INTERVIEW') {
                                                                            navigate(`/cycle-director-interview/${matchingEval.id}`);
                                                                        } else if (matchingEval.evaluationType === 'PSYCHOLOGICAL_INTERVIEW') {
                                                                            navigate(`/psychological-interview/${matchingEval.id}`);
                                                                        } else if (matchingEval.evaluationType === 'FAMILY_INTERVIEW') {
                                                                            navigate(`/profesor/entrevista-familiar/${matchingEval.id}`);
                                                                        }
                                                                    } else {
                                                                        console.error('No se encontró evaluación para ver resultados');
                                                                        alert(`No se encontró la evaluación de tipo "${expectedEvalType}" asociada a esta entrevista.`);
                                                                    }
                                                                } catch (error) {
                                                                    console.error('Error buscando evaluación:', error);
                                                                    alert('Error al cargar los resultados');
                                                                }
                                                            }}
                                                        >
                                                            Ver Resultados
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                        </>
                    )}
                </Card>
            </div>
        );
    };

    const renderEstudiantes = () => {
        // Crear lista única de estudiantes desde las evaluaciones reales
        const uniqueStudents = new Map();
        evaluations.forEach(evaluation => {
            const studentId = evaluation.studentId || evaluation.id;
            if (!uniqueStudents.has(studentId)) {
                uniqueStudents.set(studentId, {
                    id: studentId,
                    name: evaluation.studentName,
                    grade: evaluation.studentGrade,
                    birthDate: evaluation.studentBirthDate,
                    currentSchool: evaluation.currentSchool,
                    evaluations: []
                });
            }
            uniqueStudents.get(studentId).evaluations.push(evaluation);
        });

        const myStudents = Array.from(uniqueStudents.values());

        // Determinar si mostrar columna de promedio (solo si hay evaluaciones con puntajes)
        const hasAcademicEvaluations = evaluations.some(e =>
            ['MATHEMATICS_EXAM', 'LANGUAGE_EXAM', 'ENGLISH_EXAM'].includes(e.evaluationType)
        );

        // Columnas base
        const baseStudentColumns = [
            {
                key: 'name' as const,
                header: 'Estudiante',
                render: (value: any, student: any) => (
                    <div>
                        <p className="font-semibold">{student.name}</p>
                        <p className="text-sm text-gris-piedra">{student.grade}</p>
                        {student.currentSchool && (
                            <p className="text-xs text-gris-piedra">
                                {student.currentSchool}
                            </p>
                        )}
                    </div>
                )
            },
            {
                key: 'evaluations' as const,
                header: 'Evaluaciones',
                render: (evaluations: ProfessorEvaluation[], student: any) => (
                    <div>
                        <p className="font-medium">{evaluations.length} evaluacion{evaluations.length !== 1 ? 'es' : ''}</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                            {evaluations.map((evaluation, index) => (
                                <span key={index} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                    {getEvaluationTypeLabel(evaluation.evaluationType).split(' ')[0]}
                                </span>
                            ))}
                        </div>
                    </div>
                )
            },
            {
                key: 'status' as const,
                header: 'Estado',
                render: (value: any, student: any) => {
                    const completedEvaluations = student.evaluations.filter((e: ProfessorEvaluation) =>
                        e.status === EvaluationStatus.COMPLETED
                    );
                    const totalEvaluations = student.evaluations.length;

                    if (completedEvaluations.length === totalEvaluations) {
                        return <Badge variant="success">Completo ({completedEvaluations.length}/{totalEvaluations})</Badge>;
                    } else if (completedEvaluations.length > 0) {
                        return <Badge variant="warning">Parcial ({completedEvaluations.length}/{totalEvaluations})</Badge>;
                    } else {
                        return <Badge variant="info">Pendiente ({completedEvaluations.length}/{totalEvaluations})</Badge>;
                    }
                }
            }
        ];

        // Columna de promedio (solo para evaluaciones académicas)
        const averageScoreColumn = {
            key: 'averageScore' as const,
            header: 'Promedio',
            render: (value: any, student: any) => {
                const completedWithScore = student.evaluations.filter((e: ProfessorEvaluation) =>
                    e.status === EvaluationStatus.COMPLETED && e.score
                );

                if (completedWithScore.length === 0) {
                    return <span className="text-gris-piedra">-</span>;
                }

                // Calculate average percentage from all completed evaluations with scores
                const averagePercentage = completedWithScore.reduce((sum: number, e: ProfessorEvaluation) => {
                    const maxScore = e.maxScore || 100;
                    const percentage = (e.score || 0) / maxScore * 100;
                    return sum + percentage;
                }, 0) / completedWithScore.length;

                return (
                    <div className="text-center">
                        <span className="font-semibold text-azul-monte-tabor">
                            {Math.round(averagePercentage)}%
                        </span>
                    </div>
                );
            }
        };

        // Columna de acciones
        const actionsStudentColumn = {
            key: 'actions' as const,
            header: 'Acciones',
            render: (value: any, student: any) => (
                    <div className="flex gap-2">
                        {student.evaluations.map((evaluation: ProfessorEvaluation) => (
                            <Button
                                key={evaluation.id}
                                size="sm"
                                variant={evaluation.status === EvaluationStatus.COMPLETED ? "outline" : "primary"}
                                onClick={() => navigate(
                                    evaluation.evaluationType === 'CYCLE_DIRECTOR_INTERVIEW'
                                        ? `/profesor/entrevista-director/${evaluation.id}`
                                        : evaluation.evaluationType === 'PSYCHOLOGICAL_INTERVIEW'
                                        ? `/profesor/entrevista-director/${evaluation.id}`
                                        : evaluation.evaluationType === 'CYCLE_DIRECTOR_REPORT'
                                        ? `/profesor/informe-director/${evaluation.id}`
                                        : evaluation.evaluationType === 'FAMILY_INTERVIEW'
                                        ? `/profesor/entrevista-familiar/${evaluation.id}`
                                        : `/profesor/informe/${evaluation.id}`
                                )}
                                title={getEvaluationTypeLabel(evaluation.evaluationType)}
                            >
                                {evaluation.evaluationType === 'CYCLE_DIRECTOR_INTERVIEW'
                                    ? (evaluation.status === EvaluationStatus.COMPLETED ? "Ver Entrevista" : "Entrevista")
                                    : evaluation.evaluationType === 'PSYCHOLOGICAL_INTERVIEW'
                                    ? (evaluation.status === EvaluationStatus.COMPLETED ? "Ver Entrevista" : "Entrevista")
                                    : evaluation.evaluationType === 'CYCLE_DIRECTOR_REPORT'
                                    ? (evaluation.status === EvaluationStatus.COMPLETED ? "Ver Informe" : "Informe")
                                    : evaluation.evaluationType === 'FAMILY_INTERVIEW'
                                    ? (evaluation.status === EvaluationStatus.COMPLETED ? "Ver Entrevista" : "Entrevista")
                                    : (evaluation.status === EvaluationStatus.COMPLETED ? "Ver Informe" : "Evaluar")}
                            </Button>
                        ))}
                    </div>
                )
        };

        // Construir array de columnas dinámicamente
        const studentColumns = hasAcademicEvaluations
            ? [...baseStudentColumns, averageScoreColumn, actionsStudentColumn]
            : [...baseStudentColumns, actionsStudentColumn];

        return (
            <Card className="p-6">
                <h2 className="text-xl font-bold text-azul-monte-tabor mb-4">
                    Mis Estudiantes ({myStudents.length})
                </h2>
                {isLoading ? (
                    <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-azul-monte-tabor mx-auto"></div>
                        <p className="text-gris-piedra mt-2">Cargando estudiantes...</p>
                    </div>
                ) : (
                    <Table
                        data={myStudents}
                        columns={studentColumns}
                        emptyMessage="No hay estudiantes asignados"
                    />
                )}
            </Card>
        );
    };

    const renderReportesEstadisticas = () => {
        // Calcular estadísticas detalladas
        const completedEvaluations = evaluations.filter(e => e.status === EvaluationStatus.COMPLETED);
        const evaluationsWithScore = completedEvaluations.filter(e => e.score);
        
        // Estadísticas por tipo de evaluación
        const statsByType = evaluations.reduce((acc: any, evaluation) => {
            const type = evaluation.evaluationType;
            if (!acc[type]) {
                acc[type] = { total: 0, completed: 0, pending: 0, averageScore: 0, percentages: [] };
            }
            acc[type].total++;
            if (evaluation.status === EvaluationStatus.COMPLETED) {
                acc[type].completed++;
                if (evaluation.score) {
                    const maxScore = evaluation.maxScore || 100;
                    const percentage = (evaluation.score / maxScore) * 100;
                    acc[type].percentages.push(percentage);
                }
            } else {
                acc[type].pending++;
            }
            acc[type].averageScore = acc[type].percentages.length > 0
                ? Math.round(acc[type].percentages.reduce((sum: number, percentage: number) => sum + percentage, 0) / acc[type].percentages.length)
                : 0;
            return acc;
        }, {});

        // Estadísticas por grado
        const statsByGrade = evaluations.reduce((acc: any, evaluation) => {
            const grade = evaluation.studentGrade;
            if (!acc[grade]) {
                acc[grade] = { total: 0, completed: 0, averageScore: 0, percentages: [] };
            }
            acc[grade].total++;
            if (evaluation.status === EvaluationStatus.COMPLETED) {
                acc[grade].completed++;
                if (evaluation.score) {
                    const maxScore = evaluation.maxScore || 100;
                    const percentage = (evaluation.score / maxScore) * 100;
                    acc[grade].percentages.push(percentage);
                }
            }
            acc[grade].averageScore = acc[grade].percentages.length > 0
                ? Math.round(acc[grade].percentages.reduce((sum: number, percentage: number) => sum + percentage, 0) / acc[grade].percentages.length)
                : 0;
            return acc;
        }, {});

        // Evaluaciones por fecha (últimas 2 semanas)
        const twoWeeksAgo = new Date();
        twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
        
        const recentEvaluations = completedEvaluations.filter(e => 
            e.completedDate && new Date(e.completedDate) >= twoWeeksAgo
        );

        return (
            <div className="space-y-6">
                {/* Header */}
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-bold text-azul-monte-tabor">
                        Reportes y Estadísticas
                    </h2>
                    <div className="flex gap-2">
                        <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => window.print()}
                        >
                            Imprimir Reporte
                        </Button>
                        <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                                // Generar CSV básico
                                const csvData = evaluations.map(e => 
                                    `${e.studentName},${e.studentGrade},${getEvaluationTypeLabel(e.evaluationType)},${e.status},${e.score || 'N/A'}`
                                ).join('\n');
                                const blob = new Blob([`Estudiante,Grado,Evaluación,Estado,Puntaje\n${csvData}`], { type: 'text/csv' });
                                const url = window.URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = `evaluaciones_${currentProfessor?.firstName}_${new Date().toISOString().split('T')[0]}.csv`;
                                a.click();
                            }}
                        >
                            Exportar CSV
                        </Button>
                    </div>
                </div>

                {/* Resumen General */}
                <Card className="p-6">
                    <h3 className="text-lg font-bold text-azul-monte-tabor mb-4">Resumen General</h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-blue-50 p-4 rounded-lg text-center">
                            <div className="text-2xl font-bold text-azul-monte-tabor">{evaluationStats.total}</div>
                            <div className="text-sm text-gris-piedra">Total Evaluaciones</div>
                        </div>
                        <div className="bg-green-50 p-4 rounded-lg text-center">
                            <div className="text-2xl font-bold text-verde-esperanza">{evaluationStats.completed}</div>
                            <div className="text-sm text-gris-piedra">Completadas</div>
                            <div className="text-xs text-gris-piedra">
                                ({Math.round((evaluationStats.completed / evaluationStats.total) * 100)}%)
                            </div>
                        </div>
                        <div className="bg-yellow-50 p-4 rounded-lg text-center">
                            <div className="text-2xl font-bold text-dorado-nazaret">{evaluationStats.pending + evaluationStats.inProgress}</div>
                            <div className="text-sm text-gris-piedra">Pendientes</div>
                        </div>
                        <div className="bg-purple-50 p-4 rounded-lg text-center">
                            <div className="text-2xl font-bold text-azul-monte-tabor">{evaluationStats.averageScore}%</div>
                            <div className="text-sm text-gris-piedra">Promedio General</div>
                        </div>
                    </div>
                </Card>

                {/* Estadísticas por Tipo de Evaluación */}
                <Card className="p-6">
                    <h3 className="text-lg font-bold text-azul-monte-tabor mb-4">Estadísticas por Tipo de Evaluación</h3>
                    <div className="space-y-4">
                        {Object.entries(statsByType).map(([type, stats]: [string, any]) => (
                            <div key={type} className="border border-gray-200 rounded-lg p-4">
                                <div className="flex justify-between items-center mb-2">
                                    <h4 className="font-semibold text-azul-monte-tabor">
                                        {getEvaluationTypeLabel(type as EvaluationType)}
                                    </h4>
                                    <Badge variant="info">{stats.total} evaluaciones</Badge>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                    <div>
                                        <span className="text-gris-piedra">Completadas:</span>
                                        <span className="ml-2 font-medium text-verde-esperanza">
                                            {stats.completed}/{stats.total} ({Math.round((stats.completed/stats.total)*100)}%)
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-gris-piedra">Pendientes:</span>
                                        <span className="ml-2 font-medium text-dorado-nazaret">{stats.pending}</span>
                                    </div>
                                    <div>
                                        <span className="text-gris-piedra">Promedio:</span>
                                        <span className="ml-2 font-medium text-azul-monte-tabor">
                                            {stats.averageScore > 0 ? `${stats.averageScore}%` : 'N/A'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>

                {/* Estadísticas por Grado */}
                <Card className="p-6">
                    <h3 className="text-lg font-bold text-azul-monte-tabor mb-4">Estadísticas por Grado</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {Object.entries(statsByGrade).map(([grade, stats]: [string, any]) => (
                            <div key={grade} className="border border-gray-200 rounded-lg p-4">
                                <h4 className="font-semibold text-azul-monte-tabor mb-2">{grade}</h4>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-gris-piedra">Total:</span>
                                        <span className="font-medium">{stats.total}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gris-piedra">Completadas:</span>
                                        <span className="font-medium text-verde-esperanza">{stats.completed}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gris-piedra">Promedio:</span>
                                        <span className="font-medium text-azul-monte-tabor">
                                            {stats.averageScore > 0 ? `${stats.averageScore}%` : 'N/A'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>

                {/* Actividad Reciente */}
                <Card className="p-6">
                    <h3 className="text-lg font-bold text-azul-monte-tabor mb-4">
                        Actividad Reciente (últimas 2 semanas)
                    </h3>
                    {recentEvaluations.length > 0 ? (
                        <div className="space-y-3">
                            {recentEvaluations.map((evaluation) => (
                                <div key={evaluation.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                    <div>
                                        <p className="font-medium">{evaluation.studentName}</p>
                                        <p className="text-sm text-gris-piedra">
                                            {getEvaluationTypeLabel(evaluation.evaluationType)} - {evaluation.studentGrade}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-medium text-azul-monte-tabor">
                                            {evaluation.score ? `${Math.round((evaluation.score / (evaluation.maxScore || 100)) * 100)}%` : 'Sin puntaje'}
                                        </p>
                                        <p className="text-xs text-gris-piedra">
                                            {evaluation.completedDate ? new Date(evaluation.completedDate).toLocaleDateString('es-CL') : '-'}
                                        </p>
                                    </div>
                                </div>
                            ))}
                            {recentEvaluations.length > 10 && (
                                <p className="text-center text-gris-piedra text-sm">
                                    ... y {recentEvaluations.length - 10} evaluaciones más
                                </p>
                            )}
                        </div>
                    ) : (
                        <p className="text-gris-piedra text-center py-4">
                            No hay evaluaciones completadas en las últimas 2 semanas
                        </p>
                    )}
                </Card>

                {/* Progreso y Productividad */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card className="p-6">
                        <h3 className="text-lg font-bold text-azul-monte-tabor mb-4">Progreso Semanal</h3>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="text-gris-piedra">Esta semana:</span>
                                <span className="font-medium text-azul-monte-tabor">
                                    {recentEvaluations.filter(e => {
                                        const oneWeekAgo = new Date();
                                        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
                                        return e.completedDate && new Date(e.completedDate) >= oneWeekAgo;
                                    }).length} evaluaciones
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gris-piedra">Semana anterior:</span>
                                <span className="font-medium text-azul-monte-tabor">
                                    {recentEvaluations.filter(e => {
                                        const twoWeeksAgo = new Date();
                                        const oneWeekAgo = new Date();
                                        twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
                                        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
                                        return e.completedDate && 
                                               new Date(e.completedDate) >= twoWeeksAgo && 
                                               new Date(e.completedDate) < oneWeekAgo;
                                    }).length} evaluaciones
                                </span>
                            </div>
                        </div>
                    </Card>

                    <Card className="p-6">
                        <h3 className="text-lg font-bold text-azul-monte-tabor mb-4">Información del Profesor</h3>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gris-piedra">Nombre:</span>
                                <span className="font-medium">{currentProfessor?.firstName} {currentProfessor?.lastName}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gris-piedra">Asignatura:</span>
                                <span className="font-medium">{currentProfessor?.subject ? getSubjectName(currentProfessor.subject) : 'No especificada'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gris-piedra">Total de Estudiantes:</span>
                                <span className="font-medium">{new Set(evaluations.map(e => e.applicationId)).size}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gris-piedra">Evaluaciones Asignadas:</span>
                                <span className="font-medium">{evaluations.length}</span>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        );
    };


    const renderSection = () => {
        
        switch (activeSection) {
            case 'dashboard':
                return renderDashboard();
            case 'evaluaciones':
                return renderEvaluaciones();
            case 'entrevistas':
                return renderEntrevistas();
            case 'estudiantes':
                return renderEstudiantes();
            case 'horarios':
                return currentProfessor ? (
                    <WeeklyCalendar
                        userId={currentProfessor.id}
                        userRole={currentProfessor.role}
                        onScheduleChange={() => {
                            console.log('Horarios actualizados en ProfessorDashboard - Usando WeeklyCalendar');
                        }}
                    />
                ) : (
                    <Card className="p-6">
                        <p className="text-gris-piedra">No se pudo cargar la información del profesor</p>
                    </Card>
                );
            case 'reportes':
                return renderReportesEstadisticas();
            case 'configuracion':
                return (
                    <Card className="p-6">
                        <h2 className="text-xl font-bold text-azul-monte-tabor mb-4">Configuración</h2>
                        <div className="space-y-4">
                            <div>
                                <h3 className="font-semibold text-azul-monte-tabor mb-2">Información Personal</h3>
                                <p><strong>Nombre:</strong> {currentProfessor?.firstName} {currentProfessor?.lastName}</p>
                                <p><strong>Email:</strong> {currentProfessor?.email}</p>
                                <p><strong>Asignatura:</strong> {currentProfessor?.subject ? getSubjectName(currentProfessor.subject) : 'No especificada'}</p>
                                <p><strong>Rol:</strong> {currentProfessor?.role ? USER_ROLE_LABELS[currentProfessor.role as UserRole] : 'No especificado'}</p>
                                {currentProfessor?.isAdmin && (
                                    <p className="text-dorado-nazaret"><strong>Permisos:</strong> Administrador</p>
                                )}
                            </div>
                            <div className="pt-4 border-t">
                                <ChangePasswordButton variant="outline" />
                            </div>
                        </div>
                    </Card>
                );
            case 'admin':
                return (
                    <Card className="p-6">
                        <h2 className="text-xl font-bold text-azul-monte-tabor mb-4">Panel de Administrador</h2>
                        <div className="space-y-6">
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                <h3 className="font-semibold text-azul-monte-tabor mb-2">Acceso Administrativo</h3>
                                <p className="text-gris-piedra mb-4">
                                    Como administrador, tienes acceso completo al sistema de gestión del colegio.
                                </p>
                                <Link to="/admin">
                                    <Button variant="primary">
                                        Ir al Panel de Administrador
                                    </Button>
                                </Link>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                    <h4 className="font-semibold text-azul-monte-tabor mb-2">Gestión de Postulaciones</h4>
                                    <p className="text-sm text-gris-piedra mb-3">
                                        Revisar y procesar solicitudes de admisión
                                    </p>
                                    <Link to="/admin">
                                        <Button variant="outline" size="sm">Acceder</Button>
                                    </Link>
                                </div>
                                
                                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                    <h4 className="font-semibold text-azul-monte-tabor mb-2">Gestión de Usuarios</h4>
                                    <p className="text-sm text-gris-piedra mb-3">
                                        Administrar cuentas de profesores y familias
                                    </p>
                                    <Link to="/admin">
                                        <Button variant="outline" size="sm">Acceder</Button>
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </Card>
                );
            default:
                return renderEvaluaciones();
        }
    };

    const SidebarNav = ({ onNavigate }: { onNavigate?: () => void }) => (
        <>
            <div className="text-blanco-pureza mb-8">
                <h2 className="text-xl font-bold">Portal Profesores</h2>
                <p className="text-blue-200 text-sm">Sistema de Evaluaciones</p>
            </div>
            <nav className="space-y-2 flex-1" aria-label="Menú de navegación del profesor">
                {sections.map((section) => {
                    const IconComponent = section.icon;
                    const showBadge = section.key === 'entrevistas' && interviews.length > 0;
                    return (
                        <button
                            key={section.key}
                            onClick={() => { setActiveSection(section.key); onNavigate?.(); }}
                            className={`w-full text-left px-4 py-3 rounded-lg font-semibold transition-colors duration-200 flex items-center gap-3 ${
                                activeSection === section.key
                                    ? 'bg-dorado-nazaret text-azul-monte-tabor'
                                    : 'text-blanco-pureza hover:bg-blue-800'
                            }`}
                            aria-label={`Navegar a sección ${section.label}`}
                            aria-current={activeSection === section.key ? 'page' : undefined}
                        >
                            <IconComponent className="w-5 h-5" aria-hidden="true" />
                            <span className="flex-1">{section.label}</span>
                            {showBadge && (
                                <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                                    {interviews.length}
                                </span>
                            )}
                        </button>
                    );
                })}
            </nav>
            <div className="mt-8 pt-8 border-t border-blue-700 space-y-2">
                <Link to="/" onClick={() => onNavigate?.()}>
                    <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-blanco-pureza border-blanco-pureza hover:bg-blanco-pureza hover:text-azul-monte-tabor"
                        ariaLabel="Volver al portal principal del sistema"
                    >
                        Volver al Portal Principal
                    </Button>
                </Link>
                <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-blanco-pureza border-blanco-pureza hover:bg-red-500 hover:text-blanco-pureza"
                    onClick={handleLogout}
                    ariaLabel="Cerrar sesión y salir del portal de profesores"
                >
                    Cerrar Sesión
                </Button>
            </div>
        </>
    );

    return (
        <div className="bg-gray-50 min-h-screen">
            {/* Mobile top bar */}
            <div className="md:hidden bg-azul-monte-tabor text-white px-4 py-3 flex items-center justify-between sticky top-0 z-30">
                <div>
                    <span className="font-bold">Portal Profesores</span>
                    <p className="text-blue-200 text-xs">Sistema de Evaluaciones</p>
                </div>
                <button
                    onClick={() => setIsSidebarOpen(prev => !prev)}
                    className="p-2 rounded-lg hover:bg-blue-800 transition-colors"
                    aria-label="Abrir menú de navegación"
                >
                    {isSidebarOpen ? (
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    ) : (
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    )}
                </button>
            </div>

            {/* Mobile overlay */}
            {isSidebarOpen && (
                <div className="md:hidden fixed inset-0 bg-black bg-opacity-40 z-40" onClick={() => setIsSidebarOpen(false)} />
            )}

            {/* Mobile sidebar drawer */}
            <div className={`md:hidden fixed top-0 left-0 h-full w-64 bg-azul-monte-tabor z-50 p-6 flex flex-col overflow-y-auto transform transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <SidebarNav onNavigate={() => setIsSidebarOpen(false)} />
            </div>

            <div className="flex">
                {/* Desktop Sidebar */}
                <aside className="w-64 bg-azul-monte-tabor min-h-screen p-6 hidden md:flex flex-col sticky top-0 self-start h-screen overflow-y-auto">
                    <SidebarNav />
                </aside>

                {/* Main Content */}
                <main className="flex-1 p-4 sm:p-8 min-w-0" role="main" aria-label="Contenido principal del dashboard del profesor">
                    {renderSection()}
                </main>
            </div>
        </div>
    );
};

export default ProfessorDashboard;