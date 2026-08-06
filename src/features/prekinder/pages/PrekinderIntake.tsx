import { FormEvent, type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, CalendarDays, CheckCircle2, CircleAlert, ClipboardList,
  FilePlus2, LockKeyhole, RefreshCw, Search, ShieldCheck, UserPlus, UsersRound,
} from 'lucide-react';
import { useAuthStore } from '../../../packages/backend-sdk/src/auth/store';
import {
  type AdmissionProcess, type PrekinderApplication, prekinderApi,
} from '../services/api';

type ApplicantDraft = {
  rut: string;
  firstName: string;
  paternalLastName: string;
  maternalLastName: string;
};

const EMPTY_APPLICANT: ApplicantDraft = {
  rut: '', firstName: '', paternalLastName: '', maternalLastName: '',
};

export function PrekinderIntake() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const [processes, setProcesses] = useState<AdmissionProcess[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [applications, setApplications] = useState<PrekinderApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [showProcessForm, setShowProcessForm] = useState(false);
  const [showApplicantForm, setShowApplicantForm] = useState(false);
  const [year, setYear] = useState(2027);
  const [processName, setProcessName] = useState('Admisión Prekínder 2027');
  const [startsAt, setStartsAt] = useState(localDateTime(new Date()));
  const [endsAt, setEndsAt] = useState(localDateTime(new Date('2026-12-31T23:59:00')));
  const [applicant, setApplicant] = useState<ApplicantDraft>(EMPTY_APPLICANT);

  const selected = processes.find((process) => process.processId === selectedId) ?? null;

  const loadProcesses = useCallback(async () => {
    setError(null);
    try {
      const data = await prekinderApi.processes();
      setProcesses(data);
      setSelectedId((current) => current && data.some((item) => item.processId === current)
        ? current : data[0]?.processId ?? null);
      if (!data.length) setShowProcessForm(true);
    } catch (reason) {
      setError(message(reason, 'No pudimos cargar la configuración de Prekínder.'));
    } finally {
      setLoading(false);
    }
  }, []);

  const loadApplications = useCallback(async (processId: string) => {
    try {
      setApplications(await prekinderApi.applications(processId));
    } catch (reason) {
      setError(message(reason, 'No pudimos cargar las postulaciones.'));
    }
  }, []);

  useEffect(() => { void loadProcesses(); }, [loadProcesses]);
  useEffect(() => {
    if (selectedId) void loadApplications(selectedId);
    else setApplications([]);
  }, [selectedId, loadApplications]);

  const filteredApplications = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return applications;
    return applications.filter(({ identity, applicationId }) =>
      `${identity.rut} ${identity.firstName} ${identity.paternalLastName} ${identity.maternalLastName} ${applicationId}`
        .toLowerCase().includes(term));
  }, [applications, search]);

  async function createProcess(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError(null); setNotice(null);
    try {
      const created = await prekinderApi.createProcess(year, processName.trim());
      await loadProcesses();
      setSelectedId(created.processId);
      setShowProcessForm(false);
      setNotice('Proceso creado como borrador. Ahora define el periodo y habilita el ingreso.');
    } catch (reason) {
      setError(message(reason, 'No pudimos crear el proceso.'));
    } finally { setBusy(false); }
  }

  async function publishProcess() {
    if (!selected || busy) return;
    setBusy(true); setError(null); setNotice(null);
    try {
      const published = await prekinderApi.publishProcess(
        selected.processId, new Date(startsAt).toISOString(), new Date(endsAt).toISOString(),
      );
      setProcesses((current) => current.map((item) => item.processId === published.processId ? published : item));
      setNotice(published.acceptingApplications
        ? 'Ingreso habilitado. Ya puedes registrar la primera postulación.'
        : 'Proceso publicado. El ingreso se abrirá automáticamente en la fecha indicada.');
    } catch (reason) {
      setError(message(reason, 'No pudimos habilitar el proceso. Revisa las fechas.'));
    } finally { setBusy(false); }
  }

  async function createApplication(event: FormEvent) {
    event.preventDefault();
    if (!selected || busy) return;
    setBusy(true); setError(null); setNotice(null);
    try {
      await prekinderApi.createApplication({ processId: selected.processId, ...applicant });
      await Promise.all([loadApplications(selected.processId), loadProcesses()]);
      setApplicant(EMPTY_APPLICANT);
      setShowApplicantForm(false);
      setNotice('Postulación creada en estado borrador y guardada en la base exclusiva de Prekínder.');
    } catch (reason) {
      setError(message(reason, 'No pudimos registrar la postulación. Los datos siguen en el formulario.'));
    } finally { setBusy(false); }
  }

  return (
    <div className="min-h-screen bg-[#f4f1e9] text-slate-950">
      <header className="bg-[#102b57] text-white shadow-[0_10px_30px_rgba(15,23,42,0.16)]">
        <div className="mx-auto flex min-h-20 max-w-[1500px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-4">
            <button onClick={() => navigate('/admin')} aria-label="Volver a administración" className="rounded-lg p-2 text-blue-100 transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-amber-300">
              <ArrowLeft size={20} />
            </button>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-bold tracking-[-0.02em] sm:text-2xl">Admisión Prekínder</h1>
              <p className="truncate text-sm text-blue-100">Apertura del proceso y registro de postulaciones</p>
            </div>
          </div>
          <div className="hidden text-right sm:block">
            <p className="text-sm font-semibold">{[user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Equipo de admisión'}</p>
            <p className="text-xs text-blue-100">Acceso administrador</p>
          </div>
        </div>
        <nav aria-label="Secciones de Prekínder" className="mx-auto flex max-w-[1500px] gap-1 overflow-x-auto px-4 sm:px-6 lg:px-8">
          <span aria-current="page" className="border-b-4 border-amber-300 px-4 py-3 text-sm font-bold">Postulaciones</span>
          <button onClick={() => navigate('/prekinder/evaluaciones')} className="px-4 py-3 text-sm font-semibold text-blue-100 transition hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-inset focus:ring-amber-300">Evaluaciones</button>
        </nav>
      </header>

      <main className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        {error && <Banner kind="error" text={error} onClose={() => setError(null)} />}
        {notice && <Banner kind="success" text={notice} onClose={() => setNotice(null)} />}

        <section className="mb-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
          <div>
            <h2 className="max-w-3xl text-3xl font-bold tracking-[-0.03em] text-blue-950 sm:text-4xl">Abre el proceso antes de recibir postulaciones</h2>
            <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">El flujo comienza aquí: crea el proceso del año, publica su periodo de ingreso y registra cada postulante. Nada de esta sección escribe en la base legacy.</p>
          </div>
          <button onClick={() => setShowProcessForm((value) => !value)} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-blue-900 px-5 py-3 text-sm font-bold text-white shadow-[0_9px_22px_rgba(30,58,138,0.24)] transition hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-700 focus:ring-offset-2">
            <FilePlus2 size={19} /> {showProcessForm ? 'Ocultar creación' : 'Crear proceso'}
          </button>
        </section>

        {showProcessForm && (
          <form onSubmit={createProcess} className="mb-8 rounded-2xl bg-white p-5 shadow-[0_14px_38px_rgba(15,23,42,0.09)] sm:p-7">
            <div className="grid gap-5 md:grid-cols-[180px_minmax(0,1fr)_auto] md:items-end">
              <Field label="Año académico" htmlFor="process-year">
                <input id="process-year" type="number" min={2027} max={2100} required value={year} onChange={(event) => setYear(Number(event.target.value))} className={inputClass} />
              </Field>
              <Field label="Nombre del proceso" htmlFor="process-name">
                <input id="process-name" maxLength={160} required value={processName} onChange={(event) => setProcessName(event.target.value)} className={inputClass} />
              </Field>
              <button disabled={busy} className={primaryButtonClass}>{busy ? <RefreshCw className="animate-spin" size={18} /> : <FilePlus2 size={18} />}Crear borrador</button>
            </div>
          </form>
        )}

        {loading ? <LoadingState /> : !processes.length ? <NoProcessState onCreate={() => setShowProcessForm(true)} /> : (
          <div className="grid gap-6 xl:grid-cols-[310px_minmax(0,1fr)]">
            <aside className="self-start overflow-hidden rounded-2xl bg-white shadow-[0_12px_34px_rgba(15,23,42,0.08)] xl:sticky xl:top-6">
              <div className="border-b border-slate-200 px-5 py-4">
                <h3 className="font-bold">Procesos</h3>
                <p className="mt-1 text-xs text-slate-600">Selecciona el año que vas a operar.</p>
              </div>
              {processes.map((process) => (
                <button key={process.processId} onClick={() => setSelectedId(process.processId)} className={`w-full border-b border-slate-100 px-5 py-4 text-left transition focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-700 ${selectedId === process.processId ? 'bg-blue-50' : 'hover:bg-slate-50'}`}>
                  <span className="flex items-center justify-between gap-3">
                    <span className="font-semibold">{process.name}</span>
                    <Status status={process.status} accepting={process.acceptingApplications} />
                  </span>
                  <span className="mt-2 block text-xs text-slate-600">{process.applicationCount} postulaciones</span>
                </button>
              ))}
            </aside>

            {selected && (
              <section className="min-w-0">
                <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h3 className="text-2xl font-bold tracking-[-0.025em] text-blue-950">{selected.name}</h3>
                    <p className="mt-2 text-sm text-slate-600">{selected.status === 'DRAFT' ? 'Completa el periodo para habilitar el ingreso.' : publicationWindow(selected)}</p>
                  </div>
                  {selected.acceptingApplications && (
                    <button onClick={() => setShowApplicantForm((value) => !value)} className={primaryButtonClass}>
                      <UserPlus size={18} />{showApplicantForm ? 'Cerrar formulario' : 'Ingresar postulación'}
                    </button>
                  )}
                </div>

                {selected.status === 'DRAFT' && (
                  <div className="mb-6 overflow-hidden rounded-2xl bg-[#fffdf8] shadow-[0_12px_34px_rgba(15,23,42,0.08)]">
                    <div className="border-b border-amber-200 bg-amber-50 px-5 py-4">
                      <h4 className="flex items-center gap-2 font-bold text-amber-950"><CalendarDays size={19} />Periodo de postulación</h4>
                      <p className="mt-1 text-sm text-amber-900">Publicar habilita el ingreso sólo durante estas fechas.</p>
                    </div>
                    <div className="grid gap-5 p-5 md:grid-cols-2">
                      <Field label="Apertura" htmlFor="starts-at"><input id="starts-at" type="datetime-local" required value={startsAt} onChange={(event) => setStartsAt(event.target.value)} className={inputClass} /></Field>
                      <Field label="Cierre" htmlFor="ends-at"><input id="ends-at" type="datetime-local" required value={endsAt} onChange={(event) => setEndsAt(event.target.value)} className={inputClass} /></Field>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 px-5 py-4">
                      <p className="flex max-w-xl items-center gap-2 text-xs leading-5 text-slate-600"><ShieldCheck className="shrink-0 text-emerald-700" size={18} />La publicación queda auditada. Después de publicar, este endpoint no permite una segunda habilitación accidental.</p>
                      <button type="button" onClick={() => void publishProcess()} disabled={busy || !startsAt || !endsAt} className={primaryButtonClass}>{busy ? <RefreshCw className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}Habilitar ingreso</button>
                    </div>
                  </div>
                )}

                {showApplicantForm && selected.acceptingApplications && (
                  <form onSubmit={createApplication} className="mb-6 rounded-2xl bg-white p-5 shadow-[0_14px_38px_rgba(15,23,42,0.09)] sm:p-7">
                    <div className="mb-5">
                      <h4 className="text-lg font-bold">Nueva postulación</h4>
                      <p className="mt-1 text-sm text-slate-600">Se crea como borrador. El RUT y los nombres se cifran antes de persistir.</p>
                    </div>
                    <div className="grid gap-5 sm:grid-cols-2">
                      <Field label="RUT del postulante" htmlFor="applicant-rut"><input id="applicant-rut" required maxLength={16} placeholder="12.345.678-5" value={applicant.rut} onChange={(event) => setApplicant({ ...applicant, rut: event.target.value })} className={inputClass} /></Field>
                      <Field label="Nombres" htmlFor="applicant-name"><input id="applicant-name" required maxLength={100} value={applicant.firstName} onChange={(event) => setApplicant({ ...applicant, firstName: event.target.value })} className={inputClass} /></Field>
                      <Field label="Apellido paterno" htmlFor="applicant-paternal"><input id="applicant-paternal" required maxLength={100} value={applicant.paternalLastName} onChange={(event) => setApplicant({ ...applicant, paternalLastName: event.target.value })} className={inputClass} /></Field>
                      <Field label="Apellido materno" htmlFor="applicant-maternal"><input id="applicant-maternal" maxLength={100} value={applicant.maternalLastName} onChange={(event) => setApplicant({ ...applicant, maternalLastName: event.target.value })} className={inputClass} /></Field>
                    </div>
                    <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
                      <p className="flex items-center gap-2 text-xs text-slate-600"><LockKeyhole size={17} className="text-emerald-700" />El sistema impide dos postulaciones con el mismo RUT en este proceso.</p>
                      <button disabled={busy} className={primaryButtonClass}>{busy ? <RefreshCw className="animate-spin" size={18} /> : <UserPlus size={18} />}Crear postulación</button>
                    </div>
                  </form>
                )}

                <div className="overflow-hidden rounded-2xl bg-white shadow-[0_12px_34px_rgba(15,23,42,0.08)]">
                  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 p-5">
                    <div><h4 className="font-bold">Postulaciones ingresadas</h4><p className="mt-1 text-xs text-slate-600">{applications.length} registros en la base Prekínder</p></div>
                    <label className="relative block w-full sm:w-72"><span className="sr-only">Buscar postulación</span><Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por RUT, nombre o folio" className={`${inputClass} pl-9`} /></label>
                  </div>
                  {!applications.length ? (
                    <div className="px-6 py-14 text-center"><UsersRound className="mx-auto text-slate-300" size={38} /><h5 className="mt-4 font-bold">Todavía no hay postulaciones</h5><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">{selected.acceptingApplications ? 'Ingresa la primera postulación con el botón superior.' : 'Primero habilita el proceso para comenzar el registro.'}</p></div>
                  ) : !filteredApplications.length ? (
                    <div className="px-6 py-12 text-center"><Search className="mx-auto text-slate-300" size={34} /><p className="mt-3 font-semibold">No encontramos coincidencias</p><button onClick={() => setSearch('')} className="mt-2 text-sm font-bold text-blue-800 underline underline-offset-4">Limpiar búsqueda</button></div>
                  ) : (
                    <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600"><tr><th className="px-5 py-3 font-bold">Postulante</th><th className="px-5 py-3 font-bold">RUT</th><th className="px-5 py-3 font-bold">Folio</th><th className="px-5 py-3 font-bold">Estado</th><th className="px-5 py-3 font-bold">Ingreso</th></tr></thead><tbody className="divide-y divide-slate-100">{filteredApplications.map((application) => <ApplicationRow key={application.applicationId} application={application} />)}</tbody></table></div>
                  )}
                  <div className="flex justify-end border-t border-slate-200 p-4"><button onClick={() => navigate('/prekinder/evaluaciones')} className="inline-flex items-center gap-2 text-sm font-bold text-blue-900 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-700">Ir a evaluaciones <ArrowRight size={17} /></button></div>
                </div>
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: ReactNode }) {
  return <label htmlFor={htmlFor} className="block"><span className="mb-2 block text-sm font-semibold text-slate-800">{label}</span>{children}</label>;
}

function Status({ status, accepting }: { status: AdmissionProcess['status']; accepting: boolean }) {
  const label = accepting ? 'Abierto' : status === 'DRAFT' ? 'Borrador' : status === 'PUBLISHED' ? 'Programado' : 'Cerrado';
  const color = accepting ? 'bg-emerald-100 text-emerald-900' : status === 'DRAFT' ? 'bg-amber-100 text-amber-950' : 'bg-slate-100 text-slate-700';
  return <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${color}`}>{label}</span>;
}

function ApplicationRow({ application }: { application: PrekinderApplication }) {
  const fullName = [application.identity.firstName, application.identity.paternalLastName, application.identity.maternalLastName].filter(Boolean).join(' ');
  return <tr className="hover:bg-slate-50"><td className="px-5 py-4 font-semibold text-slate-900">{fullName}</td><td className="px-5 py-4 tabular-nums text-slate-700">{application.identity.rut}</td><td className="px-5 py-4 font-medium text-blue-900">{application.applicationId.slice(0, 8).toUpperCase()}</td><td className="px-5 py-4"><span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-900">Borrador</span></td><td className="px-5 py-4 text-slate-600">{new Intl.DateTimeFormat('es-CL', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(application.createdAt))}</td></tr>;
}

function Banner({ kind, text, onClose }: { kind: 'error' | 'success'; text: string; onClose: () => void }) {
  const isError = kind === 'error';
  return <div role={isError ? 'alert' : 'status'} className={`mb-6 flex items-start justify-between gap-4 rounded-xl px-4 py-3 text-sm ${isError ? 'bg-red-50 text-red-950' : 'bg-emerald-50 text-emerald-950'}`}><span className="flex items-start gap-2">{isError ? <CircleAlert className="mt-0.5 shrink-0" size={18} /> : <CheckCircle2 className="mt-0.5 shrink-0" size={18} />}{text}</span><button onClick={onClose} className="shrink-0 font-bold underline underline-offset-4">Cerrar</button></div>;
}

function LoadingState() {
  return <div className="flex min-h-72 items-center justify-center gap-3 rounded-2xl bg-white text-sm font-semibold text-slate-700 shadow-[0_12px_34px_rgba(15,23,42,0.08)]"><RefreshCw className="animate-spin text-blue-900" size={22} />Cargando procesos…</div>;
}

function NoProcessState({ onCreate }: { onCreate: () => void }) {
  return <div className="rounded-2xl bg-white px-6 py-16 text-center shadow-[0_12px_34px_rgba(15,23,42,0.08)]"><ClipboardList className="mx-auto text-blue-900" size={42} /><h3 className="mt-5 text-xl font-bold">La base Prekínder está lista y vacía</h3><p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-600">Crea el proceso 2027 para definir su periodo y habilitar el ingreso de postulaciones.</p><button onClick={onCreate} className={`${primaryButtonClass} mt-6`}><FilePlus2 size={18} />Crear primer proceso</button></div>;
}

function publicationWindow(process: AdmissionProcess) {
  if (!process.startsAt || !process.endsAt) return 'Proceso publicado';
  const formatter = new Intl.DateTimeFormat('es-CL', { dateStyle: 'medium', timeStyle: 'short' });
  return `${process.acceptingApplications ? 'Ingreso abierto' : 'Periodo programado'} · ${formatter.format(new Date(process.startsAt))} al ${formatter.format(new Date(process.endsAt))}`;
}

function localDateTime(date: Date) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function message(reason: unknown, fallback: string) {
  return reason instanceof Error ? reason.message : fallback;
}

const inputClass = 'min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition placeholder:text-slate-500 focus:border-blue-700 focus:ring-2 focus:ring-blue-700/15';
const primaryButtonClass = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-900 px-5 py-2.5 text-sm font-bold text-white shadow-[0_8px_18px_rgba(30,58,138,0.22)] transition hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-700 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none';
