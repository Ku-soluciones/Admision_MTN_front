import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  MapPin,
  RefreshCw,
  UserRound,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  prekinderApi,
  type AgendaGroup,
  type ReportSummary,
} from "../services/api";
import { PrekinderBrand } from "../components/PrekinderBrand";

function today() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Santiago",
  }).format(new Date());
}
function time(iso: string) {
  return new Intl.DateTimeFormat("es-CL", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Santiago",
  }).format(new Date(iso));
}
function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function EvaluatorDesk() {
  const navigate = useNavigate();
  const [date, setDate] = useState(today());
  const [agenda, setAgenda] = useState<AgendaGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [now, setNow] = useState(Date.now());

  async function load() {
    setLoading(true);
    setError("");
    try {
      setAgenda(await prekinderApi.agenda(date));
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "No pudimos cargar tu agenda.",
      );
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, [date]);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const nextReport = useMemo(
    () =>
      agenda
        .filter((item) => {
          const starts = new Date(item.group.startsAt).getTime();
          const ends = new Date(item.group.endsAt).getTime();
          return now >= starts - 3 * 60_000 && now <= ends + 10 * 60_000;
        })
        .flatMap((item) => item.reports)
        .find((report) => report.status !== "COMPLETED"),
    [agenda, now],
  );
  return (
    <div className="pk-page">
      <header className="pk-topbar">
        <div className="mx-auto flex min-h-16 max-w-6xl items-center gap-3 px-4">
          <PrekinderBrand
            title="Evaluación Prekínder"
            context="Mi agenda asignada"
          />
          <button
            className="secondary ml-auto"
            onClick={() => void load()}
            disabled={loading}
            aria-label="Actualizar agenda"
          >
            <RefreshCw
              size={17}
              className={loading ? "animate-spin sm:mr-2" : "sm:mr-2"}
            />
            <span className="hidden sm:inline">Actualizar</span>
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-7 lg:py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="pk-section-title">Tus grupos del día</h1>
            <p className="mt-1 text-sm text-slate-600">
              Sólo verás las salas y postulantes asignados a tu perfil.
            </p>
          </div>
          <label className="text-xs font-extrabold text-slate-600">
            Fecha
            <input
              className="control mt-1 block"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>
        </div>
        {error && (
          <div
            className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-900"
            role="alert"
          >
            <span>{error}</span>
            <button
              className="min-h-11 rounded-lg px-3 font-extrabold underline underline-offset-4"
              onClick={() => void load()}
            >
              Reintentar
            </button>
          </div>
        )}
        {nextReport && (
          <button
            className="mt-6 flex min-h-16 w-full items-center gap-4 rounded-2xl bg-azul-monte-tabor px-5 text-left text-blanco-pureza shadow-lg"
            onClick={() =>
              navigate(`/prekinder/evaluador/informe/${nextReport.reportId}`)
            }
          >
            <CheckCircle2 size={24} />
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-bold text-blue-200">
                Evaluación disponible ahora
              </span>
              <span className="block truncate font-black">
                {nextReport.applicantName}
              </span>
            </span>
            <ArrowRight />
          </button>
        )}
        <div className="mt-6 space-y-5">
          {agenda.map((item) => (
            <AgendaBlock
              key={item.group.groupId}
              item={item}
              now={now}
              onOpen={(report) =>
                navigate(`/prekinder/evaluador/informe/${report.reportId}`)
              }
            />
          ))}
          {!loading && !agenda.length && (
            <div className="pk-panel p-10 text-center sm:p-12">
              <CalendarDays size={36} className="mx-auto text-slate-300" />
              <h2 className="mt-4 font-black">No tienes grupos asignados</h2>
              <p className="mt-2 text-sm text-slate-500">
                No hay bloques para esta fecha. Si esperabas una asignación,
                solicita a coordinación que revise la jornada.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function AgendaBlock({
  item,
  now,
  onOpen,
}: {
  item: AgendaGroup;
  now: number;
  onOpen: (report: ReportSummary) => void;
}) {
  const starts = new Date(item.group.startsAt).getTime();
  const ends = new Date(item.group.endsAt).getTime();
  const active = now >= starts - 3 * 60_000 && now <= ends + 10 * 60_000;
  const minutes = active
    ? Math.ceil((ends + 10 * 60_000 - now) / 60_000)
    : null;
  const timingLabel = active
    ? now < starts
      ? `Disponible · comienza en ${Math.max(1, Math.ceil((starts - now) / 60_000))} min`
      : now <= ends
        ? `${Math.max(1, Math.ceil((ends - now) / 60_000))} min de bloque`
        : `${Math.max(minutes ?? 0, 0)} min para cerrar`
    : starts > now
      ? "Próximo"
      : "Cerrado";
  return (
    <section
      className={`overflow-hidden rounded-2xl border bg-white ${active ? "border-blue-400 shadow-[0_12px_30px_rgba(30,58,138,.12)]" : "border-slate-200"}`}
    >
      <div
        className={`flex flex-wrap items-center gap-4 border-b px-5 py-4 ${active ? "border-blue-200 bg-blue-50" : "border-slate-100"}`}
      >
        <div className="flex items-center gap-2 font-black text-azul-monte-tabor">
          <Clock3 size={19} />
          {time(item.group.startsAt)}–{time(item.group.endsAt)}
        </div>
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-600">
          <MapPin size={17} />
          {item.group.roomName}
        </div>
        <span className="text-sm font-bold">
          {item.group.code} ·{" "}
          {item.group.stage === "GROUP_3"
            ? "Observación focal"
            : "Interacción grupal"}
        </span>
        <span
          className={`ml-auto rounded-full px-3 py-1 text-xs font-black ${active ? "bg-azul-monte-tabor text-blanco-pureza" : "bg-slate-100 text-slate-500"}`}
        >
          {timingLabel}
        </span>
      </div>
      <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
        {item.reports.map((report, index) => (
          <button
            key={report.reportId}
            onClick={() => onOpen(report)}
            disabled={!active && report.status !== "COMPLETED"}
            aria-label={`${report.status === "COMPLETED" ? "Revisar" : "Completar"} informe de ${report.applicantName}`}
            className="group flex min-h-28 items-center gap-4 rounded-xl border border-slate-200 p-4 text-left transition hover:border-blue-300 hover:shadow-md disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-65"
          >
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-blue-50 font-black text-blue-900">
              {initials(report.applicantName) || <UserRound size={20} />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Niño {index + 1} ·{" "}
                {report.status === "COMPLETED" ? "Finalizado" : "Pendiente"}
              </span>
              <span className="mt-1 block truncate font-black">
                {report.applicantName}
              </span>
              {report.rawScore !== null && (
                <span className="mt-1 block text-xs text-slate-500">
                  Puntaje {report.rawScore}/{report.maximumScore}
                </span>
              )}
            </span>
            <ArrowRight
              size={19}
              className="text-slate-300 group-hover:text-blue-700"
            />
          </button>
        ))}
      </div>
    </section>
  );
}
