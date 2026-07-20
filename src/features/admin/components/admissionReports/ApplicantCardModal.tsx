import React, { useEffect, useId, useMemo, useRef } from 'react';
import { FiChevronDown, FiExternalLink, FiFileText, FiRefreshCw, FiX } from 'react-icons/fi';
import type { ApplicantCard } from '../../../../packages/shared-ui/src/src/api/dashboard.types';
import { formatAdmissionDate, formatGenderLabel, formatGradeLabel, safeDisplayText, statusTone } from './admissionReportUtils';

interface ApplicantCardModalProps {
  card: ApplicantCard | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
  onRetry: () => void;
}

export const ApplicantCardModal: React.FC<ApplicantCardModalProps> = ({ card, loading, error, onClose, onRetry }) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  useEffect(() => {
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )).filter((element) => !element.hasAttribute('hidden'));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousBodyOverflow;
      previouslyFocused?.focus();
    };
  }, [onClose]);

  const applicantName = useMemo(() => {
    if (!card) return '';
    const first = card.student.firstName?.trim() || '';
    const last = card.student.lastName?.trim() || '';
    return last.toLocaleLowerCase('es').startsWith(first.toLocaleLowerCase('es')) ? last : `${first} ${last}`.trim();
  }, [card]);
  const examAverage = useMemo(() => {
    if (card?.examAverage != null) return card.examAverage;
    const percentages = card?.exams.map((exam) => exam.percentage).filter((value): value is number => value != null) || [];
    if (!percentages.length) return null;
    return Math.round((percentages.reduce((sum, value) => sum + value, 0) / percentages.length) * 100) / 100;
  }, [card]);

  if (!card && !loading && !error) return null;
  const isPrekinder = (card?.student.gradeApplied || '').toLocaleLowerCase('es').includes('pre');
  const processLabel = card?.processType || (isPrekinder ? 'Prekínder' : 'Kínder–IV');

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="presentation">
      <div className="absolute inset-0 bg-slate-950/45" onClick={onClose} aria-hidden="true" />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-busy={loading}
        className="relative h-full w-full max-w-3xl overflow-y-auto bg-white shadow-2xl motion-safe:transition-transform motion-safe:duration-200 motion-safe:ease-out"
      >
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-4 py-4 backdrop-blur-sm sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-blue-900">Ficha alumno · {processLabel}</p>
              <h2 id={titleId} className="mt-0.5 truncate text-xl font-bold tracking-[-0.02em] text-slate-950">
                {applicantName || 'Cargando postulante'}
              </h2>
              {card && (
                <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-500">
                  <span>{formatGradeLabel(card.student.gradeApplied)}</span>
                  <span aria-hidden="true">·</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-bold ring-1 ring-inset ${statusTone(card.statusLabel).badge}`}>{card.statusLabel}</span>
                </div>
              )}
            </div>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={onClose}
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-700"
              aria-label="Cerrar ficha"
            >
              <FiX className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </header>

        <div className="space-y-5 p-4 sm:p-6">
          {loading && <CardSkeleton />}

          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-800" role="alert">
              <h3 className="font-bold text-rose-950">No se pudo cargar la ficha</h3>
              <p className="mt-1 text-sm">{error}</p>
              <button type="button" onClick={onRetry} className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-lg bg-rose-700 px-3 text-sm font-bold text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-600 focus-visible:ring-offset-2">
                <FiRefreshCw className="h-4 w-4" aria-hidden="true" /> Reintentar
              </button>
            </div>
          )}

          {!loading && card && (
            <>
              <CardSection title="Datos del postulante" accent="blue">
                <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
                  <Field label="RUT" value={safeDisplayText(card.student.rut)} />
                  <Field label="Fecha de nacimiento" value={formatAdmissionDate(card.student.birthDate)} />
                  <Field label="Curso al que postula" value={formatGradeLabel(card.student.gradeApplied)} />
                  <Field label="Género" value={formatGenderLabel(card.student.gender)} />
                  <Field label="Colegio / jardín actual" value={safeDisplayText(card.student.currentSchool, 'Sin registro')} />
                  <Field label="Vía de postulación" value={safeDisplayText(card.student.admissionPreference)} />
                </dl>
              </CardSection>

              <CardSection title="Familia y antecedentes" accent="amber">
                <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
                  <Field label="Nombre papás" value={parentNames(card)} />
                  <Field label="Mails" value={parentEmails(card)} />
                  <Field label="Teléfonos" value={parentPhones(card)} />
                  <Field label="Cuestionario familia recibido" value={booleanLabel(card.familyQuestionnaire?.received)} />
                  <Field label="Hijo/a de exalumno (quién)" value={alumniLabel(card)} />
                  <Field label="Hermanos en el colegio (quiénes)" value={card.student.hasSiblingsInSchool ? safeDisplayText(card.student.siblingsInSchoolDetails, 'Sí, sin detalle') : 'No'} />
                  <Field label="Cuestionario familia (informe)" value={<ReportLink href={card.familyQuestionnaire?.reportLink} />} fullWidth />
                </dl>
              </CardSection>

              {isPrekinder ? (
                <CardSection title="Proceso Prekínder" accent="teal">
                  <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
                    <Field label="Fecha evaluación (DAP)" value={formatAdmissionDate(card.prekinderProcess?.evaluationDate, 'Sin registro')} />
                    <Field label="Hora / Sala" value={timeAndLocation(card.prekinderProcess?.evaluationTime, card.prekinderProcess?.location)} />
                    <Field label="Evaluador/a" value={safeDisplayText(card.prekinderProcess?.evaluator, 'Sin registro')} />
                    <Field label="Asistió" value={booleanLabel(card.prekinderProcess?.attended)} />
                    <Field label="Informe evaluación" value={<ReportLink href={card.prekinderProcess?.evaluationReportLink} />} />
                    <Field label="Fecha entrevista familia" value={formatAdmissionDate(card.prekinderProcess?.familyInterviewDate, 'Sin registro')} />
                    <Field label="Entrevistadores" value={safeDisplayText(card.prekinderProcess?.familyInterviewers, 'Sin registro')} />
                    <Field label="Entrevista realizada" value={booleanLabel(card.prekinderProcess?.familyInterviewDone)} />
                    <Field label="Informe entrevista familia" value={<ReportLink href={card.prekinderProcess?.familyInterviewReportLink} />} fullWidth />
                  </dl>
                </CardSection>
              ) : (
                <CardSection title="Exámenes Kínder–IV" accent="rose">
                  {card.exams.length ? (
                    <div className="divide-y divide-slate-200 border-y border-slate-200">
                      {card.exams.map((exam) => (
                        <div key={`${exam.evaluationType}-${exam.subject}`} className="grid gap-2 py-3 sm:grid-cols-[1fr_1fr_88px_120px] sm:items-center">
                          <div>
                            <p className="font-bold text-slate-900">{exam.subject}</p>
                            <p className="text-xs text-slate-500 sm:hidden">{safeDisplayText(exam.responsible, 'Sin asignar')}</p>
                          </div>
                          <p className="hidden text-sm text-slate-600 sm:block">{safeDisplayText(exam.responsible, 'Sin asignar')}</p>
                          <p className="text-sm font-bold tabular-nums text-slate-900">{exam.percentage != null ? `${exam.percentage}%` : 'Sin puntaje'}</p>
                          <ReportLink href={exam.reportLink} compact />
                        </div>
                      ))}
                      <div className="flex items-center justify-between py-3">
                        <span className="text-sm font-bold text-slate-700">Promedio exámenes</span>
                        <strong className="text-lg tabular-nums text-slate-950">{examAverage != null ? `${examAverage}%` : 'Sin registro'}</strong>
                      </div>
                    </div>
                  ) : <p className="text-sm text-slate-500">Sin exámenes registrados.</p>}
                </CardSection>
              )}

              <CardSection title="Entrevista director/a de ciclo" accent="blue">
                <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
                  <Field label="Fecha entrevista" value={formatAdmissionDate(card.cycleDirector.date, 'Sin registro')} />
                  <Field label="Realizada" value={booleanLabel(card.cycleDirector.done)} />
                  <Field label="Decisión" value={safeDisplayText(card.cycleDirector.decision, 'Pendiente')} />
                  <Field
                    label="Informe entrevista"
                    value={<CycleDirectorReport report={card.cycleDirector.report} href={card.cycleDirector.reportLink} />}
                    fullWidth
                  />
                </dl>
              </CardSection>

              <CardSection title="Estado y resultado" accent="slate">
                <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
                  <Field label="Estado (etapa actual)" value={card.statusLabel} />
                  <Field label="Fecha de postulación" value={formatAdmissionDate(card.submissionDate)} />
                  <Field label="Observaciones" value={safeDisplayText(card.observations, 'Sin observaciones')} fullWidth />
                </dl>
              </CardSection>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const ACCENTS = {
  blue: 'bg-blue-800',
  amber: 'bg-amber-500',
  teal: 'bg-teal-600',
  rose: 'bg-rose-700',
  slate: 'bg-slate-700'
};

const CardSection: React.FC<{ title: string; accent: keyof typeof ACCENTS; children: React.ReactNode }> = ({ title, accent, children }) => (
  <section>
    <h3 className="mb-4 flex items-center gap-2 border-b border-slate-200 pb-2 text-base font-bold text-slate-950">
      <span className={`h-2 w-2 rounded-full ${ACCENTS[accent]}`} aria-hidden="true" />
      {title}
    </h3>
    {children}
  </section>
);

const Field: React.FC<{ label: string; value?: React.ReactNode; fullWidth?: boolean }> = ({ label, value, fullWidth }) => (
  <div className={fullWidth ? 'sm:col-span-2' : ''}>
    <dt className="text-xs font-semibold text-slate-500">{label}</dt>
    <dd className="mt-1 break-words text-sm font-medium text-slate-900">{value ?? 'Sin registro'}</dd>
  </div>
);

const ReportLink: React.FC<{ href?: string | null; compact?: boolean }> = ({ href, compact }) => href ? (
  <a href={href} target="_blank" rel="noopener noreferrer" className={`inline-flex min-h-10 items-center gap-1.5 font-bold text-blue-800 underline-offset-4 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 ${compact ? 'text-xs' : 'text-sm'}`}>
    Abrir informe <FiExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
  </a>
) : <span className="text-sm font-medium text-slate-400">Sin informe</span>;

type CycleDirectorReportData = ApplicantCard['cycleDirector']['report'];

const CycleDirectorReport: React.FC<{ report: CycleDirectorReportData; href?: string | null }> = ({ report, href }) => {
  const sections = [
    { title: 'Desarrollo de la entrevista', content: removeInvalidInterviewer(report?.observations) },
    { title: 'Observaciones de la entrevista', content: removeInvalidInterviewer(report?.recommendations) },
    { title: 'Aspectos a acompañar', content: removeInvalidInterviewer(report?.areasForImprovement) }
  ].filter((section): section is { title: string; content: string } => Boolean(section.content));

  if (!sections.length) return <ReportLink href={href} />;

  return (
    <details className="group mt-1 overflow-hidden rounded-xl bg-slate-50 ring-1 ring-inset ring-slate-200">
      <summary className="flex min-h-12 cursor-pointer list-none items-center gap-3 px-3 py-2.5 text-sm font-bold text-blue-900 transition-colors hover:bg-blue-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-700 [&::-webkit-details-marker]:hidden">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-800" aria-hidden="true">
          <FiFileText className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block">Ver informe completo</span>
          <span className="block text-xs font-medium text-slate-600">{sections.length} {sections.length === 1 ? 'sección disponible' : 'secciones disponibles'}</span>
        </span>
        <FiChevronDown className="h-5 w-5 shrink-0 text-slate-500 transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none" aria-hidden="true" />
      </summary>

      <div className="border-t border-slate-200 bg-white px-3 py-4 sm:px-4">
        <div className="space-y-5">
          {report?.evaluator?.trim() && (
            <div>
              <p className="text-xs font-semibold text-slate-500">Entrevistador/a</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{report.evaluator}</p>
            </div>
          )}
          {sections.map((section) => (
            <section key={section.title} aria-label={section.title}>
              <h4 className="text-sm font-bold text-slate-950">{section.title}</h4>
              <p className="mt-2 max-w-[72ch] whitespace-pre-line text-sm font-normal leading-6 text-slate-700">{section.content}</p>
            </section>
          ))}
          {href && (
            <div className="border-t border-slate-200 pt-3">
              <ReportLink href={href} />
            </div>
          )}
        </div>
      </div>
    </details>
  );
};

const removeInvalidInterviewer = (content?: string | null): string => {
  if (!content?.trim()) return '';

  return content
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .filter((line) => !/^\s*Entrevistador(?:\/a)?:\s*(?:(?:undefined|null)\s*)+$/i.test(line))
    .join('\n')
    .trim();
};

const booleanLabel = (value?: boolean | null) => value == null ? 'Sin registro' : value ? 'Sí' : 'No';

const uniqueValues = (values: Array<string | undefined>) => Array.from(new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value))));
const parentNames = (card: ApplicantCard) => uniqueValues([card.family.motherName, card.family.fatherName, card.family.guardianName]).join(' · ') || 'Sin registro';
const parentEmails = (card: ApplicantCard) => uniqueValues([card.family.motherEmail, card.family.fatherEmail, card.family.guardianEmail]).join(' · ') || 'Sin registro';
const parentPhones = (card: ApplicantCard) => uniqueValues([card.family.motherPhone, card.family.fatherPhone, card.family.guardianPhone]).join(' · ') || 'Sin registro';
const alumniLabel = (card: ApplicantCard) => card.student.isAlumniChild
  ? `Sí${card.student.alumniParentName ? ` — ${card.student.alumniParentName}` : ''}${card.student.alumniParentYear ? ` (G.${card.student.alumniParentYear})` : ''}`
  : 'No';
const timeAndLocation = (time?: string | null, location?: string | null) => [time?.slice(0, 5), location].filter(Boolean).join(' · ') || 'Sin registro';

const CardSkeleton = () => (
  <div className="space-y-5" role="status" aria-live="polite">
    <span className="sr-only">Cargando ficha del postulante</span>
    {[1, 2, 3, 4].map((item) => (
      <div key={item}>
        <div className="h-5 w-40 animate-pulse rounded bg-slate-200" />
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="h-12 animate-pulse rounded bg-slate-100" />
          <div className="h-12 animate-pulse rounded bg-slate-100" />
        </div>
      </div>
    ))}
  </div>
);
