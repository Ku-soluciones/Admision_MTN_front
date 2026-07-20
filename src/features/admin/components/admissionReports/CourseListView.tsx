import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FiChevronLeft, FiChevronRight, FiDownload, FiEye, FiSearch, FiX } from 'react-icons/fi';
import type { CourseApplicant } from '../../../../packages/shared-ui/src/src/api/dashboard.types';
import {
  formatGenderLabel,
  formatGradeLabel,
  requiresAction,
  safeDisplayText,
  statusTone
} from './admissionReportUtils';

interface CourseListViewProps {
  id?: string;
  rows: CourseApplicant[];
  loading: boolean;
  academicYear: number;
  gradeFilter: string;
  statusFilter: string;
  needsActionOnly: boolean;
  onGradeFilterChange: (grade: string) => void;
  onStatusFilterChange: (status: string) => void;
  onClearOperationalFilters: () => void;
  onOpenCard: (applicationId: number) => void;
}

export const CourseListView: React.FC<CourseListViewProps> = ({
  id,
  rows,
  loading,
  academicYear,
  gradeFilter,
  statusFilter,
  needsActionOnly,
  onGradeFilterChange,
  onStatusFilterChange,
  onClearOperationalFilters,
  onOpenCard
}) => {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState('');
  const pageSize = 25;

  const grades = useMemo(
    () => Array.from(new Set(rows.map((row) => row.gradeApplied))).sort((a, b) => formatGradeLabel(a).localeCompare(formatGradeLabel(b), 'es')),
    [rows]
  );
  const statuses = useMemo(
    () => Array.from(new Set(rows.map((row) => row.statusLabel))).sort((a, b) => a.localeCompare(b, 'es')),
    [rows]
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('es');
    return rows.filter((row) => {
      const matchesSearch = !term ||
        row.studentName.toLocaleLowerCase('es').includes(term) ||
        formatGradeLabel(row.gradeApplied).toLocaleLowerCase('es').includes(term) ||
        String(row.applicationId).includes(term);
      const matchesGrade = !gradeFilter || row.gradeApplied === gradeFilter;
      const matchesStatus = !statusFilter || row.statusLabel === statusFilter;
      const matchesAction = !needsActionOnly || requiresAction(row);
      return matchesSearch && matchesGrade && matchesStatus && matchesAction;
    });
  }, [rows, search, gradeFilter, statusFilter, needsActionOnly]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paged = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, safePage]);

  useEffect(() => {
    setPage(1);
  }, [rows, search, gradeFilter, statusFilter, needsActionOnly]);

  const hasFilters = Boolean(search || gradeFilter || statusFilter || needsActionOnly);

  const clearAllFilters = useCallback(() => {
    setSearch('');
    setPage(1);
    onClearOperationalFilters();
  }, [onClearOperationalFilters]);

  const exportToExcel = useCallback(async () => {
    if (!filtered.length || exporting) return;
    setExporting(true);
    setExportMessage('');
    try {
      const XLSX = await import('xlsx');
      const data = filtered.map((row) => ({
        Curso: formatGradeLabel(row.gradeApplied),
        Postulante: row.studentName,
        Género: formatGenderLabel(row.gender),
        'Vía de postulación': safeDisplayText(row.admissionPreference),
        'Hijo/a de exalumno': safeDisplayText(row.alumniChild),
        'Hermanos en el colegio': safeDisplayText(row.siblingsInSchool),
        'Promedio exámenes (%)': row.examAverage ?? '',
        'Decisión dirección de ciclo': safeDisplayText(row.cycleDirectorDecision, 'Pendiente'),
        Estado: row.statusLabel
      }));
      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, `Admisión ${academicYear}`);
      XLSX.writeFile(workbook, `admision_${academicYear}_${filtered.length}_postulantes.xlsx`);
      setExportMessage(`Se exportaron ${filtered.length} postulantes.`);
    } catch {
      setExportMessage('No se pudo generar el archivo. Intenta nuevamente.');
    } finally {
      setExporting(false);
    }
  }, [academicYear, exporting, filtered]);

  return (
    <section id={id} className="scroll-mt-4 overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-sm" aria-labelledby="admission-list-title">
      <div className="border-b border-slate-200 p-4 sm:p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="flex items-baseline gap-2">
              <h2 id="admission-list-title" className="text-xl font-bold tracking-tight text-slate-950">Listado por curso</h2>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold tabular-nums text-slate-700" aria-live="polite">{filtered.length} de {rows.length}</span>
            </div>
            <p className="mt-1 text-sm text-slate-600">Busca un postulante, ajusta los filtros o abre su ficha completa.</p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <label className="relative min-w-0 flex-1 sm:w-64 sm:flex-none">
              <span className="sr-only">Buscar postulante</span>
              <FiSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Nombre, curso o ID"
                className="min-h-11 w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
              />
            </label>
            <select
              value={gradeFilter}
              onChange={(event) => onGradeFilterChange(event.target.value)}
              className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-800 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
              aria-label="Filtrar por curso"
            >
              <option value="">Todos los cursos</option>
              {grades.map((grade) => <option key={grade} value={grade}>{formatGradeLabel(grade)}</option>)}
            </select>
            <select
              value={statusFilter}
              onChange={(event) => onStatusFilterChange(event.target.value)}
              className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-800 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
              aria-label="Filtrar por estado"
            >
              <option value="">Todos los estados</option>
              {statuses.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
            <button
              type="button"
              onClick={exportToExcel}
              disabled={!filtered.length || loading || exporting}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-900 px-4 text-sm font-semibold text-white transition-[background-color,transform] duration-150 ease-out hover:bg-blue-950 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
              aria-label={`Exportar ${filtered.length} postulantes a Excel`}
            >
              <FiDownload className="h-4 w-4" aria-hidden="true" />
              {exporting ? 'Generando…' : `Exportar ${filtered.length}`}
            </button>
          </div>
        </div>

        {hasFilters && (
          <div className="mt-3 flex flex-wrap items-center gap-2" aria-label="Filtros activos">
            {needsActionOnly && <FilterChip label="Requieren acción" />}
            {gradeFilter && <FilterChip label={formatGradeLabel(gradeFilter)} />}
            {statusFilter && <FilterChip label={statusFilter} />}
            {search && <FilterChip label={`Búsqueda: ${search}`} />}
            <button type="button" onClick={clearAllFilters} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600">
              <FiX className="h-4 w-4" aria-hidden="true" />
              Limpiar filtros
            </button>
          </div>
        )}
        <p className="sr-only" aria-live="polite">{exportMessage}</p>
      </div>

      {loading && rows.length > 0 && (
        <div className="border-b border-blue-100 bg-blue-50 px-4 py-2 text-xs font-medium text-blue-800" role="status">Actualizando datos…</div>
      )}

      {filtered.length === 0 ? (
        <EmptyFilteredState hasFilters={hasFilters} onClear={clearAllFilters} />
      ) : (
        <>
          <div className="divide-y divide-slate-200 md:hidden">
            {paged.map((row) => <ApplicantMobileCard key={row.applicationId} row={row} onOpenCard={onOpenCard} />)}
          </div>

          <div className="hidden overflow-auto md:block md:max-h-[min(68vh,760px)]">
            <table className="min-w-full text-sm">
              <caption className="sr-only">Postulantes del proceso de admisión {academicYear}</caption>
              <thead className="sticky top-0 z-10 bg-slate-100 shadow-[0_1px_0_0_rgb(203_213_225)]">
                <tr>
                  <TableHeader>Postulante</TableHeader>
                  <TableHeader>Curso</TableHeader>
                  <TableHeader>Estado</TableHeader>
                  <TableHeader>Antecedentes</TableHeader>
                  <TableHeader>Evaluación</TableHeader>
                  <TableHeader align="right">Acción</TableHeader>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paged.map((row) => {
                  const tone = statusTone(row.statusLabel);
                  return (
                    <tr key={row.applicationId} className="bg-white hover:bg-slate-50">
                      <td className="px-3 py-3.5">
                        <span className="block font-semibold text-slate-950">{row.studentName}</span>
                        <span className="mt-0.5 block text-xs text-slate-500">Género: {formatGenderLabel(row.gender)}</span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3.5 text-slate-700">{formatGradeLabel(row.gradeApplied)}</td>
                      <td className="whitespace-nowrap px-3 py-3.5">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset ${tone.badge}`}>{row.statusLabel}</span>
                      </td>
                      <td className="min-w-52 px-3 py-3.5 text-xs leading-5 text-slate-600">
                        <span className="block"><strong className="font-semibold text-slate-700">Vía:</strong> {safeDisplayText(row.admissionPreference)}</span>
                        <span className="block"><strong className="font-semibold text-slate-700">Exalumno:</strong> {safeDisplayText(row.alumniChild)}</span>
                        <span className="block"><strong className="font-semibold text-slate-700">Hermanos:</strong> {safeDisplayText(row.siblingsInSchool)}</span>
                      </td>
                      <td className="min-w-44 px-3 py-3.5 text-xs leading-5 text-slate-600">
                        <span className="block"><strong className="font-semibold text-slate-700">Promedio:</strong> {row.examAverage != null ? `${row.examAverage}%` : 'Sin registro'}</span>
                        <span className="block"><strong className="font-semibold text-slate-700">Decisión:</strong> {safeDisplayText(row.cycleDirectorDecision, 'Pendiente')}</span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3.5 text-right">
                        <OpenCardButton row={row} onOpenCard={onOpenCard} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <nav className="flex items-center justify-between border-t border-slate-200 px-4 py-3" aria-label="Paginación del listado">
              <button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={safePage === 1} className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-slate-300 px-3 text-sm font-semibold text-slate-700 disabled:opacity-40">
                <FiChevronLeft className="h-4 w-4" aria-hidden="true" />Anterior
              </button>
              <span className="text-sm text-slate-600">Página {safePage} de {totalPages}</span>
              <button type="button" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={safePage === totalPages} className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-slate-300 px-3 text-sm font-semibold text-slate-700 disabled:opacity-40">
                Siguiente<FiChevronRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </nav>
          )}
        </>
      )}
    </section>
  );
};

const ApplicantMobileCard: React.FC<{ row: CourseApplicant; onOpenCard: (applicationId: number) => void }> = ({ row, onOpenCard }) => {
  const tone = statusTone(row.statusLabel);
  return (
    <article className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-bold text-slate-950">{row.studentName}</h3>
          <p className="mt-1 text-sm text-slate-500">{formatGradeLabel(row.gradeApplied)} · {safeDisplayText(row.admissionPreference)}</p>
        </div>
        <span className={`inline-flex flex-none rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset ${tone.badge}`}>{row.statusLabel}</span>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-4 border-y border-slate-200 py-3 text-sm">
        <div>
          <dt className="text-xs font-medium text-slate-500">Género</dt>
          <dd className="mt-0.5 font-semibold text-slate-800">{formatGenderLabel(row.gender)}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-slate-500">Promedio</dt>
          <dd className="mt-0.5 font-semibold text-slate-800">{row.examAverage != null ? `${row.examAverage}%` : 'Sin registro'}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-slate-500">Decisión</dt>
          <dd className="mt-0.5 font-semibold text-slate-800">{safeDisplayText(row.cycleDirectorDecision, 'Pendiente')}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-slate-500">Hijo/a de exalumno</dt>
          <dd className="mt-0.5 font-semibold text-slate-800">{safeDisplayText(row.alumniChild)}</dd>
        </div>
        <div className="col-span-2">
          <dt className="text-xs font-medium text-slate-500">Hermanos en el colegio</dt>
          <dd className="mt-0.5 font-semibold text-slate-800">{safeDisplayText(row.siblingsInSchool)}</dd>
        </div>
      </dl>
      <OpenCardButton row={row} onOpenCard={onOpenCard} fullWidth />
    </article>
  );
};

const OpenCardButton: React.FC<{ row: CourseApplicant; onOpenCard: (applicationId: number) => void; fullWidth?: boolean }> = ({ row, onOpenCard, fullWidth }) => (
  <button
    type="button"
    onClick={() => onOpenCard(row.applicationId)}
    className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-lg font-semibold text-blue-800 transition-[background-color,transform] duration-150 ease-out hover:bg-blue-50 active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 ${fullWidth ? 'mt-3 w-full border border-blue-200' : 'px-3'}`}
    aria-label={`Ver ficha de ${row.studentName}`}
  >
    <FiEye className="h-4 w-4" aria-hidden="true" />
    Ver ficha
  </button>
);

const TableHeader: React.FC<{ children: React.ReactNode; align?: 'left' | 'right' }> = ({ children, align = 'left' }) => (
  <th scope="col" className={`whitespace-nowrap px-3 py-3 text-xs font-bold uppercase tracking-wide text-slate-600 ${align === 'right' ? 'text-right' : 'text-left'}`}>{children}</th>
);

const FilterChip: React.FC<{ label: string }> = ({ label }) => (
  <span className="inline-flex min-h-8 items-center rounded-full bg-blue-50 px-3 text-xs font-bold text-blue-800 ring-1 ring-inset ring-blue-700/10">{label}</span>
);

const EmptyFilteredState: React.FC<{ hasFilters: boolean; onClear: () => void }> = ({ hasFilters, onClear }) => (
  <div className="px-5 py-12 text-center">
    <FiSearch className="mx-auto h-8 w-8 text-slate-300" aria-hidden="true" />
    <h3 className="mt-3 font-bold text-slate-950">No encontramos coincidencias</h3>
    <p className="mt-1 text-sm text-slate-500">Prueba con otros filtros o una búsqueda más breve.</p>
    {hasFilters && <button type="button" onClick={onClear} className="mt-4 text-sm font-semibold text-blue-800 hover:underline">Limpiar filtros</button>}
  </div>
);
