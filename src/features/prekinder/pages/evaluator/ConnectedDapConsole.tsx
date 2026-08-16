import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Check, CheckCircle2, ChevronRight, LockKeyhole, ShieldCheck, UserCheck } from "lucide-react";
import { prekinderApi, type EvaluatorAssignment } from "../../services/api";
import type { SpecialtyProfile } from "../../components/evaluator/SpecialtyProfile";

type Score = 0 | 1 | 2 | 3 | 4 | "NOT_OBSERVED";

type Screen = "loading" | "agenda" | "confirm" | "evaluate";

const criteria = [
  {
    title: "Antecedentes pertinentes",
    description: "Los antecedentes familiares y de desarrollo entregados por el/apoderado son pertinentes y relevantes para la observación.",
    options: [
      { value: 0 as Score, title: "0", label: "Sin antecedentes o no pertinentes." },
      { value: 1 as Score, title: "1", label: "Antecedentes escasos o parcialmente pertinentes." },
      { value: 2 as Score, title: "2", label: "Antecedentes pertinentes con algunas lagunas." },
      { value: 3 as Score, title: "3", label: "Antecedentes pertinentes y completos." },
      { value: 4 as Score, title: "4", label: "Antecedentes ricos en detalle y muy pertinentes." },
      { value: "NOT_OBSERVED" as Score, title: "—", label: "No observable" },
    ],
  },
  {
    title: "Adaptación al contexto",
    description: "El postulante se adapta de manera adecuada al contexto escolar y a las dinámicas del grupo.",
    options: [
      { value: 0 as Score, title: "0", label: "No se adapta al contexto escolar." },
      { value: 1 as Score, title: "1", label: "Se adapta con dificultad, requiere apoyo constante." },
      { value: 2 as Score, title: "2", label: "Se adapta parcialmente al contexto." },
      { value: 3 as Score, title: "3", label: "Se adapta adecuadamente al contexto escolar." },
      { value: 4 as Score, title: "4", label: "Se adapta de forma óptima y Modela a otros." },
      { value: "NOT_OBSERVED" as Score, title: "—", label: "No observable" },
    ],
  },
  {
    title: "Observación especializada",
    description: "Hallazgos relevantes observados durante la evaluación que requieren registro especializado.",
    options: [
      { value: 0 as Score, title: "0", label: "Sin hallazgos relevantes." },
      { value: 1 as Score, title: "1", label: "Hallazgos menores, sin relevancia clínica." },
      { value: 2 as Score, title: "2", label: "Hallazgos moderados que merecen seguimiento." },
      { value: 3 as Score, title: "3", label: "Hallazgos significativos que requieren seguimiento." },
      { value: 4 as Score, title: "4", label: "Hallazgos críticos que requieren intervención inmediata." },
      { value: "NOT_OBSERVED" as Score, title: "—", label: "No observable" },
    ],
  },
  {
    title: "Necesidad de profundización",
    description: "Áreas del desarrollo del postulante que requieren mayor investigación, evaluación o seguimiento.",
    options: [
      { value: 0 as Score, title: "0", label: "No se identifica necesidad de profundización." },
      { value: 1 as Score, title: "1", label: "Áreas menores que podrian profundizarse." },
      { value: 2 as Score, title: "2", label: "Algunas áreas que requieren mayor seguimiento." },
      { value: 3 as Score, title: "3", label: "Áreas importantes que requieren profundización." },
      { value: 4 as Score, title: "4", label: "Áreas críticas que requieren evaluación urgente." },
      { value: "NOT_OBSERVED" as Score, title: "—", label: "No observable" },
    ],
  },
  {
    title: "Recomendación restringida",
    description: "Orientación profesional especializada y restringida para el proceso de admisión.",
    options: [
      { value: 0 as Score, title: "0", label: "Sin recomendación Restringida." },
      { value: 1 as Score, title: "1", label: "Recomendación favorable con observaciones menores." },
      { value: 2 as Score, title: "2", label: "Recomendación favorable con condiciones." },
      { value: 3 as Score, title: "3", label: "Recomendación reservada, requiere seguimiento." },
      { value: 4 as Score, title: "4", label: "Recomendación desfavorable para el proceso." },
      { value: "NOT_OBSERVED" as Score, title: "—", label: "No observable" },
    ],
  },
  { title: "Antecedentes pertinentes", description: "Relevancia de los antecedentes familiares y de desarrollo." },
  { title: "Adaptación al contexto", description: "Cómo se adapta el postulante al contexto escolar." },
  { title: "Observación especializada", description: "Hallazgos relevantes de la observación especializada." },
  { title: "Necesidad de profundización", description: "Áreas que requieren mayor investigación o seguimiento." },
  { title: "Recomendación restringida", description: "Orientación especializada para el proceso de admisión." },
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

export function ConnectedDapConsole({ profile }: Props) {
  const { assignmentId } = useParams();
  const navigate = useNavigate();
  const [screen, setScreen] = useState<Screen>("loading");
  const [assignments, setAssignments] = useState<EvaluatorAssignment[]>([]);
  const [selectedAssignment, setSelectedAssignment] = useState<EvaluatorAssignment | null>(null);
  const [activeApplicantId, setActiveApplicantId] = useState<string | null>(null);
  const [responses, setResponses] = useState<{ [assignId: string]: { [appId: string]: (Score | undefined)[] } }>({});
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
        ...(current[selectedAssignment.assignmentId] ?? {}),
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
      navigate(`/prekinder/evaluador/dap`);
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
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-violet-600" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-violet-200 bg-violet-950 p-4 text-white">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-violet-200 bg-violet-50 p-4 text-violet-950">
        <div className="flex items-center gap-3">
          <LockKeyhole size={20} />
          <div>
            <p className="text-sm font-black">Espacio exclusivo: Profesional DAP</p>
            <p className="text-xs text-violet-300">Acceso restringido · {assignments.length} asignaciones para hoy</p>
            <p className="text-xs text-violet-800">Acceso restringido · {assignments.length} asignaciones para hoy</p>
          </div>
        </div>
        <button
          onClick={() => void loadAgenda()}
          className="rounded-lg bg-white px-3 py-2 text-xs font-black text-violet-950 hover:bg-violet-100"
          className="rounded-lg bg-white px-3 py-2 text-xs font-black text-violet-800 hover:bg-violet-100"
        >
          Actualizar
        </button>
      </div>

      {/* Agenda */}
      {screen === "agenda" && (
        <div>
          <div className="mb-5">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-violet-700">Espacio del evaluador</p>
            <h2 className="mt-1 text-3xl font-black text-slate-950">Registro especializado</h2>
            <p className="mt-1 text-sm text-slate-600">Registro especializado y restringido cuando corresponde.</p>
          </div>
          {assignments.length === 0 ? (
            <div className="py-12 text-center text-gray-500">
              <p>No hay asignaciones para hoy.</p>
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
                    className="grid w-full min-h-20 items-center overflow-hidden rounded-xl border border-slate-200 bg-white text-left shadow-sm transition hover:border-violet-400 md:grid-cols-[110px_1fr_140px]"
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
                      <span className={`rounded-full px-3 py-1 text-xs font-bold ${isSubmitted ? "bg-green-100 text-green-800" : isCompleted ? "bg-green-100 text-green-800" : "bg-violet-50 text-violet-800"}`}>
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
            <p className="text-xs font-black uppercase tracking-[0.14em] text-violet-700">
              {formatTime(selectedAssignment.group.startsAt)} - {selectedAssignment.group.roomName}
            </p>
            <h2 className="mt-1 text-3xl font-black text-slate-950">Confirmar grupo</h2>
            <p className="mt-1 text-sm text-slate-600">Antes de evaluar, verifica que los postulantes correspondan al bloque.</p>
          </div>
          <section className="rounded-2xl border border-slate-200 bg-white">
            <div className="grid gap-4 p-5 md:grid-cols-3">
              {selectedAssignment.reports.map((report, index) => (
                <article key={report.applicationId} className="relative rounded-xl border border-slate-200 bg-slate-50/40 p-6 text-center">
                  <span className="absolute left-3 top-3 grid h-7 w-7 place-items-center rounded-full bg-violet-900 text-xs font-black text-white">{index + 1}</span>
                  <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-violet-100 text-xl font-black uppercase text-violet-900">
                    {report.applicantName.split(" ").slice(0, 2).map((p) => p[0] ?? "").join("")}
                  </span>
                  <h3 className="mt-3 text-base font-black leading-tight text-slate-900" style={{ fontFamily: 'Montserrat, system-ui, sans-serif' }}>{report.applicantName}</h3>
                  <p className="mt-2 flex items-center justify-center gap-1 text-xs font-bold text-emerald-600"><Check size={13} />Identidad confirmada</p>
                <article key={report.applicationId} className="relative rounded-xl border border-slate-200 p-5 text-center">
                  <span className="absolute left-3 top-3 grid h-6 w-6 place-items-center rounded bg-slate-100 text-xs font-black">{index + 1}</span>
                  <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-violet-50 font-black text-violet-900">
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
          <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="mb-1 text-xs font-bold uppercase tracking-widest text-violet-700">
                {formatTime(selectedAssignment.group.startsAt)} · {selectedAssignment.group.roomName} · {selectedAssignment.group.code} · Acceso restringido
              </p>
              <h2 className="text-3xl font-black tracking-tight text-slate-950" style={{ fontFamily: 'Montserrat, system-ui, sans-serif' }}>Evaluación Individual · DAP</h2>
              <p className="mt-1 text-sm text-slate-500">Completa todos los criterios antes de enviar la evaluación.</p>
            </div>
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.14em] text-violet-700">
                {formatTime(selectedAssignment.group.startsAt)} - {selectedAssignment.group.roomName} - Acceso restringido
              </p>
              <h2 className="mt-1 text-3xl font-black text-slate-950">Evaluación Individual · DAP</h2>
              <p className="mt-1 text-sm text-slate-600">Registra únicamente evidencia observable y pertinente para esta especialidad.</p>
            </div>
            <span className="rounded-xl bg-violet-50 px-4 py-3 text-sm font-black text-violet-900">
              Criterio {criterionIndex + 1} de {criteria.length}
            </span>
          </div>

          <div className="grid gap-5 xl:grid-cols-[270px_1fr]">
            {/* Applicant selector sidebar */}
            <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-3">
              <h3 className="px-3 py-2 text-xs font-black uppercase tracking-widest text-violet-700">Postulantes</h3>
              {members.map((person) => {
                const personScores = responses[selectedAssignment.assignmentId]?.[person.applicationId];
                const personComplete = personScores && personScores.length === criteria.length && personScores.every((s) => s !== undefined);
                return (
                  <button
                    key={person.applicationId}
                    onClick={() => setActiveApplicantId(person.applicationId)}
                    className={`mb-1 flex w-full items-center gap-3 rounded-xl p-3 text-left transition-all ${person.applicationId === activeApplicant.applicationId ? "bg-violet-100 text-violet-900 shadow-sm ring-2 ring-violet-300" : "hover:bg-violet-50 hover:shadow-sm"}`}
                  >
                    <span className={`grid h-10 w-10 place-items-center rounded-full text-sm font-black uppercase ${person.applicationId === activeApplicant.applicationId ? "bg-violet-900 text-white" : "bg-violet-100 text-violet-800"}`}>
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
              <div className="rounded-t-2xl border-b border-slate-200 bg-gradient-to-r from-violet-800 to-violet-900 p-6">
                <div className="flex items-center gap-5">
                  <span className="grid h-20 w-20 place-items-center rounded-full bg-white text-2xl font-black uppercase tracking-wide text-violet-900" style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
                    {activeApplicant.applicantName.split(" ").slice(0, 2).map((p) => p[0] ?? "").join("")}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="mb-1 text-xs font-bold uppercase tracking-widest text-violet-200">Postulante en evaluación</p>
                    <h3 className="text-3xl font-black leading-tight tracking-tight text-white" style={{ fontFamily: 'Montserrat, system-ui, sans-serif' }}>
                      {activeApplicant.applicantName}
                    </h3>
                    <p className="mt-1 text-sm font-medium text-violet-200">DAP · Evaluación Individual · Acceso Restringido</p>
                  </div>
                  <div className="hidden sm:flex flex-col items-end gap-1">
                    <span className="rounded-full bg-violet-400 px-4 py-2 text-sm font-black text-violet-900">
                      {members.findIndex((m) => m.applicationId === activeApplicant.applicationId) + 1} / {members.length}
                    </span>
                  </div>
                </div>
              </div>

              {/* Restricted access notice */}
              <div className="flex items-center gap-3 border-b border-violet-100 bg-violet-50 px-5 py-3">
                <ShieldCheck size={17} className="text-violet-700 flex-shrink-0" />
                <p className="text-xs font-semibold text-violet-800">Esta observación no aparece en vistas operativas generales. Solo el equipo diretivo tiene acceso.</p>
              </div>

              <div className="divide-y divide-slate-100">
                {criteria.map((criterion, cIdx) => (
                  <div key={cIdx} className="p-5">
                    <div className="mb-4 flex items-start gap-3">
                      <span className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg bg-violet-900 text-sm font-black text-white">{cIdx + 1}</span>
                      <div>
                        <p className="pt-1 text-base font-bold leading-snug text-slate-900" style={{ fontFamily: 'Montserrat, system-ui, sans-serif' }}>{criterion.title}</p>
                        <p className="mt-0.5 text-xs text-slate-500">{criterion.description}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 xl:grid-cols-6">
                      {criterion.options.map((opt) => (
                        <button
                          key={String(opt.value)}
                          className={`min-h-14 rounded-xl border-2 p-3 text-center transition-all ${activeScores[cIdx] === opt.value ? "border-violet-700 bg-violet-700 text-white shadow-md" : "border-slate-200 bg-white hover:border-violet-400 hover:shadow-sm"}`}
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
                  className="w-full resize-y rounded-xl border border-slate-200 bg-white p-4 text-sm leading-relaxed shadow-sm focus:border-violet-700 focus:ring-2 focus:ring-violet-100"
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
              <h3 className="px-3 py-2 font-black text-violet-900">Postulantes asignados</h3>
              {members.map((person) => (
                <button
                  key={person.applicationId}
                  onClick={() => setActiveApplicantId(person.applicationId)}
                  className={`mb-1 flex w-full items-center gap-3 rounded-lg p-3 text-left transition ${person.applicationId === activeApplicant.applicationId ? "bg-violet-50 text-violet-900" : "hover:bg-slate-50"}`}
                >
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-white text-xs font-black text-violet-700">
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
                  <span className="rounded-lg bg-violet-50 p-2 text-violet-800"><LockKeyhole size={20} /></span>
                </div>
              </div>
              <div className="p-5">
                <div className="mb-4 grid grid-cols-2 gap-2">
                  {([
                    { value: 0 as Score, title: "0", label: "No pertinente" },
                    { value: 1 as Score, title: "1", label: "Poco pertinente" },
                    { value: 2 as Score, title: "2", label: "Medianamente pertinente" },
                    { value: 3 as Score, title: "3", label: "Pertinente" },
                    { value: 4 as Score, title: "4", label: "Muy pertinente" },
                    { value: "NOT_OBSERVED" as Score, title: "-", label: "No observable" },
                  ]).map((option) => (
                    <button
                      key={String(option.value)}
                      className={`min-h-16 rounded-lg border p-2 transition ${currentResponses === option.value ? "border-2 border-violet-700 bg-violet-50 text-violet-950" : "border-slate-200 bg-white hover:border-violet-300"}`}
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
                <div className="mt-4 flex items-center gap-2 rounded-lg bg-violet-50 p-3 text-xs font-semibold text-violet-900">
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
