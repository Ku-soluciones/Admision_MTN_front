import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Clock3, MapPin, RefreshCw, UserRound } from 'lucide-react';
import {
    prekinderApi,
    type EvaluationInstrument,
    type EvaluatorAssignment,
} from '../../prekinder/services/api';
import { usePrekinderRealtimeSync } from '../../prekinder/hooks/usePrekinderRealtimeSync';

const finishedStatuses = new Set(['COMPLETED', 'SUBMITTED', 'VALIDATED', 'LOCKED']);

function today(): string {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(new Date());
}

function time(iso: string): string {
    return new Intl.DateTimeFormat('es-CL', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'America/Santiago',
    }).format(new Date(iso));
}

function initials(name: string): string {
    return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0] ?? '').join('').toUpperCase();
}

type GroupView = { assignment: EvaluatorAssignment; instrument: EvaluationInstrument };

export default function PrekinderEvaluationGroup() {
    const { instrumentCode = '', groupId = '' } = useParams();
    const [searchParams] = useSearchParams();
    const date = searchParams.get('date') || today();
    const navigate = useNavigate();
    const [view, setView] = useState<GroupView | null>(null);
    const [actorId, setActorId] = useState('');
    const [loading, setLoading] = useState(true);
    const [changing, setChanging] = useState(false);
    const [error, setError] = useState('');

    const returnTo = `/profesor?section=prekinder&instrument=${encodeURIComponent(instrumentCode.toUpperCase())}`;

    async function load(silent = false) {
        if (!silent) setLoading(true);
        setError('');
        try {
            const workspace = await prekinderApi.evaluatorWorkspace(date);
            setActorId(workspace.actorId);
            const instrumentAgenda = workspace.instruments.find(
                (item) => item.instrument.instrumentCode === instrumentCode.toUpperCase(),
            );
            const assignment = instrumentAgenda?.assignments.find((item) => item.group.groupId === groupId);
            if (!instrumentAgenda || !assignment) {
                setView(null);
                setError('Este grupo no forma parte de tus asignaciones para la fecha seleccionada.');
                return;
            }
            setView({ assignment, instrument: instrumentAgenda.instrument });
        } catch (reason) {
            if (!silent) setView(null);
            setError(reason instanceof Error ? reason.message : 'No pudimos cargar el bloque de evaluación.');
        } finally {
            if (!silent) setLoading(false);
        }
    }

    const realtimeState = usePrekinderRealtimeSync(actorId, () => {
        void load(true);
    });

    useEffect(() => {
        void load();
    }, [date, groupId, instrumentCode]);

    const completed = useMemo(
        () => view?.assignment.reports.filter((report) => finishedStatuses.has(report.status)).length ?? 0,
        [view],
    );
    const allCompleted = Boolean(view?.assignment.reports.length) && completed === view?.assignment.reports.length;

    async function transition(action: 'confirm' | 'start' | 'submit') {
        if (!view) return;
        setChanging(true);
        setError('');
        try {
            const next = action === 'confirm'
                ? await prekinderApi.confirmEvaluatorAssignment(view.assignment.assignmentId, view.assignment.version)
                : action === 'start'
                    ? await prekinderApi.startEvaluatorAssignment(view.assignment.assignmentId, view.assignment.version)
                    : await prekinderApi.submitEvaluatorAssignment(view.assignment.assignmentId, view.assignment.version);
            setView((current) => current ? { ...current, assignment: next } : current);
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : 'No pudimos actualizar el estado del bloque.');
        } finally {
            setChanging(false);
        }
    }

    function openReport(reportId: string) {
        const back = `/profesor/prekinder/${encodeURIComponent(instrumentCode)}/grupo/${encodeURIComponent(groupId)}?date=${encodeURIComponent(date)}`;
        navigate(`/profesor/prekinder/informe/${reportId}?returnTo=${encodeURIComponent(back)}`);
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="border-b border-gray-200 bg-white">
                <div className="mx-auto flex min-h-16 max-w-6xl items-center gap-3 px-4">
                    <button
                        type="button"
                        onClick={() => navigate(returnTo)}
                        className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-gray-200 px-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-300"
                    >
                        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                        Portal de profesores
                    </button>
                    <span className="ml-auto text-sm font-semibold text-azul-monte-tabor">Evaluación Prekínder</span>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${realtimeState === 'live' ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-900'}`} role="status">
                        {realtimeState === 'live' ? 'En vivo' : 'Reconectando'}
                    </span>
                </div>
            </header>
            <main className="mx-auto max-w-6xl space-y-6 px-4 py-7">
                {loading && (
                    <div className="flex min-h-60 items-center justify-center rounded-xl border border-gray-200 bg-white" role="status">
                        <RefreshCw className="mr-3 h-5 w-5 animate-spin text-azul-monte-tabor" aria-hidden="true" />
                        Cargando grupo asignado…
                    </div>
                )}
                {error && (
                    <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-900" role="alert">
                        {error}
                        <button type="button" className="ml-2 underline underline-offset-4" onClick={() => void load()}>Recargar</button>
                    </div>
                )}
                {!loading && view && (
                    <>
                        <section className="rounded-xl border border-gray-200 bg-white p-5">
                            <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                                <div>
                                    <p className="text-sm font-semibold text-blue-800">{view.instrument.displayName}</p>
                                    <h1 className="mt-1 text-2xl font-bold text-gray-950">{view.assignment.group.code}</h1>
                                    <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-gray-600">
                                        <span className="inline-flex items-center gap-2"><Clock3 className="h-4 w-4" />{time(view.assignment.group.startsAt)}–{time(view.assignment.group.endsAt)}</span>
                                        <span className="inline-flex items-center gap-2"><MapPin className="h-4 w-4" />{view.assignment.group.roomName}</span>
                                    </div>
                                </div>
                                <div className="text-left md:text-right">
                                    <p className="text-sm text-gray-600">Avance del bloque</p>
                                    <p className="mt-1 text-xl font-bold text-gray-950">{completed}/{view.assignment.reports.length}</p>
                                </div>
                            </div>
                        </section>

                        {view.assignment.status === 'ACTIVE' && (
                            <ActionPanel
                                title="Confirma el grupo antes de comenzar"
                                description="Verifica sala, horario y nómina. Esta confirmación deja trazabilidad de quién recibió el bloque."
                                button="Confirmar grupo"
                                busy={changing}
                                onAction={() => void transition('confirm')}
                            />
                        )}
                        {view.assignment.status === 'CONFIRMED' && (
                            <ActionPanel
                                title="Grupo confirmado"
                                description="Cuando los postulantes estén presentes, inicia la evaluación para habilitar la captura de las pautas."
                                button="Comenzar evaluación"
                                busy={changing}
                                onAction={() => void transition('start')}
                            />
                        )}

                        <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                            <div className="border-b border-gray-200 px-5 py-4">
                                <h2 className="text-lg font-bold text-gray-950">
                                    {view.instrument.captureMode === 'GROUP_PARALLEL' ? 'Postulantes del grupo' : 'Atenciones individuales'}
                                </h2>
                                <p className="mt-1 text-sm text-gray-600">
                                    Cada pauta se guarda como un resultado individual, incluso cuando la observación se realiza en grupo.
                                </p>
                            </div>
                            <div className="divide-y divide-gray-100">
                                {view.assignment.reports.map((report, index) => {
                                    const done = finishedStatuses.has(report.status);
                                    const canOpen = view.assignment.status === 'IN_PROGRESS' || done;
                                    return (
                                        <button
                                            key={report.reportId}
                                            type="button"
                                            disabled={!canOpen}
                                            onClick={() => openReport(report.reportId)}
                                            className="flex min-h-20 w-full items-center gap-4 px-5 py-4 text-left hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-300 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:opacity-60"
                                        >
                                            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-blue-50 text-sm font-bold text-blue-900">
                                                {initials(report.applicantName) || <UserRound className="h-5 w-5" />}
                                            </span>
                                            <span className="min-w-0 flex-1">
                                                <strong className="block truncate text-gray-950">{report.applicantName}</strong>
                                                <small className="text-gray-500">Postulante {index + 1} · {done ? 'Pauta completada' : canOpen ? 'Pauta pendiente' : 'Disponible al iniciar el bloque'}</small>
                                            </span>
                                            <span className={`rounded-full px-3 py-1 text-xs font-bold ${done ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'}`}>
                                                {done ? 'Completada' : 'Pendiente'}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </section>

                        {view.assignment.status === 'IN_PROGRESS' && allCompleted && (
                            <ActionPanel
                                title="Todas las pautas están completas"
                                description="Envía el bloque a revisión. Después de este paso no podrás modificar los informes sin una reapertura autorizada."
                                button="Enviar bloque a revisión"
                                busy={changing}
                                onAction={() => void transition('submit')}
                                success
                            />
                        )}
                        {['SUBMITTED', 'COMPLETED'].includes(view.assignment.status) && (
                            <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-900" role="status">
                                <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                                El bloque fue enviado correctamente y continúa en revisión.
                            </div>
                        )}
                    </>
                )}
            </main>
        </div>
    );
}

function ActionPanel({
    title,
    description,
    button,
    busy,
    onAction,
    success = false,
}: {
    title: string;
    description: string;
    button: string;
    busy: boolean;
    onAction: () => void;
    success?: boolean;
}) {
    return (
        <section className={`flex flex-col gap-4 rounded-xl border p-5 md:flex-row md:items-center md:justify-between ${success ? 'border-emerald-200 bg-emerald-50' : 'border-blue-200 bg-blue-50'}`}>
            <div>
                <h2 className="font-bold text-gray-950">{title}</h2>
                <p className="mt-1 max-w-3xl text-sm leading-6 text-gray-700">{description}</p>
            </div>
            <button
                type="button"
                disabled={busy}
                onClick={onAction}
                className="min-h-11 shrink-0 rounded-lg bg-azul-monte-tabor px-4 text-sm font-semibold text-white hover:bg-blue-950 focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:opacity-60"
            >
                {busy ? 'Actualizando…' : button}
            </button>
        </section>
    );
}
