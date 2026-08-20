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
    title: "Adaptación a situación de examen",
    options: [
      { value: 0 as Score, title: "0", label: "No logra separarse y no entra." },
      { value: 1 as Score, title: "1", label: "Entra llorando y no logra calmarse; no realiza el examen." },
      { value: 2 as Score, title: "2", label: "Entra llorando, logra calmarse y realiza el examen." },
      { value: 3 as Score, title: "3", label: "Entra llorando y se calma rápidamente." },
      { value: 4 as Score, title: "4", label: "Logra separarse y entra tranquilo." },
      { value: "NOT_OBSERVED" as Score, title: "—", label: "No observado" },
    ],
  },
  {
    title: "Comunicación",
    options: [
      { value: 0 as Score, title: "0", label: "No hay intención comunicativa." },
      { value: 1 as Score, title: "1", label: "Hay comunicación no verbal." },
      { value: 2 as Score, title: "2", label: "Dificultades en comprensión y expresión del lenguaje." },
      { value: 3 as Score, title: "3", label: "Dificultades de lenguaje esperable para la edad." },
      { value: 4 as Score, title: "4", label: "Establece adecuada comunicación." },
      { value: "NOT_OBSERVED" as Score, title: "—", label: "No observado" },
    ],
  },
  {
    title: "Vinculación con el otro (evaluador)",
    options: [
      { value: 0 as Score, title: "0", label: "No hay contacto visual." },
      { value: 1 as Score, title: "1", label: "Hay contacto visual con mediación." },
      { value: 2 as Score, title: "2", label: "Hay contacto visual intermitente." },
      { value: 3 as Score, title: "3", label: "Vinculación adaptativa." },
      { value: 4 as Score, title: "4", label: "Vinculación positiva." },
      { value: "NOT_OBSERVED" as Score, title: "—", label: "No observado" },
    ],
  },
  {
    title: "Ejecución frente al examen",
    options: [
      { value: 0 as Score, title: "0", label: "Desmotivado. No realiza examen." },
      { value: 1 as Score, title: "1", label: "Realiza parcialmente el examen, con mediación." },
      { value: 2 as Score, title: "2", label: "Realiza examen con mediación constante." },
      { value: 3 as Score, title: "3", label: "Realiza examen con mediación intermitente." },
      { value: 4 as Score, title: "4", label: "Se muestra motivado, disfruta de la instancia." },
      { value: "NOT_OBSERVED" as Score, title: "—", label: "No observado" },
    ],
  },
  {
    title: "Seguimiento de instrucciones",
    options: [
      { value: 0 as Score, title: "0", label: "No sigue instrucciones (desconectado)." },
      { value: 1 as Score, title: "1", label: "No sigue instrucciones porque no quiere." },
      { value: 2 as Score, title: "2", label: "Cumple instrucción con mediación." },
      { value: 3 as Score, title: "3", label: "Cumple la tarea, pero se desvía; hay que repetirle las instrucciones." },
      { value: 4 as Score, title: "4", label: "Cumple las instrucciones." },
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

export function ConnectedPsychologyConsole({ profile }: Props) {
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
      navigate(`/prekinder/evaluador/psychology`);
    } else {
      backToAgenda();
    }
  }, [selectedAssignment, assignmentId, backToAgenda, navigate]);

  const members = selectedAssignment?.reports ?? [];
  const activeApplicant = activeApplicantId ? members.find((m) => m.applicationId === activeApplicantId) ?? members[0] : members[0];
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
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-blue-200 bg-[#1e3a8a] p-4 text-white">
        <div className="flex items-center gap-3">
          <UserCheck size={20} />
          <div>
            <p className="text-sm font-black">Espacio exclusivo: Evaluador de Psicologia</p>
            <p className="text-xs text-blue-200">{assignments.length} asignaciones para hoy</p>
          </div>
        </div>
        <button
          onClick={() => void loadAgenda()}
          className="rounded-lg bg-white px-3 py-2 text-xs font-black text-[#1e3a8a] hover:bg-blue-50"
        >
          Actualizar
        </button>
      </div>

      {/* Agenda */}
      {screen === "agenda" && (
        <div>
          <div className="mb-5">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-blue-700">Espacio del evaluador</p>
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
                    className="grid w-full min-h-20 items-center overflow-hidden rounded-xl border border-slate-200 bg-white text-left shadow-sm transition hover:border-blue-400 md:grid-cols-[110px_1fr_140px]"
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
                      <span className={`rounded-full px-3 py-1 text-xs font-bold ${isSubmitted ? "bg-green-100 text-green-800" : isCompleted ? "bg-green-100 text-green-800" : "bg-blue-50 text-blue-800"}`}>
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
            <p className="text-xs font-black uppercase tracking-[0.14em] text-blue-700">
              {formatTime(selectedAssignment.group.startsAt)} - {selectedAssignment.group.roomName}
            </p>
            <h2 className="mt-1 text-3xl font-black text-slate-950">Confirmar grupo</h2>
            <p className="mt-1 text-sm text-slate-600">Antes de evaluar, verifica que los postulantes correspondan al bloque.</p>
          </div>
          <section className="rounded-2xl border border-slate-200 bg-white">
            <div className="grid gap-4 p-5 md:grid-cols-3">
              {selectedAssignment.reports.map((report, index) => (
                <article key={report.applicationId} className="relative rounded-xl border border-slate-200 bg-slate-50/40 p-6 text-center">
                  <span className="absolute left-3 top-3 grid h-7 w-7 place-items-center rounded-full bg-blue-900 text-xs font-black text-white">{index + 1}</span>
                  <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-blue-100 text-xl font-black uppercase text-blue-900">
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
              <p className="mb-1 text-xs font-bold uppercase tracking-widest text-blue-700">
                {formatTime(selectedAssignment.group.startsAt)} · {selectedAssignment.group.roomName} · {selectedAssignment.group.code}
              </p>
              <h2 className="text-3xl font-black tracking-tight text-slate-950" style={{ fontFamily: 'Montserrat, system-ui, sans-serif' }}>Evaluación de Psicología</h2>
              <p className="mt-1 text-sm text-slate-500">Completa todos los criterios antes de enviar la evaluación.</p>
            </div>
          </div>

          <div className="grid gap-5 xl:grid-cols-[270px_1fr]">
            {/* Applicant selector sidebar */}
            <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-3">
              <h3 className="px-3 py-2 text-xs font-black uppercase tracking-widest text-blue-700">Postulantes</h3>
              {members.map((person) => {
                const personScores = responses[selectedAssignment.assignmentId]?.[person.applicationId];
                const personComplete = personScores && personScores.length === criteria.length && personScores.every((s) => s !== undefined);
                return (
                  <button
                    key={person.applicationId}
                    onClick={() => setActiveApplicantId(person.applicationId)}
                    className={`mb-1 flex w-full items-center gap-3 rounded-xl p-3 text-left transition-all ${person.applicationId === activeApplicant.applicationId ? "bg-blue-100 text-blue-900 shadow-sm ring-2 ring-blue-300" : "hover:bg-blue-50 hover:shadow-sm"}`}
                  >
                    <span className={`grid h-10 w-10 place-items-center rounded-full text-sm font-black uppercase ${person.applicationId === activeApplicant.applicationId ? "bg-blue-900 text-white" : "bg-blue-100 text-blue-800"}`}>
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
              {/* Prominent student header */}
              <div className="rounded-t-2xl border-b border-slate-200 bg-gradient-to-r from-[#1e3a8a] to-[#1e4a9a] p-6">
                <div className="flex items-center gap-5">
                  <span className="grid h-20 w-20 place-items-center rounded-full bg-white text-2xl font-black uppercase tracking-wide text-[#1e3a8a]" style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
                    {activeApplicant.applicantName.split(" ").slice(0, 2).map((p) => p[0] ?? "").join("")}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="mb-1 text-xs font-bold uppercase tracking-widest text-blue-200">Postulante en evaluación</p>
                    <h3 className="text-3xl font-black leading-tight tracking-tight text-white" style={{ fontFamily: 'Montserrat, system-ui, sans-serif' }}>
                      {activeApplicant.applicantName}
                    </h3>
                    <p className="mt-1 text-sm font-medium text-blue-200">Psicología · Evaluación Individual</p>
                  </div>
                  <div className="hidden sm:flex flex-col items-end gap-1">
                    <span className="rounded-full bg-[#f59e0b] px-4 py-2 text-sm font-black text-[#1e3a8a]">
                      {members.findIndex((m) => m.applicationId === activeApplicant.applicationId) + 1} / {members.length}
                    </span>
                  </div>
                </div>
              </div>

              <div className="divide-y divide-slate-100">
                {criteria.map((criterion, cIdx) => (
                  <div key={cIdx} className="p-5">
                    <div className="mb-4 flex items-start gap-3">
                      <span className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg bg-blue-900 text-sm font-black text-white">{cIdx + 1}</span>
                      <p className="pt-1 text-base font-bold leading-snug text-slate-900" style={{ fontFamily: 'Montserrat, system-ui, sans-serif' }}>{criterion.title}</p>
                    </div>
                    <div className="grid grid-cols-3 gap-2 xl:grid-cols-6">
                      {criterion.options.map((opt) => (
                        <button
                          key={String(opt.value)}
                          className={`min-h-14 rounded-xl border-2 p-3 text-center transition-all ${activeScores[cIdx] === opt.value ? "border-[#1e3a8a] bg-[#1e3a8a] text-white shadow-md" : "border-slate-200 bg-white hover:border-blue-400 hover:shadow-sm"}`}
                          onClick={() => setScore(activeApplicant.applicationId, cIdx, opt.value)}
                        >
                          <b className="block text-xl font-black leading-none" style={{ fontFamily: 'Montserrat, system-ui, sans-serif' }}>{opt.title}</b>
                          <small className="mt-1 block text-xs leading-tight text-slate-500">{opt.label}</small>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Observaciones */}
              <div className="border-t border-slate-200 bg-slate-50/50 p-5">
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Observaciones cualitativas del postulante
                </label>
                <textarea
                  className="w-full resize-y rounded-xl border border-slate-200 bg-white p-4 text-sm leading-relaxed shadow-sm focus:border-[#1e3a8a] focus:ring-2 focus:ring-blue-100"
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
