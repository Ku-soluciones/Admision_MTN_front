import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import Card from '../../admin/components/ui/Card';
import Button from '../../admin/components/ui/Button';
import Badge from '../../admin/components/ui/Badge';
import Table from '../components/ui/Table';
import ConfirmDialog from '../../admissions/components/ui/ConfirmDialog';
import {
    DashboardIcon,
    FileTextIcon,
    UsersIcon,
    BookOpenIcon,
    CheckCircleIcon,
    ClockIcon,
    BarChartIcon,
    LogoIcon
} from '../../admin/components/icons/Icons';
import { 
    mockProfessors, 
    getPendingExamsByProfessor, 
    getProfessorStats,
    mockStudentExams,
    mockStudentProfiles
} from '../../admin/services/staticData';
import { ExamStatus, StudentExam, StudentProfile } from '../../admin/types';
import { Link, useNavigate } from 'react-router-dom';
import { professorEvaluationService, ProfessorEvaluation, ProfessorEvaluationStats } from '../../admin/services/professorEvaluationService';
import { professorAuthService } from '../services/professorAuthService';
import { notify } from '../../admin/utils/notify';
import { EvaluationStatus, EvaluationType } from '../../admin/types/evaluation';
import { FiRefreshCw, FiBarChart2, FiCalendar, FiEye, FiClock, FiCheckCircle, FiSearch, FiInfo, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import SimpleAvailabilityCalendar from '../../../packages/shared-ui/src/components/schedule/SimpleAvailabilityCalendar';
import ChangePasswordButton from '../../admin/src/components/common/ChangePasswordButton';
import {
    Interview,
    InterviewStatus,
    InterviewType,
    INTERVIEW_STATUS_LABELS,
    INTERVIEW_TYPE_LABELS
} from '../../admin/types/interview';
import { interviewService } from '../services/interviewService';
import { UserRole, USER_ROLE_LABELS } from '../../admin/types/user';
import api from '../../admin/services/api';
import { appUrls } from '../../admin/utils/appUrls';
import { getStorageKey, BASE_STORAGE_KEYS, useAuthStore } from '../../../packages/backend-sdk/src/index';

const baseSections = [
    { key: 'dashboard',    label: 'Dashboard General',        icon: DashboardIcon },
    { key: 'examenes',    label: 'Mis Exámenes',             icon: FileTextIcon },
    { key: 'entrevistas',  label: 'Mis Entrevistas',          icon: UsersIcon },
    { key: 'estudiantes',  label: 'Mis Estudiantes',          icon: UsersIcon },
    { key: 'horarios',     label: 'Mis Horarios',             icon: ClockIcon },
    { key: 'reportes',     label: 'Reportes y Estadísticas',  icon: FileTextIcon },
    { key: 'configuracion',label: 'Información',               icon: BookOpenIcon },
];

interface SidebarNavProps {
    sections: Array<{ key: string; label: string; icon: React.ComponentType<{ className?: string }> }>;
    activeSection: string;
    onSectionChange: (key: string) => void;
    onShowLogout: () => void;
    interviews: Interview[];
    badgeCount?: number;
    onNavigate?: () => void;
}

const SidebarNav = React.memo(function SidebarNav({
    sections,
    activeSection,
    onSectionChange,
    onShowLogout,
    interviews,
    badgeCount,
    onNavigate,
}: SidebarNavProps) {
    return (
        <>
            <div className="mb-8 text-center">
                <LogoIcon className="mx-auto w-16 h-16 sm:w-24 sm:h-24 flex-shrink-0" />
                <h2 className="text-xl font-bold text-azul-monte-tabor">Portal Profesores</h2>
                <p className="text-gris-piedra text-sm">Sistema de Evaluaciones</p>
            </div>
            <nav className="space-y-2 flex-1" aria-label="Menú de navegación del profesor">
                {sections.map((section) => {
                    const IconComponent = section.icon;
                    const showBadge = section.key === 'entrevistas' && (badgeCount ?? interviews.length) > 0;
                    return (
                        <button
                            key={section.key}
                            onClick={() => { onSectionChange(section.key); onNavigate?.(); }}
                            className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-colors duration-200 flex items-center gap-3 ${
                                activeSection === section.key
                                    ? 'bg-azul-monte-tabor text-white'
                                    : 'text-gris-piedra hover:bg-gray-100'
                            }`}
                            aria-label={`Navegar a ${section.label}`}
                            aria-current={activeSection === section.key ? 'page' : undefined}
                        >
                            <IconComponent className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
                            <span className="flex-1">{section.label}</span>
                            {showBadge && (
                                <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                                    {badgeCount ?? interviews.length}
                                </span>
                            )}
                        </button>
                    );
                })}
            </nav>
            <div className="mt-8 pt-8 border-t border-gray-200 flex flex-col gap-3">
                <ChangePasswordButton className="w-full" variant="outline" />
                <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={onShowLogout}
                    ariaLabel="Cerrar sesión y volver al portal principal"
                >
                    Cerrar Sesión
                </Button>
            </div>
        </>
    );
});

const ProfessorDashboard: React.FC = () => {
    const navigate = useNavigate();

    // Obtener profesor actual del localStorage (con namespace de entorno)
    const [currentProfessor, setCurrentProfessor] = useState(() => {
        const key = getStorageKey(BASE_STORAGE_KEYS.CURRENT_PROFESSOR);
        const storedProfessor = localStorage.getItem(key) || localStorage.getItem('currentProfessor');
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
        setRefreshKey(prev => prev + 1);
    }, []);

    // Estado para el tab activo en la sección de evaluaciones
    const [activeEvaluationTab, setActiveEvaluationTab] = useState<'academicas' | 'psicologicas' | 'familiares'>('psicologicas');

    // Estado para el tab activo en la sección de entrevistas - dinámico según asignaciones
    const [activeInterviewTab, setActiveInterviewTab] = useState<string>('familiares');
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

    // Estado para la tabla de estudiantes
    const [studentSearch, setStudentSearch] = useState('');
    const [expandedStudentId, setExpandedStudentId] = useState<number | null>(null);
    const [studentPage, setStudentPage] = useState(1);
    const studentsPerPage = 10;

    // Determinar qué tabs de entrevistas mostrar según las evaluaciones asignadas
    const interviewTabs = useMemo(() => {
        const tabs: { key: string; label: string; count: number }[] = [];

        // Entrevistas Familiares
        const familyCount = interviews.filter(i => i.type === 'FAMILY').length;
        if (familyCount > 0 || evaluations.some(e => e.evaluationType === 'FAMILY_INTERVIEW')) {
            tabs.push({ key: 'familiares', label: 'Entrevistas Familiares', count: familyCount });
        }

        // Entrevistas Director de Ciclo
        const directorCount = interviews.filter(i => i.type === 'CYCLE_DIRECTOR').length;
        if (directorCount > 0 || evaluations.some(e => e.evaluationType === 'CYCLE_DIRECTOR_INTERVIEW')) {
            tabs.push({ key: 'director_ciclo', label: 'Entrevistas Director de Ciclo', count: directorCount });
        }

        // Entrevistas Psicológicas (para psicólogos)
        const psychoCount = interviews.filter(i => i.type === 'PSYCHOLOGICAL').length;
        if (psychoCount > 0 || evaluations.some(e => e.evaluationType === 'PSYCHOLOGICAL_INTERVIEW')) {
            tabs.push({ key: 'psicologicas', label: 'Entrevistas Psicológicas', count: psychoCount });
        }

        // Informes Finales (solo para Directores de Ciclo)
        const reportsCount = evaluations.filter(e => e.evaluationType === 'CYCLE_DIRECTOR_REPORT').length;
        if (currentProfessor?.role === 'CYCLE_DIRECTOR' && reportsCount > 0) {
            tabs.push({ key: 'informes', label: 'Informes Finales', count: reportsCount });
        }

        return tabs;
    }, [interviews, evaluations, currentProfessor?.role]);

    // Efecto para mantener el tab activo válido cuando cambian los datos
    useEffect(() => {
        if (interviewTabs.length > 0) {
            // Si el tab actual no existe en los tabs disponibles, seleccionar el primero
            const currentTabExists = interviewTabs.some(t => t.key === activeInterviewTab);
            if (!currentTabExists) {
                setActiveInterviewTab(interviewTabs[0].key);
            }
        }
    }, [interviewTabs]);

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
                    localStorage.setItem(getStorageKey(BASE_STORAGE_KEYS.CURRENT_PROFESSOR), JSON.stringify(updatedProfessor));
                    setCurrentProfessor(updatedProfessor);
                } else if (!professorData) {
                }
            } catch (error) {
                if (!abortController.signal.aborted) {
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
            try {
                if (isMounted) setIsLoading(true);

                // Fetch fresh professor data to guarantee correct ID regardless of localStorage state
                const freshProfessor = await professorAuthService.getCurrentProfessor();
                if (!freshProfessor) {
                    if (isMounted) setIsLoading(false);
                    return;
                }

                if (isMounted && freshProfessor.id !== currentProfessorRef.current?.id) {
                    const updated = { ...currentProfessorRef.current, ...freshProfessor };
                    localStorage.setItem(getStorageKey(BASE_STORAGE_KEYS.CURRENT_PROFESSOR), JSON.stringify(updated));
                    setCurrentProfessor(updated);
                }

                const [evaluationsData, statsData, interviewsData] = await Promise.all([
                    professorEvaluationService.getMyEvaluations(),
                    professorEvaluationService.getMyEvaluationStats(),
                    interviewService.getInterviewsByInterviewer(freshProfessor.id)
                ]);

                if (isMounted) {
                    setEvaluations(evaluationsData);
                    setEvaluationStats(statsData);
                    setInterviews(interviewsData);
                }

            } catch (error: any) {
                if (!abortController.signal.aborted) {

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
        professorAuthService.logout();
        window.location.href = appUrls.home;
    };

    // Filtrar secciones según el rol
    const filteredSections = baseSections.filter(section => {
        // TEACHER no ve "Mis Entrevistas" ni "Mis Horarios"
        if (currentProfessor?.role === 'TEACHER') {
            if (section.key === 'entrevistas' || section.key === 'horarios') {
                return false;
            }
        }
        // Solo TEACHER ve "Mis Exámenes" (no CYCLE_DIRECTOR, PSYCHOLOGIST, INTERVIEWER, etc.)
        if (section.key === 'examenes' && currentProfessor?.role !== 'TEACHER') {
            return false;
        }
        return true;
    });

    // Determinar si mostrar sección de administrador.
    // Fuente canónica: `authStore.user.role === 'ADMIN'`. Fallback al
    // `currentProfessor.role` de localStorage durante bootstrap. Evita
    // depender del flag `isAdmin` (booleano libre, spoofable).
    const isAdminUser = useAuthStore((s) => s.user?.role === 'ADMIN')
        || currentProfessor?.role === 'ADMIN';

    const sections = isAdminUser
        ? [...filteredSections, { key: 'admin', label: 'Panel Administrador', icon: UsersIcon }]
        : filteredSections;

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
            {/* Header */}
            <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
                <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-600">Dashboard General</p>
                    <h1 className="mt-1 text-lg font-bold text-gray-950">
                        Bienvenido/a, {currentProfessor?.firstName} {currentProfessor?.lastName}
                    </h1>
                    <p className="mt-0.5 text-sm text-gray-600">
                        {currentProfessor?.subject ? getSubjectName(currentProfessor.subject) : 'Asignatura no especificada'} · {currentProfessor?.role ? USER_ROLE_LABELS[currentProfessor.role as UserRole] : 'No especificado'}
                    </p>
                </div>
            </section>

            {/* Stats Grid - Usando datos reales */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg text-center">
                    <FileTextIcon className="w-7 h-7 text-azul-monte-tabor mx-auto mb-2" />
                    <div className="text-2xl font-bold text-azul-monte-tabor">{evaluationStats.total}</div>
                    <div className="text-sm text-gris-piedra">Total Evaluaciones</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg text-center">
                    <CheckCircleIcon className="w-7 h-7 text-verde-esperanza mx-auto mb-2" />
                    <div className="text-2xl font-bold text-verde-esperanza">{evaluationStats.completed}</div>
                    <div className="text-sm text-gris-piedra">Completadas</div>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg text-center">
                    <ClockIcon className="w-7 h-7 text-dorado-nazaret mx-auto mb-2" />
                    <div className="text-2xl font-bold text-dorado-nazaret">{evaluationStats.pending + evaluationStats.inProgress}</div>
                    <div className="text-sm text-gris-piedra">Pendientes</div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg text-center">
                    <UsersIcon className="w-7 h-7 text-purple-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-purple-600">{evaluationStats.averageScore}%</div>
                    <div className="text-sm text-gris-piedra">Promedio General</div>
                </div>
            </div>

            {/* Evaluaciones Recientes */}
            <Card className="p-6">
                <h2 className="text-base font-semibold text-gray-900 mb-4">
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
                                    <p className="font-semibold text-gray-900">{evaluation.studentName}</p>
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

            {/* Próximas Entrevistas — mini widget en dashboard */}
            {currentProfessor?.role !== 'TEACHER' && (() => {
                const upcoming = interviews
                    .filter(i => i.status === InterviewStatus.SCHEDULED || i.status === InterviewStatus.CONFIRMED)
                    .sort((a, b) => new Date(`${a.scheduledDate}T${a.scheduledTime}`).getTime() - new Date(`${b.scheduledDate}T${b.scheduledTime}`).getTime())
                    .slice(0, 4);

                return (
                    <Card className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                                <FiCalendar className="w-4 h-4 text-gray-500" />
                                Próximas Entrevistas
                            </h2>
                            <div className="flex gap-2">
                                {upcoming.length > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => setActiveSection('entrevistas')}
                                        className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-100"
                                    >
                                        Ver todas
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={() => setActiveSection('horarios')}
                                    className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-100"
                                >
                                    <ClockIcon className="w-3.5 h-3.5" />
                                    Horarios
                                </button>
                            </div>
                        </div>
                        {upcoming.length === 0 ? (
                            <div className="text-center py-6 bg-gray-50 rounded-lg">
                                <FiCalendar className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                                <p className="text-sm text-gris-piedra">No hay entrevistas programadas próximamente</p>
                            </div>
                        ) : (
                            <div className="grid gap-3 sm:grid-cols-2">
                                {upcoming.map(interview => {
                                    const [y, m, d] = interview.scheduledDate.split('-');
                                    const date = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
                                    const isToday = new Date().toDateString() === date.toDateString();
                                    return (
                                        <div
                                            key={interview.id}
                                            className={`flex items-start gap-3 rounded-lg border p-3 transition-colors ${
                                                isToday
                                                    ? 'bg-blue-50 border-blue-200'
                                                    : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                                            }`}
                                        >
                                            <div className={`flex-shrink-0 w-11 h-11 rounded-lg flex flex-col items-center justify-center leading-none ${
                                                isToday ? 'bg-azul-monte-tabor text-white' : 'bg-white border border-gray-200 text-gray-700'
                                            }`}>
                                                <span className="text-[10px] uppercase font-medium">{date.toLocaleDateString('es-CL', { month: 'short' })}</span>
                                                <span className="text-base font-bold">{d}</span>
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="font-semibold text-sm text-gray-900 truncate">{interview.studentName}</p>
                                                <p className="text-xs text-gris-piedra mt-0.5">
                                                    {interview.scheduledTime} · {interview.duration} min
                                                    {isToday && <span className="ml-1 text-blue-600 font-medium">· Hoy</span>}
                                                </p>
                                                <p className="text-xs text-gray-400 mt-0.5">
                                                    {INTERVIEW_TYPE_LABELS[interview.type as InterviewType] || interview.type}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </Card>
                );
            })()}
        </div>
    );

    const renderEvaluaciones = () => {

        // Helper para obtener la URL de navegación según tipo de evaluación
        const getEvaluationUrl = (evaluation: ProfessorEvaluation): string => {
            switch (evaluation.evaluationType) {
                case 'MATHEMATICS_EXAM':
                case 'LANGUAGE_EXAM':
                case 'ENGLISH_EXAM':
                    return `/profesor/informe/${evaluation.id}`;
                case 'FAMILY_INTERVIEW':
                    return `/profesor/entrevista-familiar/${evaluation.id}`;
                case 'CYCLE_DIRECTOR_INTERVIEW':
                    return `/cycle-director-interview/${evaluation.id}`;
                case 'PSYCHOLOGICAL_INTERVIEW':
                    return `/psychological-interview/${evaluation.id}`;
                case 'CYCLE_DIRECTOR_REPORT':
                    return `/profesor/informe-director/${evaluation.id}`;
                default:
                    return `/profesor/informe/${evaluation.id}`;
            }
        };

        // Helper para obtener el label del botón
        const getButtonLabel = (evaluation: ProfessorEvaluation): string => {
            if (evaluation.status === EvaluationStatus.COMPLETED) {
                return 'Modificar';
            }
            switch (evaluation.evaluationType) {
                case 'MATHEMATICS_EXAM':
                case 'LANGUAGE_EXAM':
                case 'ENGLISH_EXAM':
                    return 'Realizar Examen';
                case 'FAMILY_INTERVIEW':
                    return 'Realizar Entrevista';
                case 'CYCLE_DIRECTOR_INTERVIEW':
                    return 'Realizar Entrevista';
                case 'PSYCHOLOGICAL_INTERVIEW':
                    return 'Realizar Entrevista';
                case 'CYCLE_DIRECTOR_REPORT':
                    return 'Completar Informe';
                default:
                    return 'Completar';
            }
        };

        // Helper para obtener el tipo de evaluación (label corto)
        const getEvaluationTypeShort = (type: EvaluationType): string => {
            switch (type) {
                case EvaluationType.MATHEMATICS_EXAM: return 'Matemática';
                case EvaluationType.LANGUAGE_EXAM: return 'Lenguaje';
                case EvaluationType.ENGLISH_EXAM: return 'Inglés';
                case EvaluationType.PSYCHOLOGICAL_INTERVIEW: return 'Psicológica';
                case EvaluationType.CYCLE_DIRECTOR_INTERVIEW: return 'Director de Ciclo';
                case EvaluationType.CYCLE_DIRECTOR_REPORT: return 'Informe Director';
                case EvaluationType.FAMILY_INTERVIEW: return 'Familiar';
                default: return type;
            }
        };

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

        // Separar en pendientes y completadas
        const pendingEvaluations = currentEvaluations.filter(e => e.status !== EvaluationStatus.COMPLETED);
        const completedEvaluations = currentEvaluations.filter(e => e.status === EvaluationStatus.COMPLETED);

        // Ordenar: pendientes por fecha (próximas primero), completadas por fecha (más recientes primero)
        const sortByDate = (arr: ProfessorEvaluation[], ascending: boolean = false) => {
            return [...arr].sort((a, b) => {
                const dateA = new Date(a.scheduledDate || a.completedDate || 0);
                const dateB = new Date(b.scheduledDate || b.completedDate || 0);
                return ascending ? dateA.getTime() - dateB.getTime() : dateB.getTime() - dateA.getTime();
            });
        };

        const sortedPending = sortByDate(pendingEvaluations, true);
        const sortedCompleted = sortByDate(completedEvaluations, false);

        // Obtener label del tab activo
        const getTabLabel = () => {
            switch (activeEvaluationTab) {
                case 'academicas': return 'Exámenes';
                case 'psicologicas': return 'Entrevistas Psicológicas';
                case 'familiares': return 'Entrevistas Familiares';
                default: return '';
            }
        };

        // Renderizar una tarjeta de evaluación
        const renderEvaluationCard = (evaluation: ProfessorEvaluation) => {
            const isCompleted = evaluation.status === EvaluationStatus.COMPLETED;
            const bgColor = isCompleted ? 'bg-green-50' : 'bg-blue-50';
            const borderColor = isCompleted ? 'border-green-200' : 'border-blue-200';

            // Calcular porcentaje si existe score
            let scoreDisplay = null;
            if (evaluation.score !== undefined && evaluation.score !== null) {
                const maxScore = evaluation.maxScore || 100;
                const percentage = Math.round((evaluation.score / maxScore) * 100);
                scoreDisplay = `${percentage}%`;
            }

            return (
                <div key={evaluation.id} className={`border ${borderColor} ${bgColor} rounded-lg p-4 hover:shadow-md transition-shadow`}>
                    <div className="flex items-center justify-between">
                        <div className="flex-1">
                            <h4 className="font-bold text-azul-monte-tabor">
                                {evaluation.studentName}
                            </h4>
                            <p className="text-sm text-gris-piedra">
                                {evaluation.studentGrade}
                            </p>
                            <div className="text-xs text-gray-600 mt-1 space-y-1">
                                <div className="flex items-center gap-2">
                                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                        isCompleted ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                                    }`}>
                                        {getEvaluationTypeShort(evaluation.evaluationType)}
                                    </span>
                                    {scoreDisplay && (
                                        <span className="font-semibold text-azul-monte-tabor">
                                            {scoreDisplay}
                                        </span>
                                    )}
                                </div>
                                {evaluation.scheduledDate && !isCompleted && (
                                    <div>Fecha: {new Date(evaluation.scheduledDate).toLocaleDateString('es-CL')}</div>
                                )}
                            </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                            <Badge variant={isCompleted ? 'success' : 'info'} size="sm">
                                {isCompleted ? 'Completado' : evaluation.status === EvaluationStatus.IN_PROGRESS ? 'En Progreso' : 'Pendiente'}
                            </Badge>
                            <Button
                                variant="primary"
                                size="sm"
                                onClick={() => navigate(getEvaluationUrl(evaluation))}
                            >
                                {getButtonLabel(evaluation)}
                            </Button>
                        </div>
                    </div>
                </div>
            );
        };

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
                    <div className="space-y-6">
                        {/* Pendientes */}
                        <div>
                            <h3 className="text-lg font-semibold text-azul-monte-tabor mb-4 flex items-center">
                                <ClockIcon className="w-5 h-5 mr-2" />
                                {getTabLabel()} Pendientes ({sortedPending.length})
                            </h3>
                            {sortedPending.length === 0 ? (
                                <div className="text-center py-4 bg-blue-50 border border-blue-200 rounded-lg">
                                    <p className="text-sm text-blue-600">No hay {getTabLabel().toLowerCase()} pendientes</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {sortedPending.map(renderEvaluationCard)}
                                </div>
                            )}
                        </div>

                        {/* Completadas */}
                        {sortedCompleted.length > 0 && (
                            <div>
                                <h3 className="text-lg font-semibold text-azul-monte-tabor mb-4 flex items-center">
                                    <CheckCircleIcon className="w-5 h-5 mr-2 text-green-600" />
                                    {getTabLabel()} Completadas ({sortedCompleted.length})
                                </h3>
                                <div className="space-y-3">
                                    {sortedCompleted.map(renderEvaluationCard)}
                                </div>
                            </div>
                        )}
                    </div>
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

        // Helper function to get the correct evaluation type for a tab
        const getEvaluationTypeForTab = (tabKey: string): string | null => {
            switch (tabKey) {
                case 'familiares': return 'FAMILY_INTERVIEW';
                case 'director_ciclo': return 'CYCLE_DIRECTOR_INTERVIEW';
                case 'psicologicas': return 'PSYCHOLOGICAL_INTERVIEW';
                case 'informes': return 'CYCLE_DIRECTOR_REPORT';
                default: return null;
            }
        };

        // Helper function to get the correct interview type for a tab
        const getInterviewTypeForTab = (tabKey: string): string | null => {
            switch (tabKey) {
                case 'familiares': return 'FAMILY';
                case 'director_ciclo': return 'CYCLE_DIRECTOR';
                case 'psicologicas': return 'PSYCHOLOGICAL';
                default: return null;
            }
        };

        // Helper function to get the URL for an evaluation
        const getEvaluationUrl = (evaluation: ProfessorEvaluation): string => {
            switch (evaluation.evaluationType) {
                case 'FAMILY_INTERVIEW':
                    return `/profesor/entrevista-familiar/${evaluation.id}`;
                case 'CYCLE_DIRECTOR_INTERVIEW':
                    return `/cycle-director-interview/${evaluation.id}`;
                case 'PSYCHOLOGICAL_INTERVIEW':
                    return `/psychological-interview/${evaluation.id}`;
                case 'CYCLE_DIRECTOR_REPORT':
                    return `/profesor/informe-director/${evaluation.id}`;
                default:
                    return `/profesor/informe/${evaluation.id}`;
            }
        };

        // Helper function to get the button label for an evaluation
        const getButtonLabel = (evaluation: ProfessorEvaluation): string => {
            if (evaluation.status === EvaluationStatus.COMPLETED) {
                return 'Modificar';
            }
            switch (evaluation.evaluationType) {
                case 'FAMILY_INTERVIEW':
                    return 'Realizar Entrevista';
                case 'CYCLE_DIRECTOR_INTERVIEW':
                    return 'Realizar Entrevista';
                case 'PSYCHOLOGICAL_INTERVIEW':
                    return 'Realizar Entrevista';
                case 'CYCLE_DIRECTOR_REPORT':
                    return 'Completar Informe';
                default:
                    return 'Completar';
            }
        };

        // Get data for the current tab
        const getTabData = () => {
            const evalType = getEvaluationTypeForTab(activeInterviewTab);
            const intType = getInterviewTypeForTab(activeInterviewTab);

            if (activeInterviewTab === 'informes') {
                // For informes, use evaluations directly
                return evaluations.filter(e => e.evaluationType === 'CYCLE_DIRECTOR_REPORT');
            } else {
                // For interviews, filter interviews by type
                return interviews.filter(i => i.type === intType);
            }
        };

        // Separate data into pending and completed
        const tabData = getTabData();

        // For interviews, use the isInterviewCompleted helper; for reports, use status directly
        const pendingData = activeInterviewTab === 'informes'
            ? tabData.filter((d: any) => d.status !== 'COMPLETED')
            : (tabData as Interview[]).filter(i => !isInterviewCompleted(i));

        const completedData = activeInterviewTab === 'informes'
            ? tabData.filter((d: any) => d.status === 'COMPLETED')
            : (tabData as Interview[]).filter(i => isInterviewCompleted(i));

        // Get tab label
        const currentTab = interviewTabs.find(t => t.key === activeInterviewTab);
        const tabLabel = currentTab?.label.replace('Entrevistas ', '').replace('Informes ', '') || '';

        // Render a single card
        const renderCard = (item: any, isInterview: boolean, isPending: boolean) => {
            const evaluation = isInterview ? null : item;
            const interview = isInterview ? item : null;

            const studentName = evaluation?.studentName || interview?.studentName || 'Sin nombre';
            const applicationId = evaluation?.applicationId || interview?.applicationId || 0;
            const status = evaluation?.status || (isInterview ? (isInterviewCompleted(interview) ? 'COMPLETED' : 'PENDING') : 'PENDING');
            const isCompleted = status === 'COMPLETED';

            // Get the evaluation to navigate
            const getEvaluationToUse = async () => {
                if (!isInterview) return evaluation;

                // For interviews, find the matching evaluation
                const expectedEvalType = getEvaluationTypeForTab(activeInterviewTab);
                const matchingEval = evaluations.find(e =>
                    e.applicationId === interview.applicationId &&
                    e.evaluationType === expectedEvalType
                );
                return matchingEval || evaluation;
            };

            const bgColor = isCompleted ? 'bg-green-50' : 'bg-blue-50';
            const borderColor = isCompleted ? 'border-green-200' : 'border-blue-200';

            return (
                <div key={item.id} className={`border ${borderColor} ${bgColor} rounded-lg p-4 hover:shadow-md transition-shadow`}>
                    <div className="flex items-center justify-between">
                        <div className="flex-1">
                            <h4 className="font-bold text-azul-monte-tabor">
                                {studentName}
                            </h4>
                            <p className="text-sm text-gris-piedra">
                                Aplicación #{applicationId}
                            </p>
                            {isInterview && interview && (
                                <div className="text-xs text-gray-600 mt-1 space-y-1">
                                    <div>{(() => {
                                        const [year, month, day] = interview.scheduledDate.split('-');
                                        const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                                        return date.toLocaleDateString('es-CL', {
                                            weekday: 'long',
                                            day: 'numeric',
                                            month: 'long',
                                            year: 'numeric'
                                        });
                                    })()}</div>
                                    <div>{interview.scheduledTime} ({interview.duration} min)</div>
                                    {interview.location && <div>{interview.location}</div>}
                                    {interview.secondInterviewerName ? (
                                        <div>Entrevistadores: {interview.interviewerName} y {interview.secondInterviewerName}</div>
                                    ) : (
                                        <div>Entrevistador: {interview.interviewerName}</div>
                                    )}
                                    {activeInterviewTab === 'familiares' && interview.parentNames && (
                                        <div className="font-medium mt-1">Padres: {interview.parentNames}</div>
                                    )}
                                </div>
                            )}
                            <div className="text-xs text-gray-600 mt-1">
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                    isCompleted ? 'bg-green-100 text-green-800' :
                                    status === 'IN_PROGRESS' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-blue-100 text-blue-800'
                                }`}>
                                    {isCompleted ? 'Completado' :
                                     status === 'IN_PROGRESS' ? 'En Progreso' : 'Pendiente'}
                                </span>
                            </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                            <Badge variant={isCompleted ? 'success' : 'info'} size="sm">
                                {isCompleted ? 'Completado' :
                                 status === 'IN_PROGRESS' ? 'En Progreso' : 'Pendiente'}
                            </Badge>
                            <Button
                                variant="primary"
                                size="sm"
                                onClick={async () => {
                                    const evalToUse = await getEvaluationToUse();
                                    if (evalToUse) {
                                        navigate(getEvaluationUrl(evalToUse));
                                    }
                                }}
                            >
                                {isCompleted ? 'Modificar' :
                                 activeInterviewTab === 'informes' ? 'Completar Informe' : 'Realizar'}
                            </Button>
                        </div>
                    </div>
                </div>
            );
        };

        // Sort data by date (most recent first for completed, soonest first for pending)
        const sortByDate = (a: any, b: any, ascending: boolean = false) => {
            const dateA = new Date(`${a.scheduledDate || a.completedDate || a.scheduledAt}`);
            const dateB = new Date(`${b.scheduledDate || b.completedDate || b.scheduledAt}`);
            return ascending ? dateA.getTime() - dateB.getTime() : dateB.getTime() - dateA.getTime();
        };

        const sortedPending = [...pendingData].sort((a, b) => sortByDate(a, b, true));
        const sortedCompleted = [...completedData].sort((a, b) => sortByDate(a, b, false));

        return (
            <div className="space-y-6">
                {/* Header */}
                <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
                    <div className="flex flex-col gap-4">
                        <div className="min-w-0">
                            <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-600">Mis Entrevistas</p>
                            <h1 className="mt-1 text-lg font-bold text-gray-950">Entrevistas y Evaluaciones</h1>
                            <p className="mt-0.5 max-w-3xl text-sm text-gray-600">Gestiona las entrevistas familiares, de director de ciclo e informes finales que tienes pendientes o ya has completado.</p>
                        </div>
                        {interviewTabs.length > 0 && (
                            <nav className="flex flex-wrap gap-2">
                                {interviewTabs.map(tab => (
                                    <button
                                        key={tab.key}
                                        onClick={() => setActiveInterviewTab(tab.key)}
                                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-green-200 ${
                                            activeInterviewTab === tab.key
                                                ? 'bg-green-700 text-white'
                                                : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                                        }`}
                                    >
                                        {tab.label} ({tab.count})
                                    </button>
                                ))}
                            </nav>
                        )}
                    </div>
                </section>

                {/* Estadísticas rápidas */}
                {!isLoading && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-blue-50 p-4 rounded-lg text-center">
                            <div className="text-2xl font-bold text-azul-monte-tabor">{tabData.length}</div>
                            <div className="text-sm text-gris-piedra">Total</div>
                        </div>
                        <div className="bg-yellow-50 p-4 rounded-lg text-center">
                            <div className="text-2xl font-bold text-dorado-nazaret">{sortedPending.length}</div>
                            <div className="text-sm text-gris-piedra">Pendientes</div>
                        </div>
                        <div className="bg-green-50 p-4 rounded-lg text-center">
                            <div className="text-2xl font-bold text-verde-esperanza">{sortedCompleted.length}</div>
                            <div className="text-sm text-gris-piedra">Completadas</div>
                            {tabData.length > 0 && (
                                <div className="text-xs text-gris-piedra">
                                    ({Math.round((sortedCompleted.length / tabData.length) * 100)}%)
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Acciones */}
                <div className="flex flex-wrap justify-end gap-2">
<button
                        type="button"
                        onClick={() => setRefreshKey(prev => prev + 1)}
                        disabled={isLoading}
                        className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:opacity-60"
                    >
                        <FiRefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} aria-hidden="true" />
                        Actualizar
                    </button>
                </div>

                {/* Contenido */}
                <Card className="p-6">
                    {isLoading ? (
                        <div className="text-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-azul-monte-tabor mx-auto"></div>
                            <p className="text-gris-piedra mt-4">Cargando...</p>
                        </div>
                    ) : (
                        <>
                            {/* Contenido unificado */}
                            <div className="space-y-6">
                                {/* Pendientes */}
                                <div>
                                    <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center">
                                        <ClockIcon className="w-5 h-5 mr-2" />
                                        {tabLabel} Pendientes ({sortedPending.length})
                                    </h3>
                                    {sortedPending.length === 0 ? (
                                        <div className="text-center py-4 bg-blue-50 border border-blue-200 rounded-lg">
                                            <p className="text-sm text-blue-600">No hay {tabLabel.toLowerCase()} pendientes</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {sortedPending.map(item => renderCard(item, activeInterviewTab !== 'informes', true))}
                                        </div>
                                    )}
                                </div>

                                {/* Completadas */}
                                {sortedCompleted.length > 0 && (
                                    <div>
                                        <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center">
                                            <CheckCircleIcon className="w-5 h-5 mr-2 text-green-600" />
                                            {tabLabel} Completadas ({sortedCompleted.length})
                                        </h3>
                                        <div className="space-y-3">
                                            {sortedCompleted.map(item => renderCard(item, activeInterviewTab !== 'informes', false))}
                                        </div>
                                    </div>
                                )}
                            </div>
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

        const filteredStudents = myStudents.filter(s =>
            s.name?.toLowerCase().includes(studentSearch.toLowerCase()) ||
            s.grade?.toLowerCase().includes(studentSearch.toLowerCase())
        );
        const totalPages = Math.max(1, Math.ceil(filteredStudents.length / studentsPerPage));
        const safePage = Math.min(studentPage, totalPages);
        const pageStart = (safePage - 1) * studentsPerPage;
        const paginatedStudents = filteredStudents.slice(pageStart, pageStart + studentsPerPage);

        return (
            <div className="space-y-6">
                {/* Header */}
                <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
                    <div className="min-w-0">
                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-600">Mis Estudiantes</p>
                        <h1 className="mt-1 text-lg font-bold text-gray-950">Listado de Estudiantes Asignados</h1>
                        <p className="mt-0.5 max-w-3xl text-sm text-gray-600">Revisa el estado y avance de cada estudiante que tienes asignado, accede a sus evaluaciones y gestiona su progreso desde aquí.</p>
                    </div>
                </section>

                {/* Acciones */}
                <div className="flex flex-wrap justify-end gap-2">
                    <button
                        type="button"
                        onClick={() => setRefreshKey(prev => prev + 1)}
                        disabled={isLoading}
                        className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:opacity-60"
                    >
                        <FiRefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} aria-hidden="true" />
                        Actualizar
                    </button>
                </div>

                {/* Contenido */}
                <Card className="overflow-hidden p-0">
                    {/* Barra de búsqueda */}
                    <div className="flex items-center gap-4 px-4 py-3 border-b border-gray-100">
                        <div className="relative flex-1">
                            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Buscar por nombre, curso..."
                                value={studentSearch}
                                onChange={e => { setStudentSearch(e.target.value); setStudentPage(1); }}
                                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100"
                            />
                        </div>
                        <span className="text-sm text-gray-500 whitespace-nowrap">{filteredStudents.length} registros</span>
                    </div>

                    {isLoading ? (
                        <div className="text-center py-10">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-azul-monte-tabor mx-auto"></div>
                            <p className="text-gris-piedra mt-2 text-sm">Cargando estudiantes...</p>
                        </div>
                    ) : (
                        <>
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-100">
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-1/5">Estudiante</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-1/6">Estado</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-1/5">Evaluaciones</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {paginatedStudents.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="px-4 py-10 text-center text-sm text-gray-400">
                                                No hay estudiantes asignados
                                            </td>
                                        </tr>
                                    ) : paginatedStudents.map((student: any) => {
                                        const total = student.evaluations.length;
                                        const completed = student.evaluations.filter((e: ProfessorEvaluation) => e.status === EvaluationStatus.COMPLETED).length;
                                        const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

                                        const statusLabel = completed === total ? 'Completo' : completed > 0 ? 'Parcial' : 'Pendiente';
                                        const statusClasses = completed === total
                                            ? 'bg-green-100 text-green-800'
                                            : completed > 0
                                            ? 'bg-blue-100 text-blue-800'
                                            : 'bg-yellow-100 text-yellow-800';

                                        return (
                                            <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-4 py-3">
                                                    <p className="font-semibold text-gray-900">{student.name}</p>
                                                    <p className="text-xs text-gray-500">{student.grade}</p>
                                                    {student.currentSchool && (
                                                        <p className="text-xs text-gray-400">{student.currentSchool}</p>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${statusClasses}`}>
                                                        {statusLabel}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`font-semibold ${completed === total ? 'text-green-700' : 'text-gray-700'}`}>
                                                        {completed}/{total}
                                                    </span>
                                                    {completed === total ? (
                                                        <span className="ml-2 text-green-600 text-xs">✓ Completo</span>
                                                    ) : (
                                                        <span className="ml-2 text-gray-400 text-xs">Sin completar</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex flex-wrap gap-2">
                                                        {student.evaluations.map((evaluation: ProfessorEvaluation) => (
                                                            <Button
                                                                key={evaluation.id}
                                                                size="sm"
                                                                variant={evaluation.status === EvaluationStatus.COMPLETED ? 'outline' : 'primary'}
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
                                                            >
                                                                {evaluation.evaluationType === 'CYCLE_DIRECTOR_INTERVIEW' || evaluation.evaluationType === 'PSYCHOLOGICAL_INTERVIEW' || evaluation.evaluationType === 'FAMILY_INTERVIEW'
                                                                    ? (evaluation.status === EvaluationStatus.COMPLETED ? 'Ver Entrevista' : 'Entrevista')
                                                                    : (evaluation.status === EvaluationStatus.COMPLETED ? 'Ver Informe' : 'Informe')}
                                                            </Button>
                                                        ))}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>

                            {/* Paginación */}
                            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-sm text-gray-500">
                                <span>
                                    Mostrando {filteredStudents.length === 0 ? 0 : pageStart + 1}–{Math.min(pageStart + studentsPerPage, filteredStudents.length)} de {filteredStudents.length}
                                </span>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs">Por página: {studentsPerPage}</span>
                                    <span className="text-xs font-semibold text-gray-700">{safePage}/{totalPages}</span>
                                    <button
                                        onClick={() => setStudentPage(p => Math.max(1, p - 1))}
                                        disabled={safePage === 1}
                                        className="p-1 rounded hover:bg-gray-100 disabled:opacity-40"
                                    >
                                        <FiChevronLeft className="h-4 w-4" />
                                    </button>
                                    <button
                                        onClick={() => setStudentPage(p => Math.min(totalPages, p + 1))}
                                        disabled={safePage === totalPages}
                                        className="p-1 rounded hover:bg-gray-100 disabled:opacity-40"
                                    >
                                        <FiChevronRight className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </Card>
            </div>
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
                <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
                    <div className="min-w-0">
                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-600">Reportes y Estadísticas</p>
                        <h1 className="mt-1 text-lg font-bold text-gray-950">Resumen de tu actividad y evaluaciones asignadas</h1>
                        <p className="mt-0.5 max-w-3xl text-sm text-gray-600">Consulta el detalle de tus evaluaciones completadas, pendientes y el progreso general de los estudiantes que tienes asignados.</p>
                    </div>
                </section>

                {/* Acciones */}
                <div className="flex flex-wrap justify-end gap-2">
                    <Button
                        variant="primary"
                        size="sm"
                        onClick={() => window.print()}
                    >
                        Imprimir Reporte
                    </Button>
                    <Button
                        variant="primary"
                        size="sm"
                        onClick={() => {
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

                {/* Resumen General */}
                <Card className="p-6">
                    <h3 className="text-base font-semibold text-gray-900 mb-4">Resumen General</h3>
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
                    <h3 className="text-base font-semibold text-gray-900 mb-4">Estadísticas por Tipo de Evaluación</h3>
                    <div className="space-y-4">
                        {Object.entries(statsByType).map(([type, stats]: [string, any]) => (
                            <div key={type} className="border border-gray-200 rounded-lg p-4">
                                <div className="flex justify-between items-center mb-2">
                                    <h4 className="font-semibold text-gray-900">
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
                    <h3 className="text-base font-semibold text-gray-900 mb-4">Estadísticas por Grado</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {Object.entries(statsByGrade).map(([grade, stats]: [string, any]) => (
                            <div key={grade} className="border border-gray-200 rounded-lg p-4">
                                <h4 className="font-semibold text-gray-900 mb-2">{grade}</h4>
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
                    <h3 className="text-base font-semibold text-gray-900 mb-4">
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
                        <h3 className="text-base font-semibold text-gray-900 mb-4">Progreso Semanal</h3>
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
                        <h3 className="text-base font-semibold text-gray-900 mb-4">Información del Profesor</h3>
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


    // Efecto para cambiar al tab de exámenes cuando se selecciona "Mis Exámenes" del menú
    useEffect(() => {
        if (activeSection === 'examenes') {
            setActiveEvaluationTab('academicas');
        }
    }, [activeSection]);

    const renderSection = () => {

        switch (activeSection) {
            case 'dashboard':
                return renderDashboard();
            case 'examenes':
            case 'evaluaciones':
                return renderEvaluaciones();
            case 'entrevistas':
                return renderEntrevistas();
            case 'estudiantes':
                return renderEstudiantes();
            case 'horarios':
                return currentProfessor ? (
                    <div className="space-y-6">
                        {/* Header */}
                        <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
                            <div className="min-w-0">
                                <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-600">Mis Horarios</p>
                                <h1 className="mt-1 text-lg font-bold text-gray-950">Gestión de Disponibilidad</h1>
                                <p className="mt-0.5 max-w-3xl text-sm text-gray-600">Administra tus bloques de disponibilidad para entrevistas y consulta tus próximas citas programadas.</p>
                            </div>
                        </section>

                        {/* Próximas entrevistas — contexto para gestionar horarios */}
                        {(() => {
                            const upcoming = interviews
                                .filter(i => i.status === InterviewStatus.SCHEDULED || i.status === InterviewStatus.CONFIRMED)
                                .sort((a, b) => {
                                    const dA = new Date(`${a.scheduledDate}T${a.scheduledTime}`);
                                    const dB = new Date(`${b.scheduledDate}T${b.scheduledTime}`);
                                    return dA.getTime() - dB.getTime();
                                })
                                .slice(0, 3);

                            if (upcoming.length === 0) return null;

                            return (
                                <Card className="p-4 bg-blue-50 border-blue-200">
                                    <div className="flex items-center gap-2 mb-3">
                                        <FiCalendar className="w-4 h-4 text-gray-500" />
                                        <h3 className="text-sm font-semibold text-gray-900">
                                            Próximas entrevistas ({upcoming.length})
                                        </h3>
                                        <span className="text-xs text-gray-500 ml-auto">
                                            Estos bloques ya están ocupados
                                        </span>
                                    </div>
                                    <div className="grid gap-2 sm:grid-cols-3">
                                        {upcoming.map(interview => {
                                            const [year, month, day] = interview.scheduledDate.split('-');
                                            const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                                            return (
                                                <div key={interview.id} className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border border-blue-100 text-xs">
                                                    <div className="flex-shrink-0 w-8 h-8 rounded bg-azul-monte-tabor text-white flex flex-col items-center justify-center leading-none">
                                                        <span className="text-[10px] uppercase">{date.toLocaleDateString('es-CL', { month: 'short' })}</span>
                                                        <span className="text-sm font-bold">{day}</span>
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="font-medium text-gray-800 truncate">{interview.studentName}</p>
                                                        <p className="text-gray-500">{interview.scheduledTime} · {interview.duration} min</p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </Card>
                            );
                        })()}

                        {/* Calendario de disponibilidad */}
                        <Card className="p-6">
                            <SimpleAvailabilityCalendar
                                userId={currentProfessor.id}
                                userRole={currentProfessor.role}
                                onScheduleChange={() => {
                                    setRefreshKey(prev => prev + 1);
                                }}
                            />
                        </Card>
                    </div>
                ) : (
                    <Card className="p-6">
                        <p className="text-gris-piedra">No se pudo cargar la información del profesor</p>
                    </Card>
                );
            case 'reportes':
                return renderReportesEstadisticas();
            case 'configuracion':
                return (
                    <div className="space-y-6">
                        <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
                            <div className="min-w-0">
                                <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-600">Información</p>
                                <h1 className="mt-1 text-lg font-bold text-gray-950">Consulta tu información personal y los detalles de tu cuenta en el sistema.</h1>
                            </div>
                        </section>
                        <Card className="p-6">
                        <div className="space-y-4">
                            <div>
                                <h3 className="text-base font-semibold text-gray-900 mb-2">Información Personal</h3>
                                <p><strong>Nombre:</strong> {currentProfessor?.firstName} {currentProfessor?.lastName}</p>
                                <p><strong>Email:</strong> {currentProfessor?.email}</p>
                                <p><strong>Asignatura:</strong> {currentProfessor?.subject ? getSubjectName(currentProfessor.subject) : 'No especificada'}</p>
                                <p><strong>Rol:</strong> {currentProfessor?.role ? USER_ROLE_LABELS[currentProfessor.role as UserRole] : 'No especificado'}</p>
                                {isAdminUser && (
                                    <p className="text-dorado-nazaret"><strong>Permisos:</strong> Administrador</p>
                                )}
                            </div>
                        </div>
                        </Card>
                    </div>
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

    return (
        <div className="h-screen flex flex-col overflow-hidden bg-gray-50">
            {/* Mobile top bar */}
            <div className="md:hidden bg-white shadow-sm px-4 py-3 flex items-center justify-between z-30">
                <div>
                    <span className="font-bold text-azul-monte-tabor">Portal Profesores</span>
                    <p className="text-gris-piedra text-xs">Sistema de Evaluaciones</p>
                </div>
                <button
                    onClick={() => setIsSidebarOpen(prev => !prev)}
                    className="p-2.5 min-w-[44px] min-h-[44px] rounded-lg text-gris-piedra hover:bg-gray-100 transition-colors"
                    aria-expanded={isSidebarOpen}
                    aria-controls="mobile-sidebar-profesor"
                    aria-label={isSidebarOpen ? 'Cerrar menú de navegación' : 'Abrir menú de navegación'}
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
            <div
                id="mobile-sidebar-profesor"
                aria-hidden={!isSidebarOpen}
                {...(!isSidebarOpen ? { inert: '' } : {})}
                className={`md:hidden fixed top-0 left-0 h-full w-64 bg-white shadow-xl z-50 p-6 flex flex-col overflow-y-auto transform transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
            >
                <SidebarNav
                    sections={sections}
                    activeSection={activeSection}
                    onSectionChange={setActiveSection}
                    onShowLogout={() => setShowLogoutConfirm(true)}
                    interviews={interviews}
                    badgeCount={currentProfessor?.role === 'CYCLE_DIRECTOR' ? interviews.filter(i => i.type === 'FAMILY' || i.type === 'CYCLE_DIRECTOR').length + evaluations.filter(e => e.evaluationType === 'CYCLE_DIRECTOR_REPORT').length : undefined}
                    onNavigate={() => setIsSidebarOpen(false)}
                />
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* Desktop Sidebar */}
                <aside className="w-64 bg-white shadow-md p-6 hidden md:flex flex-col overflow-y-auto">
                    <SidebarNav
                        sections={sections}
                        activeSection={activeSection}
                        onSectionChange={setActiveSection}
                        onShowLogout={() => setShowLogoutConfirm(true)}
                        interviews={interviews}
                        badgeCount={currentProfessor?.role === 'CYCLE_DIRECTOR' ? interviews.filter(i => i.type === 'FAMILY' || i.type === 'CYCLE_DIRECTOR').length + evaluations.filter(e => e.evaluationType === 'CYCLE_DIRECTOR_REPORT').length : undefined}
                    />
                </aside>

                {/* Main Content */}
                <main className="flex-1 p-4 sm:p-8 min-w-0 overflow-y-auto" role="main" aria-label="Contenido principal del dashboard del profesor">
                    {renderSection()}
                </main>
            </div>

            <ConfirmDialog
                isOpen={showLogoutConfirm}
                title="Cerrar sesión"
                message="¿Está seguro que desea cerrar sesión?"
                confirmText="Sí, cerrar sesión"
                cancelText="Cancelar"
                variant="danger"
                onConfirm={() => {
                    setShowLogoutConfirm(false);
                    handleLogout();
                }}
                onClose={() => setShowLogoutConfirm(false)}
            />
        </div>
    );
};

export default ProfessorDashboard;
