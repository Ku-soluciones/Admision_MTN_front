import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Check, CheckCircle2, ChevronRight, UserCheck, Loader2 } from "lucide-react";
import {
  prekinderApi,
  type EvaluatorAssignment,
  type RubricVersion,
  type RubricAssignment,
} from "../../services/api";

type Score = number | null;

type Screen = "loading" | "agenda" | "confirm" | "evaluate";

function today() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago" }).format(new Date());
}

function formatTime(iso: string) {
  return new Intl.DateTimeFormat("es-CL", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Santiago",
  }).format(new Date(iso));
}

interface Props {
  profile: "PSYCHOMOTOR";
}

export function PsychomotorEvaluationSheet({ profile }: Props) {
  const { assignmentId } = useParams();
  const navigate = useNavigate();
  const [screen, setScreen] = useState<Screen>("loading");
  const [assignments, setAssignments] = useState<EvaluatorAssignment[]>([]);
  const [selectedAssignment, setSelectedAssignment] = useState<EvaluatorAssignment | null>(null);
  const [activeApplicantId, setActiveApplicantId] = useState<string | null>(null);
  const [rubricCriteria, setRubricCriteria] = useState<RubricVersion["criteria"]>([]);
  const [responses, setResponses] = useState<{
    [assignId: string]: { [appId: string]: (Score | undefined)[] };
  }>({});
  const [comments, setComments] = useState<{
    [assignId: string]: { [appId: string]: string };
  }>({});
  const [submitted, setSubmitted] = useState<{ [assignId: string]: boolean }>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [currentProcessId, setCurrentProcessId] = useState<string | null>(null);

  // Load rubric when processId is available from assignment
  useEffect(() => {
    if (!currentProcessId) return;
    void loadRubric(currentProcessId);
  }, [currentProcessId]);

  async function loadRubric(processId: string) {
    try {
      const rubricAssignments = await prekinderApi.rubricAssignments(processId);
      const psychomotorAssignment = rubricAssignments.find(
        (a) => a.instrumentCode === "PSYCHOMOTOR",
      );
      if (psychomotorAssignment) {
        const version = await prekinderApi.rubricVersion(
          psychomotorAssignment.versionId,
        );
        const sorted = version.criteria.map((c) => ({
          ...c,
          options: [...c.options].sort((a, b) => a.value - b.value),
        }));
        setRubricCriteria(sorted);
      }
    } catch (err) {
      console.error("Error loading rubric:", err);
    }
  }

  async function loadAgenda() {
    setScreen("loading");
    setError("");
    try {
      const data = await prekinderApi.evaluatorAgenda(
        today(),
        "PSYCHOMOTOR",
      );
      setAssignments(data.assignments);

      if (assignmentId) {
        const found = data.assignments.find(
          (a) => a.assignmentId === assignmentId,
        );
        if (found) {
          setSelectedAssignment(found);
          setActiveApplicantId(found.reports[0]?.applicationId ?? null);
          setCurrentProcessId(found.group.processId);
          setScreen("confirm");
        } else {
          setScreen("agenda");
        }
      } else {
        setScreen("agenda");
      }
    } catch (reason) {
      setAssignments([]);
      setError(
        reason instanceof Error ? reason.message : "Error al cargar la agenda",
      );
      setScreen("agenda");
    }
  }

  useEffect(() => {
    void loadAgenda();
  }, []);

  const openAssignment = useCallback(
    (assignment: EvaluatorAssignment) => {
      setSelectedAssignment(assignment);
      setActiveApplicantId(assignment.reports[0]?.applicationId ?? null);
      setCurrentProcessId(assignment.group.processId);
      setScreen("confirm");
    },
    [],
  );

  const backToAgenda = useCallback(() => {
    setSelectedAssignment(null);
    setActiveApplicantId(null);
    setScreen("agenda");
  }, []);

  const setScore = useCallback(
    (applicationId: string, criterionIdx: number, value: number) => {
      if (!selectedAssignment) return;
      setResponses((current) => {
        const assignId = selectedAssignment.assignmentId;
        const existing =
          current[assignId]?.[applicationId] ??
          Array(rubricCriteria.length).fill(undefined);
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
    },
    [selectedAssignment, rubricCriteria.length],
  );

  const setGroupComment = useCallback(
    (applicationId: string, comment: string) => {
      if (!selectedAssignment) return;
      setComments((current) => ({
        ...current,
        [selectedAssignment.assignmentId]: {
          ...(current[selectedAssignment.assignmentId] ?? {}),
          [applicationId]: comment,
        },
      }));
    },
    [selectedAssignment],
  );

  const handleStart = useCallback(async () => {
    if (!selectedAssignment) return;
    setSaving(true);
    try {
      await prekinderApi.startEvaluatorAssignment(
        selectedAssignment.assignmentId,
        selectedAssignment.version,
      );
    } catch {
      // continue anyway
    }
    setSaving(false);
    setScreen("evaluate");
  }, [selectedAssignment]);

  const handleSubmit = useCallback(async () => {
    if (!selectedAssignment) return;
    setSaving(true);
    setError("");
    try {
      await prekinderApi.submitEvaluatorAssignment(
        selectedAssignment.assignmentId,
        selectedAssignment.version,
      );
      setSubmitted((p) => ({
        ...p,
        [selectedAssignment.assignmentId]: true,
      }));
      if (assignmentId) {
        navigate(`/prekinder/evaluador/psychomotor`);
      } else {
        backToAgenda();
      }
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "No pudimos enviar la evaluación. Reintenta.",
      );
    } finally {
      setSaving(false);
    }
  }, [selectedAssignment, assignmentId, backToAgenda, navigate]);

  const members = selectedAssignment?.reports ?? [];
  const activeApplicant = activeApplicantId
    ? members.find((m) => m.applicationId === activeApplicantId) ?? members[0]
    : members[0];
  const activeScores =
    selectedAssignment && activeApplicant
      ? responses[selectedAssignment.assignmentId]?.[
          activeApplicant.applicationId
        ] ?? Array(rubricCriteria.length).fill(undefined)
      : Array(rubricCriteria.length).fill(undefined);
  const activeComment =
    selectedAssignment && activeApplicant
      ? comments[selectedAssignment.assignmentId]?.[
          activeApplicant.applicationId
        ] ?? ""
      : "";
  const allMembersComplete = members.every((m) => {
    const scores =
      responses[selectedAssignment?.assignmentId ?? ""]?.[m.applicationId];
    return (
      scores &&
      scores.length === rubricCriteria.length &&
      scores.every((s) => s !== undefined)
    );
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
            <p className="text-sm font-black">
              Evaluación Psicomotora — Carga Dinámica
            </p>
            <p className="text-xs text-cyan-300">
              {rubricCriteria.length > 0
                ? `${rubricCriteria.length} criterios cargados desde pauta`
                : "Cargando criterios..."}
            </p>
          </div>
        </div>
        <button
          onClick={() => void loadAgenda()}
          className="rounded-lg bg-white px-3 py-2 text-xs font-black text-cyan-900 hover:bg-cyan-50"
        >
          Actualizar
        </button>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-800">
          {error}
        </div>
      )}

      {/* Agenda */}
      {screen === "agenda" && (
        <div>
          <div className="mb-5">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-cyan-700">
              Espacio del evaluador
            </p>
            <h2 className="mt-1 text-3xl font-black text-slate-950">
              Mi jornada
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Solo ves los bloques asignados. Cada grupo contiene hasta tres
              postulantes.
            </p>
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
                  [
                    "COMPLETED",
                    "SUBMITTED",
                    "VALIDATED",
                    "LOCKED",
                  ].includes(r.status),
                );
                return (
                  <button
                    key={assignment.assignmentId}
                    className="grid w-full min-h-20 items-center overflow-hidden rounded-xl border border-slate-200 bg-white text-left shadow-sm transition hover:border-cyan-400 md:grid-cols-[110px_1fr_140px]"
                    onClick={() => openAssignment(assignment)}
                  >
                    <div className="border-b border-slate-200 p-4 text-xl font-black text-slate-950 md:border-b-0 md:border-r">
                      {formatTime(assignment.group.startsAt)}
                      <small className="block text-xs font-bold text-slate-500">
                        30 min
                      </small>
                    </div>
                    <div className="min-w-0 p-4">
                      <b className="block text-sm text-slate-900">
                        {assignment.group.code} - {assignment.group.roomName}
                      </b>
                      <small className="mt-1 block truncate text-slate-500">
                        {assignment.reports
                          .map((r) => r.applicantName)
                          .join(" - ")}
                      </small>
                    </div>
                    <div className="flex items-center justify-end gap-3 p-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${
                          isSubmitted
                            ? "bg-green-100 text-green-800"
                            : isCompleted
                              ? "bg-green-100 text-green-800"
                              : "bg-cyan-50 text-cyan-800"
                        }`}
                      >
                        {isSubmitted
                          ? "Enviado"
                          : isCompleted
                            ? "Completado"
                            : assignment.status}
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
              {formatTime(selectedAssignment.group.startsAt)} -{" "}
              {selectedAssignment.group.roomName}
            </p>
            <h2 className="mt-1 text-3xl font-black text-slate-950">
              Confirmar grupo
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Antes de evaluar, verifica que los postulantes correspondan al
              bloque.
            </p>
          </div>
          <section className="rounded-2xl border border-slate-200 bg-white">
            <div className="grid gap-4 p-5 md:grid-cols-3">
              {selectedAssignment.reports.map((report, index) => (
                <article
                  key={report.applicationId}
                  className="relative rounded-xl border border-slate-200 bg-slate-50/40 p-6 text-center"
                >
                  <span className="absolute left-3 top-3 grid h-7 w-7 place-items-center rounded-full bg-cyan-900 text-xs font-black text-white">
                    {index + 1}
                  </span>
                  <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-cyan-100 text-xl font-black uppercase text-cyan-900">
                    {report.applicantName
                      .split(" ")
                      .slice(0, 2)
                      .map((p) => p[0] ?? "")
                      .join("")}
                  </span>
                  <h3
                    className="mt-3 text-base font-black leading-tight text-slate-900"
                    style={{ fontFamily: "Montserrat, system-ui, sans-serif" }}
                  >
                    {report.applicantName}
                  </h3>
                  <p className="mt-2 flex items-center justify-center gap-1 text-xs font-bold text-emerald-600">
                    <Check size={13} />
                    Identidad confirmada
                  </p>
                </article>
              ))}
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-200 p-5">
              <button className="secondary" onClick={backToAgenda}>
                Volver
              </button>
              <button
                className="primary"
                disabled={saving}
                onClick={() => void handleStart()}
              >
                {saving ? "Iniciando..." : (
                  <>
                    Comenzar evaluación{" "}
                    <ChevronRight className="ml-1 inline" size={17} />
                  </>
                )}
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
                {formatTime(selectedAssignment.group.startsAt)} ·{" "}
                {selectedAssignment.group.roomName} ·{" "}
                {selectedAssignment.group.code}
              </p>
              <h2
                className="text-3xl font-black tracking-tight text-slate-950"
                style={{ fontFamily: "Montserrat, system-ui, sans-serif" }}
              >
                Evaluación Psicomotora
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {rubricCriteria.length > 0
                  ? `${rubricCriteria.length} criterios cargados desde la pauta`
                  : "Completa todos los criterios antes de enviar."}
              </p>
            </div>
          </div>

          <div className="grid gap-5 xl:grid-cols-[270px_1fr]">
            {/* Applicant selector sidebar */}
            <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-3">
              <h3 className="px-3 py-2 text-xs font-black uppercase tracking-widest text-cyan-700">
                Postulantes
              </h3>
              {members.map((person) => {
                const personScores =
                  responses[selectedAssignment.assignmentId]?.[
                    person.applicationId
                  ];
                const personComplete =
                  personScores &&
                  personScores.length === rubricCriteria.length &&
                  personScores.every((s) => s !== undefined);
                return (
                  <button
                    key={person.applicationId}
                    onClick={() => setActiveApplicantId(person.applicationId)}
                    className={`mb-1 flex w-full items-center gap-3 rounded-xl p-3 text-left transition-all ${
                      person.applicationId === activeApplicant.applicationId
                        ? "bg-cyan-100 text-cyan-900 shadow-sm ring-2 ring-cyan-300"
                        : "hover:bg-cyan-50 hover:shadow-sm"
                    }`}
                  >
                    <span
                      className={`grid h-10 w-10 place-items-center rounded-full text-sm font-black uppercase ${
                        person.applicationId === activeApplicant.applicationId
                          ? "bg-cyan-900 text-white"
                          : "bg-cyan-100 text-cyan-800"
                      }`}
                    >
                      {person.applicantName
                        .split(" ")
                        .slice(0, 2)
                        .map((p) => p[0] ?? "")
                        .join("")}
                    </span>
                    <span className="min-w-0 flex-1">
                      <b
                        className="block truncate text-sm font-bold leading-tight"
                        style={{
                          fontFamily: "Montserrat, system-ui, sans-serif",
                        }}
                      >
                        {person.applicantName}
                      </b>
                      {personComplete ? (
                        <span className="mt-0.5 flex items-center gap-1 text-xs font-bold text-emerald-600">
                          <Check size={11} />
                          Completo
                        </span>
                      ) : (
                        <span className="mt-0.5 block text-xs text-slate-400">
                          Sin evaluar
                        </span>
                      )}
                    </span>
                    {personComplete ? (
                      <Check size={16} className="text-emerald-600 flex-shrink-0" />
                    ) : (
                      <ChevronRight
                        size={16}
                        className="text-slate-400 flex-shrink-0"
                      />
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
                  <span
                    className="grid h-20 w-20 place-items-center rounded-full bg-white text-2xl font-black uppercase tracking-wide text-cyan-900 shadow-md"
                  >
                    {activeApplicant.applicantName
                      .split(" ")
                      .slice(0, 2)
                      .map((p) => p[0] ?? "")
                      .join("")}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="mb-1 text-xs font-bold uppercase tracking-widest text-cyan-200">
                      Postulante en evaluación
                    </p>
                    <h3
                      className="text-3xl font-black leading-tight tracking-tight text-white"
                      style={{
                        fontFamily: "Montserrat, system-ui, sans-serif",
                      }}
                    >
                      {activeApplicant.applicantName}
                    </h3>
                    <p className="mt-1 text-sm font-medium text-cyan-200">
                      Psicomotricidad · Evaluación Simultánea
                    </p>
                  </div>
                  <div className="hidden sm:flex flex-col items-end gap-1">
                    <span className="rounded-full bg-white px-4 py-2 text-sm font-black text-cyan-900">
                      {members.findIndex(
                        (m) => m.applicationId === activeApplicant.applicationId,
                      ) + 1}{" "}
                      / {members.length}
                    </span>
                  </div>
                </div>
              </div>

              {/* Criteria — loaded dynamically from rubric */}
              <div className="divide-y divide-slate-100">
                {rubricCriteria.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-slate-500">
                    <Loader2 className="mb-3 h-8 w-8 animate-spin text-cyan-400" />
                    <p className="text-sm font-semibold">
                      Cargando criterios de la pauta...
                    </p>
                    <p className="mt-1 text-xs">
                      Asegúrate de que la pauta de psicomotricidad esté creada y
                      publicada en Admin.
                    </p>
                  </div>
                ) : (
                  rubricCriteria.map((criterion, cIdx) => (
                    <div key={criterion.criterionId} className="p-5">
                      <div className="mb-3 flex items-start gap-3">
                        <span className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg bg-cyan-900 text-sm font-black text-white">
                          {cIdx + 1}
                        </span>
                        <div>
                          <p
                            className="pt-1 text-base font-bold leading-snug text-slate-900"
                            style={{
                              fontFamily: "Montserrat, system-ui, sans-serif",
                            }}
                          >
                            {criterion.name}
                          </p>
                          {criterion.descriptor && (
                            <p className="mt-1 text-xs italic text-slate-500">
                              {criterion.descriptor}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-6">
                        {criterion.options.map((option) => {
                          const isSelected =
                            activeScores[cIdx] === option.value;
                          const isNotObserved = option.value < 0;
                          return (
                            <button
                              key={option.optionId}
                              className={`min-h-16 rounded-xl border-2 p-3 text-left transition-all ${
                                isSelected
                                  ? "border-cyan-700 bg-cyan-900 text-white shadow-md"
                                  : "border-slate-200 bg-white hover:border-cyan-400 hover:shadow-sm"
                              }`}
                              onClick={() =>
                                setScore(
                                  activeApplicant.applicationId,
                                  cIdx,
                                  option.value,
                                )
                              }
                            >
                              <b
                                className="block text-xl font-black leading-none"
                                style={{
                                  fontFamily:
                                    "Montserrat, system-ui, sans-serif",
                                }}
                              >
                                {isNotObserved ? "—" : option.value}
                              </b>
                              <p
                                className={`mt-1 text-xs font-bold leading-tight ${
                                  isSelected ? "text-cyan-200" : "text-slate-600"
                                }`}
                              >
                                {option.label}
                              </p>
                              {option.descriptor && (
                                <p
                                  className={`mt-1 text-xs leading-tight ${
                                    isSelected
                                      ? "text-cyan-300"
                                      : "text-slate-400"
                                  }`}
                                >
                                  {option.descriptor}
                                </p>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))
                )}
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
                  onChange={(e) =>
                    setGroupComment(activeApplicant.applicationId, e.target.value)
                  }
                  placeholder="Evidencia observable, contexto y comportamientos relevantes..."
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 p-5">
                <button className="secondary" onClick={backToAgenda}>
                  Volver al grupo
                </button>
                <span className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                  <Check size={16} className="text-emerald-600" />
                  Evaluando {members.length} postulante(s)
                </span>
                <button
                  className="primary"
                  disabled={!allMembersComplete || saving}
                  onClick={() => void handleSubmit()}
                >
                  {saving ? (
                    "Guardando..."
                  ) : (
                    <>
                      <CheckCircle2 className="mr-2 inline" size={17} />
                      Enviar evaluación
                    </>
                  )}
                </button>
              </div>
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
