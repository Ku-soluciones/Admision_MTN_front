import { useMemo, useState, type ReactNode } from "react";
import {
  ArrowDown,
  ArrowUp,
  Check,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";
import type {
  RubricDraftInput,
  RubricVersion,
} from "../../services/api";

type EditableOption = {
  clientId: string;
  value: string;
  label: string;
  descriptor: string;
  professionallyValidated: boolean;
};

type EditableCriterion = {
  clientId: string;
  code: string;
  name: string;
  descriptor: string;
  required: boolean;
  options: EditableOption[];
};

type EditorState = {
  name: string;
  instrumentCode: string;
  criteria: EditableCriterion[];
};

type RubricEditorProps = {
  version: RubricVersion;
  instrumentLabels: Record<string, string>;
  busy: boolean;
  onSave: (input: RubricDraftInput) => Promise<RubricVersion>;
  onPublish: () => Promise<void>;
  onDelete: () => Promise<void>;
  onClose: () => void;
};

function blankOption(value: number): EditableOption {
  return {
    clientId: crypto.randomUUID(),
    value: String(value),
    label: value === 0 ? "No observado" : `Nivel ${value}`,
    descriptor: "",
    professionallyValidated: false,
  };
}

function blankCriterion(position: number): EditableCriterion {
  return {
    clientId: crypto.randomUUID(),
    code: `CRITERIO_${position + 1}`,
    name: "",
    descriptor: "",
    required: true,
    options: [blankOption(0), blankOption(1)],
  };
}

function editorState(version: RubricVersion): EditorState {
  return {
    name: version.name,
    instrumentCode: version.instrumentCode,
    criteria: version.criteria.length
      ? version.criteria.map((criterion) => {
          // Sort options by value ascending to match validation requirement
          const sortedOptions = [...criterion.options].sort(
            (a, b) => Number(a.value) - Number(b.value),
          );
          return {
            clientId: criterion.criterionId || crypto.randomUUID(),
            code: criterion.code,
            name: criterion.name,
            descriptor: criterion.descriptor,
            required: criterion.required,
            options: sortedOptions.map((option) => ({
              clientId: option.optionId || crypto.randomUUID(),
              value: String(option.value),
              label: option.label,
              descriptor: option.descriptor,
              professionallyValidated: option.professionallyValidated,
            })),
          };
        })
      : [blankCriterion(0)],
  };
}

function validationError(state: EditorState): string | null {
  console.log("[DEBUG validationError] criteria count:", state.criteria.length);
  console.log("[DEBUG validationError] criteria:", JSON.stringify(state.criteria.map(c => ({ name: c.name, options: c.options.map(o => ({ value: o.value, label: o.label })) })), null, 2));
  if (!state.name.trim()) return "Escribe el nombre de la pauta.";
  if (!state.instrumentCode) return "Selecciona el instrumento de la pauta.";
  if (!state.criteria.length) return "Agrega al menos un criterio.";
  const codes = new Set<string>();
  for (let criterionIndex = 0; criterionIndex < state.criteria.length; criterionIndex += 1) {
    const criterion = state.criteria[criterionIndex];
    const label = `Criterio ${criterionIndex + 1}`;
    if (!criterion.code.trim() || !/^[A-Za-z0-9_]{1,64}$/.test(criterion.code.trim())) {
      return `${label}: usa un código de hasta 64 caracteres, sólo con letras, números y guion bajo.`;
    }
    const code = criterion.code.trim().toUpperCase();
    if (codes.has(code)) return `${label}: el código ${code} está repetido.`;
    codes.add(code);
    if (!criterion.name.trim()) return `${label}: escribe el nombre.`;
    if (!criterion.descriptor.trim()) return `${label}: explica qué debe observar el evaluador.`;
    if (criterion.options.length < 2) return `${label}: agrega al menos dos opciones de respuesta.`;
    let previous: number | null = null;
    for (let optionIndex = 0; optionIndex < criterion.options.length; optionIndex += 1) {
      const option = criterion.options[optionIndex];
      const value = Number(option.value);
      if (option.value.trim() === "" || !Number.isFinite(value) || value < 0) {
        return `${label}, opción ${optionIndex + 1}: ingresa un puntaje válido mayor o igual a cero.`;
      }
      if (previous !== null && value <= previous) {
        return `${label}: ordena las opciones con puntajes ascendentes y sin duplicados.`;
      }
      previous = value;
      if (!option.label.trim()) return `${label}, opción ${optionIndex + 1}: escribe la etiqueta.`;
      if (!option.descriptor.trim()) return `${label}, opción ${optionIndex + 1}: escribe el descriptor.`;
    }
  }
  return null;
}

function toInput(state: EditorState, revision: number): RubricDraftInput {
  return {
    name: state.name.trim(),
    instrumentCode: state.instrumentCode,
    expectedRubricVersion: revision,
    criteria: state.criteria.map((criterion) => ({
      code: criterion.code.trim().toUpperCase(),
      name: criterion.name.trim(),
      descriptor: criterion.descriptor.trim(),
      required: criterion.required,
      options: criterion.options.map((option) => ({
        value: Number(option.value),
        label: option.label.trim(),
        descriptor: option.descriptor.trim(),
        professionallyValidated: option.professionallyValidated,
      })),
    })),
  };
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="grid min-w-0 gap-1.5 text-sm font-bold text-slate-800"><span>{label}</span>{children}</label>;
}

export function RubricEditor({
  version,
  instrumentLabels,
  busy,
  onSave,
  onPublish,
  onDelete,
  onClose,
}: RubricEditorProps) {
  const initial = useMemo(() => editorState(version), [version.versionId]);
  const [state, setState] = useState(initial);
  const [revision, setRevision] = useState(version.rubricRevision);
  const [baseline, setBaseline] = useState(() => JSON.stringify(initial));
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const readOnly = version.status !== "DRAFT";
  const dirty = JSON.stringify(state) !== baseline;
  const maximumScore = state.criteria.reduce((total, criterion) => {
    const values = criterion.options.map((option) => Number(option.value)).filter(Number.isFinite);
    return total + (values.length ? Math.max(...values) : 0);
  }, 0);

  function updateCriterion(index: number, change: Partial<EditableCriterion>) {
    setSaved(false);
    setError("");
    setState((current) => ({
      ...current,
      criteria: current.criteria.map((criterion, criterionIndex) =>
        criterionIndex === index ? { ...criterion, ...change } : criterion),
    }));
  }

  function updateOption(criterionIndex: number, optionIndex: number, change: Partial<EditableOption>) {
    const criterion = state.criteria[criterionIndex];
    updateCriterion(criterionIndex, {
      options: criterion.options.map((option, currentIndex) =>
        currentIndex === optionIndex ? { ...option, ...change } : option),
    });
  }

  function moveCriterion(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= state.criteria.length) return;
    const criteria = [...state.criteria];
    [criteria[index], criteria[target]] = [criteria[target], criteria[index]];
    setSaved(false);
    setError("");
    setState((current) => ({ ...current, criteria }));
  }

  async function save() {
    const problem = validationError(state);
    if (problem) {
      setError(problem);
      return;
    }
    setError("");
    try {
      const payload = toInput(state, revision);
      console.log("[DEBUG SAVE] payload criteria:", JSON.stringify(payload.criteria, null, 2));
      const updated = await onSave(payload);
      const normalized = editorState(updated);
      setState(normalized);
      setBaseline(JSON.stringify(normalized));
      setRevision(updated.rubricRevision);
      setSaved(true);
    } catch (reason) {
      console.log("[DEBUG save ERROR] reason:", reason);
      setError(reason instanceof Error ? reason.message : "No pudimos guardar la pauta. Reintenta.");
    }
  }

  async function publish() {
    if (dirty) {
      setError("Guarda los cambios antes de publicar esta versión.");
      return;
    }
    setError("");
    try {
      await onPublish();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No pudimos publicar la pauta. Reintenta.");
    }
  }

  async function removeDraft() {
    setError("");
    try {
      await onDelete();
    } catch (reason) {
      setConfirmDelete(false);
      setError(reason instanceof Error ? reason.message : "No pudimos eliminar el borrador. Reintenta.");
    }
  }

  function close() {
    if (!readOnly && dirty) {
      setConfirmClose(true);
      return;
    }
    onClose();
  }

  return (
    <section className="overflow-hidden rounded-2xl bg-white shadow-[0_14px_34px_rgba(15,23,42,0.07)]" aria-labelledby="rubric-editor-title">
      <header className="relative border-b border-slate-200 bg-slate-950 py-5 pl-5 pr-16 text-white sm:pl-7 sm:pr-20">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-xs font-extrabold text-amber-300">
            <span>{readOnly ? "Vista protegida" : "Edición de borrador"}</span>
            <span aria-hidden="true">·</span>
            <span>Versión {version.version}</span>
          </div>
          <h2 id="rubric-editor-title" className="mt-2 break-words text-xl font-black sm:text-2xl">
            {state.name || "Nueva pauta sin nombre"}
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
            {readOnly
              ? "Esta versión publicada es inmutable. Revísala aquí o crea una nueva versión para modificarla."
              : "Define exactamente qué observar, las respuestas disponibles y el puntaje de cada nivel."}
          </p>
        </div>
        <button type="button" className="absolute right-3 top-3 grid min-h-11 min-w-11 place-items-center rounded-xl text-slate-200 transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300 sm:right-5 sm:top-4" onClick={close} aria-label="Cerrar editor">
          <X size={20} />
        </button>
      </header>

      <div className="grid gap-5 border-b border-slate-200 bg-slate-50 px-5 py-5 sm:grid-cols-2 sm:px-7 lg:grid-cols-[minmax(240px,1fr)_minmax(220px,0.65fr)_auto] lg:items-end">
        <Field label="Nombre de la pauta">
          <input className="control w-full" value={state.name} disabled={readOnly || busy} maxLength={160} onChange={(event) => { setSaved(false); setState((current) => ({ ...current, name: event.target.value })); }} />
        </Field>
        <Field label="Instrumento">
          <select className="control w-full" value={state.instrumentCode} disabled={readOnly || busy} onChange={(event) => { setSaved(false); setState((current) => ({ ...current, instrumentCode: event.target.value })); }}>
            {Object.entries(instrumentLabels).map(([code, label]) => <option key={code} value={code}>{label}</option>)}
          </select>
        </Field>
        <div className="flex gap-6 pb-2 text-sm">
          <span><b className="block text-lg text-slate-950">{state.criteria.length}</b><span className="text-slate-500">criterios</span></span>
          <span><b className="block text-lg text-slate-950">{maximumScore}</b><span className="text-slate-500">puntaje máximo</span></span>
        </div>
      </div>

      <div className="space-y-8 px-5 py-7 sm:px-7">
        {state.criteria.map((criterion, criterionIndex) => (
          <fieldset key={criterion.clientId} className="min-w-0 border-0 border-b border-slate-200 pb-8 last:border-b-0 last:pb-0" disabled={readOnly || busy}>
            <legend className="sr-only">Criterio {criterionIndex + 1}</legend>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-black text-slate-950">Criterio {criterionIndex + 1}</h3>
                <p className="text-sm text-slate-500">Se mostrará en este orden durante la evaluación.</p>
              </div>
              {!readOnly && <div className="flex gap-1">
                <button type="button" className="grid min-h-11 min-w-11 place-items-center rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-35" onClick={() => moveCriterion(criterionIndex, -1)} disabled={busy || criterionIndex === 0} aria-label={`Subir criterio ${criterionIndex + 1}`}><ArrowUp size={18} /></button>
                <button type="button" className="grid min-h-11 min-w-11 place-items-center rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-35" onClick={() => moveCriterion(criterionIndex, 1)} disabled={busy || criterionIndex === state.criteria.length - 1} aria-label={`Bajar criterio ${criterionIndex + 1}`}><ArrowDown size={18} /></button>
                <button type="button" className="grid min-h-11 min-w-11 place-items-center rounded-lg text-red-700 hover:bg-red-50 disabled:opacity-35" onClick={() => { setSaved(false); setError(""); setState((current) => ({ ...current, criteria: current.criteria.filter((_, index) => index !== criterionIndex) })); }} disabled={busy || state.criteria.length === 1} aria-label={`Eliminar criterio ${criterionIndex + 1}`}><Trash2 size={18} /></button>
              </div>}
            </div>

            <div className="grid gap-4 sm:grid-cols-[minmax(150px,0.45fr)_minmax(240px,1fr)]">
              <Field label="Código interno">
                <input className="control w-full uppercase" value={criterion.code} maxLength={64} onChange={(event) => updateCriterion(criterionIndex, { code: event.target.value.replace(/[^A-Za-z0-9_]/g, "_").toUpperCase() })} />
              </Field>
              <Field label="Nombre del criterio">
                <input className="control w-full" value={criterion.name} maxLength={160} placeholder="Ej. Sigue instrucciones simples" onChange={(event) => updateCriterion(criterionIndex, { name: event.target.value })} />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Qué debe observar el evaluador">
                  <textarea className="control min-h-24 w-full resize-y" value={criterion.descriptor} maxLength={2000} placeholder="Describe la conducta o evidencia observable, sin ambigüedades." onChange={(event) => updateCriterion(criterionIndex, { descriptor: event.target.value })} />
                </Field>
              </div>
              <label className="flex min-h-11 items-center gap-3 text-sm font-bold text-slate-800 sm:col-span-2">
                <input type="checkbox" className="h-5 w-5 rounded border-slate-300 text-blue-700 focus:ring-blue-700" checked={criterion.required} onChange={(event) => updateCriterion(criterionIndex, { required: event.target.checked })} />
                Respuesta obligatoria para completar la pauta
              </label>
            </div>

            <div className="mt-6 overflow-x-auto">
              <div className="min-w-[760px]">
                <div className="grid grid-cols-[90px_180px_minmax(260px,1fr)_150px_48px] gap-3 border-b border-slate-200 pb-2 text-xs font-black uppercase tracking-wide text-slate-500">
                  <span>Puntaje</span><span>Etiqueta</span><span>Descriptor observable</span><span>Validación</span><span className="sr-only">Acción</span>
                </div>
                {criterion.options.map((option, optionIndex) => (
                  <div key={option.clientId} className="grid grid-cols-[90px_180px_minmax(260px,1fr)_150px_48px] items-start gap-3 border-b border-slate-100 py-3 last:border-b-0">
                    <input type="number" min="0" step="0.01" className="control w-full" value={option.value} aria-label={`Puntaje de opción ${optionIndex + 1}`} onChange={(event) => updateOption(criterionIndex, optionIndex, { value: event.target.value })} />
                    <input className="control w-full" value={option.label} maxLength={160} aria-label={`Etiqueta de opción ${optionIndex + 1}`} onChange={(event) => updateOption(criterionIndex, optionIndex, { label: event.target.value })} />
                    <textarea className="control min-h-20 w-full resize-y" value={option.descriptor} maxLength={2000} aria-label={`Descriptor de opción ${optionIndex + 1}`} onChange={(event) => updateOption(criterionIndex, optionIndex, { descriptor: event.target.value })} />
                    <label className="flex min-h-11 items-center gap-2 text-xs font-bold text-slate-700">
                      <input type="checkbox" className="h-5 w-5 rounded border-slate-300 text-blue-700 focus:ring-blue-700" checked={option.professionallyValidated} onChange={(event) => updateOption(criterionIndex, optionIndex, { professionallyValidated: event.target.checked })} />
                      Profesional
                    </label>
                    {!readOnly && <button type="button" className="grid min-h-11 min-w-11 place-items-center rounded-lg text-red-700 hover:bg-red-50 disabled:opacity-35" onClick={() => updateCriterion(criterionIndex, { options: criterion.options.filter((_, index) => index !== optionIndex) })} disabled={busy || criterion.options.length === 2} aria-label={`Eliminar opción ${optionIndex + 1}`}><Trash2 size={17} /></button>}
                  </div>
                ))}
                {!readOnly && <button type="button" className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-black text-blue-800 hover:bg-blue-50" onClick={() => updateCriterion(criterionIndex, { options: [...criterion.options, blankOption(criterion.options.length)] })}><Plus size={17} />Agregar opción</button>}
              </div>
            </div>
          </fieldset>
        ))}

        {!readOnly && <button type="button" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-dashed border-blue-300 px-4 text-sm font-black text-blue-800 hover:border-blue-500 hover:bg-blue-50" disabled={busy} onClick={() => { setSaved(false); setState((current) => ({ ...current, criteria: [...current.criteria, blankCriterion(current.criteria.length)] })); }}><Plus size={18} />Agregar criterio</button>}
      </div>

      {(error || saved) && <div className={`mx-5 mb-5 flex items-start gap-2 rounded-xl p-4 text-sm font-semibold sm:mx-7 ${error ? "bg-red-50 text-red-800" : "bg-emerald-50 text-emerald-800"}`} role={error ? "alert" : "status"} aria-live="polite">
        {saved ? <Check className="mt-0.5 shrink-0" size={18} /> : null}
        <span>{error || "Borrador guardado. Los cambios ya están persistidos."}</span>
      </div>}

      {confirmClose && <div className="mx-5 mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-amber-50 p-4 text-sm font-semibold text-amber-950 sm:mx-7" role="alert">
        <span>Hay cambios sin guardar. Si sales ahora, perderás esta edición local.</span>
        <div className="flex gap-2"><button type="button" className="secondary min-h-11" onClick={() => setConfirmClose(false)}>Seguir editando</button><button type="button" className="primary min-h-11" onClick={onClose}>Descartar cambios</button></div>
      </div>}

      {confirmDelete && <div className="mx-5 mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-900 sm:mx-7" role="alert">
        <span>Se eliminará sólo este borrador. Las versiones publicadas permanecerán intactas.</span>
        <div className="flex gap-2"><button type="button" className="secondary min-h-11" disabled={busy} onClick={() => setConfirmDelete(false)}>Cancelar</button><button type="button" className="primary min-h-11 bg-red-700 hover:bg-red-800" disabled={busy} onClick={() => void removeDraft()}>{busy ? "Eliminando…" : "Sí, eliminar borrador"}</button></div>
      </div>}

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-5 py-5 sm:px-7">
        <div className="text-sm text-slate-600">
          {readOnly ? "Para editar, vuelve al catálogo y crea una nueva versión." : dirty ? "Hay cambios sin guardar." : "Todos los cambios están guardados."}
        </div>
        <div className="flex flex-wrap gap-2">
          {!readOnly && <button type="button" className="secondary inline-flex min-h-11 items-center gap-2 text-red-700" disabled={busy} onClick={() => setConfirmDelete(true)}><Trash2 size={17} />Eliminar borrador</button>}
          <button type="button" className="secondary min-h-11" disabled={busy} onClick={close}>{readOnly ? "Cerrar" : "Volver al catálogo"}</button>
          {!readOnly && <button type="button" className="secondary inline-flex min-h-11 items-center gap-2" disabled={busy || !dirty} onClick={() => void save()}><Save size={17} />{busy ? "Guardando…" : "Guardar borrador"}</button>}
          {!readOnly && <button type="button" className="primary min-h-11" disabled={busy || dirty || Boolean(validationError(state))} onClick={() => void publish()}>Publicar versión</button>}
        </div>
      </footer>
    </section>
  );
}

type RubricPreviewModalProps = {
  version: RubricVersion;
  instrumentLabels: Record<string, string>;
  onClose: () => void;
};

export function RubricPreviewModal({ version, instrumentLabels, onClose }: RubricPreviewModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="preview-title"
    >
      <div
        className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-white px-6 py-5 sm:px-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs font-extrabold text-slate-500">
                <span>Vista previa</span>
                <span aria-hidden="true">·</span>
                <span>{instrumentLabels[version.instrumentCode] ?? version.instrumentCode}</span>
                <span aria-hidden="true">·</span>
                <span>Versión {version.version}</span>
              </div>
              <h2 id="preview-title" className="mt-2 break-words text-xl font-black text-slate-950 sm:text-2xl">
                {version.name}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Así verá el evaluador esta pauta durante la evaluación.
              </p>
            </div>
            <button
              type="button"
              className="grid min-h-11 min-w-11 shrink-0 place-items-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-100"
              onClick={onClose}
              aria-label="Cerrar vista previa"
            >
              <X size={20} />
            </button>
          </div>
        </header>

        <div className="px-6 py-7 sm:px-8">
          {version.criteria.map((criterion, criterionIndex) => (
            <article key={criterion.criterionId} className="mb-8 border-b border-slate-200 pb-8 last:mb-0 last:border-b-0 last:pb-0">
              <div className="mb-5">
                <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                  Criterio {criterionIndex + 1}
                </p>
                <h3 className="mt-2 text-lg font-black text-slate-950">{criterion.name}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{criterion.descriptor}</p>
              </div>

              <div className="flex flex-wrap gap-3">
                {criterion.options.map((option) => (
                  <div
                    key={option.optionId}
                    className="min-w-[140px] flex-1 rounded-xl border-2 border-slate-200 bg-slate-50 p-3"
                  >
                    <div className="mb-3 flex flex-col items-center gap-1">
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-azul-monte-tabor text-base font-black text-white">
                        {option.value}
                      </span>
                      <span className="text-center text-sm font-bold text-slate-700">
                        {option.label}
                      </span>
                    </div>
                    <p className="text-xs leading-relaxed text-slate-500">{option.descriptor}</p>
                  </div>
                ))}
              </div>

              <div className="mt-4">
                <label className="block">
                  <span className="text-xs font-bold text-slate-600">Comentarios (opcional)</span>
                  <textarea
                    className="control mt-1 w-full resize-y"
                    rows={2}
                    placeholder="Observaciones sobre este criterio..."
                    readOnly
                  />
                </label>
              </div>
            </article>
          ))}
        </div>

        <footer className="sticky bottom-0 border-t border-slate-200 bg-slate-50 px-6 py-4 sm:px-8">
          <button
            type="button"
            className="secondary min-h-11 w-full sm:w-auto"
            onClick={onClose}
          >
            Cerrar
          </button>
        </footer>
      </div>
    </div>
  );
}
