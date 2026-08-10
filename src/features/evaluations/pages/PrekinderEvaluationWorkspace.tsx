import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Activity,
    Brain,
    CalendarDays,
    ChevronRight,
    ClipboardCheck,
    GraduationCap,
    LogIn,
    RefreshCw,
    ShieldCheck,
    UsersRound,
    type LucideIcon,
} from 'lucide-react';
import {
    ApiError,
    prekinderApi,
    type EvaluationInstrument,
    type EvaluatorAssignment,
    type EvaluatorWorkspace,
} from '../../prekinder/services/api';
import { usePrekinderRealtimeSync } from '../../prekinder/hooks/usePrekinderRealtimeSync';

const SANTIAGO_TIME_ZONE = 'America/Santiago';
const finishedStatuses = new Set(['COMPLETED', 'SUBMITTED', 'VALIDATED', 'LOCKED']);

const instrumentIcons: Record<string, LucideIcon> = {
    ACADEMIC: GraduationCap,
    PSYCHOMOTOR: Activity,
    PSYCHOLOGY: Brain,
    ENTRY_INDICATORS: LogIn,
    GROUP_OBSERVATION: UsersRound,
    LEARNING_SUPPORT: ClipboardCheck,
    DAP: ShieldCheck,
};

function today(): string {
    return new Intl.DateTimeFormat('en-CA', { timeZone: SANTIAGO_TIME_ZONE }).format(new Date());
}

function time(iso: string): string {
    return new Intl.DateTimeFormat('es-CL', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: SANTIAGO_TIME_ZONE,
    }).format(new Date(iso));
}

function statusLabel(status: string): string {
    return ({
        ACTIVE: 'Por confirmar',
        CONFIRMED: 'Grupo confirmado',
        IN_PROGRESS: 'En evaluación',
        SUBMITTED: 'En revisión',
        COMPLETED: 'Completada',
    } as Record<string, string>)[status] ?? status;
}

function pendingReports(assignment: EvaluatorAssignment): number {
    return assignment.reports.filter((report) => !finishedStatuses.has(report.status)).length;
}

export default function PrekinderEvaluationWorkspace() {
    const navigate = useNavigate();
    const [date, setDate] = useState(today());
    const [workspace, setWorkspace] = useState<EvaluatorWorkspace | null>(null);
    const [selectedInstrument, setSelectedInstrument] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    async function load(silent = false) {
        if (!silent) setLoading(true);
        setError('');
        try {
            const next = await prekinderApi.evaluatorWorkspace(date);
            setWorkspace(next);
            setSelectedInstrument((current) =>
                next.instruments.some((item) => item.instrument.instrumentCode === current)
                    ? current
                    : next.instruments[0]?.instrument.instrumentCode ?? '',
            );
        } catch (reason) {
            if (!silent) setWorkspace(null);
            setError(
                reason instanceof ApiError && reason.status === 403
                    ? 'Tu cuenta no tiene acceso de evaluación Prekínder. Coordinación debe asignarte un rol y un instrumento para este proceso.'
                    : reason instanceof Error
                        ? reason.message
                        : 'No pudimos cargar tu jornada Prekínder.',
            );
        } finally {
            if (!silent) setLoading(false);
        }
    }

    const realtimeState = usePrekinderRealtimeSync(workspace?.actorId, () => {
        void load(true);
    });

    useEffect(() => {
        void load();
    }, [date]);

    const selected = workspace?.instruments.find(
        (item) => item.instrument.instrumentCode === selectedInstrument,
    );
    const totals = useMemo(() => {
        const assignments = workspace?.instruments.flatMap((item) => item.assignments) ?? [];
        const reports = assignments.flatMap((assignment) => assignment.reports);
        return {
            blocks: assignments.length,
            applicants: reports.length,
            pending: reports.filter((report) => !finishedStatuses.has(report.status)).length,
        };
    }, [workspace]);

    return (
        <div className="space-y-6">
            <section className="rounded-xl border border-blue-200 bg-blue-50 p-5">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                    <div className="min-w-0">
                        <h1 className="text-2xl font-bold text-gray-950">Jornada de evaluación Prekínder</h1>
                        <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-700">
                            Aquí conviven tus evaluaciones de Prekínder con el portal habitual. Sólo aparecen las disciplinas y bloques que coordinación te asignó para esta jornada.
                        </p>
                    </div>
                    <span className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${realtimeState === 'live' ? 'bg-emerald-100 text-emerald-800' : realtimeState === 'connecting' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-900'}`} role="status">
                        {realtimeState === 'live' ? 'Sincronización en vivo' : realtimeState === 'connecting' ? 'Conectando tiempo real…' : 'Modo seguro · reintentando'}
                    </span>
                    <div className="flex flex-wrap items-end gap-2">
                        <label className="text-sm font-semibold text-gray-700">
                            Fecha de jornada
                            <span className="mt-1 flex min-h-11 items-center gap-2 rounded-lg border border-gray-300 bg-white px-3">
                                <CalendarDays className="h-4 w-4 text-gray-500" aria-hidden="true" />
                                <input
                                    type="date"
                                    value={date}
                                    onChange={(event) => setDate(event.target.value)}
                                    className="min-w-0 bg-transparent text-base outline-none"
                                />
                            </span>
                        </label>
                        <button
                            type="button"
                            onClick={() => void load()}
                            disabled={loading}
                            className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-azul-monte-tabor px-4 text-sm font-semibold text-white hover:bg-blue-950 focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:opacity-60"
                        >
                            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
                            Actualizar
                        </button>
                    </div>
                </div>
            </section>

            {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-900" role="alert">
                    {error}
                    <button type="button" className="ml-2 underline underline-offset-4" onClick={() => void load()}>
                        Reintentar
                    </button>
                </div>
            )}

            {(realtimeState === 'degraded' || realtimeState === 'closed') && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-950" role="status">
                    El canal en vivo está interrumpido. Las acciones siguen guardándose en el backend y la pantalla se resincronizará al recuperar la conexión.
                </div>
            )}

            {!loading && workspace && workspace.instruments.length === 0 && (
                <section className="rounded-xl border border-gray-200 bg-white px-6 py-12 text-center">
                    <ClipboardCheck className="mx-auto h-10 w-10 text-gray-300" aria-hidden="true" />
                    <h2 className="mt-4 text-lg font-bold text-gray-900">No tienes instrumentos asignados</h2>
                    <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-gray-600">
                        Tu sesión está activa, pero coordinación aún no ha asociado tu perfil profesional a una disciplina de Prekínder para este proceso.
                    </p>
                </section>
            )}

            {workspace && workspace.instruments.length > 0 && (
                <>
                    <dl className="grid overflow-hidden rounded-xl border border-gray-200 bg-white sm:grid-cols-3">
                        <Summary value={totals.blocks} label="Bloques asignados" />
                        <Summary value={totals.applicants} label="Registros individuales" />
                        <Summary value={totals.pending} label="Evaluaciones pendientes" emphasize={totals.pending > 0} />
                    </dl>

                    <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                        <div className="border-b border-gray-200 p-4">
                            <h2 className="font-bold text-gray-950">Tus disciplinas habilitadas</h2>
                            <p className="mt-1 text-sm text-gray-600">El rol y la autorización del proceso determinan qué instrumentos puedes abrir.</p>
                        </div>
                        <div className="flex gap-2 overflow-x-auto p-3" role="tablist" aria-label="Disciplinas Prekínder">
                            {workspace.instruments.map(({ instrument, assignments }) => {
                                const Icon = instrumentIcons[instrument.instrumentCode] ?? ClipboardCheck;
                                const selectedTab = instrument.instrumentCode === selectedInstrument;
                                return (
                                    <button
                                        key={instrument.instrumentCode}
                                        type="button"
                                        role="tab"
                                        aria-selected={selectedTab}
                                        onClick={() => setSelectedInstrument(instrument.instrumentCode)}
                                        className={`flex min-h-12 shrink-0 items-center gap-2 rounded-lg px-4 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-blue-300 ${selectedTab ? 'bg-azul-monte-tabor text-white' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'}`}
                                    >
                                        <Icon className="h-4 w-4" aria-hidden="true" />
                                        {instrument.displayName}
                                        <span className={`rounded-full px-2 py-0.5 text-xs ${selectedTab ? 'bg-white/15 text-white' : 'bg-white text-gray-600'}`}>
                                            {assignments.length}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </section>

                    {selected && (
                        <InstrumentAgenda
                            instrument={selected.instrument}
                            assignments={selected.assignments}
                            date={date}
                            onOpen={(assignment) =>
                                navigate(`/profesor/prekinder/${selected.instrument.instrumentCode}/grupo/${assignment.group.groupId}?date=${encodeURIComponent(date)}`)
                            }
                        />
                    )}
                </>
            )}

            {loading && !workspace && (
                <div className="flex min-h-56 items-center justify-center rounded-xl border border-gray-200 bg-white" role="status">
                    <RefreshCw className="mr-3 h-5 w-5 animate-spin text-azul-monte-tabor" aria-hidden="true" />
                    Cargando asignaciones de la jornada…
                </div>
            )}
        </div>
    );
}

function Summary({ value, label, emphasize = false }: { value: number; label: string; emphasize?: boolean }) {
    return (
        <div className="border-b border-gray-200 p-5 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0">
            <dt className="text-sm text-gray-600">{label}</dt>
            <dd className={`mt-1 text-2xl font-bold ${emphasize ? 'text-amber-700' : 'text-gray-950'}`}>{value}</dd>
        </div>
    );
}

function InstrumentAgenda({
    instrument,
    assignments,
    date,
    onOpen,
}: {
    instrument: EvaluationInstrument;
    assignments: EvaluatorAssignment[];
    date: string;
    onOpen: (assignment: EvaluatorAssignment) => void;
}) {
    return (
        <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            <div className="border-b border-gray-200 px-5 py-4">
                <h2 className="text-lg font-bold text-gray-950">Agenda · {instrument.displayName}</h2>
                <p className="mt-1 text-sm text-gray-600">
                    {instrument.captureMode === 'GROUP_PARALLEL'
                        ? 'Captura grupal con un resultado individual por postulante.'
                        : instrument.captureMode === 'DERIVED_INDIVIDUAL'
                            ? 'Atención individual para casos derivados y autorizados.'
                            : 'Evaluación individual con acceso restringido.'}
                </p>
            </div>
            {assignments.length === 0 ? (
                <div className="px-6 py-10 text-center">
                    <CalendarDays className="mx-auto h-9 w-9 text-gray-300" aria-hidden="true" />
                    <p className="mt-3 font-semibold text-gray-800">Sin bloques para {date}</p>
                    <p className="mt-1 text-sm text-gray-500">La disciplina está habilitada, pero no tiene grupos asignados en esta fecha.</p>
                </div>
            ) : (
                <div className="divide-y divide-gray-100">
                    {assignments.map((assignment) => {
                        const pending = pendingReports(assignment);
                        return (
                            <button
                                key={assignment.assignmentId}
                                type="button"
                                onClick={() => onOpen(assignment)}
                                className="grid min-h-24 w-full items-center gap-3 px-5 py-4 text-left hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-300 md:grid-cols-[120px_1fr_auto]"
                            >
                                <span className="font-bold text-gray-950">
                                    {time(assignment.group.startsAt)}
                                    <small className="block text-xs font-medium text-gray-500">hasta {time(assignment.group.endsAt)}</small>
                                </span>
                                <span className="min-w-0">
                                    <strong className="block truncate text-gray-950">{assignment.group.code} · {assignment.group.roomName}</strong>
                                    <small className="mt-1 block text-gray-600">
                                        {assignment.reports.length} postulante{assignment.reports.length === 1 ? '' : 's'} · {pending} pendiente{pending === 1 ? '' : 's'}
                                    </small>
                                </span>
                                <span className="flex items-center justify-between gap-3 md:justify-end">
                                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${pending === 0 ? 'bg-emerald-50 text-emerald-800' : assignment.status === 'IN_PROGRESS' ? 'bg-amber-50 text-amber-800' : 'bg-blue-50 text-blue-800'}`}>
                                        {statusLabel(assignment.status)}
                                    </span>
                                    <ChevronRight className="h-5 w-5 text-gray-400" aria-hidden="true" />
                                </span>
                            </button>
                        );
                    })}
                </div>
            )}
        </section>
    );
}
