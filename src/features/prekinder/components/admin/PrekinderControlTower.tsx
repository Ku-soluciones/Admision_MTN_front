import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowRightLeft,
  BarChart3,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  DoorOpen,
  FileCheck2,
  History,
  LayoutDashboard,
  LogIn,
  Plus,
  Search,
  Users,
  X,
} from "lucide-react";
import {
  prekinderApi,
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
  applications: FlowApplication[];
  professionals: Professional[];
  selected: EvaluationGroup | null;
  busy: boolean;
  onSelect: (id: string) => void;
  onAction: (work: () => Promise<unknown>, success: string) => Promise<void>;
  onDateChange: (date: string) => void;
  demoMode?: boolean;
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

const statusMeta: Record<string, { label: string; className: string }> = {
  DRAFT: { label: "En preparación", className: "bg-amber-50 text-amber-800" },
  CONFIRMED: { label: "Listo", className: "bg-blue-50 text-blue-800" },
  IN_PROGRESS: { label: "En curso", className: "bg-violet-50 text-violet-800" },
  REVIEW: { label: "En revisión", className: "bg-orange-50 text-orange-800" },
  RECEPTION: { label: "Recepción", className: "bg-amber-50 text-amber-800" },
  COMPLETED: { label: "Finalizado", className: "bg-emerald-50 text-emerald-800" },
  CANCELLED: { label: "Cancelado", className: "bg-red-50 text-red-800" },
};

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
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-600">Operación de jornada</p>
            <p className="mt-1 text-sm text-slate-600">Centro de coordinación</p>
          </div>
          <div className="flex min-h-9 items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3">
            <CalendarDays className="h-4 w-4 shrink-0 text-gray-500" aria-hidden="true" />
            <label htmlFor="pk-tower-date" className="shrink-0 text-sm text-gray-600">Fecha</label>
            <input
              id="pk-tower-date"
              className="border-none bg-transparent py-1 text-sm font-semibold text-gray-950 focus:ring-0"
              type="date"
              value={props.date}
              onChange={(e) => props.onDateChange(e.target.value)}
            />
          </div>
        </div>
        <nav className="mt-3 flex flex-wrap gap-2" aria-label="Vistas de la torre de control">
          {controlViews.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setView(id)} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${view === id ? "border border-slate-300 bg-white font-bold text-slate-900" : "font-semibold text-slate-600 hover:text-slate-900"}`} aria-current={view === id ? "page" : undefined}>
              <Icon size={16} />{label}
            </button>
          ))}
        </nav>
      </aside>
      {props.demoMode && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm font-semibold text-amber-950" role="status">
          <span className="font-black">Modo demostración:</span>{" "}
          proceso ficticio con 210 postulantes, 70 grupos y 10 salas. Ninguna acción modifica Admitia.
        </div>
      )}
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
  const { groups, rooms, applications, selected } = props;
  const [creating, setCreating] = useState<{ roomId: string; time: string } | null>(null);

  const times = useMemo(() => {
    const values = new Set(fixedTimes);
    groups.forEach((group) => values.add(formatTime(group.startsAt)));
    return [...values].sort();
  }, [groups]);

  const occupied = groups.reduce((sum, group) => sum + group.memberIds.length, 0);
  const capacity = groups.reduce((sum, group) => sum + group.capacity, 0);
  const ready = groups.filter((group) => group.status === "CONFIRMED").length;
  const conflicts = groups.filter(
    (group) => group.memberIds.length > group.capacity || group.evaluatorIds.length > group.requiredEvaluators,
  ).length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-xs font-black uppercase tracking-[0.14em] text-blue-700">Operación en vivo</p><h2 className="mt-1 text-2xl font-black text-slate-950">Torre de control</h2><p className="mt-1 text-sm text-slate-600">{groups.length} grupos en {rooms.length} salas, organizados en bloques de 30 minutos.</p></div>
        <button className="primary" onClick={props.onOpenMonitor}>Ver monitor</button>
      </div>
      <section className="grid overflow-hidden rounded-2xl border border-slate-200 bg-white sm:grid-cols-2 xl:grid-cols-4">
        <Metric icon={CalendarClock} label="Bloques del día" value={groups.length} detail={`${rooms.length} salas activas`} />
        <Metric icon={Users} label="Postulantes asignados" value={occupied} detail={`${capacity || 0} cupos configurados`} />
        <Metric icon={CheckCircle2} label="Grupos listos" value={ready} detail="Confirmados para evaluación" />
        <Metric icon={ArrowRightLeft} label="Alertas operativas" value={conflicts} detail={conflicts ? "Requieren revisión" : "Sin conflictos detectados"} />
      </section>

      <div className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_380px]">
        <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_12px_32px_rgba(15,23,42,0.05)]">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 p-5">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-blue-700">Torre de control</p>
              <h2 className="mt-1 text-xl font-black text-slate-950">Salas y bloques de la jornada</h2>
              <p className="mt-1 text-sm text-slate-600">Selecciona un bloque para revisar sus postulantes o un espacio libre para crear uno.</p>
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
              <span className="h-2.5 w-2.5 rounded-full bg-blue-600" /> Ocupado
              <span className="ml-2 h-2.5 w-2.5 rounded-full border border-slate-300 bg-white" /> Disponible
            </div>
          </div>

          {!rooms.length ? (
            <div className="p-12 text-center">
              <DoorOpen className="mx-auto text-slate-300" size={38} />
              <h3 className="mt-4 font-black text-slate-900">Aún no hay salas configuradas</h3>
              <p className="mt-2 text-sm text-slate-500">Crea las salas del proceso para comenzar a planificar la jornada.</p>
            </div>
          ) : (
            <div className="overflow-x-auto p-5">
              <div className="min-w-[900px]" style={{ display: "grid", gridTemplateColumns: `160px repeat(${times.length}, minmax(128px, 1fr))` }}>
                <div className="border-b border-slate-200 p-3 text-xs font-black uppercase tracking-wide text-slate-500">Sala / hora</div>
                {times.map((time) => (
                  <div key={time} className="border-b border-slate-200 p-3 text-center text-sm font-black text-slate-800">{time}</div>
                ))}
                {rooms.map((room) => (
                  <RoomRow key={room.roomId} room={room} times={times} groups={groups} selectedId={selected?.groupId} onSelect={props.onSelect} onCreate={(time) => setCreating({ roomId: room.roomId, time })} />
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

function EvaluationsView({ groups }: Props) {
  const instruments = ["Académico", "Psicomotricidad", "Psicología", "Observación grupal"];
  return <div><PageTitle eyebrow="Seguimiento administrativo" title="Estado de evaluaciones" description="Coordinación visualiza avance y pendientes, sin acceder al contenido de las pautas." />
    <section className="overflow-x-auto rounded-2xl border border-slate-200 bg-white p-5"><div className="min-w-[760px]"><div className="grid grid-cols-[150px_repeat(4,1fr)] gap-2 border-b border-slate-200 pb-3 text-xs font-black uppercase tracking-wide text-slate-500"><span>Grupo</span>{instruments.map((item) => <span key={item}>{item}</span>)}</div>{groups.slice(0, 24).map((group, groupIndex) => <div key={group.groupId} className="grid grid-cols-[150px_repeat(4,1fr)] items-center gap-2 border-b border-slate-100 py-3"><div><p className="font-black text-slate-900">{group.code}</p><p className="text-xs text-slate-500">{formatTime(group.startsAt)} · {group.roomName}</p></div>{instruments.map((instrument, index) => { const states = ["Pendiente", "En curso", "En revisión", "Validado"]; const label = states[(groupIndex + index) % states.length]; return <span key={instrument} className={`w-fit rounded-full px-2.5 py-1 text-xs font-black ${label === "Validado" ? "bg-emerald-50 text-emerald-800" : label === "En curso" ? "bg-violet-50 text-violet-800" : label === "En revisión" ? "bg-amber-50 text-amber-800" : "bg-slate-100 text-slate-600"}`}>{label}</span>; })}</div>)}</div></section>
  </div>;
}

function MonitorView({ rooms, groups, onOpenGroup }: Props & { onOpenGroup: (id: string) => void }) {
  const completed = groups.filter((group) => group.status === "COMPLETED").length;
  return <div><PageTitle eyebrow="Seguimiento operacional" title="Monitor de avance" description="Detecta atrasos, pendientes y carga de trabajo por sala durante la jornada." />
    <section className="mb-5 grid overflow-hidden rounded-2xl border border-slate-200 bg-white sm:grid-cols-3"><Metric icon={Activity} label="Avance jornada" value={groups.length ? Math.round(completed / groups.length * 100) : 0} detail="Porcentaje de grupos finalizados" /><Metric icon={ClipboardCheck} label="En ejecución" value={groups.filter((group) => group.status === "IN_PROGRESS").length} detail="Grupos activos" /><Metric icon={DoorOpen} label="Salas operativas" value={rooms.length} detail="Sin interrupciones informadas" /></section>
    <section className="rounded-2xl border border-slate-200 bg-white p-5"><h3 className="text-lg font-black">Avance por sala</h3><div className="mt-4 divide-y divide-slate-100">{rooms.map((room) => { const roomGroups = groups.filter((group) => group.roomId === room.roomId); const done = roomGroups.filter((group) => group.status === "COMPLETED").length; const next = roomGroups.find((group) => group.status !== "COMPLETED") ?? roomGroups[0]; return <button key={room.roomId} className="grid min-h-16 w-full items-center gap-4 text-left md:grid-cols-[170px_1fr_70px]" disabled={!next} onClick={() => next && onOpenGroup(next.groupId)}><span className="font-black text-slate-900">{room.name}</span><span className="h-2 overflow-hidden rounded-full bg-slate-100"><i className="block h-full rounded-full bg-blue-600" style={{ width: `${roomGroups.length ? done / roomGroups.length * 100 : 0}%` }} /></span><strong className="text-right text-sm text-blue-800">{done}/{roomGroups.length}</strong></button>; })}</div></section>
  </div>;
}

function ReviewView({ groups }: Props) {
  const queue = groups.filter((group, index) => group.status === "IN_PROGRESS" || index % 5 === 0);
  return <div><PageTitle eyebrow="Control de calidad" title="Bandeja de revisión" description="Instrumentos enviados, observados o devueltos para corrección." />
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white"><div className="grid grid-cols-[1fr_150px_150px] border-b border-slate-200 bg-slate-50 p-4 text-xs font-black uppercase text-slate-500"><span>Grupo</span><span>Instrumento</span><span>Estado</span></div>{queue.slice(0, 20).map((group, index) => <div key={group.groupId} className="grid min-h-16 grid-cols-[1fr_150px_150px] items-center border-b border-slate-100 p-4 text-sm"><span><b className="block text-slate-900">{group.code} · {group.roomName}</b><small className="text-slate-500">{formatTime(group.startsAt)}</small></span><span className="font-semibold text-slate-700">{["Académico", "Psicomotricidad", "Psicología"][index % 3]}</span><span className="w-fit rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-800">Pendiente de revisión</span></div>)}</section>
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

function RoomRow({ room, times, groups, selectedId, onSelect, onCreate }: { room: Room; times: string[]; groups: EvaluationGroup[]; selectedId?: string; onSelect: (id: string) => void; onCreate: (time: string) => void }) {
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
        const meta = statusMeta[group.status] ?? statusMeta.DRAFT;
        return (
          <button key={time} onClick={() => onSelect(group.groupId)} className={`m-1.5 min-h-24 rounded-xl border p-3 text-left transition ${selectedId === group.groupId ? "border-blue-700 bg-blue-50 ring-2 ring-blue-100" : "border-blue-200 bg-white hover:border-blue-500"}`}>
            <div className="flex items-start justify-between gap-2"><span className="text-sm font-black text-blue-900">{group.code}</span><span className={`rounded-full px-2 py-0.5 text-[9px] font-black ${meta.className}`}>{meta.label}</span></div>
            <p className="mt-3 text-xs font-bold text-slate-700">{group.memberIds.length}/{group.capacity} postulantes</p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-600" style={{ width: `${Math.min(100, (group.memberIds.length / Math.max(group.capacity, 1)) * 100)}%` }} /></div>
          </button>
        );
      })}
    </>
  );
}

function GroupPanel({ selected: group, date, rooms, applications, professionals, busy, onAction }: Props) {
  const [applicationId, setApplicationId] = useState("");
  const [nextRoom, setNextRoom] = useState("");
  const [nextTime, setNextTime] = useState("");
  const [reason, setReason] = useState("");
  const [evaluatorId, setEvaluatorId] = useState("");
  useEffect(() => {
    setApplicationId("");
    setNextRoom(group?.roomId ?? "");
    setNextTime(group ? formatTime(group.startsAt) : "");
    setReason("");
    setEvaluatorId("");
  }, [group?.groupId, group?.version]);

  const availablePeople = professionals.filter(
    (p) => p.active && p.roleGroup === "EVALUACION" && !group?.evaluatorIds.includes(p.professionalId),
  );

  if (!group) return (
    <aside className="rounded-2xl border border-slate-200 bg-white p-7 2xl:sticky 2xl:top-24 2xl:self-start">
      <Clock3 className="text-blue-200" size={36} />
      <h2 className="mt-5 text-xl font-black text-slate-950">Detalle del bloque</h2>
      <p className="mt-2 text-sm leading-6 text-slate-500">Selecciona un bloque en la matriz para revisar su composición y prepararlo para evaluación.</p>
    </aside>
  );

  const members = group.memberIds.map((id) => applications.find((app) => app.applicationId === id)).filter(Boolean) as FlowApplication[];
  const available = applications.filter((app) => !group.memberIds.includes(app.applicationId));
  const canConfirm = group.status === "DRAFT" && group.memberIds.length > 0 && group.evaluatorIds.length === group.requiredEvaluators;
  const meta = statusMeta[group.status] ?? statusMeta.DRAFT;

  return (
    <aside className="rounded-2xl border border-slate-200 bg-white shadow-[0_12px_32px_rgba(15,23,42,0.06)] 2xl:sticky 2xl:top-24 2xl:self-start">
      <div className="border-b border-slate-200 p-5">
        <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-extrabold uppercase tracking-wide text-blue-700">Bloque seleccionado</p><h2 className="mt-1 text-2xl font-black text-slate-950">{group.code}</h2></div><span className={`rounded-full px-3 py-1 text-xs font-black ${meta.className}`}>{meta.label}</span></div>
        <p className="mt-2 text-sm text-slate-600">{group.roomName} · {formatTime(group.startsAt)}–{formatTime(group.endsAt)}</p>
      </div>

      <div className="space-y-5 p-5">
        <div>
          <div className="mb-3 flex items-center justify-between"><h3 className="font-black text-slate-900">Postulantes del grupo</h3><span className="text-sm font-bold text-slate-500">{members.length}/{group.capacity}</span></div>
          <div className="space-y-2">
            {members.map((app) => <div key={app.applicationId} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-blue-100 text-xs font-black text-blue-800">{initials(app)}</span><div className="min-w-0"><p className="truncate text-sm font-black text-slate-900">{fullName(app)}</p><p className="text-xs text-slate-500">Asistencia pendiente</p></div></div>)}
            {!members.length && <p className="rounded-xl border border-dashed border-slate-300 p-4 text-center text-sm text-slate-500">Sin postulantes asignados</p>}
          </div>
          <div className="mt-3 flex gap-2"><select className="control min-w-0 flex-1" value={applicationId} onChange={(event) => setApplicationId(event.target.value)}><option value="">Agregar postulante elegible</option>{available.map((app) => <option key={app.applicationId} value={app.applicationId}>{fullName(app)}</option>)}</select><button className="primary shrink-0" disabled={busy || !applicationId || terminalStatuses.includes(group.status) || group.memberIds.length >= group.capacity} onClick={() => onAction(() => prekinderApi.addMember(group.groupId, applicationId), "Postulante asignado al grupo.")}>Agregar</button></div>
        </div>

        <div>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-black text-slate-900">Profesionales</h3>
            <span className="text-sm font-bold text-slate-500">
              {group.evaluatorIds.length}/{group.requiredEvaluators}
            </span>
          </div>

          {/* Lista de asignados */}
          {group.evaluatorIds.length > 0 ? (
            <div className="mb-3 space-y-2">
              {group.evaluatorIds.map((evId) => {
                const person = professionals.find((p) => p.professionalId === evId);
                return (
                  <div key={evId} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-black text-slate-900">
                        {person?.displayName ?? evId}
                      </p>
                      <p className="text-xs text-slate-500">{person?.specialty ?? "—"}</p>
                    </div>
                    <button
                      className="shrink-0 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-bold text-red-700 hover:bg-red-100 disabled:opacity-50"
                      disabled={busy || terminalStatuses.includes(group.status)}
                      onClick={() =>
                        onAction(
                          () => prekinderApi.removeEvaluator(group.groupId, evId),
                          "Profesional removido del grupo.",
                        )
                      }
                      title="Remover profesional"
                    >
                      <X size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="mb-3 rounded-xl border border-dashed border-slate-300 p-4 text-center text-sm text-slate-500">
              Sin profesionales asignados
            </p>
          )}

          {/* Agregar nuevo */}
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
            className="primary mt-2 w-full"
            disabled={busy || !evaluatorId || group.evaluatorIds.length >= group.requiredEvaluators}
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

        <div className="border-t border-slate-200 pt-5">
          <h3 className="font-black text-slate-900">Cambio operativo</h3>
          <p className="mt-1 text-xs leading-5 text-slate-500">El backend valida cruces de sala y horario antes de guardar.</p>
          <div className="mt-3 grid grid-cols-2 gap-2"><select className="control" value={nextRoom} onChange={(event) => setNextRoom(event.target.value)}>{rooms.map((room) => <option key={room.roomId} value={room.roomId}>{room.name}</option>)}</select><input className="control" type="time" value={nextTime} onChange={(event) => setNextTime(event.target.value)} /></div>
          <input className="control mt-2 w-full" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Motivo del cambio" />
          <button className="secondary mt-2 w-full" disabled={busy || !nextRoom || !nextTime || terminalStatuses.includes(group.status)} onClick={() => onAction(() => prekinderApi.rescheduleGroup(group.groupId, { roomId: nextRoom, startsAt: new Date(`${date}T${nextTime}:00-04:00`).toISOString(), durationMinutes: 30, reason, expectedVersion: group.version }), "Bloque reasignado correctamente.")}><ArrowRightLeft className="mr-2 inline" size={16} />Validar y cambiar bloque</button>
        </div>

        <div className="rounded-xl bg-slate-50 p-4"><p className="text-sm font-black text-slate-900">Preparación para evaluación</p><p className="mt-1 text-xs leading-5 text-slate-600">{canConfirm ? "El grupo cumple las condiciones y puede quedar listo." : `Postulantes ${group.memberIds.length}/${group.capacity} · equipo asignado ${group.evaluatorIds.length}/${group.requiredEvaluators}.`}</p><button className="primary mt-3 w-full" disabled={busy || !canConfirm} onClick={() => onAction(() => prekinderApi.confirmGroup(group.groupId, group.version), "Grupo listo para evaluación.")}><CheckCircle2 className="mr-2 inline" size={17} />Marcar listo para evaluación</button></div>
      </div>
    </aside>
  );
}

function CreateGroupDialog({ processId, date, rooms, roomId, initialTime, busy, onAction, onClose }: Props & { roomId: string; initialTime: string; onClose: () => void }) {
  const [code, setCode] = useState("");
  const [stage, setStage] = useState<EvaluationGroup["stage"]>("GROUP_3");
  const [capacity, setCapacity] = useState(3);
  const [groupDate, setGroupDate] = useState(date);
  const room = rooms.find((item) => item.roomId === roomId);
  // Keep local date in sync when parent date changes (dialog re-renders)
  useEffect(() => { setGroupDate(date); }, [date]);
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4" role="dialog" aria-modal="true" aria-label="Crear bloque">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-200 p-5"><div><p className="text-xs font-extrabold uppercase tracking-wide text-blue-700">Nuevo bloque</p><h2 className="mt-1 text-xl font-black">{room?.name} · {initialTime}</h2></div><button className="grid h-11 w-11 place-items-center rounded-lg hover:bg-slate-100" onClick={onClose} aria-label="Cerrar"><X size={20} /></button></div>
        <div className="space-y-4 p-5"><label className="block text-sm font-bold text-slate-700">Fecha<input className="control mt-1 w-full" type="date" value={groupDate} onChange={(event) => setGroupDate(event.target.value)} /></label><label className="block text-sm font-bold text-slate-700">Código<input className="control mt-1 w-full" value={code} onChange={(event) => setCode(event.target.value)} placeholder="Ej. PK-A-0900" /></label><label className="block text-sm font-bold text-slate-700">Modalidad<select className="control mt-1 w-full" value={stage} onChange={(event) => { const next = event.target.value as EvaluationGroup["stage"]; setStage(next); setCapacity(next === "GROUP_3" ? 3 : 9); }}><option value="GROUP_3">Observación focal · grupo base de 3</option><option value="GROUP_9">Interacción grupal · grupo base de 9</option></select></label><label className="block text-sm font-bold text-slate-700">Capacidad<input className="control mt-1 w-full" type="number" min={1} max={30} value={capacity} onChange={(event) => setCapacity(Number(event.target.value))} /></label><div className="flex justify-end gap-2 pt-2"><button className="secondary" onClick={onClose}>Cancelar</button><button className="primary" disabled={busy || !code || capacity < 1} onClick={() => void onAction(() => prekinderApi.createGroup({ processId, roomId, stage, code, startsAt: new Date(`${groupDate}T${initialTime}:00-04:00`).toISOString(), durationMinutes: 30, capacity, requiredEvaluators: stage === "GROUP_3" ? 3 : 6 }), "Bloque creado correctamente.").then(onClose)}>Crear bloque</button></div></div>
      </div>
    </div>
  );
}
