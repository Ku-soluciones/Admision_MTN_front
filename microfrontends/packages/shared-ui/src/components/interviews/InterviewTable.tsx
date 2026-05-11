import React from 'react';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import ConfirmDialog from '../ui/ConfirmDialog';
import SimpleToast from '../ui/SimpleToast';
import { 
  CalendarIcon,
} from '../icons/Icons';
import {
  FiEdit,
  FiEye,
  FiCheck,
  FiX,
  FiCalendar,
  FiClock,
  FiMapPin,
  FiVideo,
  FiRefreshCw,
  FiUser,
  FiMail,
  FiBell,
  FiTrash2
} from 'react-icons/fi';
import {
  Interview,
  InterviewTableProps,
  InterviewStatus,
  InterviewType,
  InterviewMode,
  InterviewResult,
  INTERVIEW_STATUS_LABELS,
  INTERVIEW_TYPE_LABELS,
  INTERVIEW_MODE_LABELS,
  INTERVIEW_RESULT_LABELS,
  InterviewUtils
} from '../../types/interview';

const Tip: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="relative group/tip inline-flex">
    {children}
    <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs font-medium text-white bg-gray-800 rounded-md whitespace-nowrap opacity-0 group-hover/tip:opacity-100 transition-opacity duration-150 z-50">
      {label}
      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800" />
    </div>
  </div>
);

const InterviewTable: React.FC<InterviewTableProps> = ({
  interviews,
  isLoading = false,
  onEdit,
  onComplete,
  onCancel,
  onReschedule,
  onView,
  onSendNotification,
  onSendReminder,
  onRefreshDashboard,
  className = ''
}) => {
  const [deletingId, setDeletingId] = React.useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = React.useState<Interview | null>(null);
  const [toast, setToast] = React.useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [selectedId, setSelectedId] = React.useState<number | null>(null);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);
  const [search, setSearch] = React.useState('');

  React.useEffect(() => { setCurrentPage(1); setSelectedId(null); }, [interviews]);
  React.useEffect(() => { setCurrentPage(1); }, [search]);

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return interviews;
    return interviews.filter(iv =>
      (iv.studentName || '').toLowerCase().includes(q) ||
      (iv.gradeApplied || '').toLowerCase().includes(q) ||
      (iv.interviewerName || '').toLowerCase().includes(q) ||
      (iv.parentNames || '').toLowerCase().includes(q) ||
      INTERVIEW_STATUS_LABELS[iv.status]?.toLowerCase().includes(q) ||
      INTERVIEW_TYPE_LABELS[iv.type]?.toLowerCase().includes(q)
    );
  }, [interviews, search]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paged = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleDelete = (interview: Interview) => {
    setConfirmDelete(interview);
  };

  const performDelete = async () => {
    const interview = confirmDelete;
    if (!interview) return;
    try {
      setDeletingId(interview.id);

      // Use interviewService.cancelInterview for soft delete (sets status to CANCELLED)
      const interviewService = (await import('../../../../../apps/mf-admissions/services/interviewService')).default;
      await interviewService.cancelInterview(interview.id, 'Cancelada por administrador');


      // Use callback to refresh parent dashboard instead of full page reload
      if (onRefreshDashboard) {
        onRefreshDashboard();
      } else {
        // Fallback to page reload if callback not provided (backward compatibility)
        window.location.reload();
      }
    } catch (error) {
      setToast({
        message: `Error al cancelar la entrevista: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        type: 'error',
      });
    } finally {
      setDeletingId(null);
      setConfirmDelete(null);
    }
  };

  const getStatusBadge = (status: InterviewStatus) => {
    const variant = InterviewUtils.getStatusColor(status);
    return (
      <Badge variant={variant}>
        {INTERVIEW_STATUS_LABELS[status]}
      </Badge>
    );
  };

  const getTypeBadge = (type: InterviewType) => {
    const colors = {
      [InterviewType.INDIVIDUAL]: 'bg-blue-100 text-blue-800',
      [InterviewType.FAMILY]: 'bg-green-100 text-green-800',
      [InterviewType.PSYCHOLOGICAL]: 'bg-purple-100 text-purple-800',
      [InterviewType.ACADEMIC]: 'bg-yellow-100 text-yellow-800',
      [InterviewType.BEHAVIORAL]: 'bg-pink-100 text-pink-800'
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[type]}`}>
        {INTERVIEW_TYPE_LABELS[type]}
      </span>
    );
  };

  const getModeIcon = (mode: InterviewMode, location?: string, virtualLink?: string) => {
    switch (mode) {
      case InterviewMode.IN_PERSON:
        return (
          <div className="flex items-center text-sm text-gray-600">
            <FiMapPin className="w-4 h-4 mr-1" />
            <span className="truncate" title={location}>
              {location || 'Presencial'}
            </span>
          </div>
        );
      case InterviewMode.VIRTUAL:
        return (
          <div className="flex items-center text-sm text-gray-600">
            <FiVideo className="w-4 h-4 mr-1" />
            <span>Virtual</span>
          </div>
        );
      case InterviewMode.HYBRID:
        return (
          <div className="flex items-center text-sm text-gray-600">
            <FiUser className="w-4 h-4 mr-1" />
            <span>Híbrida</span>
          </div>
        );
      default:
        return null;
    }
  };

  const getResultBadge = (result?: InterviewResult) => {
    if (!result) return null;
    
    const variant = InterviewUtils.getResultColor(result);
    return (
      <Badge variant={variant} className="text-xs">
        {INTERVIEW_RESULT_LABELS[result]}
      </Badge>
    );
  };

  const formatDateTime = (date: string, time: string) => {
    // NO usar new Date() para evitar problemas de zona horaria
    // date viene como "2024-11-03", time como "14:00:00"
    const [year, month, day] = date.split('-');
    const [hour, minute] = time.split(':');

    // Crear fecha en zona horaria local explícitamente
    const dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute));

    return {
      date: dateObj.toLocaleDateString('es-CL', {
        day: '2-digit',
        month: '2-digit'
      }),
      time: dateObj.toLocaleTimeString('es-CL', {
        hour: '2-digit',
        minute: '2-digit'
      }),
      dayName: dateObj.toLocaleDateString('es-CL', {
        weekday: 'short'
      })
    };
  };

  const canCompleteInterview = (interview: Interview): boolean => {
    return interview.status === InterviewStatus.IN_PROGRESS || 
           interview.status === InterviewStatus.CONFIRMED;
  };

  const canEditInterview = (interview: Interview): boolean => {
    return interview.status !== InterviewStatus.COMPLETED && 
           interview.status !== InterviewStatus.CANCELLED;
  };

  const canCancelInterview = (interview: Interview): boolean => {
    return interview.status === InterviewStatus.SCHEDULED || 
           interview.status === InterviewStatus.CONFIRMED;
  };

  const isUpcoming = (interview: Interview): boolean => {
    return InterviewUtils.isUpcoming(interview.scheduledDate, interview.scheduledTime);
  };

  const isOverdue = (interview: Interview): boolean => {
    return InterviewUtils.isOverdue(interview.scheduledDate, interview.scheduledTime, interview.status);
  };

  if (interviews.length === 0 && !isLoading) {
    return (
      <div className="text-center py-12">
        <CalendarIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No hay entrevistas programadas
        </h3>
        <p className="text-gray-500">
          Las entrevistas programadas aparecerán aquí.
        </p>
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
          placeholder="Buscar por estudiante, entrevistador, estado o tipo…"
          className="w-full pl-9 pr-9 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-azul-monte-tabor focus:border-transparent"
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Hint instructivo */}
      {selectedId === null && interviews.length > 0 && (
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
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Fecha y Hora</th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Tipo</th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Entrevistador</th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Estado</th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Resultado</th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide" style={{ minWidth: 200 }}>Acciones</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {paged.map((interview) => {
              const isSelected = selectedId === interview.id;
              const dateTime = formatDateTime(interview.scheduledDate, interview.scheduledTime);
              const upcoming = isUpcoming(interview);
              const overdue = isOverdue(interview);

              return (
                <tr
                  key={interview.id}
                  onClick={() => setSelectedId(prev => prev === interview.id ? null : interview.id)}
                  className={`transition-colors cursor-pointer group ${
                    isSelected ? 'bg-blue-50' :
                    upcoming ? 'bg-blue-50/40 hover:bg-blue-50' :
                    overdue ? 'bg-red-50/40 hover:bg-red-50' :
                    'hover:bg-gray-50'
                  }`}
                >
                  {/* Indicador lateral */}
                  <td className="px-3 py-3">
                    <div className={`w-1.5 h-8 rounded-full transition-all duration-300 ${
                      isSelected ? 'bg-azul-monte-tabor' : 'bg-transparent group-hover:bg-gray-200'
                    }`} />
                  </td>

                  {/* Estudiante */}
                  <td className="px-4 py-3">
                    <div className={`text-sm font-medium transition-colors duration-300 ${isSelected ? 'text-azul-monte-tabor' : 'text-gray-900'}`}>
                      {interview.studentName}
                    </div>
                    <div className="text-xs text-gray-500">{interview.gradeApplied}</div>
                    <div className="text-xs text-gray-400 hidden md:block">{interview.parentNames}</div>
                  </td>

                  {/* Fecha y Hora */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <FiCalendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <div>
                        <div className="text-sm text-gray-900">{dateTime.dayName} {dateTime.date}</div>
                        <div className="text-xs text-gray-500 flex items-center gap-1">
                          <FiClock className="w-3 h-3" />
                          {dateTime.time}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Tipo — oculto en móvil */}
                  <td className="px-4 py-3 whitespace-nowrap hidden md:table-cell">
                    {getTypeBadge(interview.type)}
                  </td>

                  {/* Entrevistador — oculto en tablet */}
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <div className="flex items-start gap-1.5">
                      <FiUser className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />
                      <div className="text-sm text-gray-900">
                        <div className="truncate max-w-[140px]">{interview.interviewerName}</div>
                        {interview.secondInterviewerName && (
                          <div className="text-xs text-gray-500 truncate max-w-[140px]">& {interview.secondInterviewerName}</div>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Estado */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex flex-col gap-0.5">
                      {getStatusBadge(interview.status)}
                      {upcoming && <span className="text-xs text-blue-600 font-medium">Próximamente</span>}
                      {overdue && <span className="text-xs text-red-600 font-medium">Vencida</span>}
                    </div>
                  </td>

                  {/* Resultado — oculto en móvil */}
                  <td className="px-4 py-3 whitespace-nowrap hidden md:table-cell">
                    <div className="flex flex-col gap-0.5">
                      {getResultBadge(interview.result)}
                      {interview.score && (
                        <span className="text-xs text-gray-500">{interview.score}/10</span>
                      )}
                    </div>
                  </td>

                  {/* Acciones — cross-fade */}
                  <td className="px-4 py-3 relative overflow-hidden" style={{ minWidth: 200 }}>
                    {/* Placeholder fecha cuando no seleccionado */}
                    <div
                      className="absolute inset-y-0 left-4 right-4 flex items-center transition-all duration-300"
                      style={{
                        opacity: isSelected ? 0 : 1,
                        transform: isSelected ? 'translateX(-10px)' : 'translateX(0)',
                        pointerEvents: isSelected ? 'none' : 'auto'
                      }}
                    >
                      <span className="text-xs text-gray-400">Selecciona para acciones</span>
                    </div>

                    {/* Botones — aparecen al seleccionar */}
                    <div
                      className="absolute inset-y-0 left-2 right-2 flex items-center gap-1.5 transition-all duration-300"
                      style={{
                        opacity: isSelected ? 1 : 0,
                        transform: isSelected ? 'translateX(0)' : 'translateX(10px)',
                        pointerEvents: isSelected ? 'auto' : 'none'
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* Ver */}
                      <Tip label="Ver detalles">
                        <button
                          onClick={() => onView(interview)}
                          className="flex items-center justify-center w-8 h-8 rounded-xl bg-azul-monte-tabor text-white hover:bg-blue-700 transition-colors shadow-sm shrink-0"
                        >
                          <FiEye className="w-3.5 h-3.5" />
                        </button>
                      </Tip>

                      {/* Editar */}
                      {canEditInterview(interview) && (
                        <Tip label="Editar">
                          <button
                            onClick={() => onEdit(interview)}
                            className="flex items-center justify-center w-8 h-8 rounded-xl border-2 border-blue-300 text-blue-600 hover:bg-blue-50 transition-colors shrink-0"
                          >
                            <FiEdit className="w-3.5 h-3.5" />
                          </button>
                        </Tip>
                      )}

                      {/* Reprogramar */}
                      {canEditInterview(interview) && (
                        <Tip label="Reprogramar">
                          <button
                            onClick={() => onReschedule(interview)}
                            className="flex items-center justify-center w-8 h-8 rounded-xl border-2 border-indigo-300 text-indigo-600 hover:bg-indigo-50 transition-colors shrink-0"
                          >
                            <FiRefreshCw className="w-3.5 h-3.5" />
                          </button>
                        </Tip>
                      )}

                      {/* Completar */}
                      {canCompleteInterview(interview) && (
                        <Tip label="Completar entrevista">
                          <button
                            onClick={() => onComplete(interview)}
                            className="flex items-center justify-center w-8 h-8 rounded-xl border-2 border-green-400 text-green-600 hover:bg-green-50 transition-colors shrink-0"
                          >
                            <FiCheck className="w-3.5 h-3.5" />
                          </button>
                        </Tip>
                      )}

                      {/* Notificación */}
                      {onSendNotification && (
                        <Tip label="Enviar notificación">
                          <button
                            onClick={() => onSendNotification!(interview, 'scheduled')}
                            className="flex items-center justify-center w-8 h-8 rounded-xl border-2 border-sky-300 text-sky-600 hover:bg-sky-50 transition-colors shrink-0"
                          >
                            <FiMail className="w-3.5 h-3.5" />
                          </button>
                        </Tip>
                      )}

                      {/* Cancelar */}
                      {canCancelInterview(interview) && (
                        <Tip label="Cancelar entrevista">
                          <button
                            onClick={() => onCancel(interview)}
                            className="flex items-center justify-center w-8 h-8 rounded-xl border-2 border-red-300 text-red-500 hover:bg-red-50 transition-colors shrink-0"
                          >
                            <FiX className="w-3.5 h-3.5" />
                          </button>
                        </Tip>
                      )}

                      {/* Eliminar (solo canceladas) */}
                      {interview.status === InterviewStatus.CANCELLED && (
                        <Tip label="Eliminar permanentemente">
                          <button
                            onClick={() => handleDelete(interview)}
                            disabled={deletingId === interview.id}
                            className="flex items-center justify-center w-8 h-8 rounded-xl border-2 border-red-400 text-red-700 hover:bg-red-100 transition-colors shrink-0 disabled:opacity-50"
                          >
                            {deletingId === interview.id
                              ? <FiRefreshCw className="w-3.5 h-3.5 animate-spin" />
                              : <FiTrash2 className="w-3.5 h-3.5" />
                            }
                          </button>
                        </Tip>
                      )}

                      {/* Deseleccionar */}
                      <Tip label="Deseleccionar">
                        <button
                          onClick={(e) => { e.stopPropagation(); setSelectedId(null); }}
                          className="flex items-center justify-center w-7 h-7 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors ml-auto shrink-0"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </Tip>
                    </div>

                    {/* Spacer invisible para mantener alto */}
                    <div className="invisible flex items-center gap-1.5">
                      <span className="w-8 h-8" /><span className="w-8 h-8" /><span className="w-8 h-8" />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {isLoading && (
        <div className="flex justify-center items-center py-8">
          <div className="flex items-center space-x-2">
            <FiRefreshCw className="w-5 h-5 animate-spin text-azul-monte-tabor" />
            <span className="text-gray-600">Cargando entrevistas...</span>
          </div>
        </div>
      )}

      {/* Footer: contador + selector + paginación */}
      <div className="flex flex-wrap items-center justify-between gap-3 mt-3 px-1">
        <span className="text-xs text-gray-400">
          {Math.min((currentPage - 1) * pageSize + 1, interviews.length)}–{Math.min(currentPage * pageSize, interviews.length)} de {interviews.length} entrevistas
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

      <ConfirmDialog
        isOpen={!!confirmDelete}
        title="Cancelar entrevista"
        message="¿Está seguro que desea cancelar esta entrevista? Esta acción marcará la entrevista como cancelada."
        confirmText="Sí, cancelar"
        cancelText="Volver"
        variant="danger"
        isLoading={deletingId !== null}
        onConfirm={performDelete}
        onClose={() => setConfirmDelete(null)}
      />

      {toast && (
        <SimpleToast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
};

export default InterviewTable;
