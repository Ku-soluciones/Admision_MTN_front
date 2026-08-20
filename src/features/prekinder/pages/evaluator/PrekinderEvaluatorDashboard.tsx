import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CalendarDays,
  ChevronRight,
  Clock3,
  RefreshCw,
  Users,
} from "lucide-react";
import {
  prekinderApi,
  type EvaluatorAssignment,
} from "../../services/api";
import { PrekinderEvaluatorLayout } from "../../components/evaluator/PrekinderEvaluatorLayout";
import type { SpecialtyProfile } from "../../components/evaluator/SpecialtyProfile";
import { PROFILE_LABELS, PROFILE_TO_SHORT_INSTRUMENT } from "../../components/evaluator/SpecialtyProfile";

function today() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Santiago",
  }).format(new Date());
}

function formatTime(iso: string) {
  return new Intl.DateTimeFormat("es-CL", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Santiago",
  }).format(new Date(iso));
}

interface PrekinderEvaluatorDashboardProps {
  profile: SpecialtyProfile;
}

export function PrekinderEvaluatorDashboard({ profile }: PrekinderEvaluatorDashboardProps) {
  const navigate = useNavigate();
  const [date, setDate] = useState(today());
  const [assignments, setAssignments] = useState<EvaluatorAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Check mock mode status
  const isMock = sessionStorage.getItem("pk-mock-mode") === "1";
  const isDebug = window.localStorage.getItem("prekinder-debug") === "1";
  console.debug("[DEBUG Dashboard] MOUNTED profile:", profile, "date:", date, "isMock:", isMock, "isDebug:", isDebug);

  async function load() {
    setLoading(true);
    setError("");
    try {
      console.debug("[DEBUG evaluatorAgenda] date:", date, "profile:", profile);
      const agendaData = await prekinderApi.evaluatorAgenda(date, PROFILE_TO_SHORT_INSTRUMENT[profile]);
      console.debug("[DEBUG evaluatorAgenda] response:", JSON.stringify(agendaData, null, 2));
      setAssignments(agendaData.assignments);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Error al cargar datos");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [date, profile]);

  const myGroups = assignments;

  return (
    <PrekinderEvaluatorLayout profile={profile}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {PROFILE_LABELS[profile]}
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Portal del Evaluador · Prekínder
            </p>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm">
              <CalendarDays className="h-4 w-4 text-gray-500" />
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-2"
              />
            </label>
            <button
              onClick={() => void load()}
              disabled={loading}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Actualizar
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {error}
          </div>
        )}

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-blue-100">
                <CalendarDays className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{myGroups.length}</p>
                <p className="text-sm text-gray-500">Grupos asignados</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-green-100">
                <Users className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {myGroups.reduce((acc, assignment) => acc + assignment.reports.length, 0)}
                </p>
                <p className="text-sm text-gray-500">Postulantes</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-amber-100">
                <Clock3 className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {assignments.filter((assignment) =>
                    assignment.reports.some((report) =>
                      !["COMPLETED", "SUBMITTED", "VALIDATED", "LOCKED"].includes(report.status),
                    ),
                  ).length}
                </p>
                <p className="text-sm text-gray-500">Pendientes</p>
              </div>
            </div>
          </div>
        </div>

        {/* Groups List */}
        <div className="rounded-xl border border-gray-200 bg-white">
          <div className="border-b border-gray-200 px-5 py-4">
            <h2 className="text-lg font-bold text-gray-900">Mis Grupos de Hoy</h2>
            <p className="text-sm text-gray-500">
              {date === today() ? "Jornada de hoy" : `Fecha: ${date}`}
            </p>
          </div>
          {loading ? (
            <div className="flex items-center justify-center p-12">
              <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : myGroups.length === 0 ? (
            <div className="p-12 text-center">
              <CalendarDays className="mx-auto h-12 w-12 text-gray-300" />
              <p className="mt-4 text-sm font-medium text-gray-500">
                No hay grupos asignados para hoy
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {myGroups.map((assignment) => {
                const group = assignment.group;
                const members = assignment.reports;
                return (
                  <button
                    key={assignment.assignmentId}
                    onClick={() => navigate(`/prekinder/evaluador/${profile.toLowerCase().replace("_", "-")}/grupo/${group.groupId}?date=${date}`)}
                    className="flex w-full items-center gap-4 px-5 py-4 text-left hover:bg-gray-50"
                  >
                    <div className="grid h-14 w-14 place-items-center rounded-xl bg-blue-50">
                      <span className="text-lg font-bold text-blue-900">
                        {formatTime(group.startsAt)}
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-gray-900">
                        {group.code} · {group.roomName}
                      </p>
                      <p className="text-sm text-gray-500">
                        {members.length} postulante{members.length !== 1 ? "s" : ""}
                      </p>
                      <div className="mt-2 flex -space-x-2">
                        {members.slice(0, 5).map((m) => (
                          <div
                            key={m.applicationId}
                            className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700 ring-2 ring-white"
                            title={m.applicantName}
                          >
                            {m.applicantName.split(/\s+/).slice(0, 2).map((part) => part[0] ?? "").join("")}
                          </div>
                        ))}
                        {members.length > 5 && (
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-600 ring-2 ring-white">
                            +{members.length - 5}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${
                          group.status === "COMPLETED"
                            ? "bg-green-100 text-green-800"
                            : group.status === "IN_PROGRESS"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {group.status}
                      </span>
                      <ChevronRight className="h-5 w-5 text-gray-400" />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </PrekinderEvaluatorLayout>
  );
}
