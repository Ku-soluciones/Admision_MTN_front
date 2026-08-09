import { useMemo, useState } from "react";
import { Check, CheckCircle2, ChevronRight, UserCheck } from "lucide-react";
import type { EvaluationGroup, FlowApplication, Room } from "../../services/api";

type Props = {
  groups: EvaluationGroup[];
  applications: FlowApplication[];
  rooms: Room[];
};

type Screen = "agenda" | "confirm" | "evaluate";
type Score = 0 | 1 | 2 | 3 | 4 | "NOT_OBSERVED";

const criteria = [
  { title: "Información", description: "Reconoce, relaciona y clasifica información presentada." },
  { title: "Clasificación", description: "Agrupa elementos según una característica observable." },
  { title: "Seriación", description: "Ordena elementos utilizando una secuencia o magnitud." },
  { title: "Patrones", description: "Identifica y continúa patrones simples." },
  { title: "Lenguaje comprensivo", description: "Comprende instrucciones y conceptos verbales." },
  { title: "Lenguaje expresivo", description: "Comunica ideas utilizando vocabulario pertinente." },
  { title: "Atención verbal", description: "Mantiene la atención durante una consigna oral." },
  { title: "Memoria de trabajo", description: "Retiene información breve para completar una tarea." },
  { title: "Resolución de problemas", description: "Explora alternativas frente a una tarea nueva." },
  { title: "Autonomía en la tarea", description: "Inicia y completa la actividad con mediación adecuada." },
] as const;

const statusLabel: Record<string, string> = {
  DRAFT: "Pendiente", RECEPTION: "Recepción", CONFIRMED: "Listo",
  IN_PROGRESS: "En curso", REVIEW: "En revisión", COMPLETED: "Validado",
};

function fullName(app: FlowApplication) {
  return [app.identity.firstName, app.identity.paternalLastName, app.identity.maternalLastName].filter(Boolean).join(" ");
}

function initials(app: FlowApplication) {
  return `${app.identity.firstName?.[0] ?? ""}${app.identity.paternalLastName?.[0] ?? ""}`;
}

function formatTime(iso: string) {
  return new Intl.DateTimeFormat("es-CL", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "America/Santiago" }).format(new Date(iso));
}

export function AcademicEvaluatorConsole({ groups, applications, rooms }: Props) {
  const assignedRoom = rooms[0];
  const assignedGroups = useMemo(() => groups.filter((group) => !assignedRoom || group.roomId === assignedRoom.roomId).sort((a, b) => a.startsAt.localeCompare(b.startsAt)).slice(0, 7), [groups, assignedRoom]);
  const [screen, setScreen] = useState<Screen>("agenda");
  const [selectedId, setSelectedId] = useState(assignedGroups[0]?.groupId ?? "");
  const [criterionIndex, setCriterionIndex] = useState(0);
  const [responses, setResponses] = useState<Record<string, Record<number, Record<string, Score>>>>({});
  const [submitted, setSubmitted] = useState<Record<string, boolean>>({});
  const group = assignedGroups.find((item) => item.groupId === selectedId) ?? assignedGroups[0];
  const members = group?.memberIds.map((id) => applications.find((app) => app.applicationId === id)).filter(Boolean) as FlowApplication[] | undefined;

  const openGroup = (id: string) => { setSelectedId(id); setCriterionIndex(0); setScreen("confirm"); };
  const setScore = (applicationId: string, value: Score) => {
    if (!group) return;
    setResponses((current) => ({ ...current, [group.groupId]: { ...(current[group.groupId] ?? {}), [criterionIndex]: { ...(current[group.groupId]?.[criterionIndex] ?? {}), [applicationId]: value } } }));
  };
  const currentResponses = group ? responses[group.groupId]?.[criterionIndex] ?? {} : {};
  const completed = members?.filter((app) => currentResponses[app.applicationId] !== undefined).length ?? 0;

  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-blue-200 bg-blue-50 p-4 text-blue-950">
      <div className="flex items-center gap-3"><UserCheck size={20} /><div><p className="text-sm font-black">Espacio exclusivo: Evaluador académico</p><p className="text-xs text-blue-800">Solo aparecen las asignaciones y la pauta académica correspondiente a este perfil.</p></div></div>
      <span className="rounded-lg bg-white px-3 py-2 text-xs font-black text-blue-800">{assignedRoom?.name ?? "Sala sin asignar"}</span>
    </div>

    {screen === "agenda" && <Agenda groups={assignedGroups} applications={applications} submitted={submitted} onOpen={openGroup} />}
    {screen === "confirm" && group && members && <ConfirmGroup group={group} members={members} onBack={() => setScreen("agenda")} onStart={() => setScreen("evaluate")} />}
    {screen === "evaluate" && group && members && <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[0.14em] text-blue-700">{formatTime(group.startsAt)} · {group.roomName} · {group.code}</p><h2 className="mt-1 text-3xl font-black text-slate-950">Evaluación académica</h2><p className="mt-1 text-sm text-slate-600">Un criterio a la vez, con los tres postulantes visibles en paralelo.</p></div><span className="rounded-xl bg-blue-50 px-4 py-3 text-sm font-black text-blue-900">Criterio {criterionIndex + 1} de {criteria.length}</span></div>
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_12px_32px_rgba(15,23,42,0.05)]">
        <div className="flex flex-wrap items-center gap-4 border-b border-slate-200 p-5"><span className="grid h-14 w-14 place-items-center rounded-xl bg-blue-900 text-xl font-black text-white">{criterionIndex + 1}</span><div className="min-w-0 flex-1"><p className="text-xs font-bold text-slate-500">Pauta observable</p><h3 className="text-xl font-black text-slate-950">{criteria[criterionIndex].title}</h3><p className="mt-1 text-sm text-slate-600">{criteria[criterionIndex].description} “No observado” no equivale a cero.</p></div><strong className={completed === members.length ? "text-emerald-700" : "text-slate-500"}>{completed}/{members.length} completos</strong></div>
        <div className="grid gap-4 p-5 xl:grid-cols-3">{members.map((app) => <ApplicantScoring key={app.applicationId} app={app} value={currentResponses[app.applicationId]} onChange={(value) => setScore(app.applicationId, value)} />)}</div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 p-5"><button className="secondary" disabled={criterionIndex === 0} onClick={() => setCriterionIndex((current) => current - 1)}>Anterior</button><span className="flex items-center gap-2 text-sm font-semibold text-slate-500"><Check size={16} className="text-emerald-600" />Guardado automático local</span>{criterionIndex < criteria.length - 1 ? <button className="primary" disabled={completed !== members.length} onClick={() => setCriterionIndex((current) => current + 1)}>Siguiente criterio <ChevronRight className="ml-1 inline" size={17} /></button> : <button className="primary" disabled={completed !== members.length} onClick={() => { setSubmitted((current) => ({ ...current, [group.groupId]: true })); setScreen("agenda"); }}><CheckCircle2 className="mr-2 inline" size={17} />Enviar a revisión</button>}</div>
      </section>
    </div>}
  </div>;
}

function Agenda({ groups, applications, submitted, onOpen }: { groups: EvaluationGroup[]; applications: FlowApplication[]; submitted: Record<string, boolean>; onOpen: (id: string) => void }) {
  return <div><div className="mb-5"><p className="text-xs font-black uppercase tracking-[0.14em] text-blue-700">Espacio del evaluador</p><h2 className="mt-1 text-3xl font-black text-slate-950">Mi jornada</h2><p className="mt-1 text-sm text-slate-600">Solo ves los siete bloques asignados. Cada grupo contiene tres postulantes.</p></div>
    <div className="space-y-3">{groups.map((group) => { const names = group.memberIds.map((id) => applications.find((app) => app.applicationId === id)).filter(Boolean).map((app) => fullName(app as FlowApplication)); const label = submitted[group.groupId] ? "En revisión" : statusLabel[group.status] ?? group.status; return <button key={group.groupId} className="grid min-h-20 w-full items-center overflow-hidden rounded-xl border border-slate-200 bg-white text-left shadow-sm transition hover:border-blue-400 md:grid-cols-[110px_1fr_140px]" onClick={() => onOpen(group.groupId)}><time className="border-b border-slate-200 p-4 text-xl font-black text-slate-950 md:border-b-0 md:border-r">{formatTime(group.startsAt)}<small className="block text-xs font-bold text-slate-500">30 min</small></time><span className="min-w-0 p-4"><b className="block text-sm text-slate-900">{group.code} · {group.roomName}</b><small className="mt-1 block truncate text-slate-500">{names.join(" · ")}</small></span><span className="flex items-center justify-end gap-3 p-4"><i className="not-italic rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-800">{label}</i><ChevronRight size={19} /></span></button>; })}</div>
  </div>;
}

function ConfirmGroup({ group, members, onBack, onStart }: { group: EvaluationGroup; members: FlowApplication[]; onBack: () => void; onStart: () => void }) {
  return <div><div className="mb-5"><p className="text-xs font-black uppercase tracking-[0.14em] text-blue-700">{formatTime(group.startsAt)} · {group.roomName}</p><h2 className="mt-1 text-3xl font-black text-slate-950">Confirmar grupo</h2><p className="mt-1 text-sm text-slate-600">Antes de evaluar, verifica que los tres postulantes correspondan al bloque.</p></div>
    <section className="rounded-2xl border border-slate-200 bg-white"><div className="grid gap-4 p-5 md:grid-cols-3">{members.map((app, index) => <article key={app.applicationId} className="relative rounded-xl border border-slate-200 p-5 text-center"><span className="absolute left-3 top-3 grid h-6 w-6 place-items-center rounded bg-slate-100 text-xs font-black">{index + 1}</span><span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-blue-50 font-black text-blue-900">{initials(app)}</span><h3 className="mt-3 text-sm font-black text-slate-900">{fullName(app)}</h3><p className="mt-1 text-xs text-slate-500">{app.identity.rut}</p><p className="mt-3 text-xs font-bold text-emerald-700"><Check className="mr-1 inline" size={14} />Identidad confirmada</p></article>)}</div><div className="flex justify-end gap-2 border-t border-slate-200 p-5"><button className="secondary" onClick={onBack}>Volver</button><button className="primary" onClick={onStart}>Comenzar evaluación simultánea <ChevronRight className="ml-1 inline" size={17} /></button></div></section>
  </div>;
}

function ApplicantScoring({ app, value, onChange }: { app: FlowApplication; value?: Score; onChange: (value: Score) => void }) {
  const options: Array<{ value: Score; title: string; label: string }> = [
    { value: 0, title: "0", label: "No logrado" }, { value: 1, title: "1", label: "En proceso" },
    { value: 2, title: "2", label: "En proceso" }, { value: 3, title: "3", label: "En proceso" },
    { value: 4, title: "4", label: "Logrado" }, { value: "NOT_OBSERVED", title: "—", label: "No observado" },
  ];
  return <article className="rounded-xl border border-slate-200 p-4"><div className="flex items-center gap-3 border-b border-slate-200 pb-4"><span className="grid h-11 w-11 place-items-center rounded-full bg-blue-50 text-sm font-black text-blue-900">{initials(app)}</span><div><h4 className="font-black text-slate-900">{fullName(app)}</h4><p className="text-xs text-slate-500">{app.identity.rut}</p></div></div><div className="mt-4 grid grid-cols-2 gap-2">{options.map((option) => <button key={String(option.value)} className={`min-h-16 rounded-lg border p-2 transition ${value === option.value ? "border-2 border-blue-700 bg-blue-50 text-blue-950" : "border-slate-200 bg-white hover:border-blue-300"}`} onClick={() => onChange(option.value)}><b className="block text-lg">{option.title}</b><small className="text-slate-500">{option.label}</small></button>)}</div></article>;
}
