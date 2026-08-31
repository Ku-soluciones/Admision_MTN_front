import { useEffect, useMemo, useState } from 'react';
import {
    BookOpenCheck,
    CheckCircle2,
    ClipboardList,
    RefreshCw,
    ShieldCheck,
    TriangleAlert,
} from 'lucide-react';
import {
    ApiError,
    prekinderApi,
    type EvaluatorRubric,
} from '../../prekinder/services/api';
import { usePrekinderRealtimeSync } from '../../prekinder/hooks/usePrekinderRealtimeSync';

type PrekinderRubricsViewProps = {
    actorId?: string;
};

const numberFormatter = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 2 });

export default function PrekinderRubricsView({ actorId }: PrekinderRubricsViewProps) {
    const [rubrics, setRubrics] = useState<EvaluatorRubric[]>([]);
    const [selectedVersionId, setSelectedVersionId] = useState('');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState('');

    async function load(silent = false) {
        if (silent) setRefreshing(true);
        else setLoading(true);
        setError('');
        try {
            const next = await prekinderApi.evaluatorRubrics();
            setRubrics(next);
            setSelectedVersionId((current) =>
                next.some((rubric) => rubric.versionId === current)
                    ? current
                    : next[0]?.versionId ?? '',
            );
        } catch (reason) {
            if (!silent) setRubrics([]);
            setError(
                reason instanceof ApiError && reason.status === 403
                    ? 'Tu cuenta no tiene una pauta Prekínder autorizada. Coordinación debe revisar tu rol y disciplina.'
                    : reason instanceof Error
                        ? reason.message
                        : 'No pudimos cargar tus pautas. Reintenta.',
            );
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }

    useEffect(() => {
        void load();
    }, []);

    const realtimeState = usePrekinderRealtimeSync(actorId, () => {
        void load(true);
    });
    const selected = useMemo(
        () => rubrics.find((rubric) => rubric.versionId === selectedVersionId) ?? rubrics[0],
        [rubrics, selectedVersionId],
    );

    return (
        <div className="space-y-6">
            <section className="rounded-xl border border-blue-200 bg-blue-50 p-5 sm:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="max-w-3xl">
                        <h1 className="text-2xl font-bold text-gray-950">Pautas de evaluación</h1>
                        <p className="mt-2 text-sm leading-6 text-blue-950/80">
                            Consulta la versión oficial que coordinación asoció a tu disciplina. Esta vista es sólo de lectura y coincide con la pauta utilizada al evaluar.
                        </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                        {actorId && (
                            <span
                                className={`rounded-full px-3 py-1 text-xs font-bold ${realtimeState === 'live' ? 'bg-emerald-100 text-emerald-900' : 'bg-amber-100 text-amber-950'}`}
                                role="status"
                            >
                                {realtimeState === 'live' ? 'Sincronizada' : 'Reconectando'}
                            </span>
                        )}
                        <button
                            type="button"
                            onClick={() => void load(true)}
                            disabled={loading || refreshing}
                            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-blue-300 bg-white px-4 text-sm font-bold text-blue-950 transition-colors hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:cursor-wait disabled:opacity-60"
                        >
                            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} aria-hidden="true" />
                            Actualizar
                        </button>
                    </div>
                </div>
            </section>

            {error && (
                <section className="rounded-xl border border-amber-300 bg-amber-50 p-5" role="alert">
                    <div className="flex gap-3">
                        <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-800" aria-hidden="true" />
                        <div>
                            <h2 className="font-bold text-amber-950">No pudimos actualizar las pautas</h2>
                            <p className="mt-1 text-sm leading-6 text-amber-950/80">{error}</p>
                            <button type="button" className="mt-3 text-sm font-bold text-amber-950 underline underline-offset-4" onClick={() => void load()}>
                                Intentar nuevamente
                            </button>
                        </div>
                    </div>
                </section>
            )}

            {loading && rubrics.length === 0 && (
                <div className="flex min-h-56 items-center justify-center rounded-xl border border-gray-200 bg-white" role="status">
                    <RefreshCw className="mr-3 h-5 w-5 animate-spin text-azul-monte-tabor" aria-hidden="true" />
                    Cargando pautas autorizadas…
                </div>
            )}

            {!loading && !error && rubrics.length === 0 && (
                <section className="rounded-xl border border-gray-200 bg-white px-6 py-12 text-center">
                    <ClipboardList className="mx-auto h-10 w-10 text-gray-300" aria-hidden="true" />
                    <h2 className="mt-4 text-lg font-bold text-gray-900">No tienes pautas activas</h2>
                    <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-gray-600">
                        Tu perfil puede estar autorizado, pero todavía no existe una versión publicada y asociada al proceso vigente para tu disciplina.
                    </p>
                </section>
            )}

            {rubrics.length > 1 && (
                <section className="overflow-hidden rounded-xl border border-gray-200 bg-white" aria-labelledby="rubric-selector-title">
                    <div className="border-b border-gray-200 px-5 py-4">
                        <h2 id="rubric-selector-title" className="font-bold text-gray-950">Selecciona una disciplina</h2>
                        <p className="mt-1 text-sm text-gray-600">Sólo aparecen los instrumentos habilitados para tu rol.</p>
                    </div>
                    <div className="flex gap-2 overflow-x-auto p-3" role="tablist" aria-label="Pautas autorizadas">
                        {rubrics.map((rubric) => {
                            const isSelected = rubric.versionId === selected?.versionId;
                            return (
                                <button
                                    key={rubric.assignmentId}
                                    type="button"
                                    role="tab"
                                    aria-selected={isSelected}
                                    onClick={() => setSelectedVersionId(rubric.versionId)}
                                    className={`min-h-12 shrink-0 rounded-lg px-4 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-blue-300 ${isSelected ? 'bg-azul-monte-tabor text-white' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'}`}
                                >
                                    {rubric.instrument.displayName}
                                </button>
                            );
                        })}
                    </div>
                </section>
            )}

            {selected && <RubricDetail rubric={selected} />}
        </div>
    );
}

function RubricDetail({ rubric }: { rubric: EvaluatorRubric }) {
    return (
        <article className="overflow-hidden rounded-xl border border-gray-200 bg-white" aria-labelledby="active-rubric-title">
            <header className="bg-slate-950 px-5 py-6 text-white sm:px-7">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-slate-300">
                            <span>{rubric.instrument.displayName}</span>
                            <span aria-hidden="true">·</span>
                            <span>{rubric.processName} · Año {rubric.academicYear}</span>
                        </div>
                        <h2 id="active-rubric-title" className="mt-2 text-xl font-black text-white sm:text-2xl">{rubric.name}</h2>
                        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
                            Versión oficial publicada. Los criterios y puntajes no pueden modificarse desde el Portal de Profesores.
                        </p>
                    </div>
                    <div className="flex shrink-0 gap-5 border-t border-slate-700 pt-4 sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0">
                        <div>
                            <span className="block text-xs font-semibold text-slate-400">Versión</span>
                            <strong className="mt-1 block text-xl">{rubric.rubricVersion}</strong>
                        </div>
                        <div>
                            <span className="block text-xs font-semibold text-slate-400">Puntaje máximo</span>
                            <strong className="mt-1 block text-xl">{numberFormatter.format(rubric.maximumScore)}</strong>
                        </div>
                    </div>
                </div>
            </header>

            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-gray-50 px-5 py-4 sm:px-7">
                <p className="flex items-center gap-2 text-sm font-bold text-gray-800">
                    <BookOpenCheck className="h-5 w-5 text-azul-monte-tabor" aria-hidden="true" />
                    {rubric.criteria.length} criterio{rubric.criteria.length === 1 ? '' : 's'} de evaluación
                </p>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-900">
                    <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                    Publicada y activa
                </span>
            </div>

            <div className="divide-y divide-gray-200">
                {rubric.criteria.map((criterion, index) => (
                    <section key={criterion.criterionId} className="px-5 py-6 sm:px-7" aria-labelledby={`rubric-criterion-${criterion.criterionId}`}>
                        <div className="flex gap-3">
                            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-blue-50 text-sm font-black text-blue-900" aria-hidden="true">{index + 1}</span>
                            <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                    <h3 id={`rubric-criterion-${criterion.criterionId}`} className="font-black text-gray-950">{criterion.name}</h3>
                                    {criterion.required && <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-bold text-gray-700">Obligatorio</span>}
                                </div>
                                <p className="mt-1 max-w-3xl text-sm leading-6 text-gray-600">{criterion.descriptor}</p>
                            </div>
                        </div>
                        <div className="mt-5 overflow-hidden rounded-xl border border-gray-200">
                            <div className="hidden grid-cols-[90px_minmax(150px,0.7fr)_minmax(240px,1.3fr)_140px] bg-gray-50 px-4 py-3 text-xs font-bold uppercase tracking-wide text-gray-600 md:grid">
                                <span>Puntaje</span><span>Nivel</span><span>Descriptor</span><span>Validación</span>
                            </div>
                            <div className="divide-y divide-gray-100">
                                {criterion.options.map((option) => (
                                    <div key={option.optionId} className="grid gap-2 px-4 py-4 text-sm md:grid-cols-[90px_minmax(150px,0.7fr)_minmax(240px,1.3fr)_140px] md:items-center">
                                        <strong className="text-lg text-azul-monte-tabor" aria-label={`Puntaje ${numberFormatter.format(option.value)}`}>{numberFormatter.format(option.value)}</strong>
                                        <span className="font-bold text-gray-900">{option.label}</span>
                                        <p className="leading-6 text-gray-600">{option.descriptor}</p>
                                        <span className={`inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${option.professionallyValidated ? 'bg-emerald-50 text-emerald-800' : 'bg-gray-100 text-gray-600'}`}>
                                            {option.professionallyValidated && <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />}
                                            {option.professionallyValidated ? 'Validada' : 'Sin validación'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>
                ))}
            </div>
        </article>
    );
}
