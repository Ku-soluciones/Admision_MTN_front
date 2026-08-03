import React, { useEffect, useRef, useState } from 'react';
import {
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  GraduationCap,
  LoaderCircle,
  Mail,
  MailCheck,
  MailWarning,
  UserRound,
  XCircle
} from 'lucide-react';
import Modal from '../ui/Modal';
import SimpleToast from '../ui/SimpleToast';
import api from '../../services/api';
import {
  formatDisplayValue,
  formatPersonDisplayName,
  formatProcessLabel,
  formatProcessStatus,
  hasDisplayValue
} from '../../utils/applicationDecisionDisplay';

interface PersonSummary {
  fullName?: unknown;
  name?: unknown;
  firstName?: unknown;
  lastName?: unknown;
  paternalLastName?: unknown;
  maternalLastName?: unknown;
  email?: unknown;
}

interface StudentSummary extends PersonSummary {
  gradeApplied?: unknown;
  gradeApplying?: unknown;
  grade?: unknown;
}

interface ProcessSummary {
  id?: number | string;
  type?: unknown;
  interviewType?: unknown;
  evaluationType?: unknown;
  interviewer?: unknown;
  interviewerName?: unknown;
  evaluator?: unknown;
  evaluatorName?: unknown;
  score?: unknown;
  maxScore?: unknown;
  status?: unknown;
}

interface DecisionApplication {
  id: number | string;
  student?: StudentSummary | null;
  father?: PersonSummary | null;
  mother?: PersonSummary | null;
  guardian?: PersonSummary | null;
  applicantUser?: PersonSummary | null;
  interviews?: ProcessSummary[] | null;
  evaluations?: ProcessSummary[] | null;
}

interface ApplicationDecisionModalProps {
  isOpen: boolean;
  onClose: () => void;
  application: DecisionApplication | null;
  onDecisionMade: () => void;
}

type Decision = 'APPROVED' | 'WAITLIST' | 'REJECTED';

interface NotificationOutcome {
  attempted?: boolean;
  sent?: boolean;
  recipient?: unknown;
  status?: unknown;
  message?: unknown;
}

interface DecisionResult {
  decision: Decision;
  notification: NotificationOutcome;
}

const DECISION_OPTIONS: Array<{
  value: Decision;
  label: string;
  description: string;
  confirmationLabel: string;
  Icon: typeof CheckCircle2;
  selectedClasses: string;
  iconClasses: string;
}> = [
  {
    value: 'APPROVED',
    label: 'Aprobar postulación',
    confirmationLabel: 'Confirmar aprobación',
    description: 'El resultado quedará preparado para el cierre general.',
    Icon: CheckCircle2,
    selectedClasses: 'border-emerald-500 bg-emerald-50 text-emerald-900',
    iconClasses: 'text-emerald-600'
  },
  {
    value: 'WAITLIST',
    label: 'Agregar a lista de espera',
    confirmationLabel: 'Confirmar lista de espera',
    description: 'La postulación queda activa a la espera de un cupo.',
    Icon: Clock3,
    selectedClasses: 'border-amber-500 bg-amber-50 text-amber-950',
    iconClasses: 'text-amber-700'
  },
  {
    value: 'REJECTED',
    label: 'Rechazar postulación',
    confirmationLabel: 'Confirmar rechazo',
    description: 'El resultado quedará preparado para el cierre general.',
    Icon: XCircle,
    selectedClasses: 'border-red-500 bg-red-50 text-red-950',
    iconClasses: 'text-red-600'
  }
];

const getRequestErrorMessage = (error: unknown): string => {
  if (!error || typeof error !== 'object') {
    return 'No se pudo registrar la decisión. Intenta nuevamente.';
  }

  const requestError = error as {
    message?: unknown;
    response?: { data?: { message?: unknown; error?: { message?: unknown } } };
  };
  const backendMessage = requestError.response?.data?.error?.message
    || requestError.response?.data?.message;

  return formatDisplayValue(
    backendMessage || requestError.message,
    'No se pudo registrar la decisión. Intenta nuevamente.'
  );
};

const statusClasses = (status: unknown): string => {
  const normalized = String(status ?? '').toUpperCase();
  if (normalized === 'COMPLETED' || normalized === 'APPROVED' || normalized === 'CONFIRMED') {
    return 'bg-emerald-50 text-emerald-700';
  }
  if (normalized === 'CANCELLED' || normalized === 'REJECTED') {
    return 'bg-red-50 text-red-700';
  }
  if (normalized === 'IN_PROGRESS') {
    return 'bg-blue-50 text-blue-700';
  }
  return 'bg-amber-50 text-amber-800';
};

const isComplete = (status: unknown): boolean => {
  const normalized = String(status ?? '').toUpperCase();
  return normalized === 'COMPLETED' || normalized === 'APPROVED' || normalized === 'CONFIRMED';
};

const ApplicationDecisionModal: React.FC<ApplicationDecisionModalProps> = ({
  isOpen,
  onClose,
  application,
  onDecisionMade
}) => {
  const [decision, setDecision] = useState<Decision | null>(null);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DecisionResult | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
  }, []);

  if (!application) return null;

  const interviews = Array.isArray(application.interviews) ? application.interviews : [];
  const evaluations = Array.isArray(application.evaluations) ? application.evaluations : [];
  const studentName = formatPersonDisplayName(application.student, 'Sin nombre registrado');
  const guardian = application.guardian;
  const guardianName = formatPersonDisplayName(guardian, 'Sin apoderado registrado');
  const guardianEmail = formatDisplayValue(application.guardian?.email, 'Sin email registrado');
  const grade = formatDisplayValue(
    application.student?.gradeApplied
      || application.student?.gradeApplying
      || application.student?.grade,
    'Sin curso registrado'
  );
  const interviewCompleteCount = interviews.filter((item) => isComplete(item.status)).length;
  const evaluationCompleteCount = evaluations.filter((item) => isComplete(item.status)).length;

  const handleClose = () => {
    if (loading) return;
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setDecision(null);
    setNote('');
    setResult(null);
    setToast(null);
    onClose();
  };

  const handleSubmitDecision = async () => {
    if (loading) return;

    if (!decision) {
      setToast({ message: 'Selecciona una decisión para continuar.', type: 'error' });
      return;
    }

    setLoading(true);
    setToast(null);
    try {
      const response = await api.post(
        `/v1/applications/${application.id}/final-decision`,
        { decision, note: note.trim() }
      );
      const notification = (response.data?.notification || {}) as NotificationOutcome;

      setResult({ decision, notification });
      onDecisionMade();

      if (notification.sent === true || notification.status === 'DEFERRED_UNTIL_PROCESS_CLOSE') {
        closeTimerRef.current = setTimeout(handleClose, 2600);
      }
    } catch (error) {
      setToast({ message: getRequestErrorMessage(error), type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const selectedOption = DECISION_OPTIONS.find((option) => option.value === decision);
  const resultOption = DECISION_OPTIONS.find((option) => option.value === result?.decision);
  const noteLabel = decision === 'APPROVED'
    ? 'Mensaje para la familia (opcional)'
    : decision === 'WAITLIST'
      ? 'Próximos pasos para la familia (recomendado)'
      : 'Observaciones para la familia (opcional)';
  const notePlaceholder = decision === 'APPROVED'
    ? 'Escribe un mensaje de bienvenida para la familia…'
    : decision === 'WAITLIST'
      ? 'Indica cómo continuará el proceso y cuándo tendrán novedades…'
      : 'Escribe un mensaje claro y respetuoso sobre la decisión…';

  return (
    <>
      {toast && (
        <SimpleToast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title="Decisión final de admisión"
        size="max"
        closeDisabled={loading}
        contentClassName="p-0"
      >
        {result && resultOption ? (
          <div className="mx-auto flex min-h-[28rem] max-w-2xl flex-col items-center justify-center px-6 py-12 text-center sm:px-10">
            <div className={`mb-5 flex h-16 w-16 items-center justify-center rounded-full ${
              result.decision === 'APPROVED'
                ? 'bg-emerald-100 text-emerald-700'
                : result.decision === 'WAITLIST'
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-red-100 text-red-700'
            }`}>
              <resultOption.Icon className="h-8 w-8" aria-hidden="true" />
            </div>
            <h3 className="text-2xl font-bold tracking-[-0.02em] text-gray-950">
              Decisión registrada
            </h3>
            <p className="mt-2 text-base text-gray-600">
              {resultOption.label} para {studentName}.
            </p>

            {result.notification.sent === true ? (
              <div className="mt-7 flex w-full items-start gap-3 rounded-xl bg-emerald-50 p-4 text-left text-emerald-900">
                <MailCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" aria-hidden="true" />
                <div>
                  <p className="font-semibold">Correo enviado correctamente</p>
                  <p className="mt-1 break-all text-sm text-emerald-800">
                    La notificación fue enviada a {formatDisplayValue(result.notification.recipient, guardianEmail)}.
                  </p>
                </div>
              </div>
            ) : result.notification.status === 'DEFERRED_UNTIL_PROCESS_CLOSE' ? (
              <div className="mt-7 flex w-full items-start gap-3 rounded-xl bg-blue-50 p-4 text-left text-blue-950">
                <MailCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-700" aria-hidden="true" />
                <div>
                  <p className="font-semibold">Resultado preparado para el cierre general</p>
                  <p className="mt-1 text-sm text-blue-900">
                    El apoderado recibirá el correo únicamente cuando un administrador termine el proceso completo.
                  </p>
                </div>
              </div>
            ) : (
              <div className="mt-7 flex w-full items-start gap-3 rounded-xl bg-amber-50 p-4 text-left text-amber-950">
                <MailWarning className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" aria-hidden="true" />
                <div>
                  <p className="font-semibold">La decisión se guardó, pero el correo no fue confirmado</p>
                  <p className="mt-1 text-sm text-amber-900">
                    {formatDisplayValue(
                      result.notification.message,
                      'Revisa el destinatario y el registro de notificaciones antes de cerrar.'
                    )}
                  </p>
                </div>
              </div>
            )}

            {result.notification.sent !== true && result.notification.status !== 'DEFERRED_UNTIL_PROCESS_CLOSE' && (
              <button
                type="button"
                onClick={handleClose}
                className="mt-7 min-h-11 rounded-lg bg-azul-monte-tabor px-6 py-2.5 font-semibold text-white transition-colors hover:bg-blue-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azul-monte-tabor focus-visible:ring-offset-2"
              >
                Cerrar
              </button>
            )}
          </div>
        ) : (
          <div className="p-4 sm:p-6 lg:p-8">
            <section className="rounded-xl bg-blue-50 p-5 sm:p-6" aria-labelledby="applicant-heading">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <h3 id="applicant-heading" className="text-lg font-bold text-azul-monte-tabor">
                    {studentName}
                  </h3>
                  <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-blue-950">
                    <span className="flex items-center gap-2">
                      <GraduationCap className="h-4 w-4 text-blue-700" aria-hidden="true" />
                      {grade}
                    </span>
                    <span className="flex min-w-0 items-center gap-2">
                      <UserRound className="h-4 w-4 shrink-0 text-blue-700" aria-hidden="true" />
                      <span className="break-words">{guardianName}</span>
                    </span>
                    <span className="flex min-w-0 items-center gap-2">
                      <Mail className="h-4 w-4 shrink-0 text-blue-700" aria-hidden="true" />
                      <span className="break-all">{guardianEmail}</span>
                    </span>
                  </div>
                </div>
                <span className="w-fit shrink-0 rounded-full bg-white px-3 py-1 text-xs font-semibold text-blue-800">
                  Postulación #{application.id}
                </span>
              </div>
            </section>

            <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(20rem,0.65fr)]">
              <section aria-labelledby="process-heading">
                <div className="mb-4">
                  <h3 id="process-heading" className="text-lg font-bold text-gray-950">Resumen del proceso</h3>
                  <p className="mt-1 text-sm text-gray-600">
                    Revisa los antecedentes antes de dejar preparado el resultado final.
                  </p>
                </div>

                <div className="grid items-start gap-4 xl:grid-cols-2">
                  <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                    <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <CalendarDays className="h-5 w-5 text-blue-700" aria-hidden="true" />
                        <h4 className="font-bold text-gray-950">Entrevistas</h4>
                      </div>
                      <span className="text-xs font-semibold text-gray-500">
                        {interviewCompleteCount} de {interviews.length} completas
                      </span>
                    </div>
                    {interviews.length > 0 ? (
                      <div className="max-h-80 divide-y divide-gray-100 overflow-y-auto">
                        {interviews.map((interview, index) => (
                          <div key={interview.id ?? index} className="px-4 py-3.5 text-sm">
                            <div className="flex items-start justify-between gap-3">
                              <p className="min-w-0 break-words font-semibold text-gray-900">
                                {formatProcessLabel(interview.type || interview.interviewType, 'Entrevista')}
                              </p>
                              <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${statusClasses(interview.status)}`}>
                                {formatProcessStatus(interview.status)}
                              </span>
                            </div>
                            <p className="mt-1 break-words text-gray-600">
                              {formatPersonDisplayName(
                                interview.interviewerName || interview.interviewer,
                                'Sin entrevistador asignado'
                              )}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="px-4 py-8 text-center text-sm text-gray-500">
                        No hay entrevistas registradas.
                      </div>
                    )}
                  </div>

                  <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                    <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <ClipboardCheck className="h-5 w-5 text-emerald-700" aria-hidden="true" />
                        <h4 className="font-bold text-gray-950">Evaluaciones</h4>
                      </div>
                      <span className="text-xs font-semibold text-gray-500">
                        {evaluationCompleteCount} de {evaluations.length} completas
                      </span>
                    </div>
                    {evaluations.length > 0 ? (
                      <div className="max-h-80 divide-y divide-gray-100 overflow-y-auto">
                        {evaluations.map((evaluation, index) => (
                          <div key={evaluation.id ?? index} className="px-4 py-3.5 text-sm">
                            <div className="flex items-start justify-between gap-3">
                              <p className="min-w-0 break-words font-semibold text-gray-900">
                                {formatProcessLabel(evaluation.evaluationType || evaluation.type, 'Evaluación')}
                              </p>
                              <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${statusClasses(evaluation.status)}`}>
                                {formatProcessStatus(evaluation.status)}
                              </span>
                            </div>
                            <div className="mt-1 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-gray-600">
                              <span className="break-words">
                                {formatPersonDisplayName(
                                  evaluation.evaluatorName || evaluation.evaluator,
                                  'Sin evaluador asignado'
                                )}
                              </span>
                              {hasDisplayValue(evaluation.score) && (
                                <span className="font-semibold text-gray-800">
                                  {formatDisplayValue(evaluation.score)}/{formatDisplayValue(evaluation.maxScore, '100')}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="px-4 py-8 text-center text-sm text-gray-500">
                        No hay evaluaciones registradas.
                      </div>
                    )}
                  </div>
                </div>
              </section>

              <aside className="rounded-xl border border-gray-200 bg-gray-50 p-4 sm:p-5 lg:sticky lg:top-0" aria-labelledby="decision-heading">
                <h3 id="decision-heading" className="text-lg font-bold text-gray-950">Tomar decisión</h3>
                <p className="mt-1 text-sm text-gray-600">Selecciona una opción para continuar.</p>

                <fieldset className="mt-4 space-y-2.5">
                  <legend className="sr-only">Decisión final</legend>
                  {DECISION_OPTIONS.map(({ value, label, description, Icon, selectedClasses, iconClasses }) => {
                    const selected = decision === value;
                    return (
                      <label
                        key={value}
                        className={`flex min-h-16 cursor-pointer items-start gap-3 rounded-xl border-2 bg-white p-3.5 transition-colors focus-within:ring-2 focus-within:ring-azul-monte-tabor focus-within:ring-offset-2 ${
                          selected ? selectedClasses : 'border-gray-200 text-gray-900 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="final-decision"
                          value={value}
                          checked={selected}
                          onChange={() => setDecision(value)}
                          className="sr-only"
                        />
                        <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${selected ? iconClasses : 'text-gray-400'}`} aria-hidden="true" />
                        <span className="min-w-0">
                          <span className="block text-sm font-bold">{label}</span>
                          <span className="mt-0.5 block text-xs leading-5 text-gray-600">{description}</span>
                        </span>
                      </label>
                    );
                  })}
                </fieldset>

                <div className="mt-5">
                  <label htmlFor="final-decision-note" className="block text-sm font-semibold text-gray-800">
                    {noteLabel}
                  </label>
                  <textarea
                    id="final-decision-note"
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    rows={4}
                    className="mt-2 w-full resize-y rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-azul-monte-tabor focus:ring-2 focus:ring-blue-100"
                    placeholder={notePlaceholder}
                  />
                </div>

                <div className={`mt-4 flex items-start gap-2.5 rounded-lg p-3 text-sm ${
                  guardianEmail === 'Sin email registrado'
                    ? 'bg-amber-100 text-amber-950'
                    : 'bg-blue-100 text-blue-950'
                }`}>
                  {guardianEmail === 'Sin email registrado' ? (
                    <MailWarning className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  ) : (
                    <Mail className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  )}
                  <p>
                    {guardianEmail === 'Sin email registrado'
                      ? 'El apoderado formal no tiene un correo visible. Podrás guardar la decisión, pero el cierre general quedará bloqueado hasta corregirlo.'
                      : <>La decisión se guardará ahora. El correo a <span className="break-all font-semibold">{guardianEmail}</span> se liberará al cerrar el proceso completo.</>}
                  </p>
                </div>

                <div className="mt-5 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end lg:flex-col-reverse xl:flex-row">
                  <button
                    type="button"
                    onClick={handleClose}
                    disabled={loading}
                    className="min-h-11 rounded-lg border border-gray-300 bg-white px-4 py-2.5 font-semibold text-gray-700 transition-colors hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azul-monte-tabor focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmitDecision}
                    disabled={!decision || loading}
                    className={`flex min-h-11 flex-1 items-center justify-center rounded-lg px-4 py-2.5 font-semibold text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-gray-400 ${
                      decision === 'APPROVED'
                        ? 'bg-emerald-700 hover:bg-emerald-800 focus-visible:ring-emerald-700'
                        : decision === 'WAITLIST'
                          ? 'bg-amber-700 hover:bg-amber-800 focus-visible:ring-amber-700'
                          : decision === 'REJECTED'
                            ? 'bg-red-700 hover:bg-red-800 focus-visible:ring-red-700'
                            : 'bg-gray-400'
                    }`}
                  >
                    {loading ? (
                      <>
                        <LoaderCircle className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                        Guardando decisión…
                      </>
                    ) : (
                      selectedOption?.confirmationLabel || 'Confirmar decisión'
                    )}
                  </button>
                </div>
              </aside>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
};

export default ApplicationDecisionModal;
