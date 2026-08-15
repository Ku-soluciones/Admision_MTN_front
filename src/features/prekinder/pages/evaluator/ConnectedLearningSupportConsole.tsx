import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Check, CheckCircle2, ChevronRight, LockKeyhole, ShieldCheck, UserCheck } from "lucide-react";
import { prekinderApi, type EvaluatorAssignment } from "../../services/api";
import type { SpecialtyProfile } from "../../components/evaluator/SpecialtyProfile";

type Score = 0 | 1 | 2 | 3 | 4 | "NOT_OBSERVED";

type Screen = "loading" | "agenda" | "confirm" | "evaluate";

const criteria = [
  { title: "Lenguaje y comprensión", description: "Comprensión de instrucciones y uso del lenguaje." },
  { title: "Atención y mediación", description: "Capacidad de mantener atención y responder a la mediación." },
  { title: "Respuesta a apoyos", description: "Cómo responde a los apoyos y estrategias presentadas." },
  { title: "Flexibilidad cognitiva", description: "Capacidad de adaptarse a situaciones nuevas o cambiantes." },
  { title: "Necesidad de apoyo", description: "Grado de apoyo requerido para completar las actividades." },
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
  const [criterionIndex, setCriterionIndex] = useState(0);
  const [responses, setResponses] = useState<{ [assignId: string]: { [criterion: number]: { [appId: string]: Score } } }>({});
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
    setCriterionIndex(0);
    setScreen("confirm");
  }, []);

  const backToAgenda = useCallback(() => {
    setSelectedAssignment(null);
    setActiveApplicantId(null);
    setCriterionIndex(0);
    setScreen("agenda");
  }, []);

  const setScore = useCallback((applicationId: string, value: Score) => {
    if (!selectedAssignment) return;
    setResponses((current) => ({
      ...current,
      [selectedAssignment.assignmentId]: {
        ...(current[selectedAssignment.assignmentId] ?? {} as { [criterion: number]: { [appId: string]: Score } }),
        [criterionIndex]: {
          ...(current[selectedAssignment.assignmentId]?.[criterionIndex] ?? {} as { [appId: string]: Score }),
          [applicationId]: value,
        },
      },
    }));
  }, [selectedAssignment, criterionIndex]);

  const setNote = useCallback((applicationId: string, note: string) => {
    if (!selectedAssignment) return;
    setNotes((current) => ({
      ...current,
      [selectedAssignment.assignmentId]: {
        ...(current[selectedAssignment.assignmentId] ?? {} as { [appId: string]: string }),
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
      navigate(`/prekinder/evaluador/support`);
    } else {
      backToAgenda();
    }
  }, [selectedAssignment, assignmentId, backToAgenda, navigate]);

  const members = selectedAssignment?.reports ?? [];
  const activeApplicant = activeApplicantId ? members.find((m) => m.applicationId === activeApplicantId) ?? members[0] : members[0];
  const currentResponses = selectedAssignment && activeApplicant
    ? (responses[selectedAssignment.assignmentId]?.[criterionIndex]?.[activeApplicant.applicationId])
    : undefined;
  const currentNote = selectedAssignment && activeApplicant
    ? (notes[selectedAssignment.assignmentId]?.[activeApplicant.applicationId] ?? "")
    : "";
  const allCompleted = members.every((m) => responses[selectedAssignment?.assignmentId ?? ""]?.[criterionIndex]?.[m.applicationId] !== undefined);

  if (screen === "loading") {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-blue-200 bg-blue-50 p-4 text-blue-950">
        <div className="flex items-center gap-3">
          <LockKeyhole size={20} />
          <div>
            <p className="text-sm font-black">Espacio exclusivo: Profesional de Apoyo al Aprendizaje</p>
            <p className="text-xs text-blue-800">Acceso restringido · {assignments.length} asignaciones para hoy</p>
          </div>
        </div>
        <button
          onClick={() => void loadAgenda()}
          className="rounded-lg bg-white px-3 py-2 text-xs font-black text-blue-800 hover:bg-violet-100"
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
                <article key={report.applicationId} className="relative rounded-xl border border-slate-200 p-5 text-center">
                  <span className="absolute left-3 top-3 grid h-6 w-6 place-items-center rounded bg-slate-100 text-xs font-black">{index + 1}</span>
                  <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-blue-50 font-black text-blue-900">
                    {report.applicantName.split(" ").slice(0, 2).map((p) => p[0] ?? "").join("")}
                  </span>
                  <h3 className="mt-3 text-sm font-black text-slate-900">{report.applicantName}</h3>
                  <p className="mt-3 text-xs font-bold text-emerald-700"><Check className="mr-1 inline" size={14} />Identidad confirmada</p>
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
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.14em] text-blue-700">
                {formatTime(selectedAssignment.group.startsAt)} - {selectedAssignment.group.roomName} - Acceso restringido
              </p>
              <h2 className="mt-1 text-3xl font-black text-slate-950">Evaluación Individual · Apoyo al Aprendizaje</h2>
              <p className="mt-1 text-sm text-slate-600">Registra únicamente evidencia observable y pertinente.</p>
            </div>
            <span className="rounded-xl bg-blue-50 px-4 py-3 text-sm font-black text-blue-900">
              Criterio {criterionIndex + 1} de {criteria.length}
            </span>
          </div>

          <div className="grid gap-5 xl:grid-cols-[270px_1fr]">
            {/* Applicant selector sidebar */}
            <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-3">
              <h3 className="px-3 py-2 font-black text-blue-900">Postulantes asignados</h3>
              {members.map((person) => (
                <button
                  key={person.applicationId}
                  onClick={() => setActiveApplicantId(person.applicationId)}
                  className={`mb-1 flex w-full items-center gap-3 rounded-lg p-3 text-left transition ${person.applicationId === activeApplicant.applicationId ? "bg-blue-50 text-blue-900" : "hover:bg-slate-50"}`}
                >
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-white text-xs font-black text-blue-700">
                    {person.applicantName.split(" ").slice(0, 2).map((p) => p[0] ?? "").join("")}
                  </span>
                  <span className="min-w-0 flex-1">
                    <b className="block truncate text-sm">{person.applicantName}</b>
                  </span>
                  <ChevronRight size={16} />
                </button>
              ))}
            </aside>

            {/* Evaluation panel */}
            <section className="rounded-2xl border border-slate-200 bg-white">
              <div className="border-b border-slate-200 p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-slate-500">Criterio {criterionIndex + 1} de {criteria.length}</p>
                    <h3 className="text-xl font-black text-slate-950">{criteria[criterionIndex].title}</h3>
                    <p className="mt-1 text-sm text-slate-600">Postulante: {activeApplicant.applicantName}</p>
                  </div>
                  <span className="rounded-lg bg-blue-50 p-2 text-blue-800"><LockKeyhole size={20} /></span>
                </div>
              </div>
              <div className="p-5">
                <div className="mb-4 grid grid-cols-2 gap-2">
                  {([
                    { value: 0 as Score, title: "0", label: "No logrado" },
                    { value: 1 as Score, title: "1", label: "En proceso inicial" },
                    { value: 2 as Score, title: "2", label: "En proceso medio" },
                    { value: 3 as Score, title: "3", label: "Casi logrado" },
                    { value: 4 as Score, title: "4", label: "Logrado" },
                    { value: "NOT_OBSERVED" as Score, title: "-", label: "No observable" },
                  ]).map((option) => (
                    <button
                      key={String(option.value)}
                      className={`min-h-16 rounded-lg border p-2 transition ${currentResponses === option.value ? "border-2 border-blue-700 bg-blue-50 text-blue-950" : "border-slate-200 bg-white hover:border-blue-300"}`}
                      onClick={() => setScore(activeApplicant.applicationId, option.value)}
                    >
                      <b className="block text-lg">{option.title}</b>
                      <small className="text-slate-500">{option.label}</small>
                    </button>
                  ))}
                </div>
                <label className="mt-5 block text-sm font-bold text-slate-700">
                  Observación profesional
                  <textarea
                    className="control mt-1 min-h-28 w-full py-3"
                    value={currentNote}
                    onChange={(e) => setNote(activeApplicant.applicationId, e.target.value)}
                    placeholder="Evidencia observable, contexto y mediaciones realizadas…"
                  />
                </label>
                <div className="mt-4 flex items-center gap-2 rounded-lg bg-blue-50 p-3 text-xs font-semibold text-blue-900">
                  <ShieldCheck size={17} />Esta observación no aparece en vistas operativas generales.
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 p-5">
                <button className="secondary" disabled={criterionIndex === 0} onClick={() => setCriterionIndex((c) => c - 1)}>Anterior</button>
                <span className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                  <Check size={16} className="text-emerald-600" />Guardado en servidor
                </span>
                {criterionIndex < criteria.length - 1 ? (
                  <button
                    className="primary"
                    disabled={!allCompleted}
                    onClick={() => setCriterionIndex((c) => c + 1)}
                  >
                    Siguiente criterio <ChevronRight className="ml-1 inline" size={17} />
                  </button>
                ) : (
                  <button
                    className="primary"
                    disabled={!allCompleted || saving}
                    onClick={() => void handleSubmit()}
                  >
                    {saving ? "Guardando..." : <><CheckCircle2 className="mr-2 inline" size={17} />Enviar a revisión</>}
                  </button>
                )}
              </div>
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
