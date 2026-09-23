import { Fragment, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  ArrowUpDown,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Clock3,
  Download,
  Layers,
  Pencil,
  Plus,
  Search,
  Trash2,
  TriangleAlert,
  UserRoundCheck,
  UsersRound,
  X,
} from "lucide-react";
import {
  ApiError,
  prekinderApi,
  type EvaluationGroup,
  type FlowApplication,
  type GroupCluster,
  type Professional,
  type ProcessConfiguration,
  type Room,
  type SchedulePlan,
} from "../../services/api";
import type { EvaluationJourney } from "../../data/evaluationJourneys";
import {
  CLUSTER_MIN_GROUPS,
  clusterErrorMessage,
  isActiveCluster,
} from "../../data/groupClusters";

type ClusterActionResult = { ok: boolean; error?: string };

type Props = {
  processId: string;
  date: string;
  rooms: Room[];
  groups: EvaluationGroup[];
  clusters: GroupCluster[];
  clustersAvailable: boolean;
  applications: FlowApplication[];
  professionals: Professional[];
  journeys: EvaluationJourney[];
  configuration: ProcessConfiguration | null;
  busy: boolean;
  onDateChange: (date: string) => void;
  onAction: (work: () => Promise<unknown>, success: string) => Promise<boolean>;
  onClusterAction: (work: () => Promise<unknown>, success: string) => Promise<ClusterActionResult>;
  onOpenGroup: (groupId: string) => void;
  onGoToControlTower: () => void;
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

function formatTime(iso: string, timeZone = "America/Santiago") {
  return new Intl.DateTimeFormat("es-CL", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone,
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

function formatDay(date: string, timeZone = "America/Santiago") {
  if (!date) return "";
  return new Intl.DateTimeFormat("es-CL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone,
  }).format(new Date(`${date}T12:00:00`));
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

function csvCell(value: unknown) {
  const raw = String(value ?? "");
  const safe = /^[=+\-@]/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replaceAll('"', '""')}"`;
}

function downloadCsv(fileName: string, headers: string[], rows: unknown[][]) {
  const content = [headers, ...rows].map((row) => row.map(csvCell).join(";")).join("\r\n");
  const url = URL.createObjectURL(new Blob(["\uFEFF", content], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

type GroupsView = "groups" | "clusters";

const groupsViews: Array<{ id: GroupsView; label: string; icon: typeof UsersRound }> = [
  { id: "groups", label: "Grupos", icon: UsersRound },
  { id: "clusters", label: "Agrupaciones", icon: Layers },
];

export function PrekinderGroups(props: Props) {
  const timeZone = props.configuration?.scheduleTimezone ?? "America/Santiago";
  const [view, setView] = useState<GroupsView>("groups");
  const [editor, setEditor] = useState<EditorState>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ACTIVE");
  const [automaticStage, setAutomaticStage] = useState<"GROUP_3" | "GROUP_9">("GROUP_3");
  const [schedulePlan, setSchedulePlan] = useState<SchedulePlan | null>(null);
  const [scheduleError, setScheduleError] = useState("");
  const [scheduleBusy, setScheduleBusy] = useState(false);
  const [sort, setSort] = useState<{ key: "name" | "estado" | "time"; dir: "asc" | "desc" }>({
    key: "time",
    dir: "asc",
  });

  function toggleGroupSort(key: "name" | "estado") {
    setSort((current) =>
      current.key === key
        ? { key, dir: current.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "asc" },
    );
  }

  const visibleGroups = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("es");
    const factor = sort.dir === "asc" ? 1 : -1;
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
      .sort((left, right) => {
        const value =
          sort.key === "name"
            ? left.code.localeCompare(right.code, "es")
            : sort.key === "estado"
              ? (statusMeta[left.status]?.label ?? left.status).localeCompare(statusMeta[right.status]?.label ?? right.status, "es")
              : left.startsAt.localeCompare(right.startsAt);
        return value * factor;
      });
  }, [props.groups, query, status, sort]);

  const activeGroups = props.groups.filter((group) => group.status !== "CANCELLED");
  const assignedChildren = new Set(activeGroups.flatMap((group) => group.memberIds));
  const availableEligible = props.applications.filter(
    (application) =>
      (application.status === "READY_TO_SCHEDULE" || application.status === "SCHEDULED") &&
      !assignedChildren.has(application.applicationId),
  ).length;
  const ready = activeGroups.filter((group) => group.status === "CONFIRMED").length;

  const sortedJourneys = [...props.journeys].sort((a, b) => a.date.localeCompare(b.date));

  useEffect(() => {
    setSchedulePlan(null);
    setScheduleError("");
  }, [props.date, props.processId, automaticStage]);

  async function previewAutomaticSchedule() {
    setScheduleBusy(true);
    setScheduleError("");
    try {
      setSchedulePlan(await prekinderApi.previewSchedule(props.processId, {
        date: props.date,
        stage: automaticStage,
      }));
    } catch (reason) {
      setScheduleError(reason instanceof Error ? reason.message : "No fue posible preparar la agenda.");
    } finally {
      setScheduleBusy(false);
    }
  }

  async function confirmAutomaticSchedule() {
    if (!schedulePlan) return;
    const confirmed = await props.onAction(
      () => prekinderApi.confirmSchedule(schedulePlan.planId),
      "Agenda confirmada sin dobles reservas.",
    );
    if (confirmed) setSchedulePlan(null);
  }

  function operationRows() {
    return visibleGroups.flatMap((group) => {
      const evaluatorNames = group.evaluatorIds
        .map((id) => props.professionals.find((professional) => professional.professionalId === id)?.displayName)
        .filter(Boolean)
        .join(" · ");
      return group.memberIds.map((id) => ({
        group,
        application: props.applications.find((candidate) => candidate.applicationId === id),
        evaluatorNames,
      }));
    });
  }

  function exportRoster(kind: "roster" | "labels" | "contingency") {
    const rows = operationRows();
    const prefix = `${props.date || "jornada"}-prekinder`;
    if (kind === "labels") {
      downloadCsv(`${prefix}-etiquetas.csv`, ["Postulante", "Grupo", "Sala", "Horario"], rows.map(({ group, application }) => [
        application ? fullName(application) : "Postulante no disponible",
        group.code,
        group.roomName,
        `${formatTime(group.startsAt, timeZone)}–${formatTime(group.endsAt, timeZone)}`,
      ]));
      return;
    }
    if (kind === "contingency") {
      downloadCsv(`${prefix}-contingencia.csv`, ["Postulante", "RUT", "Grupo", "Sala", "Presente", "Atraso", "Ausente", "No evaluable", "Observación", "Firma"], rows.map(({ group, application }) => [
        application ? fullName(application) : "Postulante no disponible",
        application?.identity.rut,
        group.code,
        group.roomName,
        "", "", "", "", "", "",
      ]));
      return;
    }
    downloadCsv(`${prefix}-nomina.csv`, ["Fecha", "Grupo", "Instancia", "Sala", "Inicio", "Fin", "Postulante", "RUT", "Sexo", "Estado", "Evaluadores"], rows.map(({ group, application, evaluatorNames }) => [
      props.date,
      group.code,
      group.stage,
      group.roomName,
      formatTime(group.startsAt, timeZone),
      formatTime(group.endsAt, timeZone),
      application ? fullName(application) : "Postulante no disponible",
      application?.identity.rut,
      application?.applicationDetails?.gender,
      application?.status,
      evaluatorNames,
    ]));
  }

  return (
    <div className="space-y-5">
      <aside>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-600">Gestión de grupos</p>
          <p className="mt-1 text-sm text-slate-600">Arma grupos individuales o reúnelos en agrupaciones.</p>
        </div>
        <nav className="mt-3 flex flex-wrap gap-2" aria-label="Vistas de grupos">
          {groupsViews.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setView(id)}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${view === id ? "border border-slate-300 bg-white font-bold text-slate-900" : "font-semibold text-slate-600 hover:text-slate-900"}`}
              aria-current={view === id ? "page" : undefined}
            >
              <Icon size={16} />{label}
            </button>
          ))}
        </nav>
      </aside>
      {view === "clusters" && (
        <GroupClusters
          processId={props.processId}
          groups={props.groups}
          clusters={props.clusters}
          clustersAvailable={props.clustersAvailable}
          date={props.date}
          journeys={props.journeys}
          busy={props.busy}
          timeZone={timeZone}
          onDateChange={props.onDateChange}
          onClusterAction={props.onClusterAction}
        />
      )}
      {view === "groups" && (
    <div className="space-y-5">
      {sortedJourneys.length ? (
        <label className="flex min-h-9 w-fit items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm text-gray-600">
          <CalendarDays className="h-4 w-4 shrink-0 text-gray-500" aria-hidden="true" />
          <span className="shrink-0">Jornada de evaluación</span>
          <select
            className="min-w-0 bg-transparent text-sm font-semibold text-gray-950 outline-none"
            value={props.date}
            onChange={(event) => {
              if (event.target.value) {
                setEditor(null);
                props.onDateChange(event.target.value);
              }
            }}
          >
            {!sortedJourneys.some((journey) => journey.date === props.date) && (
              <option value={props.date}>{formatDay(props.date, timeZone)}</option>
            )}
            {sortedJourneys.map((journey) => (
              <option key={journey.id} value={journey.date}>{journey.name} · {formatDay(journey.date, timeZone)}</option>
            ))}
          </select>
        </label>
      ) : (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">
          <CalendarDays className="h-4 w-4 shrink-0" aria-hidden="true" />
          Aún no hay jornadas de evaluación.
        </div>
      )}

      <section className="grid overflow-hidden rounded-2xl border border-slate-200 bg-white sm:grid-cols-3">
        <Summary label="Grupos activos" value={activeGroups.length} detail={`${props.rooms.length} salas disponibles`} />
        <Summary label="Listos para evaluar" value={ready} detail="Con composición confirmada" />
        <Summary label="Postulantes asignados" value={assignedChildren.size} detail={`${availableEligible} elegibles aún disponibles`} />
      </section>

      <section className="rounded-2xl border border-blue-200 bg-blue-50/40 p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-700">Asignación automática</p>
            <h2 className="mt-1 text-lg font-black text-slate-950">Vista previa antes de reservar</h2>
            <p className="mt-1 max-w-2xl text-sm text-slate-600">
              Considera salas, disponibilidad, conflictos, capacidades configuradas y una entrevista familiar independiente el mismo día.
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <label className="text-sm font-bold text-slate-700">
              Instancia
              <div className="relative mt-1">
                <select className="control w-full appearance-none pr-9" value={automaticStage} onChange={(event) => setAutomaticStage(event.target.value as "GROUP_3" | "GROUP_9")}>
                  <option value="GROUP_3">Académica / focal</option>
                  <option value="GROUP_9">Psicomotricidad / grupal</option>
                </select>
                <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" aria-hidden="true" />
              </div>
            </label>
            <button className="primary" disabled={props.busy || scheduleBusy || !props.journeys.length} onClick={() => void previewAutomaticSchedule()}>
              {scheduleBusy ? "Calculando…" : "Generar vista previa"}
            </button>
          </div>
        </div>
        {scheduleError && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-800" role="alert">{scheduleError}</p>}
        {schedulePlan && (
          <div className="mt-5 rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="font-black text-slate-950">{schedulePlan.groups.length} grupos · {schedulePlan.familyInterviews.length} entrevistas familiares</p>
                <p className="mt-1 text-xs text-slate-500">Configuración v{schedulePlan.configurationVersion} · vence {formatTime(schedulePlan.expiresAt, timeZone)}</p>
              </div>
              <button className="primary" disabled={props.busy || schedulePlan.blockers.length > 0} onClick={() => void confirmAutomaticSchedule()}>
                Confirmar agenda
              </button>
            </div>
            {schedulePlan.blockers.map((blocker) => <p key={blocker} className="mt-3 flex gap-2 text-sm font-bold text-red-800"><TriangleAlert size={17} className="shrink-0" />{blocker}</p>)}
            {schedulePlan.warnings.map((warning) => <p key={warning} className="mt-3 flex gap-2 text-sm font-semibold text-amber-800"><TriangleAlert size={17} className="shrink-0" />{warning}</p>)}
            {!schedulePlan.blockers.length && (
              <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {schedulePlan.groups.map((group) => (
                  <div key={`${group.code}-${group.startsAt}`} className="rounded-lg bg-slate-50 p-3 text-sm">
                    <b>{group.code}</b><span className="ml-2 text-slate-500">{formatTime(group.startsAt, timeZone)} · {group.applicationIds.length} niños</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex flex-wrap items-start justify-between gap-4 p-6">
          <div>
            <h2 className="text-lg font-black">
              {editor?.mode === "edit" ? `Editar ${editor.group.code}` : "Armar nuevo grupo de evaluación"}
            </h2>
            <p className="mt-1 text-sm leading-5 text-slate-600">
              {editor?.mode === "edit"
                ? "Modifica sala, horario, límites e integrantes antes de que comience el bloque."
                : "Asigna sala, horario, postulantes y equipo evaluador."}
            </p>
          </div>
          {editor ? (
            <button className="secondary shrink-0 !px-3" onClick={() => setEditor(null)} aria-label="Cerrar editor">
              <X size={18} />
            </button>
          ) : (
            <button
              className="primary shrink-0"
              disabled={props.busy || props.rooms.length === 0 || props.journeys.length === 0}
              onClick={() => setEditor({ mode: "create" })}
            >
              <Plus className="mr-2 inline" size={17} />
              Armar grupo
            </button>
          )}
        </div>
        <div className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${editor ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
          <div className="overflow-hidden">
            {editor && (
              <GroupEditor
                key={editor.mode === "edit" ? `${editor.group.groupId}-${editor.group.version}` : "new"}
                {...props}
                editor={editor}
                onClose={() => setEditor(null)}
              />
            )}
          </div>
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-end gap-3">
        <button type="button" className="secondary" onClick={() => exportRoster("roster")} disabled={!visibleGroups.length}>
          <Download className="mr-2 inline" size={16} />Nómina CSV
        </button>
        <button type="button" className="secondary" onClick={() => exportRoster("labels")} disabled={!visibleGroups.length}>
          <Download className="mr-2 inline" size={16} />Etiquetas CSV
        </button>
        <button type="button" className="secondary" onClick={() => exportRoster("contingency")} disabled={!visibleGroups.length}>
          <Download className="mr-2 inline" size={16} />Contingencia CSV
        </button>
        <span className="text-sm font-normal text-slate-400">{visibleGroups.length} de {props.groups.length}</span>
        <div className="relative inline-block">
          <select
            className="control appearance-none pr-9"
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
          <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" aria-hidden="true" />
        </div>
        <label className="relative block w-full max-w-xs">
          <span className="sr-only">Buscar grupos</span>
          <Search className="absolute left-3 top-3 text-slate-400" size={18} />
          <input
            className="control w-full pl-10"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por código o sala"
          />
        </label>
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
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
                disabled={props.busy || props.rooms.length === 0 || props.journeys.length === 0}
                onClick={() => setEditor({ mode: "create" })}
              >
                <Plus className="mr-2 inline" size={17} />Armar primer grupo
              </button>
            )}
            {!query && status === "ACTIVE" && props.journeys.length === 0 && (
              <p className="mt-3 text-sm font-bold text-amber-800">Primero crea una jornada de evaluación en Torre de control.</p>
            )}
            {!query && status === "ACTIVE" && props.journeys.length > 0 && props.rooms.length === 0 && (
              <p className="mt-3 text-sm font-bold text-amber-800">Primero crea o habilita una sala para esta jornada.</p>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full table-fixed border-collapse">
              <colgroup>
                <col className="w-[26%]" />
                <col className="w-[13%]" />
                <col className="w-[19%]" />
                <col className="w-[12%]" />
                <col className="w-[12%]" />
                <col className="w-[18%]" />
              </colgroup>
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  {(
                    [
                      ["Nombre", "name"],
                      ["Estado", "estado"],
                    ] as const
                  ).map(([label, key]) => (
                    <th key={key} className={`px-5 py-3 text-xs font-bold uppercase tracking-wider text-slate-500 ${key === "estado" ? "text-center" : "text-left"}`}>
                      <button
                        type="button"
                        className={`flex items-center gap-1.5 uppercase hover:text-slate-700 ${key === "estado" ? "mx-auto" : ""}`}
                        onClick={() => toggleGroupSort(key)}
                      >
                        {label}
                        {sort.key === key ? (
                          sort.dir === "asc" ? <ArrowUp size={13} /> : <ArrowDown size={13} />
                        ) : (
                          <ArrowUpDown size={13} className="text-slate-300" />
                        )}
                      </button>
                    </th>
                  ))}
                  <th className="px-5 py-3 text-center text-xs font-bold uppercase tracking-wider text-slate-500">Observación focal</th>
                  <th className="px-5 py-3 text-center text-xs font-bold uppercase tracking-wider text-slate-500">Postulantes</th>
                  <th className="px-5 py-3 text-center text-xs font-bold uppercase tracking-wider text-slate-500">Evaluadores</th>
                  <th className="px-5 py-3 text-center text-xs font-bold uppercase tracking-wider text-slate-500">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleGroups.map((group) => {
                  const meta = statusMeta[group.status] ?? {
                    label: group.status,
                    className: "bg-slate-100 text-slate-700",
                  };
                  const expanded = expandedId === group.groupId;
                  const canModify =
                    ["DRAFT", "CONFIRMED"].includes(group.status) &&
                    group.stage !== "FAMILY_INTERVIEW" &&
                    new Date(group.startsAt).getTime() > Date.now();
                  const members = group.memberIds
                    .map((id) => props.applications.find((application) => application.applicationId === id))
                    .filter(Boolean) as FlowApplication[];
                  const evaluators = group.evaluatorIds
                    .map((id) => props.professionals.find((professional) => professional.professionalId === id))
                    .filter(Boolean) as Professional[];

                  return (
                    <Fragment key={group.groupId}>
                      <tr className="align-middle">
                        <td className="px-5 py-4">
                          <p className="font-black text-slate-950">{group.code}</p>
                          <p className="mt-0.5 text-xs text-slate-500">{group.roomName}</p>
                          {group.clusters?.length ? (
                            <p className="mt-1.5 inline-flex max-w-full items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-xs font-bold text-violet-800">
                              <Layers size={11} className="shrink-0" aria-hidden="true" />
                              <span className="truncate">{group.clusters[0].name}</span>
                            </p>
                          ) : null}
                        </td>
                        <td className="px-5 py-4 text-center">
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-black ${meta.className}`}>
                            {meta.label}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-center">
                          <p className="flex items-center justify-center gap-1.5 text-sm text-slate-700">
                            <Clock3 size={13} className="text-slate-400" aria-hidden="true" />
                            {formatTime(group.startsAt, timeZone)}–{formatTime(group.endsAt, timeZone)}
                          </p>
                        </td>
                        <td className="px-5 py-4 text-center text-sm">
                          <b className="text-slate-950">{group.memberIds.length}/{group.capacity}</b>
                        </td>
                        <td className="px-5 py-4 text-center text-sm">
                          <b className="text-slate-950">{group.evaluatorIds.length}/{group.requiredEvaluators}</b>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex flex-wrap items-center justify-center gap-2">
                            <button
                              className="secondary !px-3 !py-2 text-xs"
                              onClick={() => setExpandedId(expanded ? null : group.groupId)}
                              aria-expanded={expanded}
                            >
                              Ver
                              {expanded ? <ChevronUp className="ml-1 inline" size={14} /> : <ChevronDown className="ml-1 inline" size={14} />}
                            </button>
                            <button
                              className="secondary !px-3 !py-2 text-xs"
                              disabled={props.busy || !canModify}
                              onClick={() => setEditor({ mode: "edit", group })}
                              title={canModify ? "Editar planificación" : "Sólo se editan grupos futuros en preparación o listos"}
                            >
                              <Pencil className="mr-1 inline" size={14} />Editar
                            </button>
                            {deletingId === group.groupId ? (
                              <>
                                <button
                                  className="min-h-9 rounded-lg bg-red-700 px-3 text-xs font-black text-white hover:bg-red-800 disabled:opacity-50"
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
                                <button className="secondary !px-3 !py-2 text-xs" onClick={() => setDeletingId(null)}>Cancelar</button>
                              </>
                            ) : (
                              <button
                                className="min-h-9 rounded-lg px-3 text-xs font-black text-red-700 hover:bg-red-50 disabled:text-red-300 disabled:hover:bg-transparent"
                                disabled={props.busy || !canModify}
                                onClick={() => setDeletingId(group.groupId)}
                                title={canModify ? "Eliminar grupo" : "Este grupo ya no se puede eliminar"}
                              >
                                <Trash2 className="mr-1 inline" size={14} />Eliminar
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                      {expanded && (
                        <tr>
                          <td colSpan={6} className="bg-slate-50 px-5 py-5">
                            <div className="grid gap-5 md:grid-cols-2">
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
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
      )}
    </div>
  );
}

type ClusterEditorState =
  | { mode: "create" }
  | { mode: "edit"; cluster: GroupCluster }
  | null;

// Traduce los códigos de conflicto del backend antes de que el mensaje llegue
// al manejador genérico, que solo conoce `error.message`.
async function callCluster<T>(work: () => Promise<T>): Promise<T> {
  try {
    return await work();
  } catch (reason) {
    if (reason instanceof ApiError) {
      throw new ApiError(reason.status, clusterErrorMessage(reason.code, reason.message), reason.code);
    }
    throw reason;
  }
}

function GroupClusters({
  processId,
  groups,
  clusters,
  clustersAvailable,
  date,
  journeys,
  busy,
  timeZone,
  onDateChange,
  onClusterAction,
}: {
  processId: string;
  groups: EvaluationGroup[];
  clusters: GroupCluster[];
  clustersAvailable: boolean;
  date: string;
  journeys: EvaluationJourney[];
  busy: boolean;
  timeZone: string;
  onDateChange: (date: string) => void;
  onClusterAction: (work: () => Promise<unknown>, success: string) => Promise<ClusterActionResult>;
}) {
  const [editor, setEditor] = useState<ClusterEditorState>(null);
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [formError, setFormError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState("");

  const activeGroups = groups.filter((group) => group.status !== "CANCELLED");
  const visibleClusters = clusters.filter(isActiveCluster);
  const sortedJourneys = [...journeys].sort((a, b) => a.date.localeCompare(b.date));
  const journeyId = journeys.find((journey) => journey.date === date)?.id ?? null;
  const formOpen = editor !== null;

  // Un grupo solo puede pertenecer a una agrupación: el backend rechaza el
  // resto por cruce de horarios, así que aquí se bloquean antes de enviar.
  const clusterByGroupId = useMemo(() => {
    const result = new Map<string, GroupCluster>();
    clusters.filter(isActiveCluster).forEach((cluster) =>
      cluster.groupIds.forEach((groupId) => result.set(groupId, cluster)),
    );
    return result;
  }, [clusters]);

  // Al cambiar de jornada, la lista y la selección corresponden a otro día.
  useEffect(() => {
    setEditor(null);
    setName("");
    setSelected(new Set());
    setFormError("");
    setDeletingId(null);
    setDeleteError("");
  }, [date]);

  function toggleGroup(groupId: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  }

  function openCreate() {
    setEditor({ mode: "create" });
    setName("");
    setSelected(new Set());
    setFormError("");
  }

  function openEdit(cluster: GroupCluster) {
    setEditor({ mode: "edit", cluster });
    setName(cluster.name);
    setSelected(new Set(cluster.groupIds));
    setFormError("");
  }

  function closeForm() {
    setEditor(null);
    setName("");
    setSelected(new Set());
    setFormError("");
  }

  async function saveCluster() {
    if (!editor) return;
    const trimmed = name.trim();
    const groupIds = [...selected];
    if (!trimmed || groupIds.length < CLUSTER_MIN_GROUPS) return;
    setFormError("");

    const result =
      editor.mode === "create"
        ? journeyId
          ? await onClusterAction(
              () =>
                callCluster(() =>
                  prekinderApi.createGroupCluster({
                    processId,
                    evaluationDayId: journeyId,
                    name: trimmed,
                    groupIds,
                  }),
                ),
              `Agrupación ${trimmed} creada.`,
            )
          : { ok: false as const, error: "Selecciona una jornada de evaluación antes de crear la agrupación." }
        : await onClusterAction(
            () =>
              callCluster(() =>
                prekinderApi.updateGroupCluster(editor.cluster.clusterId, {
                  name: trimmed,
                  groupIds,
                  reason: "Actualización desde gestión de agrupaciones",
                  expectedVersion: editor.cluster.version,
                }),
              ),
            `Agrupación ${trimmed} actualizada.`,
          );

    if (result.ok) closeForm();
    else setFormError(result.error ?? "No pudimos guardar la agrupación.");
  }

  async function removeCluster(cluster: GroupCluster) {
    setDeleteError("");
    const result = await onClusterAction(
      () => callCluster(() => prekinderApi.deleteGroupCluster(cluster.clusterId, cluster.version)),
      `Agrupación ${cluster.name} eliminada.`,
    );
    if (result.ok) setDeletingId(null);
    else setDeleteError(result.error ?? "No pudimos eliminar la agrupación.");
  }

  const canSave = Boolean(name.trim()) && selected.size >= CLUSTER_MIN_GROUPS;
  const canCreate = clustersAvailable && activeGroups.length >= CLUSTER_MIN_GROUPS && Boolean(journeyId);

  return (
    <div className="space-y-5">
      {sortedJourneys.length ? (
        <label className="flex min-h-9 w-fit items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm text-gray-600">
          <CalendarDays className="h-4 w-4 shrink-0 text-gray-500" aria-hidden="true" />
          <span className="shrink-0">Jornada de evaluación</span>
          <select
            className="min-w-0 bg-transparent text-sm font-semibold text-gray-950 outline-none"
            value={date}
            onChange={(event) => {
              if (event.target.value) onDateChange(event.target.value);
            }}
          >
            {!sortedJourneys.some((journey) => journey.date === date) && (
              <option value={date}>{formatDay(date, timeZone)}</option>
            )}
            {sortedJourneys.map((journey) => (
              <option key={journey.id} value={journey.date}>{journey.name} · {formatDay(journey.date, timeZone)}</option>
            ))}
          </select>
        </label>
      ) : (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">
          <CalendarDays className="h-4 w-4 shrink-0" aria-hidden="true" />
          Aún no hay jornadas de evaluación.
        </div>
      )}

      {!clustersAvailable && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          No pudimos cargar las agrupaciones de esta jornada. Vuelve a intentar en unos minutos.
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex flex-wrap items-start justify-between gap-4 p-6">
          <div>
            <h2 className="text-lg font-black">
              {editor?.mode === "edit" ? `Editar ${editor.cluster.name}` : "Crear agrupación"}
            </h2>
            <p className="mt-1 text-sm leading-5 text-slate-600">
              {editor?.mode === "edit"
                ? "Cambia el nombre o los grupos que componen la agrupación."
                : `Une ${CLUSTER_MIN_GROUPS} o más grupos de evaluación en una sola agrupación.`}
            </p>
          </div>
          {formOpen ? (
            <button className="secondary shrink-0 !px-3" onClick={closeForm} aria-label="Cerrar formulario">
              <X size={18} />
            </button>
          ) : (
            <button
              className="primary shrink-0"
              disabled={busy || !canCreate}
              onClick={openCreate}
              title={canCreate ? undefined : `Necesitas una jornada con al menos ${CLUSTER_MIN_GROUPS} grupos activos`}
            >
              <Plus className="mr-2 inline" size={17} />
              Nueva agrupación
            </button>
          )}
        </div>
        <div className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${formOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
          <div className="overflow-hidden">
            {formOpen && (
              <div className="border-t border-slate-200">
                <div className="grid gap-5 p-6 lg:grid-cols-2">
                  <div className="grid content-start gap-4">
                    <Field label="Nombre de la agrupación">
                      <input
                        className="control w-full"
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        placeholder="Ej. Bloque mañana - Salas A y B"
                        maxLength={120}
                      />
                    </Field>
                  </div>
                  <fieldset className="min-w-0">
                    <legend className="mb-2 flex w-full items-center justify-between gap-3 text-sm font-black text-slate-900">
                      Grupos a incluir<span className="text-blue-700">{selected.size} seleccionados</span>
                    </legend>
                    <div className="max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-2">
                      {!activeGroups.length ? (
                        <p className="p-3 text-sm leading-6 text-slate-500">No hay grupos activos para agrupar.</p>
                      ) : (
                        activeGroups.map((group) => {
                          const checked = selected.has(group.groupId);
                          const owner = clusterByGroupId.get(group.groupId);
                          const takenBy =
                            owner && owner.clusterId !== (editor?.mode === "edit" ? editor.cluster.clusterId : null)
                              ? owner
                              : null;
                          return (
                            <label
                              key={group.groupId}
                              className={`flex items-start gap-3 rounded-lg p-2.5 ${takenBy ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:bg-white"}`}
                            >
                              <input
                                className="mt-1 h-4 w-4 accent-blue-700"
                                type="checkbox"
                                checked={checked}
                                disabled={Boolean(takenBy)}
                                onChange={() => toggleGroup(group.groupId)}
                              />
                              <span className="min-w-0">
                                <b className="block truncate text-sm text-slate-900">{group.code}</b>
                                <small className="block truncate text-slate-500">
                                  {group.roomName} · {formatTime(group.startsAt, timeZone)}
                                  {takenBy ? ` · Ya está en ${takenBy.name}` : ""}
                                </small>
                              </span>
                            </label>
                          );
                        })
                      )}
                    </div>
                    {selected.size > 0 && selected.size < CLUSTER_MIN_GROUPS && (
                      <p className="mt-2 text-sm font-semibold text-amber-800">
                        Selecciona al menos {CLUSTER_MIN_GROUPS} grupos.
                      </p>
                    )}
                  </fieldset>
                </div>
                {formError && (
                  <p className="px-6 pb-4 text-sm font-semibold text-red-700" role="alert">{formError}</p>
                )}
                <div className="flex justify-end gap-2 border-t border-slate-200 p-6">
                  <button className="secondary" onClick={closeForm}>Cancelar</button>
                  <button className="primary" disabled={busy || !canSave} onClick={() => void saveCluster()}>
                    {busy ? "Guardando…" : editor?.mode === "edit" ? "Guardar cambios" : "Crear agrupación"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {!visibleClusters.length ? (
          <div className="px-5 py-14 text-center">
            <Layers className="mx-auto text-slate-300" size={36} />
            <h2 className="mt-3 text-lg font-black text-slate-900">Aún no hay agrupaciones</h2>
            <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-slate-500">
              {activeGroups.length >= CLUSTER_MIN_GROUPS
                ? `Selecciona ${CLUSTER_MIN_GROUPS} o más grupos arriba y crea la primera agrupación.`
                : `Esta jornada necesita al menos ${CLUSTER_MIN_GROUPS} grupos activos para poder agruparlos.`}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {visibleClusters.map((cluster) => {
              const meta = statusMeta[cluster.status] ?? {
                label: cluster.status,
                className: "bg-slate-100 text-slate-700",
              };
              const members = cluster.groups.filter((group) => group.status !== "CANCELLED");
              const removed = cluster.groups.length - members.length;
              const confirming = deletingId === cluster.clusterId;
              return (
                <article key={cluster.clusterId} className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="flex flex-wrap items-center gap-2 text-base font-black text-slate-950">
                        {cluster.name}
                        <span className={`rounded-full px-2.5 py-1 text-xs font-black ${meta.className}`}>{meta.label}</span>
                      </h3>
                      <p className="mt-1 text-sm text-slate-500">
                        {cluster.groupCount} grupos · {cluster.memberCount} postulantes · {cluster.evaluatorCount} evaluadores
                        {cluster.startsAt && cluster.endsAt
                          ? ` · ${formatTime(cluster.startsAt, timeZone)}–${formatTime(cluster.endsAt, timeZone)}`
                          : ""}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        className="secondary !px-3 !py-2 text-xs"
                        disabled={busy || confirming}
                        onClick={() => openEdit(cluster)}
                      >
                        <Pencil className="mr-1 inline" size={14} />Editar
                      </button>
                      {confirming ? (
                        <>
                          <button
                            className="min-h-9 rounded-lg bg-red-700 px-3 text-xs font-black text-white hover:bg-red-800 disabled:opacity-50"
                            disabled={busy}
                            onClick={() => void removeCluster(cluster)}
                          >
                            Confirmar
                          </button>
                          <button
                            className="secondary !px-3 !py-2 text-xs"
                            onClick={() => {
                              setDeletingId(null);
                              setDeleteError("");
                            }}
                          >
                            Cancelar
                          </button>
                        </>
                      ) : (
                        <button
                          className="min-h-9 rounded-lg px-3 text-xs font-black text-red-700 hover:bg-red-50 disabled:text-red-300 disabled:hover:bg-transparent"
                          disabled={busy}
                          onClick={() => {
                            setDeletingId(cluster.clusterId);
                            setDeleteError("");
                          }}
                        >
                          <Trash2 className="mr-1 inline" size={14} />Eliminar
                        </button>
                      )}
                    </div>
                  </div>
                  {confirming && deleteError && (
                    <p className="mt-2 text-sm font-semibold text-red-700" role="alert">{deleteError}</p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {members.map((group) => (
                      <span key={group.groupId} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                        {group.code} · {group.roomName} · {formatTime(group.startsAt, timeZone)}
                      </span>
                    ))}
                    {removed > 0 && (
                      <span className="rounded-full bg-slate-50 px-3 py-1 text-xs font-bold text-slate-400">
                        {removed} grupo{removed === 1 ? "" : "s"} eliminado{removed === 1 ? "" : "s"}
                      </span>
                    )}
                  </div>
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
  const timeZone = props.configuration?.scheduleTimezone ?? "America/Santiago";
  const [stage, setStage] = useState<EvaluationGroup["stage"]>(editing?.stage ?? "GROUP_3");
  const [roomId, setRoomId] = useState(editing?.roomId ?? "");
  const [time, setTime] = useState(editing ? formatTime(editing.startsAt, timeZone) : "09:00");
  const [code, setCode] = useState(editing?.code ?? "");
  const [capacity, setCapacity] = useState(editing?.capacity ?? props.configuration?.academicGroupSize ?? 3);
  const [requiredEvaluators, setRequiredEvaluators] = useState(editing?.requiredEvaluators ?? props.configuration?.academicRequiredEvaluators ?? 3);
  const [memberIds, setMemberIds] = useState<string[]>(editing?.memberIds ?? []);
  const [evaluatorIds, setEvaluatorIds] = useState<string[]>(editing?.evaluatorIds ?? []);

  const startCandidate = props.date && time ? new Date(`${props.date}T${time}:00`) : null;
  const startsAt = startCandidate && !Number.isNaN(startCandidate.getTime())
    ? startCandidate.toISOString()
    : null;
  const endsAt = startsAt
    ? new Date(new Date(startsAt).getTime() + (props.configuration?.scheduleBlockMinutes ?? 30) * 60_000).toISOString()
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
      (application.status === "READY_TO_SCHEDULE" ||
        application.status === "SCHEDULED" ||
        editing?.memberIds.includes(application.applicationId)) &&
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
            durationMinutes: props.configuration?.scheduleBlockMinutes ?? 30,
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
        durationMinutes: props.configuration?.scheduleBlockMinutes ?? 30,
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
    <div className="border-t border-slate-200">
      <div className="grid gap-5 p-5 lg:grid-cols-2">
        <div className="grid content-start gap-4 sm:grid-cols-2">
          <Field label="Nombre del grupo">
            <input className="control w-full" value={code} disabled={Boolean(editing)} onChange={(event) => setCode(event.target.value)} placeholder="G3-01" />
          </Field>
          <Field label="Tipo de evaluación">
            <div className="relative">
              <select
                className="control w-full appearance-none pr-9"
                value={stage}
                disabled={Boolean(editing)}
                onChange={(event) => {
                  const next = event.target.value as EvaluationGroup["stage"];
                  setStage(next);
                  setCapacity(next === "GROUP_3"
                    ? props.configuration?.academicGroupSize ?? 3
                    : props.configuration?.psychomotorGroupSize ?? 9);
                  setRequiredEvaluators(next === "GROUP_3"
                    ? props.configuration?.academicRequiredEvaluators ?? 3
                    : props.configuration?.psychomotorRequiredEvaluators ?? 6);
                  setMemberIds([]);
                  setEvaluatorIds([]);
                }}
              >
                <option value="GROUP_3">Observación focal · base 3</option>
                <option value="GROUP_9">Interacción grupal · base 9</option>
              </select>
              <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" aria-hidden="true" />
            </div>
          </Field>
          <Field label="Jornada de evaluación">
            <div className="relative">
              <select
                className={`control w-full appearance-none pr-9 ${props.date ? "text-gray-900" : "text-gray-400"}`}
                required
                value={props.date}
                onChange={(event) => {
                  if (event.target.value) props.onDateChange(event.target.value);
                }}
              >
                {!props.journeys.length && <option value="">Sin jornadas de evaluación</option>}
                {!props.journeys.some((journey) => journey.date === props.date) && props.date && (
                  <option value={props.date}>{formatDay(props.date, timeZone)}</option>
                )}
                {[...props.journeys].sort((a, b) => a.date.localeCompare(b.date)).map((journey) => (
                  <option key={journey.id} value={journey.date}>{journey.name} · {formatDay(journey.date, timeZone)}</option>
                ))}
              </select>
              <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" aria-hidden="true" />
            </div>
          </Field>
          <Field label="Sala">
            <div className="relative">
              <select className={`control w-full appearance-none pr-9 ${roomId ? "text-gray-900" : "text-gray-400"}`} value={roomId} onChange={(event) => setRoomId(event.target.value)}>
                <option value="">Seleccionar sala</option>
                {props.rooms.filter((item) => item.active).map((item) => (
                  <option key={item.roomId} value={item.roomId}>{item.name} · cap. {item.capacity}</option>
                ))}
              </select>
              <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" aria-hidden="true" />
            </div>
          </Field>
          <Field label="Hora de inicio">
            <input className="control w-full" type="time" value={time} onChange={(event) => setTime(event.target.value)} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Máximo de postulantes">
              <input className="control w-full" type="number" min={1} max={room?.capacity ?? 30} value={capacity} onChange={(event) => setCapacity(Number(event.target.value))} />
            </Field>
            <Field label="Evaluadores requeridos">
              <input className="control w-full" type="number" min={1} max={12} value={requiredEvaluators} onChange={(event) => setRequiredEvaluators(Number(event.target.value))} />
            </Field>
          </div>
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
        <p className="flex flex-wrap items-center gap-1.5 text-sm font-semibold text-red-700" role="status">
          ¿No encuentras la jornada que buscas? Puedes crearla acá:
          <button
            type="button"
            className="inline-flex items-center gap-1 font-bold text-red-700 underline hover:text-red-800"
            onClick={props.onGoToControlTower}
          >
            Ir a Torre de control <ArrowRight size={13} />
          </button>
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
    </div>
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
