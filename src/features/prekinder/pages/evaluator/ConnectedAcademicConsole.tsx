import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Check, CheckCircle2, ChevronRight, UserCheck } from "lucide-react";
import { prekinderApi, type EvaluatorAssignment } from "../../services/api";
import { PROFILE_TO_SHORT_INSTRUMENT, type SpecialtyProfile } from "../../components/evaluator/SpecialtyProfile";
import { isMockMode, buildMockAgenda } from "../dev/mockApi";

type Score = 0 | 1 | 2 | 3 | 4 | "NOT_OBSERVED";

type Screen = "loading" | "agenda" | "confirm" | "evaluate";

const criteria = [
  {
    title: "Información",
    description: "Reconoce, relaciona y clasifica información presentada.",
    options: [
      { value: 0 as Score, title: "0", label: "No reconoce ni relaciona información." },
      { value: 1 as Score, title: "1", label: "Reconoce información superficial." },
      { value: 2 as Score, title: "2", label: "Relaciona información con apoyo." },
      { value: 3 as Score, title: "3", label: "Clasifica con dificultad mínima." },
      { value: 4 as Score, title: "4", label: "Clasifica correctamente de forma autónoma." },
      { value: "NOT_OBSERVED" as Score, title: "—", label: "No observado" },
    ],
  },
  {
    title: "Clasificación",
    description: "Agrupa elementos según una característica observable.",
    options: [
      { value: 0 as Score, title: "0", label: "No logra clasificar elementos." },
      { value: 1 as Score, title: "1", label: "Clasifica con dificultad significativa." },
      { value: 2 as Score, title: "2", label: "Clasifica elementos con mediación." },
      { value: 3 as Score, title: "3", label: "Clasifica correctamente con apoyo menor." },
      { value: 4 as Score, title: "4", label: "Clasifica correctamente de forma autónoma." },
      { value: "NOT_OBSERVED" as Score, title: "—", label: "No observado" },
    ],
  },
  {
    title: "Seriación",
    description: "Ordena elementos utilizando una secuencia o magnitud.",
    options: [
      { value: 0 as Score, title: "0", label: "No logra ordenar elementos." },
      { value: 1 as Score, title: "1", label: "Ordena con dificultad significativa." },
      { value: 2 as Score, title: "2", label: "Ordena elementos con mediación." },
      { value: 3 as Score, title: "3", label: "Ordena correctamente con apoyo menor." },
      { value: 4 as Score, title: "4", label: "Ordena correctamente de forma autónoma." },
      { value: "NOT_OBSERVED" as Score, title: "—", label: "No observado" },
    ],
  },
  {
    title: "Patrones",
    description: "Identifica y continúa patrones simples.",
    options: [
      { value: 0 as Score, title: "0", label: "No identifica patrones." },
      { value: 1 as Score, title: "1", label: "Identifica patrones con dificultad." },
      { value: 2 as Score, title: "2", label: "Identifica patrones con mediación." },
      { value: 3 as Score, title: "3", label: "Identifica y continúa patrones con apoyo menor." },
      { value: 4 as Score, title: "4", label: "Identifica y continúa patrones de forma autónoma." },
      { value: "NOT_OBSERVED" as Score, title: "—", label: "No observado" },
    ],
  },
  {
    title: "Lenguaje comprensivo",
    description: "Comprende instrucciones y conceptos verbales.",
    options: [
      { value: 0 as Score, title: "0", label: "No comprende instrucciones básicas." },
      { value: 1 as Score, title: "1", label: "Comprende solo con gestos o demostración." },
      { value: 2 as Score, title: "2", label: "Comprende instrucciones simples con mediación." },
      { value: 3 as Score, title: "3", label: "Comprende instrucciones con apoyo menor." },
      { value: 4 as Score, title: "4", label: "Comprende instrucciones complejas de forma autónoma." },
      { value: "NOT_OBSERVED" as Score, title: "—", label: "No observado" },
    ],
  },
  {
    title: "Lenguaje expresivo",
    description: "Comunica ideas utilizando vocabulario pertinente.",
    options: [
      { value: 0 as Score, title: "0", label: "No comunica ideas." },
      { value: 1 as Score, title: "1", label: "Comunica ideas de forma muy limitada." },
      { value: 2 as Score, title: "2", label: "Comunica ideas simples con vocabulario limitado." },
      { value: 3 as Score, title: "3", label: "Comunica ideas con vocabulario apropiado." },
      { value: 4 as Score, title: "4", label: "Expresa ideas con vocabulario rico y pertinente." },
      { value: "NOT_OBSERVED" as Score, title: "—", label: "No observado" },
    ],
  },
  {
    title: "Atención verbal",
    description: "Mantiene la atención durante una consigna oral.",
    options: [
      { value: 0 as Score, title: "0", label: "No mantiene atención durante la consigna." },
      { value: 1 as Score, title: "1", label: "Atención muy breve, se distrae fácilmente." },
      { value: 2 as Score, title: "2", label: "Mantiene atención con mediación constante." },
      { value: 3 as Score, title: "3", label: "Mantiene atención con mediación ocasional." },
      { value: 4 as Score, title: "4", label: "Mantiene atención de forma autónoma durante toda la consigna." },
      { value: "NOT_OBSERVED" as Score, title: "—", label: "No observado" },
    ],
  },
  {
    title: "Memoria de trabajo",
    description: "Retiene información breve para completar una tarea.",
    options: [
      { value: 0 as Score, title: "0", label: "No retiene información." },
      { value: 1 as Score, title: "1", label: "Retiene 1 elemento, olvida rápidamente." },
      { value: 2 as Score, title: "2", label: "Retiene información con mediación continua." },
      { value: 3 as Score, title: "3", label: "Retiene información con mediación menor." },
      { value: 4 as Score, title: "4", label: "Retiene y utiliza información de forma autónoma." },
      { value: "NOT_OBSERVED" as Score, title: "—", label: "No observado" },
    ],
  },
  {
    title: "Resolución de problemas",
    description: "Explora alternativas frente a una tarea nueva.",
    options: [
      { value: 0 as Score, title: "0", label: "No explora alternativas frente a problemas." },
      { value: 1 as Score, title: "1", label: "Requiere demostración explícita para cada paso." },
      { value: 2 as Score, title: "2", label: "Explora alternativas con mediación constante." },
      { value: 3 as Score, title: "3", label: "Resuelve problemas con mediación menor." },
      { value: 4 as Score, title: "4", label: "Resuelve problemas de forma autónoma y creativa." },
      { value: "NOT_OBSERVED" as Score, title: "—", label: "No observado" },
    ],
  },
  {
    title: "Autonomía en la tarea",
    description: "Inicia y completa la actividad con mediación adecuada.",
    options: [
      { value: 0 as Score, title: "0", label: "No inicia ni completa la tarea." },
      { value: 1 as Score, title: "1", label: "Inicia con dificultad, abandona rápidamente." },
      { value: 2 as Score, title: "2", label: "Inicia y completa con mediación constante." },
      { value: 3 as Score, title: "3", label: "Inicia y completa con mediación ocasional." },
      { value: 4 as Score, title: "4", label: "Inicia y completa la tarea de forma autónoma." },
      { value: "NOT_OBSERVED" as Score, title: "—", label: "No observado" },
    ],
  },
] as const;

function today() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago" }).format(new Date());
}

function formatTime(iso: string) {
  return new Intl.DateTimeFormat("es-CL", {
    hour: "2-digit", minute: "2-digit", timeZone: "America/Santiago",
  }).format(new Date(iso));
}

interface Props {
  profile: SpecialtyProfile;
}

export function ConnectedAcademicConsole({ profile }: Props) {
  const { assignmentId } = useParams();
  const navigate = useNavigate();
  const [screen, setScreen] = useState<Screen>("loading");
  const [assignments, setAssignments] = useState<EvaluatorAssignment[]>([]);
  const [selectedAssignment, setSelectedAssignment] = useState<EvaluatorAssignment | null>(null);
  const [activeApplicantId, setActiveApplicantId] = useState<string | null>(null);
  const [responses, setResponses] = useState<{ [assignId: string]: { [appId: string]: (Score | undefined)[] } }>({});
  const [comments, setComments] = useState<{ [assignId: string]: { [appId: string]: string } }>({});
  const [submitted, setSubmitted] = useState<{ [assignId: string]: boolean }>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => { void loadAgenda(); }, [profile]);

  async function loadAgenda() {
    setScreen("loading");
    if (isMockMode()) {
      const data = buildMockAgenda(profile);
      setAssignments(data.assignments);
      if (assignmentId) {
        const found = data.assignments.find((a) => a.assignmentId === assignmentId);
        if (found) { setSelectedAssignment(found); setActiveApplicantId(found.reports[0]?.applicationId ?? null); setScreen("confirm"); }
        else setScreen("agenda");
      } else {
        setScreen("agenda");
      }
      return;
    }
    try {
      const data = await prekinderApi.evaluatorAgenda(today(), PROFILE_TO_SHORT_INSTRUMENT[profile]);
      setAssignments(data.assignments);

      if (assignmentId) {
        const found = data.assignments.find((a) => a.assignmentId === assignmentId);
        if (found) {
          setSelectedAssignment(found);
          setActiveApplicantId(found.reports[0]?.applicationId ?? null);
          setScreen("confirm");
        } else {
          setScreen("agenda");
        }
      } else {
        setScreen("agenda");
      }
    } catch {
      setAssignments([]);
      setScreen("agenda");
    }
  }

  const openAssignment = useCallback((assignment: EvaluatorAssignment) => {
    setSelectedAssignment(assignment);
    setActiveApplicantId(assignment.reports[0]?.applicationId ?? null);
    setScreen("confirm");
  }, []);

  const backToAgenda = useCallback(() => {
    setSelectedAssignment(null);
    setActiveApplicantId(null);
    setScreen("agenda");
  }, []);

  const setScore = useCallback((applicationId: string, criterionIdx: number, value: Score) => {
    if (!selectedAssignment) return;
    setResponses((current) => {
      const assignId = selectedAssignment.assignmentId;
      const existing = current[assignId]?.[applicationId] ?? Array(criteria.length).fill(undefined);
      const updated = [...existing];
      updated[criterionIdx] = value;
      return {
        ...current,
        [assignId]: {
          ...(current[assignId] ?? {}),
          [applicationId]: updated,
        },
      };
    });
  }, [selectedAssignment]);

  const setGroupComment = useCallback((applicationId: string, comment: string) => {
    if (!selectedAssignment) return;
    setComments((current) => ({
      ...current,
      [selectedAssignment.assignmentId]: {
        ...(current[selectedAssignment.assignmentId] ?? {}),
        [applicationId]: comment,
      },
    }));
  }, [selectedAssignment]);

  const handleStart = useCallback(async () => {
    if (!selectedAssignment) return;
    setSaving(true);
    try {
      await prekinderApi.startEvaluatorAssignment(selectedAssignment.assignmentId, selectedAssignment.version);
    } catch { /* continue anyway */ }
    setSaving(false);
    setScreen("evaluate");
  }, [selectedAssignment]);

  const handleSubmit = useCallback(async () => {
    if (!selectedAssignment) return;
    setSaving(true);
    try {
      await prekinderApi.submitEvaluatorAssignment(selectedAssignment.assignmentId, selectedAssignment.version);
    } catch { /* continue anyway */ }
    setSaving(false);
    setSubmitted((p) => ({ ...p, [selectedAssignment.assignmentId]: true }));
    if (assignmentId) {
      navigate(`/prekinder/evaluador/academic`);
    } else {
      backToAgenda();
    }
  }, [selectedAssignment, assignmentId, backToAgenda, navigate]);

  const members = selectedAssignment?.reports ?? [];
  const activeApplicant = activeApplicantId
    ? members.find((m) => m.applicationId === activeApplicantId) ?? members[0]
    : members[0];
  const activeScores = selectedAssignment && activeApplicant
    ? (responses[selectedAssignment.assignmentId]?.[activeApplicant.applicationId] ?? Array(criteria.length).fill(undefined))
    : Array(criteria.length).fill(undefined);
  const activeComment = selectedAssignment && activeApplicant
    ? (comments[selectedAssignment.assignmentId]?.[activeApplicant.applicationId] ?? "")
    : "";
  const allMembersComplete = members.every((m) => {
    const scores = responses[selectedAssignment?.assignmentId ?? ""]?.[m.applicationId];
    return scores && scores.length === criteria.length && scores.every((s) => s !== undefined);
  });

  if (screen === "loading") {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-emerald-600" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-emerald-200 bg-emerald-900 p-4 text-white">
        <div className="flex items-center gap-3">
          <UserCheck size={20} />
          <div>
            <p className="text-sm font-black">Espacio exclusivo: Evaluador Académico</p>
            <p className="text-xs text-emerald-300">{assignments.length} asignaciones para hoy</p>
          </div>
        </div>
        <button
          onClick={() => void loadAgenda()}
          className="rounded-lg bg-white px-3 py-2 text-xs font-black text-emerald-900 hover:bg-emerald-50"
        >
          Actualizar
        </button>
      </div>

      {/* Agenda */}
      {screen === "agenda" && (
        <div>
          <div className="mb-5">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-700">Espacio del evaluador</p>
            <h2 className="mt-1 text-3xl font-black text-slate-950">Mi jornada</h2>
            <p className="mt-1 text-sm text-slate-600">Solo ves los bloques asignados. Cada grupo contiene hasta tres postulantes.</p>
          </div>
          {assignments.length === 0 ? (
            <div className="py-12 text-center text-gray-500">
              <p>No hay grupos asignados para hoy.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {assignments.map((assignment) => {
                const isSubmitted = submitted[assignment.assignmentId];
                const isCompleted = assignment.reports.every((r) =>
                  ["COMPLETED", "SUBMITTED", "VALIDATED", "LOCKED"].includes(r.status),
                );
                return (
                  <button
                    key={assignment.assignmentId}
                    className="grid w-full min-h-20 items-center overflow-hidden rounded-xl border border-slate-200 bg-white text-left shadow-sm transition hover:border-emerald-400 md:grid-cols-[110px_1fr_140px]"
                    onClick={() => openAssignment(assignment)}
                  >
                    <div className="border-b border-slate-200 p-4 text-xl font-black text-slate-950 md:border-b-0 md:border-r">
                      {formatTime(assignment.group.startsAt)}
                      <small className="block text-xs font-bold text-slate-500">30 min</small>
                    </div>
                    <div className="min-w-0 p-4">
                      <b className="block text-sm text-slate-900">{assignment.group.code} - {assignment.group.roomName}</b>
                      <small className="mt-1 block truncate text-slate-500">
                        {assignment.reports.map((r) => r.applicantName).join(" - ")}
                      </small>
                    </div>
                    <div className="flex items-center justify-end gap-3 p-4">
                      <span className={`rounded-full px-3 py-1 text-xs font-bold ${isSubmitted ? "bg-green-100 text-green-800" : isCompleted ? "bg-green-100 text-green-800" : "bg-emerald-50 text-emerald-800"}`}>
                        {isSubmitted ? "Enviado" : isCompleted ? "Completado" : assignment.status}
                      </span>
                      <ChevronRight size={19} />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Confirm */}
      {screen === "confirm" && selectedAssignment && (
        <div>
          <div className="mb-5">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-700">
              {formatTime(selectedAssignment.group.startsAt)} - {selectedAssignment.group.roomName}
            </p>
            <h2 className="mt-1 text-3xl font-black text-slate-950">Confirmar grupo</h2>
            <p className="mt-1 text-sm text-slate-600">Antes de evaluar, verifica que los postulantes correspondan al bloque.</p>
          </div>
          <section className="rounded-2xl border border-slate-200 bg-white">
            <div className="grid gap-4 p-5 md:grid-cols-3">
              {selectedAssignment.reports.map((report, index) => (
                <article key={report.applicationId} className="relative rounded-xl border border-slate-200 bg-slate-50/40 p-6 text-center">
                  <span className="absolute left-3 top-3 grid h-7 w-7 place-items-center rounded-full bg-emerald-900 text-xs font-black text-white">{index + 1}</span>
                  <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-100 text-xl font-black uppercase text-emerald-900">
                    {report.applicantName.split(" ").slice(0, 2).map((p) => p[0] ?? "").join("")}
                  </span>
                  <h3 className="mt-3 text-base font-black leading-tight text-slate-900" style={{ fontFamily: 'Montserrat, system-ui, sans-serif' }}>{report.applicantName}</h3>
                  <p className="mt-2 flex items-center justify-center gap-1 text-xs font-bold text-emerald-600"><Check size={13} />Identidad confirmada</p>
                </article>
              ))}
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-200 p-5">
              <button className="secondary" onClick={backToAgenda}>Volver</button>
              <button className="primary" disabled={saving} onClick={() => void handleStart()}>
                {saving ? "Iniciando..." : <>Comenzar evaluación individual <ChevronRight className="ml-1 inline" size={17} /></>}
              </button>
            </div>
          </section>
        </div>
      )}

      {/* Evaluate */}
      {screen === "evaluate" && selectedAssignment && activeApplicant && (
        <div>
          <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="mb-1 text-xs font-bold uppercase tracking-widest text-emerald-700">
                {formatTime(selectedAssignment.group.startsAt)} · {selectedAssignment.group.roomName} · {selectedAssignment.group.code}
              </p>
              <h2 className="text-3xl font-black tracking-tight text-slate-950" style={{ fontFamily: 'Montserrat, system-ui, sans-serif' }}>Evaluación Académica</h2>
              <p className="mt-1 text-sm text-slate-500">Completa todos los criterios antes de enviar la evaluación.</p>
            </div>
          </div>

          <div className="grid gap-5 xl:grid-cols-[270px_1fr]">
            {/* Applicant selector sidebar */}
            <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-3">
              <h3 className="px-3 py-2 text-xs font-black uppercase tracking-widest text-emerald-700">Postulantes</h3>
              {members.map((person) => {
                const personScores = responses[selectedAssignment.assignmentId]?.[person.applicationId];
                const personComplete = personScores && personScores.length === criteria.length && personScores.every((s) => s !== undefined);
                return (
                  <button
                    key={person.applicationId}
                    onClick={() => setActiveApplicantId(person.applicationId)}
                    className={`mb-1 flex w-full items-center gap-3 rounded-xl p-3 text-left transition-all ${person.applicationId === activeApplicant.applicationId ? "bg-emerald-100 text-emerald-900 shadow-sm ring-2 ring-emerald-300" : "hover:bg-emerald-50 hover:shadow-sm"}`}
                  >
                    <span className={`grid h-10 w-10 place-items-center rounded-full text-sm font-black uppercase ${person.applicationId === activeApplicant.applicationId ? "bg-emerald-900 text-white" : "bg-emerald-100 text-emerald-800"}`}>
                      {person.applicantName.split(" ").slice(0, 2).map((p) => p[0] ?? "").join("")}
                    </span>
                    <span className="min-w-0 flex-1">
                      <b className="block truncate text-sm font-bold leading-tight" style={{ fontFamily: 'Montserrat, system-ui, sans-serif' }}>{person.applicantName}</b>
                      {personComplete ? (
                        <span className="mt-0.5 flex items-center gap-1 text-xs font-bold text-emerald-600">
                          <Check size={11} />Completo
                        </span>
                      ) : (
                        <span className="mt-0.5 block text-xs text-slate-400">Sin evaluar</span>
                      )}
                    </span>
                    {personComplete ? (
                      <Check size={16} className="text-emerald-600 flex-shrink-0" />
                    ) : (
                      <ChevronRight size={16} className="text-slate-400 flex-shrink-0" />
                    )}
                  </button>
                );
              })}
            </aside>

            {/* Full evaluation for selected applicant */}
            <section className="rounded-2xl border border-slate-200 bg-white shadow-lg">
              {/* Applicant header */}
              <div className="rounded-t-2xl border-b border-slate-200 bg-gradient-to-r from-emerald-800 to-emerald-900 p-6">
                <div className="flex items-center gap-5">
                  <span className="grid h-20 w-20 place-items-center rounded-full bg-white text-2xl font-black uppercase tracking-wide text-emerald-900" style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
                    {activeApplicant.applicantName.split(" ").slice(0, 2).map((p) => p[0] ?? "").join("")}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="mb-1 text-xs font-bold uppercase tracking-widest text-emerald-200">Postulante en evaluación</p>
                    <h3 className="text-3xl font-black leading-tight tracking-tight text-white" style={{ fontFamily: 'Montserrat, system-ui, sans-serif' }}>
                      {activeApplicant.applicantName}
                    </h3>
                    <p className="mt-1 text-sm font-medium text-emerald-200">Académico · Evaluación Individual</p>
                  </div>
                  <div className="hidden sm:flex flex-col items-end gap-1">
                    <span className="rounded-full bg-white px-4 py-2 text-sm font-black text-emerald-900">
                      {members.findIndex((m) => m.applicationId === activeApplicant.applicationId) + 1} / {members.length}
                    </span>
                  </div>
                </div>
              </div>

              {/* Criteria */}
              <div className="divide-y divide-slate-100">
                {criteria.map((criterion, cIdx) => (
                  <div key={cIdx} className="p-5">
                    <div className="mb-4 flex items-start gap-3">
                      <span className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg bg-emerald-900 text-sm font-black text-white">{cIdx + 1}</span>
                      <p className="pt-1 text-base font-bold leading-snug text-slate-900" style={{ fontFamily: 'Montserrat, system-ui, sans-serif' }}>{criterion.title}</p>
                    </div>
                    <div className="grid grid-cols-3 gap-2 xl:grid-cols-6">
                      {criterion.options.map((opt) => (
                        <button
                          key={String(opt.value)}
                          className={`min-h-14 rounded-xl border-2 p-3 text-center transition-all ${activeScores[cIdx] === opt.value ? "border-emerald-700 bg-emerald-900 text-white shadow-md" : "border-slate-200 bg-white hover:border-emerald-400 hover:shadow-sm"}`}
                          onClick={() => setScore(activeApplicant.applicationId, cIdx, opt.value)}
                        >
                          <b className="block text-xl font-black leading-none" style={{ fontFamily: 'Montserrat, system-ui, sans-serif' }}>{opt.title}</b>
                          <small className="mt-1 block text-xs leading-tight" style={activeScores[cIdx] === opt.value ? { color: '#a7f3d0' } : { color: '#64748b' }}>{opt.label}</small>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Observations */}
              <div className="border-t border-slate-200 bg-slate-50/50 p-5">
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Observaciones cualitativas del postulante
                </label>
                <textarea
                  className="w-full resize-y rounded-xl border border-slate-200 bg-white p-4 text-sm leading-relaxed shadow-sm focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
                  rows={4}
                  value={activeComment}
                  onChange={(e) => setGroupComment(activeApplicant.applicationId, e.target.value)}
                  placeholder="Evidencia observable, contexto y comportamientos relevantes de este postulante..."
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 p-5">
                <button className="secondary" onClick={backToAgenda}>Volver al grupo</button>
                <span className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                  <Check size={16} className="text-emerald-600" />Guardado automático
                </span>
                <button
                  className="primary"
                  disabled={!allMembersComplete || saving}
                  onClick={() => void handleSubmit()}
                >
                  {saving ? "Guardando..." : <><CheckCircle2 className="mr-2 inline" size={17} />Enviar a revisión</>}
                </button>
              </div>
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
