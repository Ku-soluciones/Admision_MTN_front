import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Check, CheckCircle2, ChevronRight, UserCheck } from "lucide-react";
import { prekinderApi, type AgendaWithInstrument } from "../../services/api";
import type { SpecialtyProfile } from "../../components/evaluator/SpecialtyProfile";

type Score = 0 | 1 | 2 | 3 | 4 | "NOT_OBSERVED";

type Screen = "loading" | "agenda" | "confirm" | "evaluate";

const criteria = [
  { title: "Informacion", description: "Reconoce, relaciona y clasifica informacion presentada." },
  { title: "Clasificacion", description: "Agrupa elementos segun una caracteristica observable." },
  { title: "Seriacion", description: "Ordena elementos utilizando una secuencia o magnitud." },
  { title: "Patrones", description: "Identifica y continua patrones simples." },
  { title: "Lenguaje comprensivo", description: "Comprende instrucciones y conceptos verbales." },
  { title: "Lenguaje expresivo", description: "Comunica ideas utilizando vocabulario pertinente." },
  { title: "Atencion verbal", description: "Mantiene la atencion durante una consigna oral." },
  { title: "Memoria de trabajo", description: "Retiene informacion breve para completar una tarea." },
  { title: "Resolucion de problemas", description: "Explora alternativas frente a una tarea nueva." },
  { title: "Autonomia en la tarea", description: "Inicia y completa la actividad con mediacion adecuada." },
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
  const [assignments, setAssignments] = useState<AgendaWithInstrument[]>([]);
  const [selectedAssignment, setSelectedAssignment] = useState<AgendaWithInstrument | null>(null);
  const [criterionIndex, setCriterionIndex] = useState(0);
  const [responses, setResponses] = useState<{ [assignId: string]: { [criterion: number]: { [appId: string]: Score } } }>({});
  const [comments, setComments] = useState<{ [assignId: string]: { [appId: string]: string } }>({});
  const [submitted, setSubmitted] = useState<{ [assignId: string]: boolean }>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => { void loadAgenda(); }, [profile]);

  async function loadAgenda() {
    setScreen("loading");
    try {
      const data = await prekinderApi.evaluatorAgenda(today(), profile);
      const filtered = data.filter((item) => item.instrumentCode === profile);
      setAssignments(filtered);

      // Si vino con assignmentId en la URL, auto-seleccionar
      if (assignmentId) {
        const found = filtered.find((a) => a.group.groupId === assignmentId);
        if (found) {
          setSelectedAssignment(found);
          setScreen("confirm");
        } else {
          setScreen("agenda");
        }
      } else {
        setScreen("agenda");
      }
    } catch {
      setAssignments([]);
      setScreen(assignmentId ? "agenda" : "agenda");
    }
  }

  const openAssignment = useCallback((assignment: AgendaWithInstrument) => {
    setSelectedAssignment(assignment);
    setCriterionIndex(0);
    setScreen("confirm");
  }, []);

  const backToAgenda = useCallback(() => {
    setSelectedAssignment(null);
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

  const setGroupComment = useCallback((applicationId: string, comment: string) => {
    if (!selectedAssignment) return;
    setComments((current) => ({
      ...current,
      [selectedAssignment.assignmentId]: {
        ...(current[selectedAssignment.assignmentId] ?? {} as { [appId: string]: string }),
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

  const currentResponses = selectedAssignment
    ? (responses[selectedAssignment.assignmentId]?.[criterionIndex] ?? {})
    : {};
  const members = selectedAssignment?.reports ?? [];
  const completed = members.filter((m) => currentResponses[m.applicationId] !== undefined).length;
  const groupComments = selectedAssignment
    ? (comments[selectedAssignment.assignmentId] ?? {})
    : {};

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
          <UserCheck size={20} />
          <div>
            <p className="text-sm font-black">Espacio exclusivo: Evaluador académico</p>
            <p className="text-xs text-blue-800">{assignments.length} asignaciones para hoy</p>
          </div>
        </div>
        <button
          onClick={() => void loadAgenda()}
          className="rounded-lg bg-white px-3 py-2 text-xs font-black text-blue-800 hover:bg-blue-100"
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
                {saving ? "Iniciando..." : <>Comenzar evaluación simultánea <ChevronRight className="ml-1 inline" size={17} /></>}
              </button>
            </div>
          </section>
        </div>
      )}

      {/* Evaluate */}
      {screen === "evaluate" && selectedAssignment && (
        <div>
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.14em] text-blue-700">
                {formatTime(selectedAssignment.group.startsAt)} - {selectedAssignment.group.roomName} - {selectedAssignment.group.code}
              </p>
              <h2 className="mt-1 text-3xl font-black text-slate-950">Evaluación académica</h2>
              <p className="mt-1 text-sm text-slate-600">Un criterio a la vez, con los postulantes visibles en paralelo.</p>
            </div>
            <span className="rounded-xl bg-blue-50 px-4 py-3 text-sm font-black text-blue-900">
              Criterio {criterionIndex + 1} de {criteria.length}
            </span>
          </div>

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_12px_32px_rgba(15,23,42,0.05)]">
            <div className="flex flex-wrap items-center gap-4 border-b border-slate-200 p-5">
              <span className="grid h-14 w-14 place-items-center rounded-xl bg-blue-900 text-xl font-black text-white">{criterionIndex + 1}</span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-500">Pauta observable</p>
                <h3 className="text-xl font-black text-slate-950">{criteria[criterionIndex].title}</h3>
                <p className="mt-1 text-sm text-slate-600">{criteria[criterionIndex].description}</p>
              </div>
              <strong className={completed === members.length ? "text-emerald-700" : "text-slate-600"}>
                {completed}/{members.length} completos
              </strong>
            </div>

            <div className="grid gap-4 p-5 xl:grid-cols-3">
              {members.map((report) => (
                <article key={report.applicationId} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
                    <span className="grid h-11 w-11 place-items-center rounded-full bg-blue-50 text-sm font-black text-blue-900">
                      {report.applicantName.split(" ").slice(0, 2).map((p) => p[0] ?? "").join("")}
                    </span>
                    <div>
                      <h4 className="font-black text-slate-900">{report.applicantName}</h4>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    {([
                      { value: 0 as Score, title: "0", label: "No logrado" },
                      { value: 1 as Score, title: "1", label: "Inicial" },
                      { value: 2 as Score, title: "2", label: "En desarrollo" },
                      { value: 3 as Score, title: "3", label: "Adeculado" },
                      { value: 4 as Score, title: "4", label: "Logrado" },
                      { value: "NOT_OBSERVED" as Score, title: "-", label: "No observado" },
                    ]).map((option) => (
                      <button
                        key={String(option.value)}
                        className={`min-h-16 rounded-lg border p-2 transition ${currentResponses[report.applicationId] === option.value ? "border-2 border-blue-700 bg-blue-50 text-blue-950" : "border-slate-200 bg-white hover:border-blue-300"}`}
                        onClick={() => setScore(report.applicationId, option.value)}
                      >
                        <b className="block text-lg">{option.title}</b>
                        <small className="text-slate-500">{option.label}</small>
                      </button>
                    ))}
                  </div>
                  <div className="mt-4">
                    <label className="mb-1 block text-xs font-bold text-slate-600">Comentarios del evaluador</label>
                    <textarea
                      className="min-h-20 w-full resize-y rounded-lg border border-slate-200 p-2 text-sm"
                      value={groupComments[report.applicationId] ?? ""}
                      onChange={(e) => setGroupComment(report.applicationId, e.target.value)}
                      placeholder="Observaciones sobre este postulante..."
                    />
                  </div>
                </article>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 p-5">
              <button className="secondary" disabled={criterionIndex === 0} onClick={() => setCriterionIndex((c) => c - 1)}>Anterior</button>
              <span className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                <Check size={16} className="text-emerald-600" />Guardado en servidor
              </span>
              {criterionIndex < criteria.length - 1 ? (
                <button
                  className="primary"
                  disabled={completed !== members.length}
                  onClick={() => setCriterionIndex((c) => c + 1)}
                >
                  Siguiente criterio <ChevronRight className="ml-1 inline" size={17} />
                </button>
              ) : (
                <button
                  className="primary"
                  disabled={completed !== members.length || saving}
                  onClick={() => void handleSubmit()}
                >
                  {saving ? "Guardando..." : <><CheckCircle2 className="mr-2 inline" size={17} />Enviar a revisión</>}
                </button>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
