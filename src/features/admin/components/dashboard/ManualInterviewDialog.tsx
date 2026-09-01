import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  FiAlertTriangle,
  FiArrowLeft,
  FiCalendar,
  FiCheck,
  FiClock,
  FiInfo,
  FiMapPin,
  FiMail,
  FiSearch,
  FiShield,
  FiUser,
  FiUsers,
  FiX,
} from 'react-icons/fi';
import { Application, applicationService } from '../../services/applicationService';
import staffService from '../../services/staffService';
import interviewService, { ManualInterviewConfirmationError } from '../../services/interviewService';
import { User, UserRole } from '../../types/user';
import {
  InterviewLifecycle,
  InterviewMode,
  InterviewStatus,
  InterviewType,
  ManualInterviewCreateRequest,
  ManualInterviewCreateResult,
  ManualInterviewWarning,
} from '../../types/interview';

interface ManualInterviewDialogProps {
  onClose: () => void;
  onCreated: (result: ManualInterviewCreateResult) => Promise<void> | void;
}

type DialogStep = 'EDIT' | 'REVIEW';

const ELIGIBLE_APPLICATION_STATUSES = new Set([
  'PENDING',
  'UNDER_REVIEW',
  'DOCUMENTS_REQUESTED',
  'PENDING_DOCUMENTS',
  'INCOMPLETE',
  'EXAM_SCHEDULED',
]);

const getStudentName = (application: Application): string => (
  application.student?.fullName
  || [
    application.student?.firstName,
    application.student?.paternalLastName || application.student?.lastName,
    application.student?.maternalLastName,
  ].filter(Boolean).join(' ')
  || `Postulación #${application.id}`
);

const getGrade = (application: Application): string => (
  application.student?.gradeApplied
  || application.student?.gradeApplying
  || application.student?.grade
  || 'Curso no informado'
);

const getInterviewerName = (user?: User): string => user?.fullName || [user?.firstName, user?.lastName].filter(Boolean).join(' ');

const formatDate = (date: string): string => {
  if (!date) return 'Sin fecha';
  return new Intl.DateTimeFormat('es-CL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(`${date}T00:00:00`));
};

const ManualInterviewDialog: React.FC<ManualInterviewDialogProps> = ({ onClose, onCreated }) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const reviewHeadingRef = useRef<HTMLHeadingElement>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [existingInterviews, setExistingInterviews] = useState<Awaited<ReturnType<typeof interviewService.getAllInterviews>>['interviews']>([]);
  const [interviewers, setInterviewers] = useState<User[]>([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState(true);
  const [optionsError, setOptionsError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [interviewType, setInterviewType] = useState<InterviewType>(InterviewType.FAMILY);
  const [selectedApplicationId, setSelectedApplicationId] = useState('');
  const [firstInterviewerId, setFirstInterviewerId] = useState('');
  const [secondInterviewerId, setSecondInterviewerId] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [duration, setDuration] = useState(60);
  const [mode, setMode] = useState<InterviewMode>(InterviewMode.IN_PERSON);
  const [location, setLocation] = useState('');
  const [reason, setReason] = useState('');
  const [step, setStep] = useState<DialogStep>('EDIT');
  const [sendEmail, setSendEmail] = useState(false);
  const [assignmentConfirmed, setAssignmentConfirmed] = useState(false);
  const [warnings, setWarnings] = useState<ManualInterviewWarning[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const availableApplications = useMemo(() => {
    const assignedApplications = new Set(
      existingInterviews
        .filter(interview => interview.type === interviewType && InterviewLifecycle.countsAsAssigned(interview.status as InterviewStatus))
        .map(interview => interview.applicationId)
    );
    return applications.filter(application => !assignedApplications.has(application.id));
  }, [applications, existingInterviews, interviewType]);

  const selectedApplication = availableApplications.find(item => String(item.id) === selectedApplicationId);
  const familyInterviewers = interviewers.filter(user => user.role === UserRole.INTERVIEWER || user.role === UserRole.COORDINATOR);
  const cycleDirectors = interviewers.filter(user => user.role === UserRole.CYCLE_DIRECTOR);
  const psychologists = interviewers.filter(user => user.role === UserRole.PSYCHOLOGIST);
  const firstInterviewerOptions = interviewType === InterviewType.FAMILY ? familyInterviewers : cycleDirectors;
  const secondInterviewerOptions = interviewType === InterviewType.FAMILY ? familyInterviewers : psychologists;
  const firstInterviewer = interviewers.find(item => String(item.id) === firstInterviewerId);
  const secondInterviewer = interviewers.find(item => String(item.id) === secondInterviewerId);
  const locationLabel = mode === InterviewMode.VIRTUAL
    ? 'Enlace de reunión'
    : mode === InterviewMode.HYBRID
      ? 'Ubicación y enlace'
      : 'Ubicación';

  const filteredApplications = useMemo(() => {
    const query = search.trim().toLowerCase();
    return availableApplications.filter(application => {
      if (!query) return true;
      const haystack = [
        getStudentName(application),
        application.student?.rut,
        getGrade(application),
        application.id,
      ].join(' ').toLowerCase();
      return haystack.includes(query);
    }).slice(0, 30);
  }, [availableApplications, search]);

  const formError = useMemo(() => {
    if (!selectedApplication) return 'Selecciona un postulante.';
    if (!firstInterviewerId || !secondInterviewerId) {
      return interviewType === InterviewType.FAMILY
        ? 'Selecciona dos entrevistadores familiares.'
        : 'Selecciona un director de ciclo y un psicólogo/a.';
    }
    if (firstInterviewerId === secondInterviewerId) return 'Los entrevistadores deben ser personas distintas.';
    if (!scheduledDate || !scheduledTime) return 'Indica fecha y hora.';
    if (duration < 15 || duration > 240) return 'La duración debe estar entre 15 y 240 minutos.';
    if (reason.trim().length < 5) return 'Explica brevemente el motivo del ingreso excepcional.';
    return null;
  }, [duration, firstInterviewerId, interviewType, reason, scheduledDate, scheduledTime, secondInterviewerId, selectedApplication]);

  useEffect(() => {
    let cancelled = false;
    setIsLoadingOptions(true);
    setOptionsError(null);

    Promise.all([
      applicationService.getAllApplications({ size: 2000 }),
      interviewService.getAllInterviews(0, 2000),
      staffService.getStaffUsers({ active: true, page: 0, size: 2000 }),
    ]).then(([applicationRows, interviewRows, staffRows]) => {
      if (cancelled) return;
      setApplications(applicationRows.filter(application => (
        ELIGIBLE_APPLICATION_STATUSES.has((application.status || '').toUpperCase())
      )));
      setExistingInterviews(interviewRows.interviews);
      setInterviewers(staffRows.content.filter(user => (
        user.active && [
          UserRole.INTERVIEWER,
          UserRole.COORDINATOR,
          UserRole.CYCLE_DIRECTOR,
          UserRole.PSYCHOLOGIST,
        ].includes(user.role)
      )));
    }).catch(() => {
      if (!cancelled) setOptionsError('No pudimos cargar postulantes y entrevistadores. Cierra y vuelve a intentar.');
    }).finally(() => {
      if (!cancelled) setIsLoadingOptions(false);
    });

    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    searchRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isSubmitting) {
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      ));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSubmitting, onClose]);

  useEffect(() => {
    if (step === 'REVIEW') reviewHeadingRef.current?.focus();
  }, [step]);

  const clearWarnings = () => {
    if (warnings.length) setWarnings([]);
    if (error) setError(null);
  };

  const selectInterviewType = (nextType: InterviewType) => {
    if (nextType === interviewType) return;
    setInterviewType(nextType);
    setSelectedApplicationId('');
    setFirstInterviewerId('');
    setSecondInterviewerId('');
    setSearch('');
    clearWarnings();
  };

  const buildRequest = (confirmWarnings: boolean): ManualInterviewCreateRequest => ({
    applicationId: Number(selectedApplicationId),
    interviewType,
    interviewerId: Number(firstInterviewerId),
    secondInterviewerId: Number(secondInterviewerId),
    scheduledDate,
    scheduledTime,
    duration,
    mode,
    location: location.trim() || undefined,
    reason: reason.trim(),
    sendEmail,
    confirmWarnings,
  });

  const openReview = () => {
    if (formError) {
      setError(formError);
      return;
    }
    setError(null);
    setWarnings([]);
    setAssignmentConfirmed(false);
    setStep('REVIEW');
  };

  const returnToEdit = () => {
    setStep('EDIT');
    setAssignmentConfirmed(false);
    setWarnings([]);
    setError(null);
    window.requestAnimationFrame(() => searchRef.current?.focus());
  };

  const submit = async (confirmWarnings: boolean) => {
    if (formError) {
      setError(formError);
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const result = await interviewService.createManualInterview(buildRequest(confirmWarnings));
      await onCreated(result);
      onClose();
    } catch (submitError: any) {
      if (submitError instanceof ManualInterviewConfirmationError) {
        setWarnings(submitError.warnings);
        setAssignmentConfirmed(false);
        setError(null);
      } else {
        setError(submitError.message || 'No se pudo guardar la entrevista excepcional.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-gray-950/50 p-3 sm:p-6" role="presentation">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="manual-interview-title"
        className="flex max-h-[calc(100vh-1.5rem)] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl sm:max-h-[calc(100vh-3rem)]"
      >
        <header className="flex flex-shrink-0 items-start justify-between gap-4 border-b border-gray-200 px-5 py-4 sm:px-7 sm:py-5">
          <div className="min-w-0">
            <h2 id="manual-interview-title" className="text-xl font-bold text-gray-950 sm:text-2xl">Ingreso excepcional</h2>
            <p className="mt-1 max-w-2xl text-sm text-gray-600">
              {step === 'EDIT'
                ? 'Registra una entrevista familiar o de director de ciclo fuera del flujo habitual.'
                : 'Revisa cuidadosamente la asignación antes de confirmarla.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="inline-flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:opacity-50"
            aria-label="Cerrar ingreso excepcional"
          >
            <FiX className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>

        <div className="overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">
          <div className="mb-6 flex items-start gap-3 rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-900">
            <FiShield className="mt-0.5 h-5 w-5 flex-shrink-0" aria-hidden="true" />
            <div>
              <p className="font-bold">Por defecto, este ingreso no enviará correos.</p>
              <p className="mt-0.5 text-blue-800">Sin correo, la entrevista quedará confirmada inmediatamente y visible en las agendas. En la revisión final podrás cambiar esta opción.</p>
            </div>
          </div>

          {optionsError && (
            <div className="mb-5 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-800" role="alert">{optionsError}</div>
          )}

          {step === 'EDIT' ? (
          <div className="grid gap-7 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)]">
            <div className="space-y-6">
              <fieldset>
                <legend className="text-base font-bold text-gray-950">Tipo de entrevista</legend>
                <p className="mt-1 text-sm text-gray-600">El tipo define los roles requeridos y las evaluaciones asociadas.</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2" role="radiogroup">
                  {[
                    { value: InterviewType.FAMILY, label: 'Entrevista familiar', description: 'Dos entrevistadores o coordinadores' },
                    { value: InterviewType.CYCLE_DIRECTOR, label: 'Director de ciclo', description: 'Director de ciclo y psicólogo/a' },
                  ].map(option => {
                    const selected = interviewType === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => selectInterviewType(option.value)}
                        className={`min-h-16 rounded-xl border px-4 py-3 text-left focus:outline-none focus:ring-2 focus:ring-blue-200 ${selected ? 'border-blue-600 bg-blue-50' : 'border-gray-300 bg-white hover:border-gray-400'}`}
                      >
                        <span className="flex items-center justify-between gap-3">
                          <span className="font-bold text-gray-950">{option.label}</span>
                          {selected && <FiCheck className="h-5 w-5 flex-shrink-0 text-blue-700" aria-hidden="true" />}
                        </span>
                        <span className="mt-1 block text-sm text-gray-600">{option.description}</span>
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              <section aria-labelledby="manual-applicant-heading">
                <div className="mb-3 flex items-center gap-2">
                  <FiUser className="h-5 w-5 text-gray-500" aria-hidden="true" />
                  <h3 id="manual-applicant-heading" className="text-base font-bold text-gray-950">Postulante pendiente</h3>
                </div>
                <label className="relative block">
                  <span className="sr-only">Buscar postulante</span>
                  <FiSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" aria-hidden="true" />
                  <input
                    ref={searchRef}
                    value={search}
                    onChange={event => { setSearch(event.target.value); clearWarnings(); }}
                    className="h-11 w-full rounded-lg border border-gray-300 bg-white pl-9 pr-3 text-sm text-gray-950 placeholder:text-gray-500 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    placeholder="Nombre, RUT, curso o número de postulación"
                    disabled={isLoadingOptions}
                  />
                </label>
                <div className="mt-2 max-h-52 overflow-y-auto rounded-lg border border-gray-200" aria-live="polite">
                  {isLoadingOptions ? (
                    <p className="p-4 text-sm text-gray-600">Cargando postulantes...</p>
                  ) : filteredApplications.length ? filteredApplications.map(application => {
                    const selected = String(application.id) === selectedApplicationId;
                    return (
                      <button
                        key={application.id}
                        type="button"
                        onClick={() => { setSelectedApplicationId(String(application.id)); clearWarnings(); }}
                        className={`flex min-h-14 w-full items-center justify-between gap-3 border-b border-gray-100 px-3 py-2 text-left last:border-b-0 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-200 ${selected ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                        aria-pressed={selected}
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-bold text-gray-950">{getStudentName(application)}</span>
                          <span className="block truncate text-xs text-gray-600">#{application.id} · {getGrade(application)} · {application.student?.rut || 'Sin RUT'}</span>
                        </span>
                        {selected && <FiCheck className="h-5 w-5 flex-shrink-0 text-blue-700" aria-hidden="true" />}
                      </button>
                    );
                  }) : (
                    <p className="p-4 text-sm text-gray-600">No hay postulantes pendientes disponibles para este tipo de entrevista.</p>
                  )}
                </div>
              </section>

              <section aria-labelledby="manual-interviewers-heading">
                <div className="mb-3 flex items-center gap-2">
                  <FiUsers className="h-5 w-5 text-gray-500" aria-hidden="true" />
                  <h3 id="manual-interviewers-heading" className="text-base font-bold text-gray-950">Entrevistadores</h3>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block text-sm font-semibold text-gray-800">
                    {interviewType === InterviewType.FAMILY ? 'Primer entrevistador' : 'Director/a de ciclo'}
                    <select
                      value={firstInterviewerId}
                      onChange={event => { setFirstInterviewerId(event.target.value); clearWarnings(); }}
                      className="mt-2 h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-950 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    >
                      <option value="">Seleccionar</option>
                      {firstInterviewerOptions.map(user => <option key={user.id} value={user.id}>{getInterviewerName(user)}</option>)}
                    </select>
                    {!isLoadingOptions && firstInterviewerOptions.length === 0 && <span className="mt-1 block text-xs font-normal text-red-700">No hay profesionales activos con este rol.</span>}
                  </label>
                  <label className="block text-sm font-semibold text-gray-800">
                    {interviewType === InterviewType.FAMILY ? 'Segundo entrevistador' : 'Psicólogo/a'}
                    <select
                      value={secondInterviewerId}
                      onChange={event => { setSecondInterviewerId(event.target.value); clearWarnings(); }}
                      className="mt-2 h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-950 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    >
                      <option value="">Seleccionar</option>
                      {secondInterviewerOptions.map(user => <option key={user.id} value={user.id}>{getInterviewerName(user)}</option>)}
                    </select>
                    {!isLoadingOptions && secondInterviewerOptions.length === 0 && <span className="mt-1 block text-xs font-normal text-red-700">No hay profesionales activos con este rol.</span>}
                  </label>
                </div>
              </section>

              <section aria-labelledby="manual-schedule-heading">
                <div className="mb-3 flex items-center gap-2">
                  <FiCalendar className="h-5 w-5 text-gray-500" aria-hidden="true" />
                  <h3 id="manual-schedule-heading" className="text-base font-bold text-gray-950">Fecha y modalidad</h3>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <label className="block text-sm font-semibold text-gray-800">
                    Fecha
                    <input type="date" value={scheduledDate} onChange={event => { setScheduledDate(event.target.value); clearWarnings(); }} className="mt-2 h-11 w-full rounded-lg border border-gray-300 px-3 text-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100" />
                  </label>
                  <label className="block text-sm font-semibold text-gray-800">
                    Hora
                    <input type="time" value={scheduledTime} onChange={event => { setScheduledTime(event.target.value); clearWarnings(); }} className="mt-2 h-11 w-full rounded-lg border border-gray-300 px-3 text-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100" />
                  </label>
                  <label className="block text-sm font-semibold text-gray-800">
                    Duración
                    <div className="relative mt-2">
                      <input type="number" min={15} max={240} step={5} value={duration} onChange={event => { setDuration(Number(event.target.value)); clearWarnings(); }} className="h-11 w-full rounded-lg border border-gray-300 pl-3 pr-14 text-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100" />
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-500">min</span>
                    </div>
                  </label>
                  <label className="block text-sm font-semibold text-gray-800">
                    Modalidad
                    <select value={mode} onChange={event => { setMode(event.target.value as InterviewMode); clearWarnings(); }} className="mt-2 h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100">
                      <option value={InterviewMode.IN_PERSON}>Presencial</option>
                      <option value={InterviewMode.VIRTUAL}>Virtual</option>
                      <option value={InterviewMode.HYBRID}>Híbrida</option>
                    </select>
                  </label>
                  <label className="block text-sm font-semibold text-gray-800 sm:col-span-1 lg:col-span-2">
                    {locationLabel} <span className="font-normal text-gray-500">(opcional)</span>
                    <div className="relative mt-2">
                      <FiMapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" aria-hidden="true" />
                      <input value={location} onChange={event => { setLocation(event.target.value); clearWarnings(); }} className="h-11 w-full rounded-lg border border-gray-300 pl-9 pr-3 text-sm placeholder:text-gray-500 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100" placeholder={mode === InterviewMode.VIRTUAL ? 'https://meet.google.com/...' : 'Sala o lugar de encuentro'} />
                    </div>
                  </label>
                </div>
              </section>

              <label className="block text-sm font-semibold text-gray-800">
                Motivo del ingreso excepcional
                <textarea
                  value={reason}
                  onChange={event => { setReason(event.target.value.slice(0, 1000)); clearWarnings(); }}
                  rows={3}
                  maxLength={1000}
                  className="mt-2 w-full resize-y rounded-lg border border-gray-300 px-3 py-2.5 text-sm placeholder:text-gray-500 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  placeholder="Ej.: entrevista realizada fuera del calendario original"
                />
                <span className="mt-1 block text-right text-xs font-normal text-gray-500">{reason.length}/1000</span>
              </label>
            </div>

            <aside className="lg:border-l lg:border-gray-200 lg:pl-7" aria-label="Resumen de la entrevista excepcional">
              <div className="lg:sticky lg:top-0">
                <h3 className="text-base font-bold text-gray-950">Resumen antes de guardar</h3>
                <dl className="mt-4 space-y-4 text-sm">
                  <div><dt className="font-semibold text-gray-500">Tipo</dt><dd className="mt-1 font-bold text-gray-950">{interviewType === InterviewType.FAMILY ? 'Entrevista familiar' : 'Director de ciclo y psicológica'}</dd></div>
                  <div><dt className="font-semibold text-gray-500">Postulante</dt><dd className="mt-1 font-bold text-gray-950">{selectedApplication ? getStudentName(selectedApplication) : 'Sin seleccionar'}</dd></div>
                  <div><dt className="font-semibold text-gray-500">Entrevistadores</dt><dd className="mt-1 text-gray-900">{firstInterviewer && secondInterviewer ? `${getInterviewerName(firstInterviewer)} y ${getInterviewerName(secondInterviewer)}` : 'Sin completar'}</dd></div>
                  <div><dt className="font-semibold text-gray-500">Fecha</dt><dd className="mt-1 capitalize text-gray-900">{formatDate(scheduledDate)}{scheduledTime ? `, ${scheduledTime}` : ''}</dd></div>
                  <div><dt className="font-semibold text-gray-500">Duración y modalidad</dt><dd className="mt-1 text-gray-900">{duration || 0} min · {mode === InterviewMode.IN_PERSON ? 'Presencial' : mode === InterviewMode.VIRTUAL ? 'Virtual' : 'Híbrida'}</dd></div>
                  <div><dt className="font-semibold text-gray-500">Evaluaciones asociadas</dt><dd className="mt-1 text-gray-900">{interviewType === InterviewType.FAMILY ? 'Entrevista familiar' : 'Entrevista e informe de director, más entrevista psicológica'}</dd></div>
                </dl>

                {warnings.length > 0 && (
                  <div className="mt-6 rounded-xl bg-amber-50 p-4 text-amber-950" role="alert" aria-live="assertive">
                    <div className="flex items-start gap-2">
                      <FiAlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0" aria-hidden="true" />
                      <div>
                        <p className="font-bold">Confirma estas excepciones</p>
                        <ul className="mt-2 space-y-2 text-sm">
                          {warnings.map((warning, index) => <li key={`${warning.code}-${index}`}>{warning.message}</li>)}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {error && <div className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-800" role="alert">{error}</div>}

                <div className="mt-6 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={openReview}
                    disabled={isSubmitting || isLoadingOptions || Boolean(optionsError)}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <FiCheck className="h-4 w-4" aria-hidden="true" />
                    Revisar y guardar
                  </button>
                  <button type="button" onClick={onClose} disabled={isSubmitting} className="inline-flex min-h-11 items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:opacity-50">Cancelar</button>
                </div>

                <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-gray-600">
                  <FiInfo className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />
                  Los conflictos de horario se advierten, pero un duplicado activo o una postulación no elegible siempre bloquearán el ingreso.
                </p>
              </div>
            </aside>
          </div>
          ) : (
            <section className="mx-auto w-full max-w-3xl" aria-labelledby="manual-review-heading">
              <button
                type="button"
                onClick={returnToEdit}
                disabled={isSubmitting}
                className="mb-4 inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:opacity-50"
              >
                <FiArrowLeft className="h-4 w-4" aria-hidden="true" />
                Corregir datos
              </button>

              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5 sm:p-6">
                <h3
                  ref={reviewHeadingRef}
                  id="manual-review-heading"
                  tabIndex={-1}
                  className="text-lg font-bold text-gray-950 outline-none sm:text-xl"
                >
                  Confirma la asignación
                </h3>
                <p className="mt-1 text-sm text-gray-600">Esta es la última revisión antes de crear la entrevista y sus evaluaciones asociadas.</p>

                <dl className="mt-6 grid gap-x-6 gap-y-5 text-sm sm:grid-cols-2">
                  <div><dt className="font-semibold text-gray-500">Tipo</dt><dd className="mt-1 font-bold text-gray-950">{interviewType === InterviewType.FAMILY ? 'Entrevista familiar' : 'Director de ciclo y psicológica'}</dd></div>
                  <div><dt className="font-semibold text-gray-500">Postulante</dt><dd className="mt-1 font-bold text-gray-950">{selectedApplication ? `${getStudentName(selectedApplication)} · #${selectedApplication.id}` : 'Sin seleccionar'}</dd></div>
                  <div><dt className="font-semibold text-gray-500">{interviewType === InterviewType.FAMILY ? 'Primer entrevistador' : 'Director/a de ciclo'}</dt><dd className="mt-1 text-gray-900">{getInterviewerName(firstInterviewer) || 'Sin completar'}</dd></div>
                  <div><dt className="font-semibold text-gray-500">{interviewType === InterviewType.FAMILY ? 'Segundo entrevistador' : 'Psicólogo/a'}</dt><dd className="mt-1 text-gray-900">{getInterviewerName(secondInterviewer) || 'Sin completar'}</dd></div>
                  <div><dt className="font-semibold text-gray-500">Fecha y hora</dt><dd className="mt-1 capitalize text-gray-900">{formatDate(scheduledDate)}, {scheduledTime}</dd></div>
                  <div><dt className="font-semibold text-gray-500">Duración y modalidad</dt><dd className="mt-1 text-gray-900">{duration} min · {mode === InterviewMode.IN_PERSON ? 'Presencial' : mode === InterviewMode.VIRTUAL ? 'Virtual' : 'Híbrida'}</dd></div>
                  <div><dt className="font-semibold text-gray-500">{locationLabel}</dt><dd className="mt-1 break-words text-gray-900">{location.trim() || 'No informado'}</dd></div>
                  <div><dt className="font-semibold text-gray-500">Evaluaciones asociadas</dt><dd className="mt-1 text-gray-900">{interviewType === InterviewType.FAMILY ? 'Entrevista familiar' : 'Entrevista e informe de director, más entrevista psicológica'}</dd></div>
                  <div className="sm:col-span-2"><dt className="font-semibold text-gray-500">Motivo excepcional</dt><dd className="mt-1 whitespace-pre-wrap break-words text-gray-900">{reason.trim()}</dd></div>
                </dl>
              </div>

              <fieldset className="mt-5">
                <legend className="flex items-center gap-2 text-base font-bold text-gray-950">
                  <FiMail className="h-5 w-5 text-gray-500" aria-hidden="true" />
                  Envío de correos
                </legend>
                <p className="mt-1 text-sm text-gray-600">Elige qué debe ocurrir al confirmar. La opción segura viene seleccionada por defecto.</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 ${!sendEmail ? 'border-blue-600 bg-blue-50' : 'border-gray-300 bg-white hover:border-gray-400'}`}>
                    <input
                      type="radio"
                      name="manual-email-choice"
                      checked={!sendEmail}
                      onChange={() => { setSendEmail(false); setAssignmentConfirmed(false); }}
                      className="mt-0.5 h-4 w-4 border-gray-300 text-blue-700 focus:ring-blue-500"
                    />
                    <span><span className="block font-bold text-gray-950">No enviar correos</span><span className="mt-1 block text-sm text-gray-600">La deja confirmada y visible en el calendario y las agendas de ambos profesionales.</span></span>
                  </label>
                  <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 ${sendEmail ? 'border-blue-600 bg-blue-50' : 'border-gray-300 bg-white hover:border-gray-400'}`}>
                    <input
                      type="radio"
                      name="manual-email-choice"
                      checked={sendEmail}
                      onChange={() => { setSendEmail(true); setAssignmentConfirmed(false); }}
                      className="mt-0.5 h-4 w-4 border-gray-300 text-blue-700 focus:ring-blue-500"
                    />
                    <span><span className="block font-bold text-gray-950">Enviar correos</span><span className="mt-1 block text-sm text-gray-600">Invita al apoderado, notifica a ambos profesionales y queda pendiente de confirmación familiar.</span></span>
                  </label>
                </div>
              </fieldset>

              {warnings.length > 0 && (
                <div className="mt-5 rounded-xl bg-amber-50 p-4 text-amber-950" role="alert" aria-live="assertive">
                  <div className="flex items-start gap-2">
                    <FiAlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0" aria-hidden="true" />
                    <div>
                      <p className="font-bold">La asignación tiene excepciones</p>
                      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                        {warnings.map((warning, index) => <li key={`${warning.code}-${index}`}>{warning.message}</li>)}
                      </ul>
                      <p className="mt-3 text-sm font-semibold">Revísalas y vuelve a confirmar la asignación para continuar.</p>
                    </div>
                  </div>
                </div>
              )}

              {error && <div className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-800" role="alert">{error}</div>}

              <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl border border-gray-300 bg-white p-4">
                <input
                  type="checkbox"
                  checked={assignmentConfirmed}
                  onChange={event => setAssignmentConfirmed(event.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-700 focus:ring-blue-500"
                />
                <span className="text-sm font-semibold text-gray-900">
                  Confirmo que el postulante, el tipo de entrevista, los profesionales, el horario y la opción de correo son correctos.
                </span>
              </label>

              <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button type="button" onClick={returnToEdit} disabled={isSubmitting} className="inline-flex min-h-11 items-center justify-center rounded-lg px-5 text-sm font-semibold text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:opacity-50">Corregir datos</button>
                <button
                  type="button"
                  onClick={() => void submit(warnings.length > 0)}
                  disabled={isSubmitting || !assignmentConfirmed}
                  className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${warnings.length ? 'bg-amber-700 hover:bg-amber-800 focus:ring-amber-300' : 'bg-blue-700 hover:bg-blue-800 focus:ring-blue-300'}`}
                >
                  {warnings.length ? <FiAlertTriangle className="h-4 w-4" aria-hidden="true" /> : <FiCheck className="h-4 w-4" aria-hidden="true" />}
                  {isSubmitting ? 'Guardando...' : warnings.length ? 'Guardar de todas formas' : 'Confirmar y guardar'}
                </button>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ManualInterviewDialog;
