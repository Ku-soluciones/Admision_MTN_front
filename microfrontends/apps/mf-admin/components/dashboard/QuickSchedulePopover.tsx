import React, { useEffect, useMemo, useState } from 'react';
import { FiCheck, FiSearch, FiX } from 'react-icons/fi';
import { Application, applicationService } from '../../services/applicationService';
import interviewService from '../../services/interviewService';
import { InterviewMode, InterviewStatus, InterviewType, InterviewerInfo } from '../../types/interview';
import { QuickScheduleData } from './dashboardTypes';

interface QuickSchedulePopoverProps {
  date: string;
  time: string;
  availableInterviewers: InterviewerInfo[];
  isSubmitting: boolean;
  onSchedule: (data: QuickScheduleData) => void;
  onClose: () => void;
}

const buildPairs = (interviewers: InterviewerInfo[]): Array<[InterviewerInfo, InterviewerInfo]> => {
  const pairs: Array<[InterviewerInfo, InterviewerInfo]> = [];
  interviewers.forEach((first, firstIndex) => {
    interviewers.slice(firstIndex + 1).forEach(second => pairs.push([first, second]));
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
  isSubmitting,
  onSchedule,
  onClose
}) => {
  const pairs = useMemo(() => buildPairs(availableInterviewers), [availableInterviewers]);
  const [pairIndex, setPairIndex] = useState(0);
  const [applications, setApplications] = useState<Application[]>([]);
  const [applicationsLoading, setApplicationsLoading] = useState(false);
  const [applicationSearch, setApplicationSearch] = useState('');
  const [selectedApplicationId, setSelectedApplicationId] = useState('');
  const [type, setType] = useState<InterviewType>(InterviewType.FAMILY);
  const [mode, setMode] = useState<InterviewMode>(InterviewMode.IN_PERSON);
  const [location, setLocation] = useState('');
  const [dateError, setDateError] = useState<string | null>(date < getTodayDateString() ? 'No se puede agendar en fechas anteriores a hoy.' : null);
  const selectedPair = pairs[pairIndex];
  const selectedApplication = applications.find(application => application.id === Number(selectedApplicationId));
  const canSubmit = Boolean(selectedPair && selectedApplication && !dateError && !isSubmitting);

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
        const activeStatuses = [
          InterviewStatus.SCHEDULED,
          InterviewStatus.CONFIRMED,
          InterviewStatus.IN_PROGRESS,
          InterviewStatus.RESCHEDULED,
          InterviewStatus.PENDING
        ];
        const appIdsWithFamily = new Set<number>();
        const appIdsWithCycleDirector = new Set<number>();

        interviewsResponse.interviews.forEach(interview => {
          if (activeStatuses.includes(interview.status as InterviewStatus)) {
            if (interview.type === InterviewType.FAMILY) {
              appIdsWithFamily.add(interview.applicationId);
            } else if (interview.type === InterviewType.CYCLE_DIRECTOR) {
              appIdsWithCycleDirector.add(interview.applicationId);
            }
          }
        });

        // Filtrar: solo postulaciones pendientes Y que NO tengan ambas entrevistas
        const validApplications = applicationsResponse.filter(app =>
          isPendingInterviewAssignment(app) &&
          !(appIdsWithFamily.has(app.id) && appIdsWithCycleDirector.has(app.id))
        );

        setApplications(validApplications);
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
    if (!selectedPair || !selectedApplication || !canSubmit) return;

    if (date < getTodayDateString()) {
      setDateError('No se puede agendar en fechas anteriores a hoy.');
      return;
    }

    onSchedule({
      date,
      time,
      interviewer1Id: selectedPair[0].id,
      interviewer2Id: selectedPair[1].id,
      applicationId: selectedApplication.id,
      type,
      mode,
      location: location.trim() || undefined
    });
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-gray-900/35 p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-xl rounded-lg border border-gray-200 bg-white p-5 shadow-2xl">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Agendar entrevista</h3>
            <p className="text-sm text-gray-500">{date} · {time}</p>
            {dateError && <p className="mt-1 text-sm font-semibold text-red-600">{dateError}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
            aria-label="Cerrar"
          >
            <FiX aria-hidden="true" />
          </button>
        </div>

        <div className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-gray-700">Pareja de entrevistadores</span>
            <select
              value={pairIndex}
              onChange={event => setPairIndex(Number(event.target.value))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
            >
              {pairs.map((pair, index) => (
                <option key={`${pair[0].id}-${pair[1].id}`} value={index}>
                  {pair[0].name} + {pair[1].name}
                </option>
              ))}
            </select>
          </label>

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
                className="h-10 w-full rounded-lg border border-gray-300 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
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
                      className={`w-full border-b border-gray-100 p-3 text-left last:border-b-0 hover:bg-blue-50 ${
                        isSelected ? 'bg-blue-50 ring-1 ring-inset ring-blue-300' : 'bg-white'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-gray-900">{getStudentName(application)}</p>
                          <p className="truncate text-xs text-gray-500">
                            {application.student?.rut || 'RUT no informado'} · {getGrade(application)} · {getGuardianName(application)}
                          </p>
                        </div>
                        <span className="flex-shrink-0 rounded-full bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-600">
                          {application.status}
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
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              >
                <option value={InterviewType.FAMILY}>Familiar</option>
                <option value={InterviewType.CYCLE_DIRECTOR}>Director de Ciclo</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-gray-700">Modalidad</span>
              <select
                value={mode}
                onChange={event => setMode(event.target.value as InterviewMode)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              >
                <option value={InterviewMode.IN_PERSON}>Presencial</option>
                <option value={InterviewMode.VIRTUAL}>Virtual</option>
                <option value={InterviewMode.HYBRID}>Hibrida</option>
              </select>
            </label>
          </div>

          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-gray-700">Ubicacion o enlace</span>
            <input
              value={location}
              onChange={event => setLocation(event.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              placeholder="Sala de entrevistas, Meet, Zoom..."
            />
          </label>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={!canSubmit}
            className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            <FiCheck className="h-4 w-4" aria-hidden="true" />
            {isSubmitting ? 'Programando...' : 'Programar entrevista'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default QuickSchedulePopover;
