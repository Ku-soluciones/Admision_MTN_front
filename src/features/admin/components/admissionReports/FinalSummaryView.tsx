import { applicationStatusPolicy } from '../../../../packages/shared-ui/src/utils/applicationStatusPolicy';
import React, { useCallback, useEffect, useId, useMemo, useState } from 'react';
import {
  FiAlertCircle,
  FiChevronDown,
  FiChevronUp,
  FiDownload,
  FiEye,
  FiRefreshCw,
  FiSearch,
  FiUsers,
} from 'react-icons/fi';
import type { FinalDecision, FinalSummaryApplicant, FinalSummaryExamDetail } from '../../../../packages/shared-ui/src/src/api/dashboard.types';
import ConfirmDialog from '../../../../packages/shared-ui/src/components/ui/ConfirmDialog';
import Modal from '../../../../packages/shared-ui/src/components/ui/Modal';
import { formatGradeLabel, safeDisplayText } from './admissionReportUtils';
import { useFinalSummary } from './useFinalSummary';

interface FinalSummaryViewProps {
  academicYear: number;
  processCode?: string;
  onOpenCard: (applicationId: number) => void;
}

const DECISIONS: Array<{ value: FinalDecision; label: string }> = [
  { value: 'APPROVED', label: 'Aceptado' },
  { value: 'WAITLIST', label: 'Lista de espera' },
  { value: 'REJECTED', label: 'No seleccionado' }
];

const FAMILY_TONES = [
  'bg-amber-100 text-amber-950 ring-amber-300',
  'bg-cyan-100 text-cyan-950 ring-cyan-300',
  'bg-fuchsia-100 text-fuchsia-950 ring-fuchsia-300',
  'bg-lime-100 text-lime-950 ring-lime-300',
  'bg-orange-100 text-orange-950 ring-orange-300',
  'bg-violet-100 text-violet-950 ring-violet-300',
  'bg-rose-100 text-rose-950 ring-rose-300',
  'bg-sky-100 text-sky-950 ring-sky-300'
];

const needsReview = (row: FinalSummaryApplicant) => (
  row.familyEvaluation.rating == null ||
  row.exams.language == null ||
  row.exams.mathematics == null ||
  row.exams.english == null ||
  !row.cycleDirector.recommendation ||
  row.cycleDirector.recommendation === 'Pendiente'
);

const formatExportDate = (value?: string | null) => {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(parsed);
};

const joinExamComments = (detail?: FinalSummaryExamDetail | null) => {
  if (!detail) return '';
  const parts = [
    detail.observations,
    detail.strengths,
    detail.areasForImprovement,
    detail.recommendations
  ].filter(Boolean);
  return parts.join('\n\n');
};

const commentCount = (detail?: FinalSummaryExamDetail | null) => [
  detail?.observations,
  detail?.strengths,
  detail?.areasForImprovement,
  detail?.recommendations
].filter(Boolean).length;

const examDetailRows = (row: FinalSummaryApplicant) => ([
  { subject: 'Lenguaje', score: row.exams.language, detail: row.examDetails?.language },
  { subject: 'Matemáticas', score: row.exams.mathematics, detail: row.examDetails?.mathematics },
  { subject: 'Inglés', score: row.exams.english, detail: row.examDetails?.english }
].map((exam) => ({
  Curso: formatGradeLabel(row.gradeApplied),
  Postulante: row.studentName,
  Asignatura: exam.subject,
  'Fecha examen': formatExportDate(exam.detail?.date),
  'Puntaje (%)': exam.score ?? '',
  Observaciones: exam.detail?.observations ?? '',
  Fortalezas: exam.detail?.strengths ?? '',
  'Áreas por mejorar': exam.detail?.areasForImprovement ?? '',
  Recomendaciones: exam.detail?.recommendations ?? '',
  'Total comentarios': commentCount(exam.detail)
}))).filter((exam) => (
  exam['Fecha examen'] ||
  exam['Puntaje (%)'] !== '' ||
  exam.Observaciones ||
  exam.Fortalezas ||
  exam['Áreas por mejorar'] ||
  exam.Recomendaciones
));

export const FinalSummaryView: React.FC<FinalSummaryViewProps> = ({ academicYear, processCode, onOpenCard }) => {
  const { rows, meta, loading, error, savingId, refresh, updateDecision } = useFinalSummary(academicYear, processCode);
  const [search, setSearch] = useState('');
  const [grade, setGrade] = useState('');
  const [decision, setDecision] = useState('');
  const [incompleteOnly, setIncompleteOnly] = useState(false);
  const [pendingDecision, setPendingDecision] = useState<{ row: FinalSummaryApplicant; decision: FinalDecision } | null>(null);
  const [reportApplicant, setReportApplicant] = useState<FinalSummaryApplicant | null>(null);
  const [feedback, setFeedback] = useState('');
  const [exporting, setExporting] = useState(false);
  const [nameSort, setNameSort] = useState<'asc' | 'desc' | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const grades = useMemo(() => Array.from(new Set(rows.map((row) => row.gradeApplied))), [rows]);
  const filteredRows = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('es');
    const result = rows.filter((row) => (
      (!term || row.studentName.toLocaleLowerCase('es').includes(term) || row.siblingNames.some((name) => name.toLocaleLowerCase('es').includes(term))) &&
      (!grade || row.gradeApplied === grade) &&
      (!decision || (decision === 'PENDING' ? !DECISIONS.some((item) => item.value === row.status) : row.status === decision)) &&
      (!incompleteOnly || needsReview(row))
    ));
    if (nameSort) {
      result.sort((a, b) => a.studentName.localeCompare(b.studentName, 'es') * (nameSort === 'asc' ? 1 : -1));
    }
    return result;
  }, [decision, grade, incompleteOnly, nameSort, rows, search]);

  const toggleNameSort = useCallback(() => {
    setNameSort((current) => (current === 'asc' ? 'desc' : current === 'desc' ? null : 'asc'));
  }, []);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pagedRows = useMemo(
    () => filteredRows.slice((safePage - 1) * pageSize, safePage * pageSize),
    [filteredRows, safePage]
  );

  useEffect(() => {
    setPage(1);
  }, [search, grade, decision, incompleteOnly, nameSort]);

  const stats = useMemo(() => rows.reduce((result, row) => {
    result.total += 1;
    if (row.status === 'APPROVED') result.approved += 1;
    else if (row.status === 'REJECTED') result.rejected += 1;
    else if (row.status === 'WAITLIST') result.waitlist += 1;
    else result.pending += 1;
    if (needsReview(row)) result.incomplete += 1;
    return result;
  }, { total: 0, approved: 0, rejected: 0, waitlist: 0, pending: 0, incomplete: 0 }), [rows]);

  const confirmDecision = useCallback(async () => {
    if (!pendingDecision) return;
    setFeedback('');
    try {
      const message = await updateDecision(pendingDecision.row.applicationId, pendingDecision.decision);
      setFeedback(message);
      setPendingDecision(null);
    } catch (err) {
      setPendingDecision(null);
      setFeedback(err instanceof Error ? err.message : 'No se pudo actualizar la decisión');
    }
  }, [pendingDecision, updateDecision]);

  const exportToExcel = useCallback(async () => {
    if (!filteredRows.length || exporting) return;
    setExporting(true);
    try {
      const XLSX = await import('xlsx');
      const generatedAt = new Intl.DateTimeFormat('es-CL', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(new Date());

      const summaryHeaders = [
        'Curso',
        'Postulante',
        'Hermanos',
        'Familia (%)',
        'Familia /40',
        'Observación /11',
        'Familia 1–5',
        'Lenguaje',
        'Fecha Lenguaje',
        'Comentarios Lenguaje',
        'Matemáticas',
        'Fecha Matemáticas',
        'Comentarios Matemáticas',
        'Inglés',
        'Fecha Inglés',
        'Comentarios Inglés',
        'Recomendación del director de ciclo',
        'Fortalezas',
        'Dificultades',
        'Adaptación a la entrevista',
        'Rasgos destacados',
        'Contexto familiar',
        'Antecedentes académicos',
        'Curso de ingreso',
        'Director/a responsable',
        'Decisión final',
        'Comentario familiar'
      ];

      const summaryRows = filteredRows.map((row) => ({
        Curso: formatGradeLabel(row.gradeApplied),
        Postulante: row.studentName,
        Hermanos: row.siblingNames.join(', '),
        'Familia (%)': row.familyEvaluation.percentage ?? '',
        'Familia /40': row.familyEvaluation.score40 ?? '',
        'Observación /11': row.familyEvaluation.score11 ?? '',
        'Familia 1–5': row.familyEvaluation.rating ?? '',
        Lenguaje: row.exams.language ?? '',
        'Fecha Lenguaje': formatExportDate(row.examDetails?.language?.date),
        'Comentarios Lenguaje': commentCount(row.examDetails?.language) ? 'Ver comentarios' : '',
        Matemáticas: row.exams.mathematics ?? '',
        'Fecha Matemáticas': formatExportDate(row.examDetails?.mathematics?.date),
        'Comentarios Matemáticas': commentCount(row.examDetails?.mathematics) ? 'Ver comentarios' : '',
        Inglés: row.exams.english ?? '',
        'Fecha Inglés': formatExportDate(row.examDetails?.english?.date),
        'Comentarios Inglés': commentCount(row.examDetails?.english) ? 'Ver comentarios' : '',
        'Recomendación del director de ciclo': row.cycleDirector.recommendation ?? '',
        'Fortalezas': row.cycleDirector.strengths ?? '',
        'Dificultades': row.cycleDirector.difficulties ?? '',
        'Adaptación a la entrevista': row.cycleDirector.interviewAdaptation ?? '',
        'Rasgos destacados': row.cycleDirector.outstandingTraits ?? '',
        'Contexto familiar': row.cycleDirector.familyBackground ?? '',
        'Antecedentes académicos': row.cycleDirector.academicBackground ?? '',
        'Curso de ingreso': row.cycleDirector.entryCourse ?? '',
        'Director/a responsable': row.cycleDirector.evaluator ?? '',
        'Decisión final': row.statusLabel,
        'Comentario familiar': row.familyEvaluation.justification ?? ''
      }));

      const commentHeaders = [
        'Curso',
        'Postulante',
        'Asignatura',
        'Fecha examen',
        'Puntaje (%)',
        'Observaciones',
        'Fortalezas',
        'Áreas por mejorar',
        'Recomendaciones',
        'Total comentarios',
        'Volver'
      ];
      const commentRows = filteredRows.flatMap((row, index) => examDetailRows(row).map((exam) => ({
        ...exam,
        Volver: 'Volver al resumen',
        __applicationId: row.applicationId,
        __subject: exam.Asignatura,
        __summaryRowNumber: index + 5
      })));
      const commentRowByApplicantAndSubject = new Map<string, number>();
      commentRows.forEach((row, index) => {
        commentRowByApplicantAndSubject.set(`${row.__applicationId}-${row.__subject}`, index + 5);
      });

      const sheet = XLSX.utils.aoa_to_sheet([
        [`Resumen final admisión ${academicYear}`],
        [`Proceso: ${processCode || meta?.processCode || 'activo'} · Generado: ${generatedAt} · Postulantes: ${filteredRows.length}`],
        [],
        summaryHeaders,
        ...summaryRows.map((row) => summaryHeaders.map((header) => row[header as keyof typeof row] ?? ''))
      ]);
      sheet['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: summaryHeaders.length - 1 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: summaryHeaders.length - 1 } }
      ];
      sheet['!cols'] = [
        { wch: 16 }, { wch: 32 }, { wch: 28 }, { wch: 12 }, { wch: 12 }, { wch: 16 }, { wch: 12 },
        { wch: 12 }, { wch: 20 }, { wch: 20 }, { wch: 14 }, { wch: 22 }, { wch: 24 }, { wch: 12 }, { wch: 18 }, { wch: 20 },
        { wch: 32 }, { wch: 36 }, { wch: 36 }, { wch: 34 }, { wch: 34 }, { wch: 34 }, { wch: 34 },
        { wch: 18 }, { wch: 24 }, { wch: 18 }, { wch: 42 }
      ];
      sheet['!autofilter'] = { ref: `A4:${XLSX.utils.encode_col(summaryHeaders.length - 1)}${summaryRows.length + 4}` };
      sheet['!freeze'] = { xSplit: 0, ySplit: 4 };

      const summaryCommentColumns = [
        { header: 'Comentarios Lenguaje', subject: 'Lenguaje' },
        { header: 'Comentarios Matemáticas', subject: 'Matemáticas' },
        { header: 'Comentarios Inglés', subject: 'Inglés' }
      ];
      filteredRows.forEach((row, index) => {
        summaryCommentColumns.forEach(({ header, subject }) => {
          const targetRow = commentRowByApplicantAndSubject.get(`${row.applicationId}-${subject}`);
          if (!targetRow) return;
          const cellAddress = XLSX.utils.encode_cell({ r: index + 4, c: summaryHeaders.indexOf(header) });
          const cell = sheet[cellAddress];
          if (cell) {
            cell.l = {
              Target: `#'Comentarios examenes'!A${targetRow}`,
              Tooltip: `Ir a comentarios de ${subject}`
            };
          }
        });
      });

      const commentsSheet = XLSX.utils.aoa_to_sheet([
        [`Comentarios por asignatura ${academicYear}`],
        ['Una fila por postulante y asignatura. Estos comentarios no se muestran en pantalla; solo se exportan.'],
        [],
        commentHeaders,
        ...commentRows.map((row) => commentHeaders.map((header) => row[header as keyof typeof row] ?? ''))
      ]);
      commentsSheet['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: commentHeaders.length - 1 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: commentHeaders.length - 1 } }
      ];
      commentsSheet['!cols'] = [
        { wch: 16 },
        { wch: 32 },
        { wch: 16 },
        { wch: 20 },
        { wch: 12 },
        { wch: 46 },
        { wch: 46 },
        { wch: 46 },
        { wch: 46 },
        { wch: 16 },
        { wch: 18 }
      ];
      commentsSheet['!autofilter'] = { ref: `A4:${XLSX.utils.encode_col(commentHeaders.length - 1)}${commentRows.length + 4}` };
      commentsSheet['!freeze'] = { xSplit: 0, ySplit: 4 };
      commentRows.forEach((row, index) => {
        const cellAddress = XLSX.utils.encode_cell({ r: index + 4, c: commentHeaders.indexOf('Volver') });
        const cell = commentsSheet[cellAddress];
        if (cell) {
          cell.l = {
            Target: `#'Resumen final'!A${row.__summaryRowNumber}`,
            Tooltip: 'Volver a la fila del postulante en el resumen'
          };
        }
      });

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, sheet, 'Resumen final');
      XLSX.utils.book_append_sheet(workbook, commentsSheet, 'Comentarios examenes');
      XLSX.writeFile(workbook, `resumen_final_admision_${academicYear}.xlsx`);
    } finally {
      setExporting(false);
    }
  }, [academicYear, exporting, filteredRows, meta?.processCode, processCode]);

  if (loading && !rows.length) return <FinalSummarySkeleton />;
  if (error) return <FinalSummaryError message={error} onRetry={refresh} />;

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-6" aria-label="Indicadores del resumen final">
        <p className="mb-3 text-sm font-semibold text-slate-600">
          Proceso {academicYear} · {meta?.siblingFamilies || 0} familias con hermanos
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <SummaryMetric label="Postulantes" value={stats.total} tone="blue" />
          <SummaryMetric label="Aceptados" value={stats.approved} tone="emerald" />
          <SummaryMetric label="Lista de espera" value={stats.waitlist} tone="amber" />
          <SummaryMetric label="No aceptados" value={stats.rejected} tone="rose" />
          <SummaryMetric label="Pendientes" value={stats.pending} tone="sky" />
          <SummaryMetric label="Incompletos" value={stats.incomplete} tone="violet" />
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-6" aria-labelledby="final-summary-title">
        <div className="mb-3">
          <h2 id="final-summary-title" className="text-lg font-semibold text-slate-900">Resumen para decisión final</h2>
          <p className="mt-1 text-sm text-slate-600">Los colores identifican postulantes de una misma familia. Las decisiones guardadas aquí no envían correos.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="relative min-w-[240px] flex-1">
            <span className="sr-only">Buscar postulante o hermano</span>
            <FiSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar postulante o hermano" className="min-h-11 w-full rounded-lg border border-slate-300 pl-9 pr-3 text-sm focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-700/20" />
          </label>
          <label className="relative">
            <select value={grade} onChange={(event) => setGrade(event.target.value)} className="min-h-11 appearance-none rounded-lg border border-slate-300 bg-white py-2 pl-3 pr-8 text-sm text-slate-800 focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-700/20" aria-label="Filtrar por curso">
              <option value="">Todos los cursos</option>
              {grades.map((item) => <option key={item} value={item}>{formatGradeLabel(item)}</option>)}
            </select>
            <FiChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          </label>
          <label className="relative">
            <select value={decision} onChange={(event) => setDecision(event.target.value)} className="min-h-11 appearance-none rounded-lg border border-slate-300 bg-white py-2 pl-3 pr-8 text-sm text-slate-800 focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-700/20" aria-label="Filtrar por decisión final">
              <option value="">Todas las decisiones</option>
              <option value="PENDING">Pendientes</option>
              {DECISIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
            <FiChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          </label>
          <button type="button" onClick={() => setIncompleteOnly((current) => !current)} aria-pressed={incompleteOnly} className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-3 text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 ${incompleteOnly ? 'bg-amber-100 text-amber-950 ring-1 ring-inset ring-amber-300' : 'border border-slate-300 text-slate-700 hover:bg-slate-50'}`}>
            <FiAlertCircle className="h-4 w-4" aria-hidden="true" />
            Solo incompletos
          </button>
          <button type="button" onClick={refresh} disabled={loading} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-700">
            <FiRefreshCw className={`h-4 w-4 ${loading ? 'animate-spin motion-reduce:animate-none' : ''}`} aria-hidden="true" />
            Actualizar
          </button>
          <button type="button" onClick={exportToExcel} disabled={!filteredRows.length || exporting} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-blue-900 px-4 text-sm font-semibold text-white hover:bg-blue-950 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2">
            <FiDownload className="h-4 w-4" aria-hidden="true" />
            {exporting ? 'Generando…' : `Exportar ${filteredRows.length}`}
          </button>
        </div>

        {feedback && <p className="mt-3 rounded-lg bg-blue-50 px-3 py-2 text-sm font-medium text-blue-900" role="status">{feedback}</p>}

        {/* Total */}
        <div className="flex items-center justify-end px-1 pt-2 text-xs text-slate-500" aria-live="polite">
          <span>Total: {filteredRows.length}{filteredRows.length !== rows.length ? ` de ${rows.length}` : ''} postulante{filteredRows.length !== 1 ? 's' : ''}</span>
        </div>

        {filteredRows.length ? (
          <>
            <div className="mt-2 rounded-lg border border-slate-200 overflow-hidden xl:hidden">
              <div className="divide-y divide-slate-200">
                {pagedRows.map((row) => <FinalSummaryMobileRow key={row.applicationId} row={row} saving={savingId === row.applicationId} onOpenCard={onOpenCard} onOpenReport={setReportApplicant} onDecision={setPendingDecision} />)}
              </div>
              {totalPages > 1 && (
                <nav className="flex items-center justify-between border-t border-slate-200 bg-white px-4 py-3" aria-label="Paginación del listado">
                  <button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={safePage === 1} className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-slate-300 px-3 text-sm font-semibold text-slate-700 disabled:opacity-40">
                    ← Anterior
                  </button>
                  <span className="text-sm text-slate-600">Página {safePage} de {totalPages}</span>
                  <button type="button" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={safePage === totalPages} className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-slate-300 px-3 text-sm font-semibold text-slate-700 disabled:opacity-40">
                    Siguiente →
                  </button>
                </nav>
              )}
            </div>
            <div className="mt-2 hidden rounded-lg border border-slate-200 overflow-hidden xl:block">
              <table className="w-full table-fixed text-sm">
                <colgroup>
                  <col className="w-[22%]" />
                  <col className="w-[14%]" />
                  <col className="w-[12%]" />
                  <col className="w-[14%]" />
                  <col className="w-[21%]" />
                  <col className="w-[17%]" />
                </colgroup>
                <thead className="bg-slate-50">
                  <tr>
                    <th scope="col" className="break-words px-3 py-3.5 align-bottom text-xs font-bold uppercase leading-4 tracking-wide text-slate-600">
                      <button type="button" onClick={toggleNameSort} className="inline-flex items-center gap-1 uppercase hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-700">
                        Postulante
                        {nameSort === 'asc' ? <FiChevronUp className="h-3.5 w-3.5" aria-hidden="true" /> : <FiChevronDown className={`h-3.5 w-3.5 ${nameSort === 'desc' ? '' : 'opacity-40'}`} aria-hidden="true" />}
                      </button>
                    </th>
                    <HeaderCell>Familia</HeaderCell><HeaderCell>Entrevista</HeaderCell><HeaderCell align="center">Pruebas</HeaderCell><HeaderCell align="center">Recomendación del director de ciclo</HeaderCell><HeaderCell align="center">Decisión y ficha</HeaderCell>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pagedRows.map((row) => <FinalSummaryDesktopRow key={row.applicationId} row={row} saving={savingId === row.applicationId} onOpenCard={onOpenCard} onOpenReport={setReportApplicant} onDecision={setPendingDecision} />)}
                </tbody>
              </table>

              {totalPages > 1 && (
                <nav className="flex items-center justify-between border-t border-slate-200 bg-white px-4 py-3" aria-label="Paginación del listado">
                  <button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={safePage === 1} className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-slate-300 px-3 text-sm font-semibold text-slate-700 disabled:opacity-40">
                    ← Anterior
                  </button>
                  <span className="text-sm text-slate-600">Página {safePage} de {totalPages}</span>
                  <button type="button" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={safePage === totalPages} className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-slate-300 px-3 text-sm font-semibold text-slate-700 disabled:opacity-40">
                    Siguiente →
                  </button>
                </nav>
              )}
            </div>
          </>
        ) : <EmptySummary onClear={() => { setSearch(''); setGrade(''); setDecision(''); setIncompleteOnly(false); }} />}
      </section>

      <CycleDirectorReportModal row={reportApplicant} onClose={() => setReportApplicant(null)} />

      <ConfirmDialog
        isOpen={Boolean(pendingDecision)}
        title="Confirmar decisión final"
        message={pendingDecision ? <>Se registrará <strong>{DECISIONS.find((item) => item.value === pendingDecision.decision)?.label}</strong> para {pendingDecision.row.studentName}. Este cambio es interno y no enviará correos a la familia.</> : null}
        confirmText="Confirmar decisión"
        cancelText="Cancelar"
        onClose={() => setPendingDecision(null)}
        onConfirm={confirmDecision}
        isLoading={Boolean(pendingDecision && savingId === pendingDecision.row.applicationId)}
      />
    </div>
  );
};

const SUMMARY_METRIC_TONES = {
  blue: { bg: 'bg-blue-50', text: 'text-blue-700' },
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-700' },
  amber: { bg: 'bg-amber-50', text: 'text-amber-700' },
  rose: { bg: 'bg-rose-50', text: 'text-rose-700' },
  sky: { bg: 'bg-sky-50', text: 'text-sky-700' },
  violet: { bg: 'bg-violet-50', text: 'text-violet-700' }
} as const;

const SummaryMetric = ({ label, value, tone }: { label: string; value: number; tone: keyof typeof SUMMARY_METRIC_TONES }) => {
  const { bg, text } = SUMMARY_METRIC_TONES[tone];
  return (
    <div className={`rounded-lg border border-slate-200 ${bg} px-3 py-2.5 sm:px-4 sm:py-3`}>
      <span className="block text-xs font-semibold text-slate-600">{label}</span>
      <strong className={`mt-1 block text-2xl font-bold tabular-nums ${text}`}>{value}</strong>
    </div>
  );
};
const HeaderCell = ({ children, align = 'left' }: { children: React.ReactNode; align?: 'left' | 'center' | 'right' }) => <th scope="col" className={`break-words px-3 py-3.5 align-bottom text-xs font-bold uppercase leading-4 tracking-wide text-slate-600 ${align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left'}`}>{children}</th>;
const formatScore = (value: number | null, suffix = '%') => value == null ? '—' : `${Math.round(value)}${suffix}`;
const familyTone = (row: FinalSummaryApplicant) => row.siblingGroupSize > 1 && row.familyGroupId != null ? FAMILY_TONES[Math.abs(row.familyGroupId) % FAMILY_TONES.length] : 'bg-slate-100 text-slate-700 ring-slate-200';

const FamilyBadge = ({ row }: { row: FinalSummaryApplicant }) => row.siblingGroupSize > 1 ? (
  <span className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-bold ring-1 ring-inset ${familyTone(row)}`} title={`Hermanos: ${row.siblingNames.join(', ')}`}>
    <FiUsers className="h-3.5 w-3.5" aria-hidden="true" />Familia de {row.siblingGroupSize}
  </span>
) : <span className="text-xs text-slate-400">Individual</span>;

const FamilyScores = ({ row }: { row: FinalSummaryApplicant }) => (
  <div>
    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 tabular-nums">
      <strong className="text-base text-slate-950">{formatScore(row.familyEvaluation.percentage)}</strong>
      <span className="text-xs text-slate-500">{formatScore(row.familyEvaluation.score40, '/40')} · {formatScore(row.familyEvaluation.score11, '/11')} · {formatScore(row.familyEvaluation.rating, '/5')}</span>
    </div>
    {row.familyEvaluation.justification && <details className="mt-1 max-w-72"><summary className="cursor-pointer text-xs font-semibold text-blue-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-700">Ver comentario</summary><p className="mt-2 rounded-lg bg-slate-50 p-2 text-xs leading-5 text-slate-700">{row.familyEvaluation.justification}</p></details>}
  </div>
);

const ExamScores = ({ row }: { row: FinalSummaryApplicant }) => (
  <dl className="grid grid-cols-3 gap-1.5 text-center">
    <Score label="Leng." value={row.exams.language} compact />
    <Score label="Mat." value={row.exams.mathematics} compact />
    <Score label="Inglés" value={row.exams.english} compact />
  </dl>
);

const CycleDirectorSummary = ({ row, onOpenReport }: { row: FinalSummaryApplicant; onOpenReport: (row: FinalSummaryApplicant) => void }) => {
  const report = row.cycleDirector;
  const hasDetail = report.completed || Boolean(
    report.strengths || report.difficulties || report.interviewAdaptation ||
    report.outstandingTraits || report.familyBackground || report.academicBackground ||
    report.entryCourse || report.evaluator
  );
  return (
    <div className="text-center text-xs leading-5 text-slate-700">
      <p className="whitespace-pre-line">{safeDisplayText(report.recommendation, 'Sin registro')}</p>
      {hasDetail && (
        <button type="button" onClick={() => onOpenReport(row)} className="mt-1 inline-flex min-h-10 items-center font-bold text-blue-800 hover:text-blue-950 hover:underline hover:underline-offset-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-700">
          Ver informe completo
        </button>
      )}
    </div>
  );
};

const ReportField = ({ label, value }: { label: string; value: string | null }) => value ? (
  <div>
    <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</dt>
    <dd className="mt-1 whitespace-pre-line text-sm leading-6 text-slate-800">{value}</dd>
  </div>
) : null;

const CycleDirectorReportModal = ({ row, onClose }: { row: FinalSummaryApplicant | null; onClose: () => void }) => (
  <Modal isOpen={Boolean(row)} onClose={onClose} title="Informe final del director de ciclo" size="lg" contentClassName="p-5 sm:p-6">
    {row && (
      <div>
        <div className="border-b border-slate-200 pb-4">
          <p className="font-bold text-slate-950">{row.studentName}</p>
          <p className="mt-1 text-sm text-slate-500">{formatGradeLabel(row.gradeApplied)}</p>
        </div>
        <dl className="space-y-5 py-5">
          <ReportField label="Fortalezas" value={row.cycleDirector.strengths} />
          <ReportField label="Dificultades" value={row.cycleDirector.difficulties} />
          <ReportField label="Adaptación a la entrevista" value={row.cycleDirector.interviewAdaptation} />
          <ReportField label="Rasgos destacados" value={row.cycleDirector.outstandingTraits} />
          <ReportField label="Contexto familiar" value={row.cycleDirector.familyBackground} />
          <ReportField label="Antecedentes académicos" value={row.cycleDirector.academicBackground} />
          <ReportField label="Recomendación final" value={row.cycleDirector.recommendation} />
          <ReportField label="Curso de ingreso" value={row.cycleDirector.entryCourse} />
        </dl>
        {row.cycleDirector.evaluator && <p className="border-t border-slate-200 pt-4 text-xs text-slate-500">Informe registrado por <strong className="text-slate-700">{row.cycleDirector.evaluator}</strong></p>}
      </div>
    )}
  </Modal>
);

const DecisionSelect = ({ row, saving, onDecision, widthClassName = 'w-40' }: { row: FinalSummaryApplicant; saving: boolean; onDecision: (value: { row: FinalSummaryApplicant; decision: FinalDecision }) => void; widthClassName?: string }) => {
  const policy = applicationStatusPolicy(row);
  const reasonId = useId();
  return (
    <label className={`min-w-0 ${widthClassName}`}>
      <span className="sr-only">Decisión final para {row.studentName}</span>
      <div className="relative">
        <select value={DECISIONS.some((item) => item.value === row.status) ? row.status : ''}
          onChange={(event) => event.target.value && onDecision({ row, decision: event.target.value as FinalDecision })}
          disabled={saving || policy.locked} aria-describedby={reasonId}
          className="min-h-11 w-full appearance-none rounded-lg border border-slate-300 bg-white py-2 pl-3 pr-8 text-sm text-slate-800 focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-700/20 disabled:opacity-50">
          {!DECISIONS.some((item) => item.value === row.status) && <option value="">Pendiente</option>}
          {DECISIONS.filter((item) => item.value === row.status || policy.canChangeTo(item.value)).map((item) =>
            <option key={item.value} value={item.value}>{item.label}</option>)}
        </select>
        <FiChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
      </div>
      <span id={reasonId} className="mt-1 block text-xs text-slate-600">{policy.reason}</span>
    </label>
  );
};

const FinalSummaryDesktopRow = ({ row, saving, onOpenCard, onOpenReport, onDecision }: { row: FinalSummaryApplicant; saving: boolean; onOpenCard: (id: number) => void; onOpenReport: (row: FinalSummaryApplicant) => void; onDecision: (value: { row: FinalSummaryApplicant; decision: FinalDecision }) => void }) => (
  <tr className="bg-white align-top hover:bg-slate-50">
    <td className="px-3 py-3.5"><strong className="block break-words text-slate-950">{row.studentName}</strong><span className="mt-0.5 block text-xs text-slate-500">{formatGradeLabel(row.gradeApplied)}</span></td>
    <td className="px-3 py-3.5"><FamilyBadge row={row} />{row.siblingNames.length > 0 && <span className="mt-1.5 block break-words text-xs leading-4 text-slate-500">Con {row.siblingNames.join(', ')}</span>}</td>
    <td className="px-3 py-3.5"><FamilyScores row={row} /></td>
    <td className="align-middle px-3 py-3.5"><ExamScores row={row} /></td>
    <td className="align-middle break-words px-3 py-3.5"><CycleDirectorSummary row={row} onOpenReport={onOpenReport} /></td>
    <td className="align-middle px-3 py-3.5">
      <div className="flex items-center justify-center gap-2">
        <DecisionSelect row={row} saving={saving} onDecision={onDecision} />
        <button type="button" onClick={() => onOpenCard(row.applicationId)} className="inline-flex min-h-10 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-blue-200 px-3 text-sm font-semibold text-blue-800 hover:bg-blue-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-700"><FiEye className="h-4 w-4" aria-hidden="true" />Ver ficha</button>
      </div>
    </td>
  </tr>
);

const FinalSummaryMobileRow = ({ row, saving, onOpenCard, onOpenReport, onDecision }: { row: FinalSummaryApplicant; saving: boolean; onOpenCard: (id: number) => void; onOpenReport: (row: FinalSummaryApplicant) => void; onDecision: (value: { row: FinalSummaryApplicant; decision: FinalDecision }) => void }) => (
  <article className="p-4">
    <div className="flex items-start justify-between gap-3"><div><h3 className="font-bold text-slate-950">{row.studentName}</h3><p className="mt-1 text-sm text-slate-500">{formatGradeLabel(row.gradeApplied)}</p></div><FamilyBadge row={row} /></div>
    <div className="mt-4 border-y border-slate-200 py-3"><FamilyScores row={row} /><dl className="mt-3 grid grid-cols-3 gap-2 text-center"><Score label="Leng." value={row.exams.language} /><Score label="Mat." value={row.exams.mathematics} /><Score label="Inglés" value={row.exams.english} /></dl></div>
    <div className="mt-3"><strong className="text-sm text-slate-900">Recomendación del director de ciclo</strong><CycleDirectorSummary row={row} onOpenReport={onOpenReport} /></div>
    <div className="mt-3 flex flex-col gap-2 sm:flex-row"><DecisionSelect row={row} saving={saving} onDecision={onDecision} widthClassName="w-full flex-1" /><button type="button" onClick={() => onOpenCard(row.applicationId)} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg border border-blue-200 font-semibold text-blue-800"><FiEye className="h-4 w-4" aria-hidden="true" />Ver ficha</button></div>
  </article>
);

const Score = ({ label, value, compact = false }: { label: string; value: number | null; compact?: boolean }) => <div className={compact ? 'min-w-0 rounded-lg bg-slate-50 px-1 py-2' : undefined}><dt className="truncate text-xs font-medium text-slate-500">{label}</dt><dd className="mt-1 font-bold tabular-nums text-slate-900">{formatScore(value)}</dd></div>;

const FinalSummarySkeleton = () => <div className="space-y-4" role="status"><span className="sr-only">Cargando resumen final</span><div className="h-20 animate-pulse rounded-xl bg-slate-100" /><div className="h-96 animate-pulse rounded-2xl bg-slate-100" /></div>;
const FinalSummaryError = ({ message, onRetry }: { message: string; onRetry: () => void }) => <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6" role="alert"><h2 className="font-bold text-rose-950">No pudimos cargar el resumen final</h2><p className="mt-1 text-sm text-rose-800">{message}</p><button type="button" onClick={onRetry} className="mt-4 min-h-11 rounded-xl bg-rose-700 px-4 text-sm font-semibold text-white">Reintentar</button></div>;
const EmptySummary = ({ onClear }: { onClear: () => void }) => <div className="px-5 py-14 text-center"><FiSearch className="mx-auto h-8 w-8 text-slate-300" /><h3 className="mt-3 font-bold text-slate-950">No hay postulantes que coincidan</h3><p className="mt-1 text-sm text-slate-500">Ajusta los filtros para volver a ver el resumen.</p><button type="button" onClick={onClear} className="mt-4 min-h-11 rounded-lg px-3 text-sm font-semibold text-blue-800 hover:bg-blue-50">Limpiar filtros</button></div>;
