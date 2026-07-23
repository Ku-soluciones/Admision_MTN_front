import React, { useEffect, useMemo, useState } from 'react';
import { FiArchive, FiEdit2, FiPlus, FiRefreshCw, FiUsers, FiX } from 'react-icons/fi';
import interviewerPairService from '../../services/interviewerPairService';
import type { InterviewerPair, InterviewerPairOptions } from '../../types/interviewerPair';

const emptyOptions: InterviewerPairOptions = { cycleDirectors: [], psychologists: [], grades: [] };

const InterviewerPairManagement: React.FC = () => {
  const [pairs, setPairs] = useState<InterviewerPair[]>([]);
  const [options, setOptions] = useState<InterviewerPairOptions>(emptyOptions);
  const [editing, setEditing] = useState<InterviewerPair | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [directorId, setDirectorId] = useState('');
  const [psychologistId, setPsychologistId] = useState('');
  const [grades, setGrades] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const gradeLabels = useMemo(() => new Map(options.grades.map((grade) => [grade.code, grade.label])), [options.grades]);
  const availableDirectors = useMemo(
    () => options.cycleDirectors.filter((member) => !member.activePairId || member.activePairId === editing?.id),
    [editing?.id, options.cycleDirectors]
  );
  const availablePsychologists = useMemo(
    () => options.psychologists.filter((member) => !member.activePairId || member.activePairId === editing?.id),
    [editing?.id, options.psychologists]
  );

  const load = async () => {
    setLoading(true);
    try {
      const [pairResult, pairOptions] = await Promise.all([
        interviewerPairService.getAll(),
        interviewerPairService.getOptions(),
      ]);
      setPairs(pairResult.pairs);
      setOptions(pairOptions);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const openCreate = () => {
    setEditing(null);
    setDirectorId('');
    setPsychologistId('');
    setGrades([]);
    setFormOpen(true);
    setMessage(null);
  };

  const openEdit = (pair: InterviewerPair) => {
    setEditing(pair);
    setDirectorId(String(pair.cycleDirector.id));
    setPsychologistId(String(pair.psychologist.id));
    setGrades(pair.grades);
    setFormOpen(true);
    setMessage(null);
  };

  const closeForm = () => {
    if (saving) return;
    setFormOpen(false);
    setEditing(null);
  };

  const toggleGrade = (code: string) => {
    setGrades((current) => current.includes(code) ? current.filter((grade) => grade !== code) : [...current, code]);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!directorId || !psychologistId || grades.length === 0) {
      setMessage({ type: 'error', text: 'Selecciona ambos integrantes y al menos un nivel.' });
      return;
    }
    setSaving(true);
    try {
      const payload = { cycleDirectorId: Number(directorId), psychologistId: Number(psychologistId), grades };
      if (editing) await interviewerPairService.revise(editing.id, payload);
      else await interviewerPairService.create(payload);
      setMessage({ type: 'success', text: editing ? 'Nueva revisión creada correctamente.' : 'Pareja creada correctamente.' });
      setFormOpen(false);
      setEditing(null);
      await load();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setSaving(false);
    }
  };

  const archive = async (pair: InterviewerPair) => {
    if (!window.confirm(`¿Archivar la pareja de ${pair.cycleDirector.name} y ${pair.psychologist.name}? Las entrevistas históricas conservarán esta asignación.`)) return;
    try {
      await interviewerPairService.archive(pair.id);
      setMessage({ type: 'success', text: 'Pareja archivada. El historial se conserva.' });
      await load();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    }
  };

  return (
    <section aria-labelledby="pair-management-title" className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 id="pair-management-title" className="text-lg font-bold text-gray-950">Parejas Director + Psicólogo</h2>
          <p className="mt-1 max-w-3xl text-sm text-gray-600">
            Define quiénes entrevistan juntos y los niveles que pueden atender.
          </p>
        </div>
        <button type="button" onClick={openCreate} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#008a57] px-4 py-2 text-sm font-semibold text-white hover:bg-[#007247] focus:outline-none focus:ring-2 focus:ring-[#008a57] focus:ring-offset-2">
          <FiPlus aria-hidden="true" /> Crear pareja
        </button>
      </div>

      <div aria-live="polite">
        {message && <div className={`rounded-lg border p-3 text-sm ${message.type === 'error' ? 'border-red-300 bg-red-50 text-red-800' : 'border-emerald-300 bg-emerald-50 text-emerald-900'}`}>{message.text}</div>}
      </div>

      {formOpen && (
        <form onSubmit={submit} className="rounded-xl border border-gray-300 bg-gray-50 p-4" aria-label={editing ? 'Editar pareja' : 'Crear pareja'}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="font-bold text-gray-950">{editing ? 'Editar pareja' : 'Nueva pareja'}</h3>
              {editing && <p className="mt-1 text-sm text-gray-600">Se creará una nueva revisión; las entrevistas anteriores no cambiarán.</p>}
            </div>
            <button type="button" onClick={closeForm} aria-label="Cerrar formulario" className="flex h-11 w-11 items-center justify-center rounded-lg text-gray-600 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-[#008a57]"><FiX aria-hidden="true" /></button>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="text-sm font-semibold text-gray-800">Director de Ciclo
              <select required value={directorId} onChange={(event) => setDirectorId(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-gray-950 focus:border-[#008a57] focus:outline-none focus:ring-2 focus:ring-[#008a57]/30">
                <option value="">Seleccionar director/a</option>
                {availableDirectors.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}
              </select>
            </label>
            <label className="text-sm font-semibold text-gray-800">Psicólogo/a
              <select required value={psychologistId} onChange={(event) => setPsychologistId(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-gray-950 focus:border-[#008a57] focus:outline-none focus:ring-2 focus:ring-[#008a57]/30">
                <option value="">Seleccionar psicólogo/a</option>
                {availablePsychologists.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}
              </select>
            </label>
          </div>
          {(availableDirectors.length === 0 || availablePsychologists.length === 0) && (
            <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900" role="status">
              {availableDirectors.length === 0 && availablePsychologists.length === 0
                ? 'No hay Directores de Ciclo ni Psicólogos activos disponibles para formar otra pareja.'
                : availableDirectors.length === 0
                  ? 'No hay Directores de Ciclo activos disponibles para formar otra pareja.'
                  : 'No hay Psicólogos activos disponibles para formar otra pareja.'}
            </div>
          )}
          <fieldset className="mt-5">
            <legend className="text-sm font-semibold text-gray-800">Niveles atendidos</legend>
            <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs text-gray-600">{grades.length} de {options.grades.length} seleccionados</span>
              <div className="flex gap-2">
                <button type="button" onClick={() => setGrades(options.grades.map((grade) => grade.code))} className="min-h-11 rounded-lg px-3 text-xs font-semibold text-[#006b45] hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-[#008a57]">Seleccionar todo</button>
                <button type="button" onClick={() => setGrades([])} disabled={grades.length === 0} className="min-h-11 rounded-lg px-3 text-xs font-semibold text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-[#008a57] disabled:cursor-not-allowed disabled:opacity-50">Limpiar</button>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {options.grades.map((grade) => {
                const selected = grades.includes(grade.code);
                const optionClass = selected
                  ? 'border-[#008a57] bg-emerald-50 text-emerald-950'
                  : 'border-gray-300 bg-white text-gray-700';
                return (
                  <label
                    key={grade.code}
                    className={`inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium focus-within:ring-2 focus-within:ring-[#008a57] ${optionClass}`}
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleGrade(grade.code)}
                      className="h-4 w-4 accent-[#008a57]"
                    />
                    {grade.label}
                  </label>
                );
              })}
            </div>
          </fieldset>
          <div className="mt-5 flex flex-wrap justify-end gap-2">
            <button type="button" onClick={closeForm} className="min-h-11 rounded-lg border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-[#008a57]">Cancelar</button>
            <button type="submit" disabled={saving || availableDirectors.length === 0 || availablePsychologists.length === 0} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#008a57] px-4 text-sm font-semibold text-white hover:bg-[#007247] focus:outline-none focus:ring-2 focus:ring-[#008a57] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60">
              {saving && <FiRefreshCw className="animate-spin motion-reduce:animate-none" aria-hidden="true" />}{editing ? 'Guardar nueva revisión' : 'Crear pareja'}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="flex min-h-32 items-center justify-center gap-2 text-sm text-gray-700" role="status"><FiRefreshCw className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> Cargando parejas…</div>
      ) : pairs.length === 0 ? (
        <div className="rounded-xl border border-gray-300 bg-gray-50 p-8 text-center">
          <FiUsers className="mx-auto h-8 w-8 text-gray-500" aria-hidden="true" />
          <h3 className="mt-3 font-bold text-gray-950">No hay parejas configuradas</h3>
          <p className="mt-1 text-sm text-gray-600">Crea la primera pareja y asígnale uno o más niveles para habilitar entrevistas de Director de Ciclo.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-300">
          <table className="min-w-full divide-y divide-gray-300 text-left text-sm">
            <thead className="bg-gray-50 text-gray-700"><tr><th className="px-4 py-3 font-semibold">Integrantes</th><th className="px-4 py-3 font-semibold">Niveles</th><th className="px-4 py-3 font-semibold">Estado</th><th className="px-4 py-3 text-right font-semibold">Acciones</th></tr></thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {pairs.map((pair) => {
                const statusClass = pair.active
                  ? 'bg-emerald-100 text-emerald-900'
                  : 'bg-gray-200 text-gray-700';
                return (
                  <tr key={pair.id} className={!pair.active ? 'bg-gray-50 text-gray-600' : ''}>
                    <td className="px-4 py-4">
                      <p className="font-semibold text-gray-950">{pair.cycleDirector.name}</p>
                      <p className="text-gray-600">Director de Ciclo</p>
                      <p className="mt-2 font-semibold text-gray-950">{pair.psychologist.name}</p>
                      <p className="text-gray-600">Psicólogo/a</p>
                    </td>
                    <td className="max-w-md px-4 py-4">
                      <div className="flex flex-wrap gap-1.5">
                        {pair.grades.map((grade) => (
                          <span key={grade} className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700">
                            {gradeLabels.get(grade) || grade}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${statusClass}`}>
                        {pair.active ? `Activa · revisión ${pair.revision}` : `Archivada · revisión ${pair.revision}`}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex justify-end gap-2">
                        {pair.active && (
                          <>
                            <button type="button" onClick={() => openEdit(pair)} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-gray-300 px-3 font-semibold text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#008a57]">
                              <FiEdit2 aria-hidden="true" /> Editar
                            </button>
                            <button type="button" onClick={() => archive(pair)} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-gray-300 px-3 font-semibold text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#008a57]">
                              <FiArchive aria-hidden="true" /> Archivar
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};

export default InterviewerPairManagement;
