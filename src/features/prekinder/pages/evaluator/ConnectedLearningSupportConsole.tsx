import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Check,
  CheckCircle2,
  ChevronRight,
  Lock,
  Loader2,
  AlertCircle,
  ShieldCheck,
  UserCheck,
  Clock,
} from "lucide-react";
import {
  prekinderApi,
  type EvaluatorAssignment,
  type RubricVersion,
  type Report,
} from "../../services/api";
import { PROFILE_TO_SHORT_INSTRUMENT, type SpecialtyProfile } from "../../components/evaluator/SpecialtyProfile";

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

function getMinutesUntil(iso: string): number {
  const now = new Date();
  const target = new Date(iso);
  return Math.round((target.getTime() - now.getTime()) / 60000);
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
  profile: SpecialtyProfile;
}

export function ConnectedLearningSupportConsole({ profile }: Props) {
  const { assignmentId } = useParams();
  const navigate = useNavigate();
  const [screen, setScreen] = useState<Screen>("loading");
  const [assignments, setAssignments] = useState<EvaluatorAssignment[]>([]);
  const [selectedAssignment, setSelectedAssignment] = useState<EvaluatorAssignment | null>(null);
  const [activeApplicantId, setActiveApplicantId] = useState<string | null>(null);
  const [rubricCriteria, setRubricCriteria] = useState<RubricVersion["criteria"]>([]);
    const [responses, setResponses] = useState<{ [assignId: string]: { [appId: string]: (Score | undefined)[] } }>({});
  const [comments, setComments] = useState<{ [assignId: string]: { [appId: string]: string } }>({});
  const [submitted, setSubmitted] = useState<{ [assignId: string]: boolean }>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [reportsData, setReportsData] = useState<{ [appId: string]: Report }>({});
  const [editableStatus, setEditableStatus] = useState<{ [appId: string]: boolean }>({});
  const [minutesUntilStart, setMinutesUntilStart] = useState<number | null>(null);
  const countdownRef = useRef<number | null>(null);
  const [explicitlySelected, setExplicitlySelected] = useState<Set<string>>(new Set());

  const shortInstrument = PROFILE_TO_SHORT_INSTRUMENT[profile];

  async function loadRubric(reportId: string) {
    try {
      const report = await prekinderApi.report(reportId);
      const sorted = report.criteria.map((c) => ({
        ...c,
        options: [...c.options].sort((a, b) => a.position - b.position),
      }));
      setRubricCriteria(sorted);
      setReportsData((current) => ({ ...current, [report.header.applicationId]: report }));
    } catch (err) {
      console.error("Error loading rubric:", err);
    }
  }

  async function loadAllReports() {
    if (!selectedAssignment) return;
    try {
      const reportsMap: { [appId: string]: Report } = {};
      const editableMap: { [appId: string]: boolean } = {};
      await Promise.all(
        selectedAssignment.reports.map(async (r) => {
          const report = await prekinderApi.report(r.reportId);
          reportsMap[r.applicationId] = report;
          editableMap[r.applicationId] = report.editableNow;
        })
      );
      setReportsData(reportsMap);
      setEditableStatus(editableMap);
      const mins = getMinutesUntil(selectedAssignment.group.startsAt);
      setMinutesUntilStart(mins);
      const firstReport = Object.values(reportsMap)[0];
      if (firstReport) {
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
      const data = await prekinderApi.evaluatorAgenda(today(), shortInstrument);
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
    countdownRef.current = window.setInterval(() => {
      const mins = getMinutesUntil(selectedAssignment.group.startsAt);
      setMinutesUntilStart(mins);
      void loadAllReports();
    }, 30000);
    return () => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
    };
  }, [screen, selectedAssignment?.assignmentId]);

  // Load criteria when entering via direct URL (assignmentId in path)
  useEffect(() => {
    if (screen === "confirm" && selectedAssignment) {
      const firstReportId = selectedAssignment.reports[0]?.reportId;
      if (firstReportId) {
        void loadRubric(firstReportId);
      }
    }
  }, [screen, selectedAssignment?.assignmentId]);

  // Load criteria when entering evaluate screen
  useEffect(() => {
    if (screen === "evaluate" && selectedAssignment && rubricCriteria.length === 0) {
      void loadAllReports();
    }
  }, [screen, selectedAssignment?.assignmentId, rubricCriteria.length]);

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

  const setScore = useCallback(
    (applicationId: string, criterionIdx: number, value: number) => {
      if (!selectedAssignment) return;
      if (!editableStatus[applicationId]) return;
      setExplicitlySelected((prev) => new Set(prev).add(`${applicationId}-${criterionIdx}`));
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
      const report = reportsData[applicationId];
      if (!report) return;
      const criterion = report.criteria[criterionIdx];
      if (!criterion) return;
      const option = criterion.options.find((o) => o.value === value);
      const optionId = option?.optionId ?? null;
      const notObserved = value < 0 || optionId === null;
      void prekinderApi
        .saveResponse(report.header.reportId, criterion.criterionId, {
          optionId,
          notObserved,
          expectedVersion: criterion.responseVersion,
          operationId: crypto.randomUUID(),
        })
        .then((updatedReport) => {
          setReportsData((current) => ({
            ...current,
            [applicationId]: updatedReport,
          }));
        })
        .catch((err) => {
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
      await prekinderApi.startEvaluatorAssignment(
        selectedAssignment.assignmentId,
        selectedAssignment.version,
      );
      await loadAllReports();
    } catch { /* continue anyway */ }
    setSaving(false);
    setScreen("evaluate");
  }, [selectedAssignment]);

  const handleSubmit = useCallback(async () => {
    if (!selectedAssignment) return;
    setSaving(true);
    setError("");
    try {
      const completedStatuses = ["COMPLETED", "SUBMITTED", "VALIDATED", "LOCKED"];
      const reportsToComplete = Object.values(reportsData).filter(
        (r) => !completedStatuses.includes(r.header.status),
      );
      for (const report of reportsToComplete) {
        await prekinderApi.completeReport(report.header.reportId, report.header.version);
      }
      await prekinderApi.submitEvaluatorAssignment(
        selectedAssignment.assignmentId,
        selectedAssignment.version,
      );
      setSubmitted((p) => ({
        ...p,
        [selectedAssignment.assignmentId]: true,
      }));
      if (assignmentId) {
        navigate(`/prekinder/evaluador/learning-support`);
      } else {
        backToAgenda();
      }
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "No pudimos enviar la evaluación. Reintenta.",
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
      ? responses[selectedAssignment.assignmentId]?.[activeApplicant.applicationId] ??
        Array(rubricCriteria.length).fill(undefined)
      : Array(rubricCriteria.length).fill(undefined);
  const activeComment =
    selectedAssignment && activeApplicant
      ? comments[selectedAssignment.assignmentId]?.[activeApplicant.applicationId] ?? ""
      : "";
  const allMembersComplete = members.every((m) => {
    const scores = responses[selectedAssignment?.assignmentId ?? ""]?.[m.applicationId];
    return scores && scores.length === rubricCriteria.length && scores.every((s) => s !== undefined);
  });

  const isCurrentBlocked =
    activeApplicant && !(editableStatus[activeApplicant.applicationId] ?? false);

  if (screen === "loading") {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-blue-200 bg-gradient-to-r from-blue-800 to-blue-900 p-4 text-white">
        <div className="flex items-center gap-3">
          <UserCheck size={20} />
          <div>
            <p className="text-sm font-black">Evaluación de Apoyo al Aprendizaje</p>
            <p className="text-xs text-blue-200">
              {rubricCriteria.length > 0
                ? `${rubricCriteria.length} criterios cargados desde pauta`
                : "Cargando criterios..."}
            </p>
          </div>
        </div>
        <button
          onClick={() => void loadAgenda()}
          className="rounded-lg bg-white px-3 py-2 text-xs font-black text-blue-900 hover:bg-blue-50"
        >
          Actualizar
        </button>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-800 flex items-center gap-2">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* Agenda */}
      {screen === "agenda" && (
        <div>
          <div className="mb-5">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-blue-700">
              Espacio del evaluador
            </p>
            <h2 className="mt-1 text-3xl font-black text-slate-950">Mi jornada</h2>
            <p className="mt-1 text-sm text-slate-600">
              Solo ves los bloques asignados. Cada grupo contiene hasta tres postulantes.
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
                      <b className="block text-sm text-slate-900">
                        {assignment.group.code} - {assignment.group.roomName}
                      </b>
                      <small className="mt-1 block truncate text-slate-500">
                        {assignment.reports.map((r) => r.applicantName).join(" - ")}
                      </small>
                    </div>
                    <div className="flex items-center justify-end gap-3 p-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${
                          isSubmitted
                            ? "bg-green-100 text-green-800"
                            : isCompleted
                              ? "bg-green-100 text-green-800"
                              : "bg-blue-50 text-blue-800"
                        }`}
                      >
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
            <p className="mt-1 text-sm text-slate-600">
              Antes de evaluar, verifica que los postulantes correspondan al bloque.
            </p>
          </div>
          <section className="rounded-2xl border border-slate-200 bg-white">
            <div className="grid gap-4 p-5 md:grid-cols-3">
              {selectedAssignment.reports.map((report, index) => (
                <article
                  key={report.applicationId}
                  className="relative rounded-xl border border-slate-200 bg-slate-50/40 p-6 text-center"
                >
                  <span className="absolute left-3 top-3 grid h-7 w-7 place-items-center rounded-full bg-blue-900 text-xs font-black text-white">
                    {index + 1}
                  </span>
                  <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-blue-100 text-xl font-black uppercase text-blue-900">
                    {report.applicantName.split(" ").slice(0, 2).map((p) => p[0] ?? "").join("")}
                  </span>
                  <h3
                    className="mt-3 text-base font-black leading-tight text-slate-900"
                    style={{ fontFamily: "Montserrat, system-ui, sans-serif" }}
                  >
                    {report.applicantName}
                  </h3>
                  <p className="mt-2 flex items-center justify-center gap-1 text-xs font-bold text-emerald-600">
                    <Check size={13} />Identidad confirmada
                  </p>
                </article>
              ))}
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-200 p-5">
              <button className="secondary" onClick={backToAgenda}>Volver</button>
              <button
                className="primary"
                disabled={saving}
                onClick={() => void handleStart()}
              >
                {saving ? "Iniciando..." : <>Comenzar evaluación <ChevronRight className="ml-1 inline" size={17} /></>}
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
              <h2
                className="text-3xl font-black tracking-tight text-slate-950"
                style={{ fontFamily: "Montserrat, system-ui, sans-serif" }}
              >
                Evaluación de Apoyo al Aprendizaje
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {rubricCriteria.length > 0
                  ? `${rubricCriteria.length} criterios cargados desde la pauta`
                  : "Completa todos los criterios antes de enviar."}
              </p>
            </div>
          </div>

          {/* Blocked overlay */}
          {isCurrentBlocked && minutesUntilStart !== null && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
              <div className="mx-4 max-w-sm rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-800 to-blue-900 p-8 text-center text-white shadow-2xl">
                <div className="mx-auto mb-4 grid h-20 w-20 place-items-center rounded-full bg-white/10">
                  <Lock size={36} className="text-white" />
                </div>
                <h3 className="text-2xl font-black" style={{ fontFamily: "Montserrat, system-ui, sans-serif" }}>
                  Evaluación bloqueada
                </h3>
                <p className="mt-2 text-sm text-white/80">
                  {minutesUntilStart > 0 ? "La franja horaria aún no comienza" : "La franja ya pasó. Contacta a administración."}
                </p>
                {minutesUntilStart > 0 && (
                  <>
                    <div className="mt-6">
                      <p className="text-5xl font-black tabular-nums">
                        {formatMinutesRemaining(minutesUntilStart)}
                      </p>
                      <p className="mt-1 text-xs text-white/60 uppercase tracking-widest">
                        Para que se habilite
                      </p>
                    </div>
                    {minutesUntilStart <= 120 && (
                      <div className="mt-4">
                        <div className="h-2 w-full overflow-hidden rounded-full bg-white/20">
                          <div
                            className="h-full rounded-full bg-[#ffd700] transition-all duration-1000"
                            style={{
                              width: `${Math.max(0, Math.min(100, ((120 - minutesUntilStart) / 120) * 100))}%`,
                            }}
                          />
                        </div>
                        <p className="mt-2 text-xs text-white/50">
                          {minutesUntilStart > 60
                            ? `~${Math.ceil(minutesUntilStart / 60)}h para abrir`
                            : `${minutesUntilStart} min`}
                        </p>
                      </div>
                    )}
                  </>
                )}
                <p className="mt-6 text-xs text-white/50">
                  {formatTime(selectedAssignment.group.startsAt)} — {formatTime(selectedAssignment.group.endsAt)}
                </p>
                <button
                  onClick={() => navigate("/prekinder/evaluador/learning-support")}
                  className="mt-6 w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-bold text-white transition hover:bg-white/20"
                >
                  Volver al dashboard
                </button>
              </div>
            </div>
          )}

          <div className="grid gap-5 xl:grid-cols-[270px_1fr]">
            {/* Applicant selector sidebar */}
            <aside className="h-fit rounded-2xl border border-slate-200 bg-gradient-to-b from-blue-800 to-blue-900 p-4">
              <h3 className="mb-3 px-2 text-xs font-black uppercase tracking-widest text-blue-200">
                Postulantes
              </h3>
              <div className="space-y-2">
                {members.map((person) => {
                  const personScores = responses[selectedAssignment.assignmentId]?.[person.applicationId];
                  const personComplete =
                    personScores &&
                    personScores.length === rubricCriteria.length &&
                    personScores.every((s) => s !== undefined);
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
                      <span
                        className={`grid h-10 w-10 place-items-center rounded-full text-sm font-black uppercase ${
                          isActive && isEditable
                            ? "bg-[#ffd700] text-[#1e3a5f]"
                            : isEditable
                              ? "bg-blue-400/30 text-white"
                              : "bg-white/20 text-white/60"
                        }`}
                      >
                        {isEditable ? (
                          person.applicantName.split(" ").slice(0, 2).map((p) => p[0] ?? "").join("")
                        ) : (
                          <Lock size={16} className="mx-auto" />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <b
                          className={`block truncate text-sm font-bold leading-tight ${
                            isActive && isEditable ? "text-[#1e3a5f]" : "text-white"
                          }`}
                        >
                          {person.applicantName}
                        </b>
                        {!isEditable ? (
                          <span className="mt-0.5 flex items-center gap-1 text-xs font-semibold text-amber-300">
                            <Clock size={10} />
                            Bloqueado
                          </span>
                        ) : personComplete ? (
                          <span className="mt-0.5 flex items-center gap-1 text-xs font-bold text-emerald-300">
                            <Check size={11} />
                            Completo
                          </span>
                        ) : completion > 0 ? (
                          <span className="mt-0.5 flex items-center gap-1 text-xs font-semibold text-amber-300">
                            {completion}/{rubricCriteria.length} evaluados
                          </span>
                        ) : (
                          <span className="mt-0.5 block text-xs text-white/60">Sin evaluar</span>
                        )}
                      </span>
                      {isEditable &&
                        (personComplete ? (
                          <Check size={16} className="text-emerald-300 flex-shrink-0" />
                        ) : (
                          <ChevronRight
                            size={16}
                            className={`flex-shrink-0 ${isActive ? "text-[#1e3a5f]" : "text-white/60"}`}
                          />
                        ))}
                    </button>
                  );
                })}
              </div>

              {/* Time Status */}
              <div className="mt-4 border-t border-white/20 pt-4">
                <div className="rounded-xl bg-white/10 p-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-blue-200">
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
                          style={{
                            width: `${Math.max(0, Math.min(100, ((120 - minutesUntilStart) / 120) * 100))}%`,
                          }}
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
            </aside>

            {/* Full evaluation for selected applicant */}
            <section className="rounded-2xl border border-slate-200 bg-white shadow-lg overflow-hidden">
              {/* Applicant header */}
              <div className="rounded-t-2xl border-b border-slate-200 bg-gradient-to-r from-blue-800 to-blue-900 p-6">
                <div className="flex items-center gap-5">
                  <span
                    className="grid h-20 w-20 place-items-center rounded-full bg-white text-2xl font-black uppercase tracking-wide text-blue-900"
                    style={{ boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}
                  >
                    {activeApplicant.applicantName
                      .split(" ")
                      .slice(0, 2)
                      .map((p) => p[0] ?? "")
                      .join("")}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold uppercase tracking-widest text-blue-200">
                      Postulante en evaluación
                    </p>
                    <h3
                      className="mt-1 text-3xl font-black leading-tight tracking-tight text-white"
                      style={{ fontFamily: "Montserrat, system-ui, sans-serif" }}
                    >
                      {activeApplicant.applicantName}
                    </h3>
                    <p className="mt-1 text-sm font-medium text-white/80">
                      Apoyo al Aprendizaje · Evaluación Individual
                    </p>
                  </div>
                  <div className="hidden sm:flex flex-col items-end gap-1">
                    <span className="rounded-full bg-white px-4 py-2 text-sm font-black text-blue-900">
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

              {/* Locked notice */}
              {isCurrentBlocked && (
                <div className="bg-amber-50 border-b border-amber-200 p-4 flex items-center gap-3">
                  <Lock size={18} className="text-amber-600" />
                  <div>
                    <p className="text-sm font-bold text-amber-800">Evaluación bloqueada</p>
                    <p className="text-xs text-amber-600">
                      Esta evaluación se habilitará cuando comience la franja horaria.
                    </p>
                  </div>
                </div>
              )}

              {/* Criteria */}
              <div className="divide-y divide-slate-100">
                {rubricCriteria.map((criterion, cIdx) => (
                  <div key={criterion.criterionId} className="p-5">
                    <div className="mb-4 flex items-start gap-3">
                      <span className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg bg-blue-900 text-sm font-black text-white">
                        {cIdx + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p
                          className="text-base font-bold leading-snug text-slate-900"
                          style={{ fontFamily: "Montserrat, system-ui, sans-serif" }}
                        >
                          {criterion.name}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">{criterion.descriptor}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 lg:grid-cols-6">
                      {criterion.options.map((option) => {
                        const isSelected = activeScores[cIdx] === option.value;
                        const isLogrado = option.value === 3;
                        const isPorLograr = option.value === 2;
                        const isNoLogrado = option.value === 0 || option.value === 1;
                        return (
                          <button
                            key={option.optionId}
                            disabled={!editableStatus[activeApplicant.applicationId] || saving}
                            onClick={() => void setScore(activeApplicant.applicationId, cIdx, option.value)}
                            className={`min-h-16 rounded-xl border-2 p-3 text-left transition focus:outline-none focus:ring-2 ${
                              isSelected && isLogrado
                                ? "border-[#22c55e] bg-[#22c55e] text-white shadow-md"
                                : isSelected && isPorLograr
                                  ? "border-[#f59e0b] bg-[#f59e0b] text-white shadow-md"
                                  : isSelected && isNoLogrado
                                    ? "border-[#ef4444] bg-[#ef4444] text-white shadow-md"
                                    : isSelected
                                      ? "border-blue-700 bg-blue-900 text-white shadow-md"
                                      : "border-slate-200 bg-white hover:border-blue-400 hover:shadow-sm disabled:bg-slate-50 disabled:text-slate-400"
                            }`}
                          >
                            <span className="block text-lg font-black">{option.value}</span>
                            {option.descriptor && (
                              <span className={`mt-1 block text-xs leading-tight ${isSelected ? "text-white/80" : "text-slate-400"}`}>
                                {option.descriptor}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Observations */}
              <div className="border-t border-slate-200 bg-slate-50/50 p-5">
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Observación profesional
                </label>
                <textarea
                  className="w-full resize-y rounded-xl border border-slate-200 bg-white p-4 text-sm leading-relaxed shadow-sm focus:border-blue-700 focus:ring-2 focus:ring-blue-100"
                  rows={4}
                  disabled={!editableStatus[activeApplicant.applicationId] || saving}
                  value={activeComment}
                  onChange={(e) => void setGroupComment(activeApplicant.applicationId, e.target.value)}
                  placeholder={
                    editableStatus[activeApplicant.applicationId]
                      ? "Evidencia observable, contexto y comportamientos relevantes..."
                      : "Las observaciones no están disponibles mientras la evaluación está bloqueada."
                  }
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 p-5">
                <button className="secondary" onClick={backToAgenda}>
                  Volver al grupo
                </button>
                <span className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                  <Check size={16} className="text-emerald-600" />
                  Guardado automático
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
                      Enviar a revisión
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
