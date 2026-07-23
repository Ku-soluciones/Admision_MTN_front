import React, { useEffect, useMemo, useState } from 'react';
import { FiCheck, FiCheckCircle, FiSearch, FiUsers, FiX } from 'react-icons/fi';
import { Application, applicationService } from '../../services/applicationService';
import interviewService from '../../services/interviewService';
import interviewerPairService from '../../services/interviewerPairService';
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
  onSchedule: (data: QuickScheduleData, bookedInterviewerIds: [number, number]) => void;
  onClose: () => void;
}

const isCycleInterviewRole = (role?: string): boolean => role === 'CYCLE_DIRECTOR' || role === 'PSYCHOLOGIST';

const isValidFamilyPair = (first: InterviewerInfo, second: InterviewerInfo): boolean => (
  !isCycleInterviewRole(first.role) && !isCycleInterviewRole(second.role)
);

const ROLE_LABELS: Record<string, string> = {
  COORDINATOR: 'Coordinador/a',
  INTERVIEWER: 'Entrevistador/a',
  TEACHER: 'Docente',
  ADMIN: 'Administrador/a'
};

const getRoleLabel = (role?: string): string => ROLE_LABELS[role || ''] || 'Entrevistador/a';

const buildPairs = (interviewers: InterviewerInfo[]): Array<[InterviewerInfo, InterviewerInfo]> => {
  const pairs: Array<[InterviewerInfo, InterviewerInfo]> = [];
  interviewers.forEach((first, firstIndex) => {
    interviewers.slice(firstIndex + 1).forEach(second => {
      if (isValidFamilyPair(first, second)) pairs.push([first, second]);
    });
  });
  return pairs;
};

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
  const familyPairs = useMemo(() => buildPairs(remainingInterviewers), [remainingInterviewers]);
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
  const [type, setType] = useState<InterviewType>(
    availablePairs.length > 0 ? InterviewType.CYCLE_DIRECTOR : InterviewType.FAMILY
  );
  const [mode, setMode] = useState<InterviewMode>(InterviewMode.IN_PERSON);
  const [location, setLocation] = useState('');
  const [dateError, setDateError] = useState<string | null>(date < getTodayDateString() ? 'No se puede agendar en fechas anteriores a hoy.' : null);
  const [lastBookedStudentName, setLastBookedStudentName] = useState<string | null>(null);
  const [bookedCount, setBookedCount] = useState(0);
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
  const locationLabel = mode === InterviewMode.VIRTUAL ? 'Enlace de reunion' : mode === InterviewMode.HYBRID ? 'Ubicacion y enlace' : 'Ubicacion';
  const locationPlaceholder = mode === InterviewMode.VIRTUAL ? 'https://meet.google.com/...' : mode === InterviewMode.HYBRID ? 'Sala de entrevistas y enlace remoto' : 'Sala de entrevistas';
  const locationError = needsLocation && !location.trim() ? `${locationLabel} es obligatorio para esta modalidad.` : null;
  const pairCount = type === InterviewType.CYCLE_DIRECTOR ? eligiblePairs.length : familyPairs.length;
  const canSubmit = Boolean(selectedPairMembers && selectedApplication && !typeAlreadyAssigned && !locationError && !dateError && !isSubmitting && !pairsLoading);

  useEffect(() => {
    let cancelled = false;
    setApplicationsLoading(true);

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
        if (!cancelled) setApplications([]);
      })
      .finally(() => {
        if (!cancelled) setApplicationsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (type !== InterviewType.CYCLE_DIRECTOR) {
      setPairsLoading(false);
      setPairEligibilityMessage(null);
      return;
    }
    if (!selectedApplication) {
      const remainingConfiguredPairs = availablePairs.filter(pair => !bookedConfiguredPairIds.has(pair.id));
      setEligiblePairs(remainingConfiguredPairs);
      setSelectedConfiguredPairId(remainingConfiguredPairs.length === 1 ? String(remainingConfiguredPairs[0].id) : '');
      setPairEligibilityMessage('Selecciona un postulante para validar el curso que cubre cada pareja.');
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
      const pairsForSlot = (result.eligiblePairs || []).filter(pair => slotPairIds.has(pair.id));
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
  }, [availablePairs, bookedConfiguredPairIds, date, selectedApplication, time, type]);

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

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedPairMembers || !selectedApplication || !canSubmit) return;

    if (date < getTodayDateString()) {
      setDateError('No se puede agendar en fechas anteriores a hoy.');
      return;
    }

    const bookedPair: [number, number] = [selectedPairMembers[0].id, selectedPairMembers[1].id];
    const studentName = getStudentName(selectedApplication);

    onSchedule({
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

    const nextRemaining = remainingInterviewers.filter(
      interviewer => !bookedPair.includes(interviewer.id)
    );
    const nextFamilyPairs = buildPairs(nextRemaining);
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

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-gray-900/40 p-4 backdrop-blur-[2px]">
      <form onSubmit={handleSubmit} className="max-h-[calc(100vh-2rem)] w-full max-w-xl overflow-y-auto rounded-xl border border-gray-200 bg-white p-5 shadow-2xl">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Agendar entrevista</h3>
            <p className="text-sm text-gray-500">{date} · {time}</p>
            {dateError && <p className="mt-1 text-sm font-semibold text-red-600">{dateError}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-100"
            aria-label="Cerrar"
          >
            <FiX aria-hidden="true" />
          </button>
        </div>

        {lastBookedStudentName && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">
            <FiCheckCircle className="h-4 w-4 flex-shrink-0 text-emerald-600" aria-hidden="true" />
            <span>
              <strong>{lastBookedStudentName}</strong> agendada · {bookedCount} agendada{bookedCount !== 1 ? 's' : ''} en este slot
              {pairCount > 0
                ? ` · ${pairCount} pareja${pairCount !== 1 ? 's' : ''} restante${pairCount !== 1 ? 's' : ''}`
                : ' · Cerrando...'}
            </span>
          </div>
        )}

        <div className="space-y-4">
          <fieldset>
            <legend className="text-sm font-semibold text-gray-800">Pareja de entrevistadores</legend>
            <p className="mt-0.5 text-xs text-gray-500">
              {type === InterviewType.FAMILY
                ? 'Solo se muestran entrevistadores habilitados para entrevista familiar.'
                : 'Parejas configuradas de Director de Ciclo y Psicólogo/a.'}
            </p>
            {pairsLoading ? (
              <div className="mt-2 flex min-h-16 items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm text-gray-600" role="status">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" aria-hidden="true" />
                Validando parejas disponibles…
              </div>
            ) : pairCount === 0 ? (
              <div className="mt-2 flex min-h-16 items-center gap-3 rounded-lg border border-dashed border-amber-300 bg-amber-50 px-3 text-sm text-amber-800" role="status">
                <FiUsers className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
                No hay parejas válidas disponibles para este horario.
              </div>
            ) : (
              <div className="mt-2 max-h-44 space-y-2 overflow-y-auto pr-1" role="radiogroup" aria-label="Parejas disponibles">
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
                    <button
                      key={option.key}
                      type="button"
                      role="radio"
                      aria-checked={option.selected}
                      onClick={option.onSelect}
                      className={`flex min-h-14 w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-blue-200 ${
                        option.selected
                          ? 'border-blue-400 bg-blue-50 text-blue-950'
                          : 'border-gray-200 bg-white text-gray-800 hover:border-blue-200 hover:bg-blue-50/50'
                      }`}
                    >
                      <span className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${option.selected ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                        {option.selected ? <FiCheck aria-hidden="true" /> : <FiUsers aria-hidden="true" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">{option.first.name}</span>
                        <span className="block truncate text-sm font-semibold">{option.second.name}</span>
                      </span>
                      <span className="hidden flex-shrink-0 text-right text-[11px] leading-4 text-gray-500 sm:block">
                        <span className="block">{option.firstRole}</span>
                        <span className="block">{option.secondRole}</span>
                      </span>
                    </button>
                  ))}
              </div>
            )}
            {pairEligibilityMessage && type === InterviewType.CYCLE_DIRECTOR && (
              <span className="mt-1 block text-xs font-medium text-amber-700" role="status">{pairEligibilityMessage}</span>
            )}
          </fieldset>

          <div className="rounded-lg border border-gray-200 p-3">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <span className="block text-sm font-semibold text-gray-700">Postulante pendiente</span>
                <span className="text-xs text-gray-500">Busca por nombre, RUT, curso o apoderado</span>
              </div>
              {applicationsLoading && <span className="text-xs font-semibold text-gray-500">Cargando...</span>}
            </div>
            <label className="relative block">
              <FiSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
              <input
                value={applicationSearch}
                onChange={event => setApplicationSearch(event.target.value)}
                className="h-11 w-full rounded-lg border border-gray-300 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                placeholder="Ej: Sofia Gonzalez, 12.345.678-9, 7 basico"
              />
            </label>

            <div className="mt-3 max-h-52 overflow-auto rounded-lg border border-gray-100">
              {filteredApplications.length === 0 ? (
                <div className="p-4 text-center text-sm text-gray-500">
                  {applicationsLoading ? 'Cargando postulantes...' : 'No hay postulantes pendientes para esta busqueda.'}
                </div>
              ) : (
                filteredApplications.map(application => {
                  const isSelected = selectedApplicationId === String(application.id);
                  return (
                    <button
                      key={application.id}
                      type="button"
                      onClick={() => setSelectedApplicationId(String(application.id))}
                      className={`w-full border-b border-gray-100 p-3 text-left transition-colors last:border-b-0 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-300 ${
                        isSelected ? 'bg-blue-50' : 'bg-white hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-gray-900">{getStudentName(application)}</p>
                          <p className="truncate text-xs text-gray-500">
                            {application.student?.rut || 'RUT no informado'} · {getGrade(application)} · {getGuardianName(application)}
                          </p>
                        </div>
                        <span className={`inline-flex flex-shrink-0 items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${isSelected ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'}`}>
                          {isSelected && <FiCheck className="h-3 w-3" aria-hidden="true" />}
                          {application.status === 'PENDING' ? 'Pendiente' : application.status}
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-gray-700">Tipo</span>
              <select
                value={type}
                onChange={event => setType(event.target.value as InterviewType)}
                disabled={!selectedApplication || availableTypes.length === 0}
                className="min-h-11 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              >
                {[InterviewType.FAMILY, InterviewType.CYCLE_DIRECTOR].map(interviewType => (
                  <option key={interviewType} value={interviewType} disabled={selectedAssignedTypes.includes(interviewType)}>
                    {INTERVIEW_TYPE_LABELS[interviewType]}{selectedAssignedTypes.includes(interviewType) ? ' (ya asignada)' : ''}
                  </option>
                ))}
              </select>
              {selectedApplication && availableTypes.length === 0 && (
                <p className="mt-1 text-xs font-semibold text-amber-700">
                  Este postulante ya tiene ambos tipos de entrevista asignados.
                </p>
              )}
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-gray-700">Modalidad</span>
              <select
                value={mode}
                onChange={event => setMode(event.target.value as InterviewMode)}
                className="min-h-11 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              >
                <option value={InterviewMode.IN_PERSON}>Presencial</option>
                <option value={InterviewMode.VIRTUAL}>Virtual</option>
                <option value={InterviewMode.HYBRID}>Hibrida</option>
              </select>
            </label>
          </div>

          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-gray-700">{locationLabel}</span>
            <input
              value={location}
              onChange={event => setLocation(event.target.value)}
              className={`min-h-11 w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 ${
                locationError ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
              placeholder={locationPlaceholder}
            />
            {locationError && <p className="mt-1 text-xs font-semibold text-red-600">{locationError}</p>}
          </label>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-100"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={!canSubmit}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-300 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            <FiCheck className="h-4 w-4" aria-hidden="true" />
            {isSubmitting ? 'Programando...' : pairCount > 1 ? 'Programar y continuar' : 'Programar entrevista'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default QuickSchedulePopover;
