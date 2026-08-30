import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Check, CheckCircle2, ChevronRight, UserCheck, Loader2, Clock, Lock, AlertCircle } from "lucide-react";
import {
  prekinderApi,
  type EvaluatorAssignment,
  type RubricVersion,
  type RubricAssignment,
  type Report,
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

function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat("es-CL", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Santiago",
  }).format(new Date(iso));
}

function getMinutesUntil(iso: string): number {
  const now = new Date();
  const target = new Date(iso);
  return Math.round((target.getTime() - now.getTime()) / 60000);
}

function getMinutesPassed(iso: string): number {
  const now = new Date();
  const start = new Date(iso);
  return Math.round((now.getTime() - start.getTime()) / 60000);
}

function formatMinutesRemaining(minutes: number): string {
  if (minutes < 0) return "0 minutos";
  if (minutes < 1) return "menos de 1 min";
  if (minutes === 1) return "1 minuto";
  if (minutes < 60) return `${minutes} minutos`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 1) return `1 hora ${mins > 0 ? `${mins} min` : ""}`;
  return `${hours} horas ${mins > 0 ? `${mins} min` : ""}`;
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
  const [reportsData, setReportsData] = useState<{ [appId: string]: Report }>({});
  const [editableStatus, setEditableStatus] = useState<{ [appId: string]: boolean }>({});
  const [minutesUntilStart, setMinutesUntilStart] = useState<number | null>(null);
  const countdownRef = useRef<number | null>(null);

  // Load rubric when assignmentId is available from URL params
  useEffect(() => {
    if (!assignmentId || !selectedAssignment) return;
    const firstReportId = selectedAssignment.reports[0]?.reportId;
    if (firstReportId) {
      void loadRubric(firstReportId);
    }
  }, [assignmentId, selectedAssignment?.assignmentId]);

  async function loadRubric(reportId: string) {
    try {
      // Load the first report to get criteria structure
      const report = await prekinderApi.report(reportId);
      const sorted = report.criteria.map((c) => ({
        ...c,
        options: [...c.options].sort((a, b) => a.position - b.position),
      }));
      setRubricCriteria(sorted);
      // Store this first report
      const firstAppId = report.header.applicationId;
      setReportsData((current) => ({ ...current, [firstAppId]: report }));
    } catch (err) {
      console.error("Error loading rubric:", err);
    }
  }

  async function loadAllReports() {
    if (!selectedAssignment) return;
    try {
      const reportsMap: { [appId: string]: Report } = {};
      const editableMap: { [appId: string]: boolean } = {};
      // Load all reports for all applicants in parallel
      await Promise.all(
        selectedAssignment.reports.map(async (r) => {
          const report = await prekinderApi.report(r.reportId);
          reportsMap[r.applicationId] = report;
          editableMap[r.applicationId] = report.editableNow;
        })
      );
      setReportsData(reportsMap);
      setEditableStatus(editableMap);
      // Calculate minutes until assignment starts
      const mins = getMinutesUntil(selectedAssignment.group.startsAt);
      setMinutesUntilStart(mins);
      // Also set rubric criteria from first report if not already set
      const firstReport = Object.values(reportsMap)[0];
      if (firstReport && rubricCriteria.length === 0) {
        const sorted = firstReport.criteria.map((c) => ({
          ...c,
          options: [...c.options].sort((a, b) => a.position - b.position),
        }));
        setRubricCriteria(sorted);
      }
    } catch (err) {
      console.error("Error loading reports:", err);
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

  // Countdown timer effect
  useEffect(() => {
    if (screen !== "evaluate" || !selectedAssignment) {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
      return;
    }
    // Update every 30 seconds
    countdownRef.current = window.setInterval(() => {
      const mins = getMinutesUntil(selectedAssignment.group.startsAt);
      setMinutesUntilStart(mins);
      // Refresh reports to get updated editable status
      void loadAllReports();
    }, 30000);
    return () => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
    };
  }, [screen, selectedAssignment?.assignmentId]);

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
      if (!editableStatus[applicationId]) return;
      // Update local state
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
      // Save to backend
      const report = reportsData[applicationId];
      if (!report) return;
      const criterion = report.criteria[criterionIdx];
      if (!criterion) return;
      // Find the optionId for the selected value
      const option = criterion.options.find((o) => o.value === value);
      const optionId = option?.optionId ?? null;
      const notObserved = value < 0 || optionId === null;
      void prekinderApi.saveResponse(report.header.reportId, criterion.criterionId, {
        optionId,
        notObserved,
        expectedVersion: criterion.responseVersion,
        operationId: crypto.randomUUID(),
      }).then((updatedReport) => {
        // Update the stored report with new response version
        setReportsData((current) => ({
          ...current,
          [applicationId]: updatedReport,
        }));
      }).catch((err) => {
        console.error("Error saving response:", err);
      });
    },
    [selectedAssignment, rubricCriteria.length, reportsData, editableStatus],
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
      const updated = await prekinderApi.startEvaluatorAssignment(
        selectedAssignment.assignmentId,
        selectedAssignment.version,
      );
      console.log("Assignment started:", updated);
      setSelectedAssignment(updated);
      // Load all reports to get response versions for saving
      await loadAllReports();
    } catch (err) {
      console.error("Error starting assignment:", err);
    }
    setSaving(false);
    setScreen("evaluate");
  }, [selectedAssignment]);

  const handleSubmit = useCallback(async () => {
    if (!selectedAssignment) return;
    setSaving(true);
    setError("");
    try {
      // Step 1: Complete each report that isn't already completed
      const completedStatuses = ["COMPLETED", "SUBMITTED", "VALIDATED", "LOCKED"];
      const reportsToComplete = Object.values(reportsData).filter(
        (r) => !completedStatuses.includes(r.header.status)
      );

      for (const report of reportsToComplete) {
        await prekinderApi.completeReport(
          report.header.reportId,
          report.header.version,
        );
      }

      // Step 2: Submit the assignment (only works if all reports are COMPLETED+)
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
  }, [selectedAssignment, assignmentId, backToAgenda, navigate, reportsData]);

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
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[#2d5a87] bg-gradient-to-r from-[#1e3a5f] to-[#2d5a87] p-4 text-white">
        <div className="flex items-center gap-3">
          <UserCheck size={20} />
          <div>
            <p className="text-sm font-black">
              Evaluación Psicomotora
            </p>
            <p className="text-xs text-cyan-200">
              {rubricCriteria.length > 0
                ? `${rubricCriteria.length} criterios cargados desde pauta`
                : "Cargando criterios..."}
            </p>
          </div>
        </div>
        <button
          onClick={() => void loadAgenda()}
          className="rounded-lg bg-[#ffd700] px-3 py-2 text-xs font-black text-[#1e3a5f] hover:bg-amber-400"
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
            {/* Student Navigation Sidebar */}
            <aside className="h-fit rounded-2xl bg-gradient-to-b from-[#1e3a5f] to-[#2d5a87] p-4">
              <h3 className="mb-3 px-2 text-xs font-black uppercase tracking-widest text-cyan-200">
                Estudiantes
              </h3>
              <div className="space-y-2">
                {members.map((person) => {
                  const personScores = responses[selectedAssignment.assignmentId]?.[person.applicationId];
                  const personComplete = personScores && personScores.length === rubricCriteria.length && personScores.every((s) => s !== undefined);
                  const completion = personScores ? personScores.filter((s) => s !== undefined).length : 0;
                  const isActive = person.applicationId === activeApplicant.applicationId;
                  const isEditable = editableStatus[person.applicationId] ?? false;
                  return (
                    <button
                      key={person.applicationId}
                      onClick={() => isEditable && setActiveApplicantId(person.applicationId)}
                      disabled={!isEditable}
                      className={`flex w-full items-center gap-3 rounded-xl p-3 text-left transition-all ${
                        isActive && isEditable
                          ? "bg-white shadow-lg ring-2 ring-white/30"
                          : "bg-white/10 hover:bg-white/20"
                      } ${!isEditable ? "cursor-not-allowed opacity-70" : ""}`}
                    >
                      <span className={`grid h-10 w-10 place-items-center rounded-full text-sm font-black uppercase ${
                        isActive && isEditable ? "bg-[#ffd700] text-[#1e3a5f]" : isEditable ? "bg-emerald-400/30 text-white" : "bg-white/20 text-white/60"
                      }`}>
                        {isEditable ? (
                          person.applicantName.split(" ").slice(0, 2).map((p) => p[0] ?? "").join("")
                        ) : (
                          <Lock size={16} className="mx-auto" />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <b className={`block truncate text-sm font-bold leading-tight ${isActive && isEditable ? "text-[#1e3a5f]" : "text-white"}`}>
                          {person.applicantName}
                        </b>
                        {!isEditable ? (
                          <span className="mt-0.5 flex items-center gap-1 text-xs font-semibold text-amber-300">
                            <Clock size={10} />Bloqueado
                          </span>
                        ) : personComplete ? (
                          <span className="mt-0.5 flex items-center gap-1 text-xs font-bold text-emerald-300">
                            <Check size={11} />Completo
                          </span>
                        ) : completion > 0 ? (
                          <span className="mt-0.5 flex items-center gap-1 text-xs font-semibold text-amber-300">
                            {completion}/{rubricCriteria.length} evaluados
                          </span>
                        ) : (
                          <span className="mt-0.5 block text-xs text-white/60">Sin evaluar</span>
                        )}
                      </span>
                      {isEditable && (
                        personComplete ? (
                          <Check size={16} className="text-emerald-300 flex-shrink-0" />
                        ) : (
                          <ChevronRight size={16} className={`flex-shrink-0 ${isActive ? "text-[#1e3a5f]" : "text-white/60"}`} />
                        )
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Time Status */}
              <div className="mt-4 border-t border-white/20 pt-4">
                <div className="rounded-xl bg-white/10 p-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-cyan-200">
                    <Clock size={14} />
                    {minutesUntilStart !== null && minutesUntilStart > 0 ? (
                      <>Abre en {formatMinutesRemaining(minutesUntilStart)}</>
                    ) : minutesUntilStart !== null && minutesUntilStart <= 0 ? (
                      <>Evaluación abierta</>
                    ) : (
                      <>Horario del bloque</>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-white/70">
                    {formatTime(selectedAssignment.group.startsAt)} — {formatTime(selectedAssignment.group.endsAt)}
                  </p>
                  {minutesUntilStart !== null && minutesUntilStart > 0 && minutesUntilStart <= 120 && (
                    <div className="mt-2">
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/20">
                        <div
                          className="h-full rounded-full bg-[#ffd700] transition-all duration-1000"
                          style={{ width: `${Math.max(0, Math.min(100, ((120 - minutesUntilStart) / 120) * 100))}%` }}
                        />
                      </div>
                      <p className="mt-1 text-center text-[10px] text-white/50">
                        {minutesUntilStart > 60
                          ? `~${Math.ceil(minutesUntilStart / 60)}h para abrir`
                          : `${minutesUntilStart} min`}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Legend */}
              <div className="mt-4 border-t border-white/20 pt-4">
                <p className="mb-2 px-2 text-xs font-black uppercase tracking-widest text-cyan-200">Opciones</p>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <div className="h-5 w-5 rounded bg-[#22c55e]"></div>
                    <span className="text-xs text-white/80">Logrado (3)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-5 w-5 rounded bg-[#f59e0b]"></div>
                    <span className="text-xs text-white/80">Por lograr (2)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-5 w-5 rounded bg-[#ef4444]"></div>
                    <span className="text-xs text-white/80">No logrado (0-1)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-5 w-5 rounded bg-slate-400"></div>
                    <span className="text-xs text-white/80">No observado (—)</span>
                  </div>
                </div>
              </div>
            </aside>

            {/* Full evaluation for selected applicant */}
            <section className="rounded-2xl border border-slate-200 bg-white shadow-lg overflow-hidden">
              {/* Applicant header */}
              <div className="rounded-t-2xl border-b border-slate-200 bg-gradient-to-r from-[#1e3a5f] to-[#2d5a87] p-6">
                <div className="flex items-center gap-5">
                  <span
                    className="grid h-20 w-20 place-items-center rounded-full bg-[#ffd700] text-2xl font-black uppercase tracking-wide text-[#1e3a5f]"
                    style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.25)' }}
                  >
                    {activeApplicant.applicantName
                      .split(" ")
                      .slice(0, 2)
                      .map((p) => p[0] ?? "")
                      .join("")}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="mb-1 text-xs font-bold uppercase tracking-widest text-cyan-200">
                      Evaluando
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
                      Psicomotricidad
                    </p>
                  </div>
                  <div className="hidden sm:flex flex-col items-end gap-1">
                    <span className="rounded-full bg-white px-4 py-2 text-sm font-black text-[#1e3a5f]">
                      {members.findIndex(
                        (m) => m.applicationId === activeApplicant.applicationId,
                      ) + 1}{" "}
                      / {members.length}
                    </span>
                  </div>
                </div>
              </div>

              {/* Locked State Overlay */}
              {!editableStatus[activeApplicant.applicationId] ? (
                <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
                  <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-amber-50 ring-4 ring-amber-100">
                    <Lock className="h-10 w-10 text-amber-500" />
                  </div>
                  <h3 className="mb-3 text-2xl font-black text-slate-800">
                    Evaluación bloqueada
                  </h3>
                  {minutesUntilStart !== null && minutesUntilStart > 0 ? (
                    <>
                      <p className="mb-6 text-slate-600">
                        La ventana de evaluación aún no está abierta.
                      </p>
                      <div className="mb-6 rounded-2xl bg-gradient-to-r from-[#1e3a5f] to-[#2d5a87] px-10 py-5 text-white shadow-xl">
                        <p className="text-xs font-bold uppercase tracking-widest text-cyan-200 mb-1">Abre en</p>
                        <p className="text-5xl font-black tabular-nums">{formatMinutesRemaining(minutesUntilStart)}</p>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-500">
                        <Clock size={16} className="text-slate-400" />
                        <span>
                          {formatTime(selectedAssignment.group.startsAt)} — {formatTime(selectedAssignment.group.endsAt)}
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="mb-4 text-slate-600">
                        La ventana de evaluación ya se cerró.
                      </p>
                      <div className="flex items-center gap-2 text-sm text-slate-500">
                        <Clock size={16} className="text-slate-400" />
                        <span>
                          Horario: {formatTime(selectedAssignment.group.startsAt)} — {formatTime(selectedAssignment.group.endsAt)}
                        </span>
                      </div>
                    </>
                  )}
                  <div className="mt-8 flex items-center gap-2 text-xs text-slate-400">
                    <AlertCircle size={14} />
                    <span>Se actualiza automáticamente cada 30 segundos</span>
                  </div>
                  <button
                    onClick={() => void loadAllReports()}
                    className="mt-4 rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 hover:shadow-md transition-all"
                  >
                    Verificar ahora
                  </button>
                </div>
              ) : (
              /* Criteria — loaded dynamically from rubric */
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
                        <span className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg bg-[#1e3a5f] text-sm font-black text-white">
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
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-6">
                        {criterion.options.map((option) => {
                          const isSelected = activeScores[cIdx] === option.value;
                          const isLogrado = option.value === 3;
                          const isPorLograr = option.value === 2;
                          const isNoLogrado = option.value === 0 || option.value === 1;
                          const isNotObserved = option.value < 0;
                          return (
                            <button
                              key={option.optionId}
                              disabled={!editableStatus[activeApplicant.applicationId]}
                              className={`min-h-16 rounded-xl border-2 p-3 text-left transition-all ${
                                isSelected && isLogrado ? "border-[#22c55e] bg-[#22c55e] text-white shadow-md" :
                                isSelected && isPorLograr ? "border-[#f59e0b] bg-[#f59e0b] text-white shadow-md" :
                                isSelected && isNoLogrado ? "border-[#ef4444] bg-[#ef4444] text-white shadow-md" :
                                isSelected && isNotObserved ? "border-slate-400 bg-slate-400 text-white shadow-md" :
                                "border-slate-200 bg-white hover:border-[#2d5a87] hover:shadow-sm disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
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
                              {option.descriptor && (
                                <p
                                  className={`mt-1 text-xs leading-tight ${
                                    isSelected
                                      ? "text-white/80"
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
              )}

              {/* Observations */}
              <div className="border-t border-slate-200 bg-slate-50/50 p-5">
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Observaciones cualitativas del postulante
                </label>
                <textarea
                  className="w-full resize-y rounded-xl border border-slate-200 bg-white p-4 text-sm leading-relaxed shadow-sm focus:border-cyan-700 focus:ring-2 focus:ring-cyan-100 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                  rows={4}
                  disabled={!editableStatus[activeApplicant.applicationId]}
                  value={activeComment}
                  onChange={(e) =>
                    setGroupComment(activeApplicant.applicationId, e.target.value)
                  }
                  placeholder={editableStatus[activeApplicant.applicationId] ? "Evidencia observable, contexto y comportamientos relevantes..." : "Las observaciones no están disponibles mientras la evaluación está bloqueada."}
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
                  disabled={!allMembersComplete || saving || !editableStatus[activeApplicant.applicationId]}
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
