import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Check, ChevronRight, CircleAlert, Clock3, CloudOff, LockKeyhole,
  MessageSquareText, RefreshCw, Search, Send, ShieldCheck, UsersRound,
} from 'lucide-react';
import { useAuthStore } from '../../../packages/backend-sdk/src/auth/store';
import { type Comment, type Evaluation, prekinderApi, refreshAccessToken } from '../services/api';
import { PrekinderRealtimeClient, type MinimalEvent, type RealtimeState } from '../services/realtime';

const evaluationLabels: Record<string, string> = {
  LANGUAGE: 'Lenguaje', MATHEMATICS: 'Matemática', PSYCHOLOGICAL: 'Psicología',
  FAMILY_INTERVIEW: 'Entrevista familiar', PLAY_OBSERVATION: 'Observación de juego',
};

export function PrekinderWorkspace() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState('');
  const [state, setState] = useState<RealtimeState>('connecting');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const realtime = useRef<PrekinderRealtimeClient | null>(null);
  const selectedRef = useRef<string | null>(null);
  const lastSequence = useRef(0);

  const loadEvaluations = useCallback(async () => {
    setError(null);
    try {
      const data = await prekinderApi.evaluations();
      setEvaluations(data);
      setSelectedId((current) => current && data.some((item) => item.evaluationId === current)
        ? current : data[0]?.evaluationId ?? null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No pudimos cargar las evaluaciones.');
    } finally { setLoading(false); }
  }, []);

  const loadComments = useCallback(async (evaluationId: string) => {
    try {
      const data = await prekinderApi.comments(evaluationId);
      setComments(data);
      lastSequence.current = data.reduce((maximum, comment) => Math.max(maximum, comment.serverSequence), 0);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No pudimos sincronizar los comentarios.');
    }
  }, []);

  useEffect(() => { void loadEvaluations(); }, [loadEvaluations]);

  useEffect(() => {
    let cancelled = false;
    const client = new PrekinderRealtimeClient(setState, (event: MinimalEvent) => {
      if (event.entityId !== selectedRef.current) return;
      if (event.sequence > lastSequence.current + 1) {
        setNotice('Detectamos un salto de secuencia. Se cargó un snapshot completo.');
      }
      void loadComments(event.entityId);
    });
    realtime.current = client;
    void refreshAccessToken().then((token) => {
      if (cancelled) return;
      if (token) client.connect();
      else setState('closed');
    }).catch(() => { if (!cancelled) setState('closed'); });
    return () => { cancelled = true; void client.disconnect(); realtime.current = null; };
  }, [loadComments]);

  useEffect(() => {
    selectedRef.current = selectedId;
    setComments([]);
    lastSequence.current = 0;
    if (!selectedId) return;
    void loadComments(selectedId);
    if (state === 'live') void realtime.current?.watch(selectedId);
  }, [selectedId, state, loadComments]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return term ? evaluations.filter((item) =>
      `${item.applicationId} ${item.typeCode}`.toLowerCase().includes(term)) : evaluations;
  }, [evaluations, search]);

  const selected = evaluations.find((item) => item.evaluationId === selectedId) ?? null;

  async function submitComment() {
    const content = draft.trim();
    if (!selected || !content || sending) return;
    const operationId = crypto.randomUUID();
    setSending(true); setError(null); setNotice(null);
    try {
      if (state === 'live') {
        try {
          await realtime.current?.send({ operationId, type: 'COMMENT_CREATE', evaluationId: selected.evaluationId, content });
        } catch {
          await prekinderApi.createComment(selected.evaluationId, operationId, content);
          setNotice('El canal en vivo no confirmó a tiempo; verificamos la misma operación por REST sin duplicarla.');
        }
      } else {
        await prekinderApi.createComment(selected.evaluationId, operationId, content);
        setNotice('Comentario guardado en modo seguro. Se difundirá al recuperar el tiempo real.');
      }
      setDraft('');
      await loadComments(selected.evaluationId);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No pudimos guardar el comentario. Tu texto sigue en el editor.');
    } finally { setSending(false); }
  }

  return (
    <div className="min-h-screen bg-[#f4f1e9] font-sans text-slate-900">
      <header className="border-b border-blue-950/20 bg-[#102b57] text-white">
        <div className="mx-auto flex min-h-20 max-w-[1600px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-4">
            <button onClick={() => navigate('/prekinder')} className="rounded-lg p-2 text-blue-100 transition hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-amber-300" aria-label="Volver a postulaciones Prekínder">
              <ArrowLeft size={20} />
            </button>
            <div className="min-w-0">
              <h1 className="truncate text-base font-bold tracking-[-0.02em] sm:text-2xl">Admisión Prekínder 2027</h1>
              <p className="mt-0.5 truncate text-sm text-blue-100">Evaluaciones · volver a postulaciones con la flecha</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ConnectionBadge state={state} />
            <div className="hidden border-l border-white/20 pl-4 text-right sm:block">
              <p className="text-sm font-semibold">{[user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Equipo de admisión'}</p>
              <p className="text-xs text-blue-100">{user?.role || 'Sesión segura'}</p>
            </div>
          </div>
        </div>
      </header>

      {state === 'degraded' && (
        <div role="status" className="border-b border-amber-300 bg-amber-50 px-4 py-2.5 text-center text-sm font-medium text-amber-950">
          <CloudOff className="mr-2 inline" size={17} /> Tiempo real interrumpido. Las escrituras continúan por REST y se resincronizarán automáticamente.
        </div>
      )}

      <main className="mx-auto grid max-w-[1600px] grid-cols-1 lg:grid-cols-[330px_minmax(0,1fr)]">
        <aside className="border-b border-slate-200 bg-white lg:min-h-[calc(100vh-81px)] lg:border-b-0 lg:border-r">
          <div className="border-b border-slate-200 p-5">
            <label className="relative block">
              <span className="sr-only">Buscar evaluación</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por folio o área" className="w-full rounded-xl border border-slate-300 bg-slate-50 py-2.5 pl-10 pr-3 text-sm outline-none transition placeholder:text-slate-500 focus:border-blue-700 focus:bg-white focus:ring-2 focus:ring-blue-700/15" />
            </label>
          </div>
          <div className="flex items-center justify-between px-5 pb-2 pt-5">
            <h2 className="font-bold tracking-[-0.01em]">Evaluaciones activas</h2>
            <span className="text-sm tabular-nums text-slate-500">{filtered.length}</span>
          </div>
          <div className="max-h-[360px] overflow-y-auto pb-4 lg:max-h-[calc(100vh-190px)]">
            {loading ? <EvaluationSkeleton /> : filtered.map((evaluation) => (
              <button key={evaluation.evaluationId} onClick={() => setSelectedId(evaluation.evaluationId)} className={`group flex w-full items-start gap-3 border-b border-slate-100 px-5 py-4 text-left transition focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-700 ${selectedId === evaluation.evaluationId ? 'bg-blue-50' : 'hover:bg-slate-50'}`}>
                <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${evaluation.status === 'COMPLETED' ? 'bg-emerald-600' : 'bg-amber-500'}`} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{evaluationLabels[evaluation.typeCode] || evaluation.typeCode.replaceAll('_', ' ')}</span>
                  <span className="mt-1 block truncate text-xs text-slate-500">Folio {evaluation.applicationId.slice(0, 8).toUpperCase()}</span>
                </span>
                <ChevronRight className="mt-1 shrink-0 text-slate-400 transition group-hover:translate-x-0.5" size={17} />
              </button>
            ))}
            {!loading && !filtered.length && <p className="px-5 py-8 text-center text-sm text-slate-600">No hay evaluaciones que coincidan.</p>}
          </div>
        </aside>

        <section className="min-w-0 p-4 sm:p-6 lg:p-8">
          {error && <ErrorBanner message={error} onRetry={() => void loadEvaluations()} />}
          {notice && <div role="status" className="mb-5 flex items-start gap-3 rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-950"><CircleAlert className="mt-0.5 shrink-0" size={18} /><span>{notice}</span></div>}
          {!selected ? <EmptyWorkspace loading={loading} /> : (
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
              <div className="min-w-0">
                <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-bold tracking-[-0.025em] sm:text-3xl">{evaluationLabels[selected.typeCode] || selected.typeCode.replaceAll('_', ' ')}</h2>
                    <p className="mt-2 text-sm text-slate-600">Postulación {selected.applicationId.slice(0, 8).toUpperCase()} · secuencia {selected.serverSequence}</p>
                  </div>
                  <span className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1.5 text-xs font-bold text-amber-950"><Clock3 size={15} /> En evaluación</span>
                </div>

                <div className="mb-7 grid grid-cols-3 overflow-hidden rounded-xl border border-slate-200 bg-white">
                  {['Antecedentes', 'Evaluación', 'Consolidación'].map((label, index) => (
                    <div key={label} className={`px-3 py-3 text-center text-xs font-semibold sm:text-sm ${index === 1 ? 'bg-blue-900 text-white' : 'text-slate-500'} ${index ? 'border-l border-slate-200' : ''}`}>
                      {index === 0 && <Check className="mr-1 inline" size={15} />}{label}
                    </div>
                  ))}
                </div>

                <section aria-labelledby="comments-title" className="overflow-hidden rounded-2xl bg-white shadow-[0_12px_35px_rgba(15,23,42,0.08)]">
                  <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 sm:px-6">
                    <div><h3 id="comments-title" className="font-bold">Registro colaborativo</h3><p className="mt-1 text-xs text-slate-500">Cada aporte se guarda como una entidad independiente.</p></div>
                    <MessageSquareText className="text-blue-800" size={22} />
                  </div>
                  <div className="min-h-72 divide-y divide-slate-100">
                    {comments.map((comment) => <CommentRow key={comment.commentId} comment={comment} />)}
                    {!comments.length && <div className="flex min-h-72 flex-col items-center justify-center px-6 text-center"><MessageSquareText className="mb-4 text-slate-300" size={38} /><p className="font-semibold">Aún no hay comentarios</p><p className="mt-2 max-w-md text-sm text-slate-500">El primer comentario confirmado aparecerá aquí con su secuencia y revisión.</p></div>}
                  </div>
                </section>
              </div>

              <aside className="self-start overflow-hidden rounded-2xl bg-[#fffdf8] shadow-[0_12px_35px_rgba(15,23,42,0.08)] xl:sticky xl:top-6">
                <div className="border-b border-amber-200 bg-amber-50 px-5 py-4">
                  <div className="flex items-center gap-2 font-bold text-amber-950"><Send size={18} /> Añadir comentario</div>
                  <p className="mt-1 text-xs text-amber-900">Se confirma sólo después del commit en PostgreSQL.</p>
                </div>
                <div className="p-5">
                  <label htmlFor="prekinder-comment" className="mb-2 block text-sm font-semibold">Observación del equipo</label>
                  <textarea id="prekinder-comment" value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={8000} rows={7} placeholder="Escribe una observación concreta…" className="w-full resize-y rounded-xl border border-slate-300 bg-white p-3 text-sm leading-6 outline-none transition placeholder:text-slate-500 focus:border-blue-700 focus:ring-2 focus:ring-blue-700/15" />
                  <div className="mt-2 flex justify-between text-xs text-slate-500"><span>Se renderiza siempre como texto.</span><span className="tabular-nums">{draft.length}/8000</span></div>
                  <button onClick={() => void submitComment()} disabled={!draft.trim() || sending} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-900 px-4 py-3 text-sm font-bold text-white shadow-[0_8px_18px_rgba(30,58,138,0.24)] transition hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-700 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none">
                    {sending ? <RefreshCw className="animate-spin" size={18} /> : <Send size={18} />}{sending ? 'Confirmando…' : 'Guardar comentario'}
                  </button>
                </div>
                <div className="border-t border-slate-200 px-5 py-4 text-xs text-slate-600">
                  <p className="flex items-center gap-2"><LockKeyhole size={16} className="text-emerald-700" /> Cifrado antes de persistir</p>
                  <p className="mt-3 flex items-center gap-2"><ShieldCheck size={16} className="text-emerald-700" /> Idempotencia y auditoría activas</p>
                  <p className="mt-3 flex items-center gap-2"><UsersRound size={16} className="text-emerald-700" /> Edición por campo independiente</p>
                </div>
              </aside>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function ConnectionBadge({ state }: { state: RealtimeState }) {
  const map = { live: ['En vivo', 'bg-emerald-400 text-emerald-950'], connecting: ['Conectando', 'bg-amber-300 text-amber-950'], degraded: ['Modo seguro', 'bg-white/15 text-white'], closed: ['Desconectado', 'bg-white/15 text-white'] } as const;
  const [label, color] = map[state];
  return <span className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1.5 text-xs font-bold sm:px-3 ${color}`}><span className={`h-2 w-2 rounded-full ${state === 'live' ? 'bg-emerald-900' : 'bg-current'}`} /><span className="max-[420px]:sr-only">{label}</span></span>;
}

function CommentRow({ comment }: { comment: Comment }) {
  return <article className="px-5 py-5 sm:px-6"><div className="flex items-start justify-between gap-4"><div className="min-w-0"><p className="whitespace-pre-wrap break-words text-sm leading-6 text-slate-800">{comment.content}</p><p className="mt-3 text-xs text-slate-500">Autor {comment.authorId.slice(0, 8)} · {new Intl.DateTimeFormat('es-CL', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(comment.createdAt))}</p></div><span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">S{comment.serverSequence} · R{comment.revision}</span></div></article>;
}

function ErrorBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <div role="alert" className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-950"><span className="flex items-center gap-2"><CircleAlert size={18} />{message}</span><button onClick={onRetry} className="font-bold underline underline-offset-4 focus:outline-none focus:ring-2 focus:ring-red-700">Reintentar</button></div>;
}

function EmptyWorkspace({ loading }: { loading: boolean }) {
  return <div className="flex min-h-[60vh] flex-col items-center justify-center text-center"><div className="mb-5 rounded-2xl bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.08)]">{loading ? <RefreshCw className="animate-spin text-blue-900" size={34} /> : <UsersRound className="text-blue-900" size={34} />}</div><h2 className="text-xl font-bold">{loading ? 'Cargando mesa de trabajo…' : 'No hay evaluaciones activas'}</h2><p className="mt-2 max-w-md text-sm leading-6 text-slate-600">{loading ? 'Estamos verificando tu sesión y sincronizando las secuencias.' : 'La base Prekínder comienza limpia. Las evaluaciones aparecerán cuando se creen postulaciones en el proceso 2027.'}</p></div>;
}

function EvaluationSkeleton() {
  return <div aria-label="Cargando evaluaciones" className="animate-pulse space-y-px">{[1, 2, 3, 4].map((item) => <div key={item} className="flex gap-3 border-b border-slate-100 px-5 py-5"><div className="h-2.5 w-2.5 rounded-full bg-slate-200" /><div className="flex-1"><div className="h-3 w-2/3 rounded bg-slate-200" /><div className="mt-2 h-2.5 w-1/2 rounded bg-slate-100" /></div></div>)}</div>;
}
