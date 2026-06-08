import React from 'react';
import LoadingSpinner from '../ui/LoadingSpinner';
import { Application } from '../../services/applicationService';
import { buildGradeDisplay, buildStudentDisplayName } from '../../services/applicationTableMapper';
import {
  FileTextIcon,
  EyeIcon,
  ArchiveIcon,
  CheckCircleIcon
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

interface ApplicationsTableProps {
  applications: Application[];
  isLoading?: boolean;
  onView?: (application: Application) => void;
  onArchive?: (application: Application) => void;
  onDecision?: (application: Application) => void;
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
    case 'REJECTED': return 'Rechazada';
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

const ApplicationsTable: React.FC<ApplicationsTableProps> = ({
  applications,
  isLoading = false,
  onView,
  onArchive,
  onDecision,
  className = ''
}) => {
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);
  const [selectedId, setSelectedId] = React.useState<number | null>(null);
  const [search, setSearch] = React.useState('');

  React.useEffect(() => { setCurrentPage(1); setSelectedId(null); }, [applications]);
  React.useEffect(() => { setCurrentPage(1); }, [search]);

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return applications;
    return applications.filter(app => {
      const st = app.student as Record<string, unknown> | undefined;
      const name = buildStudentDisplayName(st).toLowerCase();
      const rut = (app.student?.rut || '').toLowerCase();
      const guardian = (app.guardian?.fullName ||
        (app.applicantUser?.firstName ? `${app.applicantUser.firstName} ${app.applicantUser.lastName || ''}` : '')
      ).toLowerCase();
      const status = getStatusLabel(app.status).toLowerCase();
      return name.includes(q) || rut.includes(q) || guardian.includes(q) || status.includes(q);
    });
  }, [applications, search]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paged = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleRowClick = (app: Application) => {
    setSelectedId(prev => prev === app.id ? null : app.id);
  };

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

      {/* Buscador */}
      <div className="relative mb-3">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
        </svg>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nombre, RUT, apoderado o estado…"
          className="w-full pl-9 pr-9 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-azul-monte-tabor focus:border-transparent"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Hint instructivo */}
      {selectedId === null && (
        <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-blue-50 border border-blue-100 rounded-lg text-blue-600 text-xs">
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Selecciona una fila para ver las acciones disponibles
        </div>
      )}

      {/* Tabla */}
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="w-6 px-3 py-2.5"></th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Estudiante</th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Grado</th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Apoderado</th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Estado</th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide" style={{ minWidth: 180 }}>Fecha / Acciones</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {paged.map((application) => {
              const isSelected = selectedId === application.id;
              const st = application.student as Record<string, unknown> | undefined;
              const studentLine = buildStudentDisplayName(st);
              const parts = studentLine.split(/\s+/).filter(Boolean);
              const initials = parts.length > 1
                ? `${parts[0]?.charAt(0) || 'N'}${parts[parts.length - 1]?.charAt(0) || ''}`
                : parts[0]?.slice(0, 2) || 'NN';

              return (
                <tr
                  key={application.id}
                  onClick={() => handleRowClick(application)}
                  className={`transition-colors cursor-pointer group ${isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                >
                  {/* Indicador lateral */}
                  <td className="px-3 py-3">
                    <div className={`w-1.5 h-8 rounded-full transition-all duration-300 ${
                      isSelected ? 'bg-azul-monte-tabor' : 'bg-transparent group-hover:bg-gray-200'
                    }`} />
                  </td>

                  {/* Estudiante */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`shrink-0 h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold transition-colors duration-300 ${
                        isSelected ? 'bg-azul-monte-tabor text-white' : 'bg-azul-monte-tabor bg-opacity-10 text-azul-monte-tabor'
                      }`}>
                        {(initials || 'NN').slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className={`text-sm font-medium truncate transition-colors duration-300 ${isSelected ? 'text-azul-monte-tabor' : 'text-gray-900'}`}>
                          {studentLine}
                        </div>
                        <div className="text-xs text-gray-400 truncate">
                          {application.student?.rut || 'Sin RUT'}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Grado */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="text-sm text-gray-700">{buildGradeDisplay(st)}</span>
                  </td>

                  {/* Apoderado — oculto en móvil */}
                  <td className="px-4 py-3 hidden md:table-cell">
                    <div className="text-sm text-gray-700 truncate max-w-[160px]">
                      {application.guardian?.fullName ||
                        (application.applicantUser?.firstName
                          ? `${application.applicantUser.firstName} ${application.applicantUser.lastName || ''}`.trim()
                          : '—')}
                    </div>
                    <div className="text-xs text-gray-400 truncate max-w-[160px]">
                      {application.guardian?.email || application.applicantUser?.email || ''}
                    </div>
                  </td>

                  {/* Estado */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(application.status)}`}>
                      {getStatusLabel(application.status)}
                    </span>
                  </td>

                  {/* Fecha / Acciones — cross-fade */}
                  <td className="px-4 py-3 relative overflow-hidden" style={{ minWidth: 180 }}>
                    {/* Fecha — se va al seleccionar */}
                    <div
                      className="absolute inset-y-0 left-4 right-4 flex items-center transition-all duration-300"
                      style={{
                        opacity: isSelected ? 0 : 1,
                        transform: isSelected ? 'translateX(-10px)' : 'translateX(0)',
                        pointerEvents: isSelected ? 'none' : 'auto'
                      }}
                    >
                      <span className="text-sm text-gray-500">{formatDate(application.submissionDate)}</span>
                    </div>

                    {/* Acciones — aparecen al seleccionar */}
                    <div
                      className="absolute inset-y-0 left-4 right-4 flex items-center gap-2 transition-all duration-300"
                      style={{
                        opacity: isSelected ? 1 : 0,
                        transform: isSelected ? 'translateX(0)' : 'translateX(10px)',
                        pointerEvents: isSelected ? 'auto' : 'none'
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* Ver */}
                      {onView && (
                        <Tip label="Ver detalles">
                          <button
                            onClick={() => onView(application)}
                            className="flex items-center justify-center w-9 h-9 rounded-xl bg-azul-monte-tabor text-white hover:bg-blue-700 transition-colors shadow-sm"
                          >
                            <EyeIcon className="w-4 h-4" />
                          </button>
                        </Tip>
                      )}
                      {/* Decisión */}
                      {onDecision && (
                        <Tip label="Decisión final">
                          <button
                            onClick={() => onDecision(application)}
                            className="flex items-center justify-center w-9 h-9 rounded-xl border-2 border-green-400 text-green-600 hover:bg-green-50 transition-colors"
                          >
                            <CheckCircleIcon className="w-4 h-4" />
                          </button>
                        </Tip>
                      )}
                      {/* Archivar */}
                      {onArchive && (
                        <Tip label="Archivar postulación">
                          <button
                            onClick={() => onArchive(application)}
                            className="flex items-center justify-center w-9 h-9 rounded-xl border-2 border-orange-400 text-orange-500 hover:bg-orange-50 transition-colors"
                          >
                            <ArchiveIcon className="w-4 h-4" />
                          </button>
                        </Tip>
                      )}
                      {/* Deseleccionar */}
                      <Tip label="Deseleccionar">
                        <button
                          onClick={(e) => { e.stopPropagation(); setSelectedId(null); }}
                          className="flex items-center justify-center w-7 h-7 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors ml-auto"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </Tip>
                    </div>

                    {/* Spacer invisible */}
                    <div className="invisible flex items-center">
                      <span className="text-sm">00 ene 0000</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer: contador + selector página + paginación */}
      <div className="flex flex-wrap items-center justify-between gap-3 mt-3 px-1">
        <span className="text-xs text-gray-400">
          {Math.min((currentPage - 1) * pageSize + 1, applications.length)}–{Math.min(currentPage * pageSize, applications.length)} de {applications.length} postulaciones
        </span>
        <div className="flex items-center gap-3">
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
    </div>
  );
};

export default ApplicationsTable;