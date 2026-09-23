import { useEffect, useState, useRef } from 'react';
import { FiChevronDown, FiChevronUp, FiLock, FiShield, FiAlertCircle } from 'react-icons/fi';
import {
  guardianPrekinderService,
  type GuardianPrekinderInclusion,
} from '../services/guardianPrekinderService';

type FormState = Required<Pick<GuardianPrekinderInclusion['declaration'],
  'backgroundSummary' | 'currentSupports' | 'relevantDocuments' | 'consentAccepted'>>;

const EMPTY_FORM: FormState = {
  backgroundSummary: '',
  currentSupports: '',
  relevantDocuments: '',
  consentAccepted: false,
};

const interviewLabels: Record<GuardianPrekinderInclusion['specificInterviewStatus'], string> = {
  NOT_REQUIRED: 'No requerida',
  PENDING: 'Pendiente de programación',
  SCHEDULED: 'Programada',
  COMPLETED: 'Completada',
  WAIVED: 'Cerrada por excepción justificada',
};

export default function PrekinderInclusionDeclaration({ applicationId }: { applicationId: string }) {
  const [record, setRecord] = useState<GuardianPrekinderInclusion | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [savedForm, setSavedForm] = useState<FormState>(EMPTY_FORM);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const initialLoadRef = useRef(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setRecord(null);
    setForm(EMPTY_FORM);
    setSavedForm(EMPTY_FORM);
    setMessage(null);
    setExpanded(false);
    setHasChanges(false);
    initialLoadRef.current = true;
    guardianPrekinderService.inclusion(applicationId)
      .then(value => {
        if (!active) return;
        setRecord(value);
        const loaded: FormState = {
          backgroundSummary: value.declaration?.backgroundSummary || '',
          currentSupports: value.declaration?.currentSupports || '',
          relevantDocuments: value.declaration?.relevantDocuments || '',
          consentAccepted: Boolean(value.declaration?.consentAccepted),
        };
        setForm(loaded);
        setSavedForm(loaded);
        setExpanded(value.revisionState === 'DRAFT' || (value.allowedFields && value.allowedFields.length > 0));
      })
      .catch(() => {
        if (active) setRecord(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [applicationId]);

  const handleChange = (field: keyof FormState, value: string | boolean) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleCancel = () => {
    setForm(savedForm);
    setHasChanges(false);
    setMessage(null);
  };

  if (loading || !record?.enabled) return null;

  const submitted = record.revisionState === 'SUBMITTED';
  const hasCorrection = record.allowedFields && record.allowedFields.length > 0;
  const isEditable = !submitted || hasCorrection;

  const isFieldLocked = (field: keyof FormState) => {
    if (!isEditable) return true;
    if (hasCorrection) {
      const fieldName = field === 'backgroundSummary' ? 'backgroundSummary'
        : field === 'currentSupports' ? 'currentSupports'
        : field === 'relevantDocuments' ? 'relevantDocuments'
        : null;
      return !fieldName || !record.allowedFields?.includes(fieldName);
    }
    return false;
  };

  const save = async (isSubmitted: boolean) => {
    if (isSubmitted && (!form.backgroundSummary.trim() || !form.consentAccepted)) {
      setMessage({ type: 'error', text: 'Describe los antecedentes y acepta el consentimiento antes de enviar.' });
      return;
    }
    try {
      setSaving(true);
      setMessage(null);
      const updated = await guardianPrekinderService.saveInclusion(applicationId, {
        backgroundSummary: form.backgroundSummary.trim(),
        currentSupports: form.currentSupports.trim(),
        relevantDocuments: form.relevantDocuments.trim(),
        consentAccepted: form.consentAccepted,
        isSubmitted,
      });
      setRecord(updated);
      setSavedForm(form);
      setHasChanges(false);
      setMessage({
        type: 'success',
        text: isSubmitted
          ? 'Declaración enviada. El equipo coordinará la entrevista específica.'
          : 'Borrador de inclusión guardado.',
      });
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error?.response?.data?.message || error?.message || 'No fue posible guardar la declaración.',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full rounded-xl border border-blue-100 bg-blue-50/60 p-4">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 text-left"
        onClick={() => setExpanded(value => !value)}
        aria-expanded={expanded}
      >
        <span className="flex min-w-0 items-center gap-2 font-semibold text-azul-monte-tabor">
          <FiShield className="h-4 w-4 shrink-0" />
          Antecedentes de inclusión
        </span>
        {expanded ? <FiChevronUp aria-hidden="true" /> : <FiChevronDown aria-hidden="true" />}
      </button>

      <div className="mt-3 rounded-lg border border-blue-100 bg-white/80 p-3">
        <p className="font-semibold text-slate-900">{record.applicant.fullName}</p>
        <p className="mt-1 text-xs text-slate-600">
          RUT {record.applicant.maskedRut} · {record.applicant.processName} {record.applicant.academicYear}
          {record.applicant.folio ? ` · Folio ${record.applicant.folio}` : ''}
        </p>
        <p className="mt-1 text-xs font-medium text-blue-900">Este formulario corresponde únicamente a este postulante.</p>
      </div>

      {record.declared && (
        <p className="mt-2 text-xs text-slate-600">
          Estado: {submitted ? 'declaración enviada' : 'borrador'} · Entrevista específica: {interviewLabels[record.specificInterviewStatus]}
        </p>
      )}

      {hasCorrection && (
        <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
          <p className="flex items-center gap-2 text-sm font-medium text-amber-800">
            <FiAlertCircle className="h-4 w-4 shrink-0" />
            Corrección solicitada
          </p>
          {record.correctionRequestReason && (
            <p className="mt-1 text-xs text-amber-700">{record.correctionRequestReason}</p>
          )}
          <p className="mt-1 text-xs text-amber-700">
            Campos a corregir: {record.allowedFields?.join(', ')}.
          </p>
        </div>
      )}

      {expanded && (
        <div className="mt-4 space-y-4 border-t border-blue-100 pt-4">
          <p className="text-sm text-slate-700">
            Esta información es confidencial y no activa automáticamente una evaluación de Apoyo al Aprendizaje ni DAP.
          </p>
          <label className="block text-sm font-medium text-slate-800">
            Antecedentes relevantes
            <textarea
              className="mt-1 min-h-24 w-full rounded-lg border border-slate-300 bg-white p-3 disabled:bg-slate-100"
              value={form.backgroundSummary}
              onChange={event => handleChange('backgroundSummary', event.target.value)}
              disabled={isFieldLocked('backgroundSummary') || saving}
              maxLength={4000}
              required
            />
          </label>
          <label className="block text-sm font-medium text-slate-800">
            Apoyos actuales (opcional)
            <textarea
              className="mt-1 min-h-20 w-full rounded-lg border border-slate-300 bg-white p-3 disabled:bg-slate-100"
              value={form.currentSupports}
              onChange={event => handleChange('currentSupports', event.target.value)}
              disabled={isFieldLocked('currentSupports') || saving}
              maxLength={3000}
            />
          </label>
          <label className="block text-sm font-medium text-slate-800">
            Documentos o informes disponibles (opcional)
            <textarea
              className="mt-1 min-h-20 w-full rounded-lg border border-slate-300 bg-white p-3 disabled:bg-slate-100"
              value={form.relevantDocuments}
              onChange={event => handleChange('relevantDocuments', event.target.value)}
              disabled={isFieldLocked('relevantDocuments') || saving}
              maxLength={2000}
            />
          </label>
          <label className="flex items-start gap-3 text-sm text-slate-700">
            <input
              type="checkbox"
              className="mt-1"
              checked={form.consentAccepted}
              onChange={event => handleChange('consentAccepted', event.target.checked)}
              disabled={isFieldLocked('consentAccepted') || saving}
            />
            Autorizo el tratamiento restringido de estos antecedentes para el proceso de admisión Prekínder.
          </label>

          {message && (
            <p role="status" className={`text-sm ${message.type === 'error' ? 'text-red-700' : 'text-emerald-700'}`}>
              {message.text}
            </p>
          )}

          {!isEditable ? (
            <p className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <FiLock aria-hidden="true" /> La declaración está bloqueada después del envío.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              <button type="button" className="rounded-lg border border-blue-900 px-4 py-2 text-sm font-semibold text-blue-900 disabled:opacity-50" onClick={() => void save(false)} disabled={saving}>
                Guardar borrador
              </button>
              <button type="button" className="rounded-lg bg-blue-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" onClick={() => void save(true)} disabled={saving}>
                Enviar declaración
              </button>
              {hasChanges && (
                <button type="button" className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50" onClick={handleCancel} disabled={saving}>
                  Cancelar
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
