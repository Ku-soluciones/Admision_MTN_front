import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Check, CheckCircle2, ChevronRight, LockKeyhole, ShieldCheck, UserCheck } from "lucide-react";
import { prekinderApi, type EvaluatorAssignment } from "../../services/api";
import type { SpecialtyProfile } from "../../components/evaluator/SpecialtyProfile";

type Score = 0 | 1 | 2 | 3 | 4 | "NOT_OBSERVED";

type Screen = "loading" | "agenda" | "confirm" | "evaluate";

const criteria = [
  {
    title: "Lenguaje y comprensión",
    description: "Comprensión de instrucciones y uso del lenguaje oral y escrito.",
    options: [
      { value: 0 as Score, title: "0", label: "No demuestra comprensión." },
      { value: 1 as Score, title: "1", label: "Comprensión muy limitada." },
      { value: 2 as Score, title: "2", label: "Comprensión parcial de instrucciones." },
      { value: 3 as Score, title: "3", label: "Comprende instrucciones con algún apoyo." },
      { value: 4 as Score, title: "4", label: "Comprende y sigue instrucciones sin apoyo." },
      { value: "NOT_OBSERVED" as Score, title: "—", label: "No observable" },
    ],
  },
  {
    title: "Atención y mediación",
    description: "Capacidad de mantener atención sostenida y responder a la mediación del adulto.",
    options: [
      { value: 0 as Score, title: "0", label: "No mantiene atención, no responde a mediación." },
      { value: 1 as Score, title: "1", label: "Atención muy fugaz, requiere apoyo constante." },
      { value: 2 as Score, title: "2", label: "Atención inestable, responde parcialmente." },
      { value: 3 as Score, title: "3", label: "Mantiene atención con mediación intermitente." },
      { value: 4 as Score, title: "4", label: "Mantiene atención sostenida de forma autónoma." },
      { value: "NOT_OBSERVED" as Score, title: "—", label: "No observable" },
    ],
  },
  {
    title: "Respuesta a apoyos",
    description: "Cómo responde a los apoyos, estrategias y andamiajes presentados.",
    options: [
      { value: 0 as Score, title: "0", label: "No responde a los apoyos presentados." },
      { value: 1 as Score, title: "1", label: "Respeta marginalmente a los apoyos." },
      { value: 2 as Score, title: "2", label: "Utiliza algunos apoyos de forma inconsistente." },
      { value: 3 as Score, title: "3", label: "Utiliza apoyos de forma adecuada." },
      { value: 4 as Score, title: "4", label: "Utiliza y solicita apoyos de forma autónoma." },
      { value: "NOT_OBSERVED" as Score, title: "—", label: "No observable" },
    ],
  },
  {
    title: "Flexibilidad cognitiva",
    description: "Capacidad de adaptarse a situaciones nuevas, cambiantes o inesperadas.",
    options: [
      { value: 0 as Score, title: "0", label: "Rigidez total ante cambios." },
      { value: 1 as Score, title: "1", label: "Dificultad significativa para adaptarse." },
      { value: 2 as Score, title: "2", label: "Se adapta parcialmente tras mucho apoyo." },
      { value: 3 as Score, title: "3", label: "Se adapta a cambios con apoyo moderado." },
      { value: 4 as Score, title: "4", label: "Se adapta con flexibilidad a situaciones nuevas." },
      { value: "NOT_OBSERVED" as Score, title: "—", label: "No observable" },
    ],
  },
  {
    title: "Necesidad de apoyo",
    description: "Grado de apoyo requerido para completar las actividades y tareas propuestas.",
    options: [
      { value: 0 as Score, title: "0", label: "Requiere apoyo extenso y constante." },
      { value: 1 as Score, title: "1", label: "Requiere apoyo significativo." },
      { value: 2 as Score, title: "2", label: "Requiere apoyo moderado." },
      { value: 3 as Score, title: "3", label: "Requiere apoyo leve o esporádico." },
      { value: 4 as Score, title: "4", label: "Trabaja de forma autónoma sin apoyo." },
      { value: "NOT_OBSERVED" as Score, title: "—", label: "No observable" },
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

export function ConnectedLearningSupportConsole({ profile }: Props) {
  const { assignmentId } = useParams();
  const navigate = useNavigate();
  const [screen, setScreen] = useState<Screen>("loading");
  const [assignments, setAssignments] = useState<EvaluatorAssignment[]>([]);
  const [selectedAssignment, setSelectedAssignment] = useState<EvaluatorAssignment | null>(null);
  const [activeApplicantId, setActiveApplicantId] = useState<string | null>(null);
  const [responses, setResponses] = useState<{ [assignId: string]: { [appId: string]: (Score | undefined)[] } }>({});
  const [notes, setNotes] = useState<{ [assignId: string]: { [appId: string]: string } }>({});
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

  const setNote = useCallback((applicationId: string, note: string) => {
    if (!selectedAssignment) return;
    setNotes((current) => ({
      ...current,
      [selectedAssignment.assignmentId]: {
        ...(current[selectedAssignment.assignmentId] ?? {}),
        [applicationId]: note,
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
      navigate(`/prekinder/evaluador/learning-support`);
    } else {
      backToAgenda();
    }
  }, [selectedAssignment, assignmentId, backToAgenda, navigate]);

  const members = selectedAssignment?.reports ?? [];
  const activeApplicant = activeApplicantId ? members.find((m) => m.applicationId === activeApplicantId) ?? members[0] : members[0];
  const activeScores = selectedAssignment && activeApplicant
    ? (responses[selectedAssignment.assignmentId]?.[activeApplicant.applicationId] ?? Array(criteria.length).fill(undefined))
    : Array(criteria.length).fill(undefined);
  const activeNote = selectedAssignment && activeApplicant
    ? (notes[selectedAssignment.assignmentId]?.[activeApplicant.applicationId] ?? "")
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
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-blue-200 bg-blue-950 p-4 text-white">
        <div className="flex items-center gap-3">
          <LockKeyhole size={20} />
          <div>
            <p className="text-sm font-black">Espacio exclusivo: Profesional de Apoyo al Aprendizaje</p>
            <p className="text-xs text-blue-300">Acceso restringido · {assignments.length} asignaciones para hoy</p>
          </div>
        </div>
        <button
          onClick={() => void loadAgenda()}
          className="rounded-lg bg-white px-3 py-2 text-xs font-black text-blue-950 hover:bg-blue-100"
        >
          Actualizar
        </button>
      </div>

      {/* Agenda */}
      {screen === "agenda" && (
        <div>
          <div className="mb-5">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-blue-700">Espacio del evaluador</p>
            <h2 className="mt-1 text-3xl font-black text-slate-950">Mis casos derivados</h2>
            <p className="mt-1 text-sm text-slate-600">Solo postulantes derivados y autorizados para esta especialidad.</p>
          </div>
          {assignments.length === 0 ? (
            <div className="py-12 text-center text-gray-500">
              <p>No hay casos derivados para hoy.</p>
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
                {formatTime(selectedAssignment.group.startsAt)} · {selectedAssignment.group.roomName} · {selectedAssignment.group.code} · Acceso restringido
              </p>
              <h2 className="text-3xl font-black tracking-tight text-slate-950" style={{ fontFamily: 'Montserrat, system-ui, sans-serif' }}>Evaluación Individual · Apoyo al Aprendizaje</h2>
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
              <div className="rounded-t-2xl border-b border-slate-200 bg-gradient-to-r from-blue-800 to-blue-900 p-6">
                <div className="flex items-center gap-5">
                  <span className="grid h-20 w-20 place-items-center rounded-full bg-white text-2xl font-black uppercase tracking-wide text-blue-900" style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
                    {activeApplicant.applicantName.split(" ").slice(0, 2).map((p) => p[0] ?? "").join("")}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="mb-1 text-xs font-bold uppercase tracking-widest text-blue-200">Postulante en evaluación</p>
                    <h3 className="text-3xl font-black leading-tight tracking-tight text-white" style={{ fontFamily: 'Montserrat, system-ui, sans-serif' }}>
                      {activeApplicant.applicantName}
                    </h3>
                    <p className="mt-1 text-sm font-medium text-blue-200">Apoyo al Aprendizaje · Evaluación Individual · Acceso Restringido</p>
                  </div>
                  <div className="hidden sm:flex flex-col items-end gap-1">
                    <span className="rounded-full bg-blue-400 px-4 py-2 text-sm font-black text-blue-900">
                      {members.findIndex((m) => m.applicationId === activeApplicant.applicationId) + 1} / {members.length}
                    </span>
                  </div>
                </div>
              </div>

              {/* Restricted access notice */}
              <div className="flex items-center gap-3 border-b border-blue-100 bg-blue-50 px-5 py-3">
                <ShieldCheck size={17} className="text-blue-700 flex-shrink-0" />
                <p className="text-xs font-semibold text-blue-800">Esta observación no aparece en vistas operativas generales. Solo el equipo diretivo tiene acceso.</p>
              </div>

              <div className="divide-y divide-slate-100">
                {criteria.map((criterion, cIdx) => (
                  <div key={cIdx} className="p-5">
                    <div className="mb-4 flex items-start gap-3">
                      <span className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg bg-blue-900 text-sm font-black text-white">{cIdx + 1}</span>
                      <div>
                        <p className="pt-1 text-base font-bold leading-snug text-slate-900" style={{ fontFamily: 'Montserrat, system-ui, sans-serif' }}>{criterion.title}</p>
                        <p className="mt-0.5 text-xs text-slate-500">{criterion.description}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 xl:grid-cols-6">
                      {criterion.options.map((opt) => (
                        <button
                          key={String(opt.value)}
                          className={`min-h-14 rounded-xl border-2 p-3 text-center transition-all ${activeScores[cIdx] === opt.value ? "border-blue-700 bg-blue-700 text-white shadow-md" : "border-slate-200 bg-white hover:border-blue-400 hover:shadow-sm"}`}
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

              {/* Observación profesional */}
              <div className="border-t border-slate-200 bg-slate-50/50 p-5">
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Observación profesional
                </label>
                <textarea
                  className="w-full resize-y rounded-xl border border-slate-200 bg-white p-4 text-sm leading-relaxed shadow-sm focus:border-blue-700 focus:ring-2 focus:ring-blue-100"
                  rows={4}
                  value={activeNote}
                  onChange={(e) => setNote(activeApplicant.applicationId, e.target.value)}
                  placeholder="Evidencia observable, contexto y mediaciones realizadas…"
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
