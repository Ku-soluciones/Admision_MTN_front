import { applicationStatusPolicy } from '../../../../packages/shared-ui/src/utils/applicationStatusPolicy';
import React from 'react';
import LoadingSpinner from '../ui/LoadingSpinner';
import { Application } from '../../services/applicationService';
import { buildGradeDisplay, buildStudentDisplayName } from '../../services/applicationTableMapper';
import { FiRefreshCw, FiSearch, FiX, FiChevronUp, FiChevronDown } from 'react-icons/fi';
import { ChevronsUpDown } from 'lucide-react';
import {
  FileTextIcon,
  ArchiveIcon
} from '../icons/Icons';

const Tip: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="relative group/tip inline-flex">
    {children}
    <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs font-medium text-white bg-gray-800 rounded-md whitespace-nowrap opacity-0 group-hover/tip:opacity-100 transition-opacity duration-150 z-50">
      {label}
      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800" />
    </div>
  </div>
);

type SortField = 'student' | 'grade' | 'guardian' | 'status' | 'payment' | 'questionnaire' | 'date';

interface SortState {
  field: SortField;
  direction: 'asc' | 'desc';
}

const SortableTh: React.FC<{
  field: SortField;
  label: string;
  sort: SortState;
  onSort: (field: SortField) => void;
  className?: string;
}> = ({ field, label, sort, onSort, className = '' }) => {
  const isActive = sort.field === field;
  return (
    <th className={className}>
      <button
        type="button"
        onClick={() => onSort(field)}
        className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase tracking-wide hover:text-gray-700"
      >
        {label}
        {isActive ? (
          sort.direction === 'asc' ? <FiChevronUp className="h-3.5 w-3.5" /> : <FiChevronDown className="h-3.5 w-3.5" />
        ) : (
          <ChevronsUpDown className="h-3.5 w-3.5 text-gray-300" />
        )}
      </button>
    </th>
  );
};

interface ApplicationsTableProps {
  applications: Application[];
  isLoading?: boolean;
  onView?: (application: Application) => void;
  onArchive?: (application: Application) => void;
  onDecision?: (application: Application) => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  className?: string;
}

const getStatusColor = (status: string) => {
  switch (status?.toUpperCase()) {
    case 'SUBMITTED': case 'PENDING': return 'bg-blue-100 text-blue-800';
    case 'UNDER_REVIEW': return 'bg-yellow-100 text-yellow-800';
    case 'EXAM_SCHEDULED': return 'bg-indigo-100 text-indigo-800';
    case 'INTERVIEW_SCHEDULED': return 'bg-purple-100 text-purple-800';
    case 'APPROVED': return 'bg-green-100 text-green-800';
    case 'REJECTED': return 'bg-red-100 text-red-800';
    case 'WAITLIST': return 'bg-orange-100 text-orange-800';
    default: return 'bg-gray-100 text-gray-700';
  }
};

const getStatusLabel = (status: string): string => {
  switch (status?.toUpperCase()) {
    case 'SUBMITTED': case 'PENDING': return 'Enviada';
    case 'UNDER_REVIEW': return 'En Revisión';
    case 'EXAM_SCHEDULED': return 'Examen Agendado';
    case 'INTERVIEW_SCHEDULED': return 'Entrevista Programada';
    case 'APPROVED': return 'Aceptada';
    case 'REJECTED': return 'No aceptado';
    case 'WAITLIST': return 'Lista de Espera';
    default: return status || 'Sin Estado';
  }
};

const formatDate = (dateString: string | undefined | null): string => {
  if (!dateString) return '—';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '—';
    return date.toLocaleDateString('es-CL', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch { return '—'; }
};

const getPaymentBadge = (paymentStatus?: string): { bg: string; text: string; label: string } => {
  switch (paymentStatus?.toUpperCase()) {
    case 'PAID': return { bg: 'bg-green-100', text: 'text-green-800', label: 'Pagado' };
    case 'UNPAID': return { bg: 'bg-red-100', text: 'text-red-800', label: 'Sin pagar' };
    case 'PAYMENT_PENDING': return { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pendiente' };
    case 'FAILED': return { bg: 'bg-red-100', text: 'text-red-800', label: 'Fallido' };
    case 'EXPIRED': return { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Vencido' };
    default: return { bg: 'bg-gray-100', text: 'text-gray-600', label: 'N/A' };
  }
};

const getComplementaryBadge = (hasComplementaryForm?: boolean): { bg: string; text: string; label: string } => {
  if (hasComplementaryForm) {
    return { bg: 'bg-green-100', text: 'text-green-800', label: 'Llenado' };
  }
  return { bg: 'bg-red-100', text: 'text-red-800', label: 'Sin llenar' };
};

const ApplicationsTable: React.FC<ApplicationsTableProps> = ({
  applications,
  isLoading = false,
  onView,
  onArchive,
  onDecision,
  onRefresh,
  isRefreshing = false,
  className = ''
}) => {
  const [currentPage, setCurrentPage] = React.useState(1);
  const pageSize = 10;
  const [search, setSearch] = React.useState('');
  const [sort, setSort] = React.useState<SortState>({ field: 'date', direction: 'desc' });

  React.useEffect(() => { setCurrentPage(1); }, [applications]);
  React.useEffect(() => { setCurrentPage(1); }, [search]);

  const handleSort = (field: SortField) => {
    setSort(prev => prev.field === field
      ? { field, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
      : { field, direction: 'asc' });
  };

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return applications;
    return applications.filter(app => {
      const st = app.student as Record<string, unknown> | undefined;
      const name = buildStudentDisplayName(st).toLowerCase();
      const rut = (app.student?.rut || '').toLowerCase();
      return name.includes(q) || rut.includes(q);
    });
  }, [applications, search]);

  const sorted = React.useMemo(() => {
    const getValue = (app: Application): string | number => {
      const st = app.student as Record<string, unknown> | undefined;
      switch (sort.field) {
        case 'student':
          return buildStudentDisplayName(st);
        case 'grade':
          return buildGradeDisplay(st);
        case 'guardian':
          return app.guardian?.fullName ||
            (app.applicantUser?.firstName ? `${app.applicantUser.firstName} ${app.applicantUser.lastName || ''}`.trim() : '');
        case 'status':
          return getStatusLabel(app.status);
        case 'payment':
          return getPaymentBadge(app.paymentStatus).label;
        case 'questionnaire':
          return app.hasComplementaryForm ? 1 : 0;
        case 'date':
          return app.submissionDate ? new Date(app.submissionDate).getTime() : 0;
        default:
          return '';
      }
    };

    return [...filtered].sort((a, b) => {
      const valueA = getValue(a);
      const valueB = getValue(b);
      const comparison = typeof valueA === 'number' && typeof valueB === 'number'
        ? valueA - valueB
        : String(valueA).localeCompare(String(valueB), 'es');
      return sort.direction === 'asc' ? comparison : -comparison;
    });
  }, [filtered, sort]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const paged = sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">Cargando postulaciones...</p>
        </div>
      </div>
    );
  }

  if (applications.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg">
        <FileTextIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">No se encontraron postulaciones</p>
        <p className="text-sm text-gray-500 mt-1">Las postulaciones aparecerán aquí cuando se envíen</p>
      </div>
    );
  }

  return (
    <div className={`overflow-hidden ${className}`}>

      {/* Actualizar + Buscador */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <span className="text-sm text-gray-500">
          {sorted.length} postulaci{sorted.length === 1 ? 'ón' : 'ones'}
        </span>
        <div className="flex flex-wrap items-center gap-2">
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:opacity-60"
          >
            <FiRefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin motion-reduce:animate-none' : ''}`} aria-hidden="true" />
            Actualizar
          </button>
        )}
        <div className="relative w-full sm:w-72">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" aria-hidden="true" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nombre, RUT"
            className="w-full pl-9 pr-9 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-azul-monte-tabor focus:border-transparent"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <FiX className="w-4 h-4" aria-hidden="true" />
            </button>
          )}
        </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="rounded-lg border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full table-fixed divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <SortableTh field="student" label="Estudiante" sort={sort} onSort={handleSort} className="w-[20%] px-3 py-2.5 text-left" />
              <SortableTh field="grade" label="Grado" sort={sort} onSort={handleSort} className="w-[7%] px-3 py-2.5 text-left" />
              <SortableTh field="guardian" label="Apoderado" sort={sort} onSort={handleSort} className="w-[14%] px-3 py-2.5 text-left hidden md:table-cell" />
              <SortableTh field="status" label="Estado" sort={sort} onSort={handleSort} className="w-[10%] px-3 py-2.5 text-left" />
              <SortableTh field="payment" label="Pago" sort={sort} onSort={handleSort} className="w-[9%] px-3 py-2.5 text-center" />
              <SortableTh field="questionnaire" label="Cuestionario" sort={sort} onSort={handleSort} className="w-[10%] px-3 py-2.5 text-center" />
              <SortableTh field="date" label="Fecha" sort={sort} onSort={handleSort} className="w-[10%] px-3 py-2.5 text-left" />
              <th className="w-[20%] px-3 py-2.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Acciones</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {paged.map((application) => {
              const st = application.student as Record<string, unknown> | undefined;
              const studentLine = buildStudentDisplayName(st);

              return (
                <tr
                  key={application.id}
                  className="group hover:bg-gray-50 transition-colors"
                >
                  {/* Estudiante */}
                  <td className="px-3 py-3 overflow-hidden">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {studentLine}
                    </div>
                    <div className="text-xs text-gray-400 truncate">
                      {application.student?.rut || 'Sin RUT'}
                    </div>
                  </td>

                  {/* Grado */}
                  <td className="px-3 py-3 whitespace-nowrap">
                    <span className="text-sm text-gray-700">{buildGradeDisplay(st)}</span>
                  </td>

                  {/* Apoderado — oculto en móvil */}
                  <td className="px-3 py-3 overflow-hidden hidden md:table-cell">
                    <div className="text-sm text-gray-700 truncate">
                      {application.guardian?.fullName ||
                        (application.applicantUser?.firstName
                          ? `${application.applicantUser.firstName} ${application.applicantUser.lastName || ''}`.trim()
                          : '—')}
                    </div>
                    <div className="text-xs text-gray-400 truncate">
                      {application.guardian?.email || application.applicantUser?.email || ''}
                    </div>
                  </td>

                  {/* Estado */}
                  <td className="px-3 py-3 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(application.status)}`}>
                      {getStatusLabel(application.status)}
                    </span>
                  </td>

                  {/* Pago */}
                  <td className="px-2 py-3 whitespace-nowrap text-center">
                    {(() => {
                      const badge = getPaymentBadge(application.paymentStatus);
                      return (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
                          {badge.label}
                        </span>
                      );
                    })()}
                  </td>

                  {/* Cuestionario */}
                  <td className="px-2 py-3 whitespace-nowrap text-center">
                    {(() => {
                      const badge = getComplementaryBadge(application.hasComplementaryForm);
                      return (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
                          {badge.label}
                        </span>
                      );
                    })()}
                  </td>

                  {/* Fecha */}
                  <td className="px-3 py-3 whitespace-nowrap">
                    <span className="text-sm text-gray-500">{formatDate(application.submissionDate)}</span>
                  </td>

                  {/* Acciones */}
                  <td className="px-3 py-3 whitespace-nowrap text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      {onView && (
                        <button
                          onClick={() => onView(application)}
                          className="inline-flex min-h-9 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                        >
                          Ver detalles
                        </button>
                      )}
                      {onDecision && (
                        <Tip label={applicationStatusPolicy(application).reason || "Decisión final"}>
                          <button
                            disabled={applicationStatusPolicy(application).locked}
                            aria-label={applicationStatusPolicy(application).reason || "Decisión final"}
                            onClick={() => onDecision(application)}
                            className="inline-flex min-h-9 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            Decisión final
                          </button>
                        </Tip>
                      )}
                      {onArchive && (
                        <Tip label={!applicationStatusPolicy(application).canChangeTo("ARCHIVED") ? applicationStatusPolicy(application).reason : "Archivar postulación"}>
                          <button
                            disabled={!applicationStatusPolicy(application).canChangeTo("ARCHIVED")}
                            aria-label="Archivar postulación"
                            onClick={() => onArchive(application)}
                            className="flex items-center justify-center w-9 h-9 rounded-lg border border-slate-200 bg-white text-slate-700 hover:border-orange-200 hover:bg-orange-50 hover:text-orange-500 transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <ArchiveIcon className="w-4 h-4" />
                          </button>
                        </Tip>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer: paginación simple */}
      <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3">
        <button
          type="button"
          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
          disabled={currentPage === 1}
          className="inline-flex items-center rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-white"
        >
          ← Anterior
        </button>
        <span className="text-sm text-gray-500">Página {currentPage} de {totalPages}</span>
        <button
          type="button"
          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
          disabled={currentPage === totalPages}
          className="inline-flex items-center rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-white"
        >
          Siguiente →
        </button>
      </div>
      </div>
    </div>
  );
};

export default ApplicationsTable;
