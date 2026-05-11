import React, { useState, useEffect } from 'react';
import { useNotifications } from '../../context/AppContext';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import Modal from '../ui/Modal';
import ConfirmDialog from '../ui/ConfirmDialog';
import {
  evaluationService,
  UserRole,
  USER_ROLE_LABELS
} from '../../services/evaluationService';
import { evaluatorService } from '../../services/evaluatorService';
import { userService } from '../../services/userService';
import { User, UserRole as SystemUserRole, USER_ROLE_LABELS as SystemRoleLabels } from '../../types/user';
import {
  Evaluation,
  EvaluationType,
  EvaluationStatus,
  EVALUATION_TYPE_LABELS,
  EVALUATION_STATUS_LABELS
} from '../../types/evaluation';
import { Application } from '../../services/applicationService';
import {
  UserIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ChartBarIcon,
  PlusIcon,
  EyeIcon
} from '../icons/Icons';
import { 
  BarChart3, 
  Bot, 
  Users, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  Plus, 
  Eye,
  X,
  Search
} from 'lucide-react';

interface EvaluationManagementProps {
  applications: Application[];
  onRefresh: () => void;
  onAssign: (applicationId: number, assignments: EvaluatorAssignment[]) => Promise<void>;
}

interface EvaluatorAssignment {
  evaluationType: EvaluationType;
  evaluatorId: number;
  evaluatorName: string;
}

interface EvaluatorCache {
  [key: string]: any[];
}

const EvaluationManagement: React.FC<EvaluationManagementProps> = ({
  applications,
  onRefresh,
  onAssign
}) => {
  const [evaluators, setEvaluators] = useState<any[]>([]);
  const [evaluatorCache, setEvaluatorCache] = useState<EvaluatorCache>({});
  const [isLoading, setIsLoading] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [selectedRowId, setSelectedRowId] = useState<number | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const { addNotification } = useNotifications();

  // Filtros
  const [filterStatus, setFilterStatus] = useState<string>('HIDE_APPROVED');
  const [filterGrade, setFilterGrade] = useState<string>('');
  const [filterSearch, setFilterSearch] = useState<string>('');

  useEffect(() => {
    loadEvaluators();
  }, []);

  // NUEVA FUNCIÓN QUE SOLO CARGA USUARIOS REALES
  const loadEvaluators = async () => {
    try {

      // Cargar usuarios reales desde el endpoint público
      const usersResponse = await userService.getSchoolStaffUsersPublic();

      // Defensive check: ensure usersResponse exists and has content
      if (!usersResponse) {
        addNotification('error', 'Error al cargar evaluadores: No se pudo conectar con el servidor');
        return;
      }

      const allStaff = usersResponse.content || usersResponse.data || [];


      // Filtrar usuarios por especialización

      const languageTeachers = allStaff.filter(user =>
        (user.role === 'TEACHER' || user.role === 'COORDINATOR') &&
        (user.subject === 'LANGUAGE' || user.subject === 'ALL_SUBJECTS') &&
        user.active && user.emailVerified
      );

      const mathTeachers = allStaff.filter(user =>
        (user.role === 'TEACHER' || user.role === 'COORDINATOR') &&
        (user.subject === 'MATHEMATICS' || user.subject === 'ALL_SUBJECTS') &&
        user.active && user.emailVerified
      );

      const englishTeachers = allStaff.filter(user =>
        (user.role === 'TEACHER' || user.role === 'COORDINATOR') &&
        (user.subject === 'ENGLISH' || user.subject === 'ALL_SUBJECTS') &&
        user.active && user.emailVerified
      );

      const cycleDirectors = allStaff.filter(user =>
        user.role === 'CYCLE_DIRECTOR' && user.active && user.emailVerified
      );

      const psychologists = allStaff.filter(user =>
        user.role === 'PSYCHOLOGIST' && user.active && user.emailVerified
      );

      const cache: EvaluatorCache = {
        'TEACHER_LANGUAGE': languageTeachers,
        'TEACHER_MATHEMATICS': mathTeachers,
        'TEACHER_ENGLISH': englishTeachers,
        'CYCLE_DIRECTOR': cycleDirectors,
        'PSYCHOLOGIST': psychologists
      };

      Object.entries(cache).forEach(([role, users]) => {
      });

      const allEvaluators = Object.values(cache).flat();

      setEvaluatorCache(cache);
      setEvaluators(allEvaluators);

    } catch (error) {
      addNotification('Error al cargar evaluadores. Por favor, intenta de nuevo.', 'error');
      setEvaluators([]);
      setEvaluatorCache({});
    }
  };

  // El modal maneja internamente la lógica de asignación/reasignación.
  // Esta función solo se llama al cerrar con éxito para refrescar la grilla.
  const handleAssignmentComplete = () => {
    setShowAssignModal(false);
    setSelectedApplication(null);
    setSelectedRowId(null);
    onRefresh();
  };

  const handleOpenCustomAssignment = () => {
    if (!selectedApplication) return;
    setShowAssignModal(true);
  };

  const handleSelectRow = (application: Application) => {
    if (selectedRowId === application.id) {
      setSelectedRowId(null);
      setSelectedApplication(null);
    } else {
      setSelectedRowId(application.id);
      setSelectedApplication(application);
    }
  };

  const getAssignedCount = (application: Application) => {
    const exams = ((application as any).evaluations || []).filter((e: any) => {
      const t = e.type || e.evaluationType;
      return t === 'MATHEMATICS_EXAM' || t === 'LANGUAGE_EXAM' || t === 'ENGLISH_EXAM';
    });
    return exams.filter((e: any) => e.evaluatorId || e.evaluator?.id).length;
  };

  const getActionButton = () => {
    if (!selectedApplication) return null;
    const assigned = getAssignedCount(selectedApplication);
    if (assigned === 0) {
      return (
        <Button variant="primary" size="sm" onClick={handleOpenCustomAssignment} disabled={isLoading}>
          <Users className="w-4 h-4 mr-1.5" />
          Asignar evaluadores
        </Button>
      );
    }
    if (assigned === 3) {
      return (
        <button
          onClick={handleOpenCustomAssignment}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-amber-500 hover:bg-amber-600 text-white transition-colors disabled:opacity-50"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
          Modificar evaluadores
        </button>
      );
    }
    return (
      <Button variant="primary" size="sm" onClick={handleOpenCustomAssignment} disabled={isLoading}>
        <Users className="w-4 h-4 mr-1.5" />
        Asignar / Modificar
      </Button>
    );
  };

  const getEvaluatorsByType = (evaluationType: EvaluationType) => {
    // Mapeo directo de tipos de evaluación a roles del evaluatorService
    const getEvaluatorServiceRole = (type: EvaluationType) => {
      switch (type) {
        case EvaluationType.LANGUAGE_EXAM:
          return 'TEACHER_LANGUAGE';
        case EvaluationType.MATHEMATICS_EXAM:
          return 'TEACHER_MATHEMATICS';
        case EvaluationType.ENGLISH_EXAM:
          return 'TEACHER_ENGLISH';
        case EvaluationType.CYCLE_DIRECTOR_REPORT:
        case EvaluationType.CYCLE_DIRECTOR_INTERVIEW:
          return 'CYCLE_DIRECTOR';
        case EvaluationType.PSYCHOLOGICAL_INTERVIEW:
          return 'PSYCHOLOGIST';
        default:
          return null;
      }
    };

    const serviceRole = getEvaluatorServiceRole(evaluationType);
    if (!serviceRole) {
      return [];
    }

    // Usar cache si está disponible
    const availableEvaluators = evaluatorCache[serviceRole] || [];

    if (evaluationType === EvaluationType.MATHEMATICS_EXAM) {
    }

    return availableEvaluators;
  };

  const allApplicationsWithEvaluations = applications.map(app => {
    const pendingEvaluations = app.evaluations?.filter(
      evaluation => evaluation.status === EvaluationStatus.PENDING
    ).length || 0;

    const completedEvaluations = app.evaluations?.filter(
      evaluation => evaluation.status === EvaluationStatus.COMPLETED
    ).length || 0;

    return {
      ...app,
      pendingEvaluations,
      completedEvaluations,
      totalEvaluations: app.evaluations?.length || 0
    };
  });

  // Obtener cursos únicos para el filtro
  const uniqueGrades = Array.from(new Set(
    applications.map(app => app.student?.gradeApplied).filter(Boolean)
  )).sort();

  // Aplicar filtros
  const filteredApplications = allApplicationsWithEvaluations.filter(app => {
    if (filterStatus === 'HIDE_APPROVED' && app.status === 'APPROVED') return false;
    if (filterStatus && filterStatus !== 'HIDE_APPROVED' && filterStatus !== 'ALL' && app.status !== filterStatus) return false;
    if (filterGrade && app.student?.gradeApplied !== filterGrade) return false;
    if (filterSearch) {
      const q = filterSearch.toLowerCase();
      const fullName = `${app.student?.firstName ?? ''} ${app.student?.lastName ?? ''}`.toLowerCase();
      const grade = (app.student?.gradeApplied ?? '').toLowerCase();
      const email = (app.student?.email ?? '').toLowerCase();
      if (!fullName.includes(q) && !grade.includes(q) && !email.includes(q)) return false;
    }
    return true;
  });

  const totalPages = Math.ceil(filteredApplications.length / pageSize);
  const applicationsWithEvaluations = filteredApplications.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  return (
    <div className="space-y-4">
      <Card className="p-6">
        {/* Header: título + filtros */}
        <div className="flex items-center space-x-3 mb-4">
          <BarChart3 className="w-5 h-5 text-azul-monte-tabor" />
          <h2 className="text-lg font-semibold text-gray-900">Gestión de Evaluaciones</h2>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap items-center gap-3 mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="flex-1 min-w-[180px] relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar por nombre, curso..."
              value={filterSearch}
              onChange={(e) => { setFilterSearch(e.target.value); setCurrentPage(1); }}
              className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-azul-monte-tabor"
            />
            {filterSearch && (
              <button onClick={() => { setFilterSearch(''); setCurrentPage(1); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-600 whitespace-nowrap">Estado:</label>
            <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }} className="text-sm border border-gray-300 rounded-md px-2 py-1.5 bg-white">
              <option value="HIDE_APPROVED">Ocultar Aprobados</option>
              <option value="ALL">Todos</option>
              <option value="PENDING">Pendiente</option>
              <option value="IN_PROGRESS">En Progreso</option>
              <option value="APPROVED">Aprobado</option>
              <option value="REJECTED">Rechazado</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-600 whitespace-nowrap">Curso:</label>
            <select value={filterGrade} onChange={(e) => { setFilterGrade(e.target.value); setCurrentPage(1); }} className="text-sm border border-gray-300 rounded-md px-2 py-1.5 bg-white">
              <option value="">Todos</option>
              {uniqueGrades.map(grade => (
                <option key={grade} value={grade}>{grade}</option>
              ))}
            </select>
          </div>
          <span className="text-sm text-gray-500 ml-auto">
            {filteredApplications.length} registro{filteredApplications.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Hint instructivo */}
        {!selectedApplication && filteredApplications.length > 0 && (
          <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-blue-50 border border-blue-100 rounded-lg text-blue-600 text-xs">
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Selecciona una fila para gestionar sus evaluadores
          </div>
        )}

        {/* Tabla */}
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full table-auto">
            <thead className="bg-gray-50">
              <tr className="border-b border-gray-200">
                <th className="w-6 px-3 py-2.5"></th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Estudiante</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Estado</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Evaluadores</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Progreso</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {applicationsWithEvaluations.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-sm text-gray-400">
                    No se encontraron registros con los filtros aplicados.
                  </td>
                </tr>
              )}
              {applicationsWithEvaluations.map((application) => {
                const isSelected = selectedRowId === application.id;
                const academicExams = ((application as any).evaluations || []).filter((e: any) => {
                  const t = e.type || e.evaluationType;
                  return t === 'MATHEMATICS_EXAM' || t === 'LANGUAGE_EXAM' || t === 'ENGLISH_EXAM';
                });
                const assignedCount = Math.min(
                  academicExams.filter((e: any) => e.evaluatorId || e.evaluator?.id).length, 3
                );
                const progressPct = Math.round((assignedCount / 3) * 100);
                const allAssigned = assignedCount === 3;
                const noneAssigned = assignedCount === 0;

                const statusLabels: Record<string, string> = {
                  PENDING: 'Pendiente', IN_PROGRESS: 'En progreso',
                  APPROVED: 'Aprobado', REJECTED: 'Rechazado',
                  UNDER_REVIEW: 'En revisión', EXAM_SCHEDULED: 'Examen programado',
                  INTERVIEW_SCHEDULED: 'Entrevista programada'
                };
                const statusColors: Record<string, string> = {
                  PENDING: 'bg-yellow-100 text-yellow-800',
                  IN_PROGRESS: 'bg-blue-100 text-blue-800',
                  APPROVED: 'bg-green-100 text-green-800',
                  REJECTED: 'bg-red-100 text-red-800',
                  UNDER_REVIEW: 'bg-purple-100 text-purple-800',
                  EXAM_SCHEDULED: 'bg-indigo-100 text-indigo-800',
                  INTERVIEW_SCHEDULED: 'bg-teal-100 text-teal-800'
                };

                return (
                  <tr
                    key={application.id}
                    onClick={() => handleSelectRow(application as any)}
                    className={`transition-colors cursor-pointer group ${
                      isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    {/* Indicador lateral */}
                    <td className="px-3 py-3">
                      <div className={`w-1.5 h-8 rounded-full transition-all duration-300 ${
                        isSelected ? 'bg-azul-monte-tabor' : 'bg-transparent group-hover:bg-gray-200'
                      }`} />
                    </td>

                    {/* Celda Estudiante: se encoge al seleccionar */}
                    <td className="px-4 py-3 overflow-hidden">
                      <div className={`transition-all duration-300 ease-in-out ${
                        isSelected ? 'max-w-[120px]' : 'max-w-full'
                      }`}>
                        <div className={`font-medium text-sm truncate transition-colors duration-300 ${
                          isSelected ? 'text-azul-monte-tabor' : 'text-gray-900'
                        }`}>
                          {application.student?.firstName} {application.student?.lastName}
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5 truncate">{application.student?.gradeApplied}</div>
                      </div>
                    </td>

                    {/* Estado — se oculta al seleccionar */}
                    <td className={`px-4 py-3 transition-all duration-300 ${
                      isSelected ? 'opacity-0 w-0 px-0 overflow-hidden' : 'opacity-100'
                    }`}>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${
                        statusColors[application.status] || 'bg-gray-100 text-gray-700'
                      }`}>
                        {statusLabels[application.status] || application.status}
                      </span>
                    </td>

                    {/* Evaluadores — se oculta al seleccionar */}
                    <td className={`px-4 py-3 transition-all duration-300 ${
                      isSelected ? 'opacity-0 w-0 px-0 overflow-hidden' : 'opacity-100'
                    }`}>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-semibold ${
                          allAssigned ? 'text-green-600' : noneAssigned ? 'text-gray-400' : 'text-azul-monte-tabor'
                        }`}>
                          {assignedCount}/3
                        </span>
                        {allAssigned && <span className="text-xs text-green-600">✓ Completo</span>}
                        {!allAssigned && assignedCount > 0 && <span className="text-xs text-gray-400">{3 - assignedCount} pendiente{3 - assignedCount > 1 ? 's' : ''}</span>}
                        {noneAssigned && <span className="text-xs text-gray-400">Sin asignar</span>}
                      </div>
                    </td>

                    {/* Progreso / Botón acción — cross-fade suave */}
                    <td className="px-4 py-3 relative overflow-hidden" style={{ minWidth: 140 }}>
                      {/* Barra de progreso — se desvanece al seleccionar */}
                      <div
                        className="flex items-center gap-2 absolute inset-y-0 left-4 right-4 transition-all duration-300"
                        style={{
                          opacity: isSelected ? 0 : 1,
                          transform: isSelected ? 'translateX(-12px)' : 'translateX(0)',
                          pointerEvents: isSelected ? 'none' : 'auto'
                        }}
                      >
                        <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                          <div
                            className={`h-1.5 rounded-full transition-all ${
                              allAssigned ? 'bg-green-500' : 'bg-azul-monte-tabor'
                            }`}
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 w-8 text-right shrink-0">{progressPct}%</span>
                      </div>
                      {/* Botón de acción — aparece al seleccionar */}
                      <div
                        className="flex items-center gap-1.5 absolute inset-y-0 left-4 right-4 transition-all duration-300"
                        style={{
                          opacity: isSelected ? 1 : 0,
                          transform: isSelected ? 'translateX(0)' : 'translateX(12px)',
                          pointerEvents: isSelected ? 'auto' : 'none'
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {getActionButton()}
                        <button
                          onClick={(e) => { e.stopPropagation(); setSelectedRowId(null); setSelectedApplication(null); }}
                          className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors shrink-0"
                          title="Deseleccionar"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      {/* Espaciador invisible para mantener alto de fila */}
                      <div className="invisible flex items-center gap-2">
                        <div className="flex-1 h-1.5 min-w-[50px]" />
                        <span className="text-xs w-8">00%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Paginación + limitador */}
        <div className="flex flex-wrap items-center justify-between gap-3 mt-3">
          <span className="text-xs text-gray-400">
            Mostrando {Math.min((currentPage - 1) * pageSize + 1, filteredApplications.length)}–{Math.min(currentPage * pageSize, filteredApplications.length)} de {filteredApplications.length}
          </span>
          <div className="flex items-center gap-3">
            {/* Selector de registros por página */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-400">Por página:</span>
              <select
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                className="text-xs border border-gray-300 rounded px-1.5 py-1 bg-white"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
            {/* Controles de página */}
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="px-2 py-1 rounded border text-xs disabled:opacity-40 hover:bg-gray-100">«</button>
                <button onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 1} className="px-2 py-1 rounded border text-xs disabled:opacity-40 hover:bg-gray-100">‹</button>
                <span className="px-3 py-1 rounded border text-xs bg-azul-monte-tabor text-white">{currentPage} / {totalPages}</span>
                <button onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage === totalPages} className="px-2 py-1 rounded border text-xs disabled:opacity-40 hover:bg-gray-100">›</button>
                <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} className="px-2 py-1 rounded border text-xs disabled:opacity-40 hover:bg-gray-100">»</button>
              </div>
            )}
          </div>
        </div>

      </Card>

      {/* Modal de Asignación Manual */}
      {showAssignModal && selectedApplication && (
        <CustomAssignmentModal
          application={selectedApplication}
          evaluators={evaluators}
          isOpen={showAssignModal}
          onClose={handleAssignmentComplete}
          onAssign={(_appId, _assignments) => Promise.resolve()}
          isLoading={isLoading}
          getEvaluatorsByType={getEvaluatorsByType}
          isAdmin={true}
        />
      )}
    </div>
  );
};

// Custom Assignment Modal Component
interface CustomAssignmentModalProps {
  application: Application;
  evaluators: any[];
  isOpen: boolean;
  onClose: () => void;
  onAssign: (applicationId: number, assignments: EvaluatorAssignment[]) => void;
  isLoading: boolean;
  getEvaluatorsByType: (type: EvaluationType) => any[];
  isAdmin?: boolean;
}

const CustomAssignmentModal: React.FC<CustomAssignmentModalProps> = ({
  application,
  evaluators,
  isOpen,
  onClose,
  onAssign,
  isLoading,
  getEvaluatorsByType,
  isAdmin = true
}) => {
  const [assignments, setAssignments] = useState<EvaluatorAssignment[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [existingEvaluations, setExistingEvaluations] = useState<any[]>([]);
  const [isLoadingEvaluations, setIsLoadingEvaluations] = useState(false);
  // Tipos desbloqueados para edición por admin
  const [unlockedTypes, setUnlockedTypes] = useState<Set<EvaluationType>>(new Set());
  // Confirm dialog para reasignaciones
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingProcess, setPendingProcess] = useState<Array<{ assignment: EvaluatorAssignment; existingEval: any | null }>>([]);

  const requiredEvaluations = [
    EvaluationType.LANGUAGE_EXAM,
    EvaluationType.MATHEMATICS_EXAM,
    EvaluationType.ENGLISH_EXAM
  ];

  useEffect(() => {
    if (isOpen) {
      setUnlockedTypes(new Set());
      setShowConfirm(false);
      setPendingProcess([]);
      loadExistingEvaluations();
    }
  }, [isOpen, application.id]);

  const loadExistingEvaluations = async () => {
    try {
      setIsLoadingEvaluations(true);
      setSubmitMessage(null);
      setIsSubmitting(false);

      const evals = await evaluationService.getEvaluationsByApplicationId(application.id);
      setExistingEvaluations(evals);

      // Backend retorna: { type: 'MATHEMATICS_EXAM', evaluatorId: 7 } (no evaluationType, no evaluator.id)
      const initialAssignments = requiredEvaluations.map(evalType => {
        const existingEval = evals.find((ev: any) =>
          (ev.type || ev.evaluationType) === evalType
        );
        const assignedEvaluatorId = existingEval?.evaluatorId
          || existingEval?.evaluator?.id
          || 0;
        // Buscar nombre en la lista de evaluadores cargados
        const matchedEvaluator = evaluators.find((e: any) => e.id === assignedEvaluatorId);
        const assignedEvaluatorName = matchedEvaluator
          ? `${matchedEvaluator.firstName} ${matchedEvaluator.lastName}`
          : (existingEval?.evaluator
              ? `${existingEval.evaluator.firstName} ${existingEval.evaluator.lastName}`
              : '');
        return {
          evaluationType: evalType,
          evaluatorId: assignedEvaluatorId,
          evaluatorName: assignedEvaluatorName
        };
      });
      setAssignments(initialAssignments);
    } catch (error) {
      setSubmitMessage({
        type: 'error',
        text: 'No se pudieron cargar las evaluaciones existentes. Por favor, cierre y vuelva a abrir este modal.'
      });
      const initialAssignments = requiredEvaluations.map(type => ({
        evaluationType: type,
        evaluatorId: 0,
        evaluatorName: ''
      }));
      setAssignments(initialAssignments);
      setExistingEvaluations([]);
    } finally {
      setIsLoadingEvaluations(false);
    }
  };

  const updateAssignment = (evaluationType: EvaluationType, evaluatorId: number) => {
    const evaluator = evaluators.find(e => e.id === evaluatorId);
    setAssignments(prev => prev.map(assignment =>
      assignment.evaluationType === evaluationType
        ? {
            ...assignment,
            evaluatorId,
            evaluatorName: evaluator ? `${evaluator.firstName} ${evaluator.lastName}` : ''
          }
        : assignment
    ));
  };

  // Paso 1: construir lista de cambios y mostrar confirm si hay reasignaciones
  const handleSubmit = () => {
    const toProcess: Array<{ assignment: EvaluatorAssignment; existingEval: any | null }> = [];

    for (const assignment of assignments) {
      if (assignment.evaluatorId <= 0) continue;
      const existingEval = existingEvaluations.find(
        (ev: any) => (ev.type || ev.evaluationType) === assignment.evaluationType
      );
      const currentEvaluatorId = existingEval?.evaluatorId || existingEval?.evaluator?.id || 0;
      if (existingEval) {
        if (isAdmin && unlockedTypes.has(assignment.evaluationType) && currentEvaluatorId !== assignment.evaluatorId) {
          toProcess.push({ assignment, existingEval });
        }
      } else {
        toProcess.push({ assignment, existingEval: null });
      }
    }

    if (toProcess.length === 0) {
      setSubmitMessage({ type: 'error', text: 'No hay cambios para guardar.' });
      return;
    }

    const hasReassignments = toProcess.some(p => p.existingEval !== null);
    if (hasReassignments) {
      setPendingProcess(toProcess);
      setShowConfirm(true);
      return;
    }

    executeProcess(toProcess);
  };

  // Paso 2: ejecutar tras confirmación
  const executeProcess = async (toProcess: Array<{ assignment: EvaluatorAssignment; existingEval: any | null }>) => {
    setShowConfirm(false);
    setIsSubmitting(true);
    setSubmitMessage({ type: 'success', text: `Guardando ${toProcess.length} cambio(s)...` });

    try {
      for (const { assignment, existingEval } of toProcess) {
        if (existingEval) {
          await evaluationService.reassignEvaluation(existingEval.id, assignment.evaluatorId);
        } else {
          await evaluationService.assignSpecificEvaluation(
            application.id, assignment.evaluationType, assignment.evaluatorId
          );
        }
      }
      setSubmitMessage({ type: 'success', text: `Guardado correctamente.` });
      await loadExistingEvaluations();
      setTimeout(() => { onClose(); }, 1200);
    } catch (error: any) {
      if (error.response?.status === 409) {
        setSubmitMessage({ type: 'error', text: 'Conflicto al asignar. Recargando...' });
        await loadExistingEvaluations();
      } else {
        setSubmitMessage({ type: 'error', text: `Error: ${error.message || 'Intente nuevamente.'}` });
      }
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Asignación de Evaluadores"
      size="lg"
    >
      <div className="space-y-6">
        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="font-medium text-blue-800 mb-1">
            {application.student?.firstName} {application.student?.lastName}
          </h4>
          <p className="text-blue-500 text-sm">Curso: {application.student?.gradeApplied}</p>
        </div>

        <div className="space-y-3">
          {isLoadingEvaluations ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-azul-monte-tabor mx-auto mb-3"></div>
              <p className="text-gray-500 text-sm">Cargando evaluaciones...</p>
            </div>
          ) : (
            requiredEvaluations.map(evaluationType => {
              const availableEvaluators = getEvaluatorsByType(evaluationType);
              const assignment = assignments.find(a => a.evaluationType === evaluationType);
              const existingEval = existingEvaluations.find(
                (ev: any) => (ev.type || ev.evaluationType) === evaluationType
              );
              const isAssigned = !!(existingEval?.evaluatorId || existingEval?.evaluator?.id);
              const isUnlocked = unlockedTypes.has(evaluationType);
              const isDisabled = (isAssigned && !isUnlocked) || isSubmitting;

              return (
                <div key={evaluationType} className={`border rounded-lg p-4 ${
                  isAssigned && !isUnlocked ? 'bg-gray-50' : 'bg-white'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-azul-monte-tabor text-sm">
                      {EVALUATION_TYPE_LABELS[evaluationType]}
                    </span>
                    <div className="flex items-center gap-2">
                      {isAssigned && !isUnlocked && (
                        <span className="flex items-center gap-1 text-xs text-green-700 bg-green-50 border border-green-200 rounded-full px-2 py-0.5">
                          <CheckCircle className="w-3 h-3" />
                          Asignado
                        </span>
                      )}
                      {isAssigned && isAdmin && !isUnlocked && (
                        <button
                          type="button"
                          onClick={() => setUnlockedTypes(prev => { const s = new Set(prev); s.add(evaluationType); return s; })}
                          className="flex items-center gap-1 text-xs text-gray-500 hover:text-azul-monte-tabor border border-gray-300 hover:border-azul-monte-tabor rounded-full px-2 py-0.5 transition-colors"
                          title="Modificar evaluador"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                          Modificar
                        </button>
                      )}
                      {isAssigned && isUnlocked && (
                        <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                          Editando
                        </span>
                      )}
                    </div>
                  </div>

                  <select
                    value={assignment?.evaluatorId || 0}
                    onChange={(e) => updateAssignment(evaluationType, parseInt(e.target.value))}
                    disabled={isDisabled}
                    className={`w-full p-2 border rounded-lg text-sm ${
                      isDisabled
                        ? 'border-gray-200 bg-gray-100 text-gray-500 cursor-not-allowed'
                        : 'border-gray-300 bg-white'
                    }`}
                  >
                    <option value={0}>Seleccionar evaluador...</option>
                    {availableEvaluators.map(evaluator => (
                      <option key={evaluator.id} value={evaluator.id}>
                        {evaluator.firstName} {evaluator.lastName}
                      </option>
                    ))}
                  </select>

                  {!isAdmin && isAssigned && (
                    <p className="text-gray-400 text-xs mt-1">Solo el administrador puede modificar esta asignación.</p>
                  )}
                  {availableEvaluators.length === 0 && !isAssigned && (
                    <p className="text-red-400 text-xs mt-1">Sin evaluadores disponibles para este examen.</p>
                  )}
                </div>
              );
            })
          )}
        </div>

        <ConfirmDialog
          isOpen={showConfirm}
          title="Confirmar cambio de evaluador"
          message={`Se modificarán ${pendingProcess.filter(p => p.existingEval).length} asignación(es) existente(s).\nEsta acción reemplazará el evaluador asignado actualmente.`}
          confirmText="Sí, cambiar evaluador"
          cancelText="Cancelar"
          variant="warning"
          onConfirm={() => executeProcess(pendingProcess)}
          onClose={() => { setShowConfirm(false); setPendingProcess([]); }}
        />

        {submitMessage && (
          <div className={`px-4 py-3 rounded-lg text-sm ${
            submitMessage.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            {submitMessage.text}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>Cancelar</Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={isSubmitting || isLoadingEvaluations}
            isLoading={isSubmitting}
          >
            {isSubmitting ? 'Guardando...' : 'Guardar'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default EvaluationManagement;