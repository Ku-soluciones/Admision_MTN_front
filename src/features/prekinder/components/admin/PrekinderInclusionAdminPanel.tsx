import { useEffect, useState } from "react";
import { History, Pencil, RefreshCw, X } from "lucide-react";
import {
  ApiError,
  prekinderApi,
  type AdminInclusionView,
  type FlowApplication,
} from "../../services/api";

const responseFields = [
  ["backgroundSummary", "Antecedentes relevantes"],
  ["currentSupports", "Apoyos actuales"],
  ["relevantDocuments", "Documentos o información relevante"],
] as const;

function answer(value: unknown): string {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

function errorMessage(error: unknown): string {
  return error instanceof ApiError || error instanceof Error
    ? error.message
    : "No pudimos completar la operación.";
}

export function PrekinderInclusionAdminPanel({
  application,
  onClose,
  onApplicationChanged,
}: {
  application: FlowApplication;
  onClose: () => void;
  onApplicationChanged?: () => void | Promise<void>;
}) {
  const [view, setView] = useState<AdminInclusionView | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [mode, setMode] = useState<"VIEW" | "REQUEST" | "EDIT">("VIEW");
  const [reason, setReason] = useState("");
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  async function load() {
    setLoading(true);
    setError("");
    try {
      const result = await prekinderApi.adminInclusion(application.applicationId);
      setView(result);
      setAnswers(Object.fromEntries(responseFields.map(([key]) => [key, answer(result.current.declaration[key])])));
    } catch (loadError) {
      setError(errorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setView(null);
    setMode("VIEW");
    setReason("");
    setSelectedFields([]);
    setAnswers({});
    setMessage("");
    void load();
  }, [application.applicationId]);

  async function requestCorrection() {
    if (!reason.trim() || selectedFields.length === 0) {
      setError("Selecciona al menos un campo e indica el motivo de la corrección.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await prekinderApi.requestCorrections(
        application.applicationId,
        selectedFields.map((field) => `inclusion.${field}`),
        reason.trim(),
        application.version,
      );
      setMessage("Solicitud de corrección enviada exclusivamente para este postulante.");
      setMode("VIEW");
      setReason("");
      setSelectedFields([]);
      await onApplicationChanged?.();
    } catch (saveError) {
      setError(errorMessage(saveError));
    } finally {
      setSaving(false);
    }
  }

  async function directEdit() {
    if (!view || !reason.trim()) {
      setError("Debes indicar el motivo de la corrección administrativa.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const updated = await prekinderApi.correctInclusion(
        application.applicationId,
        answers,
        reason.trim(),
        view.current.version,
      );
      setView(updated);
      setMessage(updated.processOpen
        ? "Corrección administrativa guardada y auditada."
        : "Corrección excepcional en proceso cerrado guardada y auditada.");
      setMode("VIEW");
      setReason("");
    } catch (saveError) {
      setError(errorMessage(saveError));
    } finally {
      setSaving(false);
    }
  }

  const applicant = view?.current.applicant;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/40" role="presentation" onMouseDown={onClose}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="inclusion-panel-title"
        className="h-full w-full max-w-3xl overflow-y-auto bg-slate-50 shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-200 bg-white px-6 py-5">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-blue-700">Ficha del postulante</p>
            <h2 id="inclusion-panel-title" className="mt-1 text-xl font-black">Inclusión</h2>
          </div>
          <button type="button" className="rounded-lg p-2 hover:bg-slate-100" onClick={onClose} aria-label="Cerrar inclusión">
            <X size={20} />
          </button>
        </header>

        <div className="space-y-5 p-6">
          {loading && <p className="text-sm text-slate-500">Cargando formulario e historial…</p>}
          {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}
          {message && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">{message}</p>}

          {view && applicant && (
            <>
              <section className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-black text-slate-950">{applicant.fullName}</h3>
                    <p className="mt-1 text-sm text-slate-600">
                      RUT {applicant.maskedRut} · {applicant.processName} {applicant.academicYear}
                      {applicant.folio ? ` · Folio ${applicant.folio}` : ""}
                    </p>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-extrabold text-slate-700">
                    {view.current.declared ? "Enviado" : "Sin envío"} · versión {view.current.version}
                  </span>
                </div>
                <p className="mt-3 text-xs font-semibold text-blue-900">Este formulario pertenece únicamente a esta postulación.</p>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="font-black">Formulario vigente</h3>
                    <p className="mt-1 text-sm text-slate-500">
                      Consentimiento: {view.current.consentStatus} · Entrevista: {view.current.specificInterviewStatus}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" className="secondary" onClick={() => { setMode("REQUEST"); setError(""); setMessage(""); }}>
                      <RefreshCw size={15} /> Solicitar corrección
                    </button>
                    {view.canDirectEdit && (
                      <button type="button" className="primary" onClick={() => { setMode("EDIT"); setError(""); setMessage(""); }}>
                        <Pencil size={15} /> Editar respuestas
                      </button>
                    )}
                  </div>
                </div>

                {mode === "VIEW" && (
                  <dl className="mt-5 grid gap-4">
                    {responseFields.map(([key, label]) => (
                      <div key={key}>
                        <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</dt>
                        <dd className="mt-1 whitespace-pre-wrap text-sm text-slate-800">{answer(view.current.declaration[key]) || "Sin respuesta"}</dd>
                      </div>
                    ))}
                  </dl>
                )}

                {mode === "REQUEST" && (
                  <div className="mt-5 space-y-4 border-t border-slate-100 pt-5">
                    <p className="text-sm font-semibold">Campos que la familia podrá corregir para este hijo:</p>
                    {responseFields.map(([key, label]) => (
                      <label key={key} className="flex items-center gap-3 text-sm">
                        <input
                          type="checkbox"
                          checked={selectedFields.includes(key)}
                          onChange={(event) => setSelectedFields((current) => event.target.checked ? [...current, key] : current.filter((item) => item !== key))}
                        />
                        {label}
                      </label>
                    ))}
                    <textarea className="control min-h-24 w-full" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Motivo obligatorio" />
                    <div className="flex justify-end gap-2">
                      <button className="secondary" type="button" onClick={() => setMode("VIEW")}>Cancelar</button>
                      <button className="primary" type="button" disabled={saving} onClick={() => void requestCorrection()}>Enviar solicitud</button>
                    </div>
                  </div>
                )}

                {mode === "EDIT" && (
                  <div className="mt-5 space-y-4 border-t border-slate-100 pt-5">
                    {!view.processOpen && <p className="rounded-xl bg-amber-50 p-3 text-sm font-semibold text-amber-800">El proceso está cerrado. Esta edición quedará registrada como corrección excepcional.</p>}
                    {responseFields.map(([key, label]) => (
                      <label key={key} className="block text-sm font-bold text-slate-700">
                        {label}
                        <textarea className="control mt-1 min-h-24 w-full font-normal" value={answers[key] ?? ""} onChange={(event) => setAnswers((current) => ({ ...current, [key]: event.target.value }))} />
                      </label>
                    ))}
                    <label className="block text-sm font-bold text-slate-700">
                      Motivo de la edición
                      <textarea className="control mt-1 min-h-20 w-full font-normal" value={reason} onChange={(event) => setReason(event.target.value)} />
                    </label>
                    <p className="text-xs text-slate-500">El consentimiento, el postulante y la asociación no pueden modificarse desde esta acción.</p>
                    <div className="flex justify-end gap-2">
                      <button className="secondary" type="button" onClick={() => setMode("VIEW")}>Cancelar</button>
                      <button className="primary" type="button" disabled={saving} onClick={() => void directEdit()}>Guardar corrección</button>
                    </div>
                  </div>
                )}
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-5">
                <h3 className="flex items-center gap-2 font-black"><History size={18} /> Historial de revisiones</h3>
                <ol className="mt-5 space-y-4">
                  {view.revisions.map((revision) => (
                    <li key={revision.revisionId} className="border-l-2 border-blue-200 pl-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-extrabold">Revisión {revision.revisionNumber} · {revision.changeOrigin === "ADMIN_DIRECT_EDIT" ? "Edición administrativa" : "Familia"}</p>
                        <time className="text-xs text-slate-500">{new Date(revision.createdAt).toLocaleString("es-CL")}</time>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">{revision.authorName || revision.authorId} · {revision.authorRole}</p>
                      {revision.reason && <p className="mt-2 rounded-lg bg-slate-50 p-2 text-sm"><strong>Motivo:</strong> {revision.reason}</p>}
                      <dl className="mt-3 grid gap-2">
                        {responseFields.map(([key, label]) => (
                          <div key={key} className="text-sm"><dt className="font-bold text-slate-600">{label}</dt><dd className="whitespace-pre-wrap text-slate-700">{answer(revision.declaration[key]) || "Sin respuesta"}</dd></div>
                        ))}
                      </dl>
                    </li>
                  ))}
                  {!view.revisions.length && <li className="text-sm text-slate-500">Aún no hay revisiones.</li>}
                </ol>
              </section>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
