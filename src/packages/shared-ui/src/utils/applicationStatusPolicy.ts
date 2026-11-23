export interface ApplicationStatusMetadata {
  allowedStatusTransitions?: string[];
  statusChangeBlockedReason?: string;
}

type StatusApplication = ApplicationStatusMetadata & {
  status?: string;
  gradeApplied?: unknown;
  student?: { gradeApplied?: unknown; gradeApplying?: unknown; grade?: unknown } | null;
};

// Compatibilidad con listados antiguos; los metadatos del BFF tienen prioridad.
export function applicationStatusPolicy(application: StatusApplication) {
  const grade = String(application.gradeApplied ?? application.student?.gradeApplied
    ?? application.student?.gradeApplying ?? application.student?.grade ?? '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  const excluded = grade === 'PREKINDER' || grade === 'PK';
  const status = application.status;
  const final = !excluded && (status === 'APPROVED' || status === 'REJECTED');
  const waiting = !excluded && status === 'WAITLIST';
  const allowed = application.allowedStatusTransitions ?? (final ? [] : waiting ? ['APPROVED', 'REJECTED'] : null);
  const reason = application.statusChangeBlockedReason ?? (final
    ? `La postulación está cerrada con resultado ${status === 'APPROVED' ? 'Aceptado' : 'No seleccionado'} y no admite cambios de estado.`
    : waiting ? 'Lista de espera solo puede cambiar a Aceptado o No seleccionado por una persona autorizada.' : '');
  return { reason, locked: allowed?.length === 0, canChangeTo: (next: string) => allowed === null || allowed.includes(next) };
}

export function statusRequestError(error: unknown): string {
  const failure = error as { message?: string; response?: { data?: { message?: string; error?: { message?: string } } } };
  return failure?.response?.data?.error?.message ?? failure?.response?.data?.message
    ?? failure?.message ?? 'No se pudo cambiar el estado de la postulación';
}
