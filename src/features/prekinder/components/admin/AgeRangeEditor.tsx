import { useState, useEffect } from "react";
import { AlertTriangle, Calendar, Info } from "lucide-react";
import type { ProcessConfiguration } from "../../services/api";

interface AgeRangeEditorProps {
  configuration: ProcessConfiguration;
  busy: boolean;
  onSave: (input: Omit<ProcessConfiguration, "processId">) => Promise<boolean>;
}

export default function AgeRangeEditor({ configuration, busy, onSave }: AgeRangeEditorProps) {
  const [form, setForm] = useState(configuration);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setForm(configuration);
    setSaved(false);
  }, [configuration]);

  const update = <K extends keyof ProcessConfiguration>(key: K, value: ProcessConfiguration[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setSaved(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { processId: _processId, ...payload } = form;
    const ok = await onSave(payload);
    if (ok) setSaved(true);
  };

  return (
    <form
      className="rounded-2xl bg-white p-6 shadow-[0_14px_34px_rgba(15,23,42,0.07)]"
      onSubmit={handleSubmit}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-slate-950">Edad de postulación</h2>
          <p className="mt-1 text-sm text-slate-600">
            Define el rango de edad permitido para nuevos postulantes.
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {/* Edad mínima */}
        <div>
          <label className="field-label">
            Edad mínima <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="control w-full pl-9"
              type="number"
              min={42}
              max={120}
              value={form.minimumAgeMonths}
              onChange={(e) => update("minimumAgeMonths", Number(e.target.value))}
              required
            />
          </div>
          <p className="mt-1 text-xs text-slate-500">Mínimo 42 meses (3 años y 6 meses).</p>
        </div>

        {/* Edad máxima */}
        <div>
          <label className="field-label">Edad máxima (meses)</label>
          <div className="relative">
            <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="control w-full pl-9"
              type="number"
              min={form.minimumAgeMonths}
              max={120}
              value={form.maximumAgeMonths}
              onChange={(e) => update("maximumAgeMonths", Number(e.target.value))}
            />
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Si está vacío, no hay límite máximo de edad.
          </p>
        </div>

        {/* Fecha de referencia */}
        <div>
          <label className="field-label">Fecha de referencia de edad</label>
          <div className="relative">
            <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="control w-full pl-9"
              type="date"
              value={form.ageReferenceDate ?? ""}
              onChange={(e) => update("ageReferenceDate", e.target.value || null)}
            />
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Fecha usada para calcular la edad del postulante.
          </p>
        </div>
      </div>

      {/* Regla especial inclusión */}
      <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle size={20} className="mt-0.5 shrink-0 text-amber-600" />
          <div className="min-w-0 flex-1">
            <p className="font-bold text-amber-800">Regla especial para alumnos de inclusión</p>
            <p className="mt-1 text-sm text-amber-700">
              Cuando está activo, los postulantes con pedido de inclusión pueden exceder la edad máxima
              aunque esta esté configurada. La edad mínima se sigue aplicando sin excepciones.
            </p>
            <label className="mt-3 flex items-center gap-2 text-sm font-bold text-amber-800">
              <input
                type="checkbox"
                checked={form.noMaxAgeForInclusion}
                onChange={(e) => update("noMaxAgeForInclusion", e.target.checked)}
                className="h-4 w-4 rounded border-amber-400 text-amber-600 focus:ring-amber-500"
              />
              Sin límite máximo para alumnos de inclusión
            </label>
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="mt-4 flex items-start gap-2 rounded-lg bg-slate-50 p-3">
        <Info size={16} className="mt-0.5 shrink-0 text-slate-400" />
        <p className="text-xs text-slate-600">
          La validación de edad se aplica al momento de enviar la postulación. Si un postulante queda
          fuera del rango, el sistema mostrará un error y no permitirá enviar.
        </p>
      </div>

      <div className="mt-5 flex items-center justify-between gap-4 border-t border-slate-100 pt-5">
        {saved && (
          <span className="text-sm font-bold text-emerald-600">✓ Cambios guardados</span>
        )}
        {!saved && <span />}
        <button className="primary" type="submit" disabled={busy}>
          {busy ? "Guardando…" : "Guardar cambios"}
        </button>
      </div>
    </form>
  );
}
