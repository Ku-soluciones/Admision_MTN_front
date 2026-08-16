import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Clock3, Users } from "lucide-react";
import {
  prekinderApi,
  type EvaluatorAssignment,
} from "../../services/api";
import { PrekinderEvaluatorLayout } from "../../components/evaluator/PrekinderEvaluatorLayout";
import type { SpecialtyProfile } from "../../components/evaluator/SpecialtyProfile";
import { PROFILE_LABELS } from "../../components/evaluator/SpecialtyProfile";

function formatTime(iso: string) {
  return new Intl.DateTimeFormat("es-CL", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Santiago",
  }).format(new Date(iso));
}

function today() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Santiago",
  }).format(new Date());
}

interface PrekinderEvaluatorGroupPageProps {
  profile: SpecialtyProfile;
}

export function PrekinderEvaluatorGroupPage({ profile }: PrekinderEvaluatorGroupPageProps) {
  const { groupId = "" } = useParams();
  const navigate = useNavigate();
  const [group, setGroup] = useState<EvaluatorAssignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const agenda = await prekinderApi.evaluatorAgenda(today(), profile);
      const found = agenda.find(
        (item) => item.instrumentCode === profile && item.group.groupId === groupId,
      );
      setGroup(found ?? null);
      if (!found) {
        setError("Grupo no encontrado en la agenda de hoy.");
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Error al cargar el grupo");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [groupId, profile]);

  return (
    <PrekinderEvaluatorLayout profile={profile}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(`/prekinder/evaluador/${profile.toLowerCase().replace("_", "-")}`)}
            className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center p-12">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
          </div>
        ) : error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {error}
          </div>
        ) : group ? (
          <>
            {/* Group Info */}
            <div className="rounded-xl border border-gray-200 bg-white p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    {group.group.code} · {group.group.roomName}
                  </h1>
                  <p className="mt-1 text-sm text-gray-500">
                    {formatTime(group.group.startsAt)} – {formatTime(group.group.endsAt)}
                    {" · "}
                    {group.group.stage === "GROUP_3" ? "Observación focal" : "Interacción grupal"}
                  </p>
                </div>
                <span
                  className={`rounded-full px-4 py-2 text-sm font-bold ${
                    group.group.status === "COMPLETED"
                      ? "bg-green-100 text-green-800"
                      : group.group.status === "IN_PROGRESS"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {group.group.status}
                </span>
              </div>
            </div>

            {/* Stats */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-gray-200 bg-white p-5">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-lg bg-blue-100">
                    <Users className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">
                      {group.reports.length}
                    </p>
                    <p className="text-sm text-gray-500">Postulantes</p>
                  </div>
                </div>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-5">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-lg bg-green-100">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">
                      {group.reports.filter((r) => r.status === "COMPLETED").length}
                    </p>
                    <p className="text-sm text-gray-500">Completados</p>
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
                      {group.reports.filter((r) => r.status !== "COMPLETED").length}
                    </p>
                    <p className="text-sm text-gray-500">Pendientes</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Applicants List */}
            <div className="rounded-xl border border-gray-200 bg-white">
              <div className="border-b border-gray-200 px-6 py-4">
                <h2 className="text-lg font-bold text-gray-900">
                  Evaluación {PROFILE_LABELS[profile]}
                </h2>
                <p className="text-sm text-gray-500">
                  Selecciona un postulante para completar su evaluación
                </p>
              </div>
              <div className="divide-y divide-gray-100">
                {group.reports.map((report, index) => (
                  <button
                    key={report.reportId}
                    onClick={() =>
                      navigate(`/prekinder/evaluador/informe/${report.reportId}`)
                    }
                    className="flex w-full items-center gap-4 px-6 py-4 text-left hover:bg-gray-50"
                  >
                    <div className="grid h-12 w-12 place-items-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-gray-900">{report.applicantName}</p>
                      {report.rawScore !== null && (
                        <p className="text-sm text-gray-500">
                          Puntaje: {report.rawScore}/{report.maximumScore}
                        </p>
                      )}
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${
                        report.status === "COMPLETED"
                          ? "bg-green-100 text-green-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {report.status === "COMPLETED" ? "Completado" : "Pendiente"}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </>
        ) : null}
      </div>
    </PrekinderEvaluatorLayout>
  );
}
