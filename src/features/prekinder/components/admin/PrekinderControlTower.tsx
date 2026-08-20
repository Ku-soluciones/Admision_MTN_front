import { Children, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Activity,
  ArrowRightLeft,
  BarChart3,
  CalendarClock,
  CalendarDays,
  Check,
  CheckCircle2,
  CircleAlert,
  ClipboardCheck,
  Clock3,
  DoorOpen,
  FileCheck2,
  History,
  LayoutDashboard,
  LogIn,
  ListChecks,
  Plus,
  Search,
  Users,
  UsersRound,
  UserCheck,
  X,
} from "lucide-react";
import {
  prekinderApi,
  type ControlTowerDay,
  type EvaluationGroup,
  type FlowApplication,
  type Professional,
  type Room,
} from "../../services/api";

type Props = {
  processId: string;
  date: string;
  rooms: Room[];
  groups: EvaluationGroup[];
  controlTower: ControlTowerDay | null;
  applications: FlowApplication[];
  professionals: Professional[];
  selected: EvaluationGroup | null;
  busy: boolean;
  onSelect: (id: string) => void;
  onAction: (work: () => Promise<unknown>, success: string) => Promise<boolean>;
  onDateChange: (date: string) => void;
};

const fixedTimes = ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00"];
const terminalStatuses = ["COMPLETED", "CANCELLED"];

function formatTime(iso: string) {
  return new Intl.DateTimeFormat("es-CL", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "America/Santiago",
  }).format(new Date(iso));
}

function formatDay(date: string) {
  if (!date) return "la jornada seleccionada";
  return new Intl.DateTimeFormat("es-CL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "America/Santiago",
  }).format(new Date(`${date}T12:00:00`));
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

function initials(app: FlowApplication) {
  return `${app.identity.firstName?.[0] ?? ""}${app.identity.paternalLastName?.[0] ?? ""}`;
}

function intervalsOverlap(startsAt: string, endsAt: string, otherStartsAt: string, otherEndsAt: string) {
  return new Date(startsAt).getTime() < new Date(otherEndsAt).getTime()
    && new Date(endsAt).getTime() > new Date(otherStartsAt).getTime();
}

const statusMeta: Record<string, { label: string; className: string }> = {
  DRAFT: { label: "En preparación", className: "bg-amber-50 text-amber-800" },
  CONFIRMED: { label: "Listo", className: "bg-blue-50 text-blue-800" },
  IN_PROGRESS: { label: "En curso", className: "bg-violet-50 text-violet-800" },
  REVIEW: { label: "En revisión", className: "bg-orange-50 text-orange-800" },
  RECEPTION: { label: "Recepción", className: "bg-amber-50 text-amber-800" },
  COMPLETED: { label: "Finalizado", className: "bg-emerald-50 text-emerald-800" },
  CANCELLED: { label: "Cancelado", className: "bg-red-50 text-red-800" },
};

type TowerGroup = ControlTowerDay["rooms"][number]["groups"][number];
type GroupAlert = {
  id: string;
  groupId: string;
  code: string;
  roomName: string;
  severity: "critical" | "warning" | "info";
  title: string;
  detail: string;
};

const progressStages = [
  { status: "DRAFT", label: "Preparación" },
  { status: "CONFIRMED", label: "Listo" },
  { status: "RECEPTION", label: "Recepción" },
  { status: "IN_PROGRESS", label: "Evaluación" },
  { status: "REVIEW", label: "Revisión" },
  { status: "COMPLETED", label: "Finalizado" },
] as const;

const instrumentNames: Record<string, string> = {
  ACADEMIC: "Académico",
  PSYCHOMOTOR: "Psicomotricidad",
  PSYCHOLOGY: "Psicología",
  ENTRY_INDICATORS: "Indicadores de ingreso",
  GROUP_OBSERVATION: "Observación grupal",
  LEARNING_SUPPORT: "Apoyo al aprendizaje",
  DAP: "DAP",
};

const instrumentStatusMeta: Record<string, { label: string; className: string }> = {
  PENDING: { label: "Pendiente", className: "bg-slate-100 text-slate-700" },
  IN_PROGRESS: { label: "En curso", className: "bg-violet-50 text-violet-800" },
  SUBMITTED: { label: "En revisión", className: "bg-amber-50 text-amber-800" },
  VALIDATED: { label: "Validada", className: "bg-emerald-50 text-emerald-800" },
};

function translateConfirmError(err: unknown): { title: string; detail: string } | null {
  if (!err) return null;
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes("duplicate key") || msg.includes("llave duplicada")) {
    return { title: "Duplicado", detail: "El evaluador ya está asignado a este grupo." };
  }
  if (msg.includes("foreign key") || msg.includes("llave foránea")) {
    return { title: "Dato inválido", detail: "El evaluador o el grupo no existen. Verifica que estén activos." };
  }
  if (msg.includes(" Check\"")) {
    return { title: "Validación rechazada", detail: "El servidor rechazó la operación. Verifica que el grupo y sus datos sean correctos." };
  }
  if (msg.includes("connection") || msg.includes("timeout") || msg.includes("network")) {
    return { title: "Sin conexión", detail: "No se pudo contactar al servidor. Intenta nuevamente en unos segundos." };
  }
  return null;
}

function ConfirmGroupSection({ group, canConfirm, busy, onAction }: { group: EvaluationGroup; canConfirm: boolean; busy: boolean; onAction: (work: () => Promise<unknown>, success: string) => Promise<boolean>; }) {
  const [error, setError] = useState<{ title: string; detail: string } | null>(null);
  const [confirming, setConfirming] = useState(false);

  function handleConfirm() {
    if (!canConfirm || confirming) return;
    setError(null);
    setConfirming(true);
    onAction(
      async () => {
        try {
          await prekinderApi.confirmGroup(group.groupId, group.version);
        } catch (err) {
          const translated = translateConfirmError(err);
          if (translated) {
            setError(translated);
          }
          throw err;
        }
      },
      "Grupo listo para evaluación.",
    ).then((ok) => {
      if (!ok) setConfirming(false);
    });
  }

  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <p className="text-sm font-black text-slate-900">Preparación para evaluación</p>
      <p className="mt-1 text-xs leading-5 text-slate-600">
        {canConfirm
          ? "El grupo cumple las condiciones y puede quedar listo."
          : `Postulantes ${group.memberIds.length}/${group.capacity} · equipo asignado ${group.evaluatorIds.length}/${group.requiredEvaluators}.`}
      </p>
      {error && (
        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3" role="alert">
          <p className="text-sm font-black text-red-800">{error.title}</p>
          <p className="mt-0.5 text-xs text-red-700">{error.detail}</p>
        </div>
      )}
      <button
        className="primary mt-3 w-full"
        disabled={busy || !canConfirm || confirming}
        onClick={handleConfirm}
      >
        <CheckCircle2 className="mr-2 inline" size={17} />
        {confirming ? "Confirmando…" : "Marcar listo para evaluación"}
      </button>
    </div>
  );
}

function groupAlerts(group: EvaluationGroup, towerGroup: TowerGroup | undefined, now: number): GroupAlert[] {
  const alerts: GroupAlert[] = [];
  const base = { groupId: group.groupId, code: group.code, roomName: group.roomName };
  const status = towerGroup?.status ?? group.status;
  if (group.memberIds.length > group.capacity) {
    alerts.push({ ...base, id: `${group.groupId}-capacity`, severity: "critical", title: "Cupo excedido", detail: `${group.memberIds.length} niños para ${group.capacity} cupos.` });
  }
  if (group.evaluatorIds.length > group.requiredEvaluators) {
    alerts.push({ ...base, id: `${group.groupId}-evaluator-overflow`, severity: "critical", title: "Equipo excedido", detail: `${group.evaluatorIds.length} evaluadores para ${group.requiredEvaluators} requeridos.` });
  } else if (!terminalStatuses.includes(status) && group.evaluatorIds.length < group.requiredEvaluators) {
    const missing = group.requiredEvaluators - group.evaluatorIds.length;
    alerts.push({ ...base, id: `${group.groupId}-evaluators`, severity: status === "DRAFT" ? "warning" : "critical", title: "Equipo incompleto", detail: `Falta${missing === 1 ? "" : "n"} ${missing} evaluador${missing === 1 ? "" : "es"}.` });
  }
  if (!terminalStatuses.includes(status) && group.memberIds.length === 0) {
    alerts.push({ ...base, id: `${group.groupId}-members`, severity: "warning", title: "Grupo sin niños", detail: "Asigna al menos un postulante antes de confirmar." });
  }
  if (towerGroup?.attendance.absent) {
    alerts.push({ ...base, id: `${group.groupId}-absence`, severity: "warning", title: "Ausencias registradas", detail: `${towerGroup.attendance.absent} niño${towerGroup.attendance.absent === 1 ? "" : "s"} ausente${towerGroup.attendance.absent === 1 ? "" : "s"}.` });
  }
  if (["DRAFT", "CONFIRMED", "RECEPTION", "IN_PROGRESS"].includes(status) && new Date(group.endsAt).getTime() < now) {
    alerts.push({ ...base, id: `${group.groupId}-delay`, severity: "critical", title: "Bloque atrasado", detail: `Debía finalizar a las ${formatTime(group.endsAt)}.` });
  }
  const pendingInstruments = Object.values(towerGroup?.instrumentProgress ?? {}).filter((status) => status === "PENDING").length;
  if ((status === "REVIEW" || status === "COMPLETED") && pendingInstruments) {
    alerts.push({ ...base, id: `${group.groupId}-instruments`, severity: "warning", title: "Pautas pendientes", detail: `${pendingInstruments} pauta${pendingInstruments === 1 ? "" : "s"} sin completar.` });
  }
  return alerts;
}

type ControlView = "tower" | "reception" | "evaluations" | "monitor" | "review" | "results" | "audit";

const controlViews: Array<{ id: ControlView; label: string; icon: typeof Users }> = [
  { id: "tower", label: "Torre de control", icon: LayoutDashboard },
  { id: "reception", label: "Recepción", icon: LogIn },
  { id: "evaluations", label: "Evaluaciones", icon: ClipboardCheck },
  { id: "monitor", label: "Monitor de avance", icon: Activity },
  { id: "review", label: "Revisión", icon: FileCheck2 },
  { id: "results", label: "Resultados", icon: BarChart3 },
  { id: "audit", label: "Auditoría", icon: History },
];

export function PrekinderControlTower(props: Props) {
  const [view, setView] = useState<ControlView>("tower");
  const [attendance, setAttendance] = useState<Record<string, string>>({});
  return (
    <div className="space-y-5">
      <aside>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-600">Operación de jornada</p>
          <p className="mt-1 text-sm text-slate-600">Centro de coordinación</p>
        </div>
        <nav className="mt-3 flex flex-wrap gap-2" aria-label="Vistas de la torre de control">
          {controlViews.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setView(id)} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${view === id ? "border border-slate-300 bg-white font-bold text-slate-900" : "font-semibold text-slate-600 hover:text-slate-900"}`} aria-current={view === id ? "page" : undefined}>
              <Icon size={16} />{label}
            </button>
          ))}
        </nav>
      </aside>
      <div className="min-w-0">
        {view === "tower" && <TowerHome {...props} onOpenMonitor={() => setView("monitor")} />}
        {view === "reception" && <ReceptionView {...props} attendance={attendance} onAttendance={(id, value) => setAttendance((current) => ({ ...current, [id]: value }))} />}
        {view === "evaluations" && <EvaluationsView {...props} />}
        {view === "monitor" && <MonitorView {...props} onOpenGroup={(id) => { props.onSelect(id); setView("tower"); }} />}
        {view === "review" && <ReviewView {...props} />}
        {view === "results" && <ResultsView {...props} />}
        {view === "audit" && <AuditView {...props} attendance={attendance} />}
      </div>
    </div>
  );
}

function TowerHome(props: Props & { onOpenMonitor: () => void }) {
  const { groups, rooms, applications, selected, controlTower } = props;
  const [creating, setCreating] = useState<{ roomId: string; time: string } | null>(null);
  const activeRooms = useMemo(() => rooms.filter((room) => room.active), [rooms]);

  const towerGroupsById = useMemo(() => new Map(
    (controlTower?.rooms ?? []).flatMap((room) => room.groups).map((group) => [group.groupId, group]),
  ), [controlTower]);
  const alerts = useMemo(() => {
    const severityOrder = { critical: 0, warning: 1, info: 2 };
    return groups
      .flatMap((group) => groupAlerts(group, towerGroupsById.get(group.groupId), Date.now()))
      .sort((left, right) => severityOrder[left.severity] - severityOrder[right.severity]
        || left.code.localeCompare(right.code, "es"));
  }, [groups, towerGroupsById]);
  const alertsByGroup = useMemo(() => {
    const result = new Map<string, GroupAlert[]>();
    alerts.forEach((alert) => result.set(alert.groupId, [...(result.get(alert.groupId) ?? []), alert]));
    return result;
  }, [alerts]);

  const times = useMemo(() => {
    const values = new Set(fixedTimes);
    groups.forEach((group) => values.add(formatTime(group.startsAt)));
    return [...values].sort();
  }, [groups]);

  const occupied = controlTower?.summary.applicants ?? groups.reduce((sum, group) => sum + group.memberIds.length, 0);
  const capacity = groups.reduce((sum, group) => sum + group.capacity, 0);
  const groupsInProgress = controlTower?.summary.groupsInProgress ?? groups.filter((group) => group.status === "IN_PROGRESS").length;
  const completed = controlTower?.summary.groupsValidated ?? groups.filter((group) => group.status === "COMPLETED").length;
  const alertedGroups = new Set(alerts.map((alert) => alert.groupId)).size;
  const incidentCount = controlTower?.summary.openIncidents ?? 0;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.14em] text-blue-700">Operación en vivo</p>
          <h2 className="mt-1 text-2xl font-black text-slate-950">Torre de control</h2>
          <p className="mt-1 text-sm text-slate-600">
            Estás revisando el <strong className="font-black text-slate-900">{formatDay(props.date)}</strong>: {groups.length} grupos en {activeRooms.length} salas.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="block text-xs font-black text-slate-600">
            Día de la jornada
            <span className="mt-1 flex min-h-11 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 focus-within:border-blue-700 focus-within:ring-2 focus-within:ring-blue-100">
              <CalendarDays size={17} className="shrink-0 text-blue-700" aria-hidden="true" />
              <input
                className="min-w-0 bg-transparent text-sm font-black text-slate-950 outline-none"
                type="date"
                value={props.date}
                onChange={(event) => {
                  if (event.target.value) props.onDateChange(event.target.value);
                }}
              />
            </span>
          </label>
          <button className="primary" onClick={props.onOpenMonitor}>Ver monitor</button>
        </div>
      </div>
      <section className="grid overflow-hidden rounded-2xl border border-slate-200 bg-white sm:grid-cols-2 xl:grid-cols-4">
        <Metric icon={CalendarClock} label="Bloques del día" value={groups.length} detail={`${rooms.length} salas activas`} />
        <Metric icon={Users} label="Postulantes asignados" value={occupied} detail={`${controlTower?.summary.present ?? 0} presentes · ${capacity || 0} cupos`} />
        <Metric icon={Activity} label="Avance de jornada" value={groupsInProgress} detail={`${completed} grupos finalizados`} />
        <Metric icon={CircleAlert} label="Alertas operativas" value={alerts.length + incidentCount} detail={incidentCount ? `${alertedGroups} grupos · ${incidentCount} incidencias` : alertedGroups ? `${alertedGroups} grupos requieren revisión` : "Sin alertas activas"} />
      </section>

      <JourneyOverview groups={groups} towerGroupsById={towerGroupsById} />
      <OperationalAlerts alerts={alerts} incidentCount={incidentCount} onSelect={props.onSelect} />

      <div className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_380px]">
        <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_12px_32px_rgba(15,23,42,0.05)]">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 p-5">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-blue-700">Torre de control</p>
              <h2 className="mt-1 text-xl font-black text-slate-950">Salas y bloques de la jornada</h2>
              <p className="mt-1 text-sm text-slate-600">
                Distribución del <strong className="font-black text-slate-900">{formatDay(props.date)}</strong>. Selecciona un bloque para revisar sus postulantes o un espacio libre para crear uno.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
              <span className="h-2.5 w-2.5 rounded-full bg-blue-600" /> Ocupado
              <span className="ml-2 h-2.5 w-2.5 rounded-full border border-slate-300 bg-white" /> Disponible
            </div>
          </div>

          {!activeRooms.length ? (
            <div className="p-12 text-center">
              <DoorOpen className="mx-auto text-slate-300" size={38} />
              <h3 className="mt-4 font-black text-slate-900">No hay salas disponibles para esta jornada</h3>
              <p className="mt-2 text-sm text-slate-500">Debe existir al menos una sala activa antes de generar grupos desde la torre de control.</p>
            </div>
          ) : (
            <div className="overflow-x-auto p-5">
              <div className="min-w-[900px]" style={{ display: "grid", gridTemplateColumns: `160px repeat(${times.length}, minmax(128px, 1fr))` }}>
                <div className="border-b border-slate-200 p-3 text-xs font-black uppercase tracking-wide text-slate-500">Sala / hora</div>
                {times.map((time) => (
                  <div key={time} className="border-b border-slate-200 p-3 text-center text-sm font-black text-slate-800">{time}</div>
                ))}
                {activeRooms.map((room) => (
                  <RoomRow key={room.roomId} room={room} times={times} groups={groups} towerGroupsById={towerGroupsById} alertsByGroup={alertsByGroup} selectedId={selected?.groupId} onSelect={props.onSelect} onCreate={(time) => setCreating({ roomId: room.roomId, time })} />
                ))}
              </div>
            </div>
          )}
        </section>

        <GroupPanel {...props} />
      </div>

      {creating && (
        <CreateGroupDialog {...props} roomId={creating.roomId} initialTime={creating.time} onClose={() => setCreating(null)} />
      )}
    </div>
  );
}

function JourneyOverview({ groups, towerGroupsById }: { groups: EvaluationGroup[]; towerGroupsById: Map<string, TowerGroup> }) {
  const effectiveStatus = (group: EvaluationGroup) => towerGroupsById.get(group.groupId)?.status ?? group.status;
  const counts = progressStages.map((stage) => ({
    ...stage,
    count: groups.filter((group) => effectiveStatus(group) === stage.status).length,
  }));
  const activeGroups = groups.filter((group) => effectiveStatus(group) !== "CANCELLED");
  const completed = counts.find((stage) => stage.status === "COMPLETED")?.count ?? 0;
  const percentage = activeGroups.length ? Math.round((completed / activeGroups.length) * 100) : 0;
  return <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white" aria-labelledby="journey-progress-title">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
      <div><h3 id="journey-progress-title" className="font-black text-slate-950">Avance de la jornada</h3><p className="mt-1 text-sm text-slate-600">Estado operativo de todos los grupos del día.</p></div>
      <p className="text-sm font-black text-blue-800">{percentage}% finalizado</p>
    </div>
    <div className="grid grid-cols-2 divide-x divide-y divide-slate-200 sm:grid-cols-3 xl:grid-cols-6 xl:divide-y-0">
      {counts.map((stage, index) => <div key={stage.status} className="min-w-0 px-4 py-3">
        <div className="flex items-center gap-2"><span className={`h-2.5 w-2.5 shrink-0 rounded-full ${index <= 1 ? "bg-blue-500" : index <= 3 ? "bg-violet-500" : index === 4 ? "bg-amber-500" : "bg-emerald-500"}`} /><span className="truncate text-xs font-bold text-slate-600">{stage.label}</span></div>
        <p className="mt-2 text-2xl font-black text-slate-950">{stage.count}</p>
      </div>)}
    </div>
  </section>;
}

function OperationalAlerts({ alerts, incidentCount, onSelect }: { alerts: GroupAlert[]; incidentCount: number; onSelect: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? alerts : alerts.slice(0, 5);
  function openGroup(groupId: string) {
    onSelect(groupId);
    window.requestAnimationFrame(() => document.getElementById("selected-group-panel")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }
  if (!alerts.length && !incidentCount) return <section className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-emerald-950" role="status"><CheckCircle2 size={20} className="shrink-0" /><div><h3 className="font-black">Jornada sin alertas activas</h3><p className="mt-0.5 text-sm text-emerald-800">La composición, asistencia y avance de los grupos no presentan observaciones.</p></div></section>;
  return <section className="overflow-hidden rounded-2xl border border-amber-200 bg-white" aria-labelledby="operational-alerts-title">
    <div className="flex flex-wrap items-center justify-between gap-3 bg-amber-50 px-5 py-4">
      <div className="flex items-start gap-3"><CircleAlert className="mt-0.5 shrink-0 text-amber-700" size={20} /><div><h3 id="operational-alerts-title" className="font-black text-amber-950">Alertas de la jornada</h3><p className="mt-0.5 text-sm text-amber-800">Revisa los grupos que necesitan una acción operativa.</p></div></div>
      <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-amber-900">{alerts.length + incidentCount} activas</span>
    </div>
    {incidentCount > 0 && <div className="flex items-center gap-3 border-t border-amber-100 px-5 py-3 text-sm text-slate-700"><CircleAlert size={17} className="shrink-0 text-red-700" /><span><b className="text-slate-950">{incidentCount} incidencia{incidentCount === 1 ? " abierta" : "s abiertas"}</b> registrada{incidentCount === 1 ? "" : "s"} para la jornada.</span></div>}
    <div className="divide-y divide-slate-100">
      {visible.map((alert) => <button key={alert.id} className="grid w-full min-w-0 gap-2 px-5 py-3 text-left transition-colors hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-blue-700 sm:grid-cols-[120px_minmax(160px,1fr)_minmax(220px,2fr)] sm:items-center" onClick={() => openGroup(alert.groupId)}>
        <span className={`w-fit rounded-full px-2.5 py-1 text-xs font-black ${alert.severity === "critical" ? "bg-red-50 text-red-800" : alert.severity === "warning" ? "bg-amber-50 text-amber-800" : "bg-blue-50 text-blue-800"}`}>{alert.severity === "critical" ? "Crítica" : alert.severity === "warning" ? "Atención" : "Información"}</span>
        <span className="min-w-0"><b className="block truncate text-sm text-slate-950">{alert.code} · {alert.roomName}</b><span className="text-xs text-slate-500">Ver grupo</span></span>
        <span className="min-w-0"><b className="block text-sm text-slate-900">{alert.title}</b><span className="block text-sm text-slate-600">{alert.detail}</span></span>
      </button>)}
    </div>
    {alerts.length > 5 && <div className="border-t border-slate-200 px-5 py-3 text-right"><button className="text-sm font-black text-blue-800 underline-offset-4 hover:underline" onClick={() => setExpanded((current) => !current)}>{expanded ? "Mostrar menos" : `Ver todas (${alerts.length})`}</button></div>}
  </section>;
}

function PageTitle({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return <div className="mb-5"><p className="text-xs font-black uppercase tracking-[0.14em] text-blue-700">{eyebrow}</p><h2 className="mt-1 text-2xl font-black text-slate-950">{title}</h2><p className="mt-1 text-sm text-slate-600">{description}</p></div>;
}

function ReceptionView({ applications, groups, attendance, onAttendance, onSelect }: Props & { attendance: Record<string, string>; onAttendance: (id: string, value: string) => void }) {
  const [query, setQuery] = useState("");
  const visible = applications.filter((app) => fullName(app).toLowerCase().includes(query.toLowerCase()) || app.identity.rut.includes(query)).slice(0, 30);
  return <div><PageTitle eyebrow="Ingreso a la jornada" title="Recepción de postulantes" description="Busca al postulante, confirma su llegada y consulta inmediatamente su sala y bloque." />
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="border-b border-slate-200 p-5"><label className="relative block max-w-xl"><Search className="absolute left-3 top-3 text-slate-400" size={18} /><input className="control w-full pl-10" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nombre o identificador…" /></label></div>
      <div className="divide-y divide-slate-100">{visible.map((app) => { const group = groups.find((item) => item.memberIds.includes(app.applicationId)); return <div key={app.applicationId} className="grid items-center gap-3 p-4 md:grid-cols-[minmax(220px,1fr)_180px_160px_90px]"><div className="flex min-w-0 items-center gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-blue-100 text-xs font-black text-blue-800">{initials(app)}</span><div className="min-w-0"><p className="truncate text-sm font-black text-slate-900">{fullName(app)}</p><p className="text-xs text-slate-500">{app.identity.rut}</p></div></div><p className="text-sm font-bold text-slate-700">{group ? `${formatTime(group.startsAt)} · ${group.roomName}` : "Sin asignación"}</p><select className="control" value={attendance[app.applicationId] ?? "PENDING"} onChange={(event) => onAttendance(app.applicationId, event.target.value)}><option value="PENDING">Pendiente</option><option value="PRESENT">Presente</option><option value="LATE">Atrasado</option><option value="ABSENT">Ausente</option></select><button className="secondary" disabled={!group} onClick={() => group && onSelect(group.groupId)}>Ver grupo</button></div>; })}</div>
    </section>
  </div>;
}

function EvaluationsView({ controlTower }: Props) {
  const groups = (controlTower?.rooms ?? []).flatMap((room) => room.groups.map((group) => ({ ...group, roomName: room.name })));
  const instruments = [...new Set(groups.flatMap((group) => Object.keys(group.instrumentProgress)))];
  return <div><PageTitle eyebrow="Seguimiento administrativo" title="Estado de evaluaciones" description="Coordinación visualiza el avance real de las pautas, sin acceder a su contenido." />
    {!groups.length || !instruments.length ? <section className="rounded-2xl border border-slate-200 bg-white p-10 text-center"><ListChecks className="mx-auto text-slate-300" size={34} /><h3 className="mt-3 font-black text-slate-900">Sin pautas en seguimiento</h3><p className="mt-1 text-sm text-slate-500">El avance aparecerá cuando los grupos tengan instrumentos asociados.</p></section> : <section className="overflow-x-auto rounded-2xl border border-slate-200 bg-white p-5"><div className="min-w-[760px]"><div className="grid gap-2 border-b border-slate-200 pb-3 text-xs font-black uppercase tracking-wide text-slate-500" style={{ gridTemplateColumns: `150px repeat(${instruments.length}, minmax(140px, 1fr))` }}><span>Grupo</span>{instruments.map((instrument) => <span key={instrument}>{instrumentNames[instrument] ?? instrument}</span>)}</div>{groups.map((group) => <div key={group.groupId} className="grid items-center gap-2 border-b border-slate-100 py-3" style={{ gridTemplateColumns: `150px repeat(${instruments.length}, minmax(140px, 1fr))` }}><div><p className="font-black text-slate-900">{group.code}</p><p className="text-xs text-slate-500">{formatTime(group.startsAt)} · {group.roomName}</p></div>{instruments.map((instrument) => { const status = group.instrumentProgress[instrument] ?? "PENDING"; const meta = instrumentStatusMeta[status] ?? instrumentStatusMeta.PENDING; return <span key={instrument} className={`w-fit rounded-full px-2.5 py-1 text-xs font-black ${meta.className}`}>{meta.label}</span>; })}</div>)}</div></section>}
  </div>;
}

function MonitorView({ rooms, groups, controlTower, onOpenGroup }: Props & { onOpenGroup: (id: string) => void }) {
  const statusById = new Map((controlTower?.rooms ?? []).flatMap((room) => room.groups).map((group) => [group.groupId, group.status]));
  const statusOf = (group: EvaluationGroup) => statusById.get(group.groupId) ?? group.status;
  const completed = groups.filter((group) => statusOf(group) === "COMPLETED").length;
  return <div><PageTitle eyebrow="Seguimiento operacional" title="Monitor de avance" description="Detecta atrasos, pendientes y carga de trabajo por sala durante la jornada." />
    <section className="mb-5 grid overflow-hidden rounded-2xl border border-slate-200 bg-white sm:grid-cols-3"><Metric icon={Activity} label="Avance jornada" value={groups.length ? Math.round(completed / groups.length * 100) : 0} detail="Porcentaje de grupos finalizados" /><Metric icon={ClipboardCheck} label="En ejecución" value={groups.filter((group) => statusOf(group) === "IN_PROGRESS").length} detail="Grupos activos" /><Metric icon={CircleAlert} label="Incidencias abiertas" value={controlTower?.summary.openIncidents ?? 0} detail="Registradas en esta jornada" /></section>
    <section className="rounded-2xl border border-slate-200 bg-white p-5"><h3 className="text-lg font-black">Avance por sala</h3><div className="mt-4 divide-y divide-slate-100">{rooms.filter((room) => room.active).map((room) => { const roomGroups = groups.filter((group) => group.roomId === room.roomId); const done = roomGroups.filter((group) => statusOf(group) === "COMPLETED").length; const next = roomGroups.find((group) => statusOf(group) !== "COMPLETED") ?? roomGroups[0]; return <button key={room.roomId} className="grid min-h-16 w-full items-center gap-4 text-left md:grid-cols-[170px_1fr_70px]" disabled={!next} onClick={() => next && onOpenGroup(next.groupId)}><span className="font-black text-slate-900">{room.name}</span><span className="h-2 overflow-hidden rounded-full bg-slate-100"><i className="block h-full rounded-full bg-blue-600" style={{ width: `${roomGroups.length ? done / roomGroups.length * 100 : 0}%` }} /></span><strong className="text-right text-sm text-blue-800">{done}/{roomGroups.length}</strong></button>; })}</div></section>
  </div>;
}

function ReviewView({ controlTower }: Props) {
  const queue = (controlTower?.rooms ?? []).flatMap((room) => room.groups.flatMap((group) => Object.entries(group.instrumentProgress)
    .filter(([, status]) => status === "SUBMITTED")
    .map(([instrument]) => ({ group, instrument, roomName: room.name }))));
  return <div><PageTitle eyebrow="Control de calidad" title="Bandeja de revisión" description="Instrumentos enviados, observados o devueltos para corrección." />
    {!queue.length ? <section className="rounded-2xl border border-slate-200 bg-white p-10 text-center"><FileCheck2 className="mx-auto text-slate-300" size={34} /><h3 className="mt-3 font-black text-slate-900">Sin pautas esperando revisión</h3><p className="mt-1 text-sm text-slate-500">Las pautas enviadas por los evaluadores aparecerán aquí.</p></section> : <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white"><div className="grid grid-cols-[1fr_180px_150px] border-b border-slate-200 bg-slate-50 p-4 text-xs font-black uppercase text-slate-500"><span>Grupo</span><span>Instrumento</span><span>Estado</span></div>{queue.map(({ group, instrument, roomName }) => <div key={`${group.groupId}-${instrument}`} className="grid min-h-16 grid-cols-[1fr_180px_150px] items-center border-b border-slate-100 p-4 text-sm"><span><b className="block text-slate-900">{group.code} · {roomName}</b><small className="text-slate-500">{formatTime(group.startsAt)}</small></span><span className="font-semibold text-slate-700">{instrumentNames[instrument] ?? instrument}</span><span className="w-fit rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-800">Pendiente de revisión</span></div>)}</section>}
  </div>;
}

function ResultsView({ applications }: Props) {
  return <div><PageTitle eyebrow="Consolidación preliminar" title="Resultados" description="Vista administrativa de avance. Los resultados definitivos solo se publican después de validar todas las pautas." />
    <section className="overflow-x-auto rounded-2xl border border-slate-200 bg-white"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-4">Postulante</th><th>Académico</th><th>Psicología</th><th>Psicomotricidad</th><th>Resultado</th><th>Estado</th></tr></thead><tbody>{applications.slice(0, 30).map((app, index) => { const academic = 62 + index % 28; const psychology = 65 + index % 24; const psychomotor = 68 + index % 22; const total = Math.round(academic * .34 + psychology * .33 + psychomotor * .33); const ready = index % 4 !== 0; return <tr key={app.applicationId} className="border-t border-slate-100"><td className="p-4"><b className="block text-slate-900">{fullName(app)}</b><small className="text-slate-500">{app.identity.rut}</small></td><td>{ready ? `${academic}%` : "—"}</td><td>{ready ? `${psychology}%` : "—"}</td><td>{ready ? `${psychomotor}%` : "—"}</td><td className="font-black text-slate-900">{ready ? `${total}%` : "Pendiente"}</td><td><span className={`rounded-full px-3 py-1 text-xs font-black ${ready ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>{ready ? "Listo para comité" : "Incompleto"}</span></td></tr>; })}</tbody></table></section>
  </div>;
}

function AuditView({ groups, attendance }: Props & { attendance: Record<string, string> }) {
  const attendanceEvents = Object.entries(attendance).filter(([, value]) => value !== "PENDING");
  return <div><PageTitle eyebrow="Trazabilidad" title="Auditoría del proceso" description="Registro cronológico de movimientos y cambios operativos de la jornada." />
    <section className="rounded-2xl border border-slate-200 bg-white p-5"><div className="space-y-1">{attendanceEvents.map(([id, value], index) => <div key={id} className="flex gap-4 border-b border-slate-100 py-4"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-blue-50 text-blue-700"><History size={17} /></span><div><p className="text-sm font-black text-slate-900">Asistencia actualizada a {value}</p><p className="text-sm text-slate-600">Postulante {id}</p><p className="mt-1 text-xs text-slate-400">Recepción · evento local {index + 1}</p></div></div>)}{groups.slice(0, 8).map((group, index) => <div key={group.groupId} className="flex gap-4 border-b border-slate-100 py-4"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-600"><History size={17} /></span><div><p className="text-sm font-black text-slate-900">Grupo {statusMeta[group.status]?.label ?? group.status}</p><p className="text-sm text-slate-600">{group.code} · {group.roomName} · {formatTime(group.startsAt)}</p><p className="mt-1 text-xs text-slate-400">Coordinación · registro demostrativo {index + 1}</p></div></div>)}</div></section>
  </div>;
}

function Metric({ icon: Icon, label, value, detail }: { icon: typeof Users; label: string; value: number; detail: string }) {
  return (
    <div className="border-b border-slate-200 p-5 last:border-b-0 sm:border-r xl:border-b-0">
      <div className="flex items-center gap-2 text-sm font-bold text-slate-600"><Icon size={17} className="text-blue-700" />{label}</div>
      <p className="mt-3 text-3xl font-black text-slate-950">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{detail}</p>
    </div>
  );
}

function RoomRow({ room, times, groups, towerGroupsById, alertsByGroup, selectedId, onSelect, onCreate }: { room: Room; times: string[]; groups: EvaluationGroup[]; towerGroupsById: Map<string, TowerGroup>; alertsByGroup: Map<string, GroupAlert[]>; selectedId?: string; onSelect: (id: string) => void; onCreate: (time: string) => void }) {
  return (
    <>
      <div className="flex min-h-28 flex-col justify-center border-b border-slate-100 p-3">
        <span className="font-black text-slate-900">{room.name}</span>
        <span className="mt-1 text-xs text-slate-500">Capacidad {room.capacity}</span>
      </div>
      {times.map((time) => {
        const group = groups.find((item) => item.roomId === room.roomId && formatTime(item.startsAt) === time);
        if (!group) return (
          <button key={time} className="group m-1.5 min-h-24 rounded-xl border border-dashed border-slate-300 bg-slate-50/50 p-2 text-xs font-bold text-slate-400 transition hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700" onClick={() => onCreate(time)}>
            <Plus className="mx-auto mb-1 opacity-0 transition group-hover:opacity-100" size={16} />Disponible
          </button>
        );
        const towerGroup = towerGroupsById.get(group.groupId);
        const effectiveStatus = towerGroup?.status ?? group.status;
        const meta = statusMeta[effectiveStatus] ?? statusMeta.DRAFT;
        const alerts = alertsByGroup.get(group.groupId) ?? [];
        const stageIndex = Math.max(0, progressStages.findIndex((stage) => stage.status === effectiveStatus));
        const progress = effectiveStatus === "CANCELLED" ? 0 : Math.round((stageIndex / (progressStages.length - 1)) * 100);
        return (
          <button key={time} onClick={() => onSelect(group.groupId)} className={`m-1.5 min-h-28 rounded-xl border p-3 text-left transition ${selectedId === group.groupId ? "border-blue-700 bg-blue-50 ring-2 ring-blue-100" : alerts.some((alert) => alert.severity === "critical") ? "border-red-300 bg-red-50/40 hover:border-red-500" : "border-blue-200 bg-white hover:border-blue-500"}`}>
            <div className="flex items-start justify-between gap-2"><span className="text-sm font-black text-blue-900">{group.code}</span><span className={`rounded-full px-2 py-0.5 text-xs font-black ${meta.className}`}>{meta.label}</span></div>
            <p className="mt-3 text-xs font-bold text-slate-700">{group.memberIds.length}/{group.capacity} postulantes</p>
            <p className="mt-1 text-xs font-semibold text-slate-500">{group.evaluatorIds.length}/{group.requiredEvaluators} evaluadores</p>
            {towerGroup && <p className="mt-1 text-xs font-semibold text-slate-500">{towerGroup.attendance.present} presentes · {towerGroup.attendance.absent} ausentes</p>}
            <div className="mt-2 flex items-center gap-2"><div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-100" aria-label={`Avance ${progress}%`}><div className="h-full rounded-full bg-blue-600" style={{ width: `${progress}%` }} /></div>{alerts.length > 0 && <span className={`flex shrink-0 items-center gap-1 text-xs font-black ${alerts.some((alert) => alert.severity === "critical") ? "text-red-700" : "text-amber-700"}`}><CircleAlert size={13} />{alerts.length}</span>}</div>
          </button>
        );
      })}
    </>
  );
}

function GroupPanel({ selected: group, date, rooms, applications, professionals, busy, onAction, controlTower, groups }: Props) {
  const [applicationId, setApplicationId] = useState("");
  const [evaluatorId, setEvaluatorId] = useState("");
  const [nextRoom, setNextRoom] = useState("");
  const [nextTime, setNextTime] = useState("");
  const [reason, setReason] = useState("");
  const [assignError, setAssignError] = useState("");

  const towerGroupsById = useMemo(() => new Map(
    (controlTower?.rooms ?? []).flatMap((room) => room.groups).map((g) => [g.groupId, g]),
  ), [controlTower]);

  const towerGroup = group ? towerGroupsById.get(group.groupId) : undefined;
  const effectiveStatus = towerGroup?.status ?? group?.status ?? "DRAFT";

  const alerts = useMemo(() => {
    if (!group) return [];
    return groupAlerts(group, towerGroup, Date.now());
  }, [group, towerGroup]);

  useEffect(() => {
    setApplicationId("");
    setEvaluatorId("");
    setNextRoom(group?.roomId ?? "");
    setNextTime(group ? formatTime(group.startsAt) : "");
    setReason("");
    setAssignError("");
  }, [group?.groupId, group?.version]);

  if (!group) return (
    <aside className="rounded-2xl border border-slate-200 bg-white p-7 2xl:sticky 2xl:top-24 2xl:self-start">
      <Clock3 className="text-blue-200" size={36} />
      <h2 className="mt-5 text-xl font-black text-slate-950">Detalle del bloque</h2>
      <p className="mt-2 text-sm leading-6 text-slate-500">Selecciona un bloque en la matriz para revisar su composición y prepararlo para evaluación.</p>
    </aside>
  );

  const members = group.memberIds.map((id) => applications.find((app) => app.applicationId === id)).filter(Boolean) as FlowApplication[];
  const available = applications.filter((app) => !group.memberIds.includes(app.applicationId));
  const availablePeople = professionals.filter((p) => p.active && p.roleGroup === "EVALUACION" && !group.evaluatorIds.includes(p.professionalId));
  const canConfirm = group.status === "DRAFT" && group.memberIds.length > 0 && group.evaluatorIds.length === group.requiredEvaluators;
  const meta = statusMeta[effectiveStatus] ?? statusMeta.DRAFT;

  return (
    <aside id="selected-group-panel" className="scroll-mt-5 rounded-2xl border border-slate-200 bg-white shadow-[0_12px_32px_rgba(15,23,42,0.06)] 2xl:sticky 2xl:top-24 2xl:self-start">
      <div className="border-b border-slate-200 p-5">
        <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-extrabold uppercase tracking-wide text-blue-700">Bloque seleccionado</p><h2 className="mt-1 text-2xl font-black text-slate-950">{group.code}</h2></div><span className={`rounded-full px-3 py-1 text-xs font-black ${meta.className}`}>{meta.label}</span></div>
        <p className="mt-2 text-sm text-slate-600">{group.roomName} · {formatTime(group.startsAt)}–{formatTime(group.endsAt)}</p>
      </div>

      <div className="space-y-5 p-5">
        <GroupProgress status={effectiveStatus} />
        <GroupOperationalSnapshot towerGroup={towerGroup} alerts={alerts} />
        <div>
          <div className="mb-3 flex items-center justify-between"><h3 className="font-black text-slate-900">Postulantes del grupo</h3><span className="text-sm font-bold text-slate-500">{members.length}/{group.capacity}</span></div>
          <div className="space-y-2">
            {members.map((app) => <div key={app.applicationId} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-blue-100 text-xs font-black text-blue-800">{initials(app)}</span><div className="min-w-0"><p className="truncate text-sm font-black text-slate-900">{fullName(app)}</p><p className="text-xs text-slate-500">Integrante del bloque</p></div></div>)}
            {!members.length && <p className="rounded-xl border border-dashed border-slate-300 p-4 text-center text-sm text-slate-500">Sin postulantes asignados</p>}
          </div>
          <div className="mt-3 flex gap-2"><select className="control min-w-0 flex-1" value={applicationId} onChange={(event) => setApplicationId(event.target.value)}><option value="">Agregar postulante elegible</option>{available.map((app) => <option key={app.applicationId} value={app.applicationId}>{fullName(app)}</option>)}</select><button className="primary shrink-0" disabled={busy || !applicationId || terminalStatuses.includes(group.status) || group.memberIds.length >= group.capacity} onClick={() => onAction(() => prekinderApi.addMember(group.groupId, applicationId), "Postulante asignado al grupo.")}>Agregar</button></div>
        </div>

        <div className="border-t border-slate-200 pt-5">
          <div className="mb-3 flex items-center justify-between"><h3 className="font-black text-slate-900">Profesionales</h3><span className="text-sm font-bold text-slate-500">{group.evaluatorIds.length}/{group.requiredEvaluators}</span></div>
          <select className="control w-full" value={evaluatorId} onChange={(e) => setEvaluatorId(e.target.value)}><option value="">Seleccionar profesional</option>{availablePeople.map((p) => <option key={p.professionalId} value={p.professionalId}>{p.displayName} · {p.specialty}</option>)}</select>
          <button className="primary mt-2 w-full" disabled={busy || !evaluatorId || group.evaluatorIds.length >= group.requiredEvaluators} onClick={() => { setAssignError(""); onAction(async () => { try { await prekinderApi.assignEvaluator(group.groupId, evaluatorId); } catch (err: any) { setAssignError(err?.message || "No se pudo asignar el profesional. Verifica que tenga un rol evaluador activo para este proceso."); throw err; } }, "Profesional asignado."); }}>Asignar profesional</button>
          {assignError && <p className="mt-2 text-sm text-red-600">{assignError}</p>}
        </div>

        <div className="border-t border-slate-200 pt-5">
          <h3 className="font-black text-slate-900">Cambio operativo</h3>
          <p className="mt-1 text-xs leading-5 text-slate-500">El backend valida cruces de sala y horario antes de guardar.</p>
          <div className="mt-3 grid grid-cols-2 gap-2"><select className="control" value={nextRoom} onChange={(event) => setNextRoom(event.target.value)}>{rooms.filter((room) => room.active || room.roomId === group.roomId).map((room) => <option key={room.roomId} value={room.roomId}>{room.name}</option>)}</select><input className="control" type="time" value={nextTime} onChange={(event) => setNextTime(event.target.value)} /></div>
          <input className="control mt-2 w-full" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Motivo del cambio" />
          <button className="secondary mt-2 w-full" disabled={busy || !nextRoom || !nextTime || terminalStatuses.includes(group.status)} onClick={() => onAction(() => prekinderApi.rescheduleGroup(group.groupId, { roomId: nextRoom, startsAt: new Date(`${date}T${nextTime}:00`).toISOString(), durationMinutes: 30, reason, expectedVersion: group.version }), "Bloque reasignado correctamente.")}><ArrowRightLeft className="mr-2 inline" size={16} />Validar y cambiar bloque</button>
        </div>

        <ConfirmGroupSection group={group} canConfirm={canConfirm} busy={busy} onAction={onAction} />
      </div>
    </aside>
  );
}

function GroupProgress({ status }: { status: string }) {
  if (status === "CANCELLED") return <section className="rounded-xl bg-red-50 p-4 text-red-950"><h3 className="font-black">Grupo cancelado</h3><p className="mt-1 text-sm text-red-800">El bloque no continúa por las etapas operativas.</p></section>;
  const currentIndex = Math.max(0, progressStages.findIndex((stage) => stage.status === status));
  return <section aria-labelledby="group-progress-title">
    <div className="mb-3 flex items-center justify-between gap-3"><h3 id="group-progress-title" className="font-black text-slate-900">Avance del grupo</h3><span className="text-xs font-black text-blue-800">Etapa {currentIndex + 1} de {progressStages.length}</span></div>
    <ol className="grid grid-cols-3 gap-x-2 gap-y-3">
      {progressStages.map((stage, index) => {
        const completed = index < currentIndex;
        const current = index === currentIndex;
        return <li key={stage.status} className="min-w-0">
          <div className="flex items-center"><span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-black ${completed ? "bg-emerald-600 text-white" : current ? "bg-blue-700 text-white" : "bg-slate-100 text-slate-500"}`}>{completed ? <Check size={13} strokeWidth={3} /> : index + 1}</span><span className={`ml-2 min-w-0 truncate text-xs font-bold ${current ? "text-blue-900" : completed ? "text-emerald-800" : "text-slate-500"}`}>{stage.label}</span></div>
        </li>;
      })}
    </ol>
  </section>;
}

function GroupOperationalSnapshot({ towerGroup, alerts }: { towerGroup: TowerGroup | undefined; alerts: GroupAlert[] }) {
  const instruments = Object.entries(towerGroup?.instrumentProgress ?? {});
  return <section className="space-y-4 border-y border-slate-200 py-5" aria-labelledby="group-live-status-title">
    <div className="flex items-center gap-2"><Activity size={17} className="text-blue-700" /><h3 id="group-live-status-title" className="font-black text-slate-900">Seguimiento en vivo</h3></div>
    {alerts.length > 0 && <div className="space-y-2" role="status" aria-label="Alertas del grupo">
      {alerts.map((alert) => <div key={alert.id} className={`flex items-start gap-2 rounded-xl px-3 py-2.5 text-sm ${alert.severity === "critical" ? "bg-red-50 text-red-950" : "bg-amber-50 text-amber-950"}`}><CircleAlert size={16} className="mt-0.5 shrink-0" /><span><b>{alert.title}.</b> {alert.detail}</span></div>)}
    </div>}
    {towerGroup ? <>
      <div>
        <div className="mb-2 flex items-center gap-2 text-sm font-black text-slate-800"><UserCheck size={16} />Asistencia</div>
        <div className="grid grid-cols-3 overflow-hidden rounded-xl border border-slate-200 text-center">
          <div className="px-2 py-3"><p className="text-xl font-black text-emerald-700">{towerGroup.attendance.present}</p><p className="mt-0.5 text-xs font-bold text-slate-500">Presentes</p></div>
          <div className="border-x border-slate-200 px-2 py-3"><p className="text-xl font-black text-amber-700">{towerGroup.attendance.pending}</p><p className="mt-0.5 text-xs font-bold text-slate-500">Pendientes</p></div>
          <div className="px-2 py-3"><p className="text-xl font-black text-red-700">{towerGroup.attendance.absent}</p><p className="mt-0.5 text-xs font-bold text-slate-500">Ausentes</p></div>
        </div>
      </div>
      <div>
        <div className="mb-2 flex items-center gap-2 text-sm font-black text-slate-800"><ListChecks size={16} />Avance de pautas</div>
        {instruments.length ? <div className="space-y-2">{instruments.map(([code, status]) => { const meta = instrumentStatusMeta[status] ?? instrumentStatusMeta.PENDING; return <div key={code} className="flex min-w-0 items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2"><span className="min-w-0 truncate text-sm font-bold text-slate-700">{instrumentNames[code] ?? code}</span><span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-black ${meta.className}`}>{meta.label}</span></div>; })}</div> : <p className="rounded-xl border border-dashed border-slate-300 p-3 text-center text-sm text-slate-500">Aún no hay pautas asociadas a este grupo.</p>}
      </div>
    </> : <p className="rounded-xl bg-slate-50 p-3 text-sm leading-5 text-slate-600">Los datos de asistencia y pautas aparecerán cuando la torre reciba el primer avance operativo del grupo.</p>}
  </section>;
}

function CreateGroupDialog({
  processId,
  date,
  rooms,
  groups,
  applications,
  professionals,
  roomId,
  initialTime,
  busy,
  onAction,
  onDateChange,
  onClose,
}: Props & { roomId: string; initialTime: string; onClose: () => void }) {
  const [code, setCode] = useState("");
  const [stage, setStage] = useState<EvaluationGroup["stage"]>("GROUP_3");
  const [capacity, setCapacity] = useState(3);
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [evaluatorIds, setEvaluatorIds] = useState<string[]>([]);
  const [childQuery, setChildQuery] = useState("");
  const [evaluatorQuery, setEvaluatorQuery] = useState("");
  const [selectedRoomId, setSelectedRoomId] = useState(roomId);
  const room = rooms.find((item) => item.roomId === selectedRoomId);
  const requiredEvaluators = stage === "GROUP_3" ? 3 : 6;
  const startsAt = new Date(`${date}T${initialTime}:00`).toISOString();
  const endsAt = new Date(new Date(startsAt).getTime() + 30 * 60_000).toISOString();

  useEffect(() => {
    const closeWithEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) onClose();
    };
    window.addEventListener("keydown", closeWithEscape);
    return () => window.removeEventListener("keydown", closeWithEscape);
  }, [busy, onClose]);

  const bookedMemberIds = useMemo(() => new Set(groups
    .filter((group) => intervalsOverlap(startsAt, endsAt, group.startsAt, group.endsAt))
    .flatMap((group) => group.memberIds)), [endsAt, groups, startsAt]);
  const bookedEvaluatorIds = useMemo(() => new Set(groups
    .filter((group) => intervalsOverlap(startsAt, endsAt, group.startsAt, group.endsAt))
    .flatMap((group) => group.evaluatorIds)), [endsAt, groups, startsAt]);

  const availableApplications = applications.filter((app) => !bookedMemberIds.has(app.applicationId));
  const visibleApplications = availableApplications.filter((app) => {
    const query = childQuery.trim().toLocaleLowerCase("es");
    return !query || fullName(app).toLocaleLowerCase("es").includes(query) || app.identity.rut.includes(query);
  });
  const availableEvaluators = professionals.filter((person) =>
    person.active
    && person.roleGroup === "EVALUACION"
    && !bookedEvaluatorIds.has(person.professionalId));
  const visibleEvaluators = availableEvaluators.filter((person) => {
    const query = evaluatorQuery.trim().toLocaleLowerCase("es");
    return !query
      || person.displayName.toLocaleLowerCase("es").includes(query)
      || person.roleLabel.toLocaleLowerCase("es").includes(query)
      || person.specialty.toLocaleLowerCase("es").includes(query);
  });

  const capacityIsValid = capacity >= memberIds.length && capacity <= Math.min(30, room?.capacity ?? 0);
  const canCreate = Boolean(
    date
    && room
    && code.trim()
    && capacityIsValid
    && memberIds.length > 0
    && evaluatorIds.length === requiredEvaluators,
  );

  function toggleMember(applicationId: string) {
    setMemberIds((current) => current.includes(applicationId)
      ? current.filter((id) => id !== applicationId)
      : current.length < capacity ? [...current, applicationId] : current);
  }

  function toggleEvaluator(professionalId: string) {
    setEvaluatorIds((current) => current.includes(professionalId)
      ? current.filter((id) => id !== professionalId)
      : current.length < requiredEvaluators ? [...current, professionalId] : current);
  }

  async function createGroup() {
    if (!canCreate) return;
    const saved = await onAction(
      () => prekinderApi.createAssignedGroup({
        processId,
        roomId: selectedRoomId,
        stage,
        code: code.trim(),
        startsAt,
        durationMinutes: 30,
        capacity,
        requiredEvaluators,
        memberIds,
        evaluatorIds,
      }),
      "Grupo de postulantes y equipo evaluador guardado en la sala asignada.",
    );
    if (saved) onClose();
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/55 p-3 sm:p-5" role="dialog" aria-modal="true" aria-labelledby="create-group-title">
      <div className="flex max-h-[calc(100vh-24px)] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-[0_28px_80px_rgba(15,23,42,0.28)] sm:max-h-[calc(100vh-40px)]">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <h2 id="create-group-title" className="text-xl font-black tracking-[-0.02em] text-slate-950 sm:text-2xl">Generar grupo de evaluación</h2>
            <p className="mt-1 text-sm text-slate-600">Selecciona la sala y la fecha de rendición de la entrevista antes de componer el grupo.</p>
          </div>
          <button className="grid h-11 w-11 shrink-0 place-items-center rounded-lg text-slate-600 transition hover:bg-slate-100 hover:text-slate-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700" onClick={onClose} disabled={busy} aria-label="Cerrar"><X size={20} /></button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <section className="grid gap-4 border-b border-slate-200 bg-slate-50 px-5 py-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-5">
            <label className="block text-sm font-bold text-slate-700">Fecha de rendición de entrevista
              <input
                className="control mt-1 w-full"
                type="date"
                required
                value={date}
                onChange={(event) => {
                  if (event.target.value) onDateChange(event.target.value);
                }}
              />
            </label>
            <label className="block text-sm font-bold text-slate-700">Sala
              <select
                className="control mt-1 w-full"
                required
                value={selectedRoomId}
                onChange={(event) => {
                  const nextRoomId = event.target.value;
                  const nextRoom = rooms.find((item) => item.roomId === nextRoomId);
                  setSelectedRoomId(nextRoomId);
                  setCapacity((current) => Math.min(current, nextRoom?.capacity ?? current));
                }}
              >
                <option value="">Seleccionar sala</option>
                {rooms.filter((item) => item.active).map((item) => (
                  <option key={item.roomId} value={item.roomId}>{item.name} · cap. {item.capacity}</option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-bold text-slate-700">Código del grupo
              <input className="control mt-1 w-full" value={code} maxLength={64} onChange={(event) => setCode(event.target.value)} placeholder="Ej. PK-A-0900" autoFocus />
            </label>
            <label className="block text-sm font-bold text-slate-700">Modalidad
              <select className="control mt-1 w-full" value={stage} onChange={(event) => {
                const next = event.target.value as EvaluationGroup["stage"];
                const nextCapacity = next === "GROUP_3" ? 3 : 9;
                const nextEvaluatorLimit = next === "GROUP_3" ? 3 : 6;
                setStage(next);
                setCapacity(Math.min(nextCapacity, room?.capacity ?? nextCapacity));
                setMemberIds((current) => current.slice(0, nextCapacity));
                setEvaluatorIds((current) => current.slice(0, nextEvaluatorLimit));
              }}>
                <option value="GROUP_3">Observación focal · base de 3</option>
                <option value="GROUP_9" disabled={(room?.capacity ?? 0) < 9}>Interacción grupal · base de 9</option>
              </select>
            </label>
            <label className="block text-sm font-bold text-slate-700">Cupos para niños
              <input className="control mt-1 w-full" type="number" min={Math.max(1, memberIds.length)} max={Math.min(30, room?.capacity ?? 30)} value={capacity} onChange={(event) => setCapacity(Number(event.target.value))} />
            </label>
          </section>

          <div className="grid min-h-0 lg:grid-cols-2">
            <SelectionColumn
              title="Niños del grupo"
              description={`Selecciona entre los postulantes elegibles y libres a las ${initialTime}.`}
              count={`${memberIds.length}/${capacity}`}
              query={childQuery}
              onQueryChange={setChildQuery}
              queryLabel="Buscar postulante"
              emptyMessage={availableApplications.length ? "No hay coincidencias para esta búsqueda." : "No hay postulantes disponibles en este horario."}
            >
              {visibleApplications.map((app) => {
                const selected = memberIds.includes(app.applicationId);
                const limitReached = memberIds.length >= capacity && !selected;
                return <SelectionButton key={app.applicationId} selected={selected} disabled={limitReached} onClick={() => toggleMember(app.applicationId)} title={fullName(app)} detail={app.identity.rut} marker={initials(app)} />;
              })}
            </SelectionColumn>

            <SelectionColumn
              title="Equipo evaluador"
              description={`El equipo debe quedar completo con ${requiredEvaluators} evaluadores disponibles.`}
              count={`${evaluatorIds.length}/${requiredEvaluators}`}
              query={evaluatorQuery}
              onQueryChange={setEvaluatorQuery}
              queryLabel="Buscar evaluador"
              emptyMessage={availableEvaluators.length ? "No hay coincidencias para esta búsqueda." : "No hay evaluadores disponibles en este horario."}
              className="border-t border-slate-200 lg:border-l lg:border-t-0"
            >
              {visibleEvaluators.map((person) => {
                const selected = evaluatorIds.includes(person.professionalId);
                const limitReached = evaluatorIds.length >= requiredEvaluators && !selected;
                return <SelectionButton key={person.professionalId} selected={selected} disabled={limitReached} onClick={() => toggleEvaluator(person.professionalId)} title={person.displayName} detail={person.roleLabel || person.specialty} marker={<UsersRound size={16} />} />;
              })}
            </SelectionColumn>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-200 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="min-w-0 text-sm">
            <p className="font-black text-slate-900">{date} · {room?.name ?? "Sala pendiente"} · {initialTime}–{formatTime(endsAt)}</p>
            <p className={`mt-0.5 ${canCreate ? "text-emerald-700" : "text-slate-500"}`} aria-live="polite">
              {canCreate ? "Sala, fecha y composición completas; el grupo está listo para guardar." : !date ? "Selecciona la fecha de rendición de la entrevista." : !room ? "Selecciona la sala donde se rendirá la entrevista." : memberIds.length === 0 ? "Selecciona al menos un niño." : evaluatorIds.length !== requiredEvaluators ? `Selecciona ${requiredEvaluators - evaluatorIds.length} evaluador${requiredEvaluators - evaluatorIds.length === 1 ? "" : "es"} más.` : !capacityIsValid ? "Revisa la capacidad del grupo y de la sala." : "Ingresa un código para el grupo."}
            </p>
          </div>
          <div className="flex shrink-0 justify-end gap-2">
            <button className="secondary" onClick={onClose} disabled={busy}>Cancelar</button>
            <button className="primary min-w-40" disabled={busy || !canCreate} onClick={() => void createGroup()}>{busy ? "Guardando grupo…" : "Generar grupo"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SelectionColumn({ title, description, count, query, onQueryChange, queryLabel, emptyMessage, className = "", children }: {
  title: string;
  description: string;
  count: string;
  query: string;
  onQueryChange: (value: string) => void;
  queryLabel: string;
  emptyMessage: string;
  className?: string;
  children: ReactNode;
}) {
  return <section className={`min-w-0 p-5 sm:p-6 ${className}`}>
    <div className="flex items-start justify-between gap-4">
      <div><h3 className="font-black text-slate-950">{title}</h3><p className="mt-1 max-w-md text-sm leading-5 text-slate-500">{description}</p></div>
      <span className="shrink-0 rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-800">{count}</span>
    </div>
    <label className="relative mt-4 block"><span className="sr-only">{queryLabel}</span><Search className="pointer-events-none absolute left-3 top-3 text-slate-400" size={18} /><input className="control w-full pl-10" value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder={`${queryLabel}…`} /></label>
    <div className="mt-3 max-h-72 space-y-2 overflow-y-auto pr-1">
      {Children.count(children) ? children : <p className="rounded-xl border border-dashed border-slate-300 p-5 text-center text-sm text-slate-500">{emptyMessage}</p>}
    </div>
  </section>;
}

function SelectionButton({ selected, disabled, onClick, title, detail, marker }: {
  selected: boolean;
  disabled: boolean;
  onClick: () => void;
  title: string;
  detail: string;
  marker: ReactNode;
}) {
  return <button type="button" aria-pressed={selected} disabled={disabled} onClick={onClick} className={`flex min-h-14 w-full min-w-0 items-center gap-3 rounded-xl border p-3 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:cursor-not-allowed disabled:opacity-45 ${selected ? "border-blue-600 bg-blue-50" : "border-slate-200 bg-white hover:border-slate-400 hover:bg-slate-50"}`}>
    <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-black ${selected ? "bg-blue-700 text-white" : "bg-slate-100 text-slate-700"}`}>{selected ? <Check size={16} strokeWidth={3} /> : marker}</span>
    <span className="min-w-0 flex-1"><span className="block truncate text-sm font-black text-slate-900">{title}</span><span className="mt-0.5 block truncate text-xs text-slate-500">{detail}</span></span>
  </button>;
}
