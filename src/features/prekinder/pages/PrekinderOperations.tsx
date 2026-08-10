import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  CalendarDays,
  Check,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  DoorOpen,
  FileCheck2,
  LayoutDashboard,
  Menu,
  RefreshCw,
  ShieldCheck,
  Users,
  UsersRound,
  X,
} from "lucide-react";
import {
  ApiError,
  prekinderApi,
  type AdmissionProcess,
  type DashboardMetrics,
  type EvaluationGroup,
  type FlowApplication,
  type Professional,
  type ProfessionalRoleCode,
  type ProfessionalRoleDefinition,
  type ProfessionalRoleGroup,
  type Room,
  type Wave,
} from "../services/api";
import { PrekinderBrand } from "../components/PrekinderBrand";
import { PrekinderControlTower } from "../components/admin/PrekinderControlTower";
import { AcademicEvaluatorConsole } from "../components/admin/AcademicEvaluatorConsole";
import { SpecialtyEvaluatorConsole } from "../components/admin/SpecialtyEvaluatorConsole";
import {
  createMockGroups,
  mockApplications,
  mockMetrics,
  mockProcess,
  mockRooms,
  mockWaves,
} from "../data/mockControlTower";

const sections = [
  ["Resumen", LayoutDashboard],
  ["Etapas", Activity],
  ["Postulaciones", Users],
  ["Torre de control", CalendarDays],
  ["Evaluador académico", ClipboardCheck],
  ["Psicomotricidad", ClipboardCheck],
  ["Psicología", ShieldCheck],
  ["Indicadores de ingreso", ClipboardCheck],
  ["Observación grupal", UsersRound],
  ["Apoyo al Aprendizaje", ShieldCheck],
  ["DAP", ShieldCheck],
  ["Profesionales", UsersRound],
  ["Pautas", ClipboardCheck],
  ["Decisiones", FileCheck2],
  ["Auditoría", ShieldCheck],
] as const;

const waveNames: Record<string, string> = {
  SIBLINGS: "Hermanos de alumnos",
  STAFF_OR_ALUMNI: "Funcionarios y exalumnos",
  NEW_FAMILIES: "Nuevas familias",
};

const statusTone: Record<string, string> = {
  VERIFIED: "bg-emerald-50 text-emerald-800",
  PENDING: "bg-amber-50 text-amber-800",
  REJECTED: "bg-red-50 text-red-800",
  CONFIRMED: "bg-blue-50 text-blue-800",
  COMPLETED: "bg-emerald-50 text-emerald-800",
  DRAFT: "bg-slate-100 text-slate-700",
};
const statusLabel: Record<string, string> = {
  VERIFIED: "Verificada",
  PENDING: "Pendiente",
  REJECTED: "Rechazada",
  CONFIRMED: "Confirmado",
  COMPLETED: "Completado",
  DRAFT: "Borrador",
  CANCELLED: "Cancelado",
  PUBLISHED: "Publicada",
  CLOSED: "Cerrada",
};

function today() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Santiago",
  }).format(new Date());
}
function localInput(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}
function futureLocalInput(days: number) {
  return localInput(
    new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString(),
  );
}
function fullName(app: FlowApplication) {
  return [
    app.identity.firstName,
    app.identity.paternalLastName,
    app.identity.maternalLastName,
  ]
    .filter(Boolean)
    .join(" ");
}
function formatTime(iso: string) {
  return new Intl.DateTimeFormat("es-CL", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Santiago",
  }).format(new Date(iso));
}

type PrekinderOperationsProps = {
  embedded?: boolean;
};

export function PrekinderOperations({
  embedded = false,
}: PrekinderOperationsProps) {
  const demoMode =
    import.meta.env.DEV && import.meta.env.VITE_PREKINDER_DEMO === "true";
  const initialDate = today();
  const initialDemoGroups = demoMode ? createMockGroups(initialDate) : [];
  const [section, setSection] = useState(() => {
    const requestedView = new URLSearchParams(window.location.search).get("prekinderView");
    if (requestedView === "control-tower") return "Torre de control";
    if (requestedView === "academic-evaluator") return "Evaluador académico";
    if (requestedView === "professionals") return "Profesionales";
    const evaluatorViews: Record<string, string> = {
      psychomotor: "Psicomotricidad",
      psychology: "Psicología",
      indicators: "Indicadores de ingreso",
      "group-observation": "Observación grupal",
      support: "Apoyo al Aprendizaje",
      dap: "DAP",
    };
    if (requestedView && evaluatorViews[requestedView]) return evaluatorViews[requestedView];
    return "Resumen";
  });
  const [mobileNav, setMobileNav] = useState(false);
  const [baseLoading, setBaseLoading] = useState(!demoMode);
  const [processes, setProcesses] = useState<AdmissionProcess[]>(demoMode ? [mockProcess] : []);
  const [processId, setProcessId] = useState(demoMode ? mockProcess.processId : "");
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(demoMode ? mockMetrics : null);
  const [waves, setWaves] = useState<Wave[]>(demoMode ? mockWaves : []);
  const [applications, setApplications] = useState<FlowApplication[]>(demoMode ? mockApplications : []);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [professionalRoles, setProfessionalRoles] = useState<ProfessionalRoleDefinition[]>([]);
  const [rooms, setRooms] = useState<Room[]>(demoMode ? mockRooms : []);
  const [groups, setGroups] = useState<EvaluationGroup[]>(initialDemoGroups);
  const [date, setDate] = useState(initialDate);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(initialDemoGroups[0]?.groupId ?? null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const selected =
    groups.find((group) => group.groupId === selectedGroup) ?? null;
  const currentProcess = useMemo(
    () => processes.find((process) => process.processId === processId) ?? null,
    [processes, processId],
  );
  const eligible = applications.filter(
    (app) => app.eligibilityStatus === "VERIFIED",
  );

  async function loadBase() {
    setBaseLoading(true);
    setError("");
    try {
      const [next, people, roles] = await Promise.all([
        prekinderApi.processes(),
        prekinderApi.professionals(),
        prekinderApi.professionalRoles(),
      ]);
      setProcesses(next);
      setProcessId((current) =>
        next.some((process) => process.processId === current)
          ? current
          : next[0]?.processId || "",
      );
      setProfessionals(people);
      setProfessionalRoles(roles);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "No pudimos cargar Prekínder.",
      );
    } finally {
      setBaseLoading(false);
    }
  }

  async function loadProcess(id = processId, day = date) {
    if (!id) return;
    setBusy(true);
    setError("");
    try {
      const [nextMetrics, nextWaves, nextApplications, nextRooms, nextGroups] =
        await Promise.all([
          prekinderApi.dashboard(id),
          prekinderApi.waves(id),
          prekinderApi.flowApplications(id),
          prekinderApi.rooms(id),
          prekinderApi.groups(id, day),
        ]);
      setMetrics(nextMetrics);
      setWaves(nextWaves);
      setApplications(nextApplications);
      setRooms(nextRooms);
      setGroups(nextGroups);
      setSelectedGroup((current) =>
        nextGroups.some((group) => group.groupId === current) ? current : null,
      );
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "No pudimos actualizar la jornada.",
      );
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (demoMode) return;
    void loadBase();
  }, [demoMode]);
  useEffect(() => {
    if (demoMode) {
      const nextGroups = createMockGroups(date);
      setGroups(nextGroups);
      setSelectedGroup((current) =>
        nextGroups.some((group) => group.groupId === current)
          ? current
          : nextGroups[0]?.groupId ?? null,
      );
      return;
    }
    if (processId) void loadProcess(processId, date);
  }, [processId, date, demoMode]);
  useEffect(() => {
    if (!mobileNav) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileNav(false);
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [mobileNav]);

  async function action(work: () => Promise<unknown>, success: string) {
    if (demoMode) {
      setMessage(`${success} Vista demostrativa: el cambio no se guardó en la base de datos.`);
      return;
    }
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await work();
      setMessage(success);
      await loadProcess();
    } catch (reason) {
      setError(
        reason instanceof ApiError
          ? reason.message
          : "No pudimos guardar el cambio.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function saveStage(
    wave: Wave,
    opensAt: string,
    closesAt: string,
    status: Wave["status"],
  ) {
    if (demoMode) {
      setMessage("Etapa actualizada. Vista demostrativa: el cambio no se guardó en la base de datos.");
      return;
    }
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const updated = await prekinderApi.configureWave(wave.waveId, {
        opensAt,
        closesAt,
        status,
        expectedVersion: wave.version,
      });
      const persistedStages = await prekinderApi.waves(wave.processId);
      const persisted = persistedStages.find((item) => item.waveId === wave.waveId);
      const sameInstant = (left: string | null, right: string) =>
        left !== null && new Date(left).getTime() === new Date(right).getTime();
      if (
        !persisted ||
        persisted.version !== updated.version ||
        persisted.status !== status ||
        !sameInstant(persisted.opensAt, opensAt) ||
        !sameInstant(persisted.closesAt, closesAt)
      ) {
        throw new Error(
          "El servidor respondió, pero la etapa no quedó persistida. No se confirmó el cambio.",
        );
      }
      setWaves(persistedStages);
      setMessage("Etapa guardada y verificada en la base de datos.");
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "No pudimos guardar la etapa.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function refreshAll() {
    if (demoMode) {
      const nextGroups = createMockGroups(date);
      setGroups(nextGroups);
      setSelectedGroup(nextGroups[0]?.groupId ?? null);
      setMessage("Datos de demostración restablecidos.");
      return;
    }
    await loadBase();
    if (processId) await loadProcess();
  }

  async function createAdmissionProcess(academicYear: number, name: string) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const created = await prekinderApi.createProcess(academicYear, name);
      setProcesses((current) => [
        created,
        ...current.filter((process) => process.processId !== created.processId),
      ]);
      setProcessId(created.processId);
      setSection("Etapas");
      setMessage(
        "Proceso creado. Define su periodo general para continuar con las etapas.",
      );
    } catch (reason) {
      setError(
        reason instanceof ApiError
          ? reason.message
          : "No pudimos crear el proceso. Revisa los datos e inténtalo nuevamente.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function publishAdmissionProcess(startsAt: string, endsAt: string) {
    if (!currentProcess) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const published = await prekinderApi.publishProcess(
        currentProcess.processId,
        startsAt,
        endsAt,
      );
      setProcesses((current) =>
        current.map((process) =>
          process.processId === published.processId ? published : process,
        ),
      );
      setSection("Etapas");
      setMessage(
        "Proceso habilitado. Ahora publica una etapa para recibir postulaciones.",
      );
      await loadProcess(published.processId);
    } catch (reason) {
      setError(
        reason instanceof ApiError
          ? reason.message
          : "No pudimos habilitar el proceso. Revisa las fechas e inténtalo nuevamente.",
      );
    } finally {
      setBusy(false);
    }
  }

  const Content = embedded ? "section" : "main";
  const SectionHeading = embedded ? "h2" : "h1";

  return (
    <div className={embedded ? "min-h-full" : "pk-page"}>
      {!embedded && <header className="pk-topbar sticky top-0 z-30">
        <div className="flex h-16 items-center gap-4 px-4 lg:px-7">
          <button
            className="grid min-h-11 min-w-11 place-items-center rounded-lg border border-slate-200 lg:hidden"
            onClick={() => setMobileNav(true)}
            aria-label="Abrir navegación"
          >
            <Menu size={20} />
          </button>
          <PrekinderBrand
            title="Admisión Prekínder"
            context="Centro de jornada"
            compactOnMobile
          />
          <a
            href="/admin"
            className="ml-auto flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            ← Volver al Admin
          </a>
          <ProcessControls
            className=""
            processes={processes}
            processId={processId}
            busy={busy || baseLoading}
            onChange={setProcessId}
            onRefresh={() => void refreshAll()}
          />
        </div>
      </header>}

      {embedded && (
        <section className="mb-6 overflow-hidden rounded-2xl border border-blue-200 bg-blue-50/70">
          <div className="flex flex-wrap items-start gap-5 p-5 sm:p-6">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-blue-800">
                Proceso independiente
              </p>
              <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                Admisión Prekínder
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                Este espacio administra únicamente las postulaciones, jornadas,
                evaluaciones y decisiones de Prekínder.
              </p>
            </div>
            <ProcessControls
              className="w-full sm:w-auto"
              processes={processes}
              processId={processId}
              busy={busy || baseLoading}
              onChange={setProcessId}
              onRefresh={() => void refreshAll()}
            />
          </div>
          <Navigation
            section={section}
            onSelect={setSection}
            compact
            disabled={!processId || currentProcess?.status === "DRAFT"}
          />
        </section>
      )}

      <div className={embedded ? "" : "flex"}>
        {!embedded && <aside className="hidden min-h-[calc(100vh-4rem)] w-64 shrink-0 border-r border-slate-200 bg-white p-3 lg:block">
          <Navigation
            section={section}
            onSelect={setSection}
            disabled={!processId || currentProcess?.status === "DRAFT"}
          />
        </aside>}
        {!embedded && mobileNav && (
          <div
            className="fixed inset-0 z-50 bg-slate-950/40 lg:hidden"
            onClick={() => setMobileNav(false)}
          >
            <aside
              className="h-full w-72 bg-white p-4"
              onClick={(event) => event.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label="Navegación de Prekínder"
            >
              <button
                className="mb-4 ml-auto grid min-h-11 min-w-11 place-items-center"
                onClick={() => setMobileNav(false)}
                aria-label="Cerrar navegación"
              >
                <X />
              </button>
              <Navigation
                section={section}
                disabled={!processId || currentProcess?.status === "DRAFT"}
                onSelect={(next) => {
                  setSection(next);
                  setMobileNav(false);
                }}
              />
            </aside>
          </div>
        )}

        <Content className={embedded ? "min-w-0" : "min-w-0 flex-1 p-4 lg:p-7"}>
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <SectionHeading className="pk-section-title">
                {baseLoading
                  ? "Cargando Prekínder"
                  : !processId
                    ? "Crear proceso"
                    : currentProcess?.status === "DRAFT"
                      ? "Habilitar proceso"
                      : section}
              </SectionHeading>
            </div>
            {section === "Torre de control" && (
              <label className="text-xs font-bold text-slate-600">
                Fecha
                <input
                  className="mt-1 block min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm"
                  type="date"
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                />
              </label>
            )}
          </div>
          {error && (
            <div
              className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-900"
              role="alert"
            >
              <span>{error}</span>
              <button
                className="min-h-11 rounded-lg px-3 font-extrabold underline underline-offset-4"
                onClick={() => void refreshAll()}
              >
                Reintentar
              </button>
            </div>
          )}
          {demoMode && (
            <div className="mb-5 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm font-semibold text-amber-950" role="status">
              <span className="font-black">Modo demostración:</span>{" "}
              proceso ficticio con 210 postulantes, 70 grupos y 10 salas. Ninguna acción modifica Admitia.
            </div>
          )}
          {message && (
            <div
              className="mb-5 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800"
              role="status"
            >
              <Check size={18} />
              {message}
            </div>
          )}

          {baseLoading ? (
            <LoadingProcessState />
          ) : !processId ? (
            <EmptyProcessState
              busy={busy}
              onCreate={createAdmissionProcess}
            />
          ) : currentProcess?.status === "DRAFT" ? (
            <ProcessActivation
              process={currentProcess}
              busy={busy}
              onPublish={publishAdmissionProcess}
            />
          ) : (
            <>
          {section === "Resumen" && (
            <Overview
              metrics={metrics}
              waves={waves}
              groups={groups}
              applications={applications}
              onGo={setSection}
            />
          )}
          {section === "Etapas" && (
            <Waves
              waves={waves}
              busy={busy}
              onSave={saveStage}
            />
          )}
          {section === "Postulaciones" && (
            <Applications
              applications={applications}
              busy={busy}
              onReview={(app, decision, reason) =>
                action(
                  () =>
                    prekinderApi.reviewEligibility(
                      app.applicationId,
                      decision,
                      reason,
                      app.declarationVersion,
                    ),
                  decision === "VERIFIED"
                    ? "Elegibilidad verificada."
                    : "Declaración rechazada e invalidada.",
                )
              }
            />
          )}
          {section === "Torre de control" && (
            <PrekinderControlTower
              processId={processId}
              date={date}
              rooms={rooms}
              groups={groups}
              applications={eligible}
              selected={selected}
              busy={busy}
              onSelect={setSelectedGroup}
              onAction={action}
            />
          )}
          {section === "Evaluador académico" && (
            <AcademicEvaluatorConsole
              groups={groups}
              applications={eligible}
              rooms={rooms}
            />
          )}
          {section === "Psicomotricidad" && <SpecialtyEvaluatorConsole profile="PSYCHOMOTOR" groups={groups} applications={eligible} rooms={rooms} />}
          {section === "Psicología" && <SpecialtyEvaluatorConsole profile="PSYCHOLOGY" groups={groups} applications={eligible} rooms={rooms} />}
          {section === "Indicadores de ingreso" && <SpecialtyEvaluatorConsole profile="INDICATORS" groups={groups} applications={eligible} rooms={rooms} />}
          {section === "Observación grupal" && <SpecialtyEvaluatorConsole profile="GROUP_OBSERVATION" groups={groups} applications={eligible} rooms={rooms} />}
          {section === "Apoyo al Aprendizaje" && <SpecialtyEvaluatorConsole profile="SUPPORT" groups={groups} applications={eligible} rooms={rooms} />}
          {section === "DAP" && <SpecialtyEvaluatorConsole profile="DAP" groups={groups} applications={eligible} rooms={rooms} />}
          {section === "Profesionales" && (
            <Professionals
              processId={processId}
              professionals={professionals}
              roles={professionalRoles}
              busy={busy}
              onSave={async (input) => {
                if (demoMode) {
                  setMessage("Perfil profesional guardado.");
                  return true;
                }
                setBusy(true);
                setError("");
                try {
                  await prekinderApi.saveProfessional(input);
                  setProfessionals(await prekinderApi.professionals());
                  setMessage("Perfil profesional guardado.");
                  return true;
                } catch (requestError) {
                  setError(requestError instanceof Error ? requestError.message : "No fue posible guardar el perfil profesional.");
                  return false;
                } finally {
                  setBusy(false);
                }
              }}
            />
          )}
          {section === "Pautas" && <Rubrics />}
          {section === "Decisiones" && (
            <Decisions
              processId={processId}
              applications={applications}
              busy={busy}
              onAction={action}
            />
          )}
          {section === "Auditoría" && <AuditNotice />}
            </>
          )}
        </Content>
      </div>
    </div>
  );
}

function LoadingProcessState() {
  return (
    <div
      className="flex min-h-72 items-center justify-center rounded-2xl bg-white"
      role="status"
    >
      <RefreshCw
        className="mr-3 animate-spin text-azul-monte-tabor motion-reduce:animate-none"
        size={22}
        aria-hidden="true"
      />
      <span className="text-sm font-bold text-slate-700">
        Cargando configuración de Prekínder
      </span>
    </div>
  );
}

function EmptyProcessState({
  busy,
  onCreate,
}: {
  busy: boolean;
  onCreate: (academicYear: number, name: string) => Promise<void>;
}) {
  const suggestedYear = Math.max(2027, new Date().getFullYear() + 1);
  const [academicYear, setAcademicYear] = useState(suggestedYear);
  const [name, setName] = useState(`Admisión Prekínder ${suggestedYear}`);
  const canCreate =
    academicYear >= 2027 && academicYear <= 2100 && Boolean(name.trim());

  return (
    <section className="overflow-hidden rounded-2xl bg-white shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
      <div className="grid lg:grid-cols-[minmax(0,0.85fr)_minmax(360px,1.15fr)]">
        <div className="bg-azul-monte-tabor p-7 text-white sm:p-9">
          <span className="grid h-12 w-12 place-items-center rounded-xl bg-white/10 text-blue-100">
            <CalendarDays size={25} aria-hidden="true" />
          </span>
          <h2 className="mt-7 max-w-md text-2xl font-black tracking-[-0.02em] sm:text-3xl">
            Crea el proceso que recibirás este año
          </h2>
          <p className="mt-3 max-w-lg text-sm leading-6 text-blue-100">
            El proceso reúne sus etapas, postulaciones, jornadas y decisiones.
            Después de crearlo definirás cuándo estará disponible para las
            familias.
          </p>
          <ol className="mt-8 space-y-4 text-sm font-bold text-blue-50">
            <li className="flex items-center gap-3">
              <span className="grid h-7 w-7 place-items-center rounded-full bg-white text-xs text-azul-monte-tabor">
                1
              </span>
              Crear el proceso anual
            </li>
            <li className="flex items-center gap-3 text-blue-200">
              <span className="grid h-7 w-7 place-items-center rounded-full border border-blue-300 text-xs">
                2
              </span>
              Definir el periodo general
            </li>
            <li className="flex items-center gap-3 text-blue-200">
              <span className="grid h-7 w-7 place-items-center rounded-full border border-blue-300 text-xs">
                3
              </span>
              Publicar la primera etapa
            </li>
          </ol>
        </div>

        <form
          className="flex flex-col justify-center p-7 sm:p-9 lg:p-11"
          onSubmit={(event) => {
            event.preventDefault();
            if (canCreate && !busy) void onCreate(academicYear, name.trim());
          }}
        >
          <h2 className="text-xl font-black text-slate-950">
            Datos del nuevo proceso
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
            Puedes cambiar el nombre; el año académico identifica el proceso
            en todo el panel.
          </p>
          <div className="mt-7 grid gap-5 sm:grid-cols-[150px_1fr]">
            <Field label="Año académico">
              <input
                className="control w-full"
                type="number"
                min={2027}
                max={2100}
                value={academicYear}
                onChange={(event) =>
                  setAcademicYear(Number(event.target.value))
                }
                required
              />
            </Field>
            <Field label="Nombre del proceso">
              <input
                className="control w-full"
                type="text"
                maxLength={160}
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Admisión Prekínder 2027"
                required
              />
            </Field>
          </div>
          <button
            className="primary mt-7 w-full sm:w-fit"
            type="submit"
            disabled={!canCreate || busy}
          >
            {busy ? (
              <RefreshCw
                className="mr-2 animate-spin motion-reduce:animate-none"
                size={18}
                aria-hidden="true"
              />
            ) : (
              <CalendarDays className="mr-2" size={18} aria-hidden="true" />
            )}
            {busy ? "Creando proceso" : "Crear proceso"}
          </button>
        </form>
      </div>
    </section>
  );
}

function ProcessActivation({
  process,
  busy,
  onPublish,
}: {
  process: AdmissionProcess;
  busy: boolean;
  onPublish: (startsAt: string, endsAt: string) => Promise<void>;
}) {
  const [startsAt, setStartsAt] = useState(
    localInput(process.startsAt) || futureLocalInput(0),
  );
  const [endsAt, setEndsAt] = useState(
    localInput(process.endsAt) || futureLocalInput(90),
  );
  useEffect(() => {
    setStartsAt(localInput(process.startsAt) || futureLocalInput(0));
    setEndsAt(localInput(process.endsAt) || futureLocalInput(90));
  }, [process.processId, process.startsAt, process.endsAt]);
  const hasValidWindow =
    Boolean(startsAt && endsAt) &&
    new Date(endsAt).getTime() > new Date(startsAt).getTime();

  return (
    <section className="overflow-hidden rounded-2xl bg-white shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
      <div className="border-b border-slate-200 px-7 py-6 sm:px-9">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-slate-950">
              {process.name}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              El proceso está creado como borrador. Define su periodo general
              para habilitar la configuración de etapas y la recepción de
              postulaciones.
            </p>
          </div>
          <span className="rounded-full bg-amber-100 px-3 py-1.5 text-xs font-extrabold text-amber-900">
            Borrador
          </span>
        </div>
      </div>
      <form
        className="grid gap-7 p-7 sm:p-9 lg:grid-cols-[1fr_1fr_auto] lg:items-end"
        onSubmit={(event) => {
          event.preventDefault();
          if (hasValidWindow && !busy) {
            void onPublish(
              new Date(startsAt).toISOString(),
              new Date(endsAt).toISOString(),
            );
          }
        }}
      >
        <Field label="Inicio del proceso">
          <input
            className="control w-full"
            type="datetime-local"
            value={startsAt}
            onChange={(event) => setStartsAt(event.target.value)}
            required
          />
        </Field>
        <Field label="Cierre del proceso">
          <input
            className="control w-full"
            type="datetime-local"
            value={endsAt}
            onChange={(event) => setEndsAt(event.target.value)}
            required
          />
        </Field>
        <button
          className="primary w-full lg:w-auto"
          type="submit"
          disabled={!hasValidWindow || busy}
        >
          {busy ? (
            <RefreshCw
              className="mr-2 animate-spin motion-reduce:animate-none"
              size={18}
              aria-hidden="true"
            />
          ) : (
            <Check className="mr-2" size={18} aria-hidden="true" />
          )}
          {busy ? "Habilitando" : "Habilitar proceso"}
        </button>
        {!hasValidWindow && (
          <p className="text-sm font-semibold text-red-700 sm:col-span-2 lg:col-span-3" role="alert">
            La fecha de cierre debe ser posterior a la fecha de inicio.
          </p>
        )}
      </form>
    </section>
  );
}

function ProcessControls({
  className = "",
  processes,
  processId,
  busy,
  onChange,
  onRefresh,
}: {
  className?: string;
  processes: AdmissionProcess[];
  processId: string;
  busy: boolean;
  onChange: (processId: string) => void;
  onRefresh: () => void;
}) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <label className="min-w-0 flex-1 sm:flex-none">
        <span className="sr-only">Proceso de admisión</span>
        <select
          className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-azul-monte-tabor sm:max-w-[240px]"
          value={processId}
          onChange={(event) => onChange(event.target.value)}
          disabled={!processes.length || busy}
        >
          {processes.map((process) => (
            <option key={process.processId} value={process.processId}>
              {process.name}
            </option>
          ))}
          {!processes.length && <option value="">Sin proceso</option>}
        </select>
      </label>
      <button
        className="grid min-h-11 min-w-11 place-items-center rounded-lg border border-slate-300 bg-white text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
        onClick={onRefresh}
        disabled={busy}
        aria-label="Actualizar información de Prekínder"
      >
        <RefreshCw size={18} className={busy ? "animate-spin" : ""} />
      </button>
    </div>
  );
}

function Navigation({
  section,
  onSelect,
  compact = false,
  disabled = false,
}: {
  section: string;
  onSelect: (section: string) => void;
  compact?: boolean;
  disabled?: boolean;
}) {
  return (
    <nav
      aria-label="Secciones de Prekínder"
      className={
        compact
          ? "pk-module-nav flex gap-1.5 overflow-x-auto border-t border-blue-200 px-5 py-4 sm:px-6"
          : "space-y-1"
      }
    >
      {sections.map(([label, Icon]) => (
        <button
          key={label}
          onClick={() => onSelect(label)}
          disabled={disabled}
          aria-current={section === label ? "page" : undefined}
          className={`flex min-h-11 items-center gap-2 rounded-lg px-2.5 text-left text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-400 ${compact ? "shrink-0 border" : "w-full gap-3 border border-transparent"} ${section === label && !disabled ? "border-azul-monte-tabor bg-azul-monte-tabor text-blanco-pureza" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-950"}`}
        >
          <Icon size={18} className={compact ? "lg:hidden" : undefined} />
          {label}
        </button>
      ))}
    </nav>
  );
}

function Overview({
  metrics,
  waves,
  groups,
  applications,
  onGo,
}: {
  metrics: DashboardMetrics | null;
  waves: Wave[];
  groups: EvaluationGroup[];
  applications: FlowApplication[];
  onGo: (value: string) => void;
}) {
  const cards = [
    ["Postulaciones", metrics?.applications ?? 0, "Postulaciones"],
    [
      "Elegibilidad pendiente",
      metrics?.eligibilityPending ?? 0,
      "Postulaciones",
    ],
    ["Grupos de hoy", metrics?.groupsToday ?? 0, "Torre de control"],
    ["Informes pendientes", metrics?.reportsPending ?? 0, "Torre de control"],
    ["Decisiones listas", metrics?.decisionsReady ?? 0, "Decisiones"],
  ] as const;
  const active = waves.find((wave) => wave.active);
  return (
    <div className="space-y-6">
      <section className="pk-panel grid grid-cols-2 overflow-hidden xl:grid-cols-5">
        {cards.map(([label, value, target]) => (
          <button
            key={label}
            onClick={() => onGo(target)}
            className="group min-h-24 border-b border-r border-slate-200 p-4 text-left transition-colors hover:bg-blue-50/60 sm:p-5 xl:min-h-28 xl:border-b-0 [&:nth-child(even)]:border-r-0 xl:[&:nth-child(even)]:border-r xl:[&:last-child]:border-r-0"
          >
            <p className="text-sm font-semibold text-slate-600">{label}</p>
            <p className="mt-2 flex items-end justify-between text-3xl font-black text-azul-monte-tabor sm:mt-3">
              {value}
              <ChevronRight
                size={17}
                className="mb-1 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-blue-800"
              />
            </p>
          </button>
        ))}
      </section>
      <section className="grid gap-5 xl:grid-cols-[1.25fr_.75fr]">
        <div className="pk-panel p-6">
          <h2 className="text-lg font-extrabold">Estado operativo</h2>
          <div className="mt-5 divide-y divide-slate-100">
            {groups.length ? (
              groups.slice(0, 5).map((group) => (
                <button
                  key={group.groupId}
                  onClick={() => onGo("Torre de control")}
                  className="flex min-h-16 w-full items-center gap-4 text-left"
                >
                  <span className="w-14 text-sm font-black text-azul-monte-tabor">
                    {formatTime(group.startsAt)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-bold">
                      {group.code} · {group.roomName}
                    </span>
                    <span className="text-xs text-slate-500">
                      {group.memberIds.length}/{group.capacity} niños ·{" "}
                      {group.evaluatorIds.length}/{group.requiredEvaluators}{" "}
                      profesionales
                    </span>
                  </span>
                  <ChevronRight size={18} />
                </button>
              ))
            ) : (
              <p className="py-10 text-center text-sm text-slate-500">
                No hay grupos para hoy.
              </p>
            )}
          </div>
        </div>
        <div className="rounded-[14px] bg-azul-monte-tabor p-6 text-blanco-pureza shadow-[0_16px_36px_rgba(30,58,138,0.16)]">
          <p className="text-sm font-bold text-blue-200">Etapa vigente</p>
          <h2 className="mt-3 text-2xl font-black">
            {active ? waveNames[active.waveType] : "Sin etapa abierta"}
          </h2>
          <p className="mt-3 text-sm leading-6 text-blue-100">
            {active
              ? `Recibiendo postulaciones hasta ${new Intl.DateTimeFormat("es-CL", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Santiago" }).format(new Date(active.closesAt!))}.`
              : "Publica una ventana para habilitar postulaciones."}
          </p>
          <p className="mt-8 text-4xl font-black">{applications.length}</p>
          <p className="text-sm text-blue-200">postulaciones registradas</p>
        </div>
      </section>
    </div>
  );
}

function Waves({
  waves,
  busy,
  onSave,
}: {
  waves: Wave[];
  busy: boolean;
  onSave: (
    wave: Wave,
    opensAt: string,
    closesAt: string,
    status: Wave["status"],
  ) => Promise<void>;
}) {
  return (
    <div className="grid gap-5 xl:grid-cols-3">
      {waves.map((wave) => (
        <WaveEditor key={wave.waveId} wave={wave} busy={busy} onSave={onSave} />
      ))}
    </div>
  );
}
function WaveEditor({
  wave,
  busy,
  onSave,
}: {
  wave: Wave;
  busy: boolean;
  onSave: (
    wave: Wave,
    opensAt: string,
    closesAt: string,
    status: Wave["status"],
  ) => Promise<void>;
}) {
  const [opensAt, setOpensAt] = useState(localInput(wave.opensAt));
  const [closesAt, setClosesAt] = useState(localInput(wave.closesAt));
  const [status, setStatus] = useState(wave.status);
  useEffect(() => {
    setOpensAt(localInput(wave.opensAt));
    setClosesAt(localInput(wave.closesAt));
    setStatus(wave.status);
  }, [wave]);
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 font-black text-blue-900">
          {wave.position}
        </span>
        <span
          className={`rounded-full px-3 py-1 text-xs font-extrabold ${wave.active ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-700"}`}
        >
          {wave.active ? "Vigente" : statusLabel[wave.status] || wave.status}
        </span>
      </div>
      <h2 className="mt-5 text-lg font-black">{waveNames[wave.waveType]}</h2>
      <div className="mt-5 space-y-4">
        <Field label="Apertura">
          <input
            className="control"
            type="datetime-local"
            value={opensAt}
            onChange={(e) => setOpensAt(e.target.value)}
          />
        </Field>
        <Field label="Cierre">
          <input
            className="control"
            type="datetime-local"
            value={closesAt}
            onChange={(e) => setClosesAt(e.target.value)}
          />
        </Field>
        <Field label="Estado">
          <select
            className="control"
            value={status}
            onChange={(e) => setStatus(e.target.value as Wave["status"])}
          >
            <option value="DRAFT">Borrador</option>
            <option value="PUBLISHED">Publicada</option>
            <option value="CLOSED">Cerrada</option>
            <option value="CANCELLED">Cancelada</option>
          </select>
        </Field>
        <button
          disabled={busy || !opensAt || !closesAt}
          onClick={() =>
            void onSave(
              wave,
              new Date(opensAt).toISOString(),
              new Date(closesAt).toISOString(),
              status,
            )
          }
          className="primary w-full"
        >
          Guardar configuración
        </button>
      </div>
    </article>
  );
}

function Applications({
  applications,
  busy,
  onReview,
}: {
  applications: FlowApplication[];
  busy: boolean;
  onReview: (
    app: FlowApplication,
    decision: "VERIFIED" | "REJECTED",
    reason: string,
  ) => void;
}) {
  const [query, setQuery] = useState("");
  const filtered = applications.filter(
    (app) =>
      fullName(app).toLowerCase().includes(query.toLowerCase()) ||
      app.identity.rut.includes(query),
  );
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 p-5">
        <div>
          <h2 className="font-black">Revisión de elegibilidad</h2>
          <p className="text-xs text-slate-500">
            Una declaración rechazada no cambia de etapa.
          </p>
        </div>
        <input
          className="control ml-auto max-w-xs"
          placeholder="Buscar por nombre o RUT"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      <div className="divide-y divide-slate-100">
        {filtered.map((app) => (
          <ApplicationRow
            key={app.applicationId}
            app={app}
            busy={busy}
            onReview={onReview}
          />
        ))}
        {!filtered.length && (
          <p className="p-10 text-center text-sm text-slate-500">
            No hay postulaciones que coincidan.
          </p>
        )}
      </div>
    </section>
  );
}
function ApplicationRow({
  app,
  busy,
  onReview,
}: {
  app: FlowApplication;
  busy: boolean;
  onReview: (
    app: FlowApplication,
    decision: "VERIFIED" | "REJECTED",
    reason: string,
  ) => void;
}) {
  const [reason, setReason] = useState("");
  return (
    <div className="grid gap-4 p-5 xl:grid-cols-[1.4fr_.8fr_1fr_auto] xl:items-center">
      <div>
        <p className="font-extrabold">{fullName(app)}</p>
        <p className="mt-1 text-xs text-slate-500">
          RUT {app.identity.rut} · Nacimiento{" "}
          {new Intl.DateTimeFormat("es-CL").format(
            new Date(`${app.identity.birthDate}T12:00:00`),
          )}
        </p>
      </div>
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
          Origen
        </p>
        <p className="mt-1 text-sm font-semibold">
          {waveNames[app.eligibilityCategory]}
        </p>
      </div>
      <span
        className={`w-fit rounded-full px-3 py-1 text-xs font-extrabold ${statusTone[app.eligibilityStatus] || statusTone.DRAFT}`}
      >
        {statusLabel[app.eligibilityStatus] || app.eligibilityStatus}
      </span>
      {app.eligibilityStatus === "PENDING" ? (
        <div className="flex flex-wrap gap-2 xl:justify-end">
          <input
            className="control max-w-44"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Motivo si rechaza"
            aria-label="Motivo del rechazo"
          />
          <button
            disabled={busy}
            className="secondary"
            onClick={() => onReview(app, "REJECTED", reason)}
          >
            Rechazar
          </button>
          <button
            disabled={busy}
            className="primary"
            onClick={() => onReview(app, "VERIFIED", reason)}
          >
            Verificar
          </button>
        </div>
      ) : (
        <span className="text-right text-xs text-slate-400">
          Revisión cerrada
        </span>
      )}
    </div>
  );
}

function DayCenter({
  processId,
  date,
  rooms,
  groups,
  applications,
  professionals,
  selected,
  busy,
  onSelect,
  onAction,
}: {
  processId: string;
  date: string;
  rooms: Room[];
  groups: EvaluationGroup[];
  applications: FlowApplication[];
  professionals: Professional[];
  selected: EvaluationGroup | null;
  busy: boolean;
  onSelect: (id: string) => void;
  onAction: (work: () => Promise<unknown>, success: string) => Promise<void>;
}) {
  const [roomId, setRoomId] = useState("");
  const [stage, setStage] = useState<EvaluationGroup["stage"]>("GROUP_3");
  const [time, setTime] = useState("09:00");
  const [code, setCode] = useState("");
  const [capacity, setCapacity] = useState(3);
  const [requiredEvaluators, setRequiredEvaluators] = useState(3);
  const roomColumns = useMemo(
    () =>
      rooms.map((room) => ({
        room,
        groups: groups.filter((group) => group.roomId === room.roomId),
      })),
    [rooms, groups],
  );
  return (
    <div className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_350px]">
      <section className="pk-panel min-w-0 overflow-hidden">
        <div className="flex flex-wrap items-end gap-3 border-b border-slate-200 p-5">
          <Field label="Sala">
            <select
              className="control"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
            >
              <option value="">Seleccionar</option>
              {rooms.map((room) => (
                <option key={room.roomId} value={room.roomId}>
                  {room.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Tipo de pauta">
            <select
              className="control"
              value={stage}
              onChange={(e) => {
                const next = e.target.value as EvaluationGroup["stage"];
                setStage(next);
                setCapacity(next === "GROUP_3" ? 3 : 9);
                setRequiredEvaluators(next === "GROUP_3" ? 3 : 6);
              }}
            >
              <option value="GROUP_3">Observación focal · base 3</option>
              <option value="GROUP_9">Interacción grupal · base 9</option>
            </select>
          </Field>
          <Field label="Máximo de niños">
            <input
              className="control w-24"
              type="number"
              min={1}
              max={30}
              value={capacity}
              onChange={(event) => setCapacity(Number(event.target.value))}
            />
          </Field>
          <Field label="Evaluadores requeridos">
            <input
              className="control w-24"
              type="number"
              min={1}
              max={12}
              value={requiredEvaluators}
              onChange={(event) =>
                setRequiredEvaluators(Number(event.target.value))
              }
            />
          </Field>
          <Field label="Hora">
            <input
              className="control"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </Field>
          <Field label="Código">
            <input
              className="control w-28"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="G3-01"
            />
          </Field>
          <button
            disabled={
              busy || !roomId || !code || capacity < 1 || requiredEvaluators < 1
            }
            className="primary"
            onClick={() =>
              onAction(
                () =>
                  prekinderApi.createGroup({
                    processId,
                    roomId,
                    stage,
                    code,
                    startsAt: new Date(`${date}T${time}:00`).toISOString(),
                    durationMinutes: 30,
                    capacity,
                    requiredEvaluators,
                  }),
                "Grupo creado sin conflictos.",
              )
            }
          >
            Crear grupo
          </button>
        </div>
        <div className="overflow-x-auto p-5">
          <div
            className="grid min-w-[700px] gap-4"
            style={{
              gridTemplateColumns: `repeat(${Math.max(rooms.length, 1)}, minmax(220px, 1fr))`,
            }}
          >
            {roomColumns.map(({ room, groups: roomGroups }) => (
              <div key={room.roomId}>
                <div className="mb-3 flex items-center gap-2 border-b border-azul-monte-tabor pb-3">
                  <DoorOpen size={18} className="text-azul-monte-tabor" />
                  <span className="font-black">{room.name}</span>
                  <span className="ml-auto text-xs text-slate-400">
                    cap. {room.capacity}
                  </span>
                </div>
                <div className="space-y-3">
                  {roomGroups.map((group) => (
                    <button
                      key={group.groupId}
                      onClick={() => onSelect(group.groupId)}
                      aria-pressed={selected?.groupId === group.groupId}
                      className={`w-full rounded-xl border p-4 text-left transition-[border-color,background-color,box-shadow] ${selected?.groupId === group.groupId ? "border-blue-700 bg-blue-50 shadow-[0_8px_20px_rgba(30,58,138,0.1)]" : "border-slate-200 bg-slate-50 hover:border-slate-400 hover:bg-white"}`}
                    >
                      <div className="flex justify-between gap-3">
                        <span className="font-black">
                          {formatTime(group.startsAt)}
                        </span>
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-black ${statusTone[group.status] || statusTone.DRAFT}`}
                        >
                          {statusLabel[group.status] || group.status}
                        </span>
                      </div>
                      <p className="mt-2 text-sm font-bold">
                        {group.code} ·{" "}
                        {group.stage === "GROUP_3"
                          ? "Observación focal"
                          : "Interacción grupal"}
                      </p>
                      <div className="mt-3 flex gap-4 text-xs text-slate-500">
                        <span>
                          {group.memberIds.length}/{group.capacity} niños
                        </span>
                        <span>
                          {group.evaluatorIds.length}/{group.requiredEvaluators}{" "}
                          profesionales
                        </span>
                      </div>
                    </button>
                  ))}
                  {!roomGroups.length && (
                    <div className="rounded-xl border border-dashed border-slate-300 p-7 text-center text-xs text-slate-400">
                      Sala disponible
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      <GroupInspector
        group={selected}
        date={date}
        rooms={rooms}
        applications={applications}
        professionals={professionals}
        busy={busy}
        onAction={onAction}
      />
    </div>
  );
}
function GroupInspector({
  group,
  date,
  rooms,
  applications,
  professionals,
  busy,
  onAction,
}: {
  group: EvaluationGroup | null;
  date: string;
  rooms: Room[];
  applications: FlowApplication[];
  professionals: Professional[];
  busy: boolean;
  onAction: (work: () => Promise<unknown>, success: string) => Promise<void>;
}) {
  const [applicationId, setApplicationId] = useState("");
  const [evaluatorId, setEvaluatorId] = useState("");
  const [nextRoom, setNextRoom] = useState("");
  const [nextTime, setNextTime] = useState("");
  const [reason, setReason] = useState("");
  const [limitCapacity, setLimitCapacity] = useState(3);
  const [limitEvaluators, setLimitEvaluators] = useState(3);
  const [configurationReason, setConfigurationReason] = useState("");
  useEffect(() => {
    setNextRoom(group?.roomId || "");
    setNextTime(group ? localInput(group.startsAt).slice(11, 16) : "");
    setReason("");
    setLimitCapacity(group?.capacity || 3);
    setLimitEvaluators(group?.requiredEvaluators || 3);
    setConfigurationReason("");
  }, [group?.groupId, group?.version]);
  if (!group)
    return (
      <aside className="pk-panel p-7">
        <CalendarDays className="text-slate-300" size={34} />
        <h2 className="mt-5 text-lg font-black">Inspector de grupo</h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Selecciona una tarjeta para completar integrantes, profesionales y
          confirmar el bloque.
        </p>
      </aside>
    );
  const availableApps = applications.filter(
    (app) => !group.memberIds.includes(app.applicationId),
  );
  const availablePeople = professionals.filter(
    (person) =>
      person.active &&
      person.roleGroup === "EVALUACION" &&
      !group.evaluatorIds.includes(person.professionalId),
  );
  return (
    <aside className="pk-panel p-6 shadow-[0_16px_36px_rgba(30,58,138,0.07)] 2xl:sticky 2xl:top-24 2xl:self-start">
      <h2 className="text-xl font-black">{group.code}</h2>
      <p className="mt-1 text-sm text-slate-500">
        {group.stage === "GROUP_3" ? "Primera instancia" : "Segunda instancia"} · {group.roomName} · {formatTime(group.startsAt)}–
        {formatTime(group.endsAt)}
      </p>
      <div className="mt-6 space-y-6">
        <div className="border-y border-slate-200 py-4">
          <p className="text-sm font-black">Configuración flexible</p>
          <p className="mt-1 text-xs leading-5 text-slate-600">
            La modalidad define la pauta; estos límites los decide
            administración.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Field label="Máximo de niños">
              <input
                className="control w-full"
                type="number"
                min={Math.max(1, group.memberIds.length)}
                max={30}
                value={limitCapacity}
                onChange={(event) =>
                  setLimitCapacity(Number(event.target.value))
                }
              />
            </Field>
            <Field label="Evaluadores requeridos">
              <input
                className="control w-full"
                type="number"
                min={Math.max(1, group.evaluatorIds.length)}
                max={12}
                value={limitEvaluators}
                onChange={(event) =>
                  setLimitEvaluators(Number(event.target.value))
                }
              />
            </Field>
          </div>
          <input
            className="control mt-2 w-full"
            value={configurationReason}
            onChange={(event) => setConfigurationReason(event.target.value)}
            placeholder="Motivo si el bloque ya comenzó"
          />
          <button
            className="secondary mt-2 w-full"
            disabled={busy || ["COMPLETED", "CANCELLED"].includes(group.status)}
            onClick={() =>
              onAction(
                () =>
                  prekinderApi.configureGroup(group.groupId, {
                    capacity: limitCapacity,
                    requiredEvaluators: limitEvaluators,
                    reason: configurationReason,
                    expectedVersion: group.version,
                  }),
                "Configuración del grupo actualizada.",
              )
            }
          >
            Guardar límites
          </button>
        </div>
        <div>
          <div className="mb-2 flex justify-between text-sm font-bold">
            <span>Postulantes</span>
            <span>
              {group.memberIds.length}/{group.capacity}
            </span>
          </div>
          <select
            className="control w-full"
            value={applicationId}
            onChange={(e) => setApplicationId(e.target.value)}
          >
            <option value="">Seleccionar postulante</option>
            {availableApps.map((app) => (
              <option key={app.applicationId} value={app.applicationId}>
                {fullName(app)}
              </option>
            ))}
          </select>
          <button
            className="secondary mt-2 w-full"
            disabled={
              busy ||
              !applicationId ||
              ["COMPLETED", "CANCELLED"].includes(group.status) ||
              group.memberIds.length >= group.capacity
            }
            onClick={() =>
              onAction(
                () => prekinderApi.addMember(group.groupId, applicationId),
                "Postulante asignado.",
              )
            }
          >
            Asignar postulante
          </button>
        </div>
        <div>
          <div className="mb-2 flex justify-between text-sm font-bold">
            <span>Profesionales</span>
            <span>
              {group.evaluatorIds.length}/{group.requiredEvaluators}
            </span>
          </div>
          <select
            className="control w-full"
            value={evaluatorId}
            onChange={(e) => setEvaluatorId(e.target.value)}
          >
            <option value="">Seleccionar profesional</option>
            {availablePeople.map((person) => (
              <option key={person.professionalId} value={person.professionalId}>
                {person.displayName} · {person.specialty}
              </option>
            ))}
          </select>
          <button
            className="secondary mt-2 w-full"
            disabled={
              busy ||
              !evaluatorId ||
              ["COMPLETED", "CANCELLED"].includes(group.status) ||
              group.evaluatorIds.length >= group.requiredEvaluators
            }
            onClick={() =>
              onAction(
                () => prekinderApi.assignEvaluator(group.groupId, evaluatorId),
                "Profesional asignado.",
              )
            }
          >
            Asignar profesional
          </button>
        </div>
        <div className="border-t border-slate-100 pt-5">
          <p className="mb-3 text-sm font-black">Reasignar sala u hora</p>
          <div className="grid grid-cols-2 gap-2">
            <select
              className="control"
              value={nextRoom}
              onChange={(event) => setNextRoom(event.target.value)}
            >
              {rooms.map((room) => (
                <option key={room.roomId} value={room.roomId}>
                  {room.name}
                </option>
              ))}
            </select>
            <input
              className="control"
              type="time"
              value={nextTime}
              onChange={(event) => setNextTime(event.target.value)}
            />
          </div>
          <input
            className="control mt-2 w-full"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Motivo si el bloque ya comenzó"
          />
          <button
            className="secondary mt-2 w-full"
            disabled={busy || !nextRoom || !nextTime}
            onClick={() =>
              onAction(
                () =>
                  prekinderApi.rescheduleGroup(group.groupId, {
                    roomId: nextRoom,
                    startsAt: new Date(`${date}T${nextTime}:00`).toISOString(),
                    durationMinutes: Math.round(
                      (new Date(group.endsAt).getTime() -
                        new Date(group.startsAt).getTime()) /
                        60_000,
                    ),
                    reason,
                    expectedVersion: group.version,
                  }),
                "Grupo reasignado y notificaciones encoladas.",
              )
            }
          >
            Validar y reasignar
          </button>
        </div>
        <button
          className="primary w-full"
          disabled={
            busy ||
            group.status !== "DRAFT" ||
            !group.memberIds.length ||
            group.evaluatorIds.length !== group.requiredEvaluators
          }
          onClick={() =>
            onAction(
              () => prekinderApi.confirmGroup(group.groupId, group.version),
              "Grupo confirmado e informes creados.",
            )
          }
        >
          Confirmar grupo
        </button>
        <p className="text-xs leading-5 text-slate-600">
          Antes de confirmar revisaremos automáticamente la disponibilidad de
          la sala, profesionales y postulantes.
        </p>
      </div>
    </aside>
  );
}

const professionalGroupLabels: Record<ProfessionalRoleGroup | "PENDING", string> = {
  ADMINISTRACION: "Administración",
  OPERACION: "Operación de jornadas",
  EVALUACION: "Evaluación especializada",
  DECISION_CONTROL: "Decisión y control",
  PENDING: "Pendientes de homologación",
};

const professionalInstrumentLabels: Record<string, string> = {
  ACADEMIC: "Evaluación académica",
  PSYCHOMOTOR: "Evaluación psicomotriz",
  PSYCHOLOGY: "Evaluación psicológica",
  ENTRY_INDICATORS: "Indicadores de ingreso",
  GROUP_OBSERVATION: "Observación grupal",
  LEARNING_SUPPORT: "Apoyo al aprendizaje",
  DAP: "DAP",
};

function Professionals({ processId, professionals, roles, busy, onSave }: {
  processId: string;
  professionals: Professional[];
  roles: ProfessionalRoleDefinition[];
  busy: boolean;
  onSave: (input: Partial<Professional> & {
    processId: string;
    displayName: string;
    email: string;
    roleCode: ProfessionalRoleCode;
    expectedVersion: number;
  }) => Promise<boolean>;
}) {
  const [editing, setEditing] = useState<Professional | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [group, setGroup] = useState<ProfessionalRoleGroup | "">("");
  const [roleCode, setRoleCode] = useState<ProfessionalRoleCode | "">("");
  const availableRoles = roles.filter((role) => role.groupCode === group);
  const groupedPeople = [...professionalGroupOrder, "PENDING" as const].map((groupCode) => ({
    groupCode,
    people: professionals.filter((person) => person.roleGroup === groupCode),
  })).filter((section) => section.people.length > 0);

  function clearForm() {
    setEditing(null);
    setName("");
    setEmail("");
    setSpecialty("");
    setGroup("");
    setRoleCode("");
  }

  function edit(person: Professional) {
    setEditing(person);
    setName(person.displayName);
    setEmail(person.email);
    setSpecialty(person.specialty || "");
    const definition = roles.find((role) => role.roleCode === person.roleCode);
    setGroup(definition?.groupCode || "");
    setRoleCode(definition?.roleCode || "");
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">
      <form
        className="h-fit rounded-2xl border border-slate-200 bg-white p-6 xl:sticky xl:top-24"
        onSubmit={async (event) => {
          event.preventDefault();
          if (!roleCode || !processId) return;
          const saved = await onSave({
            processId,
            professionalId: editing?.professionalId,
            legacyUserId: editing?.legacyUserId,
            displayName: name.trim(),
            email: email.trim(),
            specialty: specialty.trim(),
            roleCode,
            active: editing?.active ?? true,
            expectedVersion: editing?.version ?? 0,
          });
          if (saved) clearForm();
        }}
      >
        <h2 className="text-lg font-black">{editing ? "Homologar profesional" : "Nuevo profesional"}</h2>
        <p className="mt-1 text-sm leading-5 text-slate-600">
          El área y el rol determinan las acciones e instrumentos disponibles dentro del proceso.
        </p>
        <div className="mt-5 space-y-4">
          <Field label="Nombre completo">
            <input required className="control w-full" value={name} onChange={(event) => setName(event.target.value)} />
          </Field>
          <Field label="Correo institucional">
            <input required type="email" className="control w-full" value={email} onChange={(event) => setEmail(event.target.value)} />
          </Field>
          <Field label="Área dentro del flujo">
            <select
              required
              className="control w-full"
              value={group}
              onChange={(event) => {
                setGroup(event.target.value as ProfessionalRoleGroup);
                setRoleCode("");
              }}
            >
              <option value="">Seleccionar área</option>
              {professionalGroupOrder.map((code) => <option key={code} value={code}>{professionalGroupLabels[code]}</option>)}
            </select>
          </Field>
          <Field label="Rol u ocupación">
            <select
              required
              disabled={!group}
              className="control w-full disabled:cursor-not-allowed disabled:bg-slate-100"
              value={roleCode}
              onChange={(event) => setRoleCode(event.target.value as ProfessionalRoleCode)}
            >
              <option value="">Seleccionar rol</option>
              {availableRoles.map((role) => <option key={role.roleCode} value={role.roleCode}>{role.label}</option>)}
            </select>
          </Field>
          {roleCode && roles.find((role) => role.roleCode === roleCode)?.instrumentCode && (
            <p className="rounded-lg bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-900">
              Instrumento habilitado: {professionalInstrumentLabels[roles.find((role) => role.roleCode === roleCode)?.instrumentCode || ""]}
            </p>
          )}
          <Field label="Título o profesión (opcional)">
            <input className="control w-full" value={specialty} onChange={(event) => setSpecialty(event.target.value)} placeholder="Ej. Educadora de párvulos" />
          </Field>
          <button disabled={busy || !processId || !roleCode} className="primary w-full">
            {editing ? "Guardar homologación" : "Crear perfil profesional"}
          </button>
          {editing && <button type="button" className="secondary w-full" onClick={clearForm}>Cancelar edición</button>}
        </div>
      </form>

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-black text-slate-950">Equipo Prekínder</h2>
          <p className="mt-1 text-sm text-slate-600">{professionals.length} profesionales organizados por función dentro del flujo.</p>
        </div>
        {!professionals.length && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-600">
            Aún no hay profesionales registrados para organizar.
          </div>
        )}
        {groupedPeople.map(({ groupCode, people }) => (
          <div key={groupCode} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <h3 className="font-black">{professionalGroupLabels[groupCode]}</h3>
              <span className="text-xs font-bold text-slate-500">{people.length}</span>
            </div>
            <div className="divide-y divide-slate-100">
              {people.map((person) => (
                <div key={person.professionalId} className="flex min-h-24 flex-wrap items-center gap-4 px-5 py-4 sm:flex-nowrap">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-blue-50 font-black text-blue-900">
                    {person.displayName.split(" ").map((part) => part[0]).slice(0, 2).join("")}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-bold">{person.displayName}</span>
                    <span className="mt-0.5 block text-xs font-semibold text-blue-800">{person.roleLabel}</span>
                    <span className="mt-1 block truncate text-xs text-slate-500">{person.specialty || "Sin título informado"} · {person.email}</span>
                  </span>
                  <div className="ml-14 flex items-center gap-2 sm:ml-0">
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${person.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-700"}`}>
                      {person.active ? "Activo" : "Inactivo"}
                    </span>
                    <button type="button" className="secondary px-3 py-2 text-xs" onClick={() => edit(person)}>
                      {person.roleGroup === "PENDING" ? "Homologar" : "Editar"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}

const professionalGroupOrder: ProfessionalRoleGroup[] = [
  "ADMINISTRACION",
  "OPERACION",
  "EVALUACION",
  "DECISION_CONTROL",
];

function Rubrics() {
  const data = [
    {
      name: "Observación focal",
      base: "Base sugerida: 3 postulantes · 3 profesionales",
      count: 6,
      items:
        "Comunicación · Lenguaje · Adaptación/regulación · Psicomotricidad · Seguimiento de instrucciones · Autonomía",
    },
    {
      name: "Interacción grupal",
      base: "Base sugerida: 9 postulantes · 6 profesionales",
      count: 6,
      items:
        "Interacción con pares · Participación · Cooperación · Regulación · Transiciones · Comunicación grupal",
    },
  ];
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {data.map((rubric) => (
        <article
          key={rubric.name}
          className="rounded-2xl border border-slate-200 bg-white p-7"
        >
          <div className="flex justify-between">
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-extrabold text-emerald-800">
              Publicada · v1
            </span>
            <span className="text-xs font-bold text-slate-400">Inmutable</span>
          </div>
          <h2 className="mt-5 text-2xl font-black">{rubric.name}</h2>
          <p className="mt-1 text-xs font-bold text-blue-800">{rubric.base}</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {rubric.items}
          </p>
          <div className="mt-6 border-t border-slate-100 pt-5 text-sm">
            <strong>{rubric.count} criterios</strong>
            <span className="ml-2 text-slate-500">
              Escala observable 0–3 + No observado
            </span>
          </div>
        </article>
      ))}
    </div>
  );
}

function Decisions({
  processId,
  applications,
  busy,
  onAction,
}: {
  processId: string;
  applications: FlowApplication[];
  busy: boolean;
  onAction: (work: () => Promise<unknown>, success: string) => Promise<void>;
}) {
  const [scheduledAt, setScheduledAt] = useState("");
  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-end gap-3">
          <div className="mr-auto">
            <h2 className="font-black">Publicación programada</h2>
            <p className="mt-1 text-xs text-slate-500">
              El lote captura sólo decisiones completas. El portal será la
              fuente oficial.
            </p>
          </div>
          <Field label="Fecha y hora">
            <input
              className="control"
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
            />
          </Field>
          <button
            className="primary"
            disabled={busy || !scheduledAt}
            onClick={() =>
              onAction(
                () =>
                  prekinderApi.schedulePublication(
                    processId,
                    new Date(scheduledAt).toISOString(),
                  ),
                "Lote de publicación programado.",
              )
            }
          >
            Programar lote
          </button>
        </div>
      </section>
      <section className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {applications.map((app) => (
          <DecisionRow
            key={app.applicationId}
            app={app}
            busy={busy}
            onAction={onAction}
          />
        ))}
      </section>
    </div>
  );
}
function DecisionRow({
  app,
  busy,
  onAction,
}: {
  app: FlowApplication;
  busy: boolean;
  onAction: (work: () => Promise<unknown>, success: string) => Promise<void>;
}) {
  const [decision, setDecision] = useState<
    "ACCEPTED" | "REJECTED" | "WAITLIST"
  >("WAITLIST");
  const [note, setNote] = useState("");
  return (
    <div className="grid gap-3 p-5 lg:grid-cols-[1fr_180px_1fr_auto] lg:items-center">
      <div>
        <p className="font-bold">{fullName(app)}</p>
        <p className="text-xs text-slate-500">
          {waveNames[app.eligibilityCategory]}
        </p>
      </div>
      <select
        className="control"
        value={decision}
        onChange={(e) => setDecision(e.target.value as typeof decision)}
      >
        <option value="ACCEPTED">Aceptado</option>
        <option value="WAITLIST">Lista de espera</option>
        <option value="REJECTED">Rechazado</option>
      </select>
      <input
        className="control"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Observación interna"
      />
      <button
        className="primary"
        disabled={busy}
        onClick={() =>
          onAction(
            () => prekinderApi.decide(app.applicationId, decision, note),
            "Decisión guardada.",
          )
        }
      >
        Guardar
      </button>
    </div>
  );
}

function AuditNotice() {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-8">
      <ShieldCheck size={36} className="text-azul-monte-tabor" />
      <h2 className="mt-5 text-xl font-black">Historial protegido y activo</h2>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
        Cada cambio de configuración, revisión, asignación, informe, extensión,
        decisión y publicación conserva responsable, fecha y motivo. Los datos
        personales y documentos no se incluyen en los registros técnicos.
      </p>
    </section>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-xs font-extrabold text-slate-600">
      {label}
      <span className="mt-1 block">{children}</span>
    </label>
  );
}
