import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Clock3,
  DoorOpen,
  Pencil,
  Plus,
  Search,
  Trash2,
  UserRoundCheck,
  UsersRound,
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
  busy: boolean;
  onDateChange: (date: string) => void;
  onAction: (work: () => Promise<unknown>, success: string) => Promise<boolean>;
  onOpenGroup: (groupId: string) => void;
};

type EditorState =
  | { mode: "create" }
  | { mode: "edit"; group: EvaluationGroup }
  | null;

const statusMeta: Record<string, { label: string; className: string }> = {
  DRAFT: { label: "En preparación", className: "bg-amber-50 text-amber-800" },
  CONFIRMED: { label: "Listo", className: "bg-blue-50 text-blue-800" },
  IN_PROGRESS: { label: "En curso", className: "bg-violet-50 text-violet-800" },
  REVIEW: { label: "En revisión", className: "bg-orange-50 text-orange-800" },
  RECEPTION: { label: "Recepción", className: "bg-amber-50 text-amber-800" },
  COMPLETED: { label: "Finalizado", className: "bg-emerald-50 text-emerald-800" },
  CANCELLED: { label: "Eliminado", className: "bg-slate-100 text-slate-600" },
};

function formatTime(iso: string) {
  return new Intl.DateTimeFormat("es-CL", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "America/Santiago",
  }).format(new Date(iso));
}

function fullName(application: FlowApplication) {
  return [
    application.identity.firstName,
    application.identity.paternalLastName,
    application.identity.maternalLastName,
  ]
    .filter(Boolean)
    .join(" ");
}

function overlaps(
  startsAt: string,
  endsAt: string,
  otherStartsAt: string,
  otherEndsAt: string,
) {
  return (
    new Date(startsAt).getTime() < new Date(otherEndsAt).getTime() &&
    new Date(endsAt).getTime() > new Date(otherStartsAt).getTime()
  );
}

export function PrekinderGroups(props: Props) {
  const [editor, setEditor] = useState<EditorState>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ACTIVE");

  const visibleGroups = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("es");
    return props.groups
      .filter((group) =>
        status === "ALL"
          ? true
          : status === "ACTIVE"
            ? group.status !== "CANCELLED"
            : group.status === status,
      )
      .filter((group) => {
        if (!normalized) return true;
        return `${group.code} ${group.roomName} ${group.stage}`
          .toLocaleLowerCase("es")
          .includes(normalized);
      })
      .sort((left, right) => left.startsAt.localeCompare(right.startsAt));
  }, [props.groups, query, status]);

  const activeGroups = props.groups.filter((group) => group.status !== "CANCELLED");
  const assignedChildren = new Set(activeGroups.flatMap((group) => group.memberIds));
  const availableEligible = props.applications.filter(
    (application) =>
      application.eligibilityStatus === "VERIFIED" &&
      !assignedChildren.has(application.applicationId),
  ).length;
  const ready = activeGroups.filter((group) => group.status === "CONFIRMED").length;

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-4 rounded-2xl bg-slate-950 p-5 text-white sm:p-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-[-0.025em] sm:text-3xl">
            Grupos de evaluación
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
            Visualiza, arma, modifica y elimina grupos antes de iniciar la jornada.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <label className="flex min-h-11 items-center gap-2 rounded-xl bg-white/10 px-3 text-sm font-bold">
            <CalendarDays size={17} aria-hidden="true" />
            <span className="sr-only">Fecha de la jornada</span>
            <input
              className="min-w-0 bg-transparent text-white outline-none [color-scheme:dark]"
              type="date"
              value={props.date}
              onChange={(event) => {
                if (event.target.value) {
                  setEditor(null);
                  props.onDateChange(event.target.value);
                }
              }}
            />
          </label>
          <button
            className="primary min-h-11"
            disabled={props.busy || props.rooms.length === 0}
            onClick={() => setEditor({ mode: "create" })}
          >
            <Plus className="mr-2 inline" size={17} />
            Armar grupo
          </button>
        </div>
      </header>

      <section className="grid overflow-hidden rounded-2xl border border-slate-200 bg-white sm:grid-cols-3">
        <Summary label="Grupos activos" value={activeGroups.length} detail={`${props.rooms.length} salas disponibles`} />
        <Summary label="Listos para evaluar" value={ready} detail="Con composición confirmada" />
        <Summary label="Postulantes asignados" value={assignedChildren.size} detail={`${availableEligible} elegibles aún disponibles`} />
      </section>

      {editor && (
        <GroupEditor
          key={editor.mode === "edit" ? `${editor.group.groupId}-${editor.group.version}` : "new"}
          {...props}
          editor={editor}
          onClose={() => setEditor(null)}
        />
      )}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative min-w-0 flex-1 sm:max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
            <input
              className="control w-full pl-10"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por código o sala"
              aria-label="Buscar grupos"
            />
          </div>
          <select
            className="control sm:w-52"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            aria-label="Filtrar por estado"
          >
            <option value="ACTIVE">Grupos activos</option>
            <option value="DRAFT">En preparación</option>
            <option value="CONFIRMED">Listos</option>
            <option value="COMPLETED">Finalizados</option>
            <option value="CANCELLED">Eliminados</option>
            <option value="ALL">Todos los estados</option>
          </select>
        </div>

        {visibleGroups.length === 0 ? (
          <div className="px-5 py-14 text-center">
            <UsersRound className="mx-auto text-slate-300" size={36} />
            <h2 className="mt-3 text-lg font-black text-slate-900">No hay grupos para mostrar</h2>
            <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-slate-500">
              {query || status !== "ACTIVE"
                ? "Cambia los filtros para ampliar la búsqueda."
                : "Arma el primer grupo de esta jornada y asigna postulantes y profesionales."}
            </p>
            {!query && status === "ACTIVE" && (
              <button
                className="primary mt-4"
                disabled={props.busy || props.rooms.length === 0}
                onClick={() => setEditor({ mode: "create" })}
              >
                <Plus className="mr-2 inline" size={17} />Armar primer grupo
              </button>
            )}
            {!query && status === "ACTIVE" && props.rooms.length === 0 && (
              <p className="mt-3 text-sm font-bold text-amber-800">Primero crea o habilita una sala para esta jornada.</p>
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {visibleGroups.map((group) => {
              const meta = statusMeta[group.status] ?? {
                label: group.status,
                className: "bg-slate-100 text-slate-700",
              };
              const expanded = expandedId === group.groupId;
              const canModify =
                ["DRAFT", "CONFIRMED"].includes(group.status) &&
                new Date(group.startsAt).getTime() > Date.now();
              const members = group.memberIds
                .map((id) => props.applications.find((application) => application.applicationId === id))
                .filter(Boolean) as FlowApplication[];
              const evaluators = group.evaluatorIds
                .map((id) => props.professionals.find((professional) => professional.professionalId === id))
                .filter(Boolean) as Professional[];

              return (
                <article key={group.groupId}>
                  <div className="grid gap-4 p-4 lg:grid-cols-[minmax(180px,1fr)_160px_170px_auto] lg:items-center">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-base font-black text-slate-950">{group.code}</h2>
                        <span className={`rounded-full px-2.5 py-1 text-xs font-black ${meta.className}`}>
                          {meta.label}
                        </span>
                      </div>
                      <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-slate-600">
                        <DoorOpen size={15} aria-hidden="true" />{group.roomName}
                      </p>
                    </div>
                    <div>
                      <p className="flex items-center gap-1.5 text-sm font-black text-slate-900">
                        <Clock3 size={15} className="text-slate-400" aria-hidden="true" />
                        {formatTime(group.startsAt)}–{formatTime(group.endsAt)}
                      </p>
                      <p className="mt-1 text-xs font-semibold text-slate-500">
                        {group.stage === "GROUP_3" ? "Observación focal" : "Interacción grupal"}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <span><b className="block text-slate-950">{group.memberIds.length}/{group.capacity}</b><small className="text-slate-500">postulantes</small></span>
                      <span><b className="block text-slate-950">{group.evaluatorIds.length}/{group.requiredEvaluators}</b><small className="text-slate-500">evaluadores</small></span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                      <button
                        className="secondary"
                        onClick={() => setExpandedId(expanded ? null : group.groupId)}
                        aria-expanded={expanded}
                      >
                        {expanded ? <ChevronUp className="mr-1 inline" size={16} /> : <ChevronDown className="mr-1 inline" size={16} />}
                        Ver
                      </button>
                      <button
                        className="secondary"
                        disabled={props.busy || !canModify}
                        onClick={() => setEditor({ mode: "edit", group })}
                        title={canModify ? "Editar planificación" : "Sólo se editan grupos futuros en preparación o listos"}
                      >
                        <Pencil className="mr-1 inline" size={16} />Editar
                      </button>
                      {deletingId === group.groupId ? (
                        <>
                          <button
                            className="min-h-10 rounded-lg bg-red-700 px-3 text-sm font-black text-white hover:bg-red-800 disabled:opacity-50"
                            disabled={props.busy}
                            onClick={async () => {
                              const deleted = await props.onAction(
                                () => prekinderApi.deleteGroup(group.groupId, group.version),
                                `Grupo ${group.code} eliminado. La trazabilidad quedó conservada.`,
                              );
                              if (deleted) setDeletingId(null);
                            }}
                          >
                            Confirmar
                          </button>
                          <button className="secondary" onClick={() => setDeletingId(null)}>Cancelar</button>
                        </>
                      ) : (
                        <button
                          className="min-h-10 rounded-lg px-3 text-sm font-black text-red-700 hover:bg-red-50 disabled:text-red-300 disabled:hover:bg-transparent"
                          disabled={props.busy || !canModify}
                          onClick={() => setDeletingId(group.groupId)}
                          title={canModify ? "Eliminar grupo" : "Este grupo ya no se puede eliminar"}
                        >
                          <Trash2 className="mr-1 inline" size={16} />Eliminar
                        </button>
                      )}
                    </div>
                  </div>
                  {expanded && (
                    <div className="grid gap-5 bg-slate-50 px-4 py-5 md:grid-cols-2">
                      <DetailList
                        icon={<UsersRound size={17} />}
                        title="Postulantes"
                        empty="Todavía no hay postulantes asignados."
                        values={members.map((application) => fullName(application))}
                      />
                      <DetailList
                        icon={<UserRoundCheck size={17} />}
                        title="Equipo evaluador"
                        empty="Todavía no hay profesionales asignados."
                        values={evaluators.map((professional) => professional.displayName)}
                      />
                      <div className="md:col-span-2">
                        <button className="primary" onClick={() => props.onOpenGroup(group.groupId)}>
                          Abrir composición y operación
                        </button>
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function GroupEditor({
  editor,
  onClose,
  ...props
}: Props & { editor: Exclude<EditorState, null>; onClose: () => void }) {
  const editing = editor.mode === "edit" ? editor.group : null;
  const [stage, setStage] = useState<EvaluationGroup["stage"]>(editing?.stage ?? "GROUP_3");
  const [roomId, setRoomId] = useState(editing?.roomId ?? props.rooms.find((room) => room.active)?.roomId ?? "");
  const [time, setTime] = useState(editing ? formatTime(editing.startsAt) : "09:00");
  const [code, setCode] = useState(editing?.code ?? "");
  const [capacity, setCapacity] = useState(editing?.capacity ?? 3);
  const [requiredEvaluators, setRequiredEvaluators] = useState(editing?.requiredEvaluators ?? 3);
  const [memberIds, setMemberIds] = useState<string[]>(editing?.memberIds ?? []);
  const [evaluatorIds, setEvaluatorIds] = useState<string[]>(editing?.evaluatorIds ?? []);

  const startCandidate = time ? new Date(`${props.date}T${time}:00`) : null;
  const startsAt = startCandidate && !Number.isNaN(startCandidate.getTime())
    ? startCandidate.toISOString()
    : null;
  const endsAt = startsAt
    ? new Date(new Date(startsAt).getTime() + 30 * 60_000).toISOString()
    : null;
  const bookedMembers = new Set(
    props.groups
      .filter((group) => group.groupId !== editing?.groupId && group.status !== "CANCELLED")
      .filter((group) => startsAt && endsAt && overlaps(startsAt, endsAt, group.startsAt, group.endsAt))
      .flatMap((group) => group.memberIds),
  );
  const bookedEvaluators = new Set(
    props.groups
      .filter((group) => group.groupId !== editing?.groupId && group.status !== "CANCELLED")
      .filter((group) => startsAt && endsAt && overlaps(startsAt, endsAt, group.startsAt, group.endsAt))
      .flatMap((group) => group.evaluatorIds),
  );
  const eligibleApplications = props.applications.filter(
    (application) =>
      (application.eligibilityStatus === "VERIFIED" || editing?.memberIds.includes(application.applicationId)) &&
      !bookedMembers.has(application.applicationId),
  );
  const eligibleProfessionals = props.professionals.filter(
    (professional) =>
      ((professional.active && professional.roleGroup === "EVALUACION") ||
        editing?.evaluatorIds.includes(professional.professionalId)) &&
      !bookedEvaluators.has(professional.professionalId),
  );
  const availableMemberKey = eligibleApplications.map((application) => application.applicationId).join("|");
  const availableEvaluatorKey = eligibleProfessionals.map((professional) => professional.professionalId).join("|");
  useEffect(() => {
    const available = new Set(availableMemberKey.split("|").filter(Boolean));
    setMemberIds((current) => current.filter((id) => available.has(id)));
  }, [availableMemberKey]);
  useEffect(() => {
    const available = new Set(availableEvaluatorKey.split("|").filter(Boolean));
    setEvaluatorIds((current) => current.filter((id) => available.has(id)));
  }, [availableEvaluatorKey]);
  const room = props.rooms.find((item) => item.roomId === roomId);
  const validComposition =
    Boolean(code.trim() && roomId && startsAt) &&
    memberIds.length > 0 &&
    memberIds.length <= capacity &&
    evaluatorIds.length === requiredEvaluators &&
    capacity <= (room?.capacity ?? 0);
  const canCreate = !editing && validComposition;
  const canEdit = Boolean(editing && validComposition);

  async function save() {
    if (!editing) {
      const saved = await props.onAction(
        () =>
          prekinderApi.createAssignedGroup({
            processId: props.processId,
            roomId,
            stage,
            code: code.trim(),
            startsAt: startsAt!,
            durationMinutes: 30,
            capacity,
            requiredEvaluators,
            memberIds,
            evaluatorIds,
          }),
        `Grupo ${code.trim()} creado con postulantes y equipo evaluador.`,
      );
      if (saved) onClose();
      return;
    }

    const saved = await props.onAction(
      () => prekinderApi.updateGroup(editing.groupId, {
        roomId,
        startsAt: startsAt!,
        durationMinutes: 30,
        capacity,
        requiredEvaluators,
        memberIds,
        evaluatorIds,
        reason: "Actualización integral desde gestión de grupos",
        expectedVersion: editing.version,
      }),
      `Planificación y composición del grupo ${editing.code} actualizadas.`,
    );
    if (saved) onClose();
  }

  return (
    <section className="rounded-2xl border border-blue-200 bg-white shadow-[0_14px_38px_rgba(15,23,42,0.08)]" aria-labelledby="group-editor-title">
      <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-5">
        <div>
          <h2 id="group-editor-title" className="text-xl font-black text-slate-950">
            {editing ? `Editar ${editing.code}` : "Armar un grupo completo"}
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            {editing
              ? "Modifica sala, horario, límites e integrantes antes de que comience el bloque."
              : "Define el bloque y selecciona postulantes y equipo evaluador antes de guardar."}
          </p>
        </div>
        <button className="secondary !px-3" onClick={onClose} aria-label="Cerrar editor">
          <X size={18} />
        </button>
      </div>

      <div className="grid gap-5 p-5 lg:grid-cols-2">
        <div className="grid content-start gap-4 sm:grid-cols-2">
          <Field label="Código del grupo">
            <input className="control w-full" value={code} disabled={Boolean(editing)} onChange={(event) => setCode(event.target.value)} placeholder="G3-01" />
          </Field>
          <Field label="Tipo de evaluación">
            <select
              className="control w-full"
              value={stage}
              disabled={Boolean(editing)}
              onChange={(event) => {
                const next = event.target.value as EvaluationGroup["stage"];
                setStage(next);
                setCapacity(next === "GROUP_3" ? 3 : 9);
                setRequiredEvaluators(next === "GROUP_3" ? 3 : 6);
                setMemberIds([]);
                setEvaluatorIds([]);
              }}
            >
              <option value="GROUP_3">Observación focal · base 3</option>
              <option value="GROUP_9">Interacción grupal · base 9</option>
            </select>
          </Field>
          <Field label="Sala">
            <select className="control w-full" value={roomId} onChange={(event) => setRoomId(event.target.value)}>
              <option value="">Seleccionar sala</option>
              {props.rooms.filter((item) => item.active).map((item) => (
                <option key={item.roomId} value={item.roomId}>{item.name} · cap. {item.capacity}</option>
              ))}
            </select>
          </Field>
          <Field label="Hora de inicio">
            <input className="control w-full" type="time" value={time} onChange={(event) => setTime(event.target.value)} />
          </Field>
          <Field label="Máximo de postulantes">
            <input className="control w-full" type="number" min={1} max={room?.capacity ?? 30} value={capacity} onChange={(event) => setCapacity(Number(event.target.value))} />
          </Field>
          <Field label="Evaluadores requeridos">
            <input className="control w-full" type="number" min={1} max={12} value={requiredEvaluators} onChange={(event) => setRequiredEvaluators(Number(event.target.value))} />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
            <SelectionList
              title="Postulantes"
              count={`${memberIds.length}/${capacity}`}
              empty="No hay postulantes disponibles en este horario."
              options={eligibleApplications.map((application) => ({
                id: application.applicationId,
                label: fullName(application),
                detail: `${application.identity.rut}${application.eligibilityStatus === "VERIFIED" ? "" : " · Ya no elegible"}`,
              }))}
              selected={memberIds}
              limit={capacity}
              onChange={setMemberIds}
            />
            <SelectionList
              title="Equipo evaluador"
              count={`${evaluatorIds.length}/${requiredEvaluators}`}
              empty="No hay evaluadores disponibles en este horario."
              options={eligibleProfessionals.map((professional) => ({
                id: professional.professionalId,
                label: professional.displayName,
                detail: `${professional.roleLabel}${professional.active ? "" : " · Inactivo"}`,
              }))}
              selected={evaluatorIds}
              limit={requiredEvaluators}
              onChange={setEvaluatorIds}
            />
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-semibold text-slate-600" role="status">
          {!time
            ? "Completa la hora de inicio."
            : memberIds.length === 0
              ? "Selecciona al menos un postulante."
              : memberIds.length > capacity
                ? `Quita ${memberIds.length - capacity} postulantes para respetar el cupo.`
                : capacity > (room?.capacity ?? 0)
                  ? "La capacidad del grupo supera la capacidad de la sala."
                  : evaluatorIds.length < requiredEvaluators
                ? `Faltan ${requiredEvaluators - evaluatorIds.length} evaluadores para completar el equipo.`
                    : evaluatorIds.length > requiredEvaluators
                      ? `Quita ${evaluatorIds.length - requiredEvaluators} evaluadores para respetar el límite.`
                      : editing
                        ? "Código y tipo se mantienen; la planificación y composición están listas para guardar."
                        : "La composición está completa y lista para guardar."}
        </p>
        <div className="flex justify-end gap-2">
          <button className="secondary" onClick={onClose}>Cancelar</button>
          <button
            className="primary"
            disabled={props.busy || (editing ? !canEdit : !canCreate)}
            onClick={() => void save()}
          >
            {props.busy ? "Guardando…" : editing ? "Guardar cambios" : "Crear grupo"}
          </button>
        </div>
      </div>
    </section>
  );
}

function SelectionList({
  title,
  count,
  empty,
  options,
  selected,
  limit,
  onChange,
}: {
  title: string;
  count: string;
  empty: string;
  options: Array<{ id: string; label: string; detail: string }>;
  selected: string[];
  limit: number;
  onChange: (value: string[]) => void;
}) {
  return (
    <fieldset className="min-w-0">
      <legend className="mb-2 flex w-full items-center justify-between gap-3 text-sm font-black text-slate-900">
        {title}<span className="text-blue-700">{count}</span>
      </legend>
      <div className="max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-2">
        {options.length === 0 ? (
          <p className="p-3 text-sm leading-6 text-slate-500">{empty}</p>
        ) : (
          options.map((option) => {
            const checked = selected.includes(option.id);
            return (
              <label key={option.id} className="flex cursor-pointer items-start gap-3 rounded-lg p-2.5 hover:bg-white">
                <input
                  className="mt-1 h-4 w-4 accent-blue-700"
                  type="checkbox"
                  checked={checked}
                  disabled={!checked && selected.length >= limit}
                  onChange={() => onChange(checked ? selected.filter((id) => id !== option.id) : [...selected, option.id])}
                />
                <span className="min-w-0"><b className="block truncate text-sm text-slate-900">{option.label}</b><small className="block truncate text-slate-500">{option.detail}</small></span>
              </label>
            );
          })
        )}
      </div>
    </fieldset>
  );
}

function Summary({ label, value, detail }: { label: string; value: number; detail: string }) {
  return (
    <div className="border-b border-slate-200 p-5 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0">
      <p className="text-2xl font-black text-slate-950">{value}</p>
      <p className="mt-1 text-sm font-black text-slate-700">{label}</p>
      <p className="mt-1 text-xs font-semibold text-slate-500">{detail}</p>
    </div>
  );
}

function DetailList({ icon, title, empty, values }: { icon: ReactNode; title: string; empty: string; values: string[] }) {
  return (
    <section>
      <h3 className="flex items-center gap-2 text-sm font-black text-slate-900">{icon}{title}</h3>
      {values.length ? (
        <ul className="mt-2 grid gap-1.5 text-sm text-slate-700 sm:grid-cols-2">
          {values.map((value) => <li key={value} className="rounded-lg bg-white px-3 py-2 font-semibold">{value}</li>)}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-slate-500">{empty}</p>
      )}
    </section>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-sm font-bold text-slate-700">
      <span className="mb-1.5 block">{label}</span>
      {children}
    </label>
  );
}
