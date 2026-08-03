import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, LoaderCircle, LockKeyhole, MailWarning, RotateCcw } from 'lucide-react';
import Modal from '../ui/Modal';
import {
  AdmissionCycleSnapshot,
  admissionCycleService
} from '../../services/admissionCycleService';

interface AdmissionCycleCloseControlProps {
  onSnapshot?: (cycle: AdmissionCycleSnapshot) => void;
}

const errorMessage = (error: unknown): string => {
  if (!error || typeof error !== 'object') return 'No fue posible completar la operación.';
  const requestError = error as {
    message?: string;
    response?: { data?: { message?: string; error?: { message?: string } } };
  };
  return requestError.response?.data?.error?.message
    || requestError.response?.data?.message
    || requestError.message
    || 'No fue posible completar la operación.';
};

const AdmissionCycleCloseControl: React.FC<AdmissionCycleCloseControlProps> = ({ onSnapshot }) => {
  const [cycle, setCycle] = useState<AdmissionCycleSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const refresh = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const snapshot = await admissionCycleService.getCurrent();
      if (mountedRef.current) {
        setCycle(snapshot);
        setError(null);
      }
    } catch (requestError) {
      if (mountedRef.current && !quiet) setError(errorMessage(requestError));
    } finally {
      if (mountedRef.current && !quiet) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    void refresh();
    return () => { mountedRef.current = false; };
  }, [refresh]);

  useEffect(() => {
    if (cycle?.status !== 'PUBLISHING') return;
    const timer = window.setInterval(() => void refresh(true), 4000);
    return () => window.clearInterval(timer);
  }, [cycle?.status, refresh]);

  useEffect(() => {
    if (cycle) onSnapshot?.(cycle);
  }, [cycle, onSnapshot]);

  const blockers = useMemo(() => {
    if (!cycle) return [];
    const items: string[] = [];
    if (!cycle.enabled) items.push('El cierre maestro no está habilitado en este entorno.');
    if (!cycle.dispatchEnabled) items.push('El trabajador de resultados está deshabilitado.');
    if (!cycle.deliveryReady) items.push('Resend o el remitente institucional no están configurados para envío real.');
    if (cycle.emailMockMode) items.push('El proveedor se encuentra en modo de prueba.');
    if (cycle.totalApplications === 0) items.push('No existen postulaciones activas para este ciclo.');
    if (cycle.pendingDecisions > 0) items.push(`${cycle.pendingDecisions} postulación(es) todavía no tienen decisión final.`);
    if (cycle.missingGuardians > 0) items.push(`${cycle.missingGuardians} postulación(es) no tienen apoderado formal.`);
    if (cycle.invalidGuardianEmails > 0) items.push(`${cycle.invalidGuardianEmails} apoderado(s) no tienen un correo válido.`);
    if (cycle.missingAcademicYear > 0) items.push(`${cycle.missingAcademicYear} postulación(es) activas no tienen año académico.`);
    return items;
  }, [cycle]);

  const openModal = () => {
    setConfirmation('');
    setError(null);
    setModalOpen(true);
    void refresh(true);
  };

  const closeModal = () => {
    if (!submitting) {
      setModalOpen(false);
      setConfirmation('');
      setError(null);
    }
  };

  const submit = async () => {
    if (!cycle || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const next = cycle.status === 'CLOSED_WITH_ERRORS'
        ? await admissionCycleService.retryFailed(cycle.academicYear)
        : await admissionCycleService.close(cycle.academicYear, confirmation.trim());
      setCycle(next);
      setModalOpen(false);
      setConfirmation('');
    } catch (requestError) {
      setError(errorMessage(requestError));
      await refresh(true);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <button type="button" disabled className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white opacity-70">
        <LoaderCircle className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
        Verificando cierre
      </button>
    );
  }

  if (!cycle) {
    return (
      <button type="button" onClick={() => void refresh()} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm font-bold text-red-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2">
        <RotateCcw className="h-4 w-4" aria-hidden="true" />
        Reintentar verificación
      </button>
    );
  }

  const inProgress = cycle.status === 'PUBLISHING';
  const closed = cycle.status === 'CLOSED';
  const withErrors = cycle.status === 'CLOSED_WITH_ERRORS';
  const hasRetryableFailures = cycle.failed > 0;
  const processed = cycle.sent + cycle.failed + cycle.unknown;
  const exactConfirmation = confirmation.trim() === cycle.confirmationPhrase;
  const canSubmitClose = cycle.canClose && exactConfirmation && blockers.length === 0;

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        disabled={inProgress || closed}
        className={`inline-flex min-h-11 items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed ${
          withErrors
            ? 'bg-amber-700 hover:bg-amber-800 focus-visible:ring-amber-600'
            : closed
              ? 'bg-emerald-700 opacity-80'
              : inProgress
                ? 'bg-blue-800 opacity-85'
                : 'bg-red-700 hover:bg-red-800 focus-visible:ring-red-600'
        }`}
      >
        {inProgress ? (
          <LoaderCircle className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
        ) : withErrors ? (
          <MailWarning className="h-4 w-4" aria-hidden="true" />
        ) : closed ? (
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
        ) : (
          <LockKeyhole className="h-4 w-4" aria-hidden="true" />
        )}
        {inProgress
          ? `Enviando resultados · ${processed}/${cycle.queued}`
          : withErrors
            ? hasRetryableFailures
              ? `Reintentar ${cycle.failed} correo(s) fallido(s)`
              : `Revisar ${cycle.unknown} entrega(s) sin confirmar`
            : closed
              ? `Proceso ${cycle.academicYear} finalizado`
              : `Terminar proceso ${cycle.academicYear} y enviar resultados`}
      </button>

      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={withErrors
          ? hasRetryableFailures ? 'Reintentar correos fallidos' : 'Entregas que requieren revisión'
          : `Terminar proceso de admisión ${cycle.academicYear}`}
        size="lg"
        closeDisabled={submitting}
      >
        <div className="space-y-6">
          <div className="flex items-start gap-4 rounded-xl bg-red-50 p-4 text-red-950">
            <AlertTriangle className="mt-0.5 h-6 w-6 shrink-0 text-red-700" aria-hidden="true" />
            <div>
              <p className="font-bold">
                {withErrors
                  ? hasRetryableFailures
                    ? 'Solo se reintentarán los envíos que fallaron de forma confirmada.'
                    : 'Hay entregas ambiguas que requieren revisión manual.'
                  : 'Esta acción cierra el ciclo y libera todos los resultados.'}
              </p>
              <p className="mt-1 text-sm leading-6 text-red-900">
                {withErrors
                  ? hasRetryableFailures
                    ? 'Los correos enviados y las entregas ambiguas no serán procesados nuevamente.'
                    : 'Por seguridad no se reenviarán automáticamente: primero confirma su estado directamente en Resend.'
                  : 'Después de confirmar no se podrán crear ni modificar postulaciones de este año. El envío continuará aunque cierres esta ventana.'}
              </p>
            </div>
          </div>

          <dl className="divide-y divide-gray-200 rounded-xl border border-gray-200 bg-white px-4">
            <div className="flex items-center justify-between gap-4 py-3 text-sm">
              <dt className="text-gray-600">Postulaciones del ciclo</dt>
              <dd className="font-bold text-gray-950">{cycle.totalApplications}</dd>
            </div>
            <div className="flex items-center justify-between gap-4 py-3 text-sm">
              <dt className="text-gray-600">Resultados enviados</dt>
              <dd className="font-bold text-emerald-700">{cycle.sent}</dd>
            </div>
            <div className="flex items-center justify-between gap-4 py-3 text-sm">
              <dt className="text-gray-600">Pendientes o en proceso</dt>
              <dd className="font-bold text-gray-950">{cycle.pending + cycle.processing}</dd>
            </div>
            {withErrors && (
              <div className="flex items-center justify-between gap-4 py-3 text-sm">
                <dt className="text-gray-600">Entregas sin confirmar</dt>
                <dd className="font-bold text-amber-800">{cycle.unknown}</dd>
              </div>
            )}
          </dl>

          {!withErrors && blockers.length > 0 && (
            <div className="rounded-xl bg-amber-50 p-4 text-amber-950" role="alert">
              <p className="font-bold">Antes de cerrar debes resolver:</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6">
                {blockers.map((blocker) => <li key={blocker}>{blocker}</li>)}
              </ul>
            </div>
          )}

          {!withErrors && (
            <div>
              <label htmlFor="admission-cycle-confirmation" className="block text-sm font-bold text-gray-900">
                Para confirmar, escribe exactamente:
              </label>
              <p className="mt-2 select-all rounded-lg bg-gray-100 px-3 py-2 text-sm font-semibold text-gray-900">
                {cycle.confirmationPhrase}
              </p>
              <input
                id="admission-cycle-confirmation"
                type="text"
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                autoComplete="off"
                spellCheck={false}
                disabled={submitting || blockers.length > 0}
                aria-invalid={confirmation.length > 0 && !exactConfirmation}
                className="mt-3 min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-base text-gray-950 outline-none transition focus:border-red-600 focus:ring-2 focus:ring-red-100 disabled:cursor-not-allowed disabled:bg-gray-100"
              />
              {confirmation.length > 0 && !exactConfirmation && (
                <p className="mt-2 text-sm font-medium text-red-700">El texto todavía no coincide.</p>
              )}
            </div>
          )}

          {error && <p className="rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-800" role="alert">{error}</p>}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button type="button" onClick={closeModal} disabled={submitting} className="min-h-11 rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-bold text-gray-800 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2 disabled:opacity-50">
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => void submit()}
              disabled={submitting || (withErrors ? !hasRetryableFailures : !canSubmitClose)}
              className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-45 ${
                withErrors ? 'bg-amber-700 hover:bg-amber-800 focus-visible:ring-amber-600' : 'bg-red-700 hover:bg-red-800 focus-visible:ring-red-600'
              }`}
            >
              {submitting && <LoaderCircle className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />}
              {submitting
                ? 'Procesando…'
                : withErrors
                  ? hasRetryableFailures ? 'Reintentar fallidos' : 'Sin reintento automático'
                  : 'Cerrar proceso y liberar correos'}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default AdmissionCycleCloseControl;
