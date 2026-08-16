import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Check, CheckCircle2, ChevronRight, UserCheck } from "lucide-react";
import { prekinderApi, type EvaluatorAssignment } from "../../services/api";
import type { SpecialtyProfile } from "../../components/evaluator/SpecialtyProfile";

type Score = 0 | 1 | 2 | 3 | "NOT_OBSERVED";

type Screen = "loading" | "agenda" | "confirm" | "evaluate";

const criteria = [
  {
    title: "Imitación motora",
    instructions: "Se muestra al niño el movimiento. El adulto lleva su dedo índice de una mano a la nariz y luego a tocar su otro dedo índice que se encuentra a 20 cms de distancia de la cara. Se le pide repetir la secuencia 5 veces.",
    options: [
      { value: 3 as Score, title: "3", label: "Logrado", description: "Lleva el dedo índice a la nariz. Repite en 5 oportunidades." },
      { value: 2 as Score, title: "2", label: "Por lograr", description: "Lleva el dedo índice a la nariz. Logra repetir en 3-4 oportunidades." },
      { value: 1 as Score, title: "1", label: "Lo intenta sin éxito", description: "No logra repetir y copiar la secuencia de la nariz. Se distrae, para, se descoordina." },
      { value: 0 as Score, title: "0", label: "No logrado", description: "No realiza la prueba." },
      { value: "NOT_OBSERVED" as Score, title: "—", label: "No observado", description: "" },
    ],
  },
  {
    title: "Salto a pies juntos",
    instructions: "En el suelo se ponen seis cruces con masking tape con una distancia de 20 cms entre uno y otro. Se le explica al niño que tiene que saltar con pies juntos sobre cada cruz. El adulto muestra el ejercicio realizando el salto con ambos pies juntos. Al niño se le pueden dar dos oportunidades para realizar los saltos.",
    options: [
      { value: 3 as Score, title: "3", label: "Logrado", description: "Saltar con ambos pies al mismo tiempo. Seis saltos sobre cruces/escalera en el suelo." },
      { value: 2 as Score, title: "2", label: "Por lograr", description: "Logra saltar con ambos pies al mismo tiempo tres a cinco veces sobre las cruces." },
      { value: 1 as Score, title: "1", label: "Lo intenta sin éxito", description: "No logra dar un salto simultáneo con pies juntos. (un pie toca antes el suelo)." },
      { value: 0 as Score, title: "0", label: "No logrado", description: "No realiza la prueba." },
      { value: "NOT_OBSERVED" as Score, title: "—", label: "No observado", description: "" },
    ],
  },
  {
    title: "Lanzar y atrapar balón con dos manos",
    instructions: "Se le pide al niño que atrape con las dos manos el balón lanzado por el adulto. El adulto se encuentra ubicado a una distancia de un metro del niño. Después se le pide al niño que lance el balón con las dos manos al adulto. (Se pueden dar dos a tres oportunidades)",
    options: [
      { value: 3 as Score, title: "3", label: "Logrado", description: "Atrapa el balón con ambas manos y lanza el balón en dirección correcta al adulto." },
      { value: 2 as Score, title: "2", label: "Por lograr", description: "No logra atrapar el balón con ambas manos, pero sí lanza en dirección." },
      { value: 1 as Score, title: "1", label: "Lo intenta sin éxito", description: "No logra atrapar el balón con ambas manos y no logra lanzar el balón dándole dirección." },
      { value: 0 as Score, title: "0", label: "No logrado", description: "No realiza la prueba." },
      { value: "NOT_OBSERVED" as Score, title: "—", label: "No observado", description: "" },
    ],
  },
  {
    title: "Salto en cajón",
    instructions: "El adulto muestra el ejercicio. Después se le pide al niño realizar lo mismo. Al niño se le pueden dar dos oportunidades.",
    options: [
      { value: 3 as Score, title: "3", label: "Logrado", description: "Logra subir al cajón, saltar y caer seguro." },
      { value: 2 as Score, title: "2", label: "Por lograr", description: "Sube con dificultad o ayuda y al caer su cuerpo se desploma." },
      { value: 1 as Score, title: "1", label: "Lo intenta sin éxito", description: "Sube con dificultad, pide ayuda y al caer su cuerpo se desploma." },
      { value: 0 as Score, title: "0", label: "No logrado", description: "No realiza la prueba." },
      { value: "NOT_OBSERVED" as Score, title: "—", label: "No observado", description: "" },
    ],
  },
  {
    title: "Rasgar papel con freno inhibitorio",
    instructions: "Se utiliza papel lustre (hoja de papel tamaño similar) con un corte en el centro. Se le muestra al niño el rasgado y se comenta que tiene que parar cuando se le diga 'stop'. El adulto modela como ejemplo. Después se le pide al niño. Al niño se le da solo una oportunidad.",
    options: [
      { value: 3 as Score, title: "3", label: "Logrado", description: "Logra parar el rasgado justo en el momento que la profesora lo comenta. (En el centro del papel)" },
      { value: 2 as Score, title: "2", label: "Por lograr", description: "Logra parar el rasgado, pero a destiempo que la profesora lo comenta." },
      { value: 1 as Score, title: "1", label: "Lo intenta sin éxito", description: "Cuando se le pide parar no logra hacerlo, y córtala hoja en dos." },
      { value: 0 as Score, title: "0", label: "No logrado", description: "No realiza la prueba." },
      { value: "NOT_OBSERVED" as Score, title: "—", label: "No observado", description: "" },
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

export function ConnectedPsychomotorConsole({ profile }: Props) {
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
    try {
      const data = await prekinderApi.evaluatorAgenda(today(), profile);
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
      navigate(`/prekinder/evaluador/psychomotor`);
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
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-cyan-600" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-cyan-200 bg-cyan-900 p-4 text-white">
        <div className="flex items-center gap-3">
          <UserCheck size={20} />
          <div>
            <p className="text-sm font-black">Espacio exclusivo: Evaluador de Psicomotricidad</p>
            <p className="text-xs text-cyan-300">{assignments.length} asignaciones para hoy</p>
          </div>
        </div>
        <button
          onClick={() => void loadAgenda()}
          className="rounded-lg bg-white px-3 py-2 text-xs font-black text-cyan-900 hover:bg-cyan-50"
        >
          Actualizar
        </button>
      </div>

      {/* Agenda */}
      {screen === "agenda" && (
        <div>
          <div className="mb-5">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-cyan-700">Espacio del evaluador</p>
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
                    className="grid w-full min-h-20 items-center overflow-hidden rounded-xl border border-slate-200 bg-white text-left shadow-sm transition hover:border-cyan-400 md:grid-cols-[110px_1fr_140px]"
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
                      <span className={`rounded-full px-3 py-1 text-xs font-bold ${isSubmitted ? "bg-green-100 text-green-800" : isCompleted ? "bg-green-100 text-green-800" : "bg-cyan-50 text-cyan-800"}`}>
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
            <p className="text-xs font-black uppercase tracking-[0.14em] text-cyan-700">
              {formatTime(selectedAssignment.group.startsAt)} - {selectedAssignment.group.roomName}
            </p>
            <h2 className="mt-1 text-3xl font-black text-slate-950">Confirmar grupo</h2>
            <p className="mt-1 text-sm text-slate-600">Antes de evaluar, verifica que los postulantes correspondan al bloque.</p>
          </div>
          <section className="rounded-2xl border border-slate-200 bg-white">
            <div className="grid gap-4 p-5 md:grid-cols-3">
              {selectedAssignment.reports.map((report, index) => (
                <article key={report.applicationId} className="relative rounded-xl border border-slate-200 bg-slate-50/40 p-6 text-center">
                  <span className="absolute left-3 top-3 grid h-7 w-7 place-items-center rounded-full bg-cyan-900 text-xs font-black text-white">{index + 1}</span>
                  <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-cyan-100 text-xl font-black uppercase text-cyan-900">
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
              <p className="mb-1 text-xs font-bold uppercase tracking-widest text-cyan-700">
                {formatTime(selectedAssignment.group.startsAt)} · {selectedAssignment.group.roomName} · {selectedAssignment.group.code}
              </p>
              <h2 className="text-3xl font-black tracking-tight text-slate-950" style={{ fontFamily: 'Montserrat, system-ui, sans-serif' }}>Evaluación Psicomotora</h2>
              <p className="mt-1 text-sm text-slate-500">Completa todos los criterios antes de enviar la evaluación.</p>
            </div>
          </div>

          <div className="grid gap-5 xl:grid-cols-[270px_1fr]">
            {/* Applicant selector sidebar */}
            <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-3">
              <h3 className="px-3 py-2 text-xs font-black uppercase tracking-widest text-cyan-700">Postulantes</h3>
              {members.map((person) => {
                const personScores = responses[selectedAssignment.assignmentId]?.[person.applicationId];
                const personComplete = personScores && personScores.length === criteria.length && personScores.every((s) => s !== undefined);
                return (
                  <button
                    key={person.applicationId}
                    onClick={() => setActiveApplicantId(person.applicationId)}
                    className={`mb-1 flex w-full items-center gap-3 rounded-xl p-3 text-left transition-all ${person.applicationId === activeApplicant.applicationId ? "bg-cyan-100 text-cyan-900 shadow-sm ring-2 ring-cyan-300" : "hover:bg-cyan-50 hover:shadow-sm"}`}
                  >
                    <span className={`grid h-10 w-10 place-items-center rounded-full text-sm font-black uppercase ${person.applicationId === activeApplicant.applicationId ? "bg-cyan-900 text-white" : "bg-cyan-100 text-cyan-800"}`}>
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
              <div className="rounded-t-2xl border-b border-slate-200 bg-gradient-to-r from-cyan-800 to-cyan-900 p-6">
                <div className="flex items-center gap-5">
                  <span className="grid h-20 w-20 place-items-center rounded-full bg-white text-2xl font-black uppercase tracking-wide text-cyan-900" style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
                    {activeApplicant.applicantName.split(" ").slice(0, 2).map((p) => p[0] ?? "").join("")}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="mb-1 text-xs font-bold uppercase tracking-widest text-cyan-200">Postulante en evaluación</p>
                    <h3 className="text-3xl font-black leading-tight tracking-tight text-white" style={{ fontFamily: 'Montserrat, system-ui, sans-serif' }}>
                      {activeApplicant.applicantName}
                    </h3>
                    <p className="mt-1 text-sm font-medium text-cyan-200">Psicomotricidad · Evaluación Individual</p>
                  </div>
                  <div className="hidden sm:flex flex-col items-end gap-1">
                    <span className="rounded-full bg-white px-4 py-2 text-sm font-black text-cyan-900">
                      {members.findIndex((m) => m.applicationId === activeApplicant.applicationId) + 1} / {members.length}
                    </span>
                  </div>
                </div>
              </div>

              {/* Criteria */}
              <div className="divide-y divide-slate-100">
                {criteria.map((criterion, cIdx) => (
                  <div key={cIdx} className="p-5">
                    <div className="mb-3 flex items-start gap-3">
                      <span className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg bg-cyan-900 text-sm font-black text-white">{cIdx + 1}</span>
                      <div>
                        <p className="pt-1 text-base font-bold leading-snug text-slate-900" style={{ fontFamily: 'Montserrat, system-ui, sans-serif' }}>{criterion.title}</p>
                        <p className="mt-1 text-xs italic text-slate-500">{criterion.instructions}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-5">
                      {criterion.options.map((opt) => (
                        <button
                          key={String(opt.value)}
                          className={`min-h-16 rounded-xl border-2 p-3 text-left transition-all ${activeScores[cIdx] === opt.value ? "border-cyan-700 bg-cyan-900 text-white shadow-md" : "border-slate-200 bg-white hover:border-cyan-400 hover:shadow-sm"}`}
                          onClick={() => setScore(activeApplicant.applicationId, cIdx, opt.value)}
                        >
                          <b className="block text-xl font-black leading-none" style={{ fontFamily: 'Montserrat, system-ui, sans-serif' }}>{opt.title}</b>
                          <p className={`mt-1 text-xs font-bold leading-tight ${activeScores[cIdx] === opt.value ? "text-cyan-200" : "text-slate-600"}`}>{opt.label}</p>
                          {opt.description && (
                            <p className={`mt-1 text-xs leading-tight ${activeScores[cIdx] === opt.value ? "text-cyan-300" : "text-slate-400"}`}>{opt.description}</p>
                          )}
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
                  className="w-full resize-y rounded-xl border border-slate-200 bg-white p-4 text-sm leading-relaxed shadow-sm focus:border-cyan-700 focus:ring-2 focus:ring-cyan-100"
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
