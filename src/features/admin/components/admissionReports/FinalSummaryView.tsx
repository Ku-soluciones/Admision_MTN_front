import { applicationStatusPolicy } from '../../../../packages/shared-ui/src/utils/applicationStatusPolicy';
import React, { useCallback, useId, useMemo, useState } from 'react';
import {
  FiAlertCircle,
  FiDownload,
  FiEye,
  FiRefreshCw,
  FiSearch,
  FiUsers,
} from 'react-icons/fi';
import type { FinalDecision, FinalSummaryApplicant } from '../../../../packages/shared-ui/src/src/api/dashboard.types';
import ConfirmDialog from '../../../../packages/shared-ui/src/components/ui/ConfirmDialog';
import Modal from '../../../../packages/shared-ui/src/components/ui/Modal';
import { formatGradeLabel, safeDisplayText } from './admissionReportUtils';
import { useFinalSummary } from './useFinalSummary';

interface FinalSummaryViewProps {
  academicYear: number;
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

export const FinalSummaryView: React.FC<FinalSummaryViewProps> = ({ academicYear, onOpenCard }) => {
  const { rows, meta, loading, error, savingId, refresh, updateDecision } = useFinalSummary(academicYear);
  const [search, setSearch] = useState('');
  const [grade, setGrade] = useState('');
  const [decision, setDecision] = useState('');
  const [incompleteOnly, setIncompleteOnly] = useState(false);
  const [pendingDecision, setPendingDecision] = useState<{ row: FinalSummaryApplicant; decision: FinalDecision } | null>(null);
  const [reportApplicant, setReportApplicant] = useState<FinalSummaryApplicant | null>(null);
  const [feedback, setFeedback] = useState('');
  const [exporting, setExporting] = useState(false);

  const grades = useMemo(() => Array.from(new Set(rows.map((row) => row.gradeApplied))), [rows]);
  const filteredRows = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('es');
    return rows.filter((row) => (
      (!term || row.studentName.toLocaleLowerCase('es').includes(term) || row.siblingNames.some((name) => name.toLocaleLowerCase('es').includes(term))) &&
      (!grade || row.gradeApplied === grade) &&
      (!decision || (decision === 'PENDING' ? !DECISIONS.some((item) => item.value === row.status) : row.status === decision)) &&
      (!incompleteOnly || needsReview(row))
    ));
  }, [decision, grade, incompleteOnly, rows, search]);

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
      const sheet = XLSX.utils.json_to_sheet(filteredRows.map((row) => ({
        Curso: formatGradeLabel(row.gradeApplied),
        Postulante: row.studentName,
        Hermanos: row.siblingNames.join(', '),
        'Familia (%)': row.familyEvaluation.percentage ?? '',
        'Familia /40': row.familyEvaluation.score40 ?? '',
        'Observación /11': row.familyEvaluation.score11 ?? '',
        'Familia 1–5': row.familyEvaluation.rating ?? '',
        Lenguaje: row.exams.language ?? '',
        Matemáticas: row.exams.mathematics ?? '',
        Inglés: row.exams.english ?? '',
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
      })));
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, sheet, 'Resumen final');
      XLSX.writeFile(workbook, `resumen_final_admision_${academicYear}.xlsx`);
    } finally {
      setExporting(false);
    }
  }, [academicYear, exporting, filteredRows]);

  if (loading && !rows.length) return <FinalSummarySkeleton />;
  if (error) return <FinalSummaryError message={error} onRetry={refresh} />;

  return (
    <div className="space-y-5">
      <section className="border-y border-slate-200 bg-white py-4" aria-label="Indicadores del resumen final">
        <div className="grid gap-4 lg:grid-cols-[minmax(220px,1.3fr)_repeat(5,minmax(90px,0.55fr))] lg:items-center">
          <div>
            <p className="text-sm font-semibold text-slate-600">Proceso {academicYear}</p>
            <div className="mt-1 flex items-baseline gap-2">
              <strong className="text-3xl font-bold tracking-[-0.03em] text-slate-950">{stats.total}</strong>
              <span className="text-sm text-slate-600">postulantes · {meta?.siblingFamilies || 0} familias con hermanos</span>
            </div>
          </div>
          <SummaryMetric label="Aceptados" value={stats.approved} tone="text-emerald-700" />
          <SummaryMetric label="Lista de espera" value={stats.waitlist} tone="text-amber-700" />
          <SummaryMetric label="No aceptados" value={stats.rejected} tone="text-rose-700" />
          <SummaryMetric label="Pendientes" value={stats.pending} tone="text-blue-800" />
          <SummaryMetric label="Incompletos" value={stats.incomplete} tone="text-slate-900" />
        </div>
      </section>

      <section className="rounded-2xl border border-slate-300 bg-white shadow-sm" aria-labelledby="final-summary-title">
        <header className="rounded-t-2xl border-b border-slate-200 p-4 sm:p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <h2 id="final-summary-title" className="text-xl font-bold tracking-tight text-slate-950">Resumen para decisión final</h2>
              <p className="mt-1 text-sm text-slate-600">Los colores identifican postulantes de una misma familia. Las decisiones guardadas aquí no envían correos.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={refresh} disabled={loading} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-700">
                <FiRefreshCw className={`h-4 w-4 ${loading ? 'animate-spin motion-reduce:animate-none' : ''}`} aria-hidden="true" />
                Actualizar
              </button>
              <button type="button" onClick={exportToExcel} disabled={!filteredRows.length || exporting} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-blue-950 px-4 text-sm font-semibold text-white hover:bg-blue-900 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2">
                <FiDownload className="h-4 w-4" aria-hidden="true" />
                {exporting ? 'Generando…' : `Exportar ${filteredRows.length}`}
              </button>
            </div>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-[minmax(240px,1fr)_220px_220px_auto]">
            <label className="relative">
              <span className="sr-only">Buscar postulante o hermano</span>
              <FiSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar postulante o hermano" className="min-h-11 w-full rounded-xl border border-slate-300 pl-9 pr-3 text-sm focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-700/20" />
            </label>
            <select value={grade} onChange={(event) => setGrade(event.target.value)} className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-800 focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-700/20" aria-label="Filtrar por curso">
              <option value="">Todos los cursos</option>
              {grades.map((item) => <option key={item} value={item}>{formatGradeLabel(item)}</option>)}
            </select>
            <select value={decision} onChange={(event) => setDecision(event.target.value)} className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-800 focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-700/20" aria-label="Filtrar por decisión final">
              <option value="">Todas las decisiones</option>
              <option value="PENDING">Pendientes</option>
              {DECISIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
            <button type="button" onClick={() => setIncompleteOnly((current) => !current)} aria-pressed={incompleteOnly} className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 ${incompleteOnly ? 'bg-amber-100 text-amber-950 ring-1 ring-inset ring-amber-300' : 'border border-slate-300 text-slate-700 hover:bg-slate-50'}`}>
              <FiAlertCircle className="h-4 w-4" aria-hidden="true" />
              Solo incompletos
            </button>
          </div>
          <p className="mt-3 text-xs font-medium text-slate-500" aria-live="polite">Mostrando {filteredRows.length} de {rows.length} postulantes</p>
          {feedback && <p className="mt-3 rounded-lg bg-blue-50 px-3 py-2 text-sm font-medium text-blue-900" role="status">{feedback}</p>}
        </header>

        {filteredRows.length ? (
          <>
            <div className="divide-y divide-slate-200 xl:hidden">
              {filteredRows.map((row) => <FinalSummaryMobileRow key={row.applicationId} row={row} saving={savingId === row.applicationId} onOpenCard={onOpenCard} onOpenReport={setReportApplicant} onDecision={setPendingDecision} />)}
            </div>
            <div className="hidden rounded-b-2xl xl:block">
              <table className="w-full table-fixed text-sm">
                <colgroup>
                  <col className="w-[16%]" />
                  <col className="w-[14%]" />
                  <col className="w-[18%]" />
                  <col className="w-[14%]" />
                  <col className="w-[21%]" />
                  <col className="w-[17%]" />
                </colgroup>
                <thead className="sticky top-0 z-10 bg-slate-100 shadow-[0_1px_0_0_rgb(203_213_225)]">
                  <tr>
                    <HeaderCell>Postulante</HeaderCell><HeaderCell>Familia</HeaderCell><HeaderCell>Entrevista</HeaderCell><HeaderCell>Pruebas</HeaderCell><HeaderCell>Recomendación del director de ciclo</HeaderCell><HeaderCell>Decisión y ficha</HeaderCell>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRows.map((row) => <FinalSummaryDesktopRow key={row.applicationId} row={row} saving={savingId === row.applicationId} onOpenCard={onOpenCard} onOpenReport={setReportApplicant} onDecision={setPendingDecision} />)}
                </tbody>
              </table>
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

const SummaryMetric = ({ label, value, tone }: { label: string; value: number; tone: string }) => <div className="border-l border-slate-200 pl-4"><span className={`block text-2xl font-bold tabular-nums ${tone}`}>{value}</span><span className="text-xs font-semibold text-slate-600">{label}</span></div>;
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
    <div className="text-xs leading-5 text-slate-700">
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

const DecisionSelect = ({ row, saving, onDecision }: { row: FinalSummaryApplicant; saving: boolean; onDecision: (value: { row: FinalSummaryApplicant; decision: FinalDecision }) => void }) => {
  const policy = applicationStatusPolicy(row);
  const reasonId = useId();
  return (
    <label className="block w-full min-w-0">
      <span className="sr-only">Decisión final para {row.studentName}</span>
      <select value={DECISIONS.some((item) => item.value === row.status) ? row.status : ''}
        onChange={(event) => event.target.value && onDecision({ row, decision: event.target.value as FinalDecision })}
        disabled={saving || policy.locked} aria-describedby={reasonId}
        className="min-h-10 w-full rounded-lg border border-slate-300 bg-white px-2 text-xs font-semibold text-slate-800 focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-700/20 disabled:opacity-50">
        {!DECISIONS.some((item) => item.value === row.status) && <option value="">Pendiente</option>}
        {DECISIONS.filter((item) => item.value === row.status || policy.canChangeTo(item.value)).map((item) =>
          <option key={item.value} value={item.value}>{item.label}</option>)}
      </select>
      <span id={reasonId} className="mt-1 block text-xs text-slate-600">{policy.reason}</span>
    </label>
  );
};

const FinalSummaryDesktopRow = ({ row, saving, onOpenCard, onOpenReport, onDecision }: { row: FinalSummaryApplicant; saving: boolean; onOpenCard: (id: number) => void; onOpenReport: (row: FinalSummaryApplicant) => void; onDecision: (value: { row: FinalSummaryApplicant; decision: FinalDecision }) => void }) => (
  <tr className="bg-white align-top hover:bg-slate-50">
    <td className="px-3 py-3.5"><strong className="block break-words text-slate-950">{row.studentName}</strong><span className="mt-0.5 block text-xs text-slate-500">{formatGradeLabel(row.gradeApplied)}</span></td>
    <td className="px-3 py-3.5"><FamilyBadge row={row} />{row.siblingNames.length > 0 && <span className="mt-1.5 block break-words text-xs leading-4 text-slate-500">Con {row.siblingNames.join(', ')}</span>}</td>
    <td className="px-3 py-3.5"><FamilyScores row={row} /></td>
    <td className="px-3 py-3.5"><ExamScores row={row} /></td>
    <td className="break-words px-3 py-3.5"><CycleDirectorSummary row={row} onOpenReport={onOpenReport} /></td>
    <td className="px-3 py-3.5">
      <DecisionSelect row={row} saving={saving} onDecision={onDecision} />
      <button type="button" onClick={() => onOpenCard(row.applicationId)} className="mt-1.5 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg text-xs font-bold text-blue-800 hover:bg-blue-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-700"><FiEye className="h-4 w-4" aria-hidden="true" />Ver ficha</button>
    </td>
  </tr>
);

const FinalSummaryMobileRow = ({ row, saving, onOpenCard, onOpenReport, onDecision }: { row: FinalSummaryApplicant; saving: boolean; onOpenCard: (id: number) => void; onOpenReport: (row: FinalSummaryApplicant) => void; onDecision: (value: { row: FinalSummaryApplicant; decision: FinalDecision }) => void }) => (
  <article className="p-4">
    <div className="flex items-start justify-between gap-3"><div><h3 className="font-bold text-slate-950">{row.studentName}</h3><p className="mt-1 text-sm text-slate-500">{formatGradeLabel(row.gradeApplied)}</p></div><FamilyBadge row={row} /></div>
    <div className="mt-4 border-y border-slate-200 py-3"><FamilyScores row={row} /><dl className="mt-3 grid grid-cols-3 gap-2 text-center"><Score label="Leng." value={row.exams.language} /><Score label="Mat." value={row.exams.mathematics} /><Score label="Inglés" value={row.exams.english} /></dl></div>
    <div className="mt-3"><strong className="text-sm text-slate-900">Recomendación del director de ciclo</strong><CycleDirectorSummary row={row} onOpenReport={onOpenReport} /></div>
    <div className="mt-3 flex flex-col gap-2 sm:flex-row"><DecisionSelect row={row} saving={saving} onDecision={onDecision} /><button type="button" onClick={() => onOpenCard(row.applicationId)} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg border border-blue-200 font-semibold text-blue-800"><FiEye className="h-4 w-4" aria-hidden="true" />Ver ficha</button></div>
  </article>
);

const Score = ({ label, value, compact = false }: { label: string; value: number | null; compact?: boolean }) => <div className={compact ? 'min-w-0 rounded-lg bg-slate-50 px-1 py-2' : undefined}><dt className="truncate text-xs font-medium text-slate-500">{label}</dt><dd className="mt-1 font-bold tabular-nums text-slate-900">{formatScore(value)}</dd></div>;

const FinalSummarySkeleton = () => <div className="space-y-4" role="status"><span className="sr-only">Cargando resumen final</span><div className="h-20 animate-pulse rounded-xl bg-slate-100" /><div className="h-96 animate-pulse rounded-2xl bg-slate-100" /></div>;
const FinalSummaryError = ({ message, onRetry }: { message: string; onRetry: () => void }) => <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6" role="alert"><h2 className="font-bold text-rose-950">No pudimos cargar el resumen final</h2><p className="mt-1 text-sm text-rose-800">{message}</p><button type="button" onClick={onRetry} className="mt-4 min-h-11 rounded-xl bg-rose-700 px-4 text-sm font-semibold text-white">Reintentar</button></div>;
const EmptySummary = ({ onClear }: { onClear: () => void }) => <div className="px-5 py-14 text-center"><FiSearch className="mx-auto h-8 w-8 text-slate-300" /><h3 className="mt-3 font-bold text-slate-950">No hay postulantes que coincidan</h3><p className="mt-1 text-sm text-slate-500">Ajusta los filtros para volver a ver el resumen.</p><button type="button" onClick={onClear} className="mt-4 min-h-11 rounded-lg px-3 text-sm font-semibold text-blue-800 hover:bg-blue-50">Limpiar filtros</button></div>;
