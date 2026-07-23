import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FiAlertCircle, FiCalendar, FiCheck, FiCheckCircle, FiClock, FiSearch, FiUsers, FiX } from 'react-icons/fi';
import { Application, applicationService } from '../../services/applicationService';
import interviewService from '../../services/interviewService';
import interviewerPairService from '../../services/interviewerPairService';
import { buildFamilyInterviewerPairs } from '../../../../packages/shared-ui/src/utils/interviewerEligibility';
import {
  AvailableInterviewerPair,
  INTERVIEW_TYPE_LABELS,
  InterviewLifecycle,
  InterviewMode,
  InterviewStatus,
  InterviewType,
  InterviewerInfo
} from '../../types/interview';
import { QuickScheduleData } from './dashboardTypes';

interface QuickSchedulePopoverProps {
  date: string;
  time: string;
  availableInterviewers: InterviewerInfo[];
  availablePairs: AvailableInterviewerPair[];
  isSubmitting: boolean;
  onSchedule: (data: QuickScheduleData, bookedInterviewerIds: [number, number]) => Promise<void>;
  onClose: () => void;
}

const ROLE_LABELS: Record<string, string> = {
  COORDINATOR: 'Coordinador/a',
  INTERVIEWER: 'Entrevistador/a',
  TEACHER: 'Docente',
  ADMIN: 'Administrador/a'
};

const getRoleLabel = (role?: string): string => ROLE_LABELS[role || ''] || 'Entrevistador/a';

const FINAL_OR_ASSIGNED_STATUSES = new Set(['INTERVIEW_SCHEDULED', 'ACCEPTED', 'REJECTED', 'WAITLIST']);

const getStudentName = (application: Application): string => (
  application.student?.fullName ||
  [application.student?.firstName, application.student?.paternalLastName, application.student?.maternalLastName || application.student?.lastName]
    .filter(Boolean)
    .join(' ') ||
  'Postulante sin nombre'
);

const getGrade = (application: Application): string => (
  application.student?.gradeApplied ||
  application.student?.gradeApplying ||
  application.student?.grade ||
  'Curso no informado'
);

const getGuardianName = (application: Application): string => (
  application.guardian?.fullName ||
  [application.applicantUser?.firstName, application.applicantUser?.lastName].filter(Boolean).join(' ') ||
  'Apoderado no informado'
);

const isPendingInterviewAssignment = (application: Application): boolean => (
  !FINAL_OR_ASSIGNED_STATUSES.has((application.status || '').toUpperCase())
);

const getTodayDateString = (): string => {
  const today = new Date();
  const year = today.getFullYear();
  const month = `${today.getMonth() + 1}`.padStart(2, '0');
  const day = `${today.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatScheduleDate = (date: string): string => {
  const parsedDate = new Date(`${date}T00:00:00`);
  return new Intl.DateTimeFormat('es-CL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  }).format(parsedDate);
};

const QuickSchedulePopover: React.FC<QuickSchedulePopoverProps> = ({
  date,
  time,
  availableInterviewers,
  availablePairs,
  isSubmitting,
  onSchedule,
  onClose
}) => {
  const [remainingInterviewers, setRemainingInterviewers] = useState<InterviewerInfo[]>(availableInterviewers);
  const familyPairs = useMemo(() => buildFamilyInterviewerPairs(remainingInterviewers), [remainingInterviewers]);
  const [pairIndex, setPairIndex] = useState(0);
  const [eligiblePairs, setEligiblePairs] = useState<AvailableInterviewerPair[]>(availablePairs);
  const [bookedConfiguredPairIds, setBookedConfiguredPairIds] = useState<Set<number>>(() => new Set());
  const [selectedConfiguredPairId, setSelectedConfiguredPairId] = useState('');
  const [pairsLoading, setPairsLoading] = useState(false);
  const [pairEligibilityMessage, setPairEligibilityMessage] = useState<string | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [applicationsLoading, setApplicationsLoading] = useState(false);
  const [assignedTypesByApplication, setAssignedTypesByApplication] = useState<Record<number, InterviewType[]>>({});
  const [applicationSearch, setApplicationSearch] = useState('');
  const [selectedApplicationId, setSelectedApplicationId] = useState('');
  const [type, setType] = useState<InterviewType>(InterviewType.FAMILY);
  const [mode, setMode] = useState<InterviewMode>(InterviewMode.IN_PERSON);
  const [location, setLocation] = useState('');
  const [locationTouched, setLocationTouched] = useState(false);
  const [dateError, setDateError] = useState<string | null>(date < getTodayDateString() ? 'No se puede agendar en fechas anteriores a hoy.' : null);
  const [lastBookedStudentName, setLastBookedStudentName] = useState<string | null>(null);
  const [bookedCount, setBookedCount] = useState(0);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [applicationsError, setApplicationsError] = useState<string | null>(null);
  const [applicationsReloadKey, setApplicationsReloadKey] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLFormElement>(null);
  const selectedApplication = applications.find(application => application.id === Number(selectedApplicationId));
  const selectedConfiguredPair = eligiblePairs.find(pair => String(pair.id) === selectedConfiguredPairId);
  const selectedFamilyPair = familyPairs[pairIndex];
  const selectedPairMembers: [InterviewerInfo, InterviewerInfo] | null = type === InterviewType.CYCLE_DIRECTOR
    ? selectedConfiguredPair
      ? [selectedConfiguredPair.cycleDirector, selectedConfiguredPair.psychologist]
      : null
    : selectedFamilyPair || null;
  const selectedAssignedTypes = selectedApplication ? assignedTypesByApplication[selectedApplication.id] || [] : [];
  const availableTypes = [InterviewType.FAMILY, InterviewType.CYCLE_DIRECTOR].filter(
    interviewType => !selectedAssignedTypes.includes(interviewType)
  );
  const typeAlreadyAssigned = selectedAssignedTypes.includes(type);
  const needsLocation = mode === InterviewMode.IN_PERSON || mode === InterviewMode.HYBRID || mode === InterviewMode.VIRTUAL;
  const locationLabel = mode === InterviewMode.VIRTUAL ? 'Enlace de reunión' : mode === InterviewMode.HYBRID ? 'Ubicación y enlace' : 'Ubicación';
  const locationPlaceholder = mode === InterviewMode.VIRTUAL ? 'https://meet.google.com/...' : mode === InterviewMode.HYBRID ? 'Sala de entrevistas y enlace remoto' : 'Sala de entrevistas';
  const locationError = needsLocation && !location.trim() ? `${locationLabel} es obligatorio para esta modalidad.` : null;
  const pairCount = type === InterviewType.CYCLE_DIRECTOR ? eligiblePairs.length : familyPairs.length;
  const canSubmit = Boolean(selectedPairMembers && selectedApplication && !typeAlreadyAssigned && !locationError && !dateError && !isSubmitting && !pairsLoading);

  useEffect(() => {
    searchInputRef.current?.focus();
    const handleDialogKeyboard = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isSubmitting) {
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !dialogRef.current) return;

      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )).filter(element => !element.hasAttribute('hidden'));
      if (focusable.length === 0) return;

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
    window.addEventListener('keydown', handleDialogKeyboard);
    return () => window.removeEventListener('keydown', handleDialogKeyboard);
  }, [isSubmitting, onClose]);

  useEffect(() => {
    let cancelled = false;
    setApplicationsLoading(true);
    setApplicationsError(null);

    // Cargar postulaciones y entrevistas en paralelo
    Promise.all([
      applicationService.getAllApplications({ size: 2000 }),
      interviewService.getAllInterviews(0, 1000)
    ])
      .then(([applicationsResponse, interviewsResponse]) => {
        if (cancelled) return;

        // Separar aplicaciones con entrevistas FAMILY y CYCLE_DIRECTOR activas
        const appIdsWithFamily = new Set<number>();
        const appIdsWithCycleDirector = new Set<number>();
        const nextAssignedTypes: Record<number, InterviewType[]> = {};

        interviewsResponse.interviews.forEach(interview => {
          if (InterviewLifecycle.countsAsAssigned(interview.status as InterviewStatus)) {
            if (interview.type === InterviewType.FAMILY) {
              appIdsWithFamily.add(interview.applicationId);
              nextAssignedTypes[interview.applicationId] = [...(nextAssignedTypes[interview.applicationId] || []), InterviewType.FAMILY];
            } else if (interview.type === InterviewType.CYCLE_DIRECTOR) {
              appIdsWithCycleDirector.add(interview.applicationId);
              nextAssignedTypes[interview.applicationId] = [...(nextAssignedTypes[interview.applicationId] || []), InterviewType.CYCLE_DIRECTOR];
            }
          }
        });

        // Filtrar: solo postulaciones pendientes Y que NO tengan ambas entrevistas
        const validApplications = applicationsResponse.filter(app =>
          isPendingInterviewAssignment(app) &&
          !(appIdsWithFamily.has(app.id) && appIdsWithCycleDirector.has(app.id))
        );

        setApplications(validApplications);
        setAssignedTypesByApplication(nextAssignedTypes);
      })
      .catch(() => {
        if (!cancelled) {
          setApplications([]);
          setApplicationsError('No pudimos cargar los postulantes. Reintenta para continuar.');
        }
      })
      .finally(() => {
        if (!cancelled) setApplicationsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [applicationsReloadKey]);

  useEffect(() => {
    if (!selectedApplication) {
      const remainingConfiguredPairs = availablePairs.filter(pair => !bookedConfiguredPairIds.has(pair.id));
      setEligiblePairs(remainingConfiguredPairs);
      setSelectedConfiguredPairId('');
      setPairEligibilityMessage(null);
      setPairsLoading(false);
      return;
    }

    let cancelled = false;
    setPairsLoading(true);
    setPairEligibilityMessage(null);
    interviewerPairService.getEligible({
      applicationId: selectedApplication.id,
      date,
      time,
      duration: 60
    }).then(result => {
      if (cancelled) return;
      const slotPairIds = new Set(availablePairs.filter(pair => !bookedConfiguredPairIds.has(pair.id)).map(pair => pair.id));
      const pairsForSlot = (result.eligiblePairs || []).filter(pair => (
        !bookedConfiguredPairIds.has(pair.id) && (slotPairIds.size === 0 || slotPairIds.has(pair.id))
      ));
      setEligiblePairs(pairsForSlot);
      setSelectedConfiguredPairId(current =>
        pairsForSlot.some(pair => String(pair.id) === current)
          ? current
          : pairsForSlot.length === 1 ? String(pairsForSlot[0].id) : ''
      );
      setPairEligibilityMessage(pairsForSlot.length ? null : (result.reason || 'No hay una pareja compatible con el curso y el horario seleccionados.'));
    }).catch(error => {
      if (cancelled) return;
      setEligiblePairs([]);
      setSelectedConfiguredPairId('');
      setPairEligibilityMessage(error.message || 'No fue posible validar las parejas configuradas.');
    }).finally(() => {
      if (!cancelled) setPairsLoading(false);
    });

    return () => { cancelled = true; };
  }, [availablePairs, bookedConfiguredPairIds, date, selectedApplication, time]);

  const filteredApplications = useMemo(() => {
    const query = applicationSearch.trim().toLowerCase();
    return applications
      .filter(application => {
        if (!query) return true;
        const haystack = [
          getStudentName(application),
          application.student?.rut,
          getGrade(application),
          getGuardianName(application),
          application.status
        ].join(' ').toLowerCase();
        return haystack.includes(query);
      })
      .slice(0, 40);
  }, [applicationSearch, applications]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedPairMembers || !selectedApplication || !canSubmit) return;
    setScheduleError(null);

    if (date < getTodayDateString()) {
      setDateError('No se puede agendar en fechas anteriores a hoy.');
      return;
    }

    const bookedPair: [number, number] = [selectedPairMembers[0].id, selectedPairMembers[1].id];
    const studentName = getStudentName(selectedApplication);

    try {
      await onSchedule({
        date,
        time,
        interviewer1Id: selectedPairMembers[0].id,
        interviewer2Id: selectedPairMembers[1].id,
        interviewerPairId: type === InterviewType.CYCLE_DIRECTOR ? selectedConfiguredPair?.id : undefined,
        applicationId: selectedApplication.id,
        type,
        mode,
        location: location.trim() || undefined
      }, bookedPair);
    } catch (error: any) {
      setScheduleError(error?.message || 'No se pudo programar la entrevista. Revisa la disponibilidad y vuelve a intentar.');
      return;
    }

    const nextRemaining = remainingInterviewers.filter(
      interviewer => !bookedPair.includes(interviewer.id)
    );
    const nextFamilyPairs = buildFamilyInterviewerPairs(nextRemaining);
    const nextConfiguredPairs = eligiblePairs.filter(pair => pair.id !== selectedConfiguredPair?.id);

    setLastBookedStudentName(studentName);
    setBookedCount(prev => prev + 1);
    setRemainingInterviewers(nextRemaining);
    if (type === InterviewType.CYCLE_DIRECTOR) {
      if (selectedConfiguredPair) {
        setBookedConfiguredPairIds(current => new Set(current).add(selectedConfiguredPair.id));
      }
      setEligiblePairs(nextConfiguredPairs);
      setSelectedConfiguredPairId(nextConfiguredPairs.length === 1 ? String(nextConfiguredPairs[0].id) : '');
    }
    setPairIndex(0);
    setSelectedApplicationId('');
    setApplicationSearch('');

    if ((type === InterviewType.CYCLE_DIRECTOR ? nextConfiguredPairs.length : nextFamilyPairs.length) === 0) {
      setTimeout(onClose, 1200);
    }
  };

  useEffect(() => {
    if (!selectedApplication || availableTypes.includes(type)) return;
    setType(availableTypes[0] || InterviewType.FAMILY);
  }, [availableTypes, selectedApplication, type]);

  useEffect(() => {
    if (!selectedApplication || pairsLoading) return;
    const schedulableTypes = availableTypes.filter(interviewType => (
      interviewType === InterviewType.FAMILY ? familyPairs.length > 0 : eligiblePairs.length > 0
    ));
    if (!schedulableTypes.includes(type) && schedulableTypes.length > 0) {
      setType(schedulableTypes[0]);
    }
  }, [availableTypes, eligiblePairs.length, familyPairs.length, pairsLoading, selectedApplication, type]);

  useEffect(() => {
    if (pairIndex < familyPairs.length) return;
    setPairIndex(0);
  }, [familyPairs.length, pairIndex]);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-gray-950/45 p-3 sm:p-5">
      <form
        ref={dialogRef}
        onSubmit={handleSubmit}
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-schedule-title"
        className="flex max-h-[calc(100vh-1.5rem)] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl sm:max-h-[calc(100vh-2.5rem)]"
      >
        <header className="flex flex-shrink-0 items-start justify-between gap-4 border-b border-gray-200 px-5 py-4 sm:px-6">
          <div>
            <h3 id="quick-schedule-title" className="text-xl font-bold text-gray-950">Agendar entrevista</h3>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-medium text-gray-600">
              <span className="inline-flex items-center gap-1.5">
                <FiCalendar className="h-4 w-4" aria-hidden="true" />
                {formatScheduleDate(date)}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <FiClock className="h-4 w-4" aria-hidden="true" />
                {time}
              </span>
            </div>
            {dateError && <p className="mt-1 text-sm font-semibold text-red-600">{dateError}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="inline-flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg text-gray-600 transition-colors hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Cerrar"
          >
            <FiX className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 sm:px-6">
          {lastBookedStudentName && (
            <div className="mt-4 flex items-start gap-2 rounded-lg bg-emerald-50 px-3 py-2.5 text-sm font-medium text-emerald-900" role="status">
              <FiCheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-700" aria-hidden="true" />
              <span>
                <strong>{lastBookedStudentName}</strong> quedó agendado/a. Puedes continuar con otro postulante en este mismo bloque.
              </span>
            </div>
          )}

          {(scheduleError || applicationsError) && (
            <div className="mt-4 flex items-start justify-between gap-3 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-900" role="alert">
              <span className="flex min-w-0 items-start gap-2">
                <FiAlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />
                <span>{scheduleError || applicationsError}</span>
              </span>
              {applicationsError && (
                <button
                  type="button"
                  onClick={() => setApplicationsReloadKey(current => current + 1)}
                  className="flex-shrink-0 font-semibold underline underline-offset-2 focus:outline-none focus:ring-2 focus:ring-red-300"
                >
                  Reintentar
                </button>
              )}
            </div>
          )}

          <section className="border-b border-gray-200 py-5" aria-labelledby="applicant-step-title">
            <div className="mb-3 flex items-start justify-between gap-3">
              <h4 id="applicant-step-title" className="text-sm font-bold text-gray-900">Postulante</h4>
              {applicationsLoading && <span className="text-xs font-semibold text-gray-500" role="status">Cargando…</span>}
            </div>

            {selectedApplication ? (
              <div className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-gray-950">{getStudentName(selectedApplication)}</p>
                  <p className="mt-0.5 truncate text-xs font-medium text-gray-700">
                    {selectedApplication.student?.rut || 'RUT no informado'} · {getGrade(selectedApplication)} · {getGuardianName(selectedApplication)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedApplicationId('');
                    setSelectedConfiguredPairId('');
                    setApplicationSearch('');
                    setScheduleError(null);
                  }}
                  disabled={isSubmitting}
                  className="min-h-11 flex-shrink-0 rounded-lg px-3 text-sm font-semibold text-azul-monte-tabor hover:bg-white focus:outline-none focus:ring-2 focus:ring-blue-200"
                >
                  Cambiar
                </button>
              </div>
            ) : (
              <>
                <label className="relative block">
                  <span className="sr-only">Buscar postulante</span>
                  <FiSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" aria-hidden="true" />
                  <input
                    ref={searchInputRef}
                    value={applicationSearch}
                    onChange={event => setApplicationSearch(event.target.value)}
                    className="h-11 w-full rounded-lg border border-gray-300 pl-9 pr-3 text-sm text-gray-950 placeholder:text-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    placeholder="Buscar por nombre, RUT, curso o apoderado"
                  />
                </label>

                <div className="mt-2 max-h-44 overflow-y-auto rounded-lg border border-gray-200">
                  {filteredApplications.length === 0 ? (
                    <div className="p-4 text-center text-sm text-gray-600">
                      {applicationsLoading ? 'Cargando postulantes…' : 'No encontramos postulantes con esa búsqueda.'}
                    </div>
                  ) : (
                    filteredApplications.map(application => (
                      <button
                        key={application.id}
                        type="button"
                        onClick={() => {
                          setSelectedApplicationId(String(application.id));
                          setSelectedConfiguredPairId('');
                          setScheduleError(null);
                        }}
                        className="w-full border-b border-gray-100 px-3 py-2.5 text-left transition-colors last:border-b-0 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-300"
                      >
                        <span className="flex items-start justify-between gap-3">
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-semibold text-gray-950">{getStudentName(application)}</span>
                          <span className="mt-0.5 block truncate text-xs text-gray-600">
                              {application.student?.rut || 'RUT no informado'} · {getGrade(application)} · {getGuardianName(application)}
                            </span>
                          </span>
                          <span className="flex-shrink-0 pt-0.5 text-xs font-medium text-gray-500">
                            {application.status === 'PENDING' ? 'Pendiente' : application.status}
                          </span>
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </>
            )}
          </section>

          <section className="border-b border-gray-200 py-5" aria-labelledby="type-step-title">
            <div className="mb-3">
              <h4 id="type-step-title" className="text-sm font-bold text-gray-900">Tipo de entrevista</h4>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {[InterviewType.FAMILY, InterviewType.CYCLE_DIRECTOR].map(interviewType => {
                const alreadyAssigned = selectedAssignedTypes.includes(interviewType);
                const isChecking = interviewType === InterviewType.CYCLE_DIRECTOR && pairsLoading && Boolean(selectedApplication);
                const availableCount = interviewType === InterviewType.FAMILY ? familyPairs.length : eligiblePairs.length;
                const unavailable = Boolean(selectedApplication) && !isChecking && availableCount === 0;
                const disabled = !selectedApplication || alreadyAssigned || unavailable || isSubmitting;
                const isSelected = type === interviewType && !disabled;
                const availabilityLabel = !selectedApplication
                  ? 'Selecciona un postulante'
                  : alreadyAssigned
                    ? 'Ya agendada'
                    : isChecking
                      ? 'Validando curso y horario…'
                      : unavailable
                        ? 'Sin pareja válida en este horario'
                        : `${availableCount} ${availableCount === 1 ? 'pareja disponible' : 'parejas disponibles'}`;
                return (
                  <label
                    key={interviewType}
                    className={`relative flex min-h-[72px] items-start gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors focus-within:ring-2 focus-within:ring-[#008a57]/30 ${
                      isSelected
                        ? 'border-[#008a57] bg-emerald-50'
                        : disabled
                          ? 'cursor-not-allowed border-gray-200 bg-gray-50 text-gray-500'
                          : 'cursor-pointer border-gray-300 bg-white hover:border-gray-400'
                    }`}
                  >
                    <input
                      type="radio"
                      name="interview-type"
                      value={interviewType}
                      checked={isSelected}
                      disabled={disabled}
                      onChange={() => {
                        setType(interviewType);
                        setScheduleError(null);
                      }}
                      className="mt-1 h-4 w-4 flex-shrink-0 accent-[#008a57]"
                    />
                    <span className="min-w-0">
                      <span>
                        <span className={`block text-sm font-bold ${isSelected ? 'text-emerald-950' : 'text-gray-900'}`}>
                          {INTERVIEW_TYPE_LABELS[interviewType]}
                        </span>
                        <span className={`mt-1 block text-xs ${isSelected ? 'text-emerald-800' : 'text-gray-600'}`}>
                          {availabilityLabel}
                        </span>
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
            {selectedApplication && !pairsLoading && familyPairs.length === 0 && eligiblePairs.length === 0 && (
              <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900" role="status">
                No hay una combinación válida para este postulante en el horario seleccionado. Prueba otro bloque.
              </p>
            )}
          </section>

          {selectedApplication && (
            <section className="border-b border-gray-200 py-5" aria-labelledby="pair-step-title">
              <fieldset>
                <legend id="pair-step-title" className="text-sm font-bold text-gray-900">Pareja de entrevistadores</legend>
                <p className="mt-0.5 text-sm text-gray-600">
                  {type === InterviewType.FAMILY
                    ? 'Solo entrevistadores y coordinadores disponibles.'
                    : `Director de Ciclo + Psicólogo/a para ${getGrade(selectedApplication)}.`}
                </p>
                {pairsLoading && type === InterviewType.CYCLE_DIRECTOR ? (
                  <div className="mt-3 flex min-h-16 items-center gap-2 rounded-lg bg-gray-50 px-3 text-sm text-gray-700" role="status">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600 motion-reduce:animate-none" aria-hidden="true" />
                    Validando parejas…
                  </div>
                ) : pairCount === 0 ? (
                  <div className="mt-3 flex min-h-16 items-center gap-3 rounded-lg bg-amber-50 px-3 text-sm text-amber-900" role="status">
                    <FiUsers className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
                    <span>{type === InterviewType.CYCLE_DIRECTOR && pairEligibilityMessage
                      ? pairEligibilityMessage
                      : 'No hay parejas válidas disponibles para este horario.'}</span>
                  </div>
                ) : (
                  <div className="mt-3 max-h-48 divide-y divide-gray-100 overflow-y-auto rounded-lg border border-gray-200" aria-label="Parejas disponibles">
                    {(type === InterviewType.CYCLE_DIRECTOR
                      ? eligiblePairs.map(pair => ({
                        key: `configured-${pair.id}`,
                        selected: String(pair.id) === selectedConfiguredPairId,
                        onSelect: () => setSelectedConfiguredPairId(String(pair.id)),
                        first: pair.cycleDirector,
                        second: pair.psychologist,
                        firstRole: 'Director/a de Ciclo',
                        secondRole: 'Psicólogo/a'
                      }))
                      : familyPairs.map((pair, index) => ({
                        key: `family-${pair[0].id}-${pair[1].id}`,
                        selected: index === pairIndex,
                        onSelect: () => setPairIndex(index),
                        first: pair[0],
                        second: pair[1],
                        firstRole: getRoleLabel(pair[0].role),
                        secondRole: getRoleLabel(pair[1].role)
                      }))).map(option => (
                    <label
                      key={option.key}
                      className={`flex min-h-16 w-full items-start gap-3 px-3 py-2.5 text-left transition-colors focus-within:ring-2 focus-within:ring-inset focus-within:ring-[#008a57]/30 ${
                        option.selected
                          ? 'bg-emerald-50 text-emerald-950'
                          : 'cursor-pointer bg-white text-gray-800 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name={`interviewer-pair-${type}`}
                        checked={option.selected}
                        onChange={option.onSelect}
                        disabled={isSubmitting}
                        className="mt-1 h-4 w-4 flex-shrink-0 accent-[#008a57]"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">
                          {option.first.name}
                          <span className="ml-1 font-normal text-gray-600">· {option.firstRole}</span>
                        </span>
                        <span className="mt-0.5 block truncate text-sm font-semibold">
                          {option.second.name}
                          <span className="ml-1 font-normal text-gray-600">· {option.secondRole}</span>
                        </span>
                      </span>
                    </label>
                  ))}
                  </div>
                )}
              </fieldset>
            </section>
          )}

          <section className="py-5" aria-labelledby="details-step-title">
            <h4 id="details-step-title" className="mb-3 text-sm font-bold text-gray-900">Detalles</h4>
            <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-gray-800">Modalidad</span>
              <select
                value={mode}
                onChange={event => setMode(event.target.value as InterviewMode)}
                disabled={isSubmitting}
                className="min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-950 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100"
              >
                <option value={InterviewMode.IN_PERSON}>Presencial</option>
                <option value={InterviewMode.VIRTUAL}>Virtual</option>
                <option value={InterviewMode.HYBRID}>Híbrida</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-gray-800">{locationLabel} *</span>
              <input
                value={location}
                onChange={event => {
                  setLocation(event.target.value);
                  setLocationTouched(true);
                }}
                onBlur={() => setLocationTouched(true)}
                disabled={isSubmitting}
                aria-invalid={Boolean(locationError)}
                className={`min-h-11 w-full rounded-lg border px-3 py-2 text-sm text-gray-950 placeholder:text-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100 ${
                  locationError ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
                placeholder={locationPlaceholder}
              />
              {locationTouched && locationError && <span className="mt-1 block text-xs font-semibold text-red-700">{locationError}</span>}
            </label>
          </div>
          </section>
        </div>

        <footer className="flex flex-shrink-0 items-center justify-between gap-3 border-t border-gray-200 bg-white px-5 py-4 sm:px-6">
          {bookedCount > 0 && (
            <p className="hidden text-xs font-medium text-gray-600 sm:block">
              {bookedCount} {bookedCount === 1 ? 'entrevista agendada' : 'entrevistas agendadas'} en este bloque
            </p>
          )}
          <div className="ml-auto flex gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="min-h-11 rounded-lg px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={!canSubmit}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#008a57] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#007549] focus:outline-none focus:ring-2 focus:ring-[#008a57]/30 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            <FiCheck className="h-4 w-4" aria-hidden="true" />
            {isSubmitting ? 'Programando…' : 'Programar entrevista'}
          </button>
          </div>
        </footer>
      </form>
    </div>
  );
};

export default QuickSchedulePopover;
