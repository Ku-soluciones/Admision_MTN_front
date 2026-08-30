import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Check,
  CloudOff,
  LoaderCircle,
  LockKeyhole,
  TriangleAlert,
} from "lucide-react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ApiError, prekinderApi, type Report } from "../services/api";
import { usePrekinderRealtimeSync } from "../hooks/usePrekinderRealtimeSync";

type SaveState =
  "idle" | "saving" | "saved" | "offline" | "conflict" | "closed";

function getMinutesUntil(iso: string): number {
  const now = Date.now();
  const target = new Date(iso).getTime();
  return Math.round((target - now) / 60000);
}

function formatMinutesRemaining(minutes: number): string {
  if (minutes <= 0) return "0:00";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function EvaluatorReport() {
  const { reportId = "" } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [report, setReport] = useState<Report | null>(null);
  const [state, setState] = useState<SaveState>("idle");
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [minutesUntilStart, setMinutesUntilStart] = useState<number | null>(null);
  const noteTimer = useRef<number | null>(null);
  const countdownRef = useRef<number | null>(null);
  const requestedReturn = searchParams.get("returnTo");
  const returnTo = requestedReturn?.startsWith("/profesor/prekinder")
    || requestedReturn?.startsWith("/prekinder/evaluador")
    ? requestedReturn
    : "/profesor?section=prekinder";
  const realtimeState = usePrekinderRealtimeSync(report?.header.evaluatorId, () => {
    if (state !== "saving") void load();
  });

  async function load() {
    setError("");
    try {
      const next = await prekinderApi.report(reportId);
      setReport(next);
      setNote(next.note.content);
      setState(next.editableNow ? "idle" : "closed");
      if (!next.editableNow) {
        const mins = getMinutesUntil(next.header.startsAt);
        setMinutesUntilStart(mins);
      }
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "No pudimos abrir el informe.",
      );
    }
  }
  useEffect(() => {
    void load();
    return () => {
      if (noteTimer.current) window.clearTimeout(noteTimer.current);
    };
  }, [reportId]);
  useEffect(() => {
    if (!report || report.editableNow) return;
    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = window.setInterval(() => {
      if (report) {
        const mins = getMinutesUntil(report.header.startsAt);
        setMinutesUntilStart(mins);
        if (mins <= 0) {
          if (countdownRef.current) {
            clearInterval(countdownRef.current);
            countdownRef.current = null;
          }
          void load();
        }
      }
    }, 30000);
    return () => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
    };
  }, [report]);
  useEffect(() => {
    const online = () => setState("idle");
    const offline = () => setState("offline");
    window.addEventListener("online", online);
    window.addEventListener("offline", offline);
    return () => {
      window.removeEventListener("online", online);
      window.removeEventListener("offline", offline);
    };
  }, []);

  async function saveCriterion(
    criterionId: string,
    optionId: string | null,
    notObserved: boolean,
    expectedVersion: number,
  ) {
    if (!navigator.onLine) {
      setState("offline");
      return;
    }
    setState("saving");
    setError("");
    try {
      const next = await prekinderApi.saveResponse(reportId, criterionId, {
        optionId,
        notObserved,
        expectedVersion,
        operationId: crypto.randomUUID(),
      });
      setReport(next);
      setState("saved");
    } catch (reason) {
      handleError(reason);
    }
  }
  function scheduleNote(value: string) {
    setNote(value);
    if (noteTimer.current) window.clearTimeout(noteTimer.current);
    noteTimer.current = window.setTimeout(() => void saveNote(value), 700);
  }
  async function saveNote(value: string) {
    if (!report || !navigator.onLine) {
      setState("offline");
      return;
    }
    setState("saving");
    try {
      const next = await prekinderApi.saveNote(
        reportId,
        value,
        report.note.version,
        crypto.randomUUID(),
      );
      setReport(next);
      setState("saved");
    } catch (reason) {
      handleError(reason);
    }
  }
  function handleError(reason: unknown) {
    if (reason instanceof ApiError && reason.status === 409) {
      setState("conflict");
      setError(
        "Este campo cambió en otra pestaña. Recarga antes de continuar.",
      );
    } else if (reason instanceof ApiError && reason.status === 423) {
      setState("closed");
      setError(reason.message);
    } else {
      setError(
        reason instanceof Error ? reason.message : "No pudimos guardar.",
      );
      setState("idle");
    }
  }
  async function complete() {
    if (!report) return;
    setState("saving");
    if (noteTimer.current) {
      window.clearTimeout(noteTimer.current);
      noteTimer.current = null;
    }
    try {
      let expectedVersion = report.header.version;
      if (note !== report.note.content) {
        const withNote = await prekinderApi.saveNote(
          reportId,
          note,
          report.note.version,
          crypto.randomUUID(),
        );
        setReport(withNote);
        expectedVersion = withNote.header.version;
      }
      const next = await prekinderApi.completeReport(
        reportId,
        expectedVersion,
      );
      setReport(next);
      setState("saved");
      window.setTimeout(() => navigate(returnTo), 450);
    } catch (reason) {
      handleError(reason);
    }
  }

  if (!report)
    return (
      <div className="pk-page grid place-items-center px-5">
        {error ? (
          <div className="max-w-md rounded-2xl bg-white p-7 text-center">
            <TriangleAlert className="mx-auto text-red-700" />
            <p className="mt-4 font-bold">{error}</p>
            <button
              className="secondary mt-5"
              onClick={() => navigate(returnTo)}
            >
              Volver a la agenda
            </button>
          </div>
        ) : (
          <LoaderCircle className="animate-spin text-azul-monte-tabor" size={32} />
        )}
      </div>
    );
  const completed = ["COMPLETED", "SUBMITTED", "VALIDATED", "LOCKED"].includes(
    report.header.status,
  );
  const answered = report.criteria.filter(
    (criterion) => criterion.selectedOptionId || criterion.notObserved,
  ).length;
  return (
    <div className="pk-page">
      <header className="pk-topbar sticky top-0 z-20 bg-gradient-to-r from-[#1e3a5f] to-[#2d5a87]">
        <div className="mx-auto flex min-h-16 max-w-4xl items-center gap-3 px-4">
          <button
            className="grid min-h-11 min-w-11 place-items-center rounded-lg border border-white/20 bg-white/10"
            onClick={() => navigate(returnTo)}
            aria-label="Volver"
          >
            <ArrowLeft className="text-white" />
          </button>
          <div className="min-w-0">
            <p className="truncate font-black text-white">
              {report.header.groupCode} · {report.header.roomName}
            </p>
            <p className="text-xs text-cyan-200">
              {report.header.stage === "GROUP_3"
                ? "Observación focal"
                : "Interacción grupal"}{" "}
              · {answered}/{report.criteria.length}
            </p>
          </div>
          <SaveIndicator state={state} />
          <span
            className={`hidden rounded-full px-2.5 py-1 text-xs font-black sm:inline-flex ${realtimeState === "live" ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900"}`}
            role="status"
          >
            {realtimeState === "live" ? "En vivo" : "Reconectando"}
          </span>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-7">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="pk-section-title">
              {report.header.applicantName}
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Tus respuestas pertenecen sólo a este informe profesional.
            </p>
          </div>
          {report.header.rawScore !== null && (
            <div className="border-l-4 border-[#ffd700] pl-5 text-right">
              <p className="text-xs font-bold text-slate-600">
                Puntaje observado
              </p>
              <p className="text-2xl font-black text-[#1e3a5f]">
                {report.header.rawScore}/{report.header.maximumScore}
              </p>
            </div>
          )}
        </div>
        {error && (
          <div
            className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900"
            role="alert"
          >
            {error}{" "}
            {state === "conflict" && (
              <button className="ml-2 underline" onClick={() => void load()}>
                Recargar
              </button>
            )}
          </div>
        )}
        <div
          className="mb-6 h-1.5 overflow-hidden rounded-full bg-slate-200"
          role="progressbar"
          aria-label="Avance del informe"
          aria-valuemin={0}
          aria-valuemax={report.criteria.length}
          aria-valuenow={answered}
        >
          <span
            className="block h-full rounded-full bg-dorado-nazaret transition-[width] duration-300"
            style={{
              width: `${(answered / Math.max(report.criteria.length, 1)) * 100}%`,
            }}
          />
        </div>
        <div className="space-y-4">
          {report.criteria.map((criterion, index) => (
            <section
              key={criterion.criterionId}
              className="rounded-2xl border border-slate-200 bg-white p-5 lg:p-6"
            >
              <div className="flex gap-3">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#1e3a5f] text-sm font-black text-white">
                  {index + 1}
                </span>
                <div>
                  <h2 className="font-black">{criterion.name}</h2>
                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    {criterion.descriptor}
                  </p>
                </div>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-2 lg:grid-cols-6">
                {criterion.options.map((option) => {
                  const isSelected = criterion.selectedOptionId === option.optionId && !criterion.notObserved;
                  const isLogrado = option.value === 3;
                  const isPorLograr = option.value === 2;
                  const isNoLogrado = option.value === 0 || option.value === 1;
                  return (
                    <button
                      key={option.optionId}
                      disabled={
                        !report.editableNow || completed || state === "saving"
                      }
                      onClick={() =>
                        void saveCriterion(
                          criterion.criterionId,
                          option.optionId,
                          false,
                          criterion.responseVersion,
                        )
                      }
                      aria-pressed={isSelected}
                      aria-label={`${criterion.name}: ${option.value}, ${option.label}`}
                      className={`min-h-16 rounded-xl border-2 p-3 text-left transition focus:outline-none focus:ring-2 ${
                        isSelected && isLogrado ? "border-[#22c55e] bg-[#22c55e] text-white shadow-md" :
                        isSelected && isPorLograr ? "border-[#f59e0b] bg-[#f59e0b] text-white shadow-md" :
                        isSelected && isNoLogrado ? "border-[#ef4444] bg-[#ef4444] text-white shadow-md" :
                        isSelected ? "border-[#1e3a5f] bg-[#1e3a5f] text-white shadow-md" :
                        "border-slate-200 bg-white hover:border-[#2d5a87] hover:shadow-sm disabled:bg-slate-50 disabled:text-slate-400"
                      }`}
                    >
                      <span className="block text-lg font-black">
                        {option.value}
                      </span>
                      <span className={`block text-xs font-semibold ${isSelected ? "text-white/90" : ""}`}>
                        {option.label}
                      </span>
                    </button>
                  );
                })}
                <button
                  disabled={
                    !report.editableNow || completed || state === "saving"
                  }
                  onClick={() =>
                    void saveCriterion(
                      criterion.criterionId,
                      null,
                      true,
                      criterion.responseVersion,
                    )
                  }
                  aria-pressed={criterion.notObserved}
                  aria-label={`${criterion.name}: no observado`}
                  className={`min-h-16 rounded-xl border-2 p-3 text-left text-xs font-bold transition focus:outline-none focus:ring-2 ${
                    criterion.notObserved ? "border-slate-400 bg-slate-400 text-white shadow-md" : "border-slate-200 bg-white hover:border-slate-400 disabled:bg-slate-50"
                  }`}
                >
                  NO
                  <br />
                  OBSERVADO
                </button>
              </div>
            </section>
          ))}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 lg:p-6">
            <h2 className="font-black">Comentario profesional</h2>
            <p className="mt-1 text-sm text-slate-500">
              Se guarda automáticamente después de una pausa breve.
            </p>
            <textarea
              className="control mt-4 min-h-32 w-full resize-y py-3"
              disabled={!report.editableNow || completed}
              value={note}
              onChange={(e) => scheduleNote(e.target.value)}
              placeholder="Registra observaciones relevantes sin emitir una decisión de admisión."
            />
          </section>
        </div>
        <button
          className="primary mt-6 w-full text-base"
          disabled={
            completed ||
            answered !== report.criteria.length ||
            !report.editableNow ||
            state === "saving"
          }
          onClick={() => void complete()}
        >
          {completed ? "Informe finalizado" : "Finalizar y continuar"}
        </button>
        {!report.editableNow && !completed && (
          <div className="mt-3 flex flex-col items-center gap-1.5 text-center">
            {minutesUntilStart !== null && minutesUntilStart > 0 ? (
              <>
                <div className="flex items-center gap-2 text-sm font-semibold text-amber-700">
                  <LockKeyhole size={17} />
                  <span>Bloqueado · Abre en {formatMinutesRemaining(minutesUntilStart)}</span>
                </div>
                <div className="h-1.5 w-48 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-amber-400 transition-all duration-1000"
                    style={{ width: `${Math.max(0, Math.min(100, ((120 - minutesUntilStart) / 120) * 100))}%` }}
                  />
                </div>
              </>
            ) : (
              <p className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                <LockKeyhole size={17} />
                El bloque está cerrado. Administración puede otorgar una extensión auditada.
              </p>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function SaveIndicator({ state }: { state: SaveState }) {
  const content =
    state === "saving"
      ? [<LoaderCircle className="animate-spin" size={16} />, "Guardando"]
      : state === "saved"
        ? [<Check size={16} />, "Guardado"]
        : state === "offline"
          ? [<CloudOff size={16} />, "Sin conexión"]
          : state === "conflict"
            ? [<TriangleAlert size={16} />, "Conflicto"]
            : state === "closed"
              ? [<LockKeyhole size={16} />, "Bloque cerrado"]
              : [<Check size={16} />, "Listo"];
  return (
    <span
      role="status"
      aria-live="polite"
      className={`ml-auto flex min-h-9 items-center gap-2 rounded-full px-3 text-xs font-black ${state === "conflict" || state === "offline" ? "bg-amber-50 text-amber-900" : state === "closed" ? "bg-slate-100 text-slate-600" : "bg-emerald-50 text-emerald-800"}`}
    >
      {content[0]}
      {content[1]}
    </span>
  );
}
